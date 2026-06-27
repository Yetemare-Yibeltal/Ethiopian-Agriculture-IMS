import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config/env';
import { ApiError } from '../lib/ApiError';
import { db } from '../lib/db';
import { asyncHandler } from '../lib/asyncHandler';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  orgId: string | null;
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string | null;
  language: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Authenticate middleware — verifies JWT from httpOnly cookie.
 * Attaches the full user object to req.user.
 *
 * Usage:
 *   router.get('/farmers', authenticate, farmerController.getAll);
 */
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    // ─── Get token from cookie ──────────────────────────
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw ApiError.unauthorized(
        'No authentication token found. Please log in.',
      );
    }

    // ─── Verify token ───────────────────────────────────
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized(
          'Your session has expired. Please log in again.',
        );
      }
      throw ApiError.unauthorized('Invalid token. Please log in again.');
    }

    // ─── Check user still exists and is active ──────────
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        orgId: true,
        language: true,
        isActive: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized(
        'User account not found. Please contact your administrator.',
      );
    }

    if (!user.isActive) {
      throw ApiError.unauthorized(
        'Your account has been deactivated. Please contact your administrator.',
      );
    }

    // ─── Attach user to request ─────────────────────────
    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
      language: user.language,
    };

    next();
  },
);
export default authenticate;
