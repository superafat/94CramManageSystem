# 94BOT Dashboard Complete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete 94BOT Dashboard with AI prompt management, model parameters, conversation history, knowledge base, analytics, bot health monitoring, bindings management, and system settings for all 4 bots.

**Architecture:** bot-dashboard (Next.js :3202) proxies to bot-gateway (Hono API) which stores data in Firestore + GCS. All 4 bot prompts become dynamically configurable. Recharts for charts.

**Tech Stack:** Next.js 16 + React 19 + Tailwind CSS 4 + Recharts / Hono + Firestore + GCS + Gemini API

**Existing code context:**
- `apps/bot-dashboard/` — Next.js app with Sidebar, BotPage component, basic dashboard page, login/auth
- `apps/bot-gateway/` — Hono API with existing endpoints for ai-tutor settings/invites/bindings/conversations/analytics, subscriptions, settings, usage
- `apps/bot-gateway/src/modules/ai-engine.ts` — Hardcoded prompts for all 4 bots (~1050 lines)
- `apps/bot-gateway/src/webhooks/line.ts` — Hardcoded LINE prompts
- `apps/bot-gateway/src/firestore/knowledge-base.ts` — Existing basic knowledge base (text only, keyword search)
- `apps/bot-dashboard/src/components/BotPage.tsx` — Existing generic bot page with tabs (conversations/bindings/settings/stats)

---

## Phase 1: Backend — Firestore Models & API Endpoints (Tasks 1-8)

### Task 1: Bot Prompt Settings Firestore Module

**Files:**
- Create: `apps/bot-gateway/src/firestore/bot-prompt-settings.ts`

**Step 1: Create the Firestore module**

```typescript
import { firestore } from './client';

export type BotType = 'clairvoyant' | 'windear' | 'ai-tutor' | 'wentaishi';

export interface StructuredPrompt {
  roleName: string;
  roleDescription: string;
  toneRules: string[];
  forbiddenActions: string[];
  capabilities: string[];
  knowledgeScope: string;
  customRules: string[];
}

export interface ModelConfig {
  name: string;
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  topK: number;
}

export interface BotPromptSettings {
  botType: BotType;
  tenantId: string;
  structured: StructuredPrompt;
  fullPrompt: string;
  mode: 'structured' | 'advanced';
  subPrompts?: Record<string, {
    structured: StructuredPrompt;
    fullPrompt: string;
    mode: 'structured' | 'advanced';
  }>;
  model: ModelConfig;
  updatedAt: Date;
  updatedBy: string;
}

const COLLECTION = 'bot-prompt-settings';

// Default model config
const DEFAULT_MODEL: ModelConfig = {
  name: 'gemini-2.5-flash-lite',
  temperature: 0.7,
  maxOutputTokens: 2048,
  topP: 0.9,
  topK: 40,
};

// In-memory cache: Map<`${tenantId}:${botType}`, BotPromptSettings>
const cache = new Map<string, BotPromptSettings>();

function cacheKey(tenantId: string, botType: BotType): string {
  return `${tenantId}:${botType}`;
}

export function clearPromptCache(tenantId: string, botType: BotType): void {
  cache.delete(cacheKey(tenantId, botType));
}

export async function getPromptSettings(
  tenantId: string,
  botType: BotType,
): Promise<BotPromptSettings | null> {
  const key = cacheKey(tenantId, botType);
  if (cache.has(key)) return cache.get(key)!;

  const docId = `${tenantId}_${botType}`;
  const doc = await firestore.collection(COLLECTION).doc(docId).get();
  if (!doc.exists) return null;

  const data = doc.data() as BotPromptSettings;
  cache.set(key, data);
  return data;
}

export async function updatePromptSettings(
  tenantId: string,
  botType: BotType,
  data: Partial<Omit<BotPromptSettings, 'tenantId' | 'botType'>>,
  updatedBy: string,
): Promise<void> {
  const docId = `${tenantId}_${botType}`;
  await firestore.collection(COLLECTION).doc(docId).set(
    { ...data, tenantId, botType, updatedAt: new Date(), updatedBy },
    { merge: true },
  );
  clearPromptCache(tenantId, botType);
}

export function getDefaultModel(): ModelConfig {
  return { ...DEFAULT_MODEL };
}
```

**Step 2: Commit**

```bash
git add apps/bot-gateway/src/firestore/bot-prompt-settings.ts
git commit -m "feat(bot): add bot-prompt-settings Firestore module with cache"
```

---

### Task 2: Bot Health Firestore Module

**Files:**
- Create: `apps/bot-gateway/src/firestore/bot-health.ts`

**Step 1: Create the module**

```typescript
import { firestore } from './client';
import type { BotType } from './bot-prompt-settings';

export interface BotHealth {
  botType: BotType;
  tenantId: string;
  platform: 'telegram' | 'line';
  webhookActive: boolean;
  lastEventAt: Date;
  lastReplyAt: Date;
  lastErrorAt?: Date;
  lastError?: string;
  messagesReceived24h: number;
  repliesSent24h: number;
  errors24h: number;
  avgLatencyMs24h: number;
  updatedAt: Date;
}

const COLLECTION = 'bot-health';

export async function getBotHealth(tenantId: string): Promise<BotHealth[]> {
  const snapshot = await firestore
    .collection(COLLECTION)
    .where('tenantId', '==', tenantId)
    .get();
  return snapshot.docs.map((doc) => doc.data() as BotHealth);
}

export async function updateBotHealth(
  tenantId: string,
  botType: BotType,
  platform: 'telegram' | 'line',
  update: Partial<Pick<BotHealth, 'lastEventAt' | 'lastReplyAt' | 'lastErrorAt' | 'lastError'>>,
): Promise<void> {
  const docId = `${tenantId}_${botType}`;
  await firestore.collection(COLLECTION).doc(docId).set(
    {
      ...update,
      tenantId,
      botType,
      platform,
      webhookActive: true,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

export async function recordBotEvent(
  tenantId: string,
  botType: BotType,
  platform: 'telegram' | 'line',
  success: boolean,
  latencyMs?: number,
  error?: string,
): Promise<void> {
  const update: Partial<BotHealth> = {
    lastEventAt: new Date(),
    webhookActive: true,
  };
  if (success) {
    update.lastReplyAt = new Date();
  } else {
    update.lastErrorAt = new Date();
    update.lastError = error;
  }
  await updateBotHealth(tenantId, botType, platform, update);
}
```

**Step 2: Commit**

```bash
git add apps/bot-gateway/src/firestore/bot-health.ts
git commit -m "feat(bot): add bot-health Firestore module for status monitoring"
```

---

### Task 3: Bot Conversations Unified Firestore Module

**Files:**
- Create: `apps/bot-gateway/src/firestore/bot-conversations.ts`

**Step 1: Create the module**

