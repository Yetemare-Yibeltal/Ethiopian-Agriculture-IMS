import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../lib/ApiError';

/**
 * 404 Not Found middleware.
 * Mounted last in the Express app — catches all requests
 * that did not match any registered route.
 *
 * Usage in app.ts:
 *   app.use(notFound);  // must be after all routes
 *   app.use(errorHandler);  // must be last
 */
export const notFound = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const message =
    `Route not found: ${req.method} ${req.originalUrl}\n` +
    `Please check the API documentation for available endpoints.`;

  next(new ApiError(404, message));
};

export default notFound;
