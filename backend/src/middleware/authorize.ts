import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../lib/ApiError';

// ─── User roles enum ──────────────────────────────────────
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FIELD_AGENT = 'FIELD_AGENT',
  NGO_PARTNER = 'NGO_PARTNER',
  VIEWER = 'VIEWER',
}

// ─── Role hierarchy ───────────────────────────────────────
const roleHierarchy: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 5,
  [UserRole.ADMIN]: 4,
  [UserRole.FIELD_AGENT]: 3,
  [UserRole.NGO_PARTNER]: 2,
  [UserRole.VIEWER]: 1,
};

/**
 * Authorization middleware — checks user role against allowed roles.
 * Must be used AFTER authenticate middleware.
 *
 * Usage:
 *   router.get('/users',
 *     authenticate,
 *     authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
 *     userController.getAll
 *   );
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized(
        'Authentication required. Please log in first.',
      );
    }

    const userRole = req.user.role as UserRole;
    const isAllowed = allowedRoles.includes(userRole);

    if (!isAllowed) {
      throw ApiError.forbidden(
        `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${userRole}.`,
      );
    }

    next();
  };
};

/**
 * Authorize by minimum role level.
 * Any role at or above the minimum level is allowed.
 */
export const authorizeMinRole = (minimumRole: UserRole) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized(
        'Authentication required. Please log in first.',
      );
    }

    const userRole = req.user.role as UserRole;
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[minimumRole] || 0;

    if (userLevel < requiredLevel) {
      throw ApiError.forbidden(
        `Access denied. Minimum required role: ${minimumRole}. Your role: ${userRole}.`,
      );
    }

    next();
  };
};

/**
 * Check if user owns the resource or has admin privileges.
 */
export const authorizeOwnerOrAdmin = (paramName = 'id') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized(
        'Authentication required. Please log in first.',
      );
    }

    const resourceId = req.params[paramName];
    const userRole = req.user.role as UserRole;
    const isAdmin =
      userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN;
    const isOwner = req.user.id === resourceId;

    if (!isAdmin && !isOwner) {
      throw ApiError.forbidden(
        'Access denied. You can only modify your own resources.',
      );
    }

    next();
  };
};

export default authorize;
