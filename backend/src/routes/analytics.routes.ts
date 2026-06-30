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

export const analyticsRouter = Router();

// ─── All analytics routes require authentication ──────────
analyticsRouter.use(authenticate);

// ─── Cache helper ─────────────────────────────────────────
const CACHE_TTL = 600; // 10 minutes for analytics

const getCached = async <T>(
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
    // Redis unavailable
  }

  const data = await fetcher();

  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch {
    // Redis unavailable
  }

  return data;
};

// ─── GET /api/v1/analytics/regional-yield ────────────────
// Yield totals per region — grouped bar chart data
analyticsRouter.get(
  '/regional-yield',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.NGO_PARTNER,
    UserRole.VIEWER,
  ]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      season: z.enum(['Meher', 'Belg']).optional(),
      yearFrom: z.coerce.number().optional(),
      yearTo: z.coerce.number().optional(),
      cropId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const currentYear = new Date().getFullYear();
    const {
      season = config.DEFAULT_SEASON as 'Meher' | 'Belg',
      yearFrom = currentYear - 2,
      yearTo = currentYear,
      cropId,
    } = parsed.data;

    const cacheKey = `analytics:regional-yield:${season}:${yearFrom}:${yearTo}:${cropId ?? 'all'}`;

    const data = await getCached(cacheKey, async () => {
      const years = Array.from(
        { length: yearTo - yearFrom + 1 },
        (_, i) => yearFrom + i,
      );

      const regions = await db.region.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, amharicName: true },
      });

      const result = await Promise.all(
        regions.map(async (region) => {
          const yearlyData = await Promise.all(
            years.map(async (year) => {
              const aggregate = await db.yieldReport.aggregate({
                where: {
                  season,
                  year,
                  stage: 'FINAL',
                  ...(cropId && { cropId }),
                  farmer: {
                    kebele: {
                      woreda: { zone: { regionId: region.id } },
                    },
                  },
                },
                _sum: { quantityKg: true },
                _count: { id: true },
              });

              return {
                year,
                totalYieldKg: aggregate._sum.quantityKg ?? 0,
                totalYieldTons: Math.round(
                  (aggregate._sum.quantityKg ?? 0) / 1000,
                ),
                farmerCount: aggregate._count.id,
              };
            }),
          );

          return {
            region: region.name,
            regionId: region.id,
            amharicName: region.amharicName,
            data: yearlyData,
          };
        }),
      );

      return result;
    });

    return ApiResponse.ok(
      res,
      'Regional yield analytics fetched successfully',
      { data, season, yearFrom, yearTo },
    );
  }),
);

// ─── GET /api/v1/analytics/season-comparison ─────────────
// Compare yield across multiple seasons — line chart data
analyticsRouter.get(
  '/season-comparison',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      regionId: z.string().optional(),
      cropId: z.string().optional(),
      seasons: z
        .string()
        .optional()
        .transform((val) =>
          val ? val.split(',').map((s) => s.trim()) : ['Meher', 'Belg'],
        ),
      yearFrom: z.coerce
        .number()
        .optional()
        .default(new Date().getFullYear() - 3),
      yearTo: z.coerce.number().optional().default(new Date().getFullYear()),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const { regionId, cropId, seasons, yearFrom, yearTo } = parsed.data;

    const cacheKey = `analytics:season-comparison:${regionId ?? 'all'}:${cropId ?? 'all'}:${yearFrom}:${yearTo}`;

    const data = await getCached(cacheKey, async () => {
      const years = Array.from(
        { length: yearTo - yearFrom + 1 },
        (_, i) => yearFrom + i,
      );

      const comparison = await Promise.all(
        seasons.map(async (season) => {
          const yearlyData = await Promise.all(
            years.map(async (year) => {
              const aggregate = await db.yieldReport.aggregate({
                where: {
                  season: season as 'Meher' | 'Belg',
                  year,
                  stage: 'FINAL',
                  ...(cropId && { cropId }),
                  ...(regionId && {
                    farmer: {
                      kebele: {
                        woreda: { zone: { regionId } },
                      },
                    },
                  }),
                },
                _sum: { quantityKg: true },
                _count: { id: true },
              });

              return {
                year,
                totalYieldKg: aggregate._sum.quantityKg ?? 0,
                totalYieldTons: Math.round(
                  (aggregate._sum.quantityKg ?? 0) / 1000,
                ),
                submissions: aggregate._count.id,
              };
            }),
          );

          return {
            season,
            data: yearlyData,
          };
        }),
      );

      return comparison;
    });

    return ApiResponse.ok(res, 'Season comparison data fetched successfully', {
      data,
      yearFrom,
      yearTo,
    });
  }),
);

