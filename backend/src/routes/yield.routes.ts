import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/authenticate';
import { authorize, UserRole } from '../middleware/authorize';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiResponse } from '../lib/ApiResponse';
import { ApiError } from '../lib/ApiError';
import { db, getPaginationParams, getSortParams } from '../lib/db';
import { config } from '../config/env';

export const yieldRouter = Router();

// ─── All yield routes require authentication ──────────────
yieldRouter.use(authenticate);

// ─── Validation schemas ───────────────────────────────────
const submitYieldSchema = z.object({
  farmerId: z.string().min(1, 'Farmer ID is required'),
  cropId: z.string().min(1, 'Crop ID is required'),
  season: z.enum(['Meher', 'Belg'], {
    errorMap: () => ({
      message: 'Season must be either Meher or Belg',
    }),
  }),
  year: z.coerce
    .number()
    .min(2000, 'Year must be 2000 or later')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  stage: z.enum(['PRE_HARVEST', 'HARVEST', 'FINAL'], {
    errorMap: () => ({
      message: 'Stage must be PRE_HARVEST, HARVEST, or FINAL',
    }),
  }),
  quantityKg: z.coerce
    .number()
    .min(0, 'Quantity cannot be negative')
    .max(1000000, 'Quantity seems too large — please verify'),
  notes: z
    .string()
    .max(500, 'Notes must be under 500 characters')
    .optional()
    .nullable(),
});