```typescript
import { firestore } from './client';
import type { BotType } from './bot-prompt-settings';

export interface BotConversation {
  tenantId: string;
  botType: BotType;
  platform: 'telegram' | 'line';
  userId: string;
  userName: string;
  userRole: 'admin' | 'parent' | 'student' | 'guest';
  userMessage: string;
  botReply: string;
  intent: string;
  model: string;
  latencyMs: number;
  tokensUsed?: number;
  createdAt: Date;
}

const COLLECTION = 'bot-conversations';

export async function saveBotConversation(data: BotConversation): Promise<string> {
  const doc = await firestore.collection(COLLECTION).add(data);
  return doc.id;
}

export interface ConversationQuery {
  tenantId: string;
  botType?: BotType;
  platform?: 'telegram' | 'line';
  userRole?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  startAfter?: string; // cursor doc ID for pagination
}

export async function queryConversations(
  query: ConversationQuery,
): Promise<Array<BotConversation & { id: string }>> {
  let q = firestore
    .collection(COLLECTION)
    .where('tenantId', '==', query.tenantId)
    .orderBy('createdAt', 'desc');

  if (query.botType) {
    q = q.where('botType', '==', query.botType);
  }
  if (query.platform) {
    q = q.where('platform', '==', query.platform);
  }
  if (query.startDate) {
    q = q.where('createdAt', '>=', query.startDate);
  }
  if (query.endDate) {
    q = q.where('createdAt', '<=', query.endDate);
  }

  if (query.startAfter) {
    const cursorDoc = await firestore.collection(COLLECTION).doc(query.startAfter).get();
    if (cursorDoc.exists) {
      q = q.startAfter(cursorDoc);
    }
  }

  const limit = Math.min(query.limit || 50, 200);
  q = q.limit(limit);

  const snapshot = await q.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as BotConversation) }));
}

export async function getConversationStats(
  tenantId: string,
  startDate: Date,
  endDate?: Date,
): Promise<{ total: number; byBot: Record<string, number>; byRole: Record<string, number> }> {
  let q = firestore
    .collection(COLLECTION)
    .where('tenantId', '==', tenantId)
    .where('createdAt', '>=', startDate);

  if (endDate) {
    q = q.where('createdAt', '<=', endDate);
  }

  const snapshot = await q.get();
  const byBot: Record<string, number> = {};
  const byRole: Record<string, number> = {};

  for (const doc of snapshot.docs) {
    const data = doc.data() as BotConversation;
    byBot[data.botType] = (byBot[data.botType] || 0) + 1;
    byRole[data.userRole] = (byRole[data.userRole] || 0) + 1;
  }

  return { total: snapshot.size, byBot, byRole };
}
```

**Step 2: Commit**

```bash
git add apps/bot-gateway/src/firestore/bot-conversations.ts
git commit -m "feat(bot): add unified bot-conversations Firestore module"
```

---

### Task 4: Bot Prompt API Routes

**Files:**
- Create: `apps/bot-gateway/src/api/bot-prompts.ts`
- Modify: `apps/bot-gateway/src/api/index.ts` — import and mount the new router

**Step 1: Create prompt API routes**

```typescript
import { Hono } from 'hono';
import type { DashboardUser } from '../middleware/auth';
import {
  getPromptSettings,
  updatePromptSettings,
  clearPromptCache,
  getDefaultModel,
  type BotType,
} from '../firestore/bot-prompt-settings';

// Import default prompts from ai-engine for "reset to default"
// These will be extracted as constants later in Task 14

type Env = { Variables: { user: DashboardUser } };
const VALID_BOT_TYPES: BotType[] = ['clairvoyant', 'windear', 'ai-tutor', 'wentaishi'];

export const botPromptsRouter = new Hono<Env>();

botPromptsRouter.get('/:botType', async (c) => {
  const user = c.get('user');
  const botType = c.req.param('botType') as BotType;

  if (!VALID_BOT_TYPES.includes(botType)) {
    return c.json({ error: 'Invalid bot type' }, 400);
  }

  const settings = await getPromptSettings(user.tenantId, botType);
  if (!settings) {
    return c.json({
      botType,
      tenantId: user.tenantId,
      mode: 'structured',
      structured: {
        roleName: '',
        roleDescription: '',
        toneRules: [],
        forbiddenActions: [],
        capabilities: [],
        knowledgeScope: '',
        customRules: [],
      },
      fullPrompt: '',
      model: getDefaultModel(),
      isDefault: true,
    });
  }

  return c.json(settings);
});

botPromptsRouter.put('/:botType', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin required' }, 403);

  const botType = c.req.param('botType') as BotType;
  if (!VALID_BOT_TYPES.includes(botType)) {
    return c.json({ error: 'Invalid bot type' }, 400);
  }

  const body = await c.req.json();
  const allowed = ['structured', 'fullPrompt', 'mode', 'subPrompts', 'model'] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  await updatePromptSettings(user.tenantId, botType, updates, user.userId);
  const settings = await getPromptSettings(user.tenantId, botType);
  return c.json(settings);
});

botPromptsRouter.post('/:botType/reset', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin required' }, 403);

  const botType = c.req.param('botType') as BotType;
  if (!VALID_BOT_TYPES.includes(botType)) {
    return c.json({ error: 'Invalid bot type' }, 400);
  }

  clearPromptCache(user.tenantId, botType);

  // Delete the custom settings document, falling back to hardcoded defaults
  const { firestore } = await import('../firestore/client');
  const docId = `${user.tenantId}_${botType}`;
  await firestore.collection('bot-prompt-settings').doc(docId).delete();

  return c.json({ success: true, message: 'Reset to default' });
});
```

**Step 2: Mount in api/index.ts**

Add to `apps/bot-gateway/src/api/index.ts`:

```typescript
import { botPromptsRouter } from './bot-prompts';
// After the dashboardAuth middleware line:
apiRouter.route('/bot-prompts', botPromptsRouter);
```

**Step 3: Commit**

```bash
git add apps/bot-gateway/src/api/bot-prompts.ts apps/bot-gateway/src/api/index.ts
git commit -m "feat(bot): add bot-prompts API routes (GET/PUT/reset)"
```

---

### Task 5: Bot Health API Route

**Files:**
- Create: `apps/bot-gateway/src/api/bot-health-routes.ts`
- Modify: `apps/bot-gateway/src/api/index.ts`

**Step 1: Create health API**

```typescript
import { Hono } from 'hono';
import type { DashboardUser } from '../middleware/auth';
import { getBotHealth } from '../firestore/bot-health';

type Env = { Variables: { user: DashboardUser } };

export const botHealthRouter = new Hono<Env>();

botHealthRouter.get('/', async (c) => {
  const user = c.get('user');
  const health = await getBotHealth(user.tenantId);
  return c.json(health);
});
```

**Step 2: Mount in index.ts**

```typescript
import { botHealthRouter } from './bot-health-routes';
apiRouter.route('/bot-health', botHealthRouter);
```

