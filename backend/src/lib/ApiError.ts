/**
 * Custom API Error class for the AgroEthiopia MIS backend.
 *
 * Usage:
 *   throw new ApiError(404, 'Farmer not found');
 *   throw new ApiError(400, 'Invalid input', errors);
 *   throw new ApiError(401, 'Unauthorized');
 *   throw new ApiError(403, 'Forbidden — insufficient role');
 *   throw new ApiError(409, 'Farmer already exists');
 *   throw new ApiError(500, 'Internal server error');
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors: unknown[];
  public readonly timestamp: string;

  constructor(
    statusCode: number,
    message: string,
    errors: unknown[] = [],
    isOperational = true,
  ) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    this.timestamp = new Date().toISOString();

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ApiError.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }

    this.name = 'ApiError';
  }

  // ─── Static factory methods ──────────────────────────

  static badRequest(message: string, errors: unknown[] = []): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized — please log in'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden — insufficient permissions'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(resource = 'Resource'): ApiError {
    return new ApiError(404, `${resource} not found`);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message);
  }

  static unprocessable(message: string, errors: unknown[] = []): ApiError {
    return new ApiError(422, message, errors);
  }

  static tooManyRequests(
    message = 'Too many requests — please try again later',
  ): ApiError {
    return new ApiError(429, message);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, [], false);
  }

  static serviceUnavailable(
    message = 'Service temporarily unavailable',
  ): ApiError {
    return new ApiError(503, message, [], false);
  }

  // ─── Instance methods ────────────────────────────────

  toJSON() {
    return {
      success: false,
      statusCode: this.statusCode,
      message: this.message,
      errors: this.errors,
      timestamp: this.timestamp,
    };
  }

  toString(): string {
    return `ApiError [${this.statusCode}]: ${this.message}`;
  }
}

export default ApiError;
