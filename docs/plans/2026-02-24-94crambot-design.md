# 94CramBot 設計文件

**日期：** 2026-02-24
**狀態：** 已核准
**版本：** v1.0

---

## 一、目標

在 94cram.com 平台新增第四個服務 94CramBot（Bot Gateway），讓補習班主任透過 Telegram 用自然語言操作三大系統（94Manage、94inClass、94Stock）。同時修改現有三個後端，新增 `/api/bot/*` 路由供 Bot Gateway 呼叫。

---

## 二、技術決策

| 決策項目 | 選擇 | 原因 |
|---------|------|------|
| 框架 | Hono + @hono/node-server | 對齊現有 3 個後端 |
| 語言 | TypeScript + ESM | 對齊現有架構 |
| AI SDK | @google/generative-ai | 輕量，API Key 即可使用 |
| IAM 驗證 | google-auth-library | GCP 服務間標準驗證方式 |
| Bot 路由 DB 查詢 | 直接寫 Drizzle 查詢 | 不動現有程式碼，零風險 |
| Bot 資料儲存 | Firestore | 適合 document 模型（綁定、暫存、快取、日誌） |
| 建置工具 | tsup | 對齊現有後端 |

---

## 三、架構總覽

```
┌─────────────┐    Telegram Webhook     ┌──────────────────┐
│  Telegram    │ ──────────────────────> │  Bot Gateway     │
│  (主任手機)   │ <────────────────────── │  cram94-bot-gw   │
└─────────────┘    Bot Reply             │  Port: 3300      │
                                         │                  │
                                         │  Modules:        │
                                         │  - Platform      │
                                         │    Adapter       │
                                         │  - Auth Manager  │
                                         │  - AI Engine     │
                                         │    (Gemini 2.0   │
                                         │     Flash)       │
                                         │  - Confirm Mgr   │
                                         │  - API Client    │
                                         └──────┬───────────┘
                                                │ GCP IAM Token
                              ┌─────────────────┼─────────────────┐
                              │                 │                 │
                              ▼                 ▼                 ▼
                     ┌────────────┐    ┌────────────┐    ┌────────────┐
                     │ manage     │    │ inclass    │    │ stock      │
                     │ backend    │    │ backend    │    │ backend    │
                     │            │    │            │    │            │
                     │ /api/bot/  │    │ /api/bot/  │    │ /api/bot/  │
                     │  finance/* │    │  attend/*  │    │  stock/*   │
                     │  student/* │    │  data/*    │    │  data/*    │
                     │  data/*    │    │            │    │            │
                     └────────────┘    └────────────┘    └────────────┘
                              │                 │                 │
                              └─────────────────┼─────────────────┘
                                                │
                                         ┌──────┴───────┐
                                         │  PostgreSQL  │
                                         │  (Drizzle)   │
                                         └──────────────┘

Bot Gateway 自有資料：Firestore
- bot_user_bindings（綁定關係）
- bot_pending_actions（待確認操作）
- bot_tenant_cache（租戶快取）
- bot_operation_logs（操作日誌）
- bot_bind_codes（綁定碼）
```

---

## 四、新增檔案結構

### 4.1 Bot Gateway（全新服務）

