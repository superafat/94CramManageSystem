# Phase 3: bot-gateway 擴充 — REST API + 家長 Bot

## 任務概述
擴充 `apps/bot-gateway`：
1. 新增 Dashboard REST API（讓 bot-dashboard 前端呼叫）
2. 新增順風耳（家長 Bot） Telegram webhook
3. 新增 Firestore collections 結構
4. 擴充 config 支援雙 Bot token

Phase 1-2 已完成 bot-dashboard 前端（port 3400），Phase 3 完成後端 API。

## 專案位置
- **Monorepo**: `~/Github/94CramManageSystem`
- **本 app**: `apps/bot-gateway`（Hono + Firestore，port 3300）
- **現有**：單一 Telegram webhook（千里眼 Bot）+ Firestore collections

## 需要修改的檔案

### 1. `src/config.ts` — 雙 Bot Token
```typescript
// 新增
TELEGRAM_PARENT_BOT_TOKEN: z.string().min(1),
BOT_DASHBOARD_URL: z.string().url().optional(),
```
現有 `TELEGRAM_BOT_TOKEN` 是千里眼（管理員 Bot），新增 `TELEGRAM_PARENT_BOT_TOKEN` 給順風耳（家長 Bot）。

### 2. `src/utils/telegram.ts` — 擴充為雙 Bot 支援
- 現有：用單一 `TELEGRAM_BOT_TOKEN` 呼叫 Telegram API
- 修改：新增 `sendMessageAsParent()` 或改造成接收參數動態選擇 token
- 函數簽名：`sendMessage(chatId, text, options?, botToken?: string)`
- 預設用千里眼 token，傳入 parent token 時用順風耳

### 3. 新增 `src/webhooks/telegram-parent.ts` — 順風耳 Webhook
> 處理家長 Bot（@Cram94_VIP_bot）訊息

**路由**：`POST /webhook/telegram-parent`

**邏輯**：
1. Parse Telegram update（用現有 `platform-adapter.ts` 的 `parseTelegramUpdate`）
2. 驗證 user 已經綁定（`bot_parent_bindings` collection）
3. 解析意圖（用新的 parent intent parser，見下）
4. 執行查詢（唯讀操作，不需二次確認）
5. 回覆訊息

**家長 Bot 意圖**：
| Intent | 說明 | 參數 |
|--------|------|------|
| `parent.attendance` | 查孩子出缺勤 | child_name?, date? |
| `parent.grades` | 查孩子成績 | child_name?, subject?, exam? |
| `parent.payments` | 查繳費狀態 | child_name?, month? |
| `parent.schedule` | 查課表 | child_name?, day? |
| `parent.info` | 查孩子基本資料 | child_name? |
| `parent.help` | 使用說明 | - |

**權限**：家長 Bot **只能查詢**，無寫入權限。不需要 confirm-manager。

### 4. 新增 `src/handlers/parent-intent-router.ts` — 家長意圖路由
> 解析家長查詢請求

**功能**：
- 接收自然語言或結構化參數
- 呼叫對應的後端 API（manage/inclass/stock 的 parent-ext 端點，Phase 5 才實作，目前用 mock）
- 格式化回覆訊息

**Intent Parser**：
- 可以用現有 `ai-engine.ts` 的 Gemini 解析，但 prompt 改成家長版本
- 或用簡單的 keyword matching + regex（更快、更省 Gemini quota）

**建議**：先用 keyword matching + Gemini fallback。Keyword matching 快速低成本，無法解析時才 call Gemini。

### 5. 新增 `src/api/` — Dashboard REST API
> 讓 bot-dashboard 前端呼叫

**Router**：`/api/` 掛在 `app.ts`

| Endpoint | Method | 說明 |
|----------|--------|------|
| `/api/auth/verify` | POST | 驗證 JWT token（dashboard middleware 用） |
| `/api/subscriptions` | GET | 取得租戶訂閱狀態 |
| `/api/subscriptions` | PUT | 更新訂閱方案 |
| `/api/bind-codes` | POST | 生成千里眼綁定碼 |
| `/api/bind-codes` | GET | 取得綁定碼列表 |
| `/api/bindings` | GET | 取得已綁定用戶列表 |
| `/api/bindings/:userId` | DELETE | 解除綁定 |
| `/api/parent-invites` | POST | 生成家長邀請碼（需傳 student_id） |
| `/api/parent-invites` | GET | 取得邀請碼列表 |
| `/api/parent-bindings` | GET | 取得已綁定家長列表 |
| `/api/parent-bindings/:userId` | DELETE | 解除家長綁定 |
| `/api/usage` | GET | 取得用量統計 |
| `/api/settings` | GET | 取得租戶設定 |
| `/api/settings` | PUT | 更新租戶設定（模組開關、通知偏好） |

