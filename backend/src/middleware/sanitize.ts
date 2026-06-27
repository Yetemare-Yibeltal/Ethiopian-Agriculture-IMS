import type { NextFunction, Request, Response } from 'express';
import xss from 'xss';

// ─── Fields that should never be sanitized ────────────────
const skipFields = ['password', 'confirmPassword', 'currentPassword'];

// ─── Recursively sanitize an object ──────────────────────
const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return xss(value.trim(), {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
    });
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    return sanitizeObject(value as Record<string, unknown>);
  }

  return value;
};

const sanitizeObject = (
  obj: Record<string, unknown>,
): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip sensitive fields — do not modify passwords
    if (skipFields.includes(key)) {
      sanitized[key] = value;
      continue;
    }

    // Remove dangerous MongoDB/NoSQL operators
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }

    sanitized[key] = sanitizeValue(value);
  }

  return sanitized;
};

// ─── Sanitize query parameters ────────────────────────────
const sanitizeQuery = (
  query: Record<string, unknown>,
): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(query)) {
    // Remove keys starting with $ (injection attempt)
    if (key.startsWith('$')) {
      continue;
    }

    if (typeof value === 'string') {
      // Remove null bytes
      const cleaned = value.replace(/\0/g, '');
      sanitized[key] = xss(cleaned.trim(), {
        whiteList: {},
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script'],
      });
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Sanitize middleware.
 * Cleans all incoming request data:
 * - req.body: strips XSS, removes NoSQL operators
 * - req.query: strips XSS, removes injection attempts
 * - req.params: strips null bytes
 *
 * Usage in app.ts — mount early in middleware chain:
 *   app.use(sanitizeMiddleware);
 */
export const sanitizeMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body as Record<string, unknown>);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeQuery(
      req.query as Record<string, unknown>,
    ) as typeof req.query;
  }

  // Sanitize URL params — remove null bytes only
  if (req.params && typeof req.params === 'object') {
    for (const key of Object.keys(req.params)) {
      if (typeof req.params[key] === 'string') {
        req.params[key] = req.params[key].replace(/\0/g, '');
      }
    }
  }

  next();
};

export default sanitizeMiddleware;
