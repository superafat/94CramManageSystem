# 94CramBot v2/v3 實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在現有 Bot Gateway 基礎上新增 Bot Dashboard、enabled_modules 模組控制、94CramVIPBot 家長端、推播通知 API，補齊 v1 缺漏端點，完成 94CramBot 完整服務。

**Architecture:** Bot Gateway 同時處理管理端（@cram94bot）和家長端（@cram94VIPbot）兩個 Telegram Bot。Bot Dashboard 是獨立 Next.js 應用，透過 rewrites 代理到 Bot Gateway。三個後端觸發事件時 POST 到 Bot Gateway 推播通知給家長。

**Tech Stack:** Next.js, React, Tailwind v4, Hono, TypeScript, Firestore, jose (JWT), @google/generative-ai, google-auth-library, Zod

**前置條件：** v1 Bot Gateway 及三後端 bot routes 已完成並部署。

**設計文件：** `docs/plans/2026-02-24-94crambot-design.md` v3.0

---

## Task 1: Bot Gateway — enabled_modules 資料層

修改 Firestore bindings 和新增 tenant_settings collection，支援模組控制。

**Files:**
- Modify: `apps/bot-gateway/src/firestore/bindings.ts`
- Create: `apps/bot-gateway/src/firestore/settings.ts`
- Create: `apps/bot-gateway/src/firestore/usage.ts`

**Step 1: 修改 bindings.ts — TenantBinding 加入 enabled_modules**

```typescript
// 在 TenantBinding interface 加入
export interface TenantBinding {
  tenant_id: string;
  tenant_name: string;
  role: string;
  enabled_modules: ('manage' | 'inclass' | 'stock')[];
}
```

`addBinding()` 函式在新增綁定時，從 `bot_tenant_settings` 讀取該租戶的 `enabled_modules`，寫入 binding。若無 settings doc，預設啟用全部模組。

**Step 2: 建立 settings.ts — TenantSettings CRUD**

```typescript
import { firestore } from './client';

export interface TenantSettings {
  tenant_id: string;
  enabled_modules: ('manage' | 'inclass' | 'stock')[];
  welcome_message: string;
  plan: 'free' | 'basic' | 'pro';
  max_bindings: number;
  max_ai_calls: number;
  log_retention_days: number;
  created_at: Date;
  updated_at: Date;
}

const COLLECTION = 'bot_tenant_settings';

export async function getSettings(tenantId: string): Promise<TenantSettings | null> {
  const doc = await firestore.collection(COLLECTION).doc(tenantId).get();
  return doc.exists ? (doc.data() as TenantSettings) : null;
}

export async function upsertSettings(tenantId: string, data: Partial<TenantSettings>): Promise<void> {
  await firestore.collection(COLLECTION).doc(tenantId).set(
    { ...data, updated_at: new Date() },
    { merge: true }
  );
}

export async function getEnabledModules(tenantId: string): Promise<string[]> {
  const settings = await getSettings(tenantId);
  return settings?.enabled_modules ?? ['manage', 'inclass', 'stock'];
}
```

**Step 3: 建立 usage.ts — UsageStats CRUD**

```typescript
import { firestore } from './client';

export interface UsageStats {
  tenant_id: string;
  month: string;
  ai_calls: number;
  api_calls: number;
  ai_tokens_used: number;
  daily_breakdown: Record<string, { ai_calls: number; api_calls: number }>;
  updated_at: Date;
}

const COLLECTION = 'bot_usage_stats';

function docId(tenantId: string, month: string) {
  return `${tenantId}_${month}`;
}

export async function getUsage(tenantId: string, month: string): Promise<UsageStats | null> {
  const doc = await firestore.collection(COLLECTION).doc(docId(tenantId, month)).get();
  return doc.exists ? (doc.data() as UsageStats) : null;
}

export async function incrementUsage(tenantId: string, field: 'ai_calls' | 'api_calls', tokens?: number): Promise<void> {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const day = String(now.getDate()).padStart(2, '0');
  const id = docId(tenantId, month);
  const ref = firestore.collection(COLLECTION).doc(id);

  await firestore.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) {
      tx.set(ref, {
        tenant_id: tenantId,
        month,
        ai_calls: field === 'ai_calls' ? 1 : 0,
        api_calls: field === 'api_calls' ? 1 : 0,
        ai_tokens_used: tokens ?? 0,
        daily_breakdown: { [day]: { ai_calls: field === 'ai_calls' ? 1 : 0, api_calls: field === 'api_calls' ? 1 : 0 } },
        updated_at: now,
      });
    } else {
      const data = doc.data() as UsageStats;
      const dayData = data.daily_breakdown[day] ?? { ai_calls: 0, api_calls: 0 };
      tx.update(ref, {
        [field]: (data[field] ?? 0) + 1,
        ai_tokens_used: (data.ai_tokens_used ?? 0) + (tokens ?? 0),
        [`daily_breakdown.${day}`]: {
          ...dayData,
          [field]: (dayData[field] ?? 0) + 1,
        },
        updated_at: now,
      });
    }
  });
}
```

**Step 4: 驗證建置**

```bash
cd /Users/dali/Github/94CramManageSystem/apps/bot-gateway && pnpm build
```

**Step 5: Commit**

```bash
git add apps/bot-gateway/src/firestore/
git commit -m "feat(bot-gateway): add enabled_modules to bindings + tenant settings + usage stats"
```

---

## Task 2: Bot Gateway — AI Engine 動態裁切 + Intent Router 模組過濾

修改 AI Engine 和 Intent Router，根據 enabled_modules 過濾可用意圖。

**Files:**
- Modify: `apps/bot-gateway/src/modules/ai-engine.ts`
- Modify: `apps/bot-gateway/src/handlers/intent-router.ts`
- Modify: `apps/bot-gateway/src/modules/auth-manager.ts`

**Step 1: 修改 auth-manager.ts — authenticate() 回傳 enabled_modules**

