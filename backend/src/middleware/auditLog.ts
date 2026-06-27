import type { NextFunction, Request, Response } from 'express';

import { db } from '../lib/db';
import { logger } from '../lib/logger';
import type { AuthenticatedRequest } from './authenticate';

// ─── Audit action types ───────────────────────────────────
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

// ─── Map HTTP methods to audit actions ────────────────────
const methodToAction: Record<string, AuditAction> = {
  POST: AuditAction.CREATE,
  PUT: AuditAction.UPDATE,
  PATCH: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
};

// ─── Extract table name from URL ──────────────────────────
const extractTableName = (url: string): string => {
  const parts = url
    .split('?')[0]
    .split('/')
    .filter((p) => p && p !== 'api' && p !== 'v1');

  // Return the first meaningful segment as table name
  const tableMap: Record<string, string> = {
    farmers: 'farmer',
    users: 'user',
    organizations: 'organization',
    yields: 'yield_report',
    inputs: 'distribution',
    zones: 'drawn_zone',
    exports: 'export_job',
    notifications: 'notification',
  };

  const firstSegment = parts[0] || 'unknown';
  return tableMap[firstSegment] || firstSegment;
};

// ─── Extract record ID from URL ───────────────────────────
const extractRecordId = (url: string): string | null => {
  const parts = url
    .split('?')[0]
    .split('/')
    .filter((p) => p && p !== 'api' && p !== 'v1');

  // Check if second segment looks like an ID (UUID or number)
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const idPattern = /^[0-9]+$/;

  const secondSegment = parts[1];
  if (
    secondSegment &&
    (uuidPattern.test(secondSegment) || idPattern.test(secondSegment))
  ) {
    return secondSegment;
  }

  return null;
};

// ─── Routes to skip audit logging ────────────────────────
const skipRoutes = [
  '/health',
  '/api/v1/health',
  '/api/v1/auth/refresh',
  '/api/v1/notifications',
  '/api/v1/dashboard',
  '/api/v1/analytics',
  '/api/v1/regions',
];

const shouldSkip = (url: string, method: string): boolean => {
  if (method === 'GET') {
    return true;
  }
  return skipRoutes.some((route) => url.startsWith(route));
};

/**
 * Audit log middleware.
 * Intercepts mutating requests and writes audit records
 * after the response is sent successfully.
 *
 * Usage in app.ts — mount after authenticate:
 *   app.use(authenticate);
 *   app.use(auditLogMiddleware);
 *   app.use(router);
 */
export const auditLogMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Skip GET requests and non-audit routes
  if (shouldSkip(req.originalUrl, req.method)) {
    next();
    return;
  }

  // Capture request body before it gets consumed
  const requestBody = { ...req.body };

  // Remove sensitive fields from audit log
  const sensitiveFields = ['password', 'confirmPassword', 'token', 'secret'];
  sensitiveFields.forEach((field) => {
    if (requestBody[field]) {
      requestBody[field] = '[REDACTED]';
    }
  });

  // Intercept response finish event
  res.on('finish', async () => {
    try {
      // Only log successful mutations (2xx responses)
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      // Skip if no authenticated user
      if (!userId) {
        return;
      }

      const action = methodToAction[req.method] || AuditAction.UPDATE;
      const tableName = extractTableName(req.originalUrl);
      const recordId = extractRecordId(req.originalUrl);

      await db.auditLog.create({
        data: {
          userId,
          action,
          tableName,
          recordId,
          beforeState: null,
          afterState: JSON.stringify(requestBody),
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });
    } catch (err) {
      // Never crash the app due to audit logging failure
      logger.error('Audit log failed:', err);
    }
  });

  next();
};

export default auditLogMiddleware;
