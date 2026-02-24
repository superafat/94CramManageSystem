# 94CramBot 實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 94cram.com monorepo 新增第四個服務 94CramBot（Bot Gateway），並修改三個現有後端新增 `/api/bot/*` 路由，實現 Telegram 聊天機器人透過自然語言操作三大系統。

**Architecture:** Bot Gateway 是獨立的 Hono/TypeScript 服務，接收 Telegram Webhook，用 Gemini 2.0 Flash 解析意圖，透過 GCP IAM 服務間認證呼叫三個後端的 `/api/bot/*` 路由。Bot 自身資料（綁定、暫存、快取、日誌）存 Firestore，業務資料透過後端 API 存取 PostgreSQL。

**Tech Stack:** Hono, TypeScript, ESM, tsup, google-auth-library, @google/generative-ai, @google-cloud/firestore, Telegram Bot API (raw HTTP), Drizzle ORM, Zod, Docker, Cloud Run, GitHub Actions

---

## 重要發現

1. **manage-backend 已有 `/api/bot` 路由**（`src/routes/bot.ts`）— 這是 AI 聊天用的，已掛載在 `app.ts:112`。新的 Bot API 需掛載在 `/api/bot-gateway` 或修改掛載點。**建議：新路由掛載在 `/api/bot-ext`（bot external）以避免衝突。**
   - 實際做法：在 `app.ts` 中新增 `app.route('/api/bot-ext', botExtRoutes)` 掛載新的 Bot Gateway API 路由
   - inclass-backend 和 stock-backend 沒有衝突，可直接用 `/api/bot`

2. **manage-backend 已安裝 `@google/generative-ai`** — Bot Gateway 也需要此套件

3. **三個後端 DB 存取方式不同：**
   - manage-backend: `drizzle-orm/postgres-js` + 本地 schema（`./db/schema`）
   - inclass-backend: `drizzle-orm/node-postgres` + shared schema（`@94cram/shared/db`）
   - stock-backend: `drizzle-orm/postgres-js` + shared schema（`@94cram/shared/db`）

4. **inclass-backend JWT middleware** 位於 `index.ts:100-121`，用 `app.use('/api/*', ...)` 全局掛載，但會 skip `/api/auth/*` 和 `/api/webhooks/*`。新的 `/api/bot/*` 路由需要被 skip，因為它用 GCP IAM 驗證而非 JWT。

5. **stock-backend** 的路由全部掛載在 `/api` 下（`app.route('/api', routes)`），JWT middleware 在各 route 檔案內自行套用。新的 bot 路由可以直接掛載在 `/api/bot`，不會被全局 JWT 攔截。

---

## Task 1: Bot Gateway — 專案骨架

建立 `apps/bot-gateway/` 的基礎專案結構：package.json、tsconfig、tsup、Dockerfile、環境變數驗證、Hono server 啟動。

**Files:**
- Create: `apps/bot-gateway/package.json`
- Create: `apps/bot-gateway/tsconfig.json`
- Create: `apps/bot-gateway/tsup.config.ts`
- Create: `apps/bot-gateway/Dockerfile`
- Create: `apps/bot-gateway/src/config.ts`
- Create: `apps/bot-gateway/src/app.ts`
- Create: `apps/bot-gateway/src/index.ts`

**Step 1: 建立 package.json**

```json
{
  "name": "@94cram/bot-gateway",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch --env-file=.env src/index.ts",
    "build": "tsup",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@google-cloud/firestore": "^7.0.0",
    "@google/generative-ai": "^0.24.1",
    "@hono/node-server": "^1.19.9",
    "google-auth-library": "^9.0.0",
    "hono": "^4.11.9",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.5.1",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Step 2: 建立 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: 建立 tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
});
```

**Step 4: 建立 Dockerfile**

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/bot-gateway/package.json apps/bot-gateway/
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/bot-gateway/ apps/bot-gateway/
WORKDIR /app/apps/bot-gateway
RUN pnpm build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app /app
WORKDIR /app/apps/bot-gateway
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

**Step 5: 建立 src/config.ts**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3300),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  MANAGE_URL: z.string().url(),
  INCLASS_URL: z.string().url(),
  STOCK_URL: z.string().url(),
  SERVICE_URL: z.string().url().optional(),
  GCP_PROJECT_ID: z.string().default('cram94-manage-system'),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
```

**Step 6: 建立 src/app.ts**

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';

export const app = new Hono();

app.use('/*', cors());

app.get('/', (c) => c.json({ message: '94CramBot Gateway API', status: 'running' }));
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));
```

**Step 7: 建立 src/index.ts**

```typescript
import { serve } from '@hono/node-server';
import { app } from './app';
import { config } from './config';

const port = config.PORT;
console.info(`🤖 94CramBot Gateway starting on port ${port}...`);

serve({ fetch: app.fetch, port });
console.info(`✅ 94CramBot Gateway running at http://localhost:${port}`);
```

**Step 8: 安裝依賴並驗證建置**

```bash
cd /Users/dali/Github/94CramManageSystem
pnpm install
cd apps/bot-gateway
pnpm build
```

Expected: 建置成功，`dist/index.js` 產生

**Step 9: Commit**

```bash
git add apps/bot-gateway/
git commit -m "feat(bot-gateway): scaffold project skeleton with Hono + TypeScript"
```

---

## Task 2: Bot Gateway — Firestore 模組

建立 Firestore 初始化和五個 collection 的 CRUD 操作。

**Files:**
- Create: `apps/bot-gateway/src/firestore/client.ts`
- Create: `apps/bot-gateway/src/firestore/bindings.ts`
- Create: `apps/bot-gateway/src/firestore/pending-actions.ts`
- Create: `apps/bot-gateway/src/firestore/cache.ts`
- Create: `apps/bot-gateway/src/firestore/logs.ts`

**Step 1: 建立 Firestore client**

```typescript
// src/firestore/client.ts
import { Firestore } from '@google-cloud/firestore';
import { config } from '../config';

export const firestore = new Firestore({
  projectId: config.GCP_PROJECT_ID,
});
```

**Step 2: 建立 bindings CRUD**

```typescript
// src/firestore/bindings.ts
import { firestore } from './client';

export interface TenantBinding {
  tenant_id: string;
  tenant_name: string;
  role: string;
}

export interface UserBinding {
  bindings: TenantBinding[];
  active_tenant_id: string;
  active_tenant_name: string;
  created_at: Date;
  last_active_at: Date;
}

const col = firestore.collection('bot_user_bindings');

export async function getBinding(telegramUserId: string): Promise<UserBinding | null> {
  const doc = await col.doc(telegramUserId).get();
  return doc.exists ? (doc.data() as UserBinding) : null;
}

export async function addBinding(
  telegramUserId: string,
  tenantId: string,
  tenantName: string
): Promise<void> {
  const ref = col.doc(telegramUserId);
  const doc = await ref.get();

  if (doc.exists) {
    const data = doc.data() as UserBinding;
    const exists = data.bindings.some((b) => b.tenant_id === tenantId);
    if (!exists) {
      data.bindings.push({ tenant_id: tenantId, tenant_name: tenantName, role: 'admin' });
    }
    await ref.update({
      bindings: data.bindings,
      active_tenant_id: tenantId,
      active_tenant_name: tenantName,
      last_active_at: new Date(),
    });
  } else {
    await ref.set({
      bindings: [{ tenant_id: tenantId, tenant_name: tenantName, role: 'admin' }],
      active_tenant_id: tenantId,
      active_tenant_name: tenantName,
      created_at: new Date(),
      last_active_at: new Date(),
    });
  }
}