`authenticate()` 目前回傳 `AuthContext`（含 tenantId, tenantName, role）。修改為同時回傳 `enabledModules: string[]`。從 `TenantBinding.enabled_modules` 讀取，若欄位不存在則 fallback 從 `bot_tenant_settings` 讀取。

**Step 2: 修改 ai-engine.ts — buildSystemPrompt 接受 enabledModules**

`parseIntent()` 函式新增 `enabledModules` 參數。`buildSystemPrompt()` 根據 enabledModules 動態組合意圖段落：

- `manage` 模組啟用 → 包含 manage.* 意圖說明
- `inclass` 模組啟用 → 包含 inclass.* 意圖說明
- `stock` 模組啟用 → 包含 stock.* 意圖說明

同時新增 3 個意圖到 system prompt：
- `inclass.report` — 「查某學生某段時間的出缺勤報告」
- `manage.query_payment_history` — 「查某學生的繳費紀錄」
- `stock.history` — 「查某品項的出入貨紀錄」

租戶快取注入也根據模組過濾：
- 未啟用 manage → 不注入 students（manage 的）、classes
- 未啟用 inclass → 不注入 students（inclass 的）、classes
- 未啟用 stock → 不注入 items、warehouses

**Step 3: 修改 intent-router.ts — 新增模組過濾 + 3 個新 intent**

```typescript
// 新增 MODULE_MAP
const MODULE_MAP: Record<string, string> = {
  'manage.payment': 'manage',
  'manage.add_student': 'manage',
  'manage.query_student': 'manage',
  'manage.query_finance': 'manage',
  'manage.query_payment_history': 'manage',
  'inclass.leave': 'inclass',
  'inclass.late': 'inclass',
  'inclass.query': 'inclass',
  'inclass.report': 'inclass',
  'stock.ship': 'stock',
  'stock.restock': 'stock',
  'stock.query': 'stock',
  'stock.history': 'stock',
};

// 新增到 INTENT_API_MAP
'inclass.report': { service: 'inclass', path: '/attendance/report' },
'manage.query_payment_history': { service: 'manage', path: '/finance/history' },
'stock.history': { service: 'stock', path: '/stock/history' },

// 新增到 QUERY_INTENTS
'inclass.report', 'manage.query_payment_history', 'stock.history'
```

`executeIntent()` 在呼叫 API 前檢查 `MODULE_MAP[intent]` 是否在 `enabledModules` 中。若否，回傳：
```
「⚠️ 您尚未啟用此模組功能。請至 94CramBot 管理後台開啟對應模組。」
```

**Step 4: 修改 webhooks/telegram.ts — 傳遞 enabledModules**

主流程中 `authenticate()` 回傳的 `enabledModules` 需傳遞給 `parseIntent()` 和 `executeIntent()`。

**Step 5: 驗證建置**

```bash
cd /Users/dali/Github/94CramManageSystem/apps/bot-gateway && pnpm build
```

**Step 6: Commit**

```bash
git add apps/bot-gateway/src/
git commit -m "feat(bot-gateway): add module filtering to AI engine and intent router"
```

---

## Task 3: 補齊三後端缺漏端點

新增 v1 規格書中有定義但未實作的 3 個端點 + 1 個接線。

**Files:**
- Modify: `apps/inclass-backend/src/routes/bot/attendance.ts` — 新增 `/report`
- Modify: `apps/stock-backend/src/routes/bot/stock.ts` — 新增 `/history`
- Modify: `apps/manage-backend/src/routes/bot-ext/data.ts` — 新增 `/bindcode`

**Step 1: inclass-backend — POST /attendance/report**

```typescript
// 在 attendance.ts 新增
app.post('/report', async (c) => {
  const schoolId = c.get('schoolId');
  const { student_name, start_date, end_date } = await c.req.json();

  // 查詢該學生在指定期間的出缺勤紀錄
  // 使用 inclass_attendance_records + inclass_students 表
  // 回傳：出席/缺席/遲到/請假 各幾次

  return c.json({
    success: true,
    message: `${student_name} 的出缺勤報告（${start_date} ~ ${end_date}）`,
    data: { student_name, start_date, end_date, present: 0, absent: 0, late: 0, leave: 0, records: [] }
  });
});
```

**Step 2: stock-backend — POST /stock/history**

```typescript
// 在 stock.ts 新增
app.post('/history', async (c) => {
  const tenantId = c.get('tenantId');
  const { item_name, limit } = await c.req.json();

  // 查詢該品項的出入貨紀錄
  // 使用 stock_transactions 或 stock_records 表
  // 回傳：最近 N 筆出入貨紀錄

  return c.json({
    success: true,
    message: `${item_name} 的出入貨紀錄`,
    data: { item_name, records: [] }
  });
});
```

**Step 3: manage-backend — POST /data/bindcode**

```typescript
// 在 data.ts 新增
import { Firestore } from '@google-cloud/firestore';

app.post('/bindcode', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json();
  const tenantName = body.tenant_name || tenantId;

  // 產生 6 位數綁定碼
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // 寫入 Firestore bot_bind_codes collection
  const firestore = new Firestore({ projectId: process.env.GCP_PROJECT_ID || 'cram94-manage-system' });
  await firestore.collection('bot_bind_codes').doc(code).set({
    tenant_id: tenantId,
    tenant_name: tenantName,
    used: false,
    created_at: new Date(),
    expires_at: expiresAt,
  });

  return c.json({
    success: true,
    message: `綁定碼已生成：${code}（5 分鐘內有效）`,
    data: { code, expires_at: expiresAt.toISOString() }
  });
});
```

**注意：** manage-backend 的 `package.json` 需要加入 `@google-cloud/firestore` 依賴。

**Step 4: 驗證三個後端建置**

```bash
cd /Users/dali/Github/94CramManageSystem
pnpm --filter @94cram/manage-backend build
pnpm --filter @94cram/inclass-backend build
pnpm --filter @94cram/stock-backend build
```

**Step 5: Commit**