**認證**：所有 `/api/*` 需要 JWT Bearer token（解析自 Header `Authorization: Bearer <token>`）。

**驗證**：直接呼叫現有 Firestore functions（bindings, settings, usage 等），不用新增 DB 操作。

### 6. 新增 Firestore Collections 結構

**現有 collections**（不動）：
- `bot_user_bindings` — 千里眼用戶綁定
- `bot_tenant_settings` — 租戶設定
- `bot_tenant_cache` — 租戶快取
- `bot_usage_stats` — 用量統計
- `bot_operation_logs` — 操作日誌
- `bot_pending_actions` — 待確認操作
- `bot_bind_codes` — 綁定碼

**新 collections**：
```typescript
// bot_parent_bindings — 家長綁定
{
  telegram_user_id: string,
  parent_name: string,
  children: Array<{ student_id: string, student_name: string, relation: string }>,
  created_at: timestamp,
  last_active_at: timestamp,
}

// bot_parent_invites — 家長邀請碼
{
  code: string,           // 6位數
  tenant_id: string,
  student_id: string,
  student_name: string,
  status: 'pending' | 'used' | 'expired',
  created_at: timestamp,
  expires_at: timestamp,
  used_by_telegram_user_id?: string,
}

// bot_subscriptions — 訂閱狀態
{
  tenant_id: string,
  plan: 'free' | 'basic' | 'pro' | 'enterprise',
  admin_bot_active: boolean,
  parent_bot_active: boolean,
  parent_limit: number,           // 允許的家長數上限
  ai_calls_limit: number,         // 月 AI calls 上限
  ai_calls_used: number,          // 本月已用
  created_at: timestamp,
  updated_at: timestamp,
}

// bot_notifications — 通知紀錄
{
  tenant_id: string,
  telegram_user_id: string,
  type: 'arrival' | 'departure' | 'grade' | 'payment',
  message: string,
  sent_at: timestamp,
}
```

### 7. `src/app.ts` — 註冊新路由
```typescript
// 現有
app.route('/webhook/telegram', telegramWebhook);

// 新增
app.route('/webhook/telegram-parent', telegramParentWebhook);
app.route('/api', apiRouter);
```

### 8. Dockerfile / Cloud Run 環境變數
確保 `.env` 包含：
```
TELEGRAM_BOT_TOKEN=8708001242:AAELHo-qHKYF8yLu9PzXJL42L0bcriEJ1Q8
TELEGRAM_PARENT_BOT_TOKEN=8720962334:AAG3BBsmo4jliFMBBdA60QQWGmzfOgRmLVk
BOT_DASHBOARD_URL=https://cram94-bot-dashboard-xxxx.asia-east1.run.app
```

## API 實作細節

### JWT 驗證 Middleware
```typescript
// src/middleware/auth.ts
import { verify } from '@94cram/shared/auth/jwt';

export async function authMiddleware(c: Context, next: () => Promise<Response>) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.slice(7);
  try {
    const payload = await verify(token);
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
```

### 用量檢查 Middleware
每個 API call 檢查：
1. 訂閱方案是否允許該操作
2. 用量是否接近上限（> 80% 警告，> 100% 拒絕）

## 驗收標準
1. `pnpm typecheck` 通過（0 errors）
2. `pnpm build` 成功
3. `curl http://localhost:3300/health` 回 `{"status":"ok"}`
4. 新增 `/api/*` endpoints 可訪問（401 如果無 token）
5. 順風耳 webhook 路由存在（`POST /webhook/telegram-parent`）
6. 所有 Firestore 操作有對應的 TypeScript interface

## 禁止事項
- 不要修改 Phase 1-2 已完成的前端程式碼
- 不要建立新的 npm scripts
- 不要修改 `packages/shared` 的程式碼
- 不要在這個 Phase 做 parent-ext API 串接三大系統（Phase 5）

## 參考
- 現有 webhook 邏輯：`src/webhooks/telegram.ts`
- 現有 intent router：`src/handlers/intent-router.ts`
- 現有 Firestore 操作：`src/firestore/bindings.ts`、`src/firestore/settings.ts`
- JWT utils：`packages/shared/src/auth/jwt.ts`
- 千里眼 token 已存：`.env` 中的 `TELEGRAM_BOT_TOKEN`
- 順風耳 token：`.env` 中的 `TELEGRAM_PARENT_BOT_TOKEN`
