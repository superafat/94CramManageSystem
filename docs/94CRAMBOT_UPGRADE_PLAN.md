# 94CramBot 升級規劃書
> 版本: v1.0 | 2026-02-25 | 姜子牙 擬
> 需求：94CramBot 從「直連 Telegram」升級為「首頁 + 登入 + 雙 Bot 訂閱管理」

---

## 一、現況 vs 目標

| 項目 | 現況 | 目標 |
|------|------|------|
| Portal 點 94CramBot | 直接跳 `t.me/cram94bot` | 進入 94CramBot 獨立首頁 |
| Bot 數量 | 1 個（管理員用） | 2 個：管理員 Bot + 家長 Bot |
| 訂閱管理 | 無 | 登入後 Dashboard 管理訂閱/用量 |
| 認證 | Firestore `/bind` 綁定碼 | 共用 94 SSO（JWT）登入 |
| 後端 | `bot-gateway`（單 webhook） | `bot-gateway` 擴充雙 webhook |

---

## 二、雙 Bot 定義

### 🏫 千里眼 — 補習班內部 Bot（`@cram94_bot`）
- **角色名**：蜂神榜L3-千里眼
- **對象**：補習班老師、班主任、管理員
- **功能**：自然語言操作三大系統（點名/繳費/庫存）
- **權限**：查詢 + 寫入（寫入需二次確認）
- **現有功能全保留**，不動

### 👨‍👩‍👧 順風耳 — 家長服務 Bot（`@Cram94_VIP_bot`）
- **角色名**：蜂神榜L3-順風耳
- **對象**：學生家長
- **功能**：
  - 📋 查看孩子出缺勤紀錄
  - 📊 查看孩子成績
  - 💰 查看繳費狀態/歷史
  - 🔔 接收即時通知（到校/離校/請假/成績更新）
  - 📅 查看課表/行事曆
- **權限**：**唯讀**，不能寫入任何資料
- **綁定方式**：補習班在 Dashboard 生成家長邀請碼 → 家長用 `/bind` 綁定孩子

---

## 三、新增項目

### 1. `apps/bot-dashboard`（新前端）
> 94CramBot 的獨立網站，類似其他 dashboard

**路由結構：**
```
/                     → 首頁 Landing Page（介紹雙 Bot 功能、定價、FAQ）
/login                → SSO 登入（共用 @94cram/shared JWT）
/dashboard            → 主控台（需登入）
/dashboard/admin-bot  → 管理員 Bot 設定（綁定碼、模組開關、用量）
/dashboard/parent-bot → 家長 Bot 設定（邀請碼、通知設定、家長列表）
/dashboard/usage      → 用量統計（AI calls、API calls、月報）
/dashboard/settings   → 全域設定（方案、Webhook、通知偏好）
```

**技術棧：**
- Next.js + Tailwind（跟其他 dashboard 一致）
- `@94cram/shared` JWT 認證
- 莫蘭迪色系（Bot 主色 `#A89BB5` 紫色調）
- Port: `3400`

### 2. `bot-gateway` 擴充（改現有後端）

**新增：**
```
src/
├── webhooks/
│   ├── telegram.ts        ← 現有（管理員 Bot）
│   └── telegram-parent.ts ← 新增（家長 Bot）
├── handlers/
│   ├── intent-router.ts   ← 現有
│   └── parent-router.ts   ← 新增（家長查詢路由）
├── modules/
│   ├── ai-engine.ts       ← 擴充家長 Bot prompt
│   └── parent-adapter.ts  ← 家長 Bot 專用邏輯
├── api/                   ← 新增：Dashboard REST API
│   ├── auth.ts            ← SSO JWT 驗證 middleware
│   ├── subscriptions.ts   ← 訂閱管理 CRUD
│   ├── bind-codes.ts      ← 綁定碼/邀請碼管理
│   ├── usage.ts           ← 用量查詢 API
│   └── parent-invites.ts  ← 家長邀請碼 CRUD
└── config.ts              ← 加入 TELEGRAM_PARENT_BOT_TOKEN
```

**config.ts 新增欄位：**
```typescript
TELEGRAM_PARENT_BOT_TOKEN: z.string().min(1),
BOT_DASHBOARD_URL: z.string().url().optional(),
```

