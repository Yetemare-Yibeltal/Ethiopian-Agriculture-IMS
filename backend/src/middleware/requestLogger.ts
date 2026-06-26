import type { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';

import { config } from '../config/env';
import { logger, morganStream } from '../lib/logger';

// ─── Morgan HTTP request logger ──────────────────────────
const morganFormat = config.IS_DEVELOPMENT
  ? 'dev'
  : ':remote-addr :method :url :status :res[content-length] - :response-time ms';

export const morganLogger = morgan(morganFormat, {
  stream: morganStream,
  skip: (req: Request) => {
    // Skip health check logs to reduce noise
    return req.url === '/health' || req.url === `${config.API_PREFIX}/health`;
  },
});

// ─── Custom request logger middleware ────────────────────
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const startTime = Date.now();

  // Generate unique request ID
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      contentLength: res.get('content-length'),
    };

    if (res.statusCode >= 500) {
      logger.error('HTTP Request', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

export default requestLogger;