```bash
git add apps/inclass-backend/src/routes/bot/ apps/stock-backend/src/routes/bot/ apps/manage-backend/src/routes/bot-ext/ apps/manage-backend/package.json
git commit -m "feat(backends): add missing bot endpoints - attendance/report, stock/history, data/bindcode"
```

---

## Task 4: Bot Gateway — Dashboard REST API

在 Bot Gateway 新增 `/api/dashboard/*` 路由，供 Bot Dashboard 呼叫。

**Files:**
- Create: `apps/bot-gateway/src/routes/dashboard/index.ts`
- Create: `apps/bot-gateway/src/routes/dashboard/auth.ts`
- Create: `apps/bot-gateway/src/routes/dashboard/overview.ts`
- Create: `apps/bot-gateway/src/routes/dashboard/bindings.ts`
- Create: `apps/bot-gateway/src/routes/dashboard/modules.ts`
- Create: `apps/bot-gateway/src/routes/dashboard/logs.ts`
- Create: `apps/bot-gateway/src/routes/dashboard/usage.ts`
- Create: `apps/bot-gateway/src/routes/dashboard/settings.ts`
- Modify: `apps/bot-gateway/src/app.ts` — 掛載 dashboard 路由
- Modify: `apps/bot-gateway/src/config.ts` — 新增 JWT_SECRET

**Step 1: 修改 config.ts — 新增 JWT_SECRET**

```typescript
// 在 envSchema 加入
JWT_SECRET: z.string().min(1).optional(), // Dashboard 用
DASHBOARD_URL: z.string().url().optional(),
```

**Step 2: 建立 routes/dashboard/index.ts — JWT middleware + 路由掛載**

```typescript
import { Hono } from 'hono';
import { jwtVerify } from 'jose';
import { config } from '../../config';
import authRoutes from './auth';
import overviewRoutes from './overview';
import bindingsRoutes from './bindings';
import modulesRoutes from './modules';
import logsRoutes from './logs';
import usageRoutes from './usage';
import settingsRoutes from './settings';

const app = new Hono();

// Auth routes 不需要 JWT
app.route('/auth', authRoutes);

// 以下路由需要 JWT
app.use('/*', async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token || !config.JWT_SECRET) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  try {
    const secret = new TextEncoder().encode(config.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    c.set('tenantId', payload.tenantId as string);
    c.set('userId', payload.sub as string);
    c.set('role', payload.role as string);
    await next();
  } catch {
    return c.json({ success: false, error: 'Invalid token' }, 401);
  }
});

app.route('/overview', overviewRoutes);
app.route('/bindings', bindingsRoutes);
app.route('/modules', modulesRoutes);
app.route('/logs', logsRoutes);
app.route('/usage', usageRoutes);
app.route('/settings', settingsRoutes);

export default app;
```

**Step 3: 建立各路由檔案**

各路由從 Firestore 讀取/寫入資料，回傳 JSON。具體邏輯：

- **auth.ts** — `POST /login`（暫用 demo 帳號）、`POST /demo`
- **overview.ts** — `GET /`（聚合 bindings 數量、今日 logs 數量、模組狀態、最近 5 筆操作）
- **bindings.ts** — `GET /`（列出該租戶所有綁定用戶）、`DELETE /:telegramUserId`（解除綁定）
- **modules.ts** — `GET /`（讀取 enabled_modules）、`PUT /`（更新 enabled_modules，同步更新所有 bindings）
- **logs.ts** — `GET /`（分頁查詢 bot_operation_logs，支援 ?page, ?limit, ?intent 篩選）
- **usage.ts** — `GET /`（讀取 bot_usage_stats，支援 ?month 參數）
- **settings.ts** — `GET /`、`PUT /`（讀寫 bot_tenant_settings）、`POST /bindcode`（生成綁定碼）

**Step 4: 修改 app.ts — 掛載路由**

```typescript
import dashboardRoutes from './routes/dashboard/index';
// ...
app.route('/api/dashboard', dashboardRoutes);
```

**Step 5: Bot Gateway package.json 加入 jose**

```bash
cd apps/bot-gateway && pnpm add jose
```

**Step 6: 驗證建置**

```bash
cd /Users/dali/Github/94CramManageSystem/apps/bot-gateway && pnpm build
```

**Step 7: Commit**

```bash
git add apps/bot-gateway/
git commit -m "feat(bot-gateway): add Dashboard REST API routes with JWT auth"
```

---

## Task 5: Bot Dashboard — 專案骨架

建立 `apps/bot-dashboard/` 基礎專案結構，對齊現有 Dashboard 模式。

**Files:**
- Create: `apps/bot-dashboard/package.json`
- Create: `apps/bot-dashboard/tsconfig.json`
- Create: `apps/bot-dashboard/next.config.ts`
- Create: `apps/bot-dashboard/tailwind.config.ts`
- Create: `apps/bot-dashboard/Dockerfile`
- Create: `apps/bot-dashboard/src/app/layout.tsx`
- Create: `apps/bot-dashboard/src/app/globals.css`
- Create: `apps/bot-dashboard/src/app/page.tsx`
- Create: `apps/bot-dashboard/src/lib/api.ts`

**Step 1: package.json**

```json
{
  "name": "@94cram/bot-dashboard",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3301",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.3.3",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "jose": "^6.0.11"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.8",
    "@types/node": "^20.0.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "tailwindcss": "^4.1.8",
    "typescript": "^5.0.0"
  }
}
```

**Step 2: next.config.ts — rewrites 到 Bot Gateway**

```typescript
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  async rewrites() {
    const BACKEND_URL = process.env.BACKEND_URL || 'https://cram94-bot-gateway-1015149159553.asia-east1.run.app';
    return [
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/dashboard/:path*` },
      { source: '/health', destination: `${BACKEND_URL}/health` },
    ];
  },
};

export default config;
```

**Step 3: globals.css — Morandi theme（對齊 manage-dashboard）**

使用 Tailwind v4 `@theme` 語法，Morandi 配色。primary 色使用莫蘭迪紫 `#A89BB5`。

**Step 4: layout.tsx — Root layout**

