import { Router } from 'express';
import { z } from 'zod';
import path from 'path';
import PDFDocument from 'pdfkit';
import fs from 'fs';

import { authenticate } from '../middleware/authenticate';
import { authorize, UserRole } from '../middleware/authorize';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiResponse } from '../lib/ApiResponse';
import { ApiError } from '../lib/ApiError';
import { db, getPaginationParams, getSortParams } from '../lib/db';
import { config } from '../config/env';

export const distributionRouter = Router();

// ─── All distribution routes require authentication ───────
distributionRouter.use(authenticate);

// ─── Validation schemas ───────────────────────────────────
const recordDistributionSchema = z.object({
  farmerId: z.string().min(1, 'Farmer ID is required'),
  inputTypeId: z.string().min(1, 'Input type ID is required'),
  orgId: z.string().min(1, 'Organization ID is required'),
  quantity: z.coerce
    .number()
    .min(0.01, 'Quantity must be greater than 0')
    .max(100000, 'Quantity seems too large — please verify'),
  unit: z.string().min(1, 'Unit is required'),
  season: z.enum(['Meher', 'Belg'], {
    errorMap: () => ({
      message: 'Season must be either Meher or Belg',
    }),
  }),
  year: z.coerce
    .number()
    .min(2000)
    .max(new Date().getFullYear() + 1),
  notes: z
    .string()
    .max(500, 'Notes must be under 500 characters')
    .optional()
    .nullable(),
  distributionDate: z.coerce.date().optional(),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce
    .number()
    .min(1)
    .max(config.MAX_PAGE_SIZE)
    .default(config.DEFAULT_PAGE_SIZE),
  farmerId: z.string().optional(),
  orgId: z.string().optional(),
  inputTypeId: z.string().optional(),
  season: z.enum(['Meher', 'Belg']).optional(),
  year: z.coerce.number().optional(),
  kebeleId: z.string().optional(),
  woredaId: z.string().optional(),
  zoneId: z.string().optional(),
  regionId: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  sortBy: z
    .enum(['createdAt', 'quantity', 'season', 'year'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── GET /api/v1/distributions ───────────────────────────
// Get all distributions with filters and pagination
distributionRouter.get(
  '/',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
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
      orgId,
      inputTypeId,
      season,
      year,
      kebeleId,
      woredaId,
      zoneId,
      regionId,
      fromDate,
      toDate,
      sortBy,
      sortOrder,
    } = parsed.data;

    // NGO Partners only see their own organization distributions
    const effectiveOrgId =
      req.user?.role === UserRole.NGO_PARTNER
        ? (req.user.orgId ?? orgId)
        : orgId;

    const where: Record<string, unknown> = {
      ...(farmerId && { farmerId }),
      ...(effectiveOrgId && { orgId: effectiveOrgId }),
      ...(inputTypeId && { inputTypeId }),
      ...(season && { season }),
      ...(year && { year }),
      ...(fromDate && { createdAt: { gte: fromDate } }),
      ...(toDate && { createdAt: { lte: toDate } }),
      ...(kebeleId && { farmer: { kebeleId } }),
      ...(woredaId && {
        farmer: { kebele: { woredaId } },
      }),
      ...(zoneId && {
        farmer: { kebele: { woreda: { zoneId } } },
      }),
      ...(regionId && {
        farmer: {
          kebele: { woreda: { zone: { regionId } } },
        },
      }),
    };

    const { skip, take } = getPaginationParams(page, perPage);
    const orderBy = getSortParams(sortBy, sortOrder);

    const [distributions, total] = await Promise.all([
      db.distribution.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          quantity: true,
          unit: true,
          season: true,
          year: true,
          notes: true,
          receiptUrl: true,
          createdAt: true,
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
          inputType: {
            select: {
              id: true,
              name: true,
              amharicName: true,
              category: true,
              unit: true,
            },
          },
          organization: {
            select: { id: true, name: true, type: true },
          },
          distributedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      db.distribution.count({ where }),
    ]);

    return ApiResponse.paginated(
      res,
      distributions,
      { total, page, perPage },
      'Distributions fetched successfully',
    );
  }),
);

// ─── GET /api/v1/distributions/coverage-gaps ─────────────
// Get farmers with no distribution this season
distributionRouter.get(
  '/coverage-gaps',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      season: z.enum(['Meher', 'Belg']).optional(),
      year: z.coerce.number().optional(),
      regionId: z.string().optional(),
      woredaId: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
      perPage: z.coerce.number().min(1).max(100).default(20),
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
      woredaId,
      page,
      perPage,
    } = parsed.data;

    // Find farmers who have NOT received any distribution this season
    const { skip, take } = getPaginationParams(page, perPage);

    const [farmersWithNoAid, total] = await Promise.all([
      db.farmer.findMany({
        where: {
          status: 'ACTIVE',
          ...(woredaId && {
            kebele: { woredaId },
          }),
          ...(regionId && {
            kebele: { woreda: { zone: { regionId } } },
          }),
          distributions: {
            none: { season, year },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          farmerId: true,
          firstName: true,
          lastName: true,
          phone: true,
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
      }),
      db.farmer.count({
        where: {
          status: 'ACTIVE',
          ...(woredaId && { kebele: { woredaId } }),
          ...(regionId && {
            kebele: { woreda: { zone: { regionId } } },
          }),
          distributions: { none: { season, year } },
        },
      }),
    ]);

    return ApiResponse.paginated(
      res,
      farmersWithNoAid,
      { total, page, perPage },
      'Coverage gap farmers fetched successfully',
    );
  }),
);