export async function switchTenant(
  telegramUserId: string,
  tenantId: string
): Promise<TenantBinding | null> {
  const ref = col.doc(telegramUserId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data() as UserBinding;
  const binding = data.bindings.find((b) => b.tenant_id === tenantId);
  if (!binding) return null;

  await ref.update({
    active_tenant_id: tenantId,
    active_tenant_name: binding.tenant_name,
    last_active_at: new Date(),
  });
  return binding;
}
```

**Step 3: 建立 pending-actions CRUD**

```typescript
// src/firestore/pending-actions.ts
import { firestore } from './client';

export interface PendingAction {
  id?: string;
  telegram_user_id: string;
  telegram_chat_id: string;
  tenant_id: string;
  tenant_name: string;
  intent: string;
  params: Record<string, unknown>;
  confirm_message_id?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  created_at: Date;
  expires_at: Date;
}

const col = firestore.collection('bot_pending_actions');

export async function createPendingAction(action: Omit<PendingAction, 'id'>): Promise<string> {
  const ref = await col.add(action);
  return ref.id;
}

export async function getPendingAction(actionId: string): Promise<PendingAction | null> {
  const doc = await col.doc(actionId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as PendingAction;
}

export async function confirmAction(actionId: string): Promise<void> {
  await col.doc(actionId).update({ status: 'confirmed' });
}

export async function cancelAction(actionId: string): Promise<void> {
  await col.doc(actionId).update({ status: 'cancelled' });
}

export async function getPendingByUser(telegramUserId: string): Promise<PendingAction | null> {
  const snapshot = await col
    .where('telegram_user_id', '==', telegramUserId)
    .where('status', '==', 'pending')
    .orderBy('created_at', 'desc')
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as PendingAction;
}
```

**Step 4: 建立 cache CRUD**

```typescript
// src/firestore/cache.ts
import { firestore } from './client';

export interface TenantCache {
  students: Array<{ id: string; name: string; class_name: string }>;
  classes: string[];
  items: Array<{ id: string; name: string; stock: number }>;
  warehouses: Array<{ id: string; name: string }>;
  last_synced_at: Date;
}

const col = firestore.collection('bot_tenant_cache');

export async function getCache(tenantId: string): Promise<TenantCache | null> {
  const doc = await col.doc(tenantId).get();
  return doc.exists ? (doc.data() as TenantCache) : null;
}

export async function setCache(tenantId: string, data: TenantCache): Promise<void> {
  await col.doc(tenantId).set(data);
}

export async function isCacheStale(tenantId: string, maxAgeMs = 24 * 60 * 60 * 1000): Promise<boolean> {
  const cache = await getCache(tenantId);
  if (!cache) return true;
  return Date.now() - cache.last_synced_at.getTime() > maxAgeMs;
}
```

**Step 5: 建立 logs CRUD**

```typescript
// src/firestore/logs.ts
import { firestore } from './client';

export interface OperationLog {
  telegram_user_id: string;
  tenant_id: string;
  tenant_name: string;
  intent: string;
  params: Record<string, unknown>;
  status: 'confirmed' | 'cancelled' | 'error';
  api_response?: Record<string, unknown>;
  error_message?: string;
  created_at: Date;
}

const col = firestore.collection('bot_operation_logs');

export async function logOperation(log: OperationLog): Promise<void> {
  await col.add(log);
}
```

**Step 6: Commit**

```bash
git add apps/bot-gateway/src/firestore/
git commit -m "feat(bot-gateway): add Firestore modules for bindings, actions, cache, logs"
```

---

## Task 3: Bot Gateway — Telegram 工具與 Platform Adapter

**Files:**
- Create: `apps/bot-gateway/src/utils/telegram.ts`
- Create: `apps/bot-gateway/src/modules/platform-adapter.ts`

**Step 1: Telegram API 工具函式**

```typescript
// src/utils/telegram.ts
import { config } from '../config';

const BASE = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from: { id: number; first_name: string; last_name?: string; username?: string };
  chat: { id: number; type: string };
  text?: string;
  date: number;
}

export interface CallbackQuery {
  id: string;
  from: { id: number; first_name: string };
  message?: TelegramMessage;
  data?: string;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  options?: { reply_markup?: { inline_keyboard: InlineKeyboardButton[][] } }
): Promise<TelegramMessage> {
  const res = await fetch(`${BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...options }),
  });
  const data = await res.json();
  return data.result;
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await fetch(`${BASE}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

export async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  options?: { reply_markup?: { inline_keyboard: InlineKeyboardButton[][] } }
): Promise<void> {
  await fetch(`${BASE}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', ...options }),
  });
}

export async function setWebhook(url: string): Promise<void> {
  await fetch(`${BASE}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
}
```

**Step 2: Platform Adapter**

```typescript
// src/modules/platform-adapter.ts
import type { TelegramUpdate, TelegramMessage, CallbackQuery } from '../utils/telegram';

export interface UnifiedMessage {
  platform: 'telegram';
  userId: string;
  chatId: string;
  userName: string;
  messageType: 'text' | 'callback';
  content: string;
  callbackQueryId?: string;
  originalMessageId?: number;
  timestamp: Date;
}

export function parseTelegramUpdate(update: TelegramUpdate): UnifiedMessage | null {
  if (update.callback_query) {
    const cq = update.callback_query;
    return {
      platform: 'telegram',
      userId: String(cq.from.id),
      chatId: String(cq.message?.chat.id ?? cq.from.id),
      userName: cq.from.first_name,
      messageType: 'callback',
      content: cq.data ?? '',
      callbackQueryId: cq.id,
      originalMessageId: cq.message?.message_id,
      timestamp: new Date(),
    };
  }

  if (update.message?.text) {
    const msg = update.message;
    return {
      platform: 'telegram',
      userId: String(msg.from.id),
      chatId: String(msg.chat.id),
      userName: msg.from.first_name,
      messageType: 'text',
      content: msg.text,
      timestamp: new Date(),
    };
  }

  return null;
}
```

**Step 3: Commit**

```bash
git add apps/bot-gateway/src/utils/ apps/bot-gateway/src/modules/platform-adapter.ts
git commit -m "feat(bot-gateway): add Telegram utils and platform adapter"
```

---

## Task 4: Bot Gateway — API Client（呼叫三個後端）

**Files:**
- Create: `apps/bot-gateway/src/modules/api-client.ts`

**Step 1: 實作 API Client**

```typescript
// src/modules/api-client.ts
import { GoogleAuth } from 'google-auth-library';
import { config } from '../config';

const SERVICES = {
  manage: config.MANAGE_URL,
  inclass: config.INCLASS_URL,
  stock: config.STOCK_URL,
} as const;

type ServiceName = keyof typeof SERVICES;

const auth = new GoogleAuth();

export interface BotApiResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
  suggestions?: Array<Record<string, unknown>>;
}

export async function callBotApi(
  service: ServiceName,
  path: string,
  body: Record<string, unknown>
): Promise<BotApiResponse> {
  const baseUrl = SERVICES[service];
  // manage-backend 的 bot 路由掛在 /api/bot-ext，其他掛在 /api/bot
  const prefix = service === 'manage' ? '/api/bot-ext' : '/api/bot';
  const url = `${baseUrl}${prefix}${path}`;

  try {
    const client = await auth.getIdTokenClient(baseUrl);
    const res = await client.request<BotApiResponse>({
      url,
      method: 'POST',
      data: body,
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown API error';
    console.error(`[API Client] ${service}${path} failed:`, message);
    return { success: false, error: 'api_error', message };
  }
}
```

**Step 2: Commit**

```bash
git add apps/bot-gateway/src/modules/api-client.ts
git commit -m "feat(bot-gateway): add API client with GCP IAM auth for calling backends"
```

---

## Task 5: Bot Gateway — AI Engine（Gemini 意圖解析）

**Files:**
- Create: `apps/bot-gateway/src/modules/ai-engine.ts`

**Step 1: 實作 AI 意圖解析**

```typescript
// src/modules/ai-engine.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import type { TenantCache } from '../firestore/cache';

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

export interface IntentResult {
  intent: string;
  confidence: number;
  params: Record<string, unknown>;
  need_clarification: boolean;
  clarification_question: string | null;
}

function buildSystemPrompt(cache: TenantCache | null): string {
  let prompt = `你是 94CramBot，一個補習班管理助手。你的工作是解析班主任的自然語言指令，判斷意圖並萃取參數。

可用的意圖：
- inclass.leave: 登記學生請假（需要：student_name, date, reason?）
- inclass.late: 登記學生遲到（需要：student_name, date）
- inclass.query: 查詢出缺勤（需要：class_name? 或 student_name?, date?）
- manage.payment: 登記繳費（需要：student_name, amount, payment_type?, date?）
- manage.add_student: 新增學生（需要：name, class_name?, parent_phone?, parent_name?）
- manage.query_student: 查學生資料（需要：student_name 或 keyword）
- manage.query_finance: 查財務報表（需要：start_date?, end_date?, payment_type?）
- stock.ship: 出貨（需要：item_name, quantity, destination）
- stock.restock: 進貨（需要：item_name, quantity）
- stock.query: 查庫存（需要：item_name?）
- system.switch: 切換補習班
- system.help: 查看使用說明
- unknown: 無法辨識

今天的日期是 ${new Date().toISOString().split('T')[0]}。
如果使用者說「今天」，date 就是今天。
如果使用者說「這個月」，start_date 是本月 1 號，end_date 是今天。

你必須輸出 JSON，格式如下：
{
  "intent": "意圖 ID",
  "confidence": 0.0-1.0,
  "params": { ... },
  "need_clarification": false,
  "clarification_question": null
}

如果資訊不足以確定意圖或參數，設 need_clarification 為 true 並提供 clarification_question。`;

  if (cache) {
    if (cache.students.length > 0) {
      prompt += `\n\n該補習班的學生名單：\n${cache.students.map((s) => `- ${s.name}（${s.class_name}，ID: ${s.id}）`).join('\n')}`;
    }
    if (cache.classes.length > 0) {
      prompt += `\n\n班級列表：${cache.classes.join('、')}`;
    }
    if (cache.items.length > 0) {
      prompt += `\n\n品項列表：\n${cache.items.map((i) => `- ${i.name}（庫存: ${i.stock}，ID: ${i.id}）`).join('\n')}`;
    }
    if (cache.warehouses.length > 0) {
      prompt += `\n\n倉庫/分校：\n${cache.warehouses.map((w) => `- ${w.name}（ID: ${w.id}）`).join('\n')}`;
    }
  }

  return prompt;
}

export async function parseIntent(
  userMessage: string,
  cache: TenantCache | null
): Promise<IntentResult> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  const systemPrompt = buildSystemPrompt(cache);

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
  });

  const text = result.response.text();
  try {
    return JSON.parse(text) as IntentResult;
  } catch {
    return {
      intent: 'unknown',
      confidence: 0,
      params: {},
      need_clarification: true,
      clarification_question: '抱歉，我沒聽懂，可以再說一次嗎？',
    };
  }
}
```

**Step 2: Commit**

```bash
git add apps/bot-gateway/src/modules/ai-engine.ts
git commit -m "feat(bot-gateway): add Gemini 2.0 Flash AI engine for intent parsing"
```

---

## Task 6: Bot Gateway — Auth Manager 與 Commands

**Files:**
- Create: `apps/bot-gateway/src/modules/auth-manager.ts`
- Create: `apps/bot-gateway/src/commands/bind.ts`
- Create: `apps/bot-gateway/src/commands/switch.ts`
- Create: `apps/bot-gateway/src/commands/sync.ts`
- Create: `apps/bot-gateway/src/commands/help.ts`

**Step 1: Auth Manager**

```typescript
// src/modules/auth-manager.ts
import { getBinding, type UserBinding } from '../firestore/bindings';

export interface AuthContext {
  telegramUserId: string;
  tenantId: string;
  tenantName: string;
  binding: UserBinding;
}

export async function authenticate(telegramUserId: string): Promise<AuthContext | null> {
  const binding = await getBinding(telegramUserId);
  if (!binding || binding.bindings.length === 0) return null;

  return {
    telegramUserId,
    tenantId: binding.active_tenant_id,
    tenantName: binding.active_tenant_name,
    binding,
  };
}
```

**Step 2: /bind command**

```typescript
// src/commands/bind.ts
import { firestore } from '../firestore/client';
import { addBinding } from '../firestore/bindings';
import { sendMessage } from '../utils/telegram';

export async function handleBind(chatId: string, userId: string, args: string): Promise<void> {
  const code = args.trim();
  if (!code || code.length !== 6) {
    await sendMessage(chatId, '❌ 格式錯誤，請輸入：/bind 123456');
    return;
  }

  const codeRef = firestore.collection('bot_bind_codes').doc(code);
  const codeDoc = await codeRef.get();

  if (!codeDoc.exists) {
    await sendMessage(chatId, '❌ 綁定碼不存在或已過期');
    return;
  }

  const codeData = codeDoc.data()!;
  if (codeData.used) {
    await sendMessage(chatId, '❌ 此綁定碼已被使用');
    return;
  }

  const expiresAt = codeData.expires_at?.toDate?.() ?? new Date(codeData.expires_at);
  if (expiresAt < new Date()) {
    await sendMessage(chatId, '❌ 綁定碼已過期，請重新生成');
    return;
  }

  await codeRef.update({ used: true });
  await addBinding(userId, codeData.tenant_id, codeData.tenant_name);

  await sendMessage(
    chatId,
    `✅ 綁定成功！\n🏫 ${codeData.tenant_name}\n\n現在可以直接輸入指令操作，例如：\n「陳小明今天請假」\n「高二陳小明繳5000元」`
  );
}
```

**Step 3: /switch command**

```typescript
// src/commands/switch.ts
import { getBinding, switchTenant } from '../firestore/bindings';
import { sendMessage } from '../utils/telegram';

export async function handleSwitch(chatId: string, userId: string, args: string): Promise<void> {
  const binding = await getBinding(userId);
  if (!binding || binding.bindings.length === 0) {
    await sendMessage(chatId, '❌ 尚未綁定任何補習班，請先使用 /bind');
    return;
  }

  if (binding.bindings.length === 1) {
    await sendMessage(chatId, `你只有綁定一間補習班：${binding.active_tenant_name}`);
    return;
  }

  const choice = args.trim();
  if (!choice) {
    const list = binding.bindings
      .map((b, i) => {
        const current = b.tenant_id === binding.active_tenant_id ? ' ← 目前' : '';
        return `${i + 1}️⃣ ${b.tenant_name}${current}`;
      })
      .join('\n');
    await sendMessage(chatId, `🏫 你管理的補習班：\n${list}\n\n請回覆數字切換，例如：/switch 2`);
    return;
  }

  const index = parseInt(choice) - 1;
  if (isNaN(index) || index < 0 || index >= binding.bindings.length) {
    await sendMessage(chatId, '❌ 無效的選擇');
    return;
  }

  const target = binding.bindings[index];
  await switchTenant(userId, target.tenant_id);
  await sendMessage(chatId, `✅ 已切換到：${target.tenant_name}\n接下來的操作都會在這裡執行。`);
}
```

**Step 4: /sync command**

```typescript
// src/commands/sync.ts
import { callBotApi } from '../modules/api-client';
import { setCache, type TenantCache } from '../firestore/cache';
import { authenticate } from '../modules/auth-manager';
import { sendMessage } from '../utils/telegram';

export async function handleSync(chatId: string, userId: string): Promise<void> {
  const auth = await authenticate(userId);
  if (!auth) {
    await sendMessage(chatId, '❌ 尚未綁定補習班，請先使用 /bind');
    return;
  }

  await sendMessage(chatId, '🔄 正在同步資料...');

  const body = { tenant_id: auth.tenantId };
  const [studentsRes, classesRes, itemsRes, warehousesRes] = await Promise.all([
    callBotApi('manage', '/data/students', body),
    callBotApi('manage', '/data/classes', body),
    callBotApi('stock', '/data/items', body),
    callBotApi('stock', '/data/warehouses', body),
  ]);

  const cache: TenantCache = {
    students: (studentsRes.data as unknown as TenantCache['students']) ?? [],
    classes: (classesRes.data as unknown as TenantCache['classes']) ?? [],
    items: (itemsRes.data as unknown as TenantCache['items']) ?? [],
    warehouses: (warehousesRes.data as unknown as TenantCache['warehouses']) ?? [],
    last_synced_at: new Date(),
  };

  await setCache(auth.tenantId, cache);
  await sendMessage(
    chatId,
    `✅ 同步完成！\n📚 學生 ${cache.students.length} 人\n🏫 班級 ${cache.classes.length} 個\n📦 品項 ${cache.items.length} 個\n🏪 倉庫 ${cache.warehouses.length} 個`
  );
}
```

**Step 5: /help command**

```typescript
// src/commands/help.ts
import { sendMessage } from '../utils/telegram';

export async function handleHelp(chatId: string): Promise<void> {
  await sendMessage(
    chatId,
    `🤖 <b>94CramBot 使用說明</b>

<b>📋 點名系統</b>
• 「陳小明今天請假」→ 登記請假
• 「王大明遲到」→ 登記遲到
• 「今天高一到課狀況」→ 查出缺勤

<b>💰 帳務系統</b>
• 「高二陳小明繳5000元」→ 登記繳費
• 「這個月收了多少學費」→ 查收費摘要
• 「陳小明繳費紀錄」→ 查繳費歷史

<b>📦 庫存系統</b>
• 「寄文學館1店 紅色鐵盒100本」→ 出貨
• 「進貨 科學筆記200本」→ 進貨
• 「紅色鐵盒還剩幾本」→ 查庫存

<b>⚙️ 系統指令</b>
• /bind 123456 → 綁定補習班
• /switch → 切換補習班
• /sync → 同步資料
• /help → 顯示本說明

所有<b>寫入操作</b>都會先確認才執行！`
  );
}
```

**Step 6: Commit**

```bash
git add apps/bot-gateway/src/modules/auth-manager.ts apps/bot-gateway/src/commands/
git commit -m "feat(bot-gateway): add auth manager and bot commands (bind, switch, sync, help)"
```

---

## Task 7: Bot Gateway — Confirm Manager 與 Intent Router

**Files:**
- Create: `apps/bot-gateway/src/modules/confirm-manager.ts`
- Create: `apps/bot-gateway/src/handlers/intent-router.ts`
- Create: `apps/bot-gateway/src/handlers/callback.ts`

**Step 1: Confirm Manager**

```typescript
// src/modules/confirm-manager.ts
import { createPendingAction, confirmAction, cancelAction, getPendingAction } from '../firestore/pending-actions';
import { sendMessage, type InlineKeyboardButton } from '../utils/telegram';
import type { IntentResult } from './ai-engine';

const INTENT_LABELS: Record<string, string> = {
  'inclass.leave': '登記請假',
  'inclass.late': '登記遲到',
  'manage.payment': '登記繳費',
  'manage.add_student': '新增學生',
  'stock.ship': '出貨（減庫存）',
  'stock.restock': '進貨（加庫存）',
};

function formatParams(intent: string, params: Record<string, unknown>): string {
  const lines: string[] = [];
  if (params.student_name) lines.push(`學生：${params.student_name}`);
  if (params.class_name) lines.push(`班級：${params.class_name}`);
  if (params.date) lines.push(`日期：${params.date}`);
  if (params.reason) lines.push(`原因：${params.reason}`);
  if (params.amount) lines.push(`金額：NT$ ${Number(params.amount).toLocaleString()}`);
  if (params.item_name) lines.push(`品項：${params.item_name}`);
  if (params.quantity) lines.push(`數量：${params.quantity}`);
  if (params.destination) lines.push(`目的地：${params.destination}`);
  if (params.name) lines.push(`姓名：${params.name}`);
  if (params.parent_phone) lines.push(`家長電話：${params.parent_phone}`);
  return lines.join('\n');
}

export async function requestConfirmation(
  chatId: string,
  userId: string,
  tenantId: string,
  tenantName: string,
  intentResult: IntentResult
): Promise<void> {
  const label = INTENT_LABELS[intentResult.intent] ?? intentResult.intent;
  const paramText = formatParams(intentResult.intent, intentResult.params);

  const actionId = await createPendingAction({
    telegram_user_id: userId,
    telegram_chat_id: chatId,
    tenant_id: tenantId,
    tenant_name: tenantName,
    intent: intentResult.intent,
    params: intentResult.params,
    status: 'pending',
    created_at: new Date(),
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
  });

  const text = `📋 請確認：\n🏫 ${tenantName}\n操作：${label}\n${paramText}`;

  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: '✅ 確認', callback_data: `confirm:${actionId}` },
      { text: '❌ 取消', callback_data: `cancel:${actionId}` },
    ],
  ];

  const msg = await sendMessage(chatId, text, { reply_markup: { inline_keyboard: keyboard } });
  // 不需要更新 confirm_message_id，callback 已包含 actionId
}

