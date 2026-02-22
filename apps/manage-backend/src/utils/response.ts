/**
 * 統一的 API Response Utilities
 * 提供一致的回應格式
 */
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

// ===== Response Types =====

interface SuccessResponse<T = any> {
  success: true
  data: T
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

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}

// ===== Error Codes =====

export const ErrorCode = {
  // 400 Bad Request
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // 401 Unauthorized
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // 403 Forbidden
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  
  // 404 Not Found
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  
  // 409 Conflict
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // 500 Internal Server Error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode]

// ===== Response Helpers =====

/**
 * 成功回應
 */
export function success<T>(c: Context, data: T, status: ContentfulStatusCode = 200): Response {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  }
  return c.json(response, status)
}

/**
 * 成功回應（含分頁）
 */
export function successWithPagination<T>(
  c: Context,
  data: T,
  pagination: { page: number; limit: number; total: number },
  status: ContentfulStatusCode = 200
): Response {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    meta: {
      pagination: {
        ...pagination,
        totalPages: Math.ceil(pagination.total / pagination.limit),
      },
    },
  }
  return c.json(response, status)
}

/**
 * 錯誤回應
 */
export function error(
  c: Context,
  code: ErrorCodeType,
  message: string,
  status: ContentfulStatusCode = 400,
  details?: any
): Response {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && process.env.NODE_ENV !== 'production' ? { details } : {}),
    },
  }
  return c.json(response, status)
}

/**
 * 400 Bad Request
 */
export function badRequest(c: Context, message: string, details?: any): Response {
  return error(c, ErrorCode.VALIDATION_ERROR, message, 400, details)
}

/**
 * 401 Unauthorized
 */
export function unauthorized(c: Context, message: string = 'Unauthorized'): Response {
  return error(c, ErrorCode.UNAUTHORIZED, message, 401)
}

/**
 * 403 Forbidden
 */
export function forbidden(c: Context, message: string = 'Forbidden'): Response {
  return error(c, ErrorCode.FORBIDDEN, message, 403)
}

/**
 * 404 Not Found
 */
export function notFound(c: Context, resource: string = 'Resource'): Response {
  return error(c, ErrorCode.NOT_FOUND, `${resource} not found`, 404)
}

/**
 * 409 Conflict
 */
export function conflict(c: Context, message: string): Response {
  return error(c, ErrorCode.CONFLICT, message, 409)
}

/**
 * 500 Internal Server Error
 */
export function internalError(c: Context, err?: Error): Response {
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err?.message || 'Internal server error'
  
  if (err) {
    console.error('[API Error]', err)
  }
  
  return error(c, ErrorCode.INTERNAL_ERROR, message, 500)
}

/**
 * 處理 Zod 驗證錯誤
 */
export function validationError(c: Context, zodError: any): Response {
  const issues = zodError.issues?.map((issue: any) => ({
    path: issue.path.join('.'),
    message: issue.message,
  })) || []
  
  return error(
    c,
    ErrorCode.VALIDATION_ERROR,
    'Validation failed',
    400,
    { issues }
  )
}

/**
 * 包裝 async handler，統一錯誤處理
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (err: any) {
      const c = args[0] as Context
      
      // Zod validation error
      if (err.name === 'ZodError') {
        return validationError(c, err)
      }
      
      // HTTP Exception (from middleware)
      if (err.status) {
        return error(c, ErrorCode.INTERNAL_ERROR, err.message, err.status)
      }
      
      // Database errors
      if (err.code?.startsWith('23')) {
        if (err.code === '23505') {
          return conflict(c, 'Duplicate entry')
        }
        if (err.code === '23503') {
          return badRequest(c, 'Referenced resource not found')
        }
      }
      
      return internalError(c, err)
    }
  }) as T
}
