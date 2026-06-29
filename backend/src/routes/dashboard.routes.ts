import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/authenticate';
import { authorize, UserRole } from '../middleware/authorize';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiResponse } from '../lib/ApiResponse';
import { ApiError } from '../lib/ApiError';
import { db } from '../lib/db';
import { redis } from '../config/redis';
import { config } from '../config/env';

export const dashboardRouter = Router();

// ─── All dashboard routes require authentication ──────────
dashboardRouter.use(authenticate);

// ─── Cache helper ─────────────────────────────────────────
const CACHE_TTL = 300; // 5 minutes

const getCachedOrFetch = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = CACHE_TTL,
): Promise<T> => {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // Redis unavailable — fetch directly
  }

  const data = await fetcher();

  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch {
    // Redis unavailable — continue without caching
  }

  return data;
};

// ─── GET /api/v1/dashboard/stats ─────────────────────────
// Main dashboard KPI stats — cached 5 minutes
dashboardRouter.get(
  '/stats',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.NGO_PARTNER,
    UserRole.VIEWER,
  ]),
  asyncHandler(async (req, res) => {
    const userRole = req.user?.role as UserRole;
    const userOrgId = req.user?.orgId;
    const currentYear = new Date().getFullYear();
    const currentSeason = config.DEFAULT_SEASON;

    const cacheKey =
      userRole === UserRole.NGO_PARTNER
        ? `dashboard:stats:org:${userOrgId}`
        : `dashboard:stats:global`;

    const stats = await getCachedOrFetch(cacheKey, async () => {
      if (userRole === UserRole.NGO_PARTNER && userOrgId) {
        // NGO Partner — only their org stats
        const [totalDistributions, farmersReached, activeAgents] =
          await Promise.all([
            db.distribution.count({
              where: { orgId: userOrgId, year: currentYear },
            }),
            db.distribution.findMany({
              where: { orgId: userOrgId, year: currentYear },
              select: { farmerId: true },
              distinct: ['farmerId'],
            }),
            db.user.count({
              where: {
                orgId: userOrgId,
                isActive: true,
                role: 'FIELD_AGENT',
              },
            }),
          ]);

        return {
          totalDistributions,
          farmersReached: farmersReached.length,
          activeAgents,
          season: currentSeason,
          year: currentYear,
        };
      }

      // Admin / Super Admin — global stats
      const [
        totalFarmers,
        activeFarmers,
        totalOrganizations,
        activeOrganizations,
        totalUsers,
        totalDistributions,
        totalYieldReports,
        activeAlerts,
        recentRegistrations,
      ] = await Promise.all([
        db.farmer.count(),
        db.farmer.count({ where: { status: 'ACTIVE' } }),
        db.organization.count(),
        db.organization.count({ where: { isActive: true } }),
        db.user.count({ where: { isActive: true } }),
        db.distribution.count({
          where: {
            year: currentYear,
            season: currentSeason as 'Meher' | 'Belg',
          },
        }),
        db.yieldReport.count({
          where: {
            year: currentYear,
            season: currentSeason as 'Meher' | 'Belg',
          },
        }),
        db.foodSecurityAlert.count({
          where: { resolvedAt: null },
        }),
        db.farmer.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      return {
        farmers: {
          total: totalFarmers,
          active: activeFarmers,
          recentRegistrations,
        },
        organizations: {
          total: totalOrganizations,
          active: activeOrganizations,
        },
        users: {
          total: totalUsers,
        },
        currentSeason: {
          season: currentSeason,
          year: currentYear,
          distributions: totalDistributions,
          yieldReports: totalYieldReports,
        },
        alerts: {
          foodSecurity: activeAlerts,
        },
      };
    });

    return ApiResponse.ok(res, 'Dashboard stats fetched successfully', stats);
  }),
);

// ─── GET /api/v1/dashboard/yield-chart ───────────────────
// Yield data by region for bar chart — cached 5 minutes
dashboardRouter.get(
  '/yield-chart',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      season: z.enum(['Meher', 'Belg']).optional(),
      year: z.coerce.number().optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const currentYear = new Date().getFullYear();
    const {
      season = config.DEFAULT_SEASON as 'Meher' | 'Belg',
      year = currentYear,
    } = parsed.data;

    const cacheKey = `dashboard:yield-chart:${season}:${year}`;

    const data = await getCachedOrFetch(cacheKey, async () => {
      const regions = await db.region.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          zones: {
            select: {
              woredas: {
                select: {
                  kebeles: {
                    select: {
                      farmers: {
                        select: {
                          yieldReports: {
                            where: { season, year, stage: 'FINAL' },
                            select: { quantityKg: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      return regions.map((region) => {
        const totalYieldKg = region.zones.reduce(
          (zTotal, zone) =>
            zTotal +
            zone.woredas.reduce(
              (wTotal, woreda) =>
                wTotal +
                woreda.kebeles.reduce(
                  (kTotal, kebele) =>
                    kTotal +
                    kebele.farmers.reduce(
                      (fTotal, farmer) =>
                        fTotal +
                        farmer.yieldReports.reduce(
                          (yTotal, yr) => yTotal + (yr.quantityKg ?? 0),
                          0,
                        ),
                      0,
                    ),
                  0,
                ),
              0,
            ),
          0,
        );

        return {
          region: region.name,
          regionId: region.id,
          totalYieldKg,
          totalYieldTons: Math.round(totalYieldKg / 1000),
        };
      });
    });

    return ApiResponse.ok(res, 'Yield chart data fetched successfully', {
      data,
      season,
      year,
    });
  }),
);

// ─── GET /api/v1/dashboard/monthly-registrations ─────────
// Farmer registrations per month for area chart
dashboardRouter.get(
  '/monthly-registrations',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      year: z.coerce.number().optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const year = parsed.data.year ?? new Date().getFullYear();
    const cacheKey = `dashboard:monthly-reg:${year}`;

    const data = await getCachedOrFetch(cacheKey, async () => {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);

      const farmers = await db.farmer.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: { createdAt: true },
      });

      // Group by month
      const monthCounts = new Array(12).fill(0);
      farmers.forEach((farmer) => {
        const month = new Date(farmer.createdAt).getMonth();
        monthCounts[month]++;
      });

      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];

      return monthNames.map((month, index) => ({
        month,
        count: monthCounts[index],
        year,
      }));
    });

    return ApiResponse.ok(res, 'Monthly registrations fetched successfully', {
      data,
      year,
    });
  }),
);

// ─── GET /api/v1/dashboard/coverage-chart ────────────────
// Aid coverage vs uncovered farmers for donut chart
dashboardRouter.get(
  '/coverage-chart',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      season: z.enum(['Meher', 'Belg']).optional(),
      year: z.coerce.number().optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const currentYear = new Date().getFullYear();
    const {
      season = config.DEFAULT_SEASON as 'Meher' | 'Belg',
      year = currentYear,
    } = parsed.data;

    const cacheKey = `dashboard:coverage:${season}:${year}`;

    const data = await getCachedOrFetch(cacheKey, async () => {
      const [totalActive, covered] = await Promise.all([
        db.farmer.count({ where: { status: 'ACTIVE' } }),
        db.farmer.count({
          where: {
            status: 'ACTIVE',
            distributions: {
              some: { season, year },
            },
          },
        }),
      ]);

      const uncovered = totalActive - covered;
      const coveragePercent =
        totalActive > 0 ? Math.round((covered / totalActive) * 100) : 0;

      return {
        total: totalActive,
        covered,
        uncovered,
        coveragePercent,
        season,
        year,
      };
    });

    return ApiResponse.ok(
      res,
      'Coverage chart data fetched successfully',
      data,
    );
  }),
);

// ─── GET /api/v1/dashboard/activity-feed ─────────────────
// Recent system activity — NOT cached (always fresh)
dashboardRouter.get(
  '/activity-feed',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      limit: z.coerce.number().min(1).max(50).default(20),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const { limit } = parsed.data;

    // Get recent audit log entries
    const recentActivity = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        tableName: true,
        recordId: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return ApiResponse.ok(
      res,
      'Activity feed fetched successfully',
      recentActivity,
    );
  }),
);

