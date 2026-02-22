/**
 * Example Routes - 展示如何使用 Validation Middleware
 * 
 * 這個檔案展示了如何使用統一的驗證中介層：
 * - validateRequest: 驗證 request body
 * - validateQuery: 驗證 query parameters
 * - validateParams: 驗證 path parameters
 * - validateAll: 同時驗證多個部分
 */
import { Hono } from 'hono'
import { 
  validateRequest, 
  validateQuery, 
  validateParams,
  validateAll 
} from '../middleware/validation'
import { 
  loginSchema,
  registerSchema,
  paginationSchema,
  idParamSchema,
  searchSchema,
} from '../lib/validations'
import { z } from 'zod'

export const exampleRoutes = new Hono()

// ========================================================================
// 範例 1: 驗證 Request Body
// ========================================================================
exampleRoutes.post('/register', validateRequest(registerSchema), async (c) => {
  // 從 context 取得驗證後的資料（已經過類型檢查）
  const data = c.get('validatedData') as z.infer<typeof registerSchema>
  
  // data.email, data.password, data.name 都已經過驗證
  return c.json({
    success: true,
    message: 'User registered successfully',
    data: {
      email: data.email,
      name: data.name,
    },
  })
})

// ========================================================================
// 範例 2: 驗證 Query Parameters
// ========================================================================
exampleRoutes.get('/users', validateQuery(paginationSchema), async (c) => {
  // 從 context 取得驗證後的 query
  const query = c.get('validatedQuery') as z.infer<typeof paginationSchema>
  
  // query.page 和 query.limit 都是數字，且已驗證範圍
  return c.json({
    success: true,
    data: {
      users: [],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: 0,
      },
    },
  })
})

// ========================================================================
// 範例 3: 驗證 Path Parameters
// ========================================================================
exampleRoutes.get('/users/:id', validateParams(idParamSchema), async (c) => {
  // 從 context 取得驗證後的 params
  const params = c.get('validatedParams') as z.infer<typeof idParamSchema>
  
  // params.id 已經過 UUID 格式驗證
  return c.json({
    success: true,
    data: {
      id: params.id,
      name: 'John Doe',
      email: '[email protected]',
    },
  })
})

// ========================================================================
// 範例 4: 同時驗證多個部分
// ========================================================================
const updateUserSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
})

exampleRoutes.put('/users/:id', validateAll({
  params: idParamSchema,
  body: updateUserSchema,
  query: z.object({
    notify: z.enum(['true', 'false']).optional(),
  }),
}), async (c) => {
  // 從 context 取得所有驗證後的資料
  const { params, body, query } = c.get('validated') as {
    params: z.infer<typeof idParamSchema>
    body: z.infer<typeof updateUserSchema>
    query: { notify?: 'true' | 'false' }
  }
  
  return c.json({
    success: true,
    message: 'User updated successfully',
    data: {
      id: params.id,
      ...body,
      notificationSent: query.notify === 'true',
    },
  })
})

// ========================================================================
// 範例 5: 搜尋功能（結合 query 驗證）
// ========================================================================
exampleRoutes.get('/search', validateQuery(searchSchema), async (c) => {
  const query = c.get('validatedQuery') as z.infer<typeof searchSchema>
  
  return c.json({
    success: true,
    data: {
      query: query.q || '',
      results: [],
      pagination: {
        page: query.page,
        limit: query.limit,
      },
    },
  })
})

// ========================================================================
// 範例 6: 自訂錯誤訊息
// ========================================================================
const customSchema = z.object({
  age: z.number()
    .int('年齡必須是整數')
    .min(0, '年齡不可為負數')
    .max(150, '年齡不可超過 150 歲'),
  email: z.string().email('請輸入有效的電子郵件'),
})

exampleRoutes.post('/custom-validation', validateRequest(customSchema), async (c) => {
  const data = c.get('validatedData') as z.infer<typeof customSchema>
  
  return c.json({
    success: true,
    data,
  })
})

// ========================================================================
// 範例 7: 使用 @hono/zod-validator (原有方式，仍然有效)
// ========================================================================
import { zValidator } from '@hono/zod-validator'

exampleRoutes.post('/login-original', zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json')
  
  return c.json({
    success: true,
    message: 'Login successful (using zValidator)',
    data: {
      email: body.email,
    },
  })
})
