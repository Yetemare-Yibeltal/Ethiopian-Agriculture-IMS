import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/authenticate';
import { authorize, UserRole } from '../middleware/authorize';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiResponse } from '../lib/ApiResponse';
import { ApiError } from '../lib/ApiError';
import { db } from '../lib/db';

export const mapRouter = Router();

// ─── All map routes require authentication ────────────────
mapRouter.use(authenticate);

// ─── GET /api/v1/map/farmers ─────────────────────────────
// Get all farmer GPS coordinates for map pins
mapRouter.get(
  '/farmers',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FIELD_AGENT,
    UserRole.NGO_PARTNER,
    UserRole.VIEWER,
  ]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      regionId: z.string().optional(),
      zoneId: z.string().optional(),
      woredaId: z.string().optional(),
      kebeleId: z.string().optional(),
      cropId: z.string().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'FLAGGED', 'PENDING']).optional(),
      season: z.enum(['Meher', 'Belg']).optional(),
      year: z.coerce.number().optional(),
      hasDistribution: z.coerce.boolean().optional(),
      limit: z.coerce.number().min(1).max(10000).default(5000),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest(
        'Invalid query parameters',
        parsed.error.errors,
      );
    }

    const {
      regionId,
      zoneId,
      woredaId,
      kebeleId,
      cropId,
      status,
      season,
      year,
      hasDistribution,
      limit,
    } = parsed.data;

    const where: Record<string, unknown> = {
      // Only return farmers with GPS coordinates
      gpsLat: { not: null },
      gpsLng: { not: null },
      ...(status && { status }),
      ...(kebeleId && { kebeleId }),
      ...(woredaId && { kebele: { woredaId } }),
      ...(zoneId && {
        kebele: { woreda: { zoneId } },
      }),
      ...(regionId && {
        kebele: { woreda: { zone: { regionId } } },
      }),
      ...(cropId && { primaryCropId: cropId }),
      ...(hasDistribution !== undefined && {
        distributions: hasDistribution
          ? {
              some: {
                ...(season && { season }),
                ...(year && { year }),
              },
            }
          : {
              none: {
                ...(season && { season }),
                ...(year && { year }),
              },
            },
      }),
    };

    const farmers = await db.farmer.findMany({
      where,
      take: limit,
      select: {
        id: true,
        farmerId: true,
        firstName: true,
        lastName: true,
        gpsLat: true,
        gpsLng: true,
        status: true,
        photoUrl: true,
        primaryCrop: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
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
        _count: {
          select: {
            distributions: true,
            yieldReports: true,
          },
        },
      },
    });

    // Format as GeoJSON FeatureCollection
    const geoJson = {
      type: 'FeatureCollection',
      features: farmers.map((farmer) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [farmer.gpsLng, farmer.gpsLat],
        },
        properties: {
          id: farmer.id,
          farmerId: farmer.farmerId,
          name: `${farmer.firstName} ${farmer.lastName}`,
          status: farmer.status,
          photoUrl: farmer.photoUrl,
          crop: farmer.primaryCrop,
          location: farmer.kebele,
          distributionCount: farmer._count.distributions,
          yieldReportCount: farmer._count.yieldReports,
        },
      })),
      totalCount: farmers.length,
    };

    return ApiResponse.ok(res, 'Farmer map data fetched successfully', geoJson);
  }),
);

// ─── GET /api/v1/map/heatmap ─────────────────────────────
// Get farmer density data for heatmap layer
mapRouter.get(
  '/heatmap',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      regionId: z.string().optional(),
      intensity: z
        .enum(['farmer_count', 'yield', 'distribution'])
        .default('farmer_count'),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const { regionId, intensity } = parsed.data;

    // Get farmer coordinates for heatmap
    const farmers = await db.farmer.findMany({
      where: {
        gpsLat: { not: null },
        gpsLng: { not: null },
        status: 'ACTIVE',
        ...(regionId && {
          kebele: { woreda: { zone: { regionId } } },
        }),
      },
      select: {
        gpsLat: true,
        gpsLng: true,
        _count: {
          select: {
            distributions: true,
            yieldReports: true,
          },
        },
      },
      take: 10000,
    });

    // Format for Leaflet.heat plugin
    // Format: [lat, lng, intensity]
    const heatmapData = farmers.map((farmer) => {
      let intensityValue = 1;

      if (intensity === 'distribution') {
        intensityValue = Math.min(farmer._count.distributions / 5, 1);
      } else if (intensity === 'yield') {
        intensityValue = Math.min(farmer._count.yieldReports / 3, 1);
      }

      return [farmer.gpsLat, farmer.gpsLng, intensityValue];
    });

    return ApiResponse.ok(res, 'Heatmap data fetched successfully', {
      data: heatmapData,
      count: heatmapData.length,
      intensity,
    });
  }),
);

