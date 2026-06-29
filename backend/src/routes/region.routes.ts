import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/authenticate';
import { authorize, UserRole } from '../middleware/authorize';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiResponse } from '../lib/ApiResponse';
import { ApiError } from '../lib/ApiError';
import { db } from '../lib/db';

export const regionRouter = Router();

// ─── GET /api/v1/regions ─────────────────────────────────
// Get all regions — public, no auth required
regionRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const regions = await db.region.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        amharicName: true,
        _count: {
          select: {
            zones: true,
          },
        },
      },
    });

    return ApiResponse.ok(res, 'Regions fetched successfully', regions);
  }),
);

// ─── GET /api/v1/regions/search ──────────────────────────
// Must be before /:regionId to avoid route conflict
regionRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      q: z
        .string()
        .min(2, 'Search query must be at least 2 characters')
        .max(100),
      level: z
        .enum(['region', 'zone', 'woreda', 'kebele', 'all'])
        .default('all'),
    });

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest(
        'Invalid search parameters',
        parsed.error.errors,
      );
    }

    const { q, level } = parsed.data;
    const searchFilter = {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        {
          amharicName: {
            contains: q,
            mode: 'insensitive' as const,
          },
        },
      ],
    };

    const results: Record<string, unknown> = {};

    if (level === 'all' || level === 'region') {
      results.regions = await db.region.findMany({
        where: searchFilter,
        select: { id: true, name: true, amharicName: true },
        take: 5,
      });
    }

    if (level === 'all' || level === 'zone') {
      results.zones = await db.zone.findMany({
        where: searchFilter,
        select: {
          id: true,
          name: true,
          amharicName: true,
          region: { select: { id: true, name: true } },
        },
        take: 5,
      });
    }

    if (level === 'all' || level === 'woreda') {
      results.woredas = await db.woreda.findMany({
        where: searchFilter,
        select: {
          id: true,
          name: true,
          amharicName: true,
          zone: {
            select: {
              id: true,
              name: true,
              region: { select: { id: true, name: true } },
            },
          },
        },
        take: 5,
      });
    }

    if (level === 'all' || level === 'kebele') {
      results.kebeles = await db.kebele.findMany({
        where: searchFilter,
        select: {
          id: true,
          name: true,
          amharicName: true,
          geoLat: true,
          geoLng: true,
          woreda: {
            select: {
              id: true,
              name: true,
              zone: {
                select: {
                  id: true,
                  name: true,
                  region: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        take: 10,
      });
    }

    return ApiResponse.ok(res, 'Location search results', results);
  }),
);

// ─── GET /api/v1/regions/stats ───────────────────────────
// Must be before /:regionId to avoid route conflict
regionRouter.get(
  '/stats',
  authenticate,
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (_req, res) => {
    const regions = await db.region.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        amharicName: true,
        zones: {
          select: {
            woredas: {
              select: {
                kebeles: {
                  select: {
                    _count: {
                      select: {
                        farmers: true,
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

    const regionStats = regions.map((region) => {
      const farmerCount = region.zones.reduce(
        (zoneTotal, zone) =>
          zoneTotal +
          zone.woredas.reduce(
            (woredaTotal, woreda) =>
              woredaTotal +
              woreda.kebeles.reduce(
                (kebeleTotal, kebele) => kebeleTotal + kebele._count.farmers,
                0,
              ),
            0,
          ),
        0,
      );

      return {
        id: region.id,
        name: region.name,
        amharicName: region.amharicName,
        farmerCount,
        zoneCount: region.zones.length,
      };
    });

    return ApiResponse.ok(
      res,
      'Region stats fetched successfully',
      regionStats,
    );
  }),
);

// ─── GET /api/v1/regions/zones/:zoneId/woredas ───────────
// Must be before /:regionId to avoid route conflict
regionRouter.get(
  '/zones/:zoneId/woredas',
  asyncHandler(async (req, res) => {
    const { zoneId } = req.params;

    const zone = await db.zone.findUnique({
      where: { id: zoneId },
    });

    if (!zone) {
      throw ApiError.notFound('Zone');
    }

    const woredas = await db.woreda.findMany({
      where: { zoneId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        amharicName: true,
        zoneId: true,
        _count: {
          select: {
            kebeles: true,
          },
        },
      },
    });

    return ApiResponse.ok(res, 'Woredas fetched successfully', woredas);
  }),
);

// ─── GET /api/v1/regions/woredas/:woredaId/kebeles ───────
// Must be before /:regionId to avoid route conflict
regionRouter.get(
  '/woredas/:woredaId/kebeles',
  asyncHandler(async (req, res) => {
    const { woredaId } = req.params;

    const woreda = await db.woreda.findUnique({
      where: { id: woredaId },
    });

    if (!woreda) {
      throw ApiError.notFound('Woreda');
    }

    const kebeles = await db.kebele.findMany({
      where: { woredaId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        amharicName: true,
        woredaId: true,
        geoLat: true,
        geoLng: true,
        _count: {
          select: {
            farmers: true,
          },
        },
      },
    });

    return ApiResponse.ok(res, 'Kebeles fetched successfully', kebeles);
  }),
);

// ─── GET /api/v1/regions/:regionId/zones ─────────────────
regionRouter.get(
  '/:regionId/zones',
  asyncHandler(async (req, res) => {
    const { regionId } = req.params;

    const region = await db.region.findUnique({
      where: { id: regionId },
    });

    if (!region) {
      throw ApiError.notFound('Region');
    }

    const zones = await db.zone.findMany({
      where: { regionId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        amharicName: true,
        regionId: true,
        _count: {
          select: {
            woredas: true,
          },
        },
      },
    });

    return ApiResponse.ok(res, 'Zones fetched successfully', zones);
  }),
);

// ─── GET /api/v1/regions/:regionId ───────────────────────
regionRouter.get(
  '/:regionId',
  asyncHandler(async (req, res) => {
    const { regionId } = req.params;

    const region = await db.region.findUnique({
      where: { id: regionId },
      select: {
        id: true,
        name: true,
        amharicName: true,
        _count: {
          select: {
            zones: true,
          },
        },
        zones: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            amharicName: true,
            _count: {
              select: {
                woredas: true,
              },
            },
          },
        },
      },
    });

    if (!region) {
      throw ApiError.notFound('Region');
    }

    return ApiResponse.ok(res, 'Region fetched successfully', region);
  }),
);

export default regionRouter;