// ─── GET /api/v1/dashboard/top-regions ───────────────────
// Top regions by farmer count for horizontal bar chart
dashboardRouter.get(
  '/top-regions',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (_req, res) => {
    const cacheKey = 'dashboard:top-regions';

    const data = await getCachedOrFetch(cacheKey, async () => {
      const regions = await db.region.findMany({
        select: {
          id: true,
          name: true,
          zones: {
            select: {
              woredas: {
                select: {
                  kebeles: {
                    select: {
                      _count: {
                        select: { farmers: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      return regions
        .map((region) => {
          const farmerCount = region.zones.reduce(
            (zTotal, zone) =>
              zTotal +
              zone.woredas.reduce(
                (wTotal, woreda) =>
                  wTotal +
                  woreda.kebeles.reduce(
                    (kTotal, kebele) => kTotal + kebele._count.farmers,
                    0,
                  ),
                0,
              ),
            0,
          );

          return {
            regionId: region.id,
            region: region.name,
            farmerCount,
          };
        })
        .sort((a, b) => b.farmerCount - a.farmerCount)
        .slice(0, 5);
    });

    return ApiResponse.ok(res, 'Top regions fetched successfully', data);
  }),
);

// ─── DELETE /api/v1/dashboard/cache ──────────────────────
// Manually clear dashboard cache — Super Admin only
dashboardRouter.delete(
  '/cache',
  authorize([UserRole.SUPER_ADMIN]),
  asyncHandler(async (_req, res) => {
    try {
      const keys = await redis.keys('dashboard:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      throw ApiError.serviceUnavailable('Cache service unavailable');
    }

    return ApiResponse.ok(res, `Dashboard cache cleared successfully`, null);
  }),
);

export default dashboardRouter;
