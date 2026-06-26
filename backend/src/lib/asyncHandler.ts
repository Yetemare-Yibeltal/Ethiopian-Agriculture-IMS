import type { NextFunction, Request, Response } from 'express';

type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void | Response>;

/**
 * Wraps an async Express route handler and automatically
 * catches any unhandled promise rejections, passing them
 * to Express's global error handler via next(err).
 *
 * Usage:
 *   router.get('/farmers', asyncHandler(farmerController.getAll));
 *
 * Without this wrapper you would need try/catch in every controller:
 *   router.get('/farmers', async (req, res, next) => {
 *     try { await farmerController.getAll(req, res, next); }
 *     catch (err) { next(err); }
 *   });
 */
export const asyncHandler = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