export { confirmAction, cancelAction, getPendingAction };
```

**Step 2: Intent Router**

```typescript
// src/handlers/intent-router.ts
import { callBotApi, type BotApiResponse } from '../modules/api-client';
import type { IntentResult } from '../modules/ai-engine';
import type { AuthContext } from '../modules/auth-manager';

// 查詢類意圖：直接呼叫 API 並返回結果
const QUERY_INTENTS = ['inclass.query', 'manage.query_student', 'manage.query_finance', 'stock.query'];

// 寫入類意圖：需要確認
const WRITE_INTENTS = [
  'inclass.leave', 'inclass.late',
  'manage.payment', 'manage.add_student',
  'stock.ship', 'stock.restock',
];

export function isQueryIntent(intent: string): boolean {
  return QUERY_INTENTS.includes(intent);
}

export function isWriteIntent(intent: string): boolean {
  return WRITE_INTENTS.includes(intent);
}

const INTENT_API_MAP: Record<string, { service: 'manage' | 'inclass' | 'stock'; path: string }> = {
  'inclass.leave': { service: 'inclass', path: '/attendance/leave' },
  'inclass.late': { service: 'inclass', path: '/attendance/late' },
  'inclass.query': { service: 'inclass', path: '/attendance/list' },
  'manage.payment': { service: 'manage', path: '/finance/payment' },
  'manage.add_student': { service: 'manage', path: '/student/create' },
  'manage.query_student': { service: 'manage', path: '/student/search' },
  'manage.query_finance': { service: 'manage', path: '/finance/summary' },
  'stock.ship': { service: 'stock', path: '/stock/ship' },
  'stock.restock': { service: 'stock', path: '/stock/restock' },
  'stock.query': { service: 'stock', path: '/stock/check' },
};