```
apps/bot-gateway/
├── Dockerfile
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── src/
│   ├── index.ts                     # Hono server 啟動
│   ├── app.ts                       # Hono app + 路由掛載
│   ├── config.ts                    # Zod 環境變數驗證
│   ├── webhooks/
│   │   └── telegram.ts              # POST /webhook/telegram
│   ├── modules/
│   │   ├── platform-adapter.ts      # Telegram 訊息 → 統一格式
│   │   ├── auth-manager.ts          # 綁定查詢、租戶切換
│   │   ├── ai-engine.ts             # Gemini 2.0 Flash 意圖解析
│   │   ├── confirm-manager.ts       # 寫入類暫存 + 確認/取消
│   │   └── api-client.ts            # 呼叫 3 個後端的 /api/bot/*
│   ├── commands/
│   │   ├── bind.ts                  # /bind 綁定碼
│   │   ├── switch.ts                # /switch 切換租戶
│   │   ├── sync.ts                  # /sync 快取同步
│   │   └── help.ts                  # /help 使用說明
│   ├── handlers/
│   │   ├── intent-router.ts         # AI 解析結果 → 對應 API 呼叫
│   │   └── callback.ts              # Inline keyboard callback 處理
│   ├── firestore/
│   │   ├── client.ts                # Firestore 初始化
│   │   ├── bindings.ts              # bot_user_bindings CRUD
│   │   ├── pending-actions.ts       # bot_pending_actions CRUD
│   │   ├── cache.ts                 # bot_tenant_cache CRUD
│   │   └── logs.ts                  # bot_operation_logs CRUD
│   └── utils/
│       ├── rate-limit.ts            # 每人每分鐘 30 則
│       └── telegram.ts              # Telegram Bot API 工具函式
```

### 4.2 現有後端修改

```
apps/manage-backend/src/
├── middleware/
│   └── botAuth.ts                   # 新增
├── routes/
│   └── bot/
│       ├── index.ts                 # 新增：/api/bot 路由入口
│       ├── finance.ts               # 新增：/api/bot/finance/*
│       ├── student.ts               # 新增：/api/bot/student/*
│       └── data.ts                  # 新增：/api/bot/data/*（含綁定碼）

apps/inclass-backend/src/
├── middleware/
│   └── botAuth.ts                   # 新增
├── routes/
│   └── bot/
│       ├── index.ts                 # 新增：/api/bot 路由入口
│       ├── attendance.ts            # 新增：/api/bot/attendance/*
│       └── data.ts                  # 新增：/api/bot/data/*

apps/stock-backend/src/
├── middleware/
│   └── botAuth.ts                   # 新增
├── routes/
│   └── bot/
│       ├── index.ts                 # 新增：/api/bot 路由入口
│       ├── stock.ts                 # 新增：/api/bot/stock/*
│       └── data.ts                  # 新增：/api/bot/data/*
```

### 4.3 現有檔案修改（極小範圍）

每個後端只改一個檔案（主路由掛載），加一行 `app.route('/api/bot', botRoutes)`：

- `apps/manage-backend/src/app.ts` — 加一行掛載
- `apps/inclass-backend/src/index.ts` — 加一行掛載
- `apps/stock-backend/src/index.ts` — 加一行掛載

---

## 五、驗證架構

### 5.1 現有路徑（不動）

```
瀏覽器 → JWT 驗證 → /api/*
```

### 5.2 新增 Bot 路徑

```
Bot Gateway → GCP IAM token → /api/bot/*
```

### 5.3 botAuth Middleware（Hono 版）

```typescript
// 三個後端共用相同邏輯
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();
const BOT_SA = 'cram94-bot-gateway@cram94-manage-system.iam.gserviceaccount.com';

export const botAuth = createMiddleware(async (c, next) => {
  // 1. 驗證 GCP IAM token
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ success: false, error: '未授權' }, 401);

  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: env.SERVICE_URL,
  });

  // 2. 確認來源是 Bot Gateway
  if (ticket.getPayload()?.email !== BOT_SA) {
    return c.json({ success: false, error: '非授權服務' }, 403);
  }

  // 3. 從 body 讀取 tenant_id
  const body = await c.req.json();
  const tenantId = body.tenant_id;
  if (!tenantId) return c.json({ success: false, error: '缺少 tenant_id' }, 400);

  // 4. 設定 context（相容現有命名）
  c.set('tenantId', tenantId);
  c.set('schoolId', tenantId);  // inclass 用
  c.set('botRequest', true);

  await next();
});
```

---

## 六、Bot Gateway 核心流程

### 6.1 訊息處理主流程

