import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { ApiError } from '../lib/ApiError';
import { logger } from '../lib/logger';
import { config } from '../config/env';

interface PrismaError extends Error {
  code?: string;
  meta?: {
    target?: string[];
    cause?: string;
  };
}

const handlePrismaError = (err: PrismaError): ApiError => {
  switch (err.code) {
    case 'P2002': {
      // Unique constraint violation
      const fields = err.meta?.target?.join(', ') || 'field';
      return new ApiError(409, `A record with this ${fields} already exists.`);
    }
    case 'P2025': {
      // Record not found
      return new ApiError(404, 'Record not found.');
    }
    case 'P2003': {
      // Foreign key constraint violation
      return new ApiError(
        400,
        'Related record not found. Please check your input.',
      );
    }
    case 'P2014': {
      // Relation violation
      return new ApiError(
        400,
        'Invalid relation. The operation would violate a required relation.',
      );
    }
    case 'P2021': {
      // Table not found
      return new ApiError(
        500,
        'Database table not found. Please run migrations.',
      );
    }
    case 'P2024': {
      // Connection timeout
      return new ApiError(
        503,
        'Database connection timeout. Please try again.',
      );
    }
    default:
      return new ApiError(500, 'A database error occurred.');
  }
};

const handleZodError = (err: ZodError): ApiError => {
  const errors = err.errors.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
    code: e.code,
  }));

  return new ApiError(
    422,
    'Validation failed. Please check your input.',
    errors,
  );
};

const handleJWTError = (): ApiError => {
  return new ApiError(401, 'Invalid token. Please log in again.');
};

const handleJWTExpiredError = (): ApiError => {
  return new ApiError(401, 'Your session has expired. Please log in again.');
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let error: ApiError;

  // ─── Identify error type ─────────────────────────────
  if (err instanceof ApiError) {
    error = err;
  } else if (err instanceof ZodError) {
    error = handleZodError(err);
  } else if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  } else if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  } else if (err.name === 'PrismaClientKnownRequestError') {
    error = handlePrismaError(err as PrismaError);
  } else if (err.name === 'PrismaClientValidationError') {
    error = new ApiError(400, 'Invalid data sent to database.');
  } else if (err.name === 'MulterError') {
    if (err.message === 'File too large') {
      error = new ApiError(
        413,
        `File too large. Maximum size is ${config.MAX_FILE_SIZE_MB}MB.`,
      );
    } else {
      error = new ApiError(400, err.message);
    }
  } else {
    // Unknown error
    error = new ApiError(500, 'Something went wrong. Please try again.');
  }

  // ─── Log the error ───────────────────────────────────
  if (error.statusCode >= 500) {
    logger.error({
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userId: (req as Request & { user?: { id: string } }).user?.id,
    });
  } else {
    logger.warn({
      message: err.message,
      url: req.url,
      method: req.method,
      statusCode: error.statusCode,
    });
  }

  // ─── Send response ───────────────────────────────────
  res.status(error.statusCode).json({
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors,
    timestamp: error.timestamp,
    ...(config.IS_DEVELOPMENT && {
      stack: err.stack,
    }),
  });
};

export default errorHandler;
