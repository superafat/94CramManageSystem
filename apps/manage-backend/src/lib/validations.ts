/**
 * Shared Zod Validation Schemas
 * 提供常用的驗證 schemas 和輔助函數
 */
import { z } from 'zod'

// ===== Basic Schemas =====

/** Email 驗證 */
export const emailSchema = z.string().email('Invalid email format')

/** 密碼驗證 (最少8字元，包含大小寫和數字) */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

/** 簡單密碼驗證 (最少8字元) */
export const simplePasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')

/** 電話號碼（台灣格式）*/
export const phoneSchema = z.string()
  .regex(/^(09\d{8}|0\d{1,2}-?\d{6,8})$/, 'Invalid phone format')

/** 手機號碼（台灣格式，09開頭）*/
export const mobilePhoneSchema = z.string()
  .regex(/^09\d{8}$/, 'Invalid mobile phone format (must be 09xxxxxxxx)')

/** UUID v4 格式驗證 */
export const uuidSchema = z.string().uuid('Invalid UUID format')

/** 非空字串 */
export const nonEmptyString = z.string().min(1, 'Cannot be empty')

// ===== Pagination Schemas =====

/** 分頁參數 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/** 分頁參數 (從 query string) */
export const paginationQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
}).transform(data => ({
  page: Math.max(1, data.page),
  limit: Math.min(100, Math.max(1, data.limit)),
}))

// ===== Date & Time Schemas =====

/** 日期字串 (YYYY-MM-DD) */
export const dateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')

/** 時間字串 (HH:MM or HH:MM:SS) */
export const timeStringSchema = z.string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM or HH:MM:SS)')

/** 日期範圍 */
export const dateRangeSchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
}).refine(
  (data) => {
    if (data.from && data.to) {
      return new Date(data.from) <= new Date(data.to)
    }
    return true
  },
  { message: 'from date must be before or equal to to date' }
)

// ===== Auth Schemas =====

/** 登入 Schema */
export const loginSchema = z.object({
  email: emailSchema,
  password: simplePasswordSchema,
})

/** 註冊 Schema */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nonEmptyString.max(50),
})

/** 重設密碼 Schema */
export const resetPasswordSchema = z.object({
  email: emailSchema,
})

/** 變更密碼 Schema */
export const changePasswordSchema = z.object({
  oldPassword: simplePasswordSchema,
  newPassword: passwordSchema,
})

// ===== Common ID Schemas =====

/** 單一 ID 參數 */
export const idParamSchema = z.object({
  id: uuidSchema,
})

/** Bulk IDs Schema */
export const bulkIdsSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(100),
})

// ===== Search & Filter Schemas =====

/** 搜尋 Schema */
export const searchSchema = z.object({
  q: z.string().max(100).optional(),
  ...paginationSchema.shape,
})

/** 排序 Schema */
export const sortSchema = z.object({
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// ===== Utility Functions =====

/**
 * 清理可能的 XSS 字串
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
}

/**
 * 安全的字串 Schema (防 XSS)
 */
export const safeStringSchema = z.string().transform(sanitizeString)

/**
 * 清理搜尋字串 (防 SQL injection)
 */
export function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/[%_\\]/g, '')
    .replace(/[<>'"`;]/g, '')
    .trim()
    .slice(0, 100)
}
