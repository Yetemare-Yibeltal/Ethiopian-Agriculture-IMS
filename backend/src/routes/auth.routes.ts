import { Router } from 'express';

import { authenticate } from '../middleware/authenticate';
import { authLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../lib/asyncHandler';
import { db } from '../lib/db';
import { ApiResponse } from '../lib/ApiResponse';
import { ApiError } from '../lib/ApiError';
import { config } from '../config/env';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export const authRouter = Router();

// ─── Validation schemas ───────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters')
    .trim(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    ),
  role: z
    .enum(['SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER', 'VIEWER'])
    .default('VIEWER'),
  orgId: z.string().optional(),
  language: z.enum(['en', 'am']).default('en'),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ─── Cookie options ───────────────────────────────────────
const accessTokenCookieOptions = {
  httpOnly: true,
  secure: config.COOKIE_SECURE,
  sameSite: 'strict' as const,
  maxAge: 15 * 60 * 1000, // 15 minutes
  domain: config.COOKIE_DOMAIN,
};

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: config.COOKIE_SECURE,
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  domain: config.COOKIE_DOMAIN,
  path: '/api/v1/auth/refresh',
};

// ─── POST /api/v1/auth/login ──────────────────────────────
authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    // Validate input
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation failed', parsed.error.errors);
    }

    const { email, password } = parsed.data;

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        orgId: true,
        language: true,
        isActive: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized(
        'Your account has been deactivated. Please contact your administrator.',
      );
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.password, password);

    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      },
      config.JWT_ACCESS_SECRET,
      { expiresIn: config.JWT_ACCESS_EXPIRES_IN },
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      config.JWT_REFRESH_SECRET,
      { expiresIn: config.JWT_REFRESH_EXPIRES_IN },
    );

    // Store refresh token in database
    await db.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Set tokens in httpOnly cookies
    res.cookie('accessToken', accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    // Return user data (never return password)
    return ApiResponse.ok(res, 'Login successful', {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
        language: user.language,
        organization: user.organization,
      },
      accessToken,
    });
  }),
);

// ─── POST /api/v1/auth/register ───────────────────────────
// Only Super Admin can register new users
authRouter.post(
  '/register',
  authenticate,
  asyncHandler(async (req, res) => {
    // Validate input
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation failed', parsed.error.errors);
    }

    const { name, email, password, role, orgId, language } = parsed.data;

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw ApiError.conflict('A user with this email address already exists.');
    }

    // Hash password with argon2
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Create user
    const newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        orgId: orgId || null,
        language,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        orgId: true,
        language: true,
        isActive: true,
        createdAt: true,
      },
    });

    return ApiResponse.created(res, 'User registered successfully', newUser);
  }),
);

// ─── POST /api/v1/auth/logout ─────────────────────────────
authRouter.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    // Delete refresh token from database if it exists
    if (refreshToken) {
      await db.refreshToken
        .deleteMany({
          where: { token: refreshToken },
        })
        .catch(() => {
          // Ignore error — token may already be expired
        });
    }

    // Clear cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'strict',
      domain: config.COOKIE_DOMAIN,
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'strict',
      domain: config.COOKIE_DOMAIN,
      path: '/api/v1/auth/refresh',
    });

    return ApiResponse.ok(res, 'Logged out successfully', null);
  }),
);

// ─── POST /api/v1/auth/refresh ────────────────────────────
authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw ApiError.unauthorized(
        'No refresh token found. Please log in again.',
      );
    }

    // Verify refresh token
    let decoded: { userId: string };
    try {
      decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as {
        userId: string;
      };
    } catch {
      throw ApiError.unauthorized(
        'Invalid or expired refresh token. Please log in again.',
      );
    }

    // Check token exists in database
    const storedToken = await db.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.userId,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      throw ApiError.unauthorized(
        'Refresh token has been revoked. Please log in again.',
      );
    }

    // Get user
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

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User account not found or deactivated.');
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      },
      config.JWT_ACCESS_SECRET,
      { expiresIn: config.JWT_ACCESS_EXPIRES_IN },
    );

    // Rotate refresh token
    const newRefreshToken = jwt.sign(
      { userId: user.id },
      config.JWT_REFRESH_SECRET,
      { expiresIn: config.JWT_REFRESH_EXPIRES_IN },
    );

    // Delete old refresh token and create new one
    await db.refreshToken.delete({
      where: { id: storedToken.id },
    });

    await db.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set new cookies
    res.cookie('accessToken', newAccessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', newRefreshToken, refreshTokenCookieOptions);

    return ApiResponse.ok(res, 'Token refreshed successfully', {
      accessToken: newAccessToken,
    });
  }),
);

// ─── GET /api/v1/auth/me ──────────────────────────────────
authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await db.user.findUnique({
      where: { id: req.user?.id ?? '' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        orgId: true,
        language: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User');
    }

    return ApiResponse.ok(res, 'User profile fetched', user);
  }),
);

// ─── PUT /api/v1/auth/change-password ────────────────────
authRouter.put(
  '/change-password',
  authenticate,
  asyncHandler(async (req, res) => {
    // Validate input
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation failed', parsed.error.errors);
    }

    const { currentPassword, newPassword } = parsed.data;

    // Get user with password
    const user = await db.user.findUnique({
      where: { id: req.user?.id ?? '' },
      select: { id: true, password: true },
    });

    if (!user) {
      throw ApiError.notFound('User');
    }

    // Verify current password
    const isCurrentPasswordValid = await argon2.verify(
      user.password,
      currentPassword,
    );

    if (!isCurrentPasswordValid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    // Check new password is different from current
    const isSamePassword = await argon2.verify(user.password, newPassword);

    if (isSamePassword) {
      throw ApiError.badRequest(
        'New password must be different from your current password',
      );
    }

    // Hash new password
    const hashedNewPassword = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Update password in database
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    });

    // Revoke all refresh tokens — force re-login on all devices
    await db.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    // Clear cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'strict',
      domain: config.COOKIE_DOMAIN,
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'strict',
      domain: config.COOKIE_DOMAIN,
      path: '/api/v1/auth/refresh',
    });

    return ApiResponse.ok(
      res,
      'Password changed successfully. Please log in again.',
      null,
    );
  }),
);

export default authRouter;
