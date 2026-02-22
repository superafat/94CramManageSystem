/**
 * Validation Middleware
 * 提供統一的請求驗證中介層
 */
import { Context, Next } from 'hono'
import { ZodSchema, ZodError } from 'zod'

/**
 * 驗證錯誤回應格式
 */
export interface ValidationErrorResponse {
  success: false
  error: string
  details?: Array<{
    field: string
    message: string
  }>
}

/**
 * 格式化 Zod 驗證錯誤
 */
export function formatZodError(error: ZodError): ValidationErrorResponse {
  return {
    success: false,
    error: 'Validation failed',
    details: error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  }
}

/**
 * 驗證請求 Body 的 Middleware
 * 
 * @example
 * ```ts
 * app.post('/users', validateRequest(createUserSchema), async (c) => {
 *   const data = c.get('validatedData')
 *   // data is now typed and validated
 * })
 * ```
 */
export function validateRequest<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json()
      const validatedData = schema.parse(body)
      
      // 將驗證後的資料存入 context
      c.set('validatedData', validatedData)
      
      await next()
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json(formatZodError(error), 400)
      }
      
      return c.json({
        success: false,
        error: 'Invalid request body',
      }, 400)
    }
  }
}

/**
 * 驗證請求 Query 參數的 Middleware
 * 
 * @example
 * ```ts
 * app.get('/users', validateQuery(paginationSchema), async (c) => {
 *   const query = c.get('validatedQuery')
 *   // query.page and query.limit are now validated
 * })
 * ```
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query()
      const validatedQuery = schema.parse(query)
      
      // 將驗證後的資料存入 context
      c.set('validatedQuery', validatedQuery)
      
      await next()
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json(formatZodError(error), 400)
      }
      
      return c.json({
        success: false,
        error: 'Invalid query parameters',
      }, 400)
    }
  }
}

/**
 * 驗證請求 Path 參數的 Middleware
 * 
 * @example
 * ```ts
 * app.get('/users/:id', validateParams(idParamSchema), async (c) => {
 *   const params = c.get('validatedParams')
 *   // params.id is now a validated UUID
 * })
 * ```
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const params = c.req.param()
      const validatedParams = schema.parse(params)
      
      // 將驗證後的資料存入 context
      c.set('validatedParams', validatedParams)
      
      await next()
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json(formatZodError(error), 400)
      }
      
      return c.json({
        success: false,
        error: 'Invalid path parameters',
      }, 400)
    }
  }
}

/**
 * 組合驗證 - 同時驗證 body, query, params
 * 
 * @example
 * ```ts
 * app.put('/users/:id', validateAll({
 *   params: idParamSchema,
 *   body: updateUserSchema,
 *   query: paginationSchema,
 * }), async (c) => {
 *   const { params, body, query } = c.get('validated')
 * })
 * ```
 */
export function validateAll(schemas: {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}) {
  return async (c: Context, next: Next) => {
    const validated: any = {}
    
    try {
      if (schemas.params) {
        validated.params = schemas.params.parse(c.req.param())
      }
      
      if (schemas.query) {
        validated.query = schemas.query.parse(c.req.query())
      }
      
      if (schemas.body) {
        const body = await c.req.json()
        validated.body = schemas.body.parse(body)
      }
      
      // 將所有驗證後的資料存入 context
      c.set('validated', validated)
      
      await next()
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json(formatZodError(error), 400)
      }
      
      return c.json({
        success: false,
        error: 'Validation failed',
      }, 400)
    }
  }
}