```
Telegram Webhook POST
  → Platform Adapter（解析 Telegram 格式 → UnifiedMessage）
  → Rate Limiter（每人每分鐘 30 則）
  → Auth Manager（查 Firestore 綁定 → 取得 active_tenant）
    → 未綁定 → 回覆引導綁定訊息
    → 已綁定 → 繼續
  → 指令檢查（/bind, /switch, /sync, /help → 對應 handler）
  → AI Engine（Gemini 2.0 Flash → JSON structured output）
    → 意圖解析 + 實體萃取
    → need_clarification = true → 回覆澄清問題
  → Intent Router
    → 查詢類 → 直接呼叫 API → 回傳結果
    → 寫入類 → Confirm Manager
      → 暫存 Firestore → 發確認訊息（Inline Keyboard）
      → 確認 → 呼叫 API → 回傳結果
      → 取消 → 刪除暫存 → 回覆「已取消」
      → 5 分鐘逾時 → 自動取消
```

### 6.2 意圖分類

| Intent ID | 模組 | 說明 | 類型 |
|-----------|------|------|------|
| inclass.leave | 94inClass | 登記請假 | 寫入 |
| inclass.late | 94inClass | 登記遲到 | 寫入 |
| inclass.query | 94inClass | 查出缺勤 | 查詢 |
| manage.payment | 94Manage | 登記繳費 | 寫入 |
| manage.add_student | 94Manage | 新增學生 | 寫入 |
| manage.query_student | 94Manage | 查學生資料 | 查詢 |
| manage.query_finance | 94Manage | 查財務報表 | 查詢 |
| stock.ship | 94Stock | 出貨（減庫存） | 寫入 |
| stock.restock | 94Stock | 進貨（加庫存） | 寫入 |
| stock.query | 94Stock | 查庫存 | 查詢 |
| system.switch | 系統 | 切換補習班 | 系統 |
| system.help | 系統 | 查看使用說明 | 系統 |

### 6.3 AI Engine 設定

- Model: `gemini-2.0-flash`
- Temperature: 0
- Output: JSON (Structured Output)
- System Prompt 動態包含：該租戶的學生名單、班級列表、品項列表、倉庫列表（從快取讀取）

---

## 七、API 端點總覽

### 7.1 94inClass 新增端點

| 路由 | 方法 | 說明 |
|------|------|------|
| /api/bot/attendance/leave | POST | 登記請假 |
| /api/bot/attendance/late | POST | 登記遲到 |
| /api/bot/attendance/list | POST | 查詢某日出缺勤列表 |
| /api/bot/attendance/report | POST | 查詢學生出缺勤報告 |
| /api/bot/data/students | POST | 取得學生名單（快取用） |
| /api/bot/data/classes | POST | 取得班級列表（快取用） |

### 7.2 94Manage 新增端點

| 路由 | 方法 | 說明 |
|------|------|------|
| /api/bot/finance/payment | POST | 登記繳費 |
| /api/bot/finance/summary | POST | 查詢收費摘要 |
| /api/bot/finance/history | POST | 查詢學生繳費紀錄 |
| /api/bot/student/create | POST | 新增學生 |
| /api/bot/student/search | POST | 搜尋學生 |
| /api/bot/data/students | POST | 取得學生名單（快取用） |
| /api/bot/data/classes | POST | 取得班級列表（快取用） |
| /api/bot/data/bindcode | POST | 生成 Bot 綁定碼 |

### 7.3 94Stock 新增端點

| 路由 | 方法 | 說明 |
|------|------|------|
| /api/bot/stock/ship | POST | 出貨（減庫存） |
| /api/bot/stock/restock | POST | 進貨（加庫存） |
| /api/bot/stock/check | POST | 查詢品項庫存 |
| /api/bot/stock/history | POST | 查詢出入貨紀錄 |
| /api/bot/data/items | POST | 取得品項列表（快取用） |
| /api/bot/data/warehouses | POST | 取得倉庫/分校列表（快取用） |

