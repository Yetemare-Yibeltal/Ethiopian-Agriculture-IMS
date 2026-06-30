import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/authenticate';
import { authorize, UserRole } from '../middleware/authorize';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiResponse } from '../lib/ApiResponse';
import { ApiError } from '../lib/ApiError';
import { db, getPaginationParams } from '../lib/db';
import { config } from '../config/env';

export const notificationRouter = Router();

// ─── All notification routes require authentication ───────
notificationRouter.use(authenticate);

// ─── GET /api/v1/notifications ───────────────────────────
// Get all notifications for the current user
notificationRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      page: z.coerce.number().min(1).default(1),
      perPage: z.coerce.number().min(1).max(50).default(20),
      isRead: z.coerce.boolean().optional(),
      type: z
        .enum([
          'FOOD_SECURITY_ALERT',
          'DUPLICATE_BLOCKED',
          'EXPORT_READY',
          'NEW_USER',
          'SYSTEM',
          'AID_REMINDER',
        ])
        .optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest(
        'Invalid query parameters',
        parsed.error.errors,
      );
    }

    const { page, perPage, isRead, type } = parsed.data;
    const userId = req.user?.id ?? '';

    const where = {
      userId,
      ...(isRead !== undefined && { isRead }),
      ...(type && { type }),
    };

    const { skip, take } = getPaginationParams(page, perPage);

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          isRead: true,
          metadata: true,
          createdAt: true,
        },
      }),
    ]);

    return ApiResponse.paginated(
      res,
      notifications,
      { total, page, perPage },
      'Notifications fetched successfully',
    );
  }),
);

// ─── GET /api/v1/notifications/unread-count ──────────────
// Get just the unread count — for polling by frontend bell
notificationRouter.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? '';

    const count = await db.notification.count({
      where: { userId, isRead: false },
    });

    return ApiResponse.ok(res, 'Unread count fetched', { count });
  }),
);

// ─── PATCH /api/v1/notifications/:id/read ────────────────
// Mark a single notification as read
notificationRouter.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id ?? '';

    const notification = await db.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw ApiError.notFound('Notification');
    }

    // Users can only mark their own notifications as read
    if (notification.userId !== userId) {
      throw ApiError.forbidden(
        'You can only mark your own notifications as read.',
      );
    }

    if (notification.isRead) {
      return ApiResponse.ok(res, 'Notification already marked as read', {
        id,
        isRead: true,
      });
    }

    await db.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return ApiResponse.ok(res, 'Notification marked as read', {
      id,
      isRead: true,
    });
  }),
);

// ─── PATCH /api/v1/notifications/read-all ────────────────
// Mark all notifications as read for current user
notificationRouter.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? '';

    const result = await db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return ApiResponse.ok(res, `${result.count} notifications marked as read`, {
      count: result.count,
    });
  }),
);

// ─── DELETE /api/v1/notifications/:id ────────────────────
// Delete a single notification
notificationRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id ?? '';

    const notification = await db.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw ApiError.notFound('Notification');
    }

    if (notification.userId !== userId) {
      throw ApiError.forbidden('You can only delete your own notifications.');
    }

    await db.notification.delete({ where: { id } });

    return ApiResponse.noContent(res);
  }),
);

// ─── DELETE /api/v1/notifications/clear-all ──────────────
// Delete all read notifications for current user
notificationRouter.delete(
  '/clear-all',
  asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? '';

    const result = await db.notification.deleteMany({
      where: { userId, isRead: true },
    });

    return ApiResponse.ok(res, `${result.count} read notifications cleared`, {
      count: result.count,
    });
  }),
);

// ─── POST /api/v1/notifications/broadcast ────────────────
// Send a notification to all users — Super Admin only
notificationRouter.post(
  '/broadcast',
  authorize([UserRole.SUPER_ADMIN]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      title: z
        .string()
        .min(2, 'Title must be at least 2 characters')
        .max(200)
        .trim(),
      message: z
        .string()
        .min(5, 'Message must be at least 5 characters')
        .max(1000)
        .trim(),
      type: z
        .enum([
          'FOOD_SECURITY_ALERT',
          'DUPLICATE_BLOCKED',
          'EXPORT_READY',
          'NEW_USER',
          'SYSTEM',
          'AID_REMINDER',
        ])
        .default('SYSTEM'),
      roleFilter: z
        .enum([
          'ALL',
          'SUPER_ADMIN',
          'ADMIN',
          'FIELD_AGENT',
          'NGO_PARTNER',
          'VIEWER',
        ])
        .default('ALL'),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation failed', parsed.error.errors);
    }

    const { title, message, type, roleFilter } = parsed.data;

    // Get target users
    const users = await db.user.findMany({
      where: {
        isActive: true,
        ...(roleFilter !== 'ALL' && { role: roleFilter }),
      },
      select: { id: true },
    });

    if (users.length === 0) {
      return ApiResponse.ok(res, 'No users found to notify', { sent: 0 });
    }

    // Create notifications for all target users
    await db.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type,
        title,
        message,
        isRead: false,
      })),
    });

    return ApiResponse.created(res, `Broadcast sent to ${users.length} users`, {
      sent: users.length,
      type,
      roleFilter,
    });
  }),
);

// ─── GET /api/v1/notifications/admin/all ─────────────────
// Get all notifications across all users — Super Admin only
notificationRouter.get(
  '/admin/all',
  authorize([UserRole.SUPER_ADMIN]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      page: z.coerce.number().min(1).default(1),
      perPage: z.coerce
        .number()
        .min(1)
        .max(config.MAX_PAGE_SIZE)
        .default(config.DEFAULT_PAGE_SIZE),
      type: z
        .enum([
          'FOOD_SECURITY_ALERT',
          'DUPLICATE_BLOCKED',
          'EXPORT_READY',
          'NEW_USER',
          'SYSTEM',
          'AID_REMINDER',
        ])
        .optional(),
      userId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest(
        'Invalid query parameters',
        parsed.error.errors,
      );
    }

    const { page, perPage, type, userId } = parsed.data;
    const { skip, take } = getPaginationParams(page, perPage);

    const where = {
      ...(type && { type }),
      ...(userId && { userId }),
    };

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          isRead: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      }),
      db.notification.count({ where }),
    ]);

    return ApiResponse.paginated(
      res,
      notifications,
      { total, page, perPage },
      'All notifications fetched successfully',
    );
  }),
);

export default notificationRouter;