Noto Sans TC 字型、`lang="zh-TW"`、SEO metadata。

**Step 5: page.tsx — redirect to /landing**

```typescript
import { redirect } from 'next/navigation';
export default function Home() { redirect('/landing'); }
```

**Step 6: lib/api.ts — API client**

對齊 manage-dashboard 的 `enhancedFetch` 模式：JWT from localStorage、X-Tenant-Id header、cache + retry。

**Step 7: Dockerfile**

對齊 manage-dashboard 的 Next.js standalone Dockerfile。

**Step 8: 安裝依賴 + 驗證建置**

```bash
cd /Users/dali/Github/94CramManageSystem && pnpm install
cd apps/bot-dashboard && pnpm build
```

**Step 9: Commit**

```bash
git add apps/bot-dashboard/
git commit -m "feat(bot-dashboard): scaffold project with Next.js + Tailwind Morandi theme"
```

---

## Task 6: Bot Dashboard — Landing Page

建立公開介紹頁，包含 Hero、功能介紹、整合架構、定價、FAQ、CTA。

**Files:**
- Create: `apps/bot-dashboard/src/app/landing/page.tsx`

**Step 1: Landing Page 完整內容**

對齊其他 Dashboard 的 6 段式結構：

1. **Hero** — 「94CramBot AI 助手」、「用對話管理補習班，Telegram 一鍵操作三大系統」
2. **功能卡 ×6** — 自然語言 AI、寫入確認機制、多租戶管理、模組選配、對話紀錄、用量分析
3. **整合架構** — 與 94Manage / 94inClass / 94Stock 的連接圖
4. **定價 ×3** — 免費版 NT$0 / 基礎版 NT$499 / 專業版 NT$999
5. **FAQ ×6** — 常見問題
6. **CTA** — 「免費試用 30 天」

配色使用莫蘭迪紫 `#A89BB5` 為主色。

**Step 2: 驗證建置**

```bash
cd /Users/dali/Github/94CramManageSystem/apps/bot-dashboard && pnpm build
```

**Step 3: Commit**

```bash
git add apps/bot-dashboard/src/app/landing/
git commit -m "feat(bot-dashboard): add landing page with pricing and FAQ"
```

---

## Task 7: Bot Dashboard — 登入 + Demo

建立登入頁和 Demo 體驗功能。

**Files:**
- Create: `apps/bot-dashboard/src/app/login/page.tsx`
- Create: `apps/bot-dashboard/src/app/demo/page.tsx`
- Create: `apps/bot-dashboard/src/app/api/auth/demo/route.ts`

**Step 1: login/page.tsx**

對齊 manage-dashboard 登入頁模式：帳號/密碼表單、呼叫 `/api/auth/login`、存 JWT 到 localStorage、role-based redirect。

**Step 2: demo/page.tsx**

點擊後呼叫 `/api/auth/demo`，取得 demo JWT，自動跳轉到 `/dashboard`。

**Step 3: api/auth/demo/route.ts**

Next.js API route，用 `jose` 簽發 demo JWT。Demo 帳號：

```typescript
const DEMO_ACCOUNTS: Record<string, { tenantId, tenantName, role, permissions }> = {
  boss: {
    tenantId: 'demo-tenant-001',
    tenantName: '示範補習班',
    role: 'admin',
    permissions: ['bot:read', 'bot:write', 'bot:admin'],
  },
};
```

**Step 4: 驗證建置 + Commit**

---

## Task 8: Bot Dashboard — Layout + Sidebar

建立管理後台的 Layout、Sidebar、MobileNav。

**Files:**
- Create: `apps/bot-dashboard/src/components/layout/AppLayout.tsx`
- Create: `apps/bot-dashboard/src/components/layout/Sidebar.tsx`
- Create: `apps/bot-dashboard/src/components/layout/MobileHeader.tsx`
- Create: `apps/bot-dashboard/src/components/layout/MobileNav.tsx`
- Create: `apps/bot-dashboard/src/components/SystemSwitcher.tsx`
- Create: `apps/bot-dashboard/src/app/dashboard/layout.tsx`

**Step 1: AppLayout.tsx**

```typescript
const PUBLIC_PATHS = ['/login', '/demo', '/landing'];
```

Guard 邏輯：非 public path 必須有 localStorage token，否則 redirect `/login`。Desktop: Sidebar + main。Mobile: MobileHeader + MobileNav。

**Step 2: Sidebar.tsx**

導航項目：
```typescript
const NAV_ITEMS = [
  { icon: '📊', label: '總覽', path: '/dashboard', roles: ['superadmin', 'admin', 'staff'] },
  { type: 'separator', label: '管理端 Bot' },
  { icon: '🔗', label: '管理端綁定', path: '/dashboard/bindings', roles: ['superadmin', 'admin', 'staff'] },
  { icon: '🧩', label: '模組管理', path: '/dashboard/modules', roles: ['superadmin', 'admin'] },
  { type: 'separator', label: '家長端 VIPBot' },
  { icon: '👨‍👩‍👧', label: '家長綁定', path: '/dashboard/vip-bindings', roles: ['superadmin', 'admin', 'staff'] },
  { icon: '🔔', label: '推播紀錄', path: '/dashboard/notifications', roles: ['superadmin', 'admin', 'staff'] },
  { type: 'separator', label: '分析' },
  { icon: '📋', label: '使用紀錄', path: '/dashboard/logs', roles: ['superadmin', 'admin', 'staff'] },
  { icon: '📈', label: '用量統計', path: '/dashboard/usage', roles: ['superadmin', 'admin'] },
  { icon: '⚙️', label: '設定', path: '/dashboard/settings', roles: ['superadmin', 'admin'] },
];
```

**Step 3: MobileHeader + MobileNav**

對齊 manage-dashboard 的模式：MobileHeader 頂部、MobileNav 底部 tab bar。

**Step 4: SystemSwitcher.tsx**

跨系統切換器，連結到其他三個 Dashboard。

**Step 5: 驗證建置 + Commit**

---

## Task 9: Bot Dashboard — 總覽頁

