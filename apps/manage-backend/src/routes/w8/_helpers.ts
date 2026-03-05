/**
 * Shared helper functions and re-exports for w8 route modules
 */
import { db } from '../../db'
import { sql } from 'drizzle-orm'
import { logger } from '../../utils/logger'
import {
  success,
  successWithPagination,
  badRequest,
  notFound,
  forbidden,
  internalError,
  conflict,
} from '../../utils/response'

export { db, sql, logger, success, successWithPagination, badRequest, notFound, forbidden, internalError, conflict }

export { type QueryResult, rows, first, isUUID, getUserBranchId } from '../../db/helpers'
