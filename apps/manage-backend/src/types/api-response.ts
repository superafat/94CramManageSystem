/**
 * Unified API Response Format Types
 * 
 * Note: For Hono Context-based responses, use ../utils/response.ts helpers instead.
 * These types are for plain objects and type definitions.
 */

export interface BaseResponse {
  timestamp?: number
  requestId?: string
}

export interface SuccessResponse<T = unknown> extends BaseResponse {
  success: true
  data: T
  message?: string
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    [key: string]: any
  }
}

export interface ErrorResponse extends BaseResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse

/**
 * Factory function to create a successful API response object
 * For Hono routes, prefer using `success()` from utils/response.ts
 */
export function createSuccessResponse<T>(
  data: T, 
  options?: { message?: string; requestId?: string; timestamp?: number }
): SuccessResponse<T> {
  return {
    success: true,
    data,
    message: options?.message,
    timestamp: options?.timestamp ?? Date.now(),
    requestId: options?.requestId,
  }
}

/**
 * Factory function to create an error API response object
 * For Hono routes, prefer using error helpers from utils/response.ts
 */
export function createErrorResponse(
  code: string,
  message: string,
  options?: { details?: unknown; requestId?: string; timestamp?: number }
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details: options?.details,
    },
    timestamp: options?.timestamp ?? Date.now(),
    requestId: options?.requestId,
  }
}
