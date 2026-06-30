import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/authenticate';
import { authorize, UserRole } from '../middleware/authorize';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiResponse } from '../lib/ApiResponse';
import { ApiError } from '../lib/ApiError';
import { db, getPaginationParams } from '../lib/db';
import { config } from '../config/env';

export const auditRouter = Router();

// ─── All audit routes require authentication ──────────────
auditRouter.use(authenticate);

// ─── All audit routes are Super Admin only ────────────────
auditRouter.use(authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]));

// ─── GET /api/v1/audit ───────────────────────────────────
// Get audit logs with filters and pagination
auditRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      page: z.coerce.number().min(1).default(1),
      perPage: z.coerce
        .number()
        .min(1)
        .max(config.MAX_PAGE_SIZE)
        .default(config.DEFAULT_PAGE_SIZE),
      userId: z.string().optional(),
      action: z
        .enum([
          'CREATE',
          'UPDATE',
          'DELETE',
          'LOGIN',
          'LOGOUT',
          'EXPORT',
          'IMPORT',
          'APPROVE',
          'REJECT',
        ])
        .optional(),
      tableName: z.string().optional(),
      recordId: z.string().optional(),
      ipAddress: z.string().optional(),
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest(
        'Invalid query parameters',
        parsed.error.errors,
      );
    }

    const {
      page,
      perPage,
      userId,
      action,
      tableName,
      recordId,
      ipAddress,
      fromDate,
      toDate,
      sortOrder,
    } = parsed.data;

    const where = {
      ...(userId && { userId }),
      ...(action && { action }),
      ...(tableName && {
        tableName: {
          contains: tableName,
          mode: 'insensitive' as const,
        },
      }),
      ...(recordId && { recordId }),
      ...(ipAddress && { ipAddress }),
      ...(fromDate && { createdAt: { gte: fromDate } }),
      ...(toDate && {
        createdAt: {
          ...(fromDate ? { gte: fromDate } : {}),
          lte: toDate,
        },
      }),
    };

    const { skip, take } = getPaginationParams(page, perPage);

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: sortOrder },
        select: {
          id: true,
          action: true,
          tableName: true,
          recordId: true,
          beforeState: true,
          afterState: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    return ApiResponse.paginated(
      res,
      logs,
      { total, page, perPage },
      'Audit logs fetched successfully',
    );
  }),
);

// ─── GET /api/v1/audit/:id ───────────────────────────────
// Get a single audit log entry with full before/after diff
auditRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const log = await db.auditLog.findUnique({
      where: { id },
      select: {
        id: true,
        action: true,
        tableName: true,
        recordId: true,
        beforeState: true,
        afterState: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!log) {
      throw ApiError.notFound('Audit log entry');
    }

    // Parse before and after states for diff display
    let beforeState: unknown = null;
    let afterState: unknown = null;
    const diff: Record<string, { before: unknown; after: unknown }> = {};

    try {
      if (log.beforeState) {
        beforeState = JSON.parse(log.beforeState as string);
      }
      if (log.afterState) {
        afterState = JSON.parse(log.afterState as string);
      }

      // Compute diff if both states exist
      if (
        beforeState &&
        afterState &&
        typeof beforeState === 'object' &&
        typeof afterState === 'object'
      ) {
        const before = beforeState as Record<string, unknown>;
        const after = afterState as Record<string, unknown>;
        const allKeys = new Set([
          ...Object.keys(before),
          ...Object.keys(after),
        ]);

        allKeys.forEach((key) => {
          if (before[key] !== after[key]) {
            diff[key] = {
              before: before[key],
              after: after[key],
            };
          }
        });
      }
    } catch {
      // State parsing failed — return raw strings
    }

    return ApiResponse.ok(res, 'Audit log entry fetched successfully', {
      ...log,
      beforeState,
      afterState,
      diff,
      hasChanges: Object.keys(diff).length > 0,
    });
  }),
);

// ─── GET /api/v1/audit/record/:tableName/:recordId ───────
// Get all audit logs for a specific record
auditRouter.get(
  '/record/:tableName/:recordId',
  asyncHandler(async (req, res) => {
    const { tableName, recordId } = req.params;

    const logs = await db.auditLog.findMany({
      where: { tableName, recordId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        tableName: true,
        recordId: true,
        beforeState: true,
        afterState: true,
        ipAddress: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return ApiResponse.ok(res, 'Record audit history fetched successfully', {
      tableName,
      recordId,
      logs,
      count: logs.length,
    });
  }),
);

// ─── GET /api/v1/audit/user/:userId ──────────────────────
// Get all audit logs for a specific user
auditRouter.get(
  '/user/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const schema = z.object({
      page: z.coerce.number().min(1).default(1),
      perPage: z.coerce.number().min(1).max(50).default(20),
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest(
        'Invalid query parameters',
        parsed.error.errors,
      );
    }

    const { page, perPage, fromDate, toDate } = parsed.data;

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      throw ApiError.notFound('User');
    }

    const where = {
      userId,
      ...(fromDate && { createdAt: { gte: fromDate } }),
      ...(toDate && {
        createdAt: {
          ...(fromDate ? { gte: fromDate } : {}),
          lte: toDate,
        },
      }),
    };

    const { skip, take } = getPaginationParams(page, perPage);

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          tableName: true,
          recordId: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
      db.auditLog.count({ where }),
    ]);

    return ApiResponse.paginated(
      res,
      logs,
      { total, page, perPage },
      'User audit history fetched successfully',
    );
  }),
);

// ─── GET /api/v1/audit/stats ─────────────────────────────
// Get audit log statistics — action counts by type
auditRouter.get(
  '/stats',
  authorize([UserRole.SUPER_ADMIN]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const dateFilter =
      parsed.data.fromDate || parsed.data.toDate
        ? {
            createdAt: {
              ...(parsed.data.fromDate && {
                gte: parsed.data.fromDate,
              }),
              ...(parsed.data.toDate && {
                lte: parsed.data.toDate,
              }),
            },
          }
        : {};

    const [totalLogs, byAction, byTable, byUser, recentActivity] =
      await Promise.all([
        db.auditLog.count({ where: dateFilter }),
        db.auditLog.groupBy({
          by: ['action'],
          where: dateFilter,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
        }),
        db.auditLog.groupBy({
          by: ['tableName'],
          where: dateFilter,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
        db.auditLog.groupBy({
          by: ['userId'],
          where: dateFilter,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 5,
        }),
        db.auditLog.findMany({
          where: dateFilter,
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            action: true,
            tableName: true,
            createdAt: true,
            user: {
              select: { name: true, role: true },
            },
          },
        }),
      ]);

    // Get user names for top users
    const userIds = byUser.map((u) => u.userId);
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return ApiResponse.ok(res, 'Audit stats fetched successfully', {
      totalLogs,
      byAction: byAction.map((b) => ({
        action: b.action,
        count: b._count.id,
      })),
      byTable: byTable.map((b) => ({
        table: b.tableName,
        count: b._count.id,
      })),
      topUsers: byUser.map((b) => ({
        user: userMap.get(b.userId),
        count: b._count.id,
      })),
      recentActivity,
    });
  }),
);

export default auditRouter;
