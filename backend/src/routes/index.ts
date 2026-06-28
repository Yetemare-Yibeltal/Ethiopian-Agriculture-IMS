import { Router, type Request, type Response } from 'express';

import { config } from '../config/env';
import { authLimiter } from '../middleware/rateLimiter';

import { authRouter } from './auth.routes';
import { userRouter } from './user.routes';
import { orgRouter } from './org.routes';
import { regionRouter } from './region.routes';
import { farmerRouter } from './farmer.routes';
import { yieldRouter } from './yield.routes';
import { distributionRouter } from './distribution.routes';
import { mapRouter } from './map.routes';
import { dashboardRouter } from './dashboard.routes';
import { analyticsRouter } from './analytics.routes';
import { exportRouter } from './export.routes';
import { notificationRouter } from './notification.routes';
import { auditRouter } from './audit.routes';
import { healthRouter } from './health.routes';

// ─── Create master API router ─────────────────────────────
export const apiRouter = Router();

// ─── API info endpoint ────────────────────────────────────
apiRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'AgroEthiopia MIS API v1',
    description: 'Ethiopian Agriculture Management Information System',
    version: '1.0.0',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: `${config.API_PREFIX}/auth`,
      users: `${config.API_PREFIX}/users`,
      organizations: `${config.API_PREFIX}/organizations`,
      regions: `${config.API_PREFIX}/regions`,
      farmers: `${config.API_PREFIX}/farmers`,
      yields: `${config.API_PREFIX}/yields`,
      distributions: `${config.API_PREFIX}/distributions`,
      map: `${config.API_PREFIX}/map`,
      dashboard: `${config.API_PREFIX}/dashboard`,
      analytics: `${config.API_PREFIX}/analytics`,
      exports: `${config.API_PREFIX}/exports`,
      notifications: `${config.API_PREFIX}/notifications`,
      audit: `${config.API_PREFIX}/audit`,
      health: `${config.API_PREFIX}/health`,
    },
  });
});

// ─── Health routes — no authentication required ───────────
apiRouter.use('/health', healthRouter);

// ─── Auth routes — with strict rate limiting ──────────────
apiRouter.use('/auth', authLimiter, authRouter);

// ─── User management routes ───────────────────────────────
apiRouter.use('/users', userRouter);

// ─── Organization (NGO) management routes ─────────────────
apiRouter.use('/organizations', orgRouter);

// ─── Region, Zone, Woreda, Kebele routes ──────────────────
// Public — no auth needed for dropdown data
apiRouter.use('/regions', regionRouter);

// ─── Farmer registry routes ───────────────────────────────
apiRouter.use('/farmers', farmerRouter);

// ─── Yield reporting routes ───────────────────────────────
apiRouter.use('/yields', yieldRouter);

// ─── Input distribution routes ────────────────────────────
apiRouter.use('/distributions', distributionRouter);

// ─── GIS Map and zone routes ──────────────────────────────
apiRouter.use('/map', mapRouter);

// ─── Dashboard statistics routes ──────────────────────────
apiRouter.use('/dashboard', dashboardRouter);

// ─── Analytics and reporting routes ──────────────────────
apiRouter.use('/analytics', analyticsRouter);

// ─── Export jobs routes (PDF, Excel) ──────────────────────
apiRouter.use('/exports', exportRouter);

// ─── Notification routes ──────────────────────────────────
apiRouter.use('/notifications', notificationRouter);

// ─── Audit log routes — super admin only ──────────────────
apiRouter.use('/audit', auditRouter);

export default apiRouter;