**Files:**
- Create: `apps/bot-dashboard/src/app/dashboard/page.tsx`
- Create: `apps/bot-dashboard/src/components/ui/StatCard.tsx`
- Create: `apps/bot-dashboard/src/components/ui/Card.tsx`

**Step 1: 總覽頁**

4 個 StatCard：
- 綁定人數（從 `/api/overview` 讀取）
- 今日操作次數
- 本月 AI 對話次數
- 啟用模組數

最近操作列表（最近 5 筆 log）。

模組狀態卡：顯示 manage / inclass / stock 各自啟用/停用狀態。

**Step 2: 驗證建置 + Commit**

---

## Task 10: Bot Dashboard — 綁定管理頁

**Files:**
- Create: `apps/bot-dashboard/src/app/dashboard/bindings/page.tsx`

**Step 1: 綁定管理頁**

- Desktop: 表格列出綁定用戶（Telegram 名稱、Telegram ID、綁定時間、角色、操作）
- Mobile: 卡片列表
- 解除綁定按鈕 → 確認 Modal → `DELETE /api/bindings/:id`
- 搜尋/篩選功能

**Step 2: 驗證建置 + Commit**

---

## Task 11: Bot Dashboard — 模組管理頁

**Files:**
- Create: `apps/bot-dashboard/src/app/dashboard/modules/page.tsx`

**Step 1: 模組管理頁**

3 個模組卡片，各有開關：
- 94Manage 學員管理（綠色 `#A8B5A2`）
- 94inClass 點名系統（粉色 `#C4A9A1`）
- 94Stock 庫存管理（藍色 `#9CADB7`）

開關切換 → `PUT /api/modules` → 更新 Firestore → Toast 成功訊息

各卡片顯示該模組可用的指令列表（如 manage: 繳費登記、學生查詢...）。

**Step 2: 驗證建置 + Commit**

---

## Task 12: Bot Dashboard — 使用紀錄頁

**Files:**
- Create: `apps/bot-dashboard/src/app/dashboard/logs/page.tsx`

**Step 1: 使用紀錄頁**

- 表格/卡片列出操作紀錄（時間、Telegram 用戶、意圖、狀態、詳情）
- 篩選：按意圖類型、按狀態（confirmed/cancelled/expired）
- 分頁：每頁 20 筆
- 點擊展開看完整操作參數和結果

**Step 2: 驗證建置 + Commit**

---

## Task 13: Bot Dashboard — 用量統計頁

**Files:**
- Create: `apps/bot-dashboard/src/app/dashboard/usage/page.tsx`

**Step 1: 用量統計頁**

- 月份選擇器（預設當月）
- 3 個 StatCard：本月 AI 對話次數、API 呼叫次數、AI Token 用量
- 每日長條圖（CSS width bar，對齊 manage-dashboard 的 intent distribution 做法）
- 方案上限提示（如「已使用 45/50 次 AI 對話」）

**Step 2: 驗證建置 + Commit**

---

## Task 14: Bot Dashboard — 設定頁

**Files:**
- Create: `apps/bot-dashboard/src/app/dashboard/settings/page.tsx`

**Step 1: 設定頁**

- **管理端綁定碼**：按鈕 → `POST /api/settings/bindcode` → 顯示 6 位數碼 + 5 分鐘倒計時
- **家長端綁定碼**：選擇學生 → `POST /api/settings/vip-bindcode` → 顯示碼 + 24 小時有效
- **Bot 歡迎訊息**：textarea 編輯 → `PUT /api/settings` 儲存
- **方案資訊**：顯示當前方案、使用限額、升級連結

**Step 2: 驗證建置 + Commit**

---

## Task 15: Bot Dashboard — UI 元件庫

補齊 Dashboard 需要的共用 UI 元件。

**Files:**
- Create: `apps/bot-dashboard/src/components/ui/Button.tsx`
- Create: `apps/bot-dashboard/src/components/ui/Modal.tsx`
- Create: `apps/bot-dashboard/src/components/ui/Badge.tsx`
- Create: `apps/bot-dashboard/src/components/ui/Tabs.tsx`
- Create: `apps/bot-dashboard/src/components/ui/Pagination.tsx`
- Create: `apps/bot-dashboard/src/components/ui/Switch.tsx`
- Create: `apps/bot-dashboard/src/components/ui/Skeleton.tsx`
- Create: `apps/bot-dashboard/src/components/ui/Toast.tsx`
- Create: `apps/bot-dashboard/src/hooks/useToast.ts`
- Create: `apps/bot-dashboard/src/hooks/useLoading.ts`

對齊 manage-dashboard 的 UI 元件風格，使用 Morandi 配色。

**Step: 驗證建置 + Commit**

---

## Task 16: CI/CD — Bot Dashboard 部署工作流

**Files:**
- Create: `.github/workflows/deploy-bot-dashboard.yml`

**Step 1: 建立工作流**

對齊 `deploy-manage.yml` 模式：
```yaml
name: Deploy 94CramBot Dashboard
on:
  push:
    branches: [main]
    paths:
      - 'apps/bot-dashboard/**'
      - 'packages/shared/**'
jobs:
  deploy:
    # Artifact Registry build + Cloud Run deploy
    # Service: cram94-bot-dashboard
    # Port: 3301 (internal), 8080 (Cloud Run)
    # Memory: 256Mi
    # Env: BACKEND_URL, JWT_SECRET
```

**Step 2: Commit**

```bash
git add .github/workflows/deploy-bot-dashboard.yml
git commit -m "ci: add deploy-bot-dashboard workflow"
```

---

## Task 17: Portal — 更新 94CramBot 連結

Portal 首頁的 94CramBot 連結從 Telegram 改為 Bot Dashboard。

**Files:**
- Modify: `apps/portal/src/app/page.tsx`

**Step 1: 更新 systems 陣列**

```typescript
// 94CramBot 的 url 從 'https://t.me/cram94bot' 改為
url: process.env.BOT_URL || 'https://cram94-bot-dashboard-1015149159553.asia-east1.run.app',
```

