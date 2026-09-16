import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/ApiError';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FIELD_AGENT = 'FIELD_AGENT',
  NGO_PARTNER = 'NGO_PARTNER',
  VIEWER = 'VIEWER',
}

const roleHierarchy: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 5,
  [UserRole.ADMIN]: 4,
  [UserRole.FIELD_AGENT]: 3,
  [UserRole.NGO_PARTNER]: 2,
  [UserRole.VIEWER]: 1,
};

export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: { id: string; role: string; orgId: string | null } }).user;
    if (!user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }
    if (!allowedRoles.includes(user.role as UserRole)) {
      next(new ApiError(403, 'Insufficient permissions'));
      return;
    }
    next();
  };
};

export const authorizeMinRole = (minimumRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: { id: string; role: string; orgId: string | null } }).user;
    if (!user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }
    const userLevel = roleHierarchy[user.role as UserRole] || 0;
    const requiredLevel = roleHierarchy[minimumRole];
    if (userLevel < requiredLevel) {
      next(new ApiError(403, 'Insufficient permissions'));
      return;
    }
    next();
  };
};

export const authorizeOwnerOrAdmin = (paramName = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: { id: string; role: string; orgId: string | null } }).user;
    if (!user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }
    const resourceId = req.params[paramName];
    const isAdmin = [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(user.role as UserRole);
    const isOwner = user.id === resourceId;
    if (!isAdmin && !isOwner) {
      next(new ApiError(403, 'Access denied'));
      return;
    }
    next();
  };
};

export default authorize;
