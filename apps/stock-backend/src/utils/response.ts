/**
 * Unified API Response Utilities for stock-backend
 * Mirrors manage-backend/src/utils/response.ts for consistency across backends.
 */
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { ZodError } from 'zod'
import { logger } from './logger'

// ===== Response Types =====

interface SuccessResponse<T = unknown> {
  success: true
  data: T
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    [key: string]: unknown
  }
}

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

// ===== Error Codes =====

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode]

// ===== Response Helpers =====

export function success<T>(c: Context, data: T, status: ContentfulStatusCode = 200): Response {
  const response: SuccessResponse<T> = { success: true, data }
  return c.json(response, status)
}

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

export function error(
  c: Context,
  code: ErrorCodeType,
  message: string,
  status: ContentfulStatusCode = 400,
  details?: unknown
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

export function badRequest(c: Context, message: string, details?: unknown): Response {
  return error(c, ErrorCode.VALIDATION_ERROR, message, 400, details)
}

export function unauthorized(c: Context, message: string = 'Unauthorized'): Response {
  return error(c, ErrorCode.UNAUTHORIZED, message, 401)
}

export function forbidden(c: Context, message: string = 'Forbidden'): Response {
  return error(c, ErrorCode.FORBIDDEN, message, 403)
}

export function notFound(c: Context, resource: string = 'Resource'): Response {
  return error(c, ErrorCode.NOT_FOUND, `${resource} not found`, 404)
}

export function conflict(c: Context, message: string): Response {
  return error(c, ErrorCode.CONFLICT, message, 409)
}

export function internalError(c: Context, err?: unknown): Response {
  const errorObj = err instanceof Error ? err : new Error(String(err))
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : errorObj.message || 'Internal server error'

  if (err) {
    logger.error({ err: errorObj }, '[API Error]')
  }

  return error(c, ErrorCode.INTERNAL_ERROR, message, 500)
}

export function validationError(c: Context, zodError: ZodError): Response {
  const issues = zodError.issues?.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  })) || []

  return error(c, ErrorCode.VALIDATION_ERROR, 'Validation failed', 400, { issues })
}
