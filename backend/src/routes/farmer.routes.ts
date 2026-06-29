import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

import { authenticate } from '../middleware/authenticate';
import { authorize, UserRole } from '../middleware/authorize';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiResponse } from '../lib/ApiResponse';
import { ApiError } from '../lib/ApiError';
import { db, getPaginationParams, getSortParams } from '../lib/db';
import { config } from '../config/env';
import {
  uploadFarmerPhoto,
  getFileUrl,
  deleteUploadedFile,
} from '../middleware/upload';

export const farmerRouter = Router();

// ─── All farmer routes require authentication ─────────────
farmerRouter.use(authenticate);

// ─── Validation schemas ───────────────────────────────────
const createFarmerSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(100)
    .trim(),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(100)
    .trim(),
  phone: z
    .string()
    .regex(
      /^(\+251|0)[0-9]{9}$/,
      'Invalid Ethiopian phone number format. Use +251XXXXXXXXX or 0XXXXXXXXX',
    )
    .optional()
    .nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  kebeleId: z.string().min(1, 'Kebele is required'),
  landSizeTimad: z.coerce
    .number()
    .min(0, 'Land size cannot be negative')
    .optional()
    .nullable(),
  landSizeHectare: z.coerce
    .number()
    .min(0, 'Land size cannot be negative')
    .optional()
    .nullable(),
  gpsLat: z.coerce.number().min(-90).max(90).optional().nullable(),
  gpsLng: z.coerce.number().min(-180).max(180).optional().nullable(),
  primaryCropId: z.string().optional().nullable(),
  secondaryCropIds: z.array(z.string()).optional().default([]),
  notes: z
    .string()
    .max(1000, 'Notes must be under 1000 characters')
    .optional()
    .nullable(),
});

const updateFarmerSchema = createFarmerSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce
    .number()
    .min(1)
    .max(config.MAX_PAGE_SIZE)
    .default(config.DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
  kebeleId: z.string().optional(),
  woredaId: z.string().optional(),
  zoneId: z.string().optional(),
  regionId: z.string().optional(),
  primaryCropId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'FLAGGED', 'PENDING']).optional(),
  registeredById: z.string().optional(),
  hasPhoto: z.coerce.boolean().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  sortBy: z
    .enum(['firstName', 'lastName', 'createdAt', 'landSizeHectare', 'farmerId'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Generate unique farmer ID ────────────────────────────
const generateFarmerId = async (kebeleId: string): Promise<string> => {
  const kebele = await db.kebele.findUnique({
    where: { id: kebeleId },
    select: {
      id: true,
      woreda: {
        select: {
          zone: {
            select: {
              region: {
                select: { name: true },
              },
            },
          },
        },
      },
    },
  });

  const regionCode =
    kebele?.woreda.zone.region.name.substring(0, 3).toUpperCase() ?? 'ETH';

  const count = await db.farmer.count();
  const sequence = String(count + 1).padStart(6, '0');
  const year = new Date().getFullYear().toString().substring(2);

  return `FRM-${regionCode}-${year}-${sequence}`;
};

// ─── GET /api/v1/farmers ──────────────────────────────────
farmerRouter.get(
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
      search,
      kebeleId,
      woredaId,
      zoneId,
      regionId,
      primaryCropId,
      status,
      registeredById,
      hasPhoto,
      fromDate,
      toDate,
      sortBy,
      sortOrder,
    } = parsed.data;

    // Build where clause
    const where: Record<string, unknown> = {
      ...(search && {
        OR: [
          {
            firstName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            farmerId: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            phone: { contains: search, mode: 'insensitive' },
          },
        ],
      }),
      ...(kebeleId && { kebeleId }),
      ...(woredaId && {
        kebele: { woredaId },
      }),
      ...(zoneId && {
        kebele: { woreda: { zoneId } },
      }),
      ...(regionId && {
        kebele: { woreda: { zone: { regionId } } },
      }),
      ...(primaryCropId && { primaryCropId }),
      ...(status && { status }),
      ...(registeredById && { registeredById }),
      ...(hasPhoto !== undefined && {
        photoUrl: hasPhoto ? { not: null } : null,
      }),
      ...(fromDate && { createdAt: { gte: fromDate } }),
      ...(toDate && { createdAt: { lte: toDate } }),
    };

    // Field agents only see farmers in their assigned kebele
    if (req.user?.role === UserRole.FIELD_AGENT) {
      where.registeredById = req.user.id;
    }

    const { skip, take } = getPaginationParams(page, perPage);
    const orderBy = getSortParams(sortBy, sortOrder);

    const [farmers, total] = await Promise.all([
      db.farmer.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          farmerId: true,
          firstName: true,
          lastName: true,
          phone: true,
          photoUrl: true,
          landSizeTimad: true,
          landSizeHectare: true,
          gpsLat: true,
          gpsLng: true,
          status: true,
          createdAt: true,
          kebele: {
            select: {
              id: true,
              name: true,
              woreda: {
                select: {
                  id: true,
                  name: true,
                  zone: {
                    select: {
                      id: true,
                      name: true,
                      region: {
                        select: { id: true, name: true },
                      },
                    },
                  },
                },
              },
            },
          },
          primaryCrop: {
            select: { id: true, name: true, amharicName: true },
          },
          registeredBy: {
            select: { id: true, name: true },
          },
        },
      }),
      db.farmer.count({ where }),
    ]);

    return ApiResponse.paginated(
      res,
      farmers,
      { total, page, perPage },
      'Farmers fetched successfully',
    );
  }),
);