**Step 3: Commit**

```bash
git add apps/bot-gateway/src/api/bot-health-routes.ts apps/bot-gateway/src/api/index.ts
git commit -m "feat(bot): add bot-health API route"
```

---

### Task 6: Unified Conversations API Route

**Files:**
- Create: `apps/bot-gateway/src/api/conversations-routes.ts`
- Modify: `apps/bot-gateway/src/api/index.ts`

**Step 1: Create conversations API**

```typescript
import { Hono } from 'hono';
import type { DashboardUser } from '../middleware/auth';
import { queryConversations, type ConversationQuery } from '../firestore/bot-conversations';
import type { BotType } from '../firestore/bot-prompt-settings';

type Env = { Variables: { user: DashboardUser } };

export const conversationsRouter = new Hono<Env>();

conversationsRouter.get('/', async (c) => {
  const user = c.get('user');
  const botType = c.req.query('botType') as BotType | undefined;
  const platform = c.req.query('platform') as 'telegram' | 'line' | undefined;
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');

  const query: ConversationQuery = {
    tenantId: user.tenantId,
    botType: botType || undefined,
    platform: platform || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    limit: limit ? parseInt(limit, 10) : 50,
    startAfter: cursor || undefined,
  };

  const conversations = await queryConversations(query);
  return c.json(conversations);
});

conversationsRouter.get('/export', async (c) => {
  const user = c.get('user');
  const botType = c.req.query('botType') as BotType | undefined;
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  const conversations = await queryConversations({
    tenantId: user.tenantId,
    botType: botType || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    limit: 5000,
  });

  // Build CSV
  const header = 'ID,Bot,Platform,User,Role,Message,Reply,Intent,Model,Latency(ms),Time\n';
  const rows = conversations.map((c) => {
    const escape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
    return [
      c.id,
      c.botType,
      c.platform,
      escape(c.userName),
      c.userRole,
      escape(c.userMessage),
      escape(c.botReply),
      c.intent,
      c.model,
      c.latencyMs,
      new Date(c.createdAt).toISOString(),
    ].join(',');
  }).join('\n');

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="conversations.csv"');
  return c.body(header + rows);
});
```

**Step 2: Mount in index.ts**

```typescript
import { conversationsRouter } from './conversations-routes';
apiRouter.route('/conversations', conversationsRouter);
```

**Step 3: Commit**

```bash
git add apps/bot-gateway/src/api/conversations-routes.ts apps/bot-gateway/src/api/index.ts
git commit -m "feat(bot): add unified conversations API with export"
```

---

### Task 7: Enhanced Analytics API Route

**Files:**
- Create: `apps/bot-gateway/src/api/analytics-routes.ts`
- Modify: `apps/bot-gateway/src/api/index.ts`

**Step 1: Create analytics API**

```typescript
import { Hono } from 'hono';
import type { DashboardUser } from '../middleware/auth';
import { getConversationStats } from '../firestore/bot-conversations';
import { getBotHealth } from '../firestore/bot-health';
import { firestore } from '../firestore/client';

type Env = { Variables: { user: DashboardUser } };

export const analyticsRouter = new Hono<Env>();

analyticsRouter.get('/overview', async (c) => {
  const user = c.get('user');
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayStats, monthStats, health] = await Promise.all([
    getConversationStats(user.tenantId, todayStart),
    getConversationStats(user.tenantId, monthStart),
    getBotHealth(user.tenantId),
  ]);

  return c.json({
    today: todayStats,
    month: monthStats,
    health,
  });
});

analyticsRouter.get('/trends', async (c) => {
  const user = c.get('user');
  const days = parseInt(c.req.query('days') || '7', 10);
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const snapshot = await firestore
    .collection('bot-conversations')
    .where('tenantId', '==', user.tenantId)
    .where('createdAt', '>=', startDate)
    .orderBy('createdAt', 'asc')
    .get();

  // Group by date and botType
  const trends: Record<string, Record<string, number>> = {};
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const date = new Date(data.createdAt.toDate()).toISOString().slice(0, 10);
    if (!trends[date]) trends[date] = {};
    trends[date][data.botType] = (trends[date][data.botType] || 0) + 1;
  }

  return c.json(trends);
});

analyticsRouter.get('/top-questions', async (c) => {
  const user = c.get('user');
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const snapshot = await firestore
    .collection('bot-conversations')
    .where('tenantId', '==', user.tenantId)
    .where('createdAt', '>=', monthStart)
    .get();

  const questionCounts = new Map<string, number>();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (typeof data.userMessage === 'string') {
      const msg = data.userMessage.slice(0, 50);
      questionCounts.set(msg, (questionCounts.get(msg) ?? 0) + 1);
    }
  }

  const topQuestions = Array.from(questionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([question, count]) => ({ question, count }));

  return c.json(topQuestions);
});
```

**Step 2: Mount in index.ts**

```typescript
import { analyticsRouter } from './analytics-routes';
apiRouter.route('/analytics', analyticsRouter);
```

**Step 3: Commit**

```bash
git add apps/bot-gateway/src/api/analytics-routes.ts apps/bot-gateway/src/api/index.ts
git commit -m "feat(bot): add enhanced analytics API (overview/trends/top-questions)"
```

---

### Task 8: Knowledge Base Enhanced API Routes

**Files:**
- Create: `apps/bot-gateway/src/api/knowledge-base-routes.ts`
- Modify: `apps/bot-gateway/src/api/index.ts`

**Step 1: Create knowledge base API**

This route extends the existing `apps/bot-gateway/src/firestore/knowledge-base.ts` with file upload and web crawl endpoints.

