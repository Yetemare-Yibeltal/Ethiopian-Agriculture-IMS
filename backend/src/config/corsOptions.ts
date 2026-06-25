import type { CorsOptions } from 'cors';

import { config } from './env';

const allowedOrigins: string[] = config.CORS_ORIGIN.split(',').map((origin) =>
  origin.trim(),
);

export const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(
        new Error(`CORS policy blocked request from origin: ${origin}`),
        false,
      );
    }
  },

  // Allow cookies to be sent cross-origin (required for JWT httpOnly cookies)
  credentials: true,

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Allowed request headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-Request-ID',
  ],

  // Headers exposed to the browser
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Per-Page',
    'Content-Disposition',
  ],

  // Cache preflight response for 24 hours
  maxAge: 86400,

  // Allow preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