// ─── GET /api/v1/farmers/:id ──────────────────────────────
farmerRouter.get(
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

    const farmer = await db.farmer.findUnique({
      where: { id },
      select: {
        id: true,
        farmerId: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        photoUrl: true,
        landSizeTimad: true,
        landSizeHectare: true,
        gpsLat: true,
        gpsLng: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        kebele: {
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
                amharicName: true,
                zone: {
                  select: {
                    id: true,
                    name: true,
                    amharicName: true,
                    region: {
                      select: {
                        id: true,
                        name: true,
                        amharicName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        primaryCrop: {
          select: {
            id: true,
            name: true,
            amharicName: true,
            category: true,
          },
        },
        farmerCrops: {
          select: {
            crop: {
              select: {
                id: true,
                name: true,
                amharicName: true,
                category: true,
              },
            },
            season: true,
            isPrimary: true,
          },
        },
        registeredBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            yieldReports: true,
            distributions: true,
          },
        },
      },
    });

    if (!farmer) {
      throw ApiError.notFound('Farmer');
    }

    return ApiResponse.ok(res, 'Farmer fetched successfully', farmer);
  }),
);

// ─── POST /api/v1/farmers ─────────────────────────────────
farmerRouter.post(
  '/',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FIELD_AGENT]),
  asyncHandler(async (req, res) => {
    const parsed = createFarmerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation failed', parsed.error.errors);
    }

    const data = parsed.data;

    // Verify kebele exists
    const kebele = await db.kebele.findUnique({
      where: { id: data.kebeleId },
    });

    if (!kebele) {
      throw ApiError.badRequest('The selected kebele does not exist.');
    }

    // Check for duplicate farmer
    const potentialDuplicates = await db.farmer.findMany({
      where: {
        kebeleId: data.kebeleId,
        OR: [
          ...(data.phone ? [{ phone: data.phone }] : []),
          {
            AND: [
              {
                firstName: {
                  equals: data.firstName,
                  mode: 'insensitive' as const,
                },
              },
              {
                lastName: {
                  equals: data.lastName,
                  mode: 'insensitive' as const,
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        farmerId: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
      take: 5,
    });

    if (potentialDuplicates.length > 0) {
      throw ApiError.conflict(
        'Potential duplicate farmer detected. Please check existing records.',
      );
    }

    // Generate unique farmer ID
    const farmerId = await generateFarmerId(data.kebeleId);

    // Create farmer
    const newFarmer = await db.farmer.create({
      data: {
        farmerId,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
        gender: data.gender ?? null,
        kebeleId: data.kebeleId,
        landSizeTimad: data.landSizeTimad ?? null,
        landSizeHectare: data.landSizeHectare ?? null,
        gpsLat: data.gpsLat ?? null,
        gpsLng: data.gpsLng ?? null,
        primaryCropId: data.primaryCropId ?? null,
        notes: data.notes ?? null,
        status: 'ACTIVE',
        registeredById: req.user?.id ?? '',
      },
      select: {
        id: true,
        farmerId: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        createdAt: true,
        kebele: {
          select: {
            id: true,
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
    });

    // Create farmer crop relations if secondary crops provided
    if (data.secondaryCropIds && data.secondaryCropIds.length > 0) {
      await db.farmerCrop.createMany({
        data: data.secondaryCropIds.map((cropId) => ({
          farmerId: newFarmer.id,
          cropId,
          season: config.DEFAULT_SEASON,
          isPrimary: false,
        })),
        skipDuplicates: true,
      });
    }

    return ApiResponse.created(
      res,
      'Farmer registered successfully',
      newFarmer,
    );
  }),
);

// ─── PUT /api/v1/farmers/:id ──────────────────────────────
farmerRouter.put(
  '/:id',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FIELD_AGENT]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const parsed = updateFarmerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation failed', parsed.error.errors);
    }

    const farmer = await db.farmer.findUnique({ where: { id } });
    if (!farmer) {
      throw ApiError.notFound('Farmer');
    }

    // Field agents can only edit farmers they registered
    if (
      req.user?.role === UserRole.FIELD_AGENT &&
      farmer.registeredById !== req.user.id
    ) {
      throw ApiError.forbidden('You can only edit farmers you registered.');
    }

    const updatedFarmer = await db.farmer.update({
      where: { id },
      data: {
        ...parsed.data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        farmerId: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        updatedAt: true,
      },
    });

    return ApiResponse.ok(res, 'Farmer updated successfully', updatedFarmer);
  }),
);

// ─── POST /api/v1/farmers/:id/photo ──────────────────────
farmerRouter.post(
  '/:id/photo',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FIELD_AGENT]),
  uploadFarmerPhoto,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!req.file) {
      throw ApiError.badRequest(
        'No photo file provided. Please upload an image.',
      );
    }

    const farmer = await db.farmer.findUnique({ where: { id } });
    if (!farmer) {
      // Delete uploaded file if farmer not found
      deleteUploadedFile(req.file.path);
      throw ApiError.notFound('Farmer');
    }

    // Process image with Sharp
    const processedFilename = `farmer-processed-${Date.now()}.jpg`;
    const processedPath = path.join(
      process.cwd(),
      config.UPLOAD_DIR,
      'farmers',
      processedFilename,
    );

    await sharp(req.file.path)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 85, progressive: true })
      .toFile(processedPath);

    // Delete original uploaded file
    deleteUploadedFile(req.file.path);

    // Delete old photo if exists
    if (farmer.photoUrl) {
      const oldPhotoPath = path.join(process.cwd(), farmer.photoUrl);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Save relative path to database
    const relativePhotoPath = path.join(
      config.UPLOAD_DIR,
      'farmers',
      processedFilename,
    );

    const photoUrl = getFileUrl(processedPath, 'farmers');

    await db.farmer.update({
      where: { id },
      data: {
        photoUrl: relativePhotoPath,
        updatedAt: new Date(),
      },
    });

    return ApiResponse.ok(res, 'Farmer photo uploaded successfully', {
      photoUrl,
    });
  }),
);

