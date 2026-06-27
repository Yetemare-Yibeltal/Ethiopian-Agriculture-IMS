import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';

import { config } from '../config/env';

// ─── Content Security Policy directives ──────────────────
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
  styleSrc: [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
    'https://cdn.jsdelivr.net',
  ],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
  connectSrc: ["'self'", config.FRONTEND_URL, config.BACKEND_URL],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  workerSrc: ["'self'", 'blob:'],
  childSrc: ["'none'"],
  formAction: ["'self'"],
  upgradeInsecureRequests: config.IS_PRODUCTION ? [] : null,
};

// ─── Main helmet middleware ───────────────────────────────
export const helmetMiddleware = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: cspDirectives,
    reportOnly: false,
  },

  // HTTP Strict Transport Security
  // Forces browsers to use HTTPS for 1 year
  hsts: config.IS_PRODUCTION
    ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      }
    : false,

  // Prevent clickjacking — do not allow framing
  frameguard: {
    action: 'deny',
  },

  // Prevent MIME type sniffing
  noSniff: true,

  // Disable X-Powered-By header (hides Express)
  hidePoweredBy: true,

  // XSS filter for older browsers
  xssFilter: true,

  // Referrer policy — only send origin on same-origin requests
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // Disable DNS prefetching
  dnsPrefetchControl: {
    allow: false,
  },

  // Prevent IE from opening downloads in site context
  ieNoOpen: true,

  // Permissions policy — restrict browser features
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },

  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: {
    policy: 'same-origin',
  },

  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: {
    policy: 'same-origin',
  },

  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: config.IS_PRODUCTION,
});

// ─── Additional custom security headers ──────────────────
export const additionalSecurityHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Prevent caching of sensitive API responses
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  // Permissions Policy — restrict browser APIs
  res.setHeader(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', '),
  );

  // Cross-Origin headers for API
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  next();
};

export default helmetMiddleware;