**新 Firestore Collections：**
```
bot_parent_bindings     → 家長 Telegram ID ↔ 學生 ID 對應
bot_parent_invites      → 家長邀請碼（tenant+student+code+expiry）
bot_subscriptions       → 租戶訂閱狀態（admin_bot: active/inactive, parent_bot: active/inactive）
bot_notifications       → 通知紀錄（推播歷史）
```

### 3. Portal 修改

**修改 `apps/portal/src/app/page.tsx`：**
```diff
- url: 'https://t.me/cram94bot',
+ url: process.env.BOT_URL || 'https://cram94-bot-dashboard-1015149159553.asia-east1.run.app',
```

---

## 四、家長 Bot 意圖清單

| Intent | 說明 | 參數 |
|--------|------|------|
| `parent.attendance` | 查孩子出缺勤 | child_name?, date?, period? |
| `parent.grades` | 查孩子成績 | child_name?, subject?, exam? |
| `parent.payments` | 查繳費狀態 | child_name?, month? |
| `parent.schedule` | 查課表 | child_name?, day? |
| `parent.info` | 查孩子基本資料 | child_name? |
| `parent.help` | 使用說明 | — |

---

## 五、訂閱方案（bot-dashboard 顯示）

| 方案 | 管理員 Bot | 家長 Bot | AI Calls/月 | 價格 |
|------|-----------|---------|-------------|------|
| 免費 | ✅ | ❌ | 100 | NT$0 |
| 基礎 | ✅ | ✅（50 家長） | 500 | NT$299/月 |
| 專業 | ✅ | ✅（200 家長） | 2000 | NT$599/月 |
| 企業 | ✅ | ✅（無上限） | 無上限 | NT$999/月 |

---

## 六、部署

| App | Cloud Run Name | Port | Docker |
|-----|---------------|------|--------|
| bot-dashboard | `cram94-bot-dashboard` | 3400 | 新建 Dockerfile |
| bot-gateway | `cram94-bot-gateway` | 3300 | 現有（擴充） |

**CI/CD：** 新增 `.github/workflows/deploy-bot.yml`
- Path filter: `apps/bot-gateway/**` 或 `apps/bot-dashboard/**`

---

## 七、執行階段

### Phase 1：bot-dashboard 首頁 + 登入（2 個 sub-task）
1. 建立 `apps/bot-dashboard` 腳手架（Next.js + Tailwind + 莫蘭迪色）
2. Landing Page（介紹雙 Bot、定價、FAQ）+ SSO 登入頁

### Phase 2：Dashboard 管理介面（3 個 sub-task）
1. 管理員 Bot 頁面（綁定碼管理、模組開關、用量圖表）
2. 家長 Bot 頁面（邀請碼管理、家長列表、通知設定）
3. 用量統計頁面 + 設定頁面

### Phase 3：bot-gateway 擴充（3 個 sub-task）
1. Dashboard REST API（auth + subscriptions + bind-codes + usage）
2. 家長 Bot webhook + intent router + AI prompt
3. 家長通知推播系統（到校/離校事件 → 推 Telegram）

### Phase 4：Portal 串接 + 部署（2 個 sub-task）
1. Portal 修改 Bot 連結 → bot-dashboard URL
2. Docker + CI/CD + Cloud Run 部署

### Phase 5：家長 Bot 與三大系統串接（2 個 sub-task）
1. manage-backend / inclass-backend 新增 `/api/parent-ext/*` 家長查詢 API
2. inclass-backend 出席事件觸發 → 推播通知家長 Bot

---

## 八、費用影響

| 項目 | 新增費用 |
|------|---------|
| Cloud Run（bot-dashboard） | 免費 tier 內（靜態站低流量） |
| Firestore（新 collections） | 免費 tier 內 |
| 新 Telegram Bot Token | 免費（@BotFather 建立） |
| Gemini API（家長 Bot） | 共用現有額度 |
| **月預算影響** | **NT$0 新增**（維持 NT$300 內） |

---

## 九、風險