### 7.4 統一回應格式

```json
// 成功
{
  "success": true,
  "message": "人類可讀的結果描述",
  "data": { ... }
}

// 失敗
{
  "success": false,
  "error": "error_code",
  "message": "人類可讀的錯誤描述",
  "suggestions": [ ... ]
}
```

---

## 八、多租戶管理

### 8.1 綁定機制

1. 主任在 94Manage 後台點「生成 Bot 綁定碼」
2. 系統產生 6 位數綁定碼，存入 Firestore，有效期 5 分鐘
3. 主任在 Telegram 對 94CramBot 發送 `/bind 123456`
4. Bot 驗證綁定碼 → 將 Telegram User ID 綁定到該補習班
5. 可重複綁定多間補習班

### 8.2 防串錯

所有確認訊息都顯示補習班名稱，避免在錯誤的租戶下操作。

---

## 九、Firestore Collections

| Collection | Document ID | 用途 |
|-----------|-------------|------|
| bot_user_bindings | {telegram_user_id} | 使用者綁定關係 |
| bot_pending_actions | auto | 待確認的寫入操作 |
| bot_tenant_cache | {tenant_id} | 租戶資料快取 |
| bot_operation_logs | auto | 操作審計日誌 |
| bot_bind_codes | {code} | 綁定碼（5 分鐘過期） |

---

## 十、部署

### 10.1 新增 CI/CD

新增 `.github/workflows/deploy-bot.yml`，觸發條件：push to main 且 `apps/bot-gateway/**` 或 `packages/shared/**` 有變更。

### 10.2 Cloud Run 設定

| 項目 | 值 |
|------|---|
| 服務名稱 | cram94-bot-gateway |
| 區域 | asia-east1 |
| Port | 3300（內部），Cloud Run 映射 8080 |
| 最小實例 | 0 |
| 最大實例 | 10 |
| 記憶體 | 512MB |

### 10.3 環境變數

```
TELEGRAM_BOT_TOKEN=（從 BotFather 取得）
GEMINI_API_KEY=（從 Google AI Studio 取得）
INCLASS_URL=https://cram94-inclass-backend-1015149159553.asia-east1.run.app
MANAGE_URL=https://cram94-manage-backend-1015149159553.asia-east1.run.app
STOCK_URL=https://cram94-stock-backend-1015149159553.asia-east1.run.app
SERVICE_URL=https://cram94-bot-gateway-1015149159553.asia-east1.run.app
```

### 10.4 GCP IAM 設定

```bash
# 建立 Service Account
gcloud iam service-accounts create cram94-bot-gateway \
  --display-name="94CramBot Gateway" \
  --project=cram94-manage-system

# 給予呼叫三個後端的權限
for SVC in cram94-manage-backend cram94-inclass-backend cram94-stock-backend; do
  gcloud run services add-iam-policy-binding $SVC \
    --member="serviceAccount:cram94-bot-gateway@cram94-manage-system.iam.gserviceaccount.com" \
    --role="roles/run.invoker" \
    --region=asia-east1 \
    --project=cram94-manage-system
done
```

---

## 十一、不動的東西

- 現有 `/api/*` 路由完全不動
- 現有 middleware 完全不動
- 現有 Drizzle schema 完全不動
- 現有前端完全不動
- 94Manage 後台「生成綁定碼」按鈕列為未來擴充

---

## 十二、安全機制

| 層級 | 機制 |
|------|------|
| 1. Telegram 綁定 | Telegram User ID + 綁定碼 |
| 2. GCP IAM | 只有 Bot Gateway 能呼叫 /api/bot/* |
| 3. tenant_id 隔離 | Bot 只傳送主任已綁定的 tenant_id |
| 4. 確認機制 | 所有寫入都需主任明確確認 |
| 5. 操作日誌 | 所有操作記錄到 Firestore |
| 6. 速率限制 | 每人每分鐘 30 則 |
