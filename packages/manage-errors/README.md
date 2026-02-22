# @94manage/errors

統一的錯誤處理模組，提供標準化的錯誤類型和全局錯誤處理中介軟體。

## 功能特性

- ✅ 11 種自定義錯誤類型（AppError, ValidationError, UnauthorizedError, NotFoundError 等）
- ✅ 統一的錯誤回應格式
- ✅ 請求 ID 自動追蹤（支持客戶端提供或自動生成）
- ✅ 結構化 JSON 日誌
- ✅ 自定義日誌處理器支持
- ✅ 開發環境顯示完整堆疊追蹤
- ✅ 生產環境隱藏敏感資訊
- ✅ Hono 框架原生支援
- ✅ 完整的測試覆蓋（54 個測試用例）

## 安裝

```bash
pnpm add @94manage/errors@workspace:*
```

## 使用方法

### 1. 設置全局錯誤處理器

```typescript
import { Hono } from 'hono'
import { createErrorHandler } from '@94manage/errors'

const app = new Hono()

// 基礎設置
app.onError(createErrorHandler(process.env.NODE_ENV !== 'production'))

// 使用自定義日誌處理器
const customLogger = (error: Error, context: any) => {
  // 發送到日誌服務（如 Sentry、DataDog）
  console.log('Error logged:', context);
}
app.onError(createErrorHandler(true, customLogger))
```

### 2. 在路由中拋出錯誤

```typescript
import { 
  ValidationError, 
  UnauthorizedError, 
  NotFoundError,
  BadRequestError,
  TooManyRequestsError,
  ServiceUnavailableError,
  DatabaseError
} from '@94manage/errors'

// 驗證錯誤 (400)
app.post('/api/users', (c) => {
  throw new ValidationError('Email is required')
})

// 格式錯誤 (400)
app.post('/api/data', (c) => {
  throw new BadRequestError('Invalid JSON format')
})

// 未授權 (401)
app.get('/api/profile', (c) => {
  throw new UnauthorizedError('Token expired')
})

// 資源不存在 (404)
app.get('/api/users/:id', (c) => {
  throw new NotFoundError('User not found')
})

// 速率限制 (429)
app.post('/api/upload', (c) => {
  throw new TooManyRequestsError('Rate limit exceeded')
})

// 資料庫錯誤 (500)
app.get('/api/data', async (c) => {
  try {
    await db.query(...)
  } catch (error) {
    throw new DatabaseError('Connection pool exhausted')
  }
})

// 服務不可用 (503)
app.get('/api/status', (c) => {
  throw new ServiceUnavailableError('Maintenance in progress')
})
```

### 3. 請求 ID 追蹤

所有錯誤響應會自動包含 `x-request-id` header：

```typescript
// 客戶端請求
fetch('/api/users', {
  headers: {
    'x-request-id': 'custom-request-123'
  }
})

// 錯誤響應會包含相同的請求 ID
// Response headers:
// x-request-id: custom-request-123

// 如果客戶端不提供，會自動生成 UUID
```

### 4. 自定義錯誤訊息和代碼

```typescript
throw new ValidationError('Invalid email format', 'INVALID_EMAIL')
throw new UnauthorizedError('Session expired', 'SESSION_EXPIRED')
```

## 可用錯誤類型

| 錯誤類型 | HTTP 狀態碼 | 預設代碼 | 說明 |
|---------|-----------|---------|------|
| `BadRequestError` | 400 | BAD_REQUEST | 格式錯誤的請求 |
| `ValidationError` | 400 | VALIDATION_ERROR | 驗證失敗 |
| `UnauthorizedError` | 401 | UNAUTHORIZED | 未授權 |
| `ForbiddenError` | 403 | FORBIDDEN | 禁止訪問 |
| `NotFoundError` | 404 | NOT_FOUND | 資源不存在 |
| `ConflictError` | 409 | CONFLICT | 衝突 |
| `TooManyRequestsError` | 429 | TOO_MANY_REQUESTS | 速率限制 |
| `InternalServerError` | 500 | INTERNAL_ERROR | 內部伺服器錯誤 |
| `DatabaseError` | 500 | DATABASE_ERROR | 資料庫錯誤 |
| `ServiceUnavailableError` | 503 | SERVICE_UNAVAILABLE | 服務不可用 |
| `AppError` | 自定義 | 自定義 | 基礎錯誤類 |

## 錯誤回應格式

所有錯誤都會返回統一的 JSON 格式：

```json
{
  "success": false,
  "error": {
    "message": "Invalid input data",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "stack": "..." // 僅在開發環境顯示
  }
}
```

## 結構化日誌格式

錯誤日誌使用 JSON 格式，包含完整的請求上下文：

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "AppError",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "message": "Invalid input",
  "path": "/api/users",
  "method": "POST",
  "timestamp": "2026-02-20T17:16:43.617Z"
}
```

## 測試

```bash
# 運行測試
pnpm test

# 監聽模式
pnpm test:watch
```

測試覆蓋：
- ✅ 11 個錯誤類別的實例化和屬性測試
- ✅ 錯誤處理中介軟體的完整集成測試
- ✅ 請求 ID 追蹤和日誌功能測試
- ✅ 生產/開發模式切換測試
- ✅ 自定義日誌處理器測試

## 建構和開發

```bash
# 建構模組
pnpm build

# 監聽模式
pnpm dev

# 運行測試
pnpm test
```

## 範例

完整範例請參考：
- `backend/src/routes/error-test.ts` - 錯誤測試端點
- `packages/errors/src/__tests__/` - 完整測試用例
