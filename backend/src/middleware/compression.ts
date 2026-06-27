import type { NextFunction, Request, Response } from 'express';
import compressionLib from 'compression';

// ─── Compression filter ───────────────────────────────────
const shouldCompress = (req: Request, res: Response): boolean => {
  // Do not compress server-sent events
  if (req.headers['accept'] === 'text/event-stream') {
    return false;
  }

  // Do not compress already-compressed formats
  const contentType = res.getHeader('Content-Type') as string;
  if (contentType) {
    const skipTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/zip',
      'application/gzip',
      'application/pdf',
    ];
    if (skipTypes.some((type) => contentType.includes(type))) {
      return false;
    }
  }

  // Use default compression filter for everything else
  return compressionLib.filter(req, res);
};

// ─── Compression middleware ───────────────────────────────
export const compressionMiddleware = compressionLib({
  // Compression level 6 — good balance of speed and size
  // Level 1 = fastest, Level 9 = best compression
  level: 6,

  // Only compress responses larger than 1kb
  // Smaller responses have compression overhead that makes them slower
  threshold: 1024,

  // Custom filter function
  filter: shouldCompress,

  // Use gzip encoding
  strategy: 0,

  // Memory level — higher uses more memory but compresses faster
  memLevel: 8,

  // Window size for gzip
  windowBits: 15,
});

// ─── Response time header middleware ─────────────────────
export const responseTimeMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
  });

  next();
};

export default compressionMiddleware;