同時更新快速選擇引導區和 footer 的連結。

**Step 2: 驗證建置 + Commit**

---

## Task 18: Bot Gateway — VIPBot Webhook + VIP Auth Manager

在 Bot Gateway 新增家長端 Telegram Webhook 和 VIP 認證管理。

**Files:**
- Modify: `apps/bot-gateway/src/config.ts` — 新增 `TELEGRAM_VIP_BOT_TOKEN`
- Create: `apps/bot-gateway/src/webhooks/telegram-vip.ts` — 家長端 webhook handler
- Create: `apps/bot-gateway/src/modules/vip-auth-manager.ts` — 家長端認證（查 vip_user_bindings）
- Create: `apps/bot-gateway/src/firestore/vip-bindings.ts` — vip_user_bindings CRUD
- Create: `apps/bot-gateway/src/commands/vip-bind.ts` — 家長端 /bind（含流程 B 姓名配對 + 流程 C 預建對應）
- Modify: `apps/bot-gateway/src/app.ts` — 掛載 `/webhook/telegram-vip`

**Step 1: config.ts 新增 VIP Token**

```typescript
TELEGRAM_VIP_BOT_TOKEN: z.string().min(1).optional(), // 家長端 Bot Token
```

**Step 2: vip-bindings.ts — Firestore CRUD**

```typescript
interface VipTenantBinding {
  tenant_id: string;
  tenant_name: string;
  students: Array<{ student_id: string; student_name: string; class_name?: string }>;
}

interface VipUserBinding {
  bindings: VipTenantBinding[];
  active_tenant_id: string;
  active_tenant_name: string;
  active_student_id: string;   // 目前查詢的孩子
  active_student_name: string;
  created_at: Date;
  last_active_at: Date;
}
```

Collection: `vip_user_bindings`，Document ID: telegram_user_id。

**Step 3: vip-bind.ts — 家長綁定指令**

- 讀取 `vip_bind_codes` collection 驗證碼
- 碼帶 student_id → 流程 C：直接綁定
- 碼不帶 student_id → 流程 B：回覆「請輸入孩子姓名」，等待下一訊息做模糊匹配

**Step 4: vip-auth-manager.ts — authenticate VIP**

從 `vip_user_bindings` 讀取綁定，回傳 active tenant + active student。

**Step 5: telegram-vip.ts — VIP Webhook 主流程**

```
POST /webhook/telegram-vip
  → Platform Adapter
  → Rate Limiter（20/min）
  → VIP Auth Manager
    → 未綁定 → 引導綁定
    → 已綁定 → 繼續
  → 指令檢查（/bind, /switch, /help）
  → VIP Engine（AI 查詢意圖解析）
  → VIP Router（查詢 API 呼叫 → 回傳結果）
```

**Step 6: app.ts 掛載**

```typescript
import { telegramVipWebhook } from './webhooks/telegram-vip';
app.post('/webhook/telegram-vip', telegramVipWebhook);
```

**Step 7: utils/telegram.ts — 新增 VIP bot sendMessage**

新增 `sendVipMessage()` 函式，使用 `TELEGRAM_VIP_BOT_TOKEN`。

**Step 8: 驗證建置 + Commit**

```bash
git commit -m "feat(bot-gateway): add VIPBot webhook, VIP auth manager, parent binding"
```

---

## Task 19: Bot Gateway — VIP AI Engine + VIP Router

家長端 AI 意圖解析和查詢路由。

**Files:**
- Create: `apps/bot-gateway/src/modules/vip-engine.ts`
- Create: `apps/bot-gateway/src/handlers/vip-router.ts`

**Step 1: vip-engine.ts — 家長端 AI 引擎**

- Gemini 2.0 Flash，temperature: 0，JSON output
- System prompt 比管理端簡單，語調親切
- 支援口語化表達（「我兒子」「我女兒」「我的小孩」）
- 多小孩時 AI 回覆釐清是哪個孩子
- 意圖集：

```typescript
type VipIntent =
  | 'vip.query_attendance'    // 查出缺勤
  | 'vip.query_grade'         // 查成績
  | 'vip.query_payment'       // 查繳費
  | 'vip.query_schedule'      // 查課表
  | 'vip.switch_child'        // 切換孩子
  | 'vip.help'
  | 'unknown';
```

**Step 2: vip-router.ts — 家長端查詢路由**

```typescript
const VIP_INTENT_API_MAP: Record<string, { service: string; path: string }> = {
  'vip.query_attendance': { service: 'inclass', path: '/attendance/list' },
  'vip.query_grade':      { service: 'manage', path: '/student/grades' },
  'vip.query_payment':    { service: 'manage', path: '/finance/history' },
  'vip.query_schedule':   { service: 'manage', path: '/student/schedule' },
};
```

所有意圖都是查詢類，不需要 confirm mechanism。API 呼叫時自動帶上 `student_id`。

**Step 3: 驗證建置 + Commit**

```bash
git commit -m "feat(bot-gateway): add VIP AI engine and query router for parents"
```

---

## Task 20: Bot Gateway — 推播通知 API

三個後端主動呼叫的推播 API。

**Files:**
- Create: `apps/bot-gateway/src/routes/notify/index.ts`
- Create: `apps/bot-gateway/src/modules/notify-manager.ts`
- Modify: `apps/bot-gateway/src/app.ts` — 掛載 `/api/notify`

**Step 1: notify-manager.ts — 推播管理**

```typescript
export async function notifyParents(params: {
  tenant_id: string;
  student_id: string;
  type: string;
  title: string;
  message: string;
}): Promise<{ sent: number; failed: number }> {
  // 1. 查 vip_user_bindings，找到所有綁定了這個 student_id 的家長
  // 2. 逐一發送 Telegram 訊息（使用 VIP Bot Token）
  // 3. 記錄到 bot_operation_logs（type: 'notification'）
  // 4. 回傳發送結果
}
```

**Step 2: routes/notify/index.ts — 推播路由**