export async function executeIntent(
  intent: IntentResult,
  auth: AuthContext
): Promise<BotApiResponse> {
  const mapping = INTENT_API_MAP[intent.intent];
  if (!mapping) {
    return { success: false, error: 'unknown_intent', message: '無法處理此指令' };
  }

  const body = {
    tenant_id: auth.tenantId,
    ...intent.params,
  };

  return callBotApi(mapping.service, mapping.path, body);
}

export function formatResponse(res: BotApiResponse): string {
  if (res.success) {
    return `✅ ${res.message ?? '操作成功'}`;
  }

  let text = `❌ ${res.message ?? '操作失敗'}`;
  if (res.suggestions && res.suggestions.length > 0) {
    text += '\n\n你是不是要找：';
    res.suggestions.forEach((s, i) => {
      text += `\n${i + 1}. ${s.name ?? s.student_name ?? JSON.stringify(s)}`;
    });
  }
  return text;
}
```

**Step 3: Callback handler**

```typescript
// src/handlers/callback.ts
import { getPendingAction, confirmAction, cancelAction } from '../modules/confirm-manager';
import { executeIntent } from './intent-router';
import { formatResponse } from './intent-router';
import { authenticate } from '../modules/auth-manager';
import { logOperation } from '../firestore/logs';
import { answerCallbackQuery, editMessageText } from '../utils/telegram';
import type { UnifiedMessage } from '../modules/platform-adapter';

export async function handleCallback(msg: UnifiedMessage): Promise<void> {
  const [action, actionId] = msg.content.split(':');
  if (!actionId) return;

  await answerCallbackQuery(msg.callbackQueryId!);

  const pending = await getPendingAction(actionId);
  if (!pending || pending.status !== 'pending') {
    if (msg.originalMessageId) {
      await editMessageText(msg.chatId, msg.originalMessageId, '⚠️ 此操作已過期或已處理');
    }
    return;
  }

  if (pending.expires_at < new Date()) {
    await cancelAction(actionId);
    if (msg.originalMessageId) {
      await editMessageText(msg.chatId, msg.originalMessageId, '⏰ 此操作已逾時，已自動取消');
    }
    return;
  }

  if (action === 'cancel') {
    await cancelAction(actionId);
    await logOperation({
      telegram_user_id: msg.userId,
      tenant_id: pending.tenant_id,
      tenant_name: pending.tenant_name,
      intent: pending.intent,
      params: pending.params,
      status: 'cancelled',
      created_at: new Date(),
    });
    if (msg.originalMessageId) {
      await editMessageText(msg.chatId, msg.originalMessageId, '❌ 已取消');
    }
    return;
  }

  if (action === 'confirm') {
    await confirmAction(actionId);

    const auth = await authenticate(msg.userId);
    if (!auth) return;

    const intentResult = {
      intent: pending.intent,
      confidence: 1,
      params: pending.params,
      need_clarification: false,
      clarification_question: null,
    };

    const apiResponse = await executeIntent(intentResult, auth);
    const responseText = formatResponse(apiResponse);

    await logOperation({
      telegram_user_id: msg.userId,
      tenant_id: pending.tenant_id,
      tenant_name: pending.tenant_name,
      intent: pending.intent,
      params: pending.params,
      status: apiResponse.success ? 'confirmed' : 'error',
      api_response: apiResponse as unknown as Record<string, unknown>,
      error_message: apiResponse.success ? undefined : apiResponse.message,
      created_at: new Date(),
    });

    if (msg.originalMessageId) {
      await editMessageText(msg.chatId, msg.originalMessageId, responseText);
    }
  }
}
```

**Step 4: Commit**

```bash
git add apps/bot-gateway/src/modules/confirm-manager.ts apps/bot-gateway/src/handlers/
git commit -m "feat(bot-gateway): add confirm manager, intent router, and callback handler"
```

---

## Task 8: Bot Gateway — Webhook 路由與主流程整合

**Files:**
- Create: `apps/bot-gateway/src/webhooks/telegram.ts`
- Create: `apps/bot-gateway/src/utils/rate-limit.ts`
- Modify: `apps/bot-gateway/src/app.ts`

**Step 1: Rate Limiter**

```typescript
// src/utils/rate-limit.ts
const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(userId: string, maxPerMinute = 30): boolean {
  const now = Date.now();
  const entry = store.get(userId);
  if (entry && now < entry.resetAt) {
    entry.count++;
    return entry.count <= maxPerMinute;
  }
  store.set(userId, { count: 1, resetAt: now + 60000 });
  return true;
}

// 定期清理
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}, 300000);
```

**Step 2: Telegram Webhook 路由**

```typescript
// src/webhooks/telegram.ts
import { Hono } from 'hono';
import { parseTelegramUpdate } from '../modules/platform-adapter';
import { authenticate } from '../modules/auth-manager';
import { parseIntent } from '../modules/ai-engine';
import { getCache } from '../firestore/cache';
import { requestConfirmation } from '../modules/confirm-manager';
import { executeIntent, isQueryIntent, isWriteIntent, formatResponse } from '../handlers/intent-router';
import { handleCallback } from '../handlers/callback';
import { handleBind } from '../commands/bind';
import { handleSwitch } from '../commands/switch';
import { handleSync } from '../commands/sync';
import { handleHelp } from '../commands/help';
import { sendMessage } from '../utils/telegram';
import { checkRateLimit } from '../utils/rate-limit';
import type { TelegramUpdate } from '../utils/telegram';

export const telegramWebhook = new Hono();

telegramWebhook.post('/', async (c) => {
  const update: TelegramUpdate = await c.req.json();
  const msg = parseTelegramUpdate(update);
  if (!msg) return c.json({ ok: true });

  // Rate limit
  if (!checkRateLimit(msg.userId)) {
    await sendMessage(msg.chatId, '⚠️ 操作太頻繁，請稍後再試');
    return c.json({ ok: true });
  }

  // Callback query (confirm/cancel)
  if (msg.messageType === 'callback') {
    await handleCallback(msg);
    return c.json({ ok: true });
  }

  // Commands
  const text = msg.content.trim();
  if (text.startsWith('/bind')) {
    await handleBind(msg.chatId, msg.userId, text.replace('/bind', '').trim());
    return c.json({ ok: true });
  }
  if (text.startsWith('/switch')) {
    await handleSwitch(msg.chatId, msg.userId, text.replace('/switch', '').trim());
    return c.json({ ok: true });
  }
  if (text === '/sync') {
    await handleSync(msg.chatId, msg.userId);
    return c.json({ ok: true });
  }
  if (text === '/help' || text === '/start') {
    await handleHelp(msg.chatId);
    return c.json({ ok: true });
  }

  // Auth check
  const auth = await authenticate(msg.userId);
  if (!auth) {
    await sendMessage(
      msg.chatId,
      '👋 歡迎使用 94CramBot！\n\n請先在 94Manage 後台生成綁定碼，然後輸入：\n/bind 123456'
    );
    return c.json({ ok: true });
  }

  // AI intent parsing
  try {
    const cache = await getCache(auth.tenantId);
    const intent = await parseIntent(text, cache);

    if (intent.need_clarification) {
      await sendMessage(msg.chatId, `🤔 ${intent.clarification_question}`);
      return c.json({ ok: true });
    }

    if (intent.intent === 'unknown') {
      await sendMessage(msg.chatId, '🤔 我沒聽懂，可以換個方式說嗎？\n輸入 /help 查看使用說明');
      return c.json({ ok: true });
    }

    if (intent.intent.startsWith('system.')) {
      if (intent.intent === 'system.switch') {
        await handleSwitch(msg.chatId, msg.userId, '');
      } else {
        await handleHelp(msg.chatId);
      }
      return c.json({ ok: true });
    }

    // Query intents: execute directly
    if (isQueryIntent(intent.intent)) {
      const result = await executeIntent(intent, auth);
      await sendMessage(msg.chatId, formatResponse(result));
      return c.json({ ok: true });
    }

    // Write intents: request confirmation
    if (isWriteIntent(intent.intent)) {
      await requestConfirmation(msg.chatId, msg.userId, auth.tenantId, auth.tenantName, intent);
      return c.json({ ok: true });
    }

    await sendMessage(msg.chatId, '🤔 我不確定要怎麼處理這個指令');
  } catch (error) {
    console.error('[Webhook] Error processing message:', error);
    await sendMessage(msg.chatId, '⚠️ 系統發生錯誤，請稍後再試');
  }

  return c.json({ ok: true });
});
```

**Step 3: 更新 app.ts 掛載 webhook**

```typescript
// src/app.ts（完整版）
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { telegramWebhook } from './webhooks/telegram';