```typescript
import { Hono } from 'hono';
import type { DashboardUser } from '../middleware/auth';
import { getKnowledge, upsertKnowledge, deactivateKnowledge } from '../firestore/knowledge-base';

type Env = { Variables: { user: DashboardUser } };

export const knowledgeBaseRouter = new Hono<Env>();

// List entries
knowledgeBaseRouter.get('/', async (c) => {
  const user = c.get('user');
  const category = c.req.query('category') as string | undefined;
  const entries = await getKnowledge(user.tenantId, category as any);
  return c.json(entries);
});

// Create Q&A entry
knowledgeBaseRouter.post('/', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin required' }, 403);

  const body = await c.req.json();
  const { title, content, category, keywords } = body as {
    title?: string;
    content?: string;
    category?: string;
    keywords?: string[];
  };

  if (!title || !content) {
    return c.json({ error: 'title and content are required' }, 400);
  }

  const id = await upsertKnowledge(user.tenantId, {
    category: (category as any) || 'faq',
    title,
    content,
    keywords: keywords || [],
    active: true,
  });

  return c.json({ id }, 201);
});

// Update entry
knowledgeBaseRouter.put('/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin required' }, 403);

  const entryId = c.req.param('id');
  const body = await c.req.json();
  const { title, content, category, keywords, active } = body as {
    title?: string;
    content?: string;
    category?: string;
    keywords?: string[];
    active?: boolean;
  };

  await upsertKnowledge(
    user.tenantId,
    {
      category: (category as any) || 'faq',
      title: title || '',
      content: content || '',
      keywords: keywords || [],
      active: active !== false,
    },
    entryId,
  );

  return c.json({ success: true });
});

// Delete (soft-delete)
knowledgeBaseRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin required' }, 403);

  const entryId = c.req.param('id');
  await deactivateKnowledge(entryId);
  return c.json({ success: true });
});

// Crawl webpage (async)
knowledgeBaseRouter.post('/crawl', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin required' }, 403);

  const body = await c.req.json();
  const { url } = body as { url?: string };

  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return c.json({ error: 'Valid URL is required' }, 400);
  }

  // Create a pending entry
  const id = await upsertKnowledge(user.tenantId, {
    category: 'general',
    title: url,
    content: '',
    keywords: [],
    active: false,
  });

  // Fire-and-forget: fetch and parse
  void (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const html = await res.text();
      // Simple HTML to text
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 10000);

      await upsertKnowledge(
        user.tenantId,
        {
          category: 'general',
          title: url,
          content: text,
          keywords: [],
          active: true,
        },
        id,
      );
    } catch {
      // Mark as failed by leaving active: false
    }
  })();

  return c.json({ id, status: 'processing' }, 202);
});
```

**Step 2: Mount in index.ts**

```typescript
import { knowledgeBaseRouter } from './knowledge-base-routes';
apiRouter.route('/knowledge-base', knowledgeBaseRouter);
```

**Step 3: Commit**

```bash
git add apps/bot-gateway/src/api/knowledge-base-routes.ts apps/bot-gateway/src/api/index.ts
git commit -m "feat(bot): add knowledge-base API routes (CRUD + crawl)"
```

---

## Phase 2: Frontend Foundation (Tasks 9-12)

### Task 9: Install Recharts & Update Sidebar Navigation

**Files:**
- Modify: `apps/bot-dashboard/package.json`
- Modify: `apps/bot-dashboard/src/components/layout/Sidebar.tsx`

**Step 1: Install recharts**

```bash
cd /Users/dali/Github/94CramManageSystem
pnpm --filter @94cram/bot-dashboard add recharts
```

**Step 2: Update Sidebar navigation**

Update `apps/bot-dashboard/src/components/layout/Sidebar.tsx` navItems array to:

```typescript
const navItems: NavItem[] = [
  { href: '/dashboard', icon: '📊', label: '總覽', roles: ['admin', 'staff'] },

  { type: 'separator', separator: 'Bot 管理', roles: ['admin', 'staff'] },
  { href: '/dashboard/clairvoyant', icon: '🔮', label: '千里眼（行政端）', roles: ['admin', 'staff'] },
  { href: '/dashboard/windear', icon: '👂', label: '順風耳（家長端）', roles: ['admin'] },
  { href: '/dashboard/ai-tutor', icon: '📐', label: '神算子（課業助教）', roles: ['admin'] },
  { href: '/dashboard/wentaishi', icon: '📖', label: '聞仲老師（LINE）', roles: ['admin'] },

  { type: 'separator', separator: '資料管理', roles: ['admin', 'staff'] },
  { href: '/dashboard/conversations', icon: '💬', label: '對話紀錄', roles: ['admin', 'staff'] },
  { href: '/dashboard/knowledge-base', icon: '📚', label: '知識庫', roles: ['admin'] },
  { href: '/dashboard/analytics', icon: '📈', label: '統計分析', roles: ['admin', 'staff'] },

  { type: 'separator', separator: '系統', roles: ['admin'] },
  { href: '/dashboard/bindings', icon: '🔗', label: '綁定管理', roles: ['admin'] },
  { href: '/dashboard/plans', icon: '💎', label: '訂閱方案', roles: ['admin'] },
  { href: '/dashboard/settings', icon: '⚙️', label: '系統設定', roles: ['admin'] },
]
```

**Step 3: Commit**

```bash
git add apps/bot-dashboard/package.json apps/bot-dashboard/src/components/layout/Sidebar.tsx pnpm-lock.yaml
git commit -m "feat(bot-dashboard): add recharts, update sidebar navigation"
```

---

### Task 10: Create Shared UI Components

**Files:**
- Create: `apps/bot-dashboard/src/components/ui/Card.tsx`
- Create: `apps/bot-dashboard/src/components/ui/Slider.tsx`
- Create: `apps/bot-dashboard/src/components/ui/TagInput.tsx`
- Create: `apps/bot-dashboard/src/lib/api.ts`

**Step 1: Create Card component**

```typescript
// apps/bot-dashboard/src/components/ui/Card.tsx
export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface rounded-2xl border border-border p-6 ${className}`}>
      {title && <h2 className="text-lg font-semibold text-text mb-4">{title}</h2>}
      {children}
    </div>
  )
}
```

**Step 2: Create Slider component**

```typescript
// apps/bot-dashboard/src/components/ui/Slider.tsx
'use client'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  description?: string
}

export function Slider({ label, value, min, max, step, onChange, description }: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-text">{label}</label>
        <span className="text-sm text-primary font-mono">{value}</span>
      </div>
      {description && <p className="text-xs text-text-muted">{description}</p>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-xs text-text-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
```

**Step 3: Create TagInput component**

```typescript
// apps/bot-dashboard/src/components/ui/TagInput.tsx
'use client'

import { useState } from 'react'

interface TagInputProps {
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ label, tags, onChange, placeholder = '輸入後按 Enter' }: TagInputProps) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()])
      }
      setInput('')
    }
  }

  const handleRemove = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
            {tag}
            <button onClick={() => handleRemove(i)} className="hover:text-danger ml-1">&times;</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  )
}
```

**Step 4: Create API helper**

```typescript
// apps/bot-dashboard/src/lib/api.ts
const BASE = '/api'

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(error.error || res.statusText)
  }
  return res.json()
}

export function apiGet<T = unknown>(path: string): Promise<T> {
  return apiFetch<T>(path)
}

export function apiPut<T = unknown>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export function apiDelete<T = unknown>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' })
}
```

**Step 5: Commit**

```bash
git add apps/bot-dashboard/src/components/ui/ apps/bot-dashboard/src/lib/api.ts
git commit -m "feat(bot-dashboard): add shared UI components (Card, Slider, TagInput) and API helper"
```

---

### Task 11: Create Prompt Editor Component

**Files:**
- Create: `apps/bot-dashboard/src/components/prompt-editor/StructuredForm.tsx`
- Create: `apps/bot-dashboard/src/components/prompt-editor/AdvancedEditor.tsx`
- Create: `apps/bot-dashboard/src/components/prompt-editor/PromptEditor.tsx`
- Create: `apps/bot-dashboard/src/components/prompt-editor/ModelConfig.tsx`

**Step 1: Create StructuredForm**

```typescript
// apps/bot-dashboard/src/components/prompt-editor/StructuredForm.tsx
'use client'