// ─── GET /api/v1/distributions/stats ─────────────────────
// Get distribution statistics
distributionRouter.get(
  '/stats',
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

    const where = {
      season,
      year,
      ...(orgId && { orgId }),
    };

    const [totalDistributions, totalFarmersReached, byInputType] =
      await Promise.all([
        db.distribution.aggregate({
          where,
          _count: { id: true },
          _sum: { quantity: true },
        }),
        db.distribution.findMany({
          where,
          select: { farmerId: true },
          distinct: ['farmerId'],
        }),
        db.distribution.groupBy({
          by: ['inputTypeId'],
          where,
          _count: { id: true },
          _sum: { quantity: true },
        }),
      ]);

    // Get input type names
    const inputTypeIds = byInputType.map((b) => b.inputTypeId);
    const inputTypes = await db.inputType.findMany({
      where: { id: { in: inputTypeIds } },
      select: { id: true, name: true, category: true, unit: true },
    });

    const inputTypeMap = new Map(inputTypes.map((it) => [it.id, it]));

    return ApiResponse.ok(res, 'Distribution stats fetched successfully', {
      totalDistributions: totalDistributions._count.id,
      totalQuantity: totalDistributions._sum.quantity ?? 0,
      uniqueFarmersReached: totalFarmersReached.length,
      byInputType: byInputType.map((b) => ({
        inputType: inputTypeMap.get(b.inputTypeId),
        count: b._count.id,
        totalQuantity: b._sum.quantity ?? 0,
      })),
      season,
      year,
    });
  }),
);

// ─── GET /api/v1/distributions/:id ───────────────────────
// Get a single distribution by ID
distributionRouter.get(
  '/:id',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.NGO_PARTNER,
    UserRole.VIEWER,
  ]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const distribution = await db.distribution.findUnique({
      where: { id },
      select: {
        id: true,
        quantity: true,
        unit: true,
        season: true,
        year: true,
        notes: true,
        receiptUrl: true,
        createdAt: true,
        updatedAt: true,
        farmer: {
          select: {
            id: true,
            farmerId: true,
            firstName: true,
            lastName: true,
            phone: true,
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
        inputType: {
          select: {
            id: true,
            name: true,
            amharicName: true,
            category: true,
            unit: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        distributedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!distribution) {
      throw ApiError.notFound('Distribution record');
    }

    return ApiResponse.ok(
      res,
      'Distribution fetched successfully',
      distribution,
    );
  }),
);

// ─── POST /api/v1/distributions ──────────────────────────
// Record a new distribution with deduplication check
distributionRouter.post(
  '/',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.NGO_PARTNER]),
  asyncHandler(async (req, res) => {
    const parsed = recordDistributionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation failed', parsed.error.errors);
    }

    const {
      farmerId,
      inputTypeId,
      orgId,
      quantity,
      unit,
      season,
      year,
      notes,
      distributionDate,
    } = parsed.data;

    // Verify farmer exists and is active
    const farmer = await db.farmer.findUnique({
      where: { id: farmerId },
      select: {
        id: true,
        farmerId: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    if (!farmer) {
      throw ApiError.notFound('Farmer');
    }

    if (farmer.status !== 'ACTIVE') {
      throw ApiError.badRequest(
        'Cannot record distribution for an inactive farmer.',
      );
    }

    // Verify input type exists
    const inputType = await db.inputType.findUnique({
      where: { id: inputTypeId },
      select: { id: true, name: true },
    });

    if (!inputType) {
      throw ApiError.notFound('Input type');
    }

    // Verify organization exists
    const organization = await db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, isActive: true },
    });

    if (!organization) {
      throw ApiError.notFound('Organization');
    }

    if (!organization.isActive) {
      throw ApiError.badRequest(
        'Cannot record distribution for an inactive organization.',
      );
    }

    // ── DEDUPLICATION ENGINE ──────────────────────────────
    // Check cross-NGO if this farmer already received
    // the same input type this season from ANY organization
    const existingDistribution = await db.distribution.findFirst({
      where: {
        farmerId,
        inputTypeId,
        season,
        year,
      },
      select: {
        id: true,
        quantity: true,
        unit: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true },
        },
        distributedBy: {
          select: { name: true },
        },
      },
    });

    if (existingDistribution) {
      throw ApiError.conflict(
        `Duplicate distribution detected. ` +
          `This farmer already received ${inputType.name} ` +
          `this ${season} ${year} season from ` +
          `${existingDistribution.organization.name}.`,
      );
    }

    // Record the distribution
    const newDistribution = await db.distribution.create({
      data: {
        farmerId,
        inputTypeId,
        orgId,
        quantity,
        unit,
        season,
        year,
        notes: notes ?? null,
        distributedById: req.user?.id ?? '',
        createdAt: distributionDate ?? new Date(),
      },
      select: {
        id: true,
        quantity: true,
        unit: true,
        season: true,
        year: true,
        createdAt: true,
        farmer: {
          select: {
            farmerId: true,
            firstName: true,
            lastName: true,
          },
        },
        inputType: {
          select: { name: true, amharicName: true },
        },
        organization: {
          select: { name: true },
        },
      },
    });

    return ApiResponse.created(
      res,
      'Distribution recorded successfully',
      newDistribution,
    );
  }),
);