// ─── GET /api/v1/farmers/:id/qrcode ──────────────────────
farmerRouter.get(
  '/:id/qrcode',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FIELD_AGENT,
    UserRole.NGO_PARTNER,
  ]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const farmer = await db.farmer.findUnique({
      where: { id },
      select: {
        id: true,
        farmerId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!farmer) {
      throw ApiError.notFound('Farmer');
    }

    // Generate QR code as data URL
    const qrData = JSON.stringify({
      farmerId: farmer.farmerId,
      id: farmer.id,
      name: `${farmer.firstName} ${farmer.lastName}`,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return ApiResponse.ok(res, 'QR code generated successfully', {
      farmerId: farmer.farmerId,
      qrCode: qrCodeDataUrl,
    });
  }),
);

// ─── GET /api/v1/farmers/:id/history ─────────────────────
farmerRouter.get(
  '/:id/history',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FIELD_AGENT,
    UserRole.NGO_PARTNER,
    UserRole.VIEWER,
  ]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const farmer = await db.farmer.findUnique({
      where: { id },
      select: { id: true, farmerId: true },
    });

    if (!farmer) {
      throw ApiError.notFound('Farmer');
    }

    // Fetch yield reports and distributions in parallel
    const [yieldReports, distributions] = await Promise.all([
      db.yieldReport.findMany({
        where: { farmerId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          season: true,
          year: true,
          stage: true,
          quantityKg: true,
          notes: true,
          createdAt: true,
          crop: {
            select: { id: true, name: true, amharicName: true },
          },
          submittedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      db.distribution.findMany({
        where: { farmerId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          quantity: true,
          unit: true,
          season: true,
          year: true,
          createdAt: true,
          inputType: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          organization: {
            select: { id: true, name: true },
          },
          distributedBy: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return ApiResponse.ok(res, 'Farmer history fetched successfully', {
      farmerId: farmer.farmerId,
      yieldReports,
      distributions,
      totals: {
        yieldReports: yieldReports.length,
        distributions: distributions.length,
      },
    });
  }),
);

// ─── POST /api/v1/farmers/check-duplicate ────────────────
farmerRouter.post(
  '/check-duplicate',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FIELD_AGENT]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      firstName: z.string().trim(),
      lastName: z.string().trim(),
      phone: z.string().optional(),
      kebeleId: z.string(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid input', parsed.error.errors);
    }

    const { firstName, lastName, phone, kebeleId } = parsed.data;

    const duplicates = await db.farmer.findMany({
      where: {
        kebeleId,
        OR: [
          ...(phone ? [{ phone }] : []),
          {
            AND: [
              {
                firstName: {
                  equals: firstName,
                  mode: 'insensitive' as const,
                },
              },
              {
                lastName: {
                  equals: lastName,
                  mode: 'insensitive' as const,
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        farmerId: true,
        firstName: true,
        lastName: true,
        phone: true,
        photoUrl: true,
        kebele: {
          select: { name: true },
        },
        createdAt: true,
      },
      take: 5,
    });

    return ApiResponse.ok(res, 'Duplicate check complete', {
      hasDuplicates: duplicates.length > 0,
      duplicates,
      count: duplicates.length,
    });
  }),
);

// ─── PATCH /api/v1/farmers/:id/status ────────────────────
farmerRouter.patch(
  '/:id/status',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const schema = z.object({
      status: z.enum(['ACTIVE', 'INACTIVE', 'FLAGGED', 'PENDING']),
      reason: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid status', parsed.error.errors);
    }

    const farmer = await db.farmer.findUnique({ where: { id } });
    if (!farmer) {
      throw ApiError.notFound('Farmer');
    }

    const updated = await db.farmer.update({
      where: { id },
      data: {
        status: parsed.data.status,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        farmerId: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    return ApiResponse.ok(res, 'Farmer status updated successfully', updated);
  }),
);

// ─── DELETE /api/v1/farmers/:id ───────────────────────────
farmerRouter.delete(
  '/:id',
  authorize([UserRole.SUPER_ADMIN]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const farmer = await db.farmer.findUnique({ where: { id } });
    if (!farmer) {
      throw ApiError.notFound('Farmer');
    }

    // Delete farmer photo if exists
    if (farmer.photoUrl) {
      deleteUploadedFile(farmer.photoUrl);
    }

    await db.farmer.delete({ where: { id } });

    return ApiResponse.noContent(res);
  }),
);

export default farmerRouter;
