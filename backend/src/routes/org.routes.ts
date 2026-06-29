import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/authenticate';
import { authorize, UserRole } from '../middleware/authorize';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiResponse } from '../lib/ApiResponse';
import { ApiError } from '../lib/ApiError';
import { db, getPaginationParams, getSortParams } from '../lib/db';
import { config } from '../config/env';

export const orgRouter = Router();

// ─── All org routes require authentication ────────────────
orgRouter.use(authenticate);

// ─── Validation schemas ───────────────────────────────────
const createOrgSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(200, 'Organization name must be under 200 characters')
    .trim(),
  type: z.enum(['NGO', 'GOVERNMENT', 'INTERNATIONAL', 'RESEARCH', 'OTHER']),
  description: z
    .string()
    .max(1000, 'Description must be under 1000 characters')
    .optional(),
  website: z.string().url('Invalid website URL').optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  focusAreas: z.array(z.string()).optional().default([]),
  activeRegions: z.array(z.string()).optional().default([]),
  isActive: z.boolean().default(true),
});

const updateOrgSchema = createOrgSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce
    .number()
    .min(1)
    .max(config.MAX_PAGE_SIZE)
    .default(config.DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
  type: z
    .enum(['NGO', 'GOVERNMENT', 'INTERNATIONAL', 'RESEARCH', 'OTHER'])
    .optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'type', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── GET /api/v1/organizations ────────────────────────────
// Get all organizations with pagination, search, and filters
orgRouter.get(
  '/',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest(
        'Invalid query parameters',
        parsed.error.errors,
      );
    }

    const { page, perPage, search, type, isActive, sortBy, sortOrder } =
      parsed.data;

    const where = {
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }),
      ...(type && { type }),
      ...(isActive !== undefined && { isActive }),
    };

    const { skip, take } = getPaginationParams(page, perPage);
    const orderBy = getSortParams(sortBy, sortOrder);

    const [organizations, total] = await Promise.all([
      db.organization.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          website: true,
          email: true,
          phone: true,
          address: true,
          focusAreas: true,
          activeRegions: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
              distributions: true,
            },
          },
        },
      }),
      db.organization.count({ where }),
    ]);

    return ApiResponse.paginated(
      res,
      organizations,
      { total, page, perPage },
      'Organizations fetched successfully',
    );
  }),
);

// ─── GET /api/v1/organizations/:id ───────────────────────
// Get a single organization by ID with full details
orgRouter.get(
  '/:id',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.NGO_PARTNER,
    UserRole.VIEWER,
  ]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // NGO Partners can only view their own organization
    if (req.user?.role === UserRole.NGO_PARTNER && req.user?.orgId !== id) {
      throw ApiError.forbidden('You can only view your own organization.');
    }

    const org = await db.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        website: true,
        email: true,
        phone: true,
        address: true,
        focusAreas: true,
        activeRegions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            users: true,
            distributions: true,
          },
        },
      },
    });

    if (!org) {
      throw ApiError.notFound('Organization');
    }

    // Get distribution stats for this organization
    const distributionStats = await db.distribution.groupBy({
      by: ['season'],
      where: { orgId: id },
      _count: { id: true },
      _sum: { quantity: true },
      orderBy: { season: 'desc' },
      take: 4,
    });

    return ApiResponse.ok(res, 'Organization fetched successfully', {
      ...org,
      distributionStats,
    });
  }),
);

// ─── POST /api/v1/organizations ───────────────────────────
// Create a new organization — Super Admin only
orgRouter.post(
  '/',
  authorize([UserRole.SUPER_ADMIN]),
  asyncHandler(async (req, res) => {
    const parsed = createOrgSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation failed', parsed.error.errors);
    }

    // Check if organization name already exists
    const existingOrg = await db.organization.findFirst({
      where: {
        name: {
          equals: parsed.data.name,
          mode: 'insensitive',
        },
      },
    });

    if (existingOrg) {
      throw ApiError.conflict('An organization with this name already exists.');
    }

    const newOrg = await db.organization.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        description: parsed.data.description ?? null,
        website: parsed.data.website ?? null,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        address: parsed.data.address ?? null,
        focusAreas: parsed.data.focusAreas ?? [],
        activeRegions: parsed.data.activeRegions ?? [],
        isActive: parsed.data.isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        website: true,
        email: true,
        phone: true,
        address: true,
        focusAreas: true,
        activeRegions: true,
        isActive: true,
        createdAt: true,
      },
    });

    return ApiResponse.created(
      res,
      'Organization created successfully',
      newOrg,
    );
  }),
);

