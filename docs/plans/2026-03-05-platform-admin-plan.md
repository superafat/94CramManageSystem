# 94Platform 系統總後台 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 94cram.com 建立系統總後台（/admin），集中管理所有訂閱補習班、財務收支、AI 配額、知識庫、安全監控，並將散落各子系統的總管功能統一搬移。

**Architecture:** Portal app（Next.js）新增 /admin 路由群組作為前端。後端新建 apps/platform-backend 作為 Hono sub-router，掛載到 manage-backend 的 /api/platform/*。所有路由統一 SUPERADMIN 權限。Schema 新增 platform_ 前綴表。

**Tech Stack:** Next.js 15 + Tailwind CSS（莫蘭迪色系）、Hono + Drizzle ORM + PostgreSQL、jose JWT、recharts 圖表

---

## 上下文（給實作者）

### 專案結構
- Monorepo: pnpm workspace
- Portal 前端: `apps/portal/`（Next.js, port 3300）
- 管理後端: `apps/manage-backend/`（Hono, port 3100）
- 共用 schema: `packages/shared/src/db/schema/`
- 共用 auth: `packages/shared/src/auth/jwt.ts`

### 現有模式
- 後端路由: Hono + zod validator，回傳用 `success(c, data)` / `badRequest(c, msg)` 等 helper
- RBAC: `requireRole(Role.SUPERADMIN)` 或 `requirePermission(Permission.X)`
- DB: Drizzle ORM，raw SQL 用 `db.execute(sql\`...\`)`
- 前端: Next.js App Router, Tailwind, fetch API，demo 模式用 `lib/demo-data.ts`
- 莫蘭迪色系: bg `#F5F0EB`, green `#8FA895`, amber `#C4956A`, red `#B5706E`, blue `#6B9BD2`

### 關鍵檔案
- `apps/manage-backend/src/app.ts` — 路由掛載入口
- `apps/manage-backend/src/middleware/rbac.ts` — Role/Permission enum + middleware
- `apps/manage-backend/src/middleware/auth.ts` — JWT 驗證 middleware
- `apps/manage-backend/src/routes/headquarters.ts` — 現有 SUPERADMIN 路由（帳號審核、分校管理）
- `apps/manage-backend/src/routes/admin/tenants.ts` — 現有租戶/試用 API（權限需收緊）
- `apps/manage-backend/src/routes/admin/analytics.ts` — 現有全站分析（已 SUPERADMIN）
- `apps/manage-backend/src/routes/admin/ai-providers.ts` — 現有 AI 管理
- `packages/shared/src/db/schema/common.ts` — tenants/users/branches 表定義
- `apps/portal/next.config.ts` — 目前只有 `output: 'standalone'`
- `apps/portal/src/app/layout.tsx` — Portal 根 layout

---

## Task 1: Schema — 新增 platform_ 表 + tenants 增強

**Files:**
- Modify: `packages/shared/src/db/schema/common.ts`

**做什麼：**

在 `common.ts` 的 `manageBotVisits` 表之後，新增以下表：

```typescript
// ===== Platform Admin =====

export const platformPlanPricing = pgTable('platform_plan_pricing', {
  id: uuid('id').defaultRandom().primaryKey(),
  planKey: varchar('plan_key', { length: 20 }).notNull().unique(), // free, basic, pro, enterprise
  name: varchar('name', { length: 50 }).notNull(), // 免費版, 基本版, 專業版, 企業版
  monthlyPrice: integer('monthly_price').notNull().default(0), // 月費（新台幣）
  features: jsonb('features').default({}), // { maxStudents, maxAiCalls, ... }
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const platformPayments = pgTable('platform_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  amount: integer('amount').notNull(), // 金額（新台幣）
  paidAt: timestamp('paid_at', { mode: 'date' }).notNull(),
  method: varchar('method', { length: 20 }).notNull().default('transfer'), // transfer, cash, other
  invoiceNo: varchar('invoice_no', { length: 50 }),
  periodStart: timestamp('period_start', { mode: 'date' }),
  periodEnd: timestamp('period_end', { mode: 'date' }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_platform_payments_tenant').on(table.tenantId),
  paidAtIdx: index('idx_platform_payments_paid_at').on(table.paidAt),
}))

export const platformCosts = pgTable('platform_costs', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: varchar('category', { length: 20 }).notNull(), // infra, ai, domain, labor, other
  subcategory: varchar('subcategory', { length: 50 }), // cloud-run, cloud-sql, gemini, claude...
  amount: integer('amount').notNull(), // 金額（新台幣）
  date: timestamp('date', { mode: 'date' }).notNull(),
  description: text('description'),
  isRecurring: boolean('is_recurring').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  dateIdx: index('idx_platform_costs_date').on(table.date),
  categoryIdx: index('idx_platform_costs_category').on(table.category),
}))

export const platformSettings = pgTable('platform_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').default({}),
  updatedAt: timestamp('updated_at').defaultNow(),
})
```

在 `tenants` 表新增欄位（在 `trialNotes` 之後、`createdAt` 之前）：

```typescript
  plan: varchar('plan', { length: 20 }).default('free'),
  deletedAt: timestamp('deleted_at'),
  suspendedReason: text('suspended_reason'),
  lastPaymentAt: timestamp('last_payment_at'),
  paymentDueAt: timestamp('payment_due_at'),
```

**驗證：** `pnpm --filter @94cram/shared typecheck`

---

## Task 2: Backend — platform-backend 基礎架構 + 認證

**Files:**
- Create: `apps/platform-backend/src/index.ts` — 匯出 platformRoutes
- Create: `apps/platform-backend/src/routes/auth.ts` — 登入/登出/me
- Create: `apps/platform-backend/src/routes/dashboard.ts` — 總覽 API
- Create: `apps/platform-backend/package.json`
- Create: `apps/platform-backend/tsconfig.json`
- Modify: `apps/manage-backend/src/app.ts` — 掛載 platformRoutes

**做什麼：**

### package.json
```json
{
  "name": "@94cram/platform-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@94cram/shared": "workspace:*",
    "hono": "^4.0.0",
    "@hono/zod-validator": "^0.4.0",
    "zod": "^3.23.0",
    "drizzle-orm": "^0.38.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0"
  }
}
```

### tsconfig.json
參考 manage-backend 的 tsconfig，設定 paths alias `@94cram/shared`。

### index.ts
```typescript
import { Hono } from 'hono'
import { authMiddleware } from '../../manage-backend/src/middleware/auth'
import { requireRole, Role } from '../../manage-backend/src/middleware/rbac'
import type { RBACVariables } from '../../manage-backend/src/middleware/rbac'
import { platformAuthRoutes } from './routes/auth'
import { platformDashboardRoutes } from './routes/dashboard'
// ... 後續 task 會加入更多 routes

export const platformRoutes = new Hono<{ Variables: RBACVariables }>()

// 認證路由（login 不需要 auth middleware）
platformRoutes.route('/auth', platformAuthRoutes)

// 以下路由全部需要 SUPERADMIN
platformRoutes.use('*', authMiddleware)
platformRoutes.use('*', requireRole(Role.SUPERADMIN))

platformRoutes.route('/dashboard', platformDashboardRoutes)
```

**注意**：由於 platform-backend 是掛載在 manage-backend 的 sub-router，它共用 manage-backend 的 DB 連線、middleware、utils。import 路徑要用相對路徑指向 manage-backend 的模組。或者更乾淨的做法：直接在 `apps/manage-backend/src/routes/` 下建立 `platform/` 資料夾，作為 platform 路由群組，這樣可以直接 import manage-backend 的所有工具。

**推薦做法**：在 `apps/manage-backend/src/routes/platform/` 建立路由，而非獨立 app。這樣共用 DB、middleware、utils 最簡單。`apps/platform-backend` 僅作為未來獨立部署的預留。

### routes/auth.ts
```typescript
// POST /auth/login — SUPERADMIN 專屬登入
// 驗證 email + password → 檢查 role = 'superadmin' → 簽發 JWT
// POST /auth/logout — 清除 cookie
// GET /auth/me — 回傳目前使用者資訊（需 auth middleware）
```

### routes/dashboard.ts
```typescript
// GET / — 總覽數據
// 回傳：租戶統計（使用中/試用中/已停用）、本月收入、本月支出、待處理事項
```

### manage-backend app.ts 掛載
在 `app.route('/api/admin/headquarters', headquartersRoutes)` 之後加入：
```typescript
import { platformRoutes } from './routes/platform'
app.route('/api/platform', platformRoutes)
```

**驗證：** `pnpm --filter @94cram/manage-backend typecheck`

---

## Task 3: Backend — 補習班管理 API

**Files:**
- Create: `apps/manage-backend/src/routes/platform/tenants.ts`
- Modify: `apps/manage-backend/src/routes/platform/index.ts` — 加入路由

**做什麼：**

整合現有 `headquarters.ts` 的分校管理 + `admin/tenants.ts` 的租戶查詢，建立完整 CRUD：

```typescript
// GET    /tenants          — 租戶列表（支援 ?status, ?plan, ?search 篩選 + 分頁）
// POST   /tenants          — 新增租戶 + 初始管理員（整合 headquarters POST /branches）
// GET    /tenants/:id      — 租戶詳情 + 統計（學生數、使用者數、AI 用量、Bot 綁定數）
// PUT    /tenants/:id      — 編輯租戶（name, slug, plan, status, suspendedReason）
// DELETE /tenants/:id      — 軟刪除（設 deleted_at）
// POST   /tenants/:id/suspend   — 停用租戶
// POST   /tenants/:id/activate  — 啟用租戶
// POST   /tenants/:id/remind    — 催繳提醒（整合 headquarters POST /branches/:id/remind）
```

每個端點都要有 zod 驗證。

**驗證：** `pnpm --filter @94cram/manage-backend typecheck`

---

## Task 4: Backend — 帳號審核 + 試用管理 API

**Files:**
- Create: `apps/manage-backend/src/routes/platform/accounts.ts`
- Create: `apps/manage-backend/src/routes/platform/trials.ts`
- Modify: `apps/manage-backend/src/routes/platform/index.ts`

**做什麼：**

### accounts.ts
整合現有 `headquarters.ts` 的帳號管理：
```typescript
// GET    /accounts              — 跨租戶帳號列表（支援 ?status, ?tenantId 篩選）
// POST   /accounts/:id/approve  — 通過帳號
// POST   /accounts/:id/reject   — 駁回帳號（body: { reason }）
```

### trials.ts
整合現有 `admin/tenants.ts` 的試用管理：
```typescript
// GET    /trials                    — 試用列表（trial_status != 'none'）
// GET    /trials/:tenantId          — 試用詳情
// POST   /trials/:tenantId/approve  — 通過試用（設 plan='pro', 30天）
// POST   /trials/:tenantId/reject   — 駁回
// POST   /trials/:tenantId/revoke   — 撤銷
```

**驗證：** `pnpm --filter @94cram/manage-backend typecheck`

---

## Task 5: Backend — 財務管理 API

**Files:**
- Create: `apps/manage-backend/src/routes/platform/finance.ts`
- Modify: `apps/manage-backend/src/routes/platform/index.ts`

**做什麼：**

```typescript
// ===== 財務總覽 =====
// GET /finance/overview — 本月收入/支出/毛利 + 近 12 月趨勢

// ===== 方案定價 =====
// GET    /finance/pricing      — 方案定價列表
// PUT    /finance/pricing/:id  — 修改定價

// ===== 收款紀錄 =====
// GET    /finance/payments          — 收款列表（支援 ?tenantId, ?startDate, ?endDate 篩選 + 分頁）
// POST   /finance/payments          — 新增收款
// PUT    /finance/payments/:id      — 修改收款
// DELETE /finance/payments/:id      — 刪除收款

// ===== 支出紀錄 =====
// GET    /finance/costs             — 支出列表（支援 ?category, ?startDate, ?endDate + 分頁）
// POST   /finance/costs             — 新增支出
// PUT    /finance/costs/:id         — 修改支出
// DELETE /finance/costs/:id         — 刪除支出

// ===== 財務報表 =====
// GET /finance/reports/pnl          — 損益表（?period=monthly|quarterly）
// GET /finance/reports/mrr          — 每月固定收入趨勢
// GET /finance/reports/receivables  — 應收帳款（帳齡分析）
// GET /finance/reports/export       — 匯出 CSV
```

所有金額欄位用整數（新台幣元），不用浮點數。

**驗證：** `pnpm --filter @94cram/manage-backend typecheck`

---

## Task 6: Backend — 知識庫 + AI 管理 + 分析 + 安全 + 設定 API

**Files:**
- Create: `apps/manage-backend/src/routes/platform/knowledge.ts`
- Create: `apps/manage-backend/src/routes/platform/ai.ts`
- Create: `apps/manage-backend/src/routes/platform/analytics.ts`
- Create: `apps/manage-backend/src/routes/platform/security.ts`
- Create: `apps/manage-backend/src/routes/platform/settings.ts`
- Modify: `apps/manage-backend/src/routes/platform/index.ts`

**做什麼：**

### knowledge.ts
```typescript
// GET    /knowledge          — 全域知識列表
// POST   /knowledge          — 新增知識條目（title, content, category, scope: 'global'|'tenant'）
// PUT    /knowledge/:id      — 編輯
// DELETE /knowledge/:id      — 刪除
```

### ai.ts
整合現有 `ai-providers.ts` 的邏輯：
```typescript
// GET  /ai/providers                 — AI 供應商狀態
// GET  /ai/usage                     — 全平台 AI 用量彙總
// GET  /ai/usage/:tenantId           — 單一租戶 AI 用量
// POST /ai/quota/limits              — 設定速率/成本限制
// GET  /ai/subscriptions             — 全部租戶 Bot 訂閱列表
// PUT  /ai/subscriptions/:tenantId   — 修改租戶方案與配額
```

### analytics.ts
包裝現有 `admin/analytics.ts` 的邏輯：
```typescript
// GET /analytics/overview    — 今日/本週/本月 PV+UV + 30 天趨勢
// GET /analytics/pages       — 頁面排行 Top 20
// GET /analytics/referrers   — 流量來源 Top 10
// GET /analytics/bots        — 爬蟲統計
```

### security.ts
```typescript
// GET    /security/failed-logins    — 全平台失敗登入紀錄
// GET    /security/blocked-ips      — 封鎖 IP 列表
// DELETE /security/blocked-ips/:ip  — 解除封鎖
```

### settings.ts
```typescript
// GET /settings   — 全域設定列表
// PUT /settings   — 更新設定（body: { key, value }）
// GET /health     — 各 service 健康狀態
```

**驗證：** `pnpm --filter @94cram/manage-backend typecheck`

---

## Task 7: Frontend — Portal admin 基礎架構（Layout + Login + Middleware）

**Files:**
- Create: `apps/portal/src/app/admin/layout.tsx` — 總後台 layout（側邊欄 + 頂部列）
- Create: `apps/portal/src/app/admin/login/page.tsx` — 登入頁
- Create: `apps/portal/src/components/admin/Sidebar.tsx` — 側邊欄元件
- Create: `apps/portal/src/components/admin/AdminHeader.tsx` — 頂部列元件
- Create: `apps/portal/src/lib/auth.ts` — JWT 工具（cookie 存取、驗證）
- Create: `apps/portal/src/lib/api.ts` — API client（fetch wrapper + auth header）
- Create: `apps/portal/src/middleware.ts` — Next.js middleware（/admin/* 路由保護）
- Modify: `apps/portal/next.config.ts` — 加 rewrites 代理 /api/platform/*
- Modify: `apps/portal/package.json` — 加 jose dependency

**做什麼：**

### next.config.ts
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/platform/:path*',
        destination: `${process.env.MANAGE_BACKEND_URL || 'http://localhost:3100'}/api/platform/:path*`,
      },
    ]
  },
}
```

### middleware.ts
```typescript
// 檢查 /admin/* 路徑（排除 /admin/login）
// 從 cookie 讀取 JWT → 驗證 → 檢查 role = 'superadmin'
// 無效 → redirect 到 /admin/login
```

### login/page.tsx
- 簡潔登入表單：email + 密碼 + 「登入總後台」按鈕
- 莫蘭迪色系，置中卡片式設計
- 呼叫 `POST /api/platform/auth/login`
- 成功 → 存 cookie → router.push('/admin')
- 失敗 → 顯示錯誤訊息

### layout.tsx
```
左側邊欄（固定寬度 240px）
  📊 總覽
  🏫 補習班管理
  👤 帳號審核
  🎫 試用管理
  💰 財務管理（可展開子選單）
    ├─ 收入總覽
    ├─ 收款紀錄
    ├─ 支出管理
    └─ 財務報表
  📚 全域知識庫
  🤖 AI 與 Bot 管理
  📈 數據分析
  🔒 安全監控
  ⚙️ 平台設定

右側內容區
  頂部列：頁面標題 + 使用者名稱 + 登出按鈕
  內容：{children}
```

**驗證：** `pnpm --filter @94cram/portal typecheck`

---

## Task 8: Frontend — 總覽儀表板

**Files:**
- Create: `apps/portal/src/app/admin/page.tsx`

**做什麼：**

總覽頁面，顯示：
- 4 張統計卡片：補習班總數（使用中/試用中/已停用）、本月收入、本月支出、本月毛利
- 待處理事項區塊：待審核帳號數、試用申請數、逾期未付數（點擊可跳轉對應頁面）
- 近 7 天趨勢小圖表（用 recharts AreaChart）

呼叫 `GET /api/platform/dashboard`。

所有文字用正體中文白話文。

**驗證：** `pnpm --filter @94cram/portal typecheck`

---

## Task 9: Frontend — 補習班管理頁面

**Files:**
- Create: `apps/portal/src/app/admin/tenants/page.tsx`
- Create: `apps/portal/src/app/admin/tenants/[id]/page.tsx`

**做什麼：**

### 列表頁 (`/admin/tenants`)
- 搜尋欄 + 篩選（方案、狀態）
- 表格：名稱、方案（彩色 tag）、狀態、學生數、使用者數、建立日期、操作
- 操作按鈕：編輯、停用/啟用、催繳、刪除
- 新增按鈕 → Modal（名稱、聯絡人、email、地址、電話、加盟費）
- 編輯 Modal（名稱、slug、方案下拉、狀態）

### 詳情頁 (`/admin/tenants/[id]`)
- 基本資訊卡片（名稱、slug、方案、狀態、建立日期）
- 統計卡片：學生數、使用者數、AI 用量、Bot 綁定數
- 付款紀錄表格（該租戶的 platform_payments）
- 催繳/停用/啟用 按鈕

**驗證：** `pnpm --filter @94cram/portal typecheck`

---

## Task 10: Frontend — 帳號審核 + 試用管理頁面

**Files:**
- Create: `apps/portal/src/app/admin/accounts/page.tsx`
- Create: `apps/portal/src/app/admin/trials/page.tsx`

**做什麼：**

### 帳號審核 (`/admin/accounts`)
- Tab 切換：待審核 / 已通過 / 已駁回
- 表格：姓名、email、角色、所屬補習班、申請日期
- 操作：通過（一鍵）、駁回（需填原因的 Modal）

### 試用管理 (`/admin/trials`)
- 表格：補習班名稱、試用狀態（tag）、申請日期、到期日、操作
- 操作：通過（設定 30 天專業版）、駁回（需填原因）、撤銷

**驗證：** `pnpm --filter @94cram/portal typecheck`

---

## Task 11: Frontend — 財務管理頁面

**Files:**
- Create: `apps/portal/src/app/admin/finance/layout.tsx` — 財務子選單 layout
- Create: `apps/portal/src/app/admin/finance/page.tsx` — 收入總覽（redirect 或預設頁）
- Create: `apps/portal/src/app/admin/finance/subscriptions/page.tsx` — 收入總覽 + 收款紀錄
- Create: `apps/portal/src/app/admin/finance/costs/page.tsx` — 支出管理
- Create: `apps/portal/src/app/admin/finance/reports/page.tsx` — 財務報表

**做什麼：**

### 收入總覽 (`/admin/finance/subscriptions`)
- 方案定價卡片（免費/基本/專業/企業各一張，可編輯月費）
- 租戶訂閱狀態表格：補習班、方案、月費、付款狀態、到期日
- 逾期警示區塊（紅色高亮）
- 收款紀錄表格（CRUD）+ 新增收款 Modal
- 匯出 CSV 按鈕

### 支出管理 (`/admin/finance/costs`)
- 月度支出彙總卡片（按類別：基礎設施、AI、域名、人工、其他）
- 支出紀錄表格（CRUD）+ 新增支出 Modal（類別下拉、子類別、金額、日期、說明、是否固定支出）

### 財務報表 (`/admin/finance/reports`)
- Tab 切換：損益表 / 收入趨勢 / 應收帳款
- 損益表：收入項目 vs 支出項目，月度/季度切換（recharts BarChart）
- 收入趨勢：近 12 月折線圖（新增/流失/淨額）
- 應收帳款：帳齡分析表格（30/60/90天分組）

**驗證：** `pnpm --filter @94cram/portal typecheck`

---

## Task 12: Frontend — 知識庫 + AI 管理 + 分析 + 安全 + 設定頁面

**Files:**
- Create: `apps/portal/src/app/admin/knowledge/page.tsx`
- Create: `apps/portal/src/app/admin/ai/page.tsx`
- Create: `apps/portal/src/app/admin/analytics/page.tsx`
- Create: `apps/portal/src/app/admin/security/page.tsx`
- Create: `apps/portal/src/app/admin/settings/page.tsx`

**做什麼：**

### 全域知識庫 (`/admin/knowledge`)
- 知識條目列表（標題、分類、範圍全域/租戶、建立日期）
- CRUD Modal（標題、內容 textarea、分類 tag、範圍下拉）

### AI 與 Bot 管理 (`/admin/ai`)
- AI 供應商狀態卡片（Gemini/Claude/MiniMax 各一張，顯示啟用/停用、可用性）
- 全平台用量統計：今日/本週/本月呼叫次數（recharts）
- 租戶配額表格：補習班、方案、AI 上限、Bot 上限、已用量、操作（修改配額）
- 修改配額 Modal（方案下拉、AI 呼叫上限、Bot 綁定上限）

### 數據分析 (`/admin/analytics`)
- 搬移 manage-dashboard 的 analytics 頁面邏輯
- 流量總覽卡片（今日/本週/本月 PV+UV）
- 30 天趨勢圖（recharts AreaChart）
- 頁面排行 Top 20 表格
- 流量來源 Top 10
- 爬蟲統計

### 安全監控 (`/admin/security`)
- 失敗登入紀錄表格（IP、時間、嘗試帳號、來源系統）
- 封鎖 IP 列表（IP、封鎖時間、原因、解鎖按鈕）

### 平台設定 (`/admin/settings`)
- 設定表單：預設方案、試用天數、全平台公告
- 服務健康狀態（各 Cloud Run service 的健康檢查結果，綠/紅燈號）

**驗證：** `pnpm --filter @94cram/portal typecheck`

---

## Task 13: Demo 數據

**Files:**
- Create: `apps/portal/src/lib/demo-data.ts`

**做什麼：**

建立 demo 數據和 handler，支援不連 DB 的開發模式。

包含：
- `DEMO_TENANTS`: 5 間補習班（不同方案、狀態）
- `DEMO_ACCOUNTS`: 8 個帳號（不同審核狀態）
- `DEMO_TRIALS`: 3 個試用申請
- `DEMO_PAYMENTS`: 10 筆收款紀錄
- `DEMO_COSTS`: 8 筆支出紀錄
- `DEMO_PLAN_PRICING`: 4 個方案定價
- `DEMO_KNOWLEDGE`: 5 個知識條目
- `DEMO_AI_PROVIDERS`: 3 個 AI 供應商狀態
- `DEMO_AI_USAGE`: 按租戶的用量數據
- `getDemoResponse(method, path, searchParams, body)`: 路由分發函式

Portal 的 `api/[...path]/route.ts` catch-all handler 檢查 demo token → 回傳 demo 數據。

**驗證：** `pnpm --filter @94cram/portal typecheck`

---

## Task 14: 權限收緊 + manage-dashboard 搬移清理

**Files:**
- Modify: `apps/manage-backend/src/routes/admin/tenants.ts` — 權限從 ADMIN 改為 SUPERADMIN
- Modify: `apps/manage-dashboard/src/app/dashboard/trials/page.tsx` — 刪除或替換為跳轉提示
- Modify: `apps/manage-dashboard/src/app/dashboard/analytics/page.tsx` — 刪除或替換為跳轉提示
- Modify: manage-dashboard sidebar — 移除 trials、analytics 連結

**做什麼：**

### 後端權限收緊
1. `admin/tenants.ts`: 所有路由的 `requireRole(Role.ADMIN)` 改為 `requireRole(Role.SUPERADMIN)`
2. 確認 `headquarters.ts` 已經是 SUPERADMIN（不動）
3. 確認 `analytics.ts` 已經是 SUPERADMIN（不動）

### 前端清理
1. `trials/page.tsx`: 內容改為提示文字「試用管理已搬移至總後台」+ 連結到 `https://94cram.com/admin/trials`
2. `analytics/page.tsx`: 內容改為提示文字「數據分析已搬移至總後台」+ 連結到 `https://94cram.com/admin/analytics`
3. manage-dashboard 側邊欄：移除「試用管理」和「數據分析」的導航項目（保留條件：`role === 'superadmin'` 時顯示跳轉連結）

**驗證：**
- `pnpm --filter @94cram/manage-backend typecheck`
- `pnpm --filter @94cram/manage-dashboard typecheck`

---

## Task 15: Typecheck 全系統驗證

**做什麼：**

```bash
pnpm --filter @94cram/shared typecheck
pnpm --filter @94cram/manage-backend typecheck
pnpm --filter @94cram/manage-dashboard typecheck
pnpm --filter @94cram/portal typecheck
```

全部必須零錯誤。

---

## 關鍵設計決策

1. **路由放在 manage-backend 內** — `src/routes/platform/` 資料夾，共用 DB、middleware、utils，避免跨 app import 問題
2. **Platform routes 統一 SUPERADMIN** — 頂層 `use('*', requireRole(SUPERADMIN))`，不需每個端點重複
3. **財務用手動入帳** — 目前規模不需要自動扣款/金流串接，手動登記收款即可
4. **搬移頁面不直接刪除** — 改為跳轉提示，讓使用者知道功能搬到哪裡了
5. **Demo 模式** — Portal 也支援 demo，方便開發和展示
6. **介面全中文白話文** — 所有 UI 文字、錯誤訊息、按鈕文字都用正體中文
