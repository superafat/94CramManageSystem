/**
 * 統一錯誤處理模組整合示範
 * 
 * 此檔案展示如何在現有的 backend 中使用 @94manage/errors 模組
 * 
 * 選項 1: 完全遷移到錯誤類（推薦用於新路由）
 * 選項 2: 與現有 response utilities 並存（用於逐步遷移）
 * 選項 3: 使用快取系統提升性能（新增）
 */

import { Hono } from 'hono'
import { 
  ValidationError, 
  UnauthorizedError, 
  NotFoundError,
  ForbiddenError,
  ConflictError 
} from '@94manage/errors'
import { success } from '../utils/response'
import { defaultCache, cacheable } from '../lib/cache'

const exampleRoutes = new Hono()

// ===== 選項 1: 使用錯誤類（推薦） =====

/**
 * 範例：用戶登入
 * 直接拋出錯誤，讓全局錯誤處理器捕獲
 */
exampleRoutes.post('/login', async (c) => {
  const { email, password } = await c.req.json()

  // 驗證輸入
  if (!email || !password) {
    throw new ValidationError('Email and password are required')
  }

  // 檢查用戶是否存在
  const user = await findUserByEmail(email)
  if (!user) {
    throw new UnauthorizedError('Invalid credentials')
  }

  // 驗證密碼
  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials')
  }

  // 檢查帳號狀態
  if (user.status !== 'active') {
    throw new ForbiddenError('Account is disabled')
  }

  // 成功返回
  const token = await generateToken(user)
  return success(c, { token, user: sanitizeUser(user) })
})

/**
 * 範例：取得用戶資料
 * 展示 NotFoundError 的使用
 */
exampleRoutes.get('/users/:id', async (c) => {
  const userId = c.req.param('id')

  if (!userId) {
    throw new ValidationError('User ID is required')
  }

  const user = await findUserById(userId)
  
  if (!user) {
    throw new NotFoundError(`User with ID ${userId} not found`)
  }

  return success(c, { user: sanitizeUser(user) })
})

/**
 * 範例：建立用戶
 * 展示 ConflictError 的使用
 */
exampleRoutes.post('/users', async (c) => {
  const { email, name, password } = await c.req.json()

  // 驗證輸入
  if (!email || !name || !password) {
    throw new ValidationError('Email, name, and password are required')
  }

  // 檢查 email 是否已存在
  const existingUser = await findUserByEmail(email)
  if (existingUser) {
    throw new ConflictError('Email already registered')
  }

  // 建立用戶
  const user = await createUser({ email, name, password })
  
  return success(c, { user: sanitizeUser(user) }, 201)
})

/**
 * 範例：更新用戶
 * 展示權限檢查
 */
exampleRoutes.put('/users/:id', async (c) => {
  const userId = c.req.param('id')
  const currentUser = c.get('user') // 來自 JWT middleware

  // 檢查權限
  if (currentUser.id !== userId && currentUser.role !== 'admin') {
    throw new ForbiddenError('You can only update your own profile')
  }

  const user = await findUserById(userId)
  if (!user) {
    throw new NotFoundError('User not found')
  }

  const { name, email } = await c.req.json()
  const updatedUser = await updateUser(userId, { name, email })

  return success(c, { user: sanitizeUser(updatedUser) })
})

// ===== 選項 2: 錯誤類與 response utilities 混合使用 =====

/**
 * 你也可以在特定情況下使用錯誤類，其他情況繼續使用 response utilities
 * 例如：用錯誤類處理業務邏輯錯誤，用 response utilities 處理成功回應
 */
exampleRoutes.post('/transfer', async (c) => {
  const { fromUserId, toUserId, amount } = await c.req.json()

  // 使用錯誤類進行驗證
  if (!fromUserId || !toUserId || !amount) {
    throw new ValidationError('Missing required fields')
  }

  if (amount <= 0) {
    throw new ValidationError('Amount must be greater than 0')
  }

  const fromUser = await findUserById(fromUserId)
  const toUser = await findUserById(toUserId)

  if (!fromUser) {
    throw new NotFoundError('Sender not found')
  }

  if (!toUser) {
    throw new NotFoundError('Recipient not found')
  }

  if (fromUser.balance < amount) {
    throw new ValidationError('Insufficient balance')
  }

  // 執行轉帳
  const transaction = await performTransfer(fromUserId, toUserId, amount)

  // 使用現有的 success helper
  return success(c, { transaction })
})

// ===== 選項 3: 使用快取系統 =====

/**
 * 範例：使用快取裝飾器
 * 自動快取方法結果
 */
class UserService {
  @cacheable({ ttl: 60000 }) // 快取 1 分鐘
  async getUserById(id: string) {
    console.log(`Fetching user ${id} from database...`)
    return await findUserById(id)
  }

  @cacheable({ 
    ttl: 300000, // 快取 5 分鐘
    keyGenerator: (email: string) => `user:email:${email}`
  })
  async getUserByEmail(email: string) {
    console.log(`Fetching user ${email} from database...`)
    return await findUserByEmail(email)
  }
}

const userService = new UserService()

/**
 * 範例：在路由中使用快取
 */
exampleRoutes.get('/cached-users/:id', async (c) => {
  const userId = c.req.param('id')
  
  // 第一次呼叫會查詢資料庫，後續 1 分鐘內會返回快取結果
  const user = await userService.getUserById(userId)
  
  if (!user) {
    throw new NotFoundError('User not found')
  }

  return success(c, { user: sanitizeUser(user), cached: true })
})

/**
 * 範例：手動使用快取
 */
exampleRoutes.get('/stats', async (c) => {
  const cacheKey = 'stats:dashboard'
  
  // 嘗試從快取獲取
  let stats = defaultCache.get(cacheKey)
  
  if (!stats) {
    // 快取未命中，計算統計數據
    console.log('Computing stats...')
    stats = {
      totalUsers: 1000,
      activeUsers: 750,
      revenue: 50000,
      computedAt: new Date().toISOString()
    }
    
    // 快取 5 分鐘
    defaultCache.set(cacheKey, stats, 300000)
  }
  
  return success(c, { stats })
})

/**
 * 範例：清除快取
 */
exampleRoutes.delete('/cache', async (c) => {
  const { key } = await c.req.json()
  
  if (key) {
    // 清除特定快取
    const deleted = defaultCache.del(key)
    return success(c, { deleted, key })
  } else {
    // 清除所有快取
    defaultCache.clear()
    return success(c, { message: 'All cache cleared' })
  }
})

/**
 * 範例：快取資訊
 */
exampleRoutes.get('/cache/info', async (c) => {
  return success(c, {
    size: defaultCache.size(),
    keys: defaultCache.keys()
  })
})

// ===== Mock 函數（實際使用時替換為真實實現） =====

async function findUserByEmail(email: string) {
  // 實現查詢邏輯
  return null
}

async function findUserById(id: string) {
  // 實現查詢邏輯
  return null
}

async function verifyPassword(input: string, hash: string) {
  // 實現密碼驗證
  return false
}

async function generateToken(user: any) {
  // 實現 JWT token 生成
  return 'token'
}

async function createUser(data: any) {
  // 實現用戶建立
  return data
}

async function updateUser(id: string, data: any) {
  // 實現用戶更新
  return data
}

async function performTransfer(from: string, to: string, amount: number) {
  // 實現轉帳邏輯
  return { from, to, amount }
}

function sanitizeUser(user: any) {
  // 移除敏感資訊
  const { password, ...safe } = user
  return safe
}

export { exampleRoutes }
