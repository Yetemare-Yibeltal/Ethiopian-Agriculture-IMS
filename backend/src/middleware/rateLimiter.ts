import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

import { config } from '../config/env';

// ─── General API rate limiter ────────────────────────────
export const generalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    statusCode: 429,
    message:
      'Too many requests from this IP. Please try again after 15 minutes.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health check
    return req.url === '/health';
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      message:
        'Too many requests from this IP. Please try again after 15 minutes.',
      timestamp: new Date().toISOString(),
    });
  },
});

// ─── Auth endpoints rate limiter (stricter) ──────────────
export const authLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.AUTH_RATE_LIMIT_MAX,
  message: {
    success: false,
    statusCode: 429,
    message:
      'Too many login attempts from this IP. Please try again after 15 minutes.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      message:
        'Too many login attempts from this IP. Please try again after 15 minutes.',
      timestamp: new Date().toISOString(),
    });
  },
});

// ─── Export rate limiter (for large file generation) ─────
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many export requests. Maximum 10 exports per hour.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default generalLimiter;
