import type { Response } from 'express';

interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ApiResponseBody<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

/**
 * Standard API Response formatter for AgroEthiopia MIS.
 *
 * Usage:
 *   ApiResponse.success(res, 200, 'Farmers fetched', farmers);
 *   ApiResponse.success(res, 201, 'Farmer created', farmer);
 *   ApiResponse.paginated(res, farmers, { total, page, perPage });
 *   ApiResponse.noContent(res);
 */
export class ApiResponse {
  // ─── Standard success response ───────────────────────
  static success<T>(
    res: Response,
    statusCode: number,
    message: string,
    data: T,
  ): Response {
    const body: ApiResponseBody<T> = {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(body);
  }

  // ─── Paginated response ──────────────────────────────
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: {
      total: number;
      page: number;
      perPage: number;
    },
    message = 'Data fetched successfully',
  ): Response {
    const pageCount = Math.ceil(pagination.total / pagination.perPage);

    const meta: PaginationMeta = {
      total: pagination.total,
      page: pagination.page,
      perPage: pagination.perPage,
      pageCount,
      hasNextPage: pagination.page < pageCount,
      hasPrevPage: pagination.page > 1,
    };

    // Set pagination headers
    res.setHeader('X-Total-Count', pagination.total);
    res.setHeader('X-Page-Count', pageCount);
    res.setHeader('X-Current-Page', pagination.page);
    res.setHeader('X-Per-Page', pagination.perPage);

    const body: ApiResponseBody<T[]> = {
      success: true,
      statusCode: 200,
      message,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(body);
  }

  // ─── 201 Created ────────────────────────────────────
  static created<T>(res: Response, message: string, data: T): Response {
    return ApiResponse.success(res, 201, message, data);
  }

  // ─── 204 No Content ─────────────────────────────────
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  // ─── 200 OK shorthand ───────────────────────────────
  static ok<T>(res: Response, message: string, data: T): Response {
    return ApiResponse.success(res, 200, message, data);
  }

  // ─── Accepted (202) for async jobs ──────────────────
  static accepted<T>(res: Response, message: string, data: T): Response {
    return ApiResponse.success(res, 202, message, data);
  }
}

export default ApiResponse;