export const app = new Hono();

app.use('/*', cors());

app.get('/', (c) => c.json({ message: '94CramBot Gateway API', status: 'running' }));
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// Telegram webhook
app.route('/webhook/telegram', telegramWebhook);
```

**Step 4: 驗證建置**

```bash
cd apps/bot-gateway && pnpm build
```

**Step 5: Commit**

```bash
git add apps/bot-gateway/src/
git commit -m "feat(bot-gateway): integrate webhook, AI engine, confirm flow, and commands"
```

---

## Task 9: 三個後端 — 共用 botAuth Middleware

在三個後端各自新增 `botAuth.ts` middleware。邏輯相同但各自獨立（因為 import 的 config 和 context type 不同）。

**Files:**
- Create: `apps/manage-backend/src/middleware/botAuth.ts`
- Create: `apps/inclass-backend/src/middleware/botAuth.ts`
- Create: `apps/stock-backend/src/middleware/botAuth.ts`
- Modify: `apps/manage-backend/package.json` — 加 `google-auth-library`
- Modify: `apps/inclass-backend/package.json` — 加 `google-auth-library`
- Modify: `apps/stock-backend/package.json` — 加 `google-auth-library`

**Step 1: manage-backend botAuth.ts**

```typescript
// apps/manage-backend/src/middleware/botAuth.ts
import { createMiddleware } from 'hono/factory';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();
const BOT_SERVICE_ACCOUNT = 'cram94-bot-gateway@cram94-manage-system.iam.gserviceaccount.com';

export const botAuth = createMiddleware(async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: '未授權：缺少 token' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.SERVICE_URL,
    });

    const payload = ticket.getPayload();
    if (payload?.email !== BOT_SERVICE_ACCOUNT) {
      return c.json({ success: false, error: '非授權服務' }, 403);
    }

    const body = await c.req.json();
    const tenantId = body.tenant_id;
    if (!tenantId) {
      return c.json({ success: false, error: '缺少 tenant_id' }, 400);
    }

    c.set('tenantId', tenantId);
    c.set('botRequest', true);
    await next();
  } catch (error) {
    console.error('[botAuth] Error:', error instanceof Error ? error.message : error);
    return c.json({ success: false, error: '認證失敗' }, 401);
  }
});
```

**Step 2: inclass-backend botAuth.ts**

```typescript
// apps/inclass-backend/src/middleware/botAuth.ts
import { createMiddleware } from 'hono/factory';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();
const BOT_SERVICE_ACCOUNT = 'cram94-bot-gateway@cram94-manage-system.iam.gserviceaccount.com';

export const botAuth = createMiddleware(async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: '未授權：缺少 token' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.SERVICE_URL,
    });

    const payload = ticket.getPayload();
    if (payload?.email !== BOT_SERVICE_ACCOUNT) {
      return c.json({ success: false, error: '非授權服務' }, 403);
    }

    const body = await c.req.json();
    const tenantId = body.tenant_id;
    if (!tenantId) {
      return c.json({ success: false, error: '缺少 tenant_id' }, 400);
    }

    // inclass 用 schoolId
    c.set('schoolId', tenantId);
    c.set('userId', 'bot-gateway');
    await next();
  } catch (error) {
    console.error('[botAuth] Error:', error instanceof Error ? error.message : error);
    return c.json({ success: false, error: '認證失敗' }, 401);
  }
});
```

**Step 3: stock-backend botAuth.ts**

```typescript
// apps/stock-backend/src/middleware/botAuth.ts
import { createMiddleware } from 'hono/factory';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();
const BOT_SERVICE_ACCOUNT = 'cram94-bot-gateway@cram94-manage-system.iam.gserviceaccount.com';

export const botAuth = createMiddleware(async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: '未授權：缺少 token' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.SERVICE_URL,
    });

    const payload = ticket.getPayload();
    if (payload?.email !== BOT_SERVICE_ACCOUNT) {
      return c.json({ success: false, error: '非授權服務' }, 403);
    }

    const body = await c.req.json();
    const tenantId = body.tenant_id;
    if (!tenantId) {
      return c.json({ success: false, error: '缺少 tenant_id' }, 400);
    }

    c.set('tenantId', tenantId);
    await next();
  } catch (error) {
    console.error('[botAuth] Error:', error instanceof Error ? error.message : error);
    return c.json({ success: false, error: '認證失敗' }, 401);
  }
});
```

**Step 4: 安裝 google-auth-library 到三個後端**

```bash
cd /Users/dali/Github/94CramManageSystem
pnpm --filter @94cram/manage-backend add google-auth-library
pnpm --filter @94cram/inclass-backend add google-auth-library
pnpm --filter @94cram/stock-backend add google-auth-library
```

**Step 5: Commit**

```bash
git add apps/manage-backend/src/middleware/botAuth.ts apps/manage-backend/package.json \
        apps/inclass-backend/src/middleware/botAuth.ts apps/inclass-backend/package.json \
        apps/stock-backend/src/middleware/botAuth.ts apps/stock-backend/package.json \
        pnpm-lock.yaml
git commit -m "feat: add botAuth middleware with GCP IAM verification to all 3 backends"
```

---

## Task 10: inclass-backend — Bot API 路由

**Files:**
- Create: `apps/inclass-backend/src/routes/bot/index.ts`
- Create: `apps/inclass-backend/src/routes/bot/attendance.ts`
- Create: `apps/inclass-backend/src/routes/bot/data.ts`
- Modify: `apps/inclass-backend/src/index.ts` — 掛載路由 + skip JWT for /api/bot/*

**Step 1: attendance.ts**

參考 schema：`inclassAttendances` 表有 tenantId, studentId, courseId, date, status, note。
學生在 `manageStudents` 表，用 tenantId + name 查詢。

```typescript
// apps/inclass-backend/src/routes/bot/attendance.ts
import { Hono } from 'hono';
import { db } from '../../db/index.js';
import { manageStudents, manageCourses, inclassAttendances } from '@94cram/shared/db';
import { eq, and, like, sql } from 'drizzle-orm';

const app = new Hono();