// ─── PUT /api/v1/organizations/:id ───────────────────────
// Update an organization — Super Admin and Admin
orgRouter.put(
  '/:id',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const parsed = updateOrgSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation failed', parsed.error.errors);
    }

    const existingOrg = await db.organization.findUnique({
      where: { id },
    });

    if (!existingOrg) {
      throw ApiError.notFound('Organization');
    }

    // Check name uniqueness if name is being changed
    if (parsed.data.name && parsed.data.name !== existingOrg.name) {
      const nameExists = await db.organization.findFirst({
        where: {
          name: {
            equals: parsed.data.name,
            mode: 'insensitive',
          },
          id: { not: id },
        },
      });

      if (nameExists) {
        throw ApiError.conflict(
          'An organization with this name already exists.',
        );
      }
    }

    const updatedOrg = await db.organization.update({
      where: { id },
      data: {
        ...parsed.data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        website: true,
        email: true,
        phone: true,
        address: true,
        focusAreas: true,
        activeRegions: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return ApiResponse.ok(res, 'Organization updated successfully', updatedOrg);
  }),
);

// ─── PATCH /api/v1/organizations/:id/deactivate ──────────
// Deactivate an organization — Super Admin only
orgRouter.patch(
  '/:id/deactivate',
  authorize([UserRole.SUPER_ADMIN]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const org = await db.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw ApiError.notFound('Organization');
    }

    if (!org.isActive) {
      throw ApiError.badRequest('Organization is already deactivated.');
    }

    await db.organization.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    });

    return ApiResponse.ok(res, 'Organization deactivated successfully', {
      id,
      isActive: false,
    });
  }),
);

// ─── PATCH /api/v1/organizations/:id/activate ────────────
// Reactivate an organization — Super Admin only
orgRouter.patch(
  '/:id/activate',
  authorize([UserRole.SUPER_ADMIN]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const org = await db.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw ApiError.notFound('Organization');
    }

    if (org.isActive) {
      throw ApiError.badRequest('Organization is already active.');
    }

    await db.organization.update({
      where: { id },
      data: { isActive: true, updatedAt: new Date() },
    });

    return ApiResponse.ok(res, 'Organization activated successfully', {
      id,
      isActive: true,
    });
  }),
);

// ─── GET /api/v1/organizations/:id/activity ──────────────
// Get recent activity for an organization
orgRouter.get(
  '/:id/activity',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.NGO_PARTNER]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // NGO Partners can only view their own organization activity
    if (req.user?.role === UserRole.NGO_PARTNER && req.user?.orgId !== id) {
      throw ApiError.forbidden(
        'You can only view your own organization activity.',
      );
    }

    const org = await db.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw ApiError.notFound('Organization');
    }

    // Get recent distributions by this organization
    const recentDistributions = await db.distribution.findMany({
      where: { orgId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        quantity: true,
        unit: true,
        season: true,
        year: true,
        createdAt: true,
        farmer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            farmerId: true,
          },
        },
        inputType: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        distributedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get distribution summary stats
    const currentYear = new Date().getFullYear();
    const stats = await db.distribution.aggregate({
      where: {
        orgId: id,
        year: currentYear,
      },
      _count: { id: true },
      _sum: { quantity: true },
    });

    // Get unique farmers reached this year
    const uniqueFarmers = await db.distribution.findMany({
      where: { orgId: id, year: currentYear },
      select: { farmerId: true },
      distinct: ['farmerId'],
    });

    return ApiResponse.ok(res, 'Organization activity fetched successfully', {
      recentDistributions,
      summary: {
        totalDistributions: stats._count.id,
        totalQuantity: stats._sum.quantity ?? 0,
        uniqueFarmersReached: uniqueFarmers.length,
        year: currentYear,
      },
    });
  }),
);

// ─── DELETE /api/v1/organizations/:id ────────────────────
// Permanently delete an organization — Super Admin only
orgRouter.delete(
  '/:id',
  authorize([UserRole.SUPER_ADMIN]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const org = await db.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            distributions: true,
          },
        },
      },
    });

    if (!org) {
      throw ApiError.notFound('Organization');
    }

    // Prevent deletion if organization has active users
    if (org._count.users > 0) {
      throw ApiError.badRequest(
        `Cannot delete organization with ${org._count.users} active user(s). ` +
          'Please reassign or deactivate all users first.',
      );
    }

    await db.organization.delete({ where: { id } });

    return ApiResponse.noContent(res);
  }),
);

export default orgRouter;