// ─── GET /api/v1/analytics/crop-breakdown ────────────────
// Crop type distribution per region — pie chart data
analyticsRouter.get(
  '/crop-breakdown',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      regionId: z.string().optional(),
      season: z.enum(['Meher', 'Belg']).optional(),
      year: z.coerce.number().optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const currentYear = new Date().getFullYear();
    const {
      regionId,
      season = config.DEFAULT_SEASON as 'Meher' | 'Belg',
      year = currentYear,
    } = parsed.data;

    const cacheKey = `analytics:crop-breakdown:${regionId ?? 'all'}:${season}:${year}`;

    const data = await getCached(cacheKey, async () => {
      const yieldByCrop = await db.yieldReport.groupBy({
        by: ['cropId'],
        where: {
          season,
          year,
          stage: 'FINAL',
          ...(regionId && {
            farmer: {
              kebele: {
                woreda: { zone: { regionId } },
              },
            },
          }),
        },
        _sum: { quantityKg: true },
        _count: { id: true },
        orderBy: { _sum: { quantityKg: 'desc' } },
      });

      const cropIds = yieldByCrop.map((y) => y.cropId);
      const crops = await db.crop.findMany({
        where: { id: { in: cropIds } },
        select: {
          id: true,
          name: true,
          amharicName: true,
          category: true,
        },
      });

      const cropMap = new Map(crops.map((c) => [c.id, c]));

      const totalYield = yieldByCrop.reduce(
        (sum, y) => sum + (y._sum.quantityKg ?? 0),
        0,
      );

      return yieldByCrop.map((y) => ({
        crop: cropMap.get(y.cropId),
        totalYieldKg: y._sum.quantityKg ?? 0,
        totalYieldTons: Math.round((y._sum.quantityKg ?? 0) / 1000),
        farmerCount: y._count.id,
        percentageOfTotal:
          totalYield > 0
            ? Math.round(((y._sum.quantityKg ?? 0) / totalYield) * 100)
            : 0,
      }));
    });

    return ApiResponse.ok(res, 'Crop breakdown fetched successfully', {
      data,
      season,
      year,
    });
  }),
);

// ─── GET /api/v1/analytics/ngo-activity ──────────────────
// NGO activity ranking — horizontal bar chart
analyticsRouter.get(
  '/ngo-activity',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      season: z.enum(['Meher', 'Belg']).optional(),
      year: z.coerce.number().optional(),
      limit: z.coerce.number().min(1).max(20).default(10),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const currentYear = new Date().getFullYear();
    const {
      season = config.DEFAULT_SEASON as 'Meher' | 'Belg',
      year = currentYear,
      limit,
    } = parsed.data;

    const cacheKey = `analytics:ngo-activity:${season}:${year}`;

    const data = await getCached(cacheKey, async () => {
      const byOrg = await db.distribution.groupBy({
        by: ['orgId'],
        where: { season, year },
        _count: { id: true },
        _sum: { quantity: true },
        orderBy: { _count: { id: 'desc' } },
        take: limit,
      });

      const orgIds = byOrg.map((b) => b.orgId);
      const orgs = await db.organization.findMany({
        where: { id: { in: orgIds } },
        select: {
          id: true,
          name: true,
          type: true,
        },
      });

      const orgMap = new Map(orgs.map((o) => [o.id, o]));

      const uniqueFarmers = await Promise.all(
        orgIds.map(async (orgId) => {
          const farmers = await db.distribution.findMany({
            where: { orgId, season, year },
            select: { farmerId: true },
            distinct: ['farmerId'],
          });
          return { orgId, count: farmers.length };
        }),
      );

      const farmerMap = new Map(uniqueFarmers.map((f) => [f.orgId, f.count]));

      return byOrg.map((b) => ({
        organization: orgMap.get(b.orgId),
        totalDistributions: b._count.id,
        totalQuantity: b._sum.quantity ?? 0,
        uniqueFarmersReached: farmerMap.get(b.orgId) ?? 0,
        season,
        year,
      }));
    });

    return ApiResponse.ok(res, 'NGO activity data fetched successfully', {
      data,
      season,
      year,
    });
  }),
);