使用 `botAuth` middleware（GCP IAM 驗證），確保只有三個後端能呼叫。

```typescript
const app = new Hono();
app.use('/*', botAuth);  // 共用管理端的 GCP IAM 驗證

app.post('/attendance', async (c) => { ... });
app.post('/grade', async (c) => { ... });
app.post('/payment', async (c) => { ... });
app.post('/course', async (c) => { ... });
app.post('/announcement', async (c) => { ... });
```

每個端點：解析 body → 呼叫 `notifyParents()` → 回傳結果。

**Step 3: app.ts 掛載**

```typescript
import notifyRoutes from './routes/notify/index';
app.route('/api/notify', notifyRoutes);
```

**Step 4: 驗證建置 + Commit**

```bash
git commit -m "feat(bot-gateway): add push notification API for parent VIPBot"
```

---

## Task 21: 三後端 — 推播工具函式 + 觸發點

在三個後端新增推播工具函式，並在關鍵事件處觸發。

**Files:**
- Create: `apps/manage-backend/src/utils/bot-notify.ts`
- Create: `apps/inclass-backend/src/utils/bot-notify.ts`
- Create: `apps/stock-backend/src/utils/bot-notify.ts`
- Modify: 各後端 `package.json` — 新增 `google-auth-library`（如尚未安裝）

**Step 1: bot-notify.ts（三個後端共用邏輯）**

```typescript
import { GoogleAuth } from 'google-auth-library';

const BOT_GATEWAY_URL = process.env.BOT_GATEWAY_URL;
const auth = new GoogleAuth();

export async function notifyParent(params: {
  tenant_id: string;
  student_id: string;
  type: string;
  title: string;
  message: string;
}): Promise<void> {
  if (!BOT_GATEWAY_URL) return; // 未設定則靜默跳過
  try {
    const client = await auth.getIdTokenClient(BOT_GATEWAY_URL);
    await client.request({
      url: `${BOT_GATEWAY_URL}/api/notify/${params.type.split('.')[0]}`,
      method: 'POST',
      data: params,
    });
  } catch (error) {
    console.error('[Bot Notify] Failed:', error);
    // 推播失敗不影響主流程
  }
}
```

**Step 2: 各後端加入觸發點**

觸發推播的程式碼先預留但不修改現有路由邏輯，只在新增的 bot routes 中示範呼叫。未來在正式點名/繳費等路由中加入。

**注意：** 推播是 fire-and-forget，不影響主流程。`BOT_GATEWAY_URL` 未設定時靜默跳過。

**Step 3: 驗證建置 + Commit**

```bash
git commit -m "feat(backends): add bot-notify utility for parent push notifications"
```

---

## Task 22: Manage-backend — VIP 專用端點

家長端查詢成績和課表的 API。

**Files:**
- Modify: `apps/manage-backend/src/routes/bot-ext/student.ts` — 新增 `/grades`、`/schedule`
- Modify: `apps/manage-backend/src/routes/bot-ext/data.ts` — 新增 `/vip-bindcode`

**Step 1: student.ts — POST /student/grades**

```typescript
app.post('/grades', async (c) => {
  const tenantId = c.get('tenantId');
  const { student_id, student_name } = await c.req.json();
  // 查詢學生成績（manage_grades 或相關表）
  return c.json({ success: true, message: '...', data: { grades: [] } });
});
```

**Step 2: student.ts — POST /student/schedule**

```typescript
app.post('/schedule', async (c) => {
  const tenantId = c.get('tenantId');
  const { student_id } = await c.req.json();
  // 查詢學生課表（manage_enrollments + manage_courses）
  return c.json({ success: true, message: '...', data: { schedule: [] } });
});
```

**Step 3: data.ts — POST /data/vip-bindcode**

```typescript
app.post('/vip-bindcode', async (c) => {
  const tenantId = c.get('tenantId');
  const { tenant_name, student_id, student_name } = await c.req.json();

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 小時

  const firestore = new Firestore({ projectId: process.env.GCP_PROJECT_ID || 'cram94-manage-system' });
  await firestore.collection('vip_bind_codes').doc(code).set({
    tenant_id: tenantId,
    tenant_name: tenant_name || tenantId,
    student_id: student_id || null,  // null = 流程 B
    student_name: student_name || null,
    used: false,
    created_at: new Date(),
    expires_at: expiresAt,
  });

  return c.json({
    success: true,
    message: `家長綁定碼已生成：${code}（24 小時內有效）`,
    data: { code, expires_at: expiresAt.toISOString() }
  });
});
```

**Step 4: 驗證建置 + Commit**

```bash
git commit -m "feat(manage-backend): add VIP endpoints - grades, schedule, vip-bindcode"
```

---

## Task 23: Bot Gateway — Dashboard API 擴充（VIP 相關）

擴充 Dashboard REST API，支援家長端管理。

**Files:**
- Create: `apps/bot-gateway/src/routes/dashboard/vip-bindings.ts` — 家長綁定管理
- Create: `apps/bot-gateway/src/routes/dashboard/notifications.ts` — 推播紀錄
- Modify: `apps/bot-gateway/src/routes/dashboard/settings.ts` — 新增 VIP 綁定碼生成
- Modify: `apps/bot-gateway/src/routes/dashboard/overview.ts` — 新增 VIP 統計
- Modify: `apps/bot-gateway/src/routes/dashboard/index.ts` — 掛載新路由

**Step 1: vip-bindings.ts**

```typescript
// GET /  — 列出家長端綁定用戶（含綁定的學生）
// DELETE /:telegramUserId — 解除家長綁定
```

**Step 2: notifications.ts**

```typescript
// GET / — 分頁查詢推播紀錄（從 bot_operation_logs 篩選 type: 'notification'）
// 支援 ?page, ?limit, ?type 篩選
```

**Step 3: settings.ts — 新增 VIP 綁定碼**

```typescript
// POST /vip-bindcode — 生成家長端綁定碼（帶學生資訊）
// 呼叫 manage-backend /api/bot-ext/data/vip-bindcode 或直接寫 Firestore
```

