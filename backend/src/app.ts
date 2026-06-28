import path from 'path';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, {
  type Application,
  type NextFunction,
  type Request,
  type Response,
} from 'express';

import { config } from './config/env';
import { corsOptions } from './config/corsOptions';
import { redis } from './config/redis';
import { checkDBHealth } from './lib/db';
import { logger } from './lib/logger';
import { auditLogMiddleware } from './middleware/auditLog';
import {
  compressionMiddleware,
  responseTimeMiddleware,
} from './middleware/compression';
import { errorHandler } from './middleware/errorHandler';
import {
  additionalSecurityHeaders,
  helmetMiddleware,
} from './middleware/helmet';
import { ipBlockMiddleware } from './middleware/ipBlock';
import { notFound } from './middleware/notFound';
import { generalLimiter } from './middleware/rateLimiter';
import { morganLogger, requestLogger } from './middleware/requestLogger';
import { sanitizeMiddleware } from './middleware/sanitize';
import { xssMiddleware } from './middleware/xss';
import { apiRouter } from './routes/index';

// ─── Format uptime helper ─────────────────────────────────
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

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

// ─── Create Express application ───────────────────────────
export const createApp = (): Application => {
  const app = express();

  // ─── Trust proxy ──────────────────────────────────────
  // Required for accurate IP detection behind Nginx reverse proxy
  app.set('trust proxy', 1);

  // ─── Disable fingerprinting ───────────────────────────
  app.disable('x-powered-by');
  app.disable('etag');

  // ─── Security middleware ──────────────────────────────
  // MUST be first — sets security headers on every response
  app.use(helmetMiddleware);
  app.use(additionalSecurityHeaders);

  // ─── CORS ─────────────────────────────────────────────
  // Must come before other middleware to handle preflight
  app.use(cors(corsOptions));

  // ─── IP blocking ──────────────────────────────────────
  // Block banned IPs before any processing
  app.use(ipBlockMiddleware);

  // ─── Compression ──────────────────────────────────────
  app.use(compressionMiddleware);
  app.use(responseTimeMiddleware);

  // ─── Request logging ──────────────────────────────────
  app.use(morganLogger);
  app.use(requestLogger);

  // ─── Rate limiting ────────────────────────────────────
  app.use(generalLimiter);

  // ─── Body parsers ─────────────────────────────────────
  // Parse JSON bodies — 10mb limit for bulk imports
  app.use(
    express.json({
      limit: '10mb',
      strict: true,
      type: ['application/json', 'application/csp-report'],
    }),
  );

  // Parse URL-encoded bodies — for form submissions
  app.use(
    express.urlencoded({
      extended: true,
      limit: '10mb',
    }),
  );

  // Parse signed cookies — used for JWT httpOnly cookies
  app.use(cookieParser(config.COOKIE_SECRET));

  // ─── Input sanitization ───────────────────────────────
  // MUST come after body parsers
  app.use(sanitizeMiddleware);
  app.use(xssMiddleware);

  // ─── Static file serving ──────────────────────────────
  // Serve uploaded farmer photos publicly
  app.use(
    '/uploads',
    (req: Request, _res: Response, next: NextFunction) => {
      logger.info(`Static file request: ${req.path}`);
      next();
    },
    express.static(path.join(process.cwd(), config.UPLOAD_DIR), {
      maxAge: '7d',
      etag: true,
      lastModified: true,
      dotfiles: 'deny',
      index: false,
      redirect: false,
      setHeaders: (res: Response) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=604800');
      },
    }),
  );

  // Serve generated export files (PDF and Excel)
  app.use(
    '/exports',
    express.static(path.join(process.cwd(), config.EXPORT_DIR), {
      maxAge: '1h',
      etag: true,
      lastModified: true,
      dotfiles: 'deny',
      index: false,
      redirect: false,
    }),
  );

  // ─── Root endpoint ────────────────────────────────────
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'AgroEthiopia MIS API',
      description: 'Ethiopian Agriculture Management Information System',
      version: '1.0.0',
      documentation: `${config.BACKEND_URL}${config.API_PREFIX}`,
      health: `${config.BACKEND_URL}/health`,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Ping endpoint ────────────────────────────────────
  app.get('/ping', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'pong',
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Full health check endpoint ───────────────────────
  // Checks database and Redis connectivity
  app.get('/health', async (_req: Request, res: Response) => {
    const dbHealth = await checkDBHealth();

    let redisHealthy = false;
    let redisLatencyMs: number | undefined;

    try {
      const redisStart = Date.now();
      const redisPing = await redis.ping();
      redisLatencyMs = Date.now() - redisStart;
      redisHealthy = redisPing === 'PONG';
    } catch {
      redisHealthy = false;
    }

    const allHealthy = dbHealth.healthy && redisHealthy;
    const memoryUsage = process.memoryUsage();

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      status: allHealthy ? 'healthy' : 'degraded',
      service: 'agro-ethiopia-mis-backend',
      version: process.env.npm_package_version || '1.0.0',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          healthy: dbHealth.healthy,
          latencyMs: dbHealth.latencyMs,
          error: dbHealth.error || null,
        },
        redis: {
          healthy: redisHealthy,
          latencyMs: redisLatencyMs || null,
        },
        memory: {
          heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
          externalMB: Math.round(memoryUsage.external / 1024 / 1024),
        },
        uptime: {
          seconds: Math.round(process.uptime()),
          human: formatUptime(process.uptime()),
        },
      },
    });
  });

  // ─── Audit log middleware ─────────────────────────────
  // Must come before API routes
  app.use(auditLogMiddleware);

  // ─── API routes ───────────────────────────────────────
  // All API endpoints mounted under /api/v1
  app.use(config.API_PREFIX, apiRouter);

  // ─── 404 handler ─────────────────────────────────────
  // Must come after ALL routes
  app.use(notFound);

  // ─── Global error handler ─────────────────────────────
  // Must be the LAST middleware
  // Express requires exactly 4 arguments for error handlers
  app.use(errorHandler);

  return app;
};

export default createApp;
