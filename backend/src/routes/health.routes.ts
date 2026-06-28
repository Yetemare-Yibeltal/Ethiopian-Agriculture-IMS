import { Router, type Request, type Response } from 'express';

import { redis } from '../config/redis';
import { checkDBHealth } from '../lib/db';
import { logger } from '../lib/logger';

export const healthRouter = Router();

// ─── GET /api/v1/health ───────────────────────────────────
// Simple health check — just confirms API is reachable
healthRouter.get('/', async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'agro-ethiopia-mis-backend',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── GET /api/v1/health/ping ──────────────────────────────
// Minimal ping — used by load balancers and uptime monitors
healthRouter.get('/ping', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString(),
  });
});

// ─── GET /api/v1/health/status ────────────────────────────
// Full status check — checks all services
healthRouter.get('/status', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  // ── Check PostgreSQL ────────────────────────────────────
  const dbHealth = await checkDBHealth();

  // ── Check Redis ─────────────────────────────────────────
  let redisHealthy = false;
  let redisLatencyMs: number | undefined;
  let redisError: string | undefined;

  try {
    const redisStart = Date.now();
    const pong = await redis.ping();
    redisLatencyMs = Date.now() - redisStart;
    redisHealthy = pong === 'PONG';
  } catch (err) {
    redisHealthy = false;
    redisError = err instanceof Error ? err.message : 'Redis connection failed';
    logger.warn('Health check: Redis unavailable', err);
  }

  // ── Memory usage ────────────────────────────────────────
  const memoryUsage = process.memoryUsage();
  const formatMB = (bytes: number): number => Math.round(bytes / 1024 / 1024);

  // ── Uptime ──────────────────────────────────────────────
  const uptimeSeconds = Math.round(process.uptime());
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const parts: string[] = [];
    if (days > 0) {
      parts.push(`${days}d`);
    }
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }
    parts.push(`${secs}s`);
    return parts.join(' ');
  };

  // ── Overall status ──────────────────────────────────────
  const allHealthy = dbHealth.healthy && redisHealthy;
  const totalResponseMs = Date.now() - startTime;

  const statusCode = allHealthy ? 200 : 503;
  const status = allHealthy ? 'healthy' : 'degraded';

  res.status(statusCode).json({
    success: allHealthy,
    status,
    service: 'agro-ethiopia-mis-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    responseTimeMs: totalResponseMs,
    checks: {
      database: {
        status: dbHealth.healthy ? 'healthy' : 'unhealthy',
        healthy: dbHealth.healthy,
        latencyMs: dbHealth.latencyMs ?? null,
        error: dbHealth.error ?? null,
      },
      redis: {
        status: redisHealthy ? 'healthy' : 'unhealthy',
        healthy: redisHealthy,
        latencyMs: redisLatencyMs ?? null,
        error: redisError ?? null,
      },
      memory: {
        heapUsedMB: formatMB(memoryUsage.heapUsed),
        heapTotalMB: formatMB(memoryUsage.heapTotal),
        heapUsagePercent: Math.round(
          (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        ),
        rssMB: formatMB(memoryUsage.rss),
        externalMB: formatMB(memoryUsage.external),
      },
      uptime: {
        seconds: uptimeSeconds,
        human: formatUptime(uptimeSeconds),
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    },
  });
});

export default healthRouter;