const updateYieldSchema = submitYieldSchema.partial().omit({
  farmerId: true,
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce
    .number()
    .min(1)
    .max(config.MAX_PAGE_SIZE)
    .default(config.DEFAULT_PAGE_SIZE),
  farmerId: z.string().optional(),
  cropId: z.string().optional(),
  season: z.enum(['Meher', 'Belg']).optional(),
  year: z.coerce.number().optional(),
  stage: z.enum(['PRE_HARVEST', 'HARVEST', 'FINAL']).optional(),
  kebeleId: z.string().optional(),
  woredaId: z.string().optional(),
  zoneId: z.string().optional(),
  regionId: z.string().optional(),
  submittedById: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  sortBy: z
    .enum(['createdAt', 'quantityKg', 'year', 'season'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── GET /api/v1/yields ───────────────────────────────────
// Get all yield reports with filters and pagination
yieldRouter.get(
  '/',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FIELD_AGENT,
    UserRole.NGO_PARTNER,
    UserRole.VIEWER,
  ]),
  asyncHandler(async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest(
        'Invalid query parameters',
        parsed.error.errors,
      );
    }

    const {
      page,
      perPage,
      farmerId,
      cropId,
      season,
      year,
      stage,
      kebeleId,
      woredaId,
      zoneId,
      regionId,
      submittedById,
      fromDate,
      toDate,
      sortBy,
      sortOrder,
    } = parsed.data;

    const where: Record<string, unknown> = {
      ...(farmerId && { farmerId }),
      ...(cropId && { cropId }),
      ...(season && { season }),
      ...(year && { year }),
      ...(stage && { stage }),
      ...(submittedById && { submittedById }),
      ...(fromDate && { createdAt: { gte: fromDate } }),
      ...(toDate && { createdAt: { lte: toDate } }),
      ...(kebeleId && {
        farmer: { kebeleId },
      }),
      ...(woredaId && {
        farmer: { kebele: { woredaId } },
      }),
      ...(zoneId && {
        farmer: { kebele: { woreda: { zoneId } } },
      }),
      ...(regionId && {
        farmer: { kebele: { woreda: { zone: { regionId } } } },
      }),
    };

    // Field agents only see their own submissions
    if (req.user?.role === UserRole.FIELD_AGENT) {
      where.submittedById = req.user.id;
    }

    const { skip, take } = getPaginationParams(page, perPage);
    const orderBy = getSortParams(sortBy, sortOrder);

    const [yields, total] = await Promise.all([
      db.yieldReport.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          season: true,
          year: true,
          stage: true,
          quantityKg: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          farmer: {
            select: {
              id: true,
              farmerId: true,
              firstName: true,
              lastName: true,
              kebele: {
                select: {
                  name: true,
                  woreda: {
                    select: {
                      name: true,
                      zone: {
                        select: {
                          name: true,
                          region: {
                            select: { name: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          crop: {
            select: {
              id: true,
              name: true,
              amharicName: true,
              category: true,
            },
          },
          submittedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      db.yieldReport.count({ where }),
    ]);

    return ApiResponse.paginated(
      res,
      yields,
      { total, page, perPage },
      'Yield reports fetched successfully',
    );
  }),
);

// ─── GET /api/v1/yields/summary ──────────────────────────
// Get yield summary aggregated by region and crop
yieldRouter.get(
  '/summary',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      season: z.enum(['Meher', 'Belg']).optional(),
      year: z.coerce.number().optional(),
      regionId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const currentYear = new Date().getFullYear();
    const {
      season = config.DEFAULT_SEASON as 'Meher' | 'Belg',
      year = currentYear,
      regionId,
    } = parsed.data;

    // Get aggregated yield by crop
    const yieldByCrop = await db.yieldReport.groupBy({
      by: ['cropId', 'stage'],
      where: {
        season,
        year,
        stage: 'FINAL',
        ...(regionId && {
          farmer: {
            kebele: { woreda: { zone: { regionId } } },
          },
        }),
      },
      _sum: { quantityKg: true },
      _count: { id: true },
    });

    // Get crop names
    const cropIds = [...new Set(yieldByCrop.map((y) => y.cropId))];
    const crops = await db.crop.findMany({
      where: { id: { in: cropIds } },
      select: { id: true, name: true, amharicName: true },
    });

    const cropMap = new Map(crops.map((c) => [c.id, c]));

    const summary = yieldByCrop.map((y) => ({
      crop: cropMap.get(y.cropId),
      stage: y.stage,
      totalQuantityKg: y._sum.quantityKg ?? 0,
      farmerCount: y._count.id,
      season,
      year,
    }));

    return ApiResponse.ok(res, 'Yield summary fetched successfully', {
      summary,
      filters: { season, year, regionId },
    });
  }),
);

// ─── GET /api/v1/yields/food-security ────────────────────
// Get woredas below yield threshold — food security alert
yieldRouter.get(
  '/food-security',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      season: z.enum(['Meher', 'Belg']).optional(),
      year: z.coerce.number().optional(),
      thresholdPercent: z.coerce
        .number()
        .min(1)
        .max(100)
        .default(config.YIELD_ALERT_THRESHOLD_PERCENT),
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

    // Get active food security alerts
    const alerts = await db.foodSecurityAlert.findMany({
      where: {
        season,
        year,
        resolvedAt: null,
      },
      orderBy: { severity: 'desc' },
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
                region: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return ApiResponse.ok(res, 'Food security alerts fetched successfully', {
      alerts,
      count: alerts.length,
      season,
      year,
    });
  }),
);

// ─── GET /api/v1/yields/:id ───────────────────────────────
// Get a single yield report by ID
yieldRouter.get(
  '/:id',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FIELD_AGENT,
    UserRole.NGO_PARTNER,
    UserRole.VIEWER,
  ]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const yieldReport = await db.yieldReport.findUnique({
      where: { id },
      select: {
        id: true,
        season: true,
        year: true,
        stage: true,
        quantityKg: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        farmer: {
          select: {
            id: true,
            farmerId: true,
            firstName: true,
            lastName: true,
            kebele: {
              select: {
                name: true,
                woreda: {
                  select: {
                    name: true,
                    zone: {
                      select: {
                        name: true,
                        region: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        crop: {
          select: {
            id: true,
            name: true,
            amharicName: true,
            category: true,
          },
        },
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!yieldReport) {
      throw ApiError.notFound('Yield report');
    }

    return ApiResponse.ok(
      res,
      'Yield report fetched successfully',
      yieldReport,
    );
  }),
);

// ─── POST /api/v1/yields ──────────────────────────────────
// Submit a new yield report
yieldRouter.post(
  '/',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FIELD_AGENT]),
  asyncHandler(async (req, res) => {
    const parsed = submitYieldSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation failed', parsed.error.errors);
    }

    const { farmerId, cropId, season, year, stage, quantityKg, notes } =
      parsed.data;

    // Verify farmer exists
    const farmer = await db.farmer.findUnique({
      where: { id: farmerId },
      select: { id: true, farmerId: true, status: true },
    });

    if (!farmer) {
      throw ApiError.notFound('Farmer');
    }

    if (farmer.status !== 'ACTIVE') {
      throw ApiError.badRequest(
        'Cannot submit yield report for an inactive farmer.',
      );
    }

    // Verify crop exists
    const crop = await db.crop.findUnique({
      where: { id: cropId },
    });

    if (!crop) {
      throw ApiError.notFound('Crop');
    }

    // Check for existing report at same stage
    const existingReport = await db.yieldReport.findFirst({
      where: { farmerId, cropId, season, year, stage },
    });

    if (existingReport) {
      throw ApiError.conflict(
        `A ${stage} yield report for this farmer, crop, and season already exists. ` +
          'Use PUT to update it.',
      );
    }

    // Create yield report
    const newYield = await db.yieldReport.create({
      data: {
        farmerId,
        cropId,
        season,
        year,
        stage,
        quantityKg,
        notes: notes ?? null,
        submittedById: req.user?.id ?? '',
      },
      select: {
        id: true,
        season: true,
        year: true,
        stage: true,
        quantityKg: true,
        notes: true,
        createdAt: true,
        farmer: {
          select: {
            farmerId: true,
            firstName: true,
            lastName: true,
          },
        },
        crop: {
          select: { name: true, amharicName: true },
        },
        submittedBy: {
          select: { name: true },
        },
      },
    });

    // Check food security threshold for FINAL stage
    if (stage === 'FINAL') {
      const thresholdKg =
        (config.YIELD_ALERT_THRESHOLD_PERCENT / 100) * quantityKg;

      if (quantityKg < thresholdKg) {
        const farmerWithLocation = await db.farmer.findUnique({
          where: { id: farmerId },
          select: {
            kebele: {
              select: { woreda: { select: { id: true } } },
            },
          },
        });

        if (farmerWithLocation?.kebele.woreda.id) {
          await db.foodSecurityAlert
            .create({
              data: {
                woredaId: farmerWithLocation.kebele.woreda.id,
                season,
                year,
                actualYield: quantityKg,
                thresholdYield: thresholdKg,
                severity: 'MEDIUM',
              },
            })
            .catch(() => {
              // Alert creation is non-critical
            });
        }
      }
    }

    return ApiResponse.created(
      res,
      'Yield report submitted successfully',
      newYield,
    );
  }),
);

// ─── PUT /api/v1/yields/:id ───────────────────────────────
// Update an existing yield report
yieldRouter.put(
  '/:id',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FIELD_AGENT]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const parsed = updateYieldSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation failed', parsed.error.errors);
    }

    const yieldReport = await db.yieldReport.findUnique({
      where: { id },
      select: {
        id: true,
        submittedById: true,
        stage: true,
      },
    });

    if (!yieldReport) {
      throw ApiError.notFound('Yield report');
    }

    // Field agents can only edit their own submissions
    if (
      req.user?.role === UserRole.FIELD_AGENT &&
      yieldReport.submittedById !== req.user.id
    ) {
      throw ApiError.forbidden(
        'You can only edit yield reports you submitted.',
      );
    }

    const updated = await db.yieldReport.update({
      where: { id },
      data: {
        ...parsed.data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        season: true,
        year: true,
        stage: true,
        quantityKg: true,
        notes: true,
        updatedAt: true,
      },
    });

    return ApiResponse.ok(res, 'Yield report updated successfully', updated);
  }),
);

// ─── DELETE /api/v1/yields/:id ───────────────────────────
// Delete a yield report — Admin only
yieldRouter.delete(
  '/:id',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const yieldReport = await db.yieldReport.findUnique({
      where: { id },
    });

    if (!yieldReport) {
      throw ApiError.notFound('Yield report');
    }

    await db.yieldReport.delete({ where: { id } });

    return ApiResponse.noContent(res);
  }),
);

export default yieldRouter;
