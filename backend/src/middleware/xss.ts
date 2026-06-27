import type { NextFunction, Request, Response } from 'express';
import xss from 'xss';

// ─── Suspicious patterns to block ────────────────────────
const suspiciousPatterns = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
  /<\s*iframe/gi,
  /<\s*object/gi,
  /<\s*embed/gi,
  /<\s*form/gi,
  /expression\s*\(/gi,
];

// ─── Check if a string contains suspicious patterns ───────
const containsSuspiciousPattern = (value: string): boolean => {
  return suspiciousPatterns.some((pattern) => pattern.test(value));
};

// ─── Clean a string value ─────────────────────────────────
const cleanString = (value: string): string => {
  return xss(value, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object'],
    css: false,
  });
};

// ─── Kept for future use in response sanitization ────────
const _sanitizeResponseBody = (body: unknown): unknown => {
  if (typeof body === 'string') {
    return cleanString(body);
  }

  if (Array.isArray(body)) {
    return body.map(_sanitizeResponseBody);
  }

  if (body !== null && typeof body === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      body as Record<string, unknown>,
    )) {
      sanitized[key] = _sanitizeResponseBody(value);
    }
    return sanitized;
  }

  return body;
};

// ─── Recursively check request for XSS ───────────────────
const checkForXSS = (
  data: unknown,
  path = 'body',
): { safe: boolean; field: string } => {
  if (typeof data === 'string') {
    if (containsSuspiciousPattern(data)) {
      return { safe: false, field: path };
    }
    return { safe: true, field: path };
  }

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const result = checkForXSS(data[i], `${path}[${i}]`);
      if (!result.safe) {
        return result;
      }
    }
    return { safe: true, field: path };
  }

  if (data !== null && typeof data === 'object') {
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>,
    )) {
      const result = checkForXSS(value, `${path}.${key}`);
      if (!result.safe) {
        return result;
      }
    }
    return { safe: true, field: path };
  }

  return { safe: true, field: path };
};

/**
 * XSS Protection middleware.
 *
 * 1. Checks request headers for injection attempts
 * 2. Validates request body for XSS patterns
 * 3. Sets XSS protection response headers
 *
 * Usage in app.ts:
 *   app.use(xssMiddleware);
 */
export const xssMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // ─── Check request headers ──────────────────────────────
  const suspiciousHeaders = ['user-agent', 'referer', 'x-forwarded-for'];
  for (const header of suspiciousHeaders) {
    const headerValue = req.headers[header];
    if (typeof headerValue === 'string') {
      if (headerValue.length > 2000) {
        res.status(400).json({
          success: false,
          statusCode: 400,
          message: `Request header '${header}' is too long.`,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }
  }

  // ─── Check request body for XSS patterns ────────────────
  if (req.body && typeof req.body === 'object') {
    const check = checkForXSS(req.body);
    if (!check.safe) {
      res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Potentially malicious content detected in field: ${check.field}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  // ─── Check query parameters ──────────────────────────────
  if (req.query && typeof req.query === 'object') {
    const check = checkForXSS(req.query, 'query');
    if (!check.safe) {
      res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Potentially malicious content detected in query parameter: ${check.field}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  // ─── Set XSS protection headers ─────────────────────────
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  next();
};

export default xssMiddleware;