// ─── GET /api/v1/distributions/:id/receipt ───────────────
// Generate and download PDF receipt for a distribution
distributionRouter.get(
  '/:id/receipt',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.NGO_PARTNER,
    UserRole.FIELD_AGENT,
  ]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const distribution = await db.distribution.findUnique({
      where: { id },
      select: {
        id: true,
        quantity: true,
        unit: true,
        season: true,
        year: true,
        notes: true,
        createdAt: true,
        farmer: {
          select: {
            farmerId: true,
            firstName: true,
            lastName: true,
            phone: true,
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
        inputType: {
          select: {
            name: true,
            amharicName: true,
            category: true,
            unit: true,
          },
        },
        organization: {
          select: { name: true },
        },
        distributedBy: {
          select: { name: true },
        },
      },
    });

    if (!distribution) {
      throw ApiError.notFound('Distribution record');
    }

    // Generate PDF receipt
    const doc = new PDFDocument({
      size: 'A5',
      margin: 40,
    });

    const receiptFilename = `receipt-${id}-${Date.now()}.pdf`;
    const receiptPath = path.join(
      process.cwd(),
      config.EXPORT_DIR,
      receiptFilename,
    );

    // Ensure export directory exists
    if (!fs.existsSync(path.join(process.cwd(), config.EXPORT_DIR))) {
      fs.mkdirSync(path.join(process.cwd(), config.EXPORT_DIR), {
        recursive: true,
      });
    }

    const writeStream = fs.createWriteStream(receiptPath);
    doc.pipe(writeStream);

    // PDF content
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('AgroEthiopia MIS', { align: 'center' });

    doc
      .fontSize(12)
      .font('Helvetica')
      .text('Input Distribution Receipt', { align: 'center' });

    doc.moveDown();
    doc
      .fontSize(10)
      .text(`Date: ${distribution.createdAt.toLocaleDateString()}`);
    doc.text(`Receipt ID: ${id}`);

    doc.moveDown();
    doc.font('Helvetica-Bold').text('Farmer Information:');
    doc.font('Helvetica');
    doc.text(
      `Name: ${distribution.farmer.firstName} ${distribution.farmer.lastName}`,
    );
    doc.text(`Farmer ID: ${distribution.farmer.farmerId}`);
    doc.text(
      `Location: ${distribution.farmer.kebele.name}, ` +
        `${distribution.farmer.kebele.woreda.name}, ` +
        `${distribution.farmer.kebele.woreda.zone.name}, ` +
        `${distribution.farmer.kebele.woreda.zone.region.name}`,
    );

    doc.moveDown();
    doc.font('Helvetica-Bold').text('Distribution Details:');
    doc.font('Helvetica');
    doc.text(`Input: ${distribution.inputType.name}`);
    doc.text(`Quantity: ${distribution.quantity} ${distribution.unit}`);
    doc.text(`Season: ${distribution.season} ${distribution.year}`);
    doc.text(`Organization: ${distribution.organization.name}`);
    doc.text(`Distributed by: ${distribution.distributedBy.name}`);

    if (distribution.notes) {
      doc.moveDown();
      doc.text(`Notes: ${distribution.notes}`);
    }

    doc.moveDown(2);
    doc
      .fontSize(8)
      .text(
        'This receipt is generated by AgroEthiopia MIS. ' +
          'Please keep for your records.',
        { align: 'center' },
      );

    doc.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${receiptFilename}"`,
    );

    // Stream the file
    const readStream = fs.createReadStream(receiptPath);
    readStream.pipe(res);

    // Clean up file after sending
    readStream.on('end', () => {
      fs.unlink(receiptPath, () => {
        // Ignore cleanup errors
      });
    });
  }),
);

// ─── DELETE /api/v1/distributions/:id ────────────────────
// Delete a distribution record — Admin only
distributionRouter.delete(
  '/:id',
  authorize([UserRole.SUPER_ADMIN]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const distribution = await db.distribution.findUnique({
      where: { id },
    });

    if (!distribution) {
      throw ApiError.notFound('Distribution record');
    }

    await db.distribution.delete({ where: { id } });

    return ApiResponse.noContent(res);
  }),
);

export default distributionRouter;