// ─── GET /api/v1/map/boundaries/woredas ──────────────────
// Get woreda boundaries as GeoJSON
mapRouter.get(
  '/boundaries/woredas',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.NGO_PARTNER,
    UserRole.VIEWER,
  ]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      regionId: z.string().optional(),
      zoneId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const { regionId, zoneId } = parsed.data;

    const woredas = await db.woreda.findMany({
      where: {
        ...(zoneId && { zoneId }),
        ...(regionId && { zone: { regionId } }),
      },
      select: {
        id: true,
        name: true,
        amharicName: true,
        zone: {
          select: {
            id: true,
            name: true,
            region: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { kebeles: true },
        },
      },
    });

    return ApiResponse.ok(res, 'Woreda boundaries fetched successfully', {
      woredas,
      count: woredas.length,
      note: 'Full GeoJSON polygon boundaries require PostGIS extension — returning woreda data for client-side rendering',
    });
  }),
);

// ─── GET /api/v1/map/kebeles ─────────────────────────────
// Get kebele center points for map display
mapRouter.get(
  '/kebeles',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FIELD_AGENT,
    UserRole.NGO_PARTNER,
    UserRole.VIEWER,
  ]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      woredaId: z.string().optional(),
      zoneId: z.string().optional(),
      regionId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const { woredaId, zoneId, regionId } = parsed.data;

    const kebeles = await db.kebele.findMany({
      where: {
        gpsLat: { not: null },
        gpsLng: { not: null },
        ...(woredaId && { woredaId }),
        ...(zoneId && { woreda: { zoneId } }),
        ...(regionId && { woreda: { zone: { regionId } } }),
      },
      select: {
        id: true,
        name: true,
        amharicName: true,
        geoLat: true,
        geoLng: true,
        _count: {
          select: { farmers: true },
        },
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
    });

    const geoJson = {
      type: 'FeatureCollection',
      features: kebeles.map((kebele) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [kebele.geoLng, kebele.geoLat],
        },
        properties: {
          id: kebele.id,
          name: kebele.name,
          amharicName: kebele.amharicName,
          farmerCount: kebele._count.farmers,
          woreda: kebele.woreda,
        },
      })),
    };

    return ApiResponse.ok(res, 'Kebele map data fetched successfully', geoJson);
  }),
);

// ─── GET /api/v1/map/zones ───────────────────────────────
// Get all admin-drawn zones (irrigation, drought-risk etc)
mapRouter.get(
  '/zones',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.NGO_PARTNER,
    UserRole.VIEWER,
  ]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      type: z
        .enum([
          'IRRIGATION',
          'DROUGHT_RISK',
          'NGO_COVERAGE',
          'FLOOD_RISK',
          'CUSTOM',
        ])
        .optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const zones = await db.drawnZone.findMany({
      where: {
        ...(parsed.data.type && { type: parsed.data.type }),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        geoJson: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return ApiResponse.ok(res, 'Map zones fetched successfully', zones);
  }),
);

// ─── POST /api/v1/map/zones ──────────────────────────────
// Create a new admin-drawn zone
mapRouter.post(
  '/zones',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z
        .string()
        .min(2, 'Zone name must be at least 2 characters')
        .max(200)
        .trim(),
      type: z.enum([
        'IRRIGATION',
        'DROUGHT_RISK',
        'NGO_COVERAGE',
        'FLOOD_RISK',
        'CUSTOM',
      ]),
      geoJson: z.string().min(1, 'GeoJSON polygon is required'),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation failed', parsed.error.errors);
    }

    // Validate that geoJson is valid JSON
    try {
      JSON.parse(parsed.data.geoJson);
    } catch {
      throw ApiError.badRequest(
        'Invalid GeoJSON format. Please provide valid GeoJSON.',
      );
    }

    const newZone = await db.drawnZone.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        geoJson: parsed.data.geoJson,
        createdById: req.user?.id ?? '',
      },
      select: {
        id: true,
        name: true,
        type: true,
        geoJson: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return ApiResponse.created(res, 'Map zone created successfully', newZone);
  }),
);

// ─── PUT /api/v1/map/zones/:id ───────────────────────────
// Update an existing zone
mapRouter.put(
  '/zones/:id',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const schema = z.object({
      name: z.string().min(2).max(200).trim().optional(),
      type: z
        .enum([
          'IRRIGATION',
          'DROUGHT_RISK',
          'NGO_COVERAGE',
          'FLOOD_RISK',
          'CUSTOM',
        ])
        .optional(),
      geoJson: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation failed', parsed.error.errors);
    }

    const zone = await db.drawnZone.findUnique({ where: { id } });
    if (!zone) {
      throw ApiError.notFound('Map zone');
    }

    if (parsed.data.geoJson) {
      try {
        JSON.parse(parsed.data.geoJson);
      } catch {
        throw ApiError.badRequest('Invalid GeoJSON format.');
      }
    }

    const updated = await db.drawnZone.update({
      where: { id },
      data: {
        ...parsed.data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        type: true,
        geoJson: true,
        updatedAt: true,
      },
    });

    return ApiResponse.ok(res, 'Map zone updated successfully', updated);
  }),
);

// ─── DELETE /api/v1/map/zones/:id ────────────────────────
// Delete a drawn zone — Admin only
mapRouter.delete(
  '/zones/:id',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const zone = await db.drawnZone.findUnique({ where: { id } });
    if (!zone) {
      throw ApiError.notFound('Map zone');
    }

    await db.drawnZone.delete({ where: { id } });

    return ApiResponse.noContent(res);
  }),
);

export default mapRouter;
