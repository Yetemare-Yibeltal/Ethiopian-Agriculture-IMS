import type { NextFunction, Request, Response } from 'express';

import { redis } from '../config/redis';
import { logger } from '../lib/logger';

// ─── Redis key prefix for blocked IPs ────────────────────
const BLOCKED_IP_PREFIX = 'blocked_ip:';
const BLOCKED_IP_TTL = 60 * 60 * 24 * 30; // 30 days in seconds

// ─── Blocked IP data shape ────────────────────────────────
interface BlockedIPData {
  ip: string;
  reason: string;
  blockedAt: string;
  expiresAt: string;
}

// ─── Get client IP address ────────────────────────────────
const getClientIP = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return (
    req.socket.remoteAddress ||
    req.connection.remoteAddress ||
    req.ip ||
    'unknown'
  );
};

/**
 * IP Block middleware.
 * Checks incoming request IP against Redis blocklist.
 * Blocked IPs receive a 403 Forbidden response immediately.
 *
 * Usage in app.ts — mount very early in middleware chain:
 *   app.use(ipBlockMiddleware);
 */
export const ipBlockMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const clientIP = getClientIP(req);

    // Check if IP is in the blocklist
    const isBlocked = await redis.get(`${BLOCKED_IP_PREFIX}${clientIP}`);

    if (isBlocked) {
      logger.warn(
        `Blocked IP attempted access: ${clientIP} → ${req.originalUrl}`,
      );

      res.status(403).json({
        success: false,
        statusCode: 403,
        message:
          'Access denied. Your IP address has been blocked. ' +
          'Please contact the system administrator.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  } catch (err) {
    // If Redis is down do not block all traffic — fail open
    logger.error('IP block middleware Redis error:', err);
    next();
  }
};

// ─── Helper: block an IP address ─────────────────────────
export const blockIP = async (
  ip: string,
  reason: string,
  ttlSeconds = BLOCKED_IP_TTL,
): Promise<void> => {
  await redis.setex(
    `${BLOCKED_IP_PREFIX}${ip}`,
    ttlSeconds,
    JSON.stringify({
      reason,
      blockedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    }),
  );
  logger.warn(`IP blocked: ${ip} — Reason: ${reason}`);
};

// ─── Helper: unblock an IP address ───────────────────────
export const unblockIP = async (ip: string): Promise<void> => {
  await redis.del(`${BLOCKED_IP_PREFIX}${ip}`);
  logger.info(`IP unblocked: ${ip}`);
};

// ─── Helper: check if an IP is blocked ───────────────────
export const isIPBlocked = async (ip: string): Promise<boolean> => {
  const result = await redis.get(`${BLOCKED_IP_PREFIX}${ip}`);
  return result !== null;
};

// ─── Helper: get all blocked IPs ─────────────────────────
export const getAllBlockedIPs = async (): Promise<BlockedIPData[]> => {
  const keys = await redis.keys(`${BLOCKED_IP_PREFIX}*`);

  if (keys.length === 0) {
    return [];
  }

  const values = await redis.mget(...keys);
  const results: BlockedIPData[] = [];

  keys.forEach((key, index) => {
    const ip = key.replace(BLOCKED_IP_PREFIX, '');
    const data = values[index];

    if (!data) {
      return;
    }

    try {
      const parsed = JSON.parse(data) as {
        reason: string;
        blockedAt: string;
        expiresAt: string;
      };
      results.push({
        ip,
        reason: parsed.reason,
        blockedAt: parsed.blockedAt,
        expiresAt: parsed.expiresAt,
      });
    } catch {
      results.push({
        ip,
        reason: 'unknown',
        blockedAt: '',
        expiresAt: '',
      });
    }
  });

  return results;
};

export default ipBlockMiddleware;