import { TagInput } from '../ui/TagInput'

interface StructuredPrompt {
  roleName: string
  roleDescription: string
  toneRules: string[]
  forbiddenActions: string[]
  capabilities: string[]
  knowledgeScope: string
  customRules: string[]
}

interface Props {
  value: StructuredPrompt
  onChange: (value: StructuredPrompt) => void
}

export function StructuredForm({ value, onChange }: Props) {
  const update = (key: keyof StructuredPrompt, val: unknown) => {
    onChange({ ...value, [key]: val })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-text">角色名稱</label>
        <input
          type="text"
          value={value.roleName}
          onChange={(e) => update('roleName', e.target.value)}
          placeholder="例：千里眼"
          className="w-full px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-text">角色描述</label>
        <textarea
          value={value.roleDescription}
          onChange={(e) => update('roleDescription', e.target.value)}
          rows={3}
          placeholder="描述這個 Bot 的角色定位..."
          className="w-full px-4 py-3 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <TagInput label="語氣規則" tags={value.toneRules} onChange={(v) => update('toneRules', v)} placeholder="例：回覆簡短自然，1-3句" />
      <TagInput label="禁止事項" tags={value.forbiddenActions} onChange={(v) => update('forbiddenActions', v)} placeholder="例：不說「作為AI」" />
      <TagInput label="能力範圍" tags={value.capabilities} onChange={(v) => update('capabilities', v)} placeholder="例：查詢出勤紀錄" />

      <div className="space-y-2">
        <label className="text-sm font-medium text-text">知識範圍</label>
        <textarea
          value={value.knowledgeScope}
          onChange={(e) => update('knowledgeScope', e.target.value)}
          rows={2}
          placeholder="描述這個 Bot 的知識範圍..."
          className="w-full px-4 py-3 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <TagInput label="自訂規則" tags={value.customRules} onChange={(v) => update('customRules', v)} placeholder="其他自訂規則" />
    </div>
  )
}
```

**Step 2: Create AdvancedEditor**

```typescript
// apps/bot-dashboard/src/components/prompt-editor/AdvancedEditor.tsx
'use client'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function AdvancedEditor({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text">完整 System Prompt</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={20}
        className="w-full px-4 py-3 border border-border rounded-xl bg-surface text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        placeholder="在此輸入完整的 system prompt..."
      />
      <p className="text-xs text-text-muted">進階模式：直接編輯完整的 system prompt，將覆蓋結構化設定。</p>
    </div>
  )
}
```

**Step 3: Create PromptEditor (combines both)**

```typescript
// apps/bot-dashboard/src/components/prompt-editor/PromptEditor.tsx
'use client'

import { useState } from 'react'
import { StructuredForm } from './StructuredForm'
import { AdvancedEditor } from './AdvancedEditor'

interface StructuredPrompt {
  roleName: string
  roleDescription: string
  toneRules: string[]
  forbiddenActions: string[]
  capabilities: string[]
  knowledgeScope: string
  customRules: string[]
}

interface PromptSettings {
  mode: 'structured' | 'advanced'
  structured: StructuredPrompt
  fullPrompt: string
}

interface Props {
  value: PromptSettings
  onChange: (value: PromptSettings) => void
  onSave: () => void
  onReset: () => void
  saving?: boolean
}