**Step 4: 驗證建置 + Commit**

```bash
git commit -m "feat(bot-gateway): add VIP dashboard API - bindings, notifications, bindcode"
```

---

## Task 24: Bot Dashboard — 家長綁定管理頁 + 推播紀錄頁

**Files:**
- Create: `apps/bot-dashboard/src/app/dashboard/vip-bindings/page.tsx`
- Create: `apps/bot-dashboard/src/app/dashboard/notifications/page.tsx`

**Step 1: vip-bindings/page.tsx — 家長綁定管理**

- 表格/卡片列出家長（Telegram 名稱、綁定的學生、綁定時間）
- 解除綁定按鈕
- 生成家長綁定碼按鈕（選擇學生 → 生成碼）

**Step 2: notifications/page.tsx — 推播紀錄**

- 表格/卡片列出推播紀錄（時間、類型、學生、訊息、發送狀態）
- 篩選：按通知類型（到班/成績/繳費/課程/公告）
- 分頁

**Step 3: 驗證建置 + Commit**

```bash
git commit -m "feat(bot-dashboard): add VIP bindings and notifications pages"
```

---

## Task 25: GCP 設定 — VIPBot Token + Webhook

手動 GCP 設定和 Telegram Webhook 設定。

**Step 1: 取得 VIPBot Token**

從 BotFather 建立 `@cram94VIPbot`，取得 Token。

**Step 2: 建立 GCP Secret**

```bash
echo -n "${VIP_BOT_TOKEN}" | gcloud secrets create TELEGRAM_VIP_BOT_TOKEN \
  --data-file=- --project=cram94-manage-system
```

**Step 3: 更新 deploy-bot.yml — 新增 VIP Token**

```yaml
--set-secrets="...,TELEGRAM_VIP_BOT_TOKEN=TELEGRAM_VIP_BOT_TOKEN:latest"
```

**Step 4: 設定 Telegram Webhooks（部署後執行）**

```bash
# 管理端
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://cram94-bot-gateway-1015149159553.asia-east1.run.app/webhook/telegram"

# 家長端
curl -X POST "https://api.telegram.org/bot${TELEGRAM_VIP_BOT_TOKEN}/setWebhook" \
  -d "url=https://cram94-bot-gateway-1015149159553.asia-east1.run.app/webhook/telegram-vip"
```

**Step 5: 三後端 Cloud Run 新增環境變數**

```bash
for SVC in cram94-manage-backend cram94-inclass-backend cram94-stock-backend; do
  gcloud run services update $SVC \
    --set-env-vars="BOT_GATEWAY_URL=https://cram94-bot-gateway-1015149159553.asia-east1.run.app" \
    --region=asia-east1 --project=cram94-manage-system
done
```

**Step 6: 給三後端呼叫 Bot Gateway 的 IAM 權限**

```bash
for SA_SVC in cram94-manage-backend cram94-inclass-backend cram94-stock-backend; do
  SA_EMAIL=$(gcloud run services describe $SA_SVC --region=asia-east1 --project=cram94-manage-system --format='value(spec.template.spec.serviceAccountName)')
  gcloud run services add-iam-policy-binding cram94-bot-gateway \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/run.invoker" \
    --region=asia-east1 --project=cram94-manage-system
done
```

---

## Task 26: 全服務建置驗證

驗證所有修改的服務都能成功建置。

```bash
cd /Users/dali/Github/94CramManageSystem
pnpm --filter @94cram/bot-gateway build
pnpm --filter @94cram/bot-dashboard build
pnpm --filter @94cram/manage-backend build
pnpm --filter @94cram/inclass-backend build
pnpm --filter @94cram/stock-backend build
pnpm --filter @94cram/portal build
```

Expected: 全部成功，零錯誤。

---

## 依賴關係

```
Phase 1: 管理端補強（v2）
  Task 1 (enabled_modules 資料層) + Task 3 (補齊後端缺漏) — 平行
  → Task 2 (AI + Intent Router 模組過濾) — 依賴 Task 1

Phase 2: Dashboard 後端 API
  Task 4 (Dashboard REST API) — 依賴 Task 1

Phase 3: Dashboard 前端
  Task 5 (Dashboard 骨架) + Task 15 (UI 元件) — 平行，依賴 Task 4
  → Task 6~14 (各管理後台頁面) — 依賴 Task 5

Phase 4: VIPBot（v3）
  Task 18 (VIP Webhook + Auth) — 依賴 Task 1（共用 Firestore client）
  → Task 19 (VIP AI Engine + Router) — 依賴 Task 18
  → Task 20 (推播通知 API) — 依賴 Task 18
  Task 21 (三後端推播工具) — 依賴 Task 20
  Task 22 (Manage VIP 端點) — 可與 Task 18 平行

Phase 5: Dashboard VIP 擴充
  Task 23 (Dashboard API VIP 擴充) — 依賴 Task 18 + Task 4
  → Task 24 (Dashboard VIP 頁面) — 依賴 Task 23 + Task 5

Phase 6: 收尾
  Task 16 (CI/CD) + Task 17 (Portal 連結) — 獨立
  Task 25 (GCP 設定) — 需要 VIPBot Token
  Task 26 (全服務驗證) — 最後執行
```

**建議執行順序：**
1. Task 1 + Task 3（平行）— 管理端補強
2. Task 2 — AI 模組過濾
3. Task 4 — Dashboard REST API
4. Task 5 + Task 15（平行）— Dashboard 骨架 + UI
5. Task 6 ~ Task 14（可適度平行）— Dashboard 管理後台頁面
6. Task 18 + Task 22（平行）— VIPBot 核心 + Manage VIP 端點
7. Task 19 + Task 20（平行）— VIP AI + 推播 API
8. Task 21 — 三後端推播工具
9. Task 23 — Dashboard API VIP 擴充
10. Task 24 — Dashboard VIP 頁面
11. Task 16 + Task 17 + Task 25（平行）— CI/CD + Portal + GCP
12. Task 26 — 全服務驗證