// POST /attendance/leave
app.post('/leave', async (c) => {
  try {
    const { tenant_id, student_name, student_id, date, reason } = await c.req.json();
    const schoolId = c.get('schoolId') as string;

    // 查找學生
    let students;
    if (student_id) {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.id, student_id)));
    } else {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.name, student_name)));
    }

    if (students.length === 0) {
      const suggestions = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), like(manageStudents.name, `%${student_name}%`)))
        .limit(5);
      return c.json({
        success: false,
        error: 'student_not_found',
        message: `找不到學生「${student_name}」`,
        suggestions: suggestions.map(s => ({ student_id: s.id, name: s.name, class: s.grade })),
      });
    }

    const student = students[0];
    const targetDate = date || new Date().toISOString().split('T')[0];

    // 查找該學生的課程（取第一個 active enrollment 的 courseId）
    const enrollments = await db.select().from(manageCourses)
      .where(eq(manageCourses.tenantId, schoolId))
      .limit(1);
    const courseId = enrollments[0]?.id;

    if (courseId) {
      await db.insert(inclassAttendances).values({
        tenantId: schoolId,
        studentId: student.id,
        courseId,
        date: new Date(targetDate),
        status: 'leave',
        note: reason || '由 94CramBot 登記',
      });
    }

    return c.json({
      success: true,
      message: `已登記 ${student.name} ${targetDate} 請假`,
      data: { student_name: student.name, class_name: student.grade, date: targetDate, status: 'leave' },
    });
  } catch (error) {
    console.error('[Bot] leave error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /attendance/late
app.post('/late', async (c) => {
  try {
    const { tenant_id, student_name, student_id, date } = await c.req.json();
    const schoolId = c.get('schoolId') as string;

    let students;
    if (student_id) {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.id, student_id)));
    } else {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.name, student_name)));
    }

    if (students.length === 0) {
      const suggestions = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), like(manageStudents.name, `%${student_name}%`)))
        .limit(5);
      return c.json({
        success: false, error: 'student_not_found',
        message: `找不到學生「${student_name}」`,
        suggestions: suggestions.map(s => ({ student_id: s.id, name: s.name, class: s.grade })),
      });
    }

    const student = students[0];
    const targetDate = date || new Date().toISOString().split('T')[0];

    const enrollments = await db.select().from(manageCourses)
      .where(eq(manageCourses.tenantId, schoolId)).limit(1);
    const courseId = enrollments[0]?.id;

    if (courseId) {
      await db.insert(inclassAttendances).values({
        tenantId: schoolId,
        studentId: student.id,
        courseId,
        date: new Date(targetDate),
        status: 'late',
        checkInTime: new Date(),
        checkInMethod: 'manual',
        note: '由 94CramBot 登記',
      });
    }

    return c.json({
      success: true,
      message: `已登記 ${student.name} ${targetDate} 遲到`,
      data: { student_name: student.name, class_name: student.grade, date: targetDate, status: 'late' },
    });
  } catch (error) {
    console.error('[Bot] late error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /attendance/list
app.post('/list', async (c) => {
  try {
    const { tenant_id, class_name, date } = await c.req.json();
    const schoolId = c.get('schoolId') as string;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const records = await db.select({
      id: inclassAttendances.id,
      studentName: manageStudents.name,
      className: manageStudents.grade,
      status: inclassAttendances.status,
      note: inclassAttendances.note,
    })
      .from(inclassAttendances)
      .innerJoin(manageStudents, eq(inclassAttendances.studentId, manageStudents.id))
      .where(
        and(
          eq(inclassAttendances.tenantId, schoolId),
          sql`DATE(${inclassAttendances.date}) = ${targetDate}`,
          class_name ? eq(manageStudents.grade, class_name) : undefined,
        )
      );

    return c.json({
      success: true,
      message: `${targetDate} ${class_name || '全校'}出缺勤狀況`,
      data: {
        date: targetDate,
        class_name,
        total: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        leave: records.filter(r => r.status === 'leave').length,
        late: records.filter(r => r.status === 'late').length,
        records,
      },
    });
  } catch (error) {
    console.error('[Bot] list error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /attendance/report
app.post('/report', async (c) => {
  try {
    const { tenant_id, student_name, student_id, start_date, end_date } = await c.req.json();
    const schoolId = c.get('schoolId') as string;

    let students;
    if (student_id) {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.id, student_id)));
    } else {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.name, student_name)));
    }

    if (students.length === 0) {
      return c.json({ success: false, error: 'student_not_found', message: `找不到學生「${student_name}」` });
    }

    const student = students[0];
    const records = await db.select().from(inclassAttendances)
      .where(
        and(
          eq(inclassAttendances.tenantId, schoolId),
          eq(inclassAttendances.studentId, student.id),
          start_date ? sql`${inclassAttendances.date} >= ${start_date}` : undefined,
          end_date ? sql`${inclassAttendances.date} <= ${end_date}` : undefined,
        )
      );

    return c.json({
      success: true,
      message: `${student.name} ${start_date || ''}~${end_date || ''} 出缺勤報告`,
      data: {
        student_name: student.name,
        total: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        leave: records.filter(r => r.status === 'leave').length,
        late: records.filter(r => r.status === 'late').length,
      },
    });
  } catch (error) {
    console.error('[Bot] report error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

export default app;
```

**Step 2: data.ts**

```typescript
// apps/inclass-backend/src/routes/bot/data.ts
import { Hono } from 'hono';
import { db } from '../../db/index.js';
import { manageStudents, manageCourses } from '@94cram/shared/db';
import { eq } from 'drizzle-orm';

const app = new Hono();

// POST /data/students
app.post('/students', async (c) => {
  try {
    const schoolId = c.get('schoolId') as string;
    const students = await db.select().from(manageStudents)
      .where(eq(manageStudents.tenantId, schoolId));

    return c.json({
      success: true,
      data: students.map(s => ({ student_id: s.id, name: s.name, class_name: s.grade })),
    });
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /data/classes
app.post('/classes', async (c) => {
  try {
    const schoolId = c.get('schoolId') as string;
    const courses = await db.select().from(manageCourses)
      .where(eq(manageCourses.tenantId, schoolId));

    return c.json({
      success: true,
      data: courses.map(c => c.name),
    });
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

export default app;
```

**Step 3: routes/bot/index.ts**

```typescript
// apps/inclass-backend/src/routes/bot/index.ts
import { Hono } from 'hono';
import { botAuth } from '../../middleware/botAuth.js';
import attendance from './attendance.js';
import data from './data.js';

const app = new Hono();

app.use('*', botAuth);
app.route('/attendance', attendance);
app.route('/data', data);

export default app;
```

**Step 4: 修改 inclass-backend/src/index.ts**

在 JWT middleware 中 skip `/api/bot/*`，並掛載新路由。

在 `index.ts` 的 JWT middleware（第 100-121 行）中，加上 skip 條件：
```typescript
// 在 line 106 後加入：
if (c.req.path.startsWith('/api/bot/')) return next()
```

在路由掛載區（第 164 行前）加入：
```typescript
import botRoutes from './routes/bot/index.js'
// ...
app.route('/api/bot', botRoutes)
```

**Step 5: 驗證建置**

```bash
cd apps/inclass-backend && pnpm build
```

**Step 6: Commit**

```bash
git add apps/inclass-backend/src/routes/bot/ apps/inclass-backend/src/index.ts
git commit -m "feat(inclass-backend): add /api/bot/* routes for attendance and data queries"
```

---

## Task 11: manage-backend — Bot API 路由

**Files:**
- Create: `apps/manage-backend/src/routes/bot-ext/index.ts`
- Create: `apps/manage-backend/src/routes/bot-ext/finance.ts`
- Create: `apps/manage-backend/src/routes/bot-ext/student.ts`
- Create: `apps/manage-backend/src/routes/bot-ext/data.ts`
- Modify: `apps/manage-backend/src/app.ts` — 掛載 `/api/bot-ext` 路由

注意：manage-backend 的 DB 用 `postgres.js`（不同於 inclass 的 `pg`），且 schema 從本地 `./db/schema` import。

**Step 1: finance.ts**

```typescript
// apps/manage-backend/src/routes/bot-ext/finance.ts
import { Hono } from 'hono'
import { db } from '../../db'
import { manageStudents, managePayments, manageEnrollments } from '../../db/schema'
import { eq, and, like, sql, gte, lte } from 'drizzle-orm'

const app = new Hono()

// POST /finance/payment
app.post('/payment', async (c) => {
  try {
    const { tenant_id, student_name, student_id, amount, payment_type, date, note } = await c.req.json()
    const tenantId = c.get('tenantId') as string

    let students
    if (student_id) {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, tenantId), eq(manageStudents.id, student_id)))
    } else {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, tenantId), eq(manageStudents.name, student_name)))
    }

    if (students.length === 0) {
      const suggestions = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, tenantId), like(manageStudents.name, `%${student_name}%`)))
        .limit(5)
      return c.json({
        success: false, error: 'student_not_found',
        message: `找不到學生「${student_name}」`,
        suggestions: suggestions.map(s => ({ student_id: s.id, name: s.name, class_name: s.grade })),
      })
    }

    const student = students[0]
    const payDate = date || new Date().toISOString().split('T')[0]

    // 找到學生的 enrollment
    const enrollments = await db.select().from(manageEnrollments)
      .where(and(eq(manageEnrollments.tenantId, tenantId), eq(manageEnrollments.studentId, student.id)))
      .limit(1)

    if (enrollments.length > 0) {
      const [payment] = await db.insert(managePayments).values({
        tenantId,
        enrollmentId: enrollments[0].id,
        amount: String(amount),
        paymentMethod: payment_type || 'cash',
        paidAt: new Date(payDate),
        status: 'paid',
      }).returning()

      return c.json({
        success: true,
        message: `已登記 ${student.name} 繳費 NT$${Number(amount).toLocaleString()}`,
        data: {
          student_name: student.name,
          class_name: student.grade,
          amount,
          payment_type: payment_type || 'tuition',
          date: payDate,
          receipt_id: payment.id,
        },
      })
    }

    return c.json({ success: false, error: 'no_enrollment', message: `${student.name} 尚未報名任何課程` })
  } catch (error) {
    console.error('[Bot] payment error:', error)
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// POST /finance/summary
app.post('/summary', async (c) => {
  try {
    const { tenant_id, start_date, end_date } = await c.req.json()
    const tenantId = c.get('tenantId') as string

    const conditions = [eq(managePayments.tenantId, tenantId), eq(managePayments.status, 'paid')]
    if (start_date) conditions.push(gte(managePayments.paidAt, new Date(start_date)))
    if (end_date) conditions.push(lte(managePayments.paidAt, new Date(end_date)))

    const payments = await db.select().from(managePayments).where(and(...conditions))

    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0)

    return c.json({
      success: true,
      message: `${start_date || ''}~${end_date || ''} 收費摘要`,
      data: { total_amount: total, count: payments.length, start_date, end_date },
    })
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// POST /finance/history
app.post('/history', async (c) => {
  try {
    const { tenant_id, student_name, student_id } = await c.req.json()
    const tenantId = c.get('tenantId') as string

    let students
    if (student_id) {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, tenantId), eq(manageStudents.id, student_id)))
    } else {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, tenantId), eq(manageStudents.name, student_name)))
    }

    if (students.length === 0) {
      return c.json({ success: false, error: 'student_not_found', message: `找不到學生「${student_name}」` })
    }

    const student = students[0]
    const enrollments = await db.select().from(manageEnrollments)
      .where(and(eq(manageEnrollments.tenantId, tenantId), eq(manageEnrollments.studentId, student.id)))

    const enrollmentIds = enrollments.map(e => e.id)
    let payments: typeof managePayments.$inferSelect[] = []
    if (enrollmentIds.length > 0) {
      payments = await db.select().from(managePayments)
        .where(sql`${managePayments.enrollmentId} IN ${enrollmentIds}`)
    }

    return c.json({
      success: true,
      message: `${student.name} 繳費紀錄`,
      data: {
        student_name: student.name,
        payments: payments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.paymentMethod,
          date: p.paidAt,
          status: p.status,
        })),
      },
    })
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

export default app
```

**Step 2: student.ts**

```typescript
// apps/manage-backend/src/routes/bot-ext/student.ts
import { Hono } from 'hono'
import { db } from '../../db'
import { manageStudents } from '../../db/schema'
import { eq, and, like } from 'drizzle-orm'

const app = new Hono()

// POST /student/create
app.post('/create', async (c) => {
  try {
    const { tenant_id, name, class_name, parent_phone, parent_name } = await c.req.json()
    const tenantId = c.get('tenantId') as string

    const existing = await db.select().from(manageStudents)
      .where(and(eq(manageStudents.tenantId, tenantId), eq(manageStudents.name, name)))

    if (existing.length > 0) {
      return c.json({
        success: false, error: 'duplicate_name',
        message: `已存在名為「${name}」的學生`,
        suggestions: existing.map(s => ({ student_id: s.id, name: s.name, class_name: s.grade })),
      })
    }

    const [student] = await db.insert(manageStudents).values({
      tenantId,
      name,
      grade: class_name,
      guardianPhone: parent_phone,
      guardianName: parent_name,
    }).returning()

    return c.json({
      success: true,
      message: `已新增學生 ${name}（${class_name || '未分班'}）`,
      data: { student_id: student.id, name: student.name, class_name: student.grade },
    })
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// POST /student/search
app.post('/search', async (c) => {
  try {
    const { tenant_id, keyword } = await c.req.json()
    const tenantId = c.get('tenantId') as string

    const students = await db.select().from(manageStudents)
      .where(and(eq(manageStudents.tenantId, tenantId), like(manageStudents.name, `%${keyword}%`)))
      .limit(10)

    return c.json({
      success: true,
      data: students.map(s => ({ student_id: s.id, name: s.name, class_name: s.grade, phone: s.phone })),
    })
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

export default app
```

**Step 3: data.ts（含綁定碼）**

```typescript
// apps/manage-backend/src/routes/bot-ext/data.ts
import { Hono } from 'hono'
import { db } from '../../db'
import { manageStudents, manageCourses } from '../../db/schema'
import { eq } from 'drizzle-orm'

const app = new Hono()

// POST /data/students
app.post('/students', async (c) => {
  try {
    const tenantId = c.get('tenantId') as string
    const students = await db.select().from(manageStudents)
      .where(eq(manageStudents.tenantId, tenantId))

    return c.json({
      success: true,
      data: students.map(s => ({ student_id: s.id, name: s.name, class_name: s.grade })),
    })
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// POST /data/classes
app.post('/classes', async (c) => {
  try {
    const tenantId = c.get('tenantId') as string
    const courses = await db.select().from(manageCourses)
      .where(eq(manageCourses.tenantId, tenantId))

    return c.json({ success: true, data: courses.map(c => c.name) })
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

export default app
```

**Step 4: routes/bot-ext/index.ts**

```typescript
// apps/manage-backend/src/routes/bot-ext/index.ts
import { Hono } from 'hono'
import { botAuth } from '../../middleware/botAuth'
import finance from './finance'
import student from './student'
import data from './data'

const app = new Hono()

app.use('*', botAuth)
app.route('/finance', finance)
app.route('/student', student)
app.route('/data', data)

export default app
```

**Step 5: 修改 manage-backend/src/app.ts**

在 `app.ts` 加入 import 和掛載。注意已有 `botRoutes`（AI chat），所以新的用 `botExtRoutes` 名稱掛載在 `/api/bot-ext`。

在 import 區加入：
```typescript
import botExtRoutes from './routes/bot-ext'
```

在路由掛載區（line 112 `app.route('/api/bot', botRoutes)` 之後）加入：
```typescript
app.route('/api/bot-ext', botExtRoutes)
```

**Step 6: 驗證建置**

```bash
cd apps/manage-backend && pnpm build
```

**Step 7: Commit**

```bash
git add apps/manage-backend/src/routes/bot-ext/ apps/manage-backend/src/app.ts
git commit -m "feat(manage-backend): add /api/bot-ext/* routes for finance, student, and data"
```

---

## Task 12: stock-backend — Bot API 路由

**Files:**
- Create: `apps/stock-backend/src/routes/bot/index.ts`
- Create: `apps/stock-backend/src/routes/bot/stock.ts`
- Create: `apps/stock-backend/src/routes/bot/data.ts`
- Modify: `apps/stock-backend/src/index.ts` — 掛載路由

stock-backend 用 `drizzle-orm/postgres-js` + shared schema。DB import 方式需從 stock-backend 的 db 模組取得。

**Step 1: 先確認 stock-backend 的 DB import 路徑**

stock-backend 的 DB 在 `src/db/index.ts`，schema 從 `@94cram/shared/db` import。

**Step 2: stock.ts**

```typescript
// apps/stock-backend/src/routes/bot/stock.ts
import { Hono } from 'hono';
import { db } from '../../db';
import { stockItems, stockWarehouses, stockInventory, stockTransactions } from '@94cram/shared/db';
import { eq, and, like, sql } from 'drizzle-orm';

const app = new Hono();

// POST /stock/ship
app.post('/ship', async (c) => {
  try {
    const { tenant_id, item_name, item_id, quantity, destination, destination_id, date } = await c.req.json();
    const tenantId = c.get('tenantId') as string;

    // 查找品項
    let items;
    if (item_id) {
      items = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), eq(stockItems.id, item_id)));
    } else {
      items = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), eq(stockItems.name, item_name)));
    }

    if (items.length === 0) {
      const suggestions = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), like(stockItems.name, `%${item_name}%`)))
        .limit(5);
      return c.json({
        success: false, error: 'item_not_found',
        message: `找不到品項「${item_name}」`,
        suggestions: suggestions.map(i => ({ item_id: i.id, name: i.name })),
      });
    }

    const item = items[0];

    // 查找目的地倉庫
    let warehouses;
    if (destination_id) {
      warehouses = await db.select().from(stockWarehouses)
        .where(and(eq(stockWarehouses.tenantId, tenantId), eq(stockWarehouses.id, destination_id)));
    } else {
      warehouses = await db.select().from(stockWarehouses)
        .where(and(eq(stockWarehouses.tenantId, tenantId), like(stockWarehouses.name, `%${destination}%`)));
    }

    if (warehouses.length === 0) {
      const allWarehouses = await db.select().from(stockWarehouses)
        .where(eq(stockWarehouses.tenantId, tenantId));
      return c.json({
        success: false, error: 'warehouse_not_found',
        message: `找不到目的地「${destination}」`,
        suggestions: allWarehouses.map(w => ({ warehouse_id: w.id, name: w.name })),
      });
    }

    const warehouse = warehouses[0];

    // 檢查庫存（從 inventory 表加總）
    const inventoryRows = await db.select().from(stockInventory)
      .where(and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.itemId, item.id)));
    const totalStock = inventoryRows.reduce((sum, r) => sum + r.quantity, 0);

    if (totalStock < quantity) {
      return c.json({
        success: false, error: 'insufficient_stock',
        message: `庫存不足：${item.name} 目前只剩 ${totalStock} ${item.unit}，無法出貨 ${quantity} ${item.unit}`,
        data: { item_name: item.name, current_stock: totalStock, requested: quantity },
      });
    }

    // 執行出貨：在目標倉庫減庫存
    const existingInventory = inventoryRows.find(r => r.warehouseId === warehouse.id);
    if (existingInventory) {
      await db.update(stockInventory)
        .set({ quantity: existingInventory.quantity - quantity, lastUpdatedAt: new Date() })
        .where(eq(stockInventory.id, existingInventory.id));
    }

    // 記錄交易
    await db.insert(stockTransactions).values({
      tenantId,
      warehouseId: warehouse.id,
      itemId: item.id,
      transactionType: 'out',
      quantity: -quantity,
      recipientName: warehouse.name,
      recipientNote: '由 94CramBot 出貨',
      performedBy: '00000000-0000-0000-0000-000000000000', // Bot system user
    });

    return c.json({
      success: true,
      message: `已出貨：${item.name} ${quantity}${item.unit} → ${warehouse.name}`,
      data: {
        item_name: item.name,
        quantity_shipped: quantity,
        stock_before: totalStock,
        stock_after: totalStock - quantity,
        destination: warehouse.name,
      },
    });
  } catch (error) {
    console.error('[Bot] ship error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /stock/restock
app.post('/restock', async (c) => {
  try {
    const { tenant_id, item_name, item_id, quantity, date } = await c.req.json();
    const tenantId = c.get('tenantId') as string;

    let items;
    if (item_id) {
      items = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), eq(stockItems.id, item_id)));
    } else {
      items = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), eq(stockItems.name, item_name)));
    }

    if (items.length === 0) {
      const suggestions = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), like(stockItems.name, `%${item_name}%`)))
        .limit(5);
      return c.json({
        success: false, error: 'item_not_found',
        message: `找不到品項「${item_name}」`,
        suggestions: suggestions.map(i => ({ item_id: i.id, name: i.name })),
      });
    }

    const item = items[0];

    // 找到總部倉庫
    const hqWarehouse = await db.select().from(stockWarehouses)
      .where(and(eq(stockWarehouses.tenantId, tenantId), eq(stockWarehouses.isHeadquarters, true)))
      .limit(1);

    const warehouseId = hqWarehouse[0]?.id;
    if (!warehouseId) {
      return c.json({ success: false, error: 'no_warehouse', message: '找不到總部倉庫' });
    }

    // 查現有庫存
    const existing = await db.select().from(stockInventory)
      .where(and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.itemId, item.id), eq(stockInventory.warehouseId, warehouseId)))
      .limit(1);

    const stockBefore = existing[0]?.quantity ?? 0;

    if (existing.length > 0) {
      await db.update(stockInventory)
        .set({ quantity: stockBefore + quantity, lastUpdatedAt: new Date() })
        .where(eq(stockInventory.id, existing[0].id));
    } else {
      await db.insert(stockInventory).values({
        tenantId, warehouseId, itemId: item.id, quantity,
      });
    }

    await db.insert(stockTransactions).values({
      tenantId,
      warehouseId,
      itemId: item.id,
      transactionType: 'in',
      quantity,
      recipientNote: '由 94CramBot 進貨',
      performedBy: '00000000-0000-0000-0000-000000000000',
    });

    return c.json({
      success: true,
      message: `已進貨：${item.name} ${quantity}${item.unit}`,
      data: { item_name: item.name, quantity_added: quantity, stock_before: stockBefore, stock_after: stockBefore + quantity },
    });
  } catch (error) {
    console.error('[Bot] restock error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /stock/check
app.post('/check', async (c) => {
  try {
    const { tenant_id, item_name, item_id } = await c.req.json();
    const tenantId = c.get('tenantId') as string;

    let items;
    if (item_id) {
      items = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), eq(stockItems.id, item_id)));
    } else {
      items = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), like(stockItems.name, `%${item_name}%`)));
    }

    if (items.length === 0) {
      return c.json({ success: false, error: 'item_not_found', message: `找不到品項「${item_name}」` });
    }

    const item = items[0];
    const inventoryRows = await db.select().from(stockInventory)
      .where(and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.itemId, item.id)));
    const totalStock = inventoryRows.reduce((sum, r) => sum + r.quantity, 0);

    return c.json({
      success: true,
      message: `${item.name} 目前庫存 ${totalStock} ${item.unit}`,
      data: { item_name: item.name, item_id: item.id, current_stock: totalStock, unit: item.unit },
    });
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /stock/history
app.post('/history', async (c) => {
  try {
    const { tenant_id, start_date, end_date, item_name } = await c.req.json();
    const tenantId = c.get('tenantId') as string;

    const conditions = [eq(stockTransactions.tenantId, tenantId)];
    if (start_date) conditions.push(sql`${stockTransactions.createdAt} >= ${start_date}`);
    if (end_date) conditions.push(sql`${stockTransactions.createdAt} <= ${end_date}`);

    const transactions = await db.select({
      id: stockTransactions.id,
      itemId: stockTransactions.itemId,
      type: stockTransactions.transactionType,
      quantity: stockTransactions.quantity,
      createdAt: stockTransactions.createdAt,
    }).from(stockTransactions).where(and(...conditions));

    return c.json({
      success: true,
      message: `${start_date || ''}~${end_date || ''} 庫存異動紀錄`,
      data: transactions,
    });
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

export default app;
```

**Step 3: data.ts**

```typescript
// apps/stock-backend/src/routes/bot/data.ts
import { Hono } from 'hono';
import { db } from '../../db';
import { stockItems, stockWarehouses, stockInventory } from '@94cram/shared/db';
import { eq, and } from 'drizzle-orm';

const app = new Hono();

// POST /data/items
app.post('/items', async (c) => {
  try {
    const tenantId = c.get('tenantId') as string;
    const items = await db.select().from(stockItems)
      .where(and(eq(stockItems.tenantId, tenantId), eq(stockItems.isActive, true)));

    // 取得每個品項的總庫存
    const result = await Promise.all(items.map(async (item) => {
      const inv = await db.select().from(stockInventory)
        .where(and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.itemId, item.id)));
      const total = inv.reduce((sum, r) => sum + r.quantity, 0);
      return { item_id: item.id, name: item.name, stock: total, unit: item.unit };
    }));

    return c.json({ success: true, data: result });
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /data/warehouses
app.post('/warehouses', async (c) => {
  try {
    const tenantId = c.get('tenantId') as string;
    const warehouses = await db.select().from(stockWarehouses)
      .where(eq(stockWarehouses.tenantId, tenantId));

    return c.json({
      success: true,
      data: warehouses.map(w => ({ warehouse_id: w.id, name: w.name, address: w.address })),
    });
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

export default app;
```

**Step 4: routes/bot/index.ts**

```typescript
// apps/stock-backend/src/routes/bot/index.ts
import { Hono } from 'hono';
import { botAuth } from '../../middleware/botAuth';
import stock from './stock';
import data from './data';

const app = new Hono();

app.use('*', botAuth);
app.route('/stock', stock);
app.route('/data', data);

export default app;
```

**Step 5: 修改 stock-backend/src/index.ts**

在 `index.ts` 的路由掛載後（line 76 `app.route('/api', routes)` 之後）加入：

```typescript
import botRoutes from './routes/bot/index';
// ...
app.route('/api/bot', botRoutes);
```

注意：stock-backend 的全局 rate limiter 在 `/api/*` 上，會對 `/api/bot/*` 也生效，這沒問題。且 JWT middleware 不是全局的（在各 route 內自行套用），所以不需要 skip。

**Step 6: 驗證建置**

```bash
cd apps/stock-backend && pnpm build
```

**Step 7: Commit**

```bash
git add apps/stock-backend/src/routes/bot/ apps/stock-backend/src/index.ts
git commit -m "feat(stock-backend): add /api/bot/* routes for stock operations and data queries"
```

---

## Task 13: CI/CD — 新增 Bot Gateway 部署工作流

**Files:**
- Create: `.github/workflows/deploy-bot.yml`

**Step 1: 建立工作流**

```yaml
name: Deploy 94CramBot

on:
  push:
    branches: [main]
    paths:
      - 'apps/bot-gateway/**'
      - '.github/workflows/deploy-bot.yml'

env:
  PROJECT_ID: cram94-manage-system
  REGION: asia-east1
  REGISTRY: cram94

jobs:
  deploy-bot-gateway:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Auth to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker
        run: gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev

      - name: Build & Push
        run: |
          docker build -f apps/bot-gateway/Dockerfile \
            -t ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REGISTRY }}/bot-gateway:${{ github.sha }} \
            -t ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REGISTRY }}/bot-gateway:latest \
            .
          docker push ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REGISTRY }}/bot-gateway --all-tags

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy cram94-bot-gateway \
            --image=${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REGISTRY }}/bot-gateway:${{ github.sha }} \
            --region=${{ env.REGION }} \
            --platform=managed \
            --allow-unauthenticated \
            --port=3300 \
            --memory=512Mi \
            --min-instances=0 \
            --max-instances=10 \
            --set-env-vars="NODE_ENV=production,MANAGE_URL=https://cram94-manage-backend-1015149159553.asia-east1.run.app,INCLASS_URL=https://cram94-inclass-backend-1015149159553.asia-east1.run.app,STOCK_URL=https://cram94-stock-backend-1015149159553.asia-east1.run.app,GCP_PROJECT_ID=cram94-manage-system" \
            --set-secrets="TELEGRAM_BOT_TOKEN=TELEGRAM_BOT_TOKEN:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

**Step 2: Commit**

```bash
git add .github/workflows/deploy-bot.yml
git commit -m "ci: add deploy workflow for 94CramBot Gateway"
```

---

## Task 14: 全部建置驗證

**Step 1: 從 monorepo 根目錄安裝所有依賴**

```bash
cd /Users/dali/Github/94CramManageSystem
pnpm install
```

**Step 2: 逐一建置四個後端**

```bash
cd apps/bot-gateway && pnpm build
cd ../manage-backend && pnpm build
cd ../inclass-backend && pnpm build
cd ../stock-backend && pnpm build
```

Expected: 全部建置成功，無 TypeScript 錯誤

**Step 3: 修復任何建置錯誤**

如有建置錯誤，逐一修復後重新建置。

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fix build issues across all services"
```

---

## 部署前手動步驟（非程式碼）

以下步驟需在 GCP Console 或透過 gcloud CLI 手動執行：

1. **建立 Service Account**
   ```bash
   gcloud iam service-accounts create cram94-bot-gateway \
     --display-name="94CramBot Gateway" \
     --project=cram94-manage-system
   ```

2. **設定 IAM 權限**
   ```bash
   for SVC in cram94-manage-backend cram94-inclass-backend cram94-stock-backend; do
     gcloud run services add-iam-policy-binding $SVC \
       --member="serviceAccount:cram94-bot-gateway@cram94-manage-system.iam.gserviceaccount.com" \
       --role="roles/run.invoker" \
       --region=asia-east1 \
       --project=cram94-manage-system
   done
   ```

3. **在 GCP Secret Manager 新增密鑰**
   - `TELEGRAM_BOT_TOKEN`（從 BotFather 取得）
   - `GEMINI_API_KEY`（從 Google AI Studio 取得）

4. **在三個後端的 Cloud Run 新增環境變數**
   - `SERVICE_URL` = 各自的 Cloud Run URL

5. **部署後設定 Telegram Webhook**
   ```bash
   curl "https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://cram94-bot-gateway-1015149159553.asia-east1.run.app/webhook/telegram"
   ```