export function PromptEditor({ value, onChange, onSave, onReset, saving }: Props) {
  const [showPreview, setShowPreview] = useState(false)

  const composedPrompt = composePrompt(value.structured)

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => onChange({ ...value, mode: 'structured' })}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            value.mode === 'structured' ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'
          }`}
        >
          結構化模式
        </button>
        <button
          onClick={() => onChange({ ...value, mode: 'advanced' })}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            value.mode === 'advanced' ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'
          }`}
        >
          進階模式
        </button>
      </div>

      {/* Editor */}
      {value.mode === 'structured' ? (
        <StructuredForm
          value={value.structured}
          onChange={(structured) => onChange({ ...value, structured })}
        />
      ) : (
        <AdvancedEditor
          value={value.fullPrompt}
          onChange={(fullPrompt) => onChange({ ...value, fullPrompt })}
        />
      )}

      {/* Preview (structured mode only) */}
      {value.mode === 'structured' && (
        <div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-primary hover:underline"
          >
            {showPreview ? '隱藏預覽' : '預覽組合後的完整 Prompt'}
          </button>
          {showPreview && (
            <div className="mt-2 p-4 bg-surface-hover rounded-xl border border-border">
              <pre className="text-sm text-text whitespace-pre-wrap font-mono">{composedPrompt}</pre>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm text-text-muted hover:text-danger border border-border rounded-xl hover:border-danger transition-all"
        >
          恢復預設
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存變更'}
        </button>
      </div>
    </div>
  )
}

function composePrompt(s: StructuredPrompt): string {
  const parts: string[] = []
  if (s.roleName) parts.push(`你是「${s.roleName}」。`)
  if (s.roleDescription) parts.push(s.roleDescription)
  if (s.toneRules.length) parts.push(`\n語氣規則：\n${s.toneRules.map((r) => `- ${r}`).join('\n')}`)
  if (s.forbiddenActions.length) parts.push(`\n禁止事項：\n${s.forbiddenActions.map((r) => `- ${r}`).join('\n')}`)
  if (s.capabilities.length) parts.push(`\n能力範圍：\n${s.capabilities.map((r) => `- ${r}`).join('\n')}`)
  if (s.knowledgeScope) parts.push(`\n知識範圍：${s.knowledgeScope}`)
  if (s.customRules.length) parts.push(`\n其他規則：\n${s.customRules.map((r) => `- ${r}`).join('\n')}`)
  return parts.join('\n')
}
```

**Step 4: Create ModelConfig component**

```typescript
// apps/bot-dashboard/src/components/prompt-editor/ModelConfig.tsx
'use client'

import { Slider } from '../ui/Slider'

interface ModelSettings {
  name: string
  temperature: number
  maxOutputTokens: number
  topP: number
  topK: number
}

interface Props {
  value: ModelSettings
  onChange: (value: ModelSettings) => void
}

const MODELS = [
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (快速)', cost: '~NT$0.1/次' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (均衡)', cost: '~NT$0.3/次' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (高品質)', cost: '~NT$1.0/次' },
]

export function ModelConfig({ value, onChange }: Props) {
  const update = (key: keyof ModelSettings, val: unknown) => {
    onChange({ ...value, [key]: val })
  }

  const selectedModel = MODELS.find((m) => m.value === value.name)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-text">AI 模型</label>
        <select
          value={value.name}
          onChange={(e) => update('name', e.target.value)}
          className="w-full px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {selectedModel && (
          <p className="text-xs text-text-muted">預估成本：{selectedModel.cost}</p>
        )}
      </div>

      <Slider label="Temperature" value={value.temperature} min={0} max={2} step={0.1} onChange={(v) => update('temperature', v)} description="創意度：低值更精確，高值更有創意" />
      <Slider label="Max Output Tokens" value={value.maxOutputTokens} min={256} max={8192} step={256} onChange={(v) => update('maxOutputTokens', v)} description="回覆最大長度" />
      <Slider label="Top P" value={value.topP} min={0} max={1} step={0.05} onChange={(v) => update('topP', v)} description="詞彙選擇範圍" />
      <Slider label="Top K" value={value.topK} min={1} max={100} step={1} onChange={(v) => update('topK', v)} description="候選詞數量" />
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add apps/bot-dashboard/src/components/prompt-editor/
git commit -m "feat(bot-dashboard): add PromptEditor components (structured + advanced + model config)"
```

---

### Task 12: Create Bot Detail Page Template

**Files:**
- Create: `apps/bot-dashboard/src/components/BotDetailPage.tsx`

This replaces the old `BotPage.tsx` with a more complete version that includes prompt editing, model config, and real API connections.

**Step 1: Create BotDetailPage**

```typescript
// apps/bot-dashboard/src/components/BotDetailPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from './ui/Card'
import { PromptEditor } from './prompt-editor/PromptEditor'
import { ModelConfig } from './prompt-editor/ModelConfig'
import { apiGet, apiPut, apiPost } from '../lib/api'

type TabId = 'prompt' | 'model' | 'conversations' | 'bindings' | 'status'

interface BotDetailConfig {
  botType: 'clairvoyant' | 'windear' | 'ai-tutor' | 'wentaishi'
  name: string
  icon: string
  platform: 'telegram' | 'line'
  audience: string
}

const TABS: { id: TabId; label: string; icon: string; adminOnly: boolean }[] = [
  { id: 'prompt', label: 'AI Prompt', icon: '✏️', adminOnly: true },
  { id: 'model', label: '模型參數', icon: '🎛️', adminOnly: true },
  { id: 'conversations', label: '對話紀錄', icon: '💬', adminOnly: false },
  { id: 'bindings', label: '綁定管理', icon: '🔗', adminOnly: true },
  { id: 'status', label: '狀態', icon: '📡', adminOnly: false },
]

export function BotDetailPage({ config }: { config: BotDetailConfig }) {
  const [tab, setTab] = useState<TabId>('prompt')
  const [promptData, setPromptData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [userRole, setUserRole] = useState<string>('admin')

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserRole(user.role || 'staff')
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    apiGet(`/bot-prompts/${config.botType}`).then(setPromptData).catch(() => {})
  }, [config.botType])

  const handleSavePrompt = async () => {
    if (!promptData) return
    setSaving(true)
    try {
      await apiPut(`/bot-prompts/${config.botType}`, {
        mode: promptData.mode,
        structured: promptData.structured,
        fullPrompt: promptData.fullPrompt,
      })
      setMessage('Prompt 已儲存')
    } catch (err) {
      setMessage(`儲存失敗: ${err instanceof Error ? err.message : '未知錯誤'}`)
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSaveModel = async () => {
    if (!promptData) return
    setSaving(true)
    try {
      await apiPut(`/bot-prompts/${config.botType}`, { model: promptData.model })
      setMessage('模型參數已儲存')
    } catch (err) {
      setMessage(`儲存失敗: ${err instanceof Error ? err.message : '未知錯誤'}`)
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleReset = async () => {
    if (!confirm('確定要恢復預設嗎？自訂設定將被刪除。')) return
    try {
      await apiPost(`/bot-prompts/${config.botType}/reset`, {})
      const data = await apiGet(`/bot-prompts/${config.botType}`)
      setPromptData(data)
      setMessage('已恢復預設')
    } catch (err) {
      setMessage(`重設失敗: ${err instanceof Error ? err.message : '未知錯誤'}`)
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const visibleTabs = TABS.filter((t) => !t.adminOnly || userRole === 'admin')

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{config.icon}</span>
        <div>
          <h1 className="text-2xl font-bold text-text">{config.name}</h1>
          <p className="text-sm text-text-muted">{config.platform === 'telegram' ? 'Telegram' : 'LINE'} · {config.audience}</p>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-xl">
          <p className="text-sm text-text">{message}</p>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-surface rounded-xl p-1 border border-border overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-surface-hover'
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'prompt' && promptData && (
        <Card title="AI Prompt 設定">
          <PromptEditor
            value={promptData}
            onChange={setPromptData}
            onSave={handleSavePrompt}
            onReset={handleReset}
            saving={saving}
          />
        </Card>
      )}

      {tab === 'model' && promptData && (
        <Card title="模型參數設定">
          <ModelConfig
            value={promptData.model || { name: 'gemini-2.5-flash-lite', temperature: 0.7, maxOutputTokens: 2048, topP: 0.9, topK: 40 }}
            onChange={(model) => setPromptData({ ...promptData, model })}
          />
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveModel}
              disabled={saving}
              className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? '儲存中...' : '儲存變更'}
            </button>
          </div>
        </Card>
      )}

      {tab === 'conversations' && (
        <Card title="對話紀錄">
          <BotConversationsTab botType={config.botType} />
        </Card>
      )}

      {tab === 'status' && (
        <Card title="Bot 狀態">
          <BotStatusTab botType={config.botType} />
        </Card>
      )}

      {tab === 'bindings' && (
        <Card title="綁定管理">
          <p className="text-sm text-text-muted">請至「綁定管理」頁面統一管理所有 Bot 的綁定。</p>
        </Card>
      )}
    </div>
  )
}

function BotConversationsTab({ botType }: { botType: string }) {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet(`/conversations?botType=${botType}&limit=50`)
      .then((data: any) => {
        setConversations(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [botType])

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="space-y-3">
      {conversations.map((conv) => (
        <div key={conv.id} className="p-4 rounded-xl border border-border">
          <div className="flex justify-between mb-2">
            <span className="font-medium text-sm text-text">{conv.userName}</span>
            <span className="text-xs text-text-muted">{new Date(conv.createdAt).toLocaleString('zh-TW')}</span>
          </div>
          <p className="text-sm text-text-muted mb-1">Q: {conv.userMessage}</p>
          <p className="text-sm text-text">A: {conv.botReply}</p>
        </div>
      ))}
      {conversations.length === 0 && <p className="text-center text-text-muted py-8">目前沒有對話紀錄</p>}
    </div>
  )
}

function BotStatusTab({ botType }: { botType: string }) {
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet('/bot-health')
      .then((data: any) => {
        const items = Array.isArray(data) ? data : []
        setHealth(items.find((h: any) => h.botType === botType) || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [botType])

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  if (!health) return <p className="text-center text-text-muted py-8">尚無健康狀態資料</p>

  const lastEvent = health.lastEventAt ? new Date(health.lastEventAt) : null
  const minutesAgo = lastEvent ? Math.floor((Date.now() - lastEvent.getTime()) / 60000) : null

  let status = '🔴 異常'
  if (minutesAgo !== null && minutesAgo < 30) status = '🟢 運作中'
  else if (minutesAgo !== null && minutesAgo < 1440) status = '🟡 閒置'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{status.slice(0, 2)}</span>
        <span className="text-lg font-medium text-text">{status.slice(2).trim()}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-surface-hover">
          <p className="text-xs text-text-muted">最後活動</p>
          <p className="text-sm font-medium text-text">{minutesAgo !== null ? `${minutesAgo} 分鐘前` : '無資料'}</p>
        </div>
        <div className="p-3 rounded-xl bg-surface-hover">
          <p className="text-xs text-text-muted">平均延遲</p>
          <p className="text-sm font-medium text-text">{health.avgLatencyMs24h || 0} ms</p>
        </div>
        <div className="p-3 rounded-xl bg-surface-hover">
          <p className="text-xs text-text-muted">24h 訊息</p>
          <p className="text-sm font-medium text-text">{health.messagesReceived24h || 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-surface-hover">
          <p className="text-xs text-text-muted">24h 錯誤</p>
          <p className="text-sm font-medium text-text">{health.errors24h || 0}</p>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/bot-dashboard/src/components/BotDetailPage.tsx
git commit -m "feat(bot-dashboard): add BotDetailPage with prompt/model/conversations/status tabs"
```

---

## Phase 3: Feature Pages (Tasks 13-20)

### Task 13: Update Bot Pages to Use BotDetailPage

**Files:**
- Modify: `apps/bot-dashboard/src/app/dashboard/clairvoyant/page.tsx`
- Modify: `apps/bot-dashboard/src/app/dashboard/windear/page.tsx`
- Modify: `apps/bot-dashboard/src/app/dashboard/ai-tutor/page.tsx`
- Modify: `apps/bot-dashboard/src/app/dashboard/wentaishi/page.tsx`

**Step 1: Update all four bot pages**

Each page should be a simple wrapper. Example for clairvoyant:

```typescript
// apps/bot-dashboard/src/app/dashboard/clairvoyant/page.tsx
import { BotDetailPage } from '../../../components/BotDetailPage'

export default function ClairvoyantPage() {
  return (
    <BotDetailPage
      config={{
        botType: 'clairvoyant',
        name: '千里眼',
        icon: '🔮',
        platform: 'telegram',
        audience: '行政端 · 管理者',
      }}
    />
  )
}
```

Similarly for windear (`windear`, `順風耳`, `👂`, `telegram`, `家長端`), ai-tutor (`ai-tutor`, `神算子`, `📐`, `telegram`, `學生課業助教`), wentaishi (`wentaishi`, `聞仲老師`, `📖`, `line`, `LINE 客服`).

**Step 2: Commit**

```bash
git add apps/bot-dashboard/src/app/dashboard/clairvoyant/page.tsx apps/bot-dashboard/src/app/dashboard/windear/page.tsx apps/bot-dashboard/src/app/dashboard/ai-tutor/page.tsx apps/bot-dashboard/src/app/dashboard/wentaishi/page.tsx
git commit -m "feat(bot-dashboard): update 4 bot pages to use BotDetailPage"
```

---

### Task 14: Enhanced Dashboard Overview Page

**Files:**
- Modify: `apps/bot-dashboard/src/app/dashboard/page.tsx`

**Step 1: Rewrite with bot health + analytics**

Replace the existing page to fetch from `/api/analytics/overview` and `/api/bot-health` for real data, showing 4 bot status cards, summary stats, and a 7-day trend chart using Recharts `LineChart`.

The page should:
- Show 3 summary cards (today conversations, month conversations, active users)
- Show 4 bot status cards with health indicators (green/yellow/red)
- Show 7-day trend chart using Recharts `LineChart` from `/api/analytics/trends`
- Auto-refresh every 30 seconds

**Step 2: Commit**

```bash
git add apps/bot-dashboard/src/app/dashboard/page.tsx
git commit -m "feat(bot-dashboard): enhanced dashboard overview with health + analytics + charts"
```

---

### Task 15: Conversations Page

**Files:**
- Create: `apps/bot-dashboard/src/app/dashboard/conversations/page.tsx`

**Step 1: Create unified conversations page**

Build a page with:
- Filter bar: Bot type dropdown, platform dropdown, date range, search input
- Table/list of conversations with expandable rows
- Pagination (cursor-based, "Load more" button)
- Export CSV button
- Auto-refresh every 30 seconds with "N new conversations" banner

Fetch from `/api/conversations` with query params.

**Step 2: Commit**

```bash
git add apps/bot-dashboard/src/app/dashboard/conversations/page.tsx
git commit -m "feat(bot-dashboard): add unified conversations page with filters and export"
```

---

### Task 16: Knowledge Base Page

**Files:**
- Create: `apps/bot-dashboard/src/app/dashboard/knowledge-base/page.tsx`

**Step 1: Create knowledge base management page**

Build a page with 3 tabs: Q&A, Files (placeholder for now), Web Crawl:

- **Q&A tab**: List entries from `/api/knowledge-base`, add/edit/delete forms
- **Files tab**: Placeholder with "Coming soon" (file upload requires GCS setup)
- **Web Crawl tab**: URL input + crawl button, list crawled pages with status

Fetch from `/api/knowledge-base` endpoints.

**Step 2: Commit**

```bash
git add apps/bot-dashboard/src/app/dashboard/knowledge-base/page.tsx
git commit -m "feat(bot-dashboard): add knowledge base management page (Q&A + crawl)"
```

---

### Task 17: Analytics Page

**Files:**
- Create: `apps/bot-dashboard/src/app/dashboard/analytics/page.tsx`

**Step 1: Create analytics page with charts**

Build a page with:
- Date range selector (7d / 30d / custom)
- Bot type filter
- Conversation trends `LineChart` (Recharts) from `/api/analytics/trends`
- Top 10 questions table from `/api/analytics/top-questions`
- Overview cards (today/month/active users) from `/api/analytics/overview`

**Step 2: Commit**

```bash
git add apps/bot-dashboard/src/app/dashboard/analytics/page.tsx
git commit -m "feat(bot-dashboard): add analytics page with charts and top questions"
```

---

### Task 18: Bindings Management Page

**Files:**
- Create: `apps/bot-dashboard/src/app/dashboard/bindings/page.tsx`

**Step 1: Create unified bindings page**

Build a page with 4 tabs (one per bot):
- Each tab shows bound users + invite codes
- Uses existing API endpoints: `/api/bindings`, `/api/parent-bindings`, `/api/ai-tutor/bindings`, etc.
- Generate invite code button per tab
- Delete binding button

**Step 2: Commit**

```bash
git add apps/bot-dashboard/src/app/dashboard/bindings/page.tsx
git commit -m "feat(bot-dashboard): add unified bindings management page"
```

---

### Task 19: Settings Page

**Files:**
- Create: `apps/bot-dashboard/src/app/dashboard/settings/page.tsx`

**Step 1: Create system settings page**

Build a page with:
- Welcome message textarea
- Enabled modules checkboxes
- Log retention days dropdown
- Save button

Fetch from `/api/settings`, save with `PUT /api/settings`.

**Step 2: Commit**

```bash
git add apps/bot-dashboard/src/app/dashboard/settings/page.tsx
git commit -m "feat(bot-dashboard): add system settings page"
```

---

### Task 20: Plans/Subscription Page Enhancement

**Files:**
- Modify: `apps/bot-dashboard/src/app/dashboard/plans/page.tsx`

**Step 1: Enhance plans page**

Update the existing plans page to show:
- 3 plan cards (Free/Basic/Pro) with feature comparison
- Current plan indicator
- Usage progress bars (AI calls, knowledge base storage)
- Upgrade button (placeholder)

Fetch from `/api/subscriptions` and `/api/usage`.

**Step 2: Commit**

```bash
git add apps/bot-dashboard/src/app/dashboard/plans/page.tsx
git commit -m "feat(bot-dashboard): enhance subscription plans page"
```

---

## Phase 4: Backend Integration (Tasks 21-23)

### Task 21: Integrate Dynamic Prompts into ai-engine.ts

**Files:**
- Modify: `apps/bot-gateway/src/modules/ai-engine.ts`

**Step 1: Update build*SystemPrompt functions**

For each of the 4 `build*SystemPrompt()` functions in ai-engine.ts:
1. Accept `tenantId` parameter
2. Try to load custom prompt from `getPromptSettings(tenantId, botType)`
3. If custom settings exist with `mode === 'advanced'`, use `fullPrompt`
4. If custom settings exist with `mode === 'structured'`, compose from structured fields
5. If no custom settings, use existing hardcoded prompt (backward compatible)

Also update model config: pass custom model name/temperature from settings to `getGenerativeModel()`.

**Step 2: Commit**

```bash
git add apps/bot-gateway/src/modules/ai-engine.ts
git commit -m "feat(bot): integrate dynamic prompt settings into ai-engine"
```

---

### Task 22: Integrate Dynamic Prompts into LINE Webhook

**Files:**
- Modify: `apps/bot-gateway/src/webhooks/line.ts`

**Step 1: Update LINE webhook to use dynamic prompts**

1. Import `getPromptSettings` from `../firestore/bot-prompt-settings`
2. In `handleMessageEvent()`, after determining user role, load wentaishi prompt settings for the user's tenant
3. If custom settings exist, use them instead of hardcoded `WENZHONG_*_PROMPT` constants
4. Use custom model config if available
5. Keep hardcoded prompts as fallback

**Step 2: Commit**

```bash
git add apps/bot-gateway/src/webhooks/line.ts
git commit -m "feat(bot): integrate dynamic prompts into LINE webhook"
```

---

### Task 23: Integrate Bot Health Tracking into Webhooks

**Files:**
- Modify: `apps/bot-gateway/src/webhooks/telegram.ts`
- Modify: `apps/bot-gateway/src/webhooks/telegram-parent.ts`
- Modify: `apps/bot-gateway/src/webhooks/telegram-student.ts`
- Modify: `apps/bot-gateway/src/webhooks/line.ts`

**Step 1: Add health tracking to all webhooks**

In each webhook handler, after processing a message:

```typescript
import { recordBotEvent } from '../firestore/bot-health';

// After successful reply:
void recordBotEvent(tenantId, botType, platform, true, latencyMs).catch(() => {});

// After error:
void recordBotEvent(tenantId, botType, platform, false, 0, error.message).catch(() => {});
```

Bot type mapping:
- `telegram.ts` -> `clairvoyant`, `telegram`
- `telegram-parent.ts` -> `windear`, `telegram`
- `telegram-student.ts` -> `ai-tutor`, `telegram`
- `line.ts` -> `wentaishi`, `line`

**Step 2: Commit**

```bash
git add apps/bot-gateway/src/webhooks/
git commit -m "feat(bot): add bot-health tracking to all webhook handlers"
```

---

## Phase 5: Conversation Unification (Task 24)

### Task 24: Write New Conversations to Unified Collection

**Files:**
- Modify: `apps/bot-gateway/src/webhooks/telegram.ts`
- Modify: `apps/bot-gateway/src/webhooks/telegram-parent.ts`
- Modify: `apps/bot-gateway/src/webhooks/telegram-student.ts`
- Modify: `apps/bot-gateway/src/webhooks/line.ts`

**Step 1: Add dual-write to unified bot-conversations**

In each webhook, after saving to the existing collection (for backward compatibility), also write to `bot-conversations` via `saveBotConversation()`:

```typescript
import { saveBotConversation } from '../firestore/bot-conversations';

// Fire-and-forget alongside existing save
void saveBotConversation({
  tenantId,
  botType: 'clairvoyant', // or windear/ai-tutor/wentaishi
  platform: 'telegram', // or 'line'
  userId: String(telegramUserId),
  userName,
  userRole: 'admin', // or parent/student/guest
  userMessage: messageText,
  botReply: reply,
  intent: parsedIntent,
  model: 'gemini-2.5-flash-lite',
  latencyMs,
  createdAt: new Date(),
}).catch(() => {});
```

**Step 2: Commit**

```bash
git add apps/bot-gateway/src/webhooks/
git commit -m "feat(bot): dual-write conversations to unified bot-conversations collection"
```

---

## Phase 6: TypeCheck & Verification (Task 25)

### Task 25: TypeScript Check & Final Verification

**Step 1: Run typecheck**

```bash
cd /Users/dali/Github/94CramManageSystem
pnpm typecheck
```

Fix any TypeScript errors.

**Step 2: Verify bot-dashboard builds**

```bash
pnpm --filter @94cram/bot-dashboard build
```

**Step 3: Verify bot-gateway builds**

```bash
pnpm --filter @94cram/bot-gateway build
```

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(bot): resolve TypeScript errors and build issues"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-8 | Backend: Firestore modules + API routes |
| 2 | 9-12 | Frontend: Dependencies, UI components, prompt editor |
| 3 | 13-20 | Frontend: All feature pages |
| 4 | 21-23 | Backend: Dynamic prompt integration + health tracking |
| 5 | 24 | Backend: Unified conversation dual-write |
| 6 | 25 | Verification: TypeCheck + build |

Total: 25 tasks across 6 phases.