// ─── GET /api/v1/analytics/food-security-risk ────────────
// Woredas at food security risk — risk table
analyticsRouter.get(
  '/food-security-risk',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      season: z.enum(['Meher', 'Belg']).optional(),
      year: z.coerce.number().optional(),
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const currentYear = new Date().getFullYear();
    const {
      season = config.DEFAULT_SEASON as 'Meher' | 'Belg',
      year = currentYear,
      severity,
    } = parsed.data;

    const alerts = await db.foodSecurityAlert.findMany({
      where: {
        season,
        year,
        resolvedAt: null,
        ...(severity && { severity }),
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        season: true,
        year: true,
        actualYield: true,
        thresholdYield: true,
        severity: true,
        createdAt: true,
        woreda: {
          select: {
            id: true,
            name: true,
            amharicName: true,
            zone: {
              select: {
                name: true,
                region: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    const riskData = alerts.map((alert) => ({
      ...alert,
      deficitKg: alert.thresholdYield - alert.actualYield,
      deficitPercent: Math.round(
        ((alert.thresholdYield - alert.actualYield) / alert.thresholdYield) *
          100,
      ),
    }));

    return ApiResponse.ok(res, 'Food security risk data fetched successfully', {
      alerts: riskData,
      count: riskData.length,
      season,
      year,
    });
  }),
);

// ─── GET /api/v1/analytics/aid-efficiency ────────────────
// Aid efficiency report — duplicates blocked, budget saved
analyticsRouter.get(
  '/aid-efficiency',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      season: z.enum(['Meher', 'Belg']).optional(),
      year: z.coerce.number().optional(),
      orgId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const currentYear = new Date().getFullYear();
    const {
      season = config.DEFAULT_SEASON as 'Meher' | 'Belg',
      year = currentYear,
      orgId,
    } = parsed.data;

    const cacheKey = `analytics:aid-efficiency:${season}:${year}:${orgId ?? 'all'}`;

    const data = await getCached(cacheKey, async () => {
      const where = {
        season,
        year,
        ...(orgId && { orgId }),
      };

      const [totalDistributions, uniqueFarmers, totalFarmers, byInputType] =
        await Promise.all([
          db.distribution.count({ where }),
          db.distribution.findMany({
            where,
            select: { farmerId: true },
            distinct: ['farmerId'],
          }),
          db.farmer.count({ where: { status: 'ACTIVE' } }),
          db.distribution.groupBy({
            by: ['inputTypeId'],
            where,
            _count: { id: true },
            _sum: { quantity: true },
          }),
        ]);

      const inputTypeIds = byInputType.map((b) => b.inputTypeId);
      const inputTypes = await db.inputType.findMany({
        where: { id: { in: inputTypeIds } },
        select: {
          id: true,
          name: true,
          category: true,
          unit: true,
        },
      });

      const inputTypeMap = new Map(inputTypes.map((it) => [it.id, it]));

      const coverageRate =
        totalFarmers > 0
          ? Math.round((uniqueFarmers.length / totalFarmers) * 100)
          : 0;

      return {
        totalDistributions,
        uniqueFarmersReached: uniqueFarmers.length,
        totalActiveFarmers: totalFarmers,
        coverageRate,
        uncoveredFarmers: totalFarmers - uniqueFarmers.length,
        byInputType: byInputType.map((b) => ({
          inputType: inputTypeMap.get(b.inputTypeId),
          count: b._count.id,
          totalQuantity: b._sum.quantity ?? 0,
        })),
        season,
        year,
      };
    });

    return ApiResponse.ok(
      res,
      'Aid efficiency report fetched successfully',
      data,
    );
  }),
);

export default analyticsRouter;