| 風險 | 等級 | 對策 |
|------|------|------|
| Gemini API 用量翻倍（雙 Bot） | 中 | 家長 Bot 查詢可走直連 API 不經 AI |
| 家長 Bot 被濫用（大量查詢） | 低 | Rate limit + 訂閱限制 |
| 新 Telegram Bot 需 @BotFather 建立 | 低 | 請老闆建立或授權 |

---

## 十、不做的事

- ❌ 不重寫現有管理員 Bot 邏輯（全保留）
- ❌ 不遷移 Firestore 到 Cloud SQL（Bot 資料適合 NoSQL）
- ❌ 不做 LINE Bot 整合（94LineBot 獨立專案）
- ❌ 家長 Bot 不支援寫入操作（純唯讀）

---

---

## 十一、技術細節

### 1. 資料模型

#### Firestore Collections

```typescript
// bot_subscriptions - 租戶訂閱狀態
interface BotSubscription {
  tenantId: string;
  adminBot: {
    active: boolean;
    plan: 'free' | 'basic' | 'pro' | 'enterprise';
    aiCallsUsed: number;
    aiCallsLimit: number;
    createdAt: Date;
    updatedAt: Date;
  };
  parentBot: {
    active: boolean;
    plan: 'free' | 'basic' | 'pro' | 'enterprise';
    parentCount: number;
    parentLimit: number;
    aiCallsUsed: number;
    aiCallsLimit: number;
    created    updatedAt: Date;
  };
}

// bot_parent_bindings - 家長At: Date;
綁定
interface ParentBinding {
  id: string;
  tenantId: string;
  studentId: string;
  parentTelegramId: string;
  parentName: string;
  parentPhone?: string;
  boundAt: Date;
  active: boolean;
}

// bot_parent_invites - 家長邀請碼
interface ParentInvite {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  inviteCode: string; // 6位數
  expiresAt: Date;
  usedAt?: Date;
  usedByTelegramId?: string;
  createdBy: string; // admin user id
  createdAt: Date;
}

// bot_notifications - 通知紀錄
interface BotNotification {
  id: string;
  tenantId: string;
  type: 'attendance' | 'grades' | 'payments' | 'schedule' | 'system';
  title: string;
  message: string;
  telegramChatId: string;
  sentAt: Date;
  delivered: boolean;
  error?: string;
}

// bot_bind_codes - 管理員 Bot 綁定碼（現有結構擴充）
interface BindCode {
  code: string;
  tenantId: string;
  role: 'admin' | 'teacher';
  userId: string;
  createdAt: Date;
  usedAt?: Date;
}
```

### 2. API 閘道設計

```
                        ┌─────────────────────┐
                        │   Telegram Users    │
                        └──────────┬──────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
           ┌────────▼────────┐          ┌────────▼────────┐
           │ 千里眼 Webhook  │          │ 順風耳 Webhook  │
           │ /webhook/telegram│         │/webhook/telegram-parent│
           └────────┬────────┘          └────────┬────────┘
                    │                             │
           ┌────────▼────────────────────────────▼────────┐
           │              bot-gateway                  │
           │  ┌─────────────────────────────────────┐   │
           │  │         AI Engine (ai-engine.ts)   │   │
           │  │  - 千里眼 Prompt (Chapter 6)       │   │
           │  │  - 順風耳 Prompt (Chapter 6)       │   │
           │  └─────────────────────────────────────┘   │
           │         │                   │              │
           │  ┌──────▼──────┐   ┌───────▼──────┐       │
           │  │ Intent Router│   │ Parent Router│       │
           │  │ (管理員)     │   │ (家長查詢)   │       │
           │  └──────┬──────┘   └───────┬──────┘       │
           │         │                   │              │
           └─────────┼───────────────────┼──────────────┘
                     │                   │
           ┌─────────▼─────┐   ┌────────▼────────┐
           │  manage-backend│   │  inclass-backend│
           │  (繳費/庫存)  │   │  (點名/成績)   │
           └───────────────┘   └────────────────┘
```

### 3. 訊息流程

#### 千里眼（管理員）
```
User → Telegram → Webhook → Intent Router → AI Engine (千里眼 Prompt)
    → Execute Intent →三大系統 API → Response → Telegram
```

