/**
 * Centralized error classes for backend
 * Re-exports from @94manage/errors package for convenience
 */

export {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  BadRequestError,
  TooManyRequestsError,
  ServiceUnavailableError,
  DatabaseError
} from '@94manage/errors'