#### 順風耳（家長）
```
User → Telegram → Webhook → Parent Router → AI Engine (順風耳 Prompt)
    → 查詢意圖分類 → Parent API → Response → Telegram
    （唯讀：只能查詢，不能寫入）
```

### 4. 安全設計

| 項目 | 實作 |
|------|------|
| 身份驗證 | JWT Token（共用 94 SSO） |
| Telegram 驗證 | HMAC-SHA256 簽名驗證 |
| API 授權 | Bearer Token + Tenant ID 檢查 |
| Rate Limiting | 每分鐘 20 則訊息/用戶 |
| 敏感資料 | 家長只能查自己孩子的資料 |
| 寫入限制 | 順風耳完全唯讀 |

---

## 十二、API 規格

### A. Dashboard API（需要 JWT）

#### Auth
| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/auth/login` | SSO 登入（共用現有） |
| POST | `/api/auth/verify` | 驗證 JWT Token |

#### Subscriptions
| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/subscriptions` | 取得租戶訂閱狀態 |
| PUT | `/api/subscriptions` | 更新訂閱方案 |

#### Bind Codes
| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/bind-codes` | 取得綁定碼列表 |
| POST | `/api/bind-codes` | 產生新綁定碼 |
| DELETE | `/api/bind-codes/:code` | 刪除綁定碼 |

#### Parent Invites
| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/parent-invites` | 取得家長邀請碼列表 |
| POST | `/api/parent-invites` | 產生家長邀請碼 |
| DELETE | `/api/parent-invites/:id` | 刪除邀請碼 |

#### Parent Bindings
| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/parent-bindings` | 取得家長綁定列表 |
| DELETE | `/api/parent-bindings/:id` | 解除綁定 |

#### Usage
| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/usage` | 取得 AI 用量統計 |
| GET | `/api/usage/daily` | 每日用量 |
| GET | `/api/usage/monthly` | 每月用量 |

### B. Parent 查詢 API（bot-gateway 內部）

| Method | Path | 說明 | 權限 |
|--------|------|------|------|
| GET | `/api/parent/attendance` | 查孩子出缺勤 | 綁定家長 |
| GET | `/api/parent/grades` | 查孩子成績 | 綁定家長 |
| GET | `/api/parent/payments` | 查繳費狀態 | 綁定家長 |
| GET | `/api/parent/schedule` | 查課表 | 綁定家長 |
| GET | `/api/parent/children` | 查綁定孩子列表 | 綁定家長 |

### C. Webhook Endpoints

| Bot | Path | Method | 說明 |
|-----|------|--------|------|
| 千里眼 | `/webhook/telegram` | POST | 管理員 Bot 更新 |
| 順風耳 | `/webhook/telegram-parent` | POST | 家長 Bot 更新 |

### D. Event Webhooks（推播用）

| Event | 觸發來源 | 推播目標 |
|-------|---------|---------|
| `student.checkin` | inclass-backend | 綁定家長 |
| `student.checkout` | inclass-backend | 綁定家長 |
| `student.absent` | inclass-backend | 綁定家長 |
| `grade.updated` | inclass-backend | 綁定家長 |
| `payment.overdue` | manage-backend | 綁定家長 |

---

## 十三、測試計畫

### Unit Tests
- Intent Router 意圖分類準確率
- Parent Router 資料隔離
- API 授權檢查

### Integration Tests
- 千里眼 → 三大系統 API 串接
- 順風耳 → Parent API 串接
- Webhook → Telegram 訊息傳遞

### E2E Tests
- 管理員完整流程：登入 → 產生邀請碼 → 查看用量
- 家長完整流程：收到邀請 → /bind → 查詢出缺勤 → 收到推播

---

## 十四、里程碑

| 階段 | 完成條件 | 預估天數 |
|------|---------|---------|
| M1 | Phase 1 完成（bot-dashboard 首頁） | 1 天 |
| M2 | Phase 2 完成（Dashboard 管理介面） | 2 天 |
| M3 | Phase 3 完成（bot-gateway 擴充） | 2 天 |
| M4 | Phase 4 完成（部署上線） | 1 天 |
| M5 | Phase 5 完成（家長 Bot 完整功能） | 2 天 |
| **總計** | | **8 天** |

---

**等老闆確認後開始執行。** 🎣
