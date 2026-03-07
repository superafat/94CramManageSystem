# Three Breakthrough Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three breakthrough features (real-time classroom interaction, AI tutoring bot, business intelligence hub) across the 94CramManageSystem ecosystem, update all four website landing pages, and wire up the existing notification scheduler.

**Architecture:** Four phases executed sequentially. Phase 0 wires existing notification TODO stubs to real push channels. Phase 1 extends bot-gateway with a student-facing AI tutor role. Phase 2 adds cross-system data aggregation and intelligence APIs to manage-backend. Phase 3 adds SSE-based real-time classroom interaction to inclass-backend. Each phase includes corresponding frontend pages and landing page updates.

**Tech Stack:** Hono (backend), Next.js 14 App Router (frontend), Drizzle ORM (schema), Gemini API (AI), SSE (real-time), Firestore (bot state), Tailwind CSS (styling)

---

## Phase 0: Wire Proactive Notifications (1-2 days)

### Task 0.1: Wire Telegram dispatch in proactive-notifications

**Files:**
- Modify: `apps/bot-gateway/src/scheduler/proactive-notifications.ts`
- Reference: `apps/bot-gateway/src/utils/telegram.ts`
- Reference: `apps/bot-gateway/src/services/line.ts`
- Reference: `apps/bot-gateway/src/firestore/bindings.ts`

**Step 1: Read the current proactive-notifications.ts to understand TODO locations**

Read `apps/bot-gateway/src/scheduler/proactive-notifications.ts` and identify all `console.log` mock dispatches.

**Step 2: Implement dispatchTextNotification**

Replace the `console.log` stub in `dispatchTextNotification` with actual Telegram sendMessage call:
- Import `sendMessage` from `../utils/telegram`
- Look up the admin's Telegram chatId from Firestore bindings
- Call `sendMessage(chatId, message)`
- Wrap in try/catch, log errors but don't crash the scheduler

**Step 3: Implement dispatchFlexNotification for LINE**

Replace the `console.log` stub in `dispatchFlexNotification`:
- Import LINE push API from `../services/line`
- Look up the parent's LINE userId from `user_channel_bindings` where role='parent'
- Use existing Flex Message templates (`billingCard`, `recommendationCarousel`) based on notification type
- Fall back to text message if Flex template not available

**Step 4: Wire each of the 6 scheduled tasks**

For each scheduled task, replace the TODO/console.log with the real dispatch:
1. Daily billing reminder (admin) -> `dispatchTextNotification` via Telegram
2. Weekly billing reminder (parent) -> `dispatchFlexNotification` via LINE with `billingCard`
3. AI course recommendation -> `dispatchFlexNotification` via LINE with `recommendationCarousel`
4. Contact book push -> call internal API `/contact-book/pending-push`, then push via LINE, then mark pushed
5. Attendance anomaly alert (NEW) -> query `inclass_attendances` for 2+ consecutive absences or <70% monthly rate, notify parent via LINE
6. Monthly learning report (NEW) -> aggregate monthly stats per student, generate summary, push via LINE on 1st of month

**Step 5: Test manually**

Start bot-gateway locally, trigger each scheduler task manually (reduce interval to 10s for testing), verify messages arrive on Telegram/LINE test accounts.

**Step 6: Commit**

```bash
git add apps/bot-gateway/src/scheduler/
git commit -m "feat(bot): wire proactive notification scheduler to real push channels"
```

---

## Phase 1: 94BOT AI Tutor "Shen Suan Zi" (1-2 weeks)

### Task 1.1: Add student binding Firestore modules

**Files:**
- Create: `apps/bot-gateway/src/firestore/student-bindings.ts`
- Create: `apps/bot-gateway/src/firestore/student-invites.ts`
- Create: `apps/bot-gateway/src/firestore/ai-tutor-settings.ts`
- Reference: `apps/bot-gateway/src/firestore/parent-bindings.ts` (copy pattern)
- Reference: `apps/bot-gateway/src/firestore/parent-invites.ts` (copy pattern)

**Step 1: Create student-bindings.ts**

Mirror `parent-bindings.ts` structure:
- Collection: `student-bindings`
- Fields: `tenantId`, `studentId`, `platform` (telegram/line), `platformUserId`, `studentName`, `boundAt`
- Functions: `bindStudent`, `unbindStudent`, `getStudentBinding`, `getStudentBindingByPlatformId`, `listStudentBindings`

**Step 2: Create student-invites.ts**

Mirror `parent-invites.ts`:
- Collection: `student-invites`
- Fields: `tenantId`, `code`, `studentId`, `studentName`, `createdBy`, `usedBy`, `usedAt`, `expiresAt`
- Functions: `createStudentInvite`, `useStudentInvite`, `listStudentInvites`, `deleteStudentInvite`

**Step 3: Create ai-tutor-settings.ts**

- Collection: `ai-tutor-settings`
- Fields: `tenantId`, `enabled` (boolean), `allowedSubjects` (string[]), `responseStyle` ('concise'|'detailed'|'socratic'), `dailyQuota` (number), `restrictToKnowledgeBase` (boolean)
- Functions: `getTutorSettings`, `updateTutorSettings`, `getDefaultSettings`
- Default: enabled=true, allowedSubjects=[], responseStyle='detailed', dailyQuota=50, restrictToKnowledgeBase=true

**Step 4: Commit**

```bash
git add apps/bot-gateway/src/firestore/student-*.ts apps/bot-gateway/src/firestore/ai-tutor-settings.ts
git commit -m "feat(bot): add student binding and AI tutor settings Firestore modules"
```

### Task 1.2: Add student API client

**Files:**
- Create: `apps/bot-gateway/src/modules/student-api-client.ts`
- Reference: `apps/bot-gateway/src/modules/parent-api-client.ts` (copy pattern)

**Step 1: Create student-api-client.ts**

Mirror `parent-api-client.ts`, pointing to inclass-backend:
- `getStudentSchedule(tenantId, studentId)` -> GET `/api/bot/data/student-schedule`
- `getStudentGrades(tenantId, studentId)` -> GET `/api/exams/scores/{studentId}`
- `getStudentAttendance(tenantId, studentId)` -> GET `/api/parent-ext/attendance-summary`
- `getStudentWeakness(tenantId, studentId)` -> calls existing AI analysis service

**Step 2: Commit**

```bash
git add apps/bot-gateway/src/modules/student-api-client.ts
git commit -m "feat(bot): add student API client for AI tutor data access"
```

### Task 1.3: Extend AI Engine with student role

**Files:**
- Modify: `apps/bot-gateway/src/modules/ai-engine.ts`
- Reference: existing `buildAdminSystemPrompt`, `buildParentSystemPrompt`

**Step 1: Read ai-engine.ts to understand current structure**

Identify where admin and parent system prompts are built, and how role-based routing works.

**Step 2: Add buildStudentSystemPrompt function**

```typescript
function buildStudentSystemPrompt(tenantName: string, settings: AiTutorSettings): string {
  return `你是「神算子」，${tenantName} 補習班的 AI 課業助教。

角色定位：
- 你是學生的學習夥伴，幫助理解課業內容
- 用清楚易懂的方式解釋概念，適合國中/高中程度
- 引導學生思考，不直接給完整答案
- 不確定的內容誠實說「這個我不太確定，建議問老師」

回答風格：${settings.responseStyle === 'socratic' ? '蘇格拉底式提問引導' : settings.responseStyle === 'concise' ? '簡潔扼要' : '詳細解說'}

${settings.allowedSubjects.length > 0 ? `允許回答的科目：${settings.allowedSubjects.join('、')}。其他科目請回覆「這個科目目前還沒開放 AI 助教，請直接問老師喔！」` : ''}

重要規則：
- 絕對不能提供考試答案或幫寫作業
- 提供解題思路和方法，讓學生自己完成
- 遇到不適當的問題，禮貌拒絕並引導回學習
- 每次回答結尾可以問「還有哪裡不懂嗎？」`
}
```

**Step 3: Add student role handling in processMessage**

In the main message processing function, add a branch for `role === 'student'`:
- Load `ai-tutor-settings` from Firestore
- Check daily quota (query today's conversation count)
- If quota exceeded, return friendly message
- Build student system prompt
- Search knowledge base for relevant context (RAG)
- Call Gemini with system prompt + KB context + user message
- Store conversation in memory system

**Step 4: Add Gemini Vision support for homework_help**

When the student sends an image:
- Detect image attachment in message
- Upload to Gemini Vision API
- Prompt: "This is a homework/exam question photo. Identify the question, then provide step-by-step hints to solve it. Do NOT give the final answer directly."
- Return the hints as a text message

**Step 5: Commit**

```bash
git add apps/bot-gateway/src/modules/ai-engine.ts
git commit -m "feat(bot): add student AI tutor role (Shen Suan Zi) to AI engine"
```

### Task 1.4: Add student intent routing

**Files:**
- Modify: `apps/bot-gateway/src/handlers/intent-router.ts`

**Step 1: Read intent-router.ts to understand routing structure**

**Step 2: Add student intents**

Add the following intent handlers in the router:

```typescript
// Student intents
'student.ask_question': async (ctx) => {
  // Default: route to AI engine with student role
  return processStudentMessage(ctx)
},
'student.weakness': async (ctx) => {
  const weakness = await studentApiClient.getStudentWeakness(ctx.tenantId, ctx.studentId)
  return formatWeaknessReport(weakness)
},
'student.homework_help': async (ctx) => {
  // Handled by AI engine when image is detected
  return processStudentMessage(ctx, { isHomeworkHelp: true })
},
'student.schedule': async (ctx) => {
  const schedule = await studentApiClient.getStudentSchedule(ctx.tenantId, ctx.studentId)
  return formatScheduleResponse(schedule)
},
'student.grades': async (ctx) => {
  const grades = await studentApiClient.getStudentGrades(ctx.tenantId, ctx.studentId)
  return formatGradesResponse(grades)
},
```

**Step 3: Update intent classification prompt**

In the Gemini intent classification prompt, add student intent patterns:
- Schedule/grades/weakness queries -> specific intents
- Everything else from student role -> `student.ask_question`

**Step 4: Commit**

```bash
git add apps/bot-gateway/src/handlers/intent-router.ts
git commit -m "feat(bot): add student intent routing for AI tutor"
```

### Task 1.5: Add student webhook handler

**Files:**
- Modify: `apps/bot-gateway/src/index.ts` (add route)
- Create: `apps/bot-gateway/src/handlers/student-handler.ts`
- Reference: `apps/bot-gateway/src/handlers/parent-handler.ts` (mirror pattern)

**Step 1: Create student-handler.ts**

Mirror parent-handler.ts:
- Receive Telegram/LINE message
- Look up student binding by platformUserId
- If not bound, guide to binding flow
- If bound, route to intent-router with `role: 'student'`

**Step 2: Register webhook route in index.ts**

```typescript
app.post('/webhook/telegram-student', studentHandler.handleTelegram)
// LINE: add student role detection in existing LINE webhook handler
```

**Step 3: Add student bind command**

Create `apps/bot-gateway/src/commands/student-bind.ts`:
- `/bind <invite_code>` -> validate invite code -> create student binding -> confirm

**Step 4: Commit**

```bash
git add apps/bot-gateway/src/handlers/student-handler.ts apps/bot-gateway/src/commands/student-bind.ts apps/bot-gateway/src/index.ts
git commit -m "feat(bot): add student webhook handler and binding command"
```

### Task 1.6: Add AI tutor dashboard API

**Files:**
- Modify: `apps/bot-gateway/src/api/index.ts`

**Step 1: Read current api/index.ts to understand structure**

**Step 2: Add AI tutor API endpoints**

```typescript
// AI Tutor settings
app.get('/api/ai-tutor/settings', async (c) => {
  const tenantId = c.get('tenantId')
  const settings = await getTutorSettings(tenantId)
  return c.json(settings)
})

app.put('/api/ai-tutor/settings', async (c) => {
  const tenantId = c.get('tenantId')
  const body = await c.req.json()
  // zod validation
  await updateTutorSettings(tenantId, body)
  return c.json({ success: true })
})

// Student invites
app.post('/api/ai-tutor/invites', ...) // create invite
app.get('/api/ai-tutor/invites', ...)  // list invites
app.delete('/api/ai-tutor/invites/:id', ...) // delete invite

// Student bindings
app.get('/api/ai-tutor/bindings', ...)    // list bound students
app.delete('/api/ai-tutor/bindings/:id', ...) // unbind student

// Conversations
app.get('/api/ai-tutor/conversations', ...) // list student conversations
app.get('/api/ai-tutor/conversations/:studentId', ...) // single student history

// Analytics
app.get('/api/ai-tutor/analytics', ...) // usage stats, popular questions, trends
```

**Step 3: Commit**

```bash
git add apps/bot-gateway/src/api/index.ts
git commit -m "feat(bot): add AI tutor dashboard API endpoints"
```

### Task 1.7: Build bot-dashboard AI tutor pages

**Files:**
- Create: `apps/bot-dashboard/src/app/dashboard/ai-tutor/page.tsx`
- Create: `apps/bot-dashboard/src/app/dashboard/ai-tutor/settings/page.tsx`
- Create: `apps/bot-dashboard/src/app/dashboard/ai-tutor/conversations/page.tsx`
- Create: `apps/bot-dashboard/src/app/dashboard/ai-tutor/analytics/page.tsx`
- Create: `apps/bot-dashboard/src/app/dashboard/ai-tutor/invites/page.tsx`
- Reference: `apps/bot-dashboard/src/app/dashboard/wentaishi/page.tsx` (copy layout pattern)

**Step 1: Create AI tutor main page**

`/dashboard/ai-tutor/page.tsx`:
- Header: "AI 課業助教 — 神算子"
- Stats cards: 今日問答數, 本月累計, 活躍學生數, 知識庫命中率
- Quick links to settings, conversations, analytics, invites
- Enable/disable toggle

**Step 2: Create settings page**

`/dashboard/ai-tutor/settings/page.tsx`:
- Allowed subjects checkboxes (國文/英文/數學/理化/社會/其他)
- Response style radio: 簡潔扼要 / 詳細解說 / 蘇格拉底式引導
- Daily quota per student input
- Restrict to knowledge base toggle
- Save button -> PUT `/api/ai-tutor/settings`

**Step 3: Create conversations page**

`/dashboard/ai-tutor/conversations/page.tsx`:
- Student selector dropdown
- Chat history display (student messages + AI responses)
- Date range filter
- Search within conversations

**Step 4: Create analytics page**

`/dashboard/ai-tutor/analytics/page.tsx`:
- Line chart: daily question count trend
- Bar chart: questions by subject
- Table: top 10 most asked questions
- Pie chart: answer source (knowledge base vs general AI)

**Step 5: Create invites page**

`/dashboard/ai-tutor/invites/page.tsx`:
- Generate invite code button
- List of active invites with QR code display
- List of bound students with unbind option

**Step 6: Commit**

```bash
git add apps/bot-dashboard/src/app/dashboard/ai-tutor/
git commit -m "feat(bot-dashboard): add AI tutor management pages"
```

### Task 1.8: Update bot-dashboard landing page

**Files:**
- Modify: `apps/bot-dashboard/src/app/landing/page.tsx`

**Step 1: Read current landing page** (already read)

**Step 2: Add AI tutor feature cards**

After existing FeatureCards, add:
```tsx
<FeatureCard emoji="🎓" title="AI 課業助教 — 神算子"
  desc="學生透過 LINE 隨時問課業問題，AI 根據課程內容即時回答。拍照傳題目也能解題，24 小時不休息的專屬家教。" />
<FeatureCard emoji="📸" title="拍照解題"
  desc="學生拍照傳作業或考卷，AI 辨識題目並提供解題思路，培養獨立思考能力。" />
```

**Step 3: Update integration flow diagram**

Update the integration section to show student flow:
```
94inClass -> 94BOT 聞太師 -> 家長 LINE
                  |
             94BOT 神算子 -> 學生 LINE
```

**Step 4: Update pricing cards**

Add student AI quota to each plan:
- 體驗版: + 學生問答 50 則/月
- 標準版: + 學生問答 200 則/月
- 專業版: + 學生問答 1000 則/月
- 旗艦版: + 學生問答 3000 則/月

**Step 5: Commit**

```bash
git add apps/bot-dashboard/src/app/landing/page.tsx
git commit -m "feat(bot-dashboard): update landing page with AI tutor features"
```

### Task 1.9: Typecheck and verify Phase 1

**Step 1: Run typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors

**Step 2: Build bot-gateway and bot-dashboard**

```bash
pnpm --filter bot-gateway build
pnpm --filter bot-dashboard build
```

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(bot): resolve typecheck errors in Phase 1"
```

---

## Phase 2: 94Manage Business Intelligence Hub (2-3 weeks)

### Task 2.1: Add intelligence schema tables

**Files:**
- Modify: `packages/shared/src/db/schema/manage.ts`

**Step 1: Read current manage.ts schema**

**Step 2: Add three new tables at the end of manage.ts**

```typescript
// === Intelligence Hub Tables ===

export const manageStudentLearningProfiles = pgTable('manage_student_learning_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  branchId: uuid('branch_id').references(() => branches.id),
  studentId: uuid('student_id').notNull().references(() => manageStudents.id),
  attendanceRate30d: real('attendance_rate_30d'),
  avgScoreTrend: varchar('avg_score_trend', { length: 20 }), // improving/stable/declining
  latestAvgScore: real('latest_avg_score'),
  paymentStatus: varchar('payment_status', { length: 20 }), // paid/partial/overdue
  contactBookReadRate: real('contact_book_read_rate'),
  churnRiskScore: real('churn_risk_score'),
  renewalProbability: real('renewal_probability'),
  aiSummary: text('ai_summary'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const manageTeacherPerformance = pgTable('manage_teacher_performance', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  teacherId: uuid('teacher_id').notNull().references(() => manageTeachers.id),
  period: varchar('period', { length: 20 }).notNull(), // monthly/quarterly
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  studentProgressRate: real('student_progress_rate'),
  classAttendanceRate: real('class_attendance_rate'),
  parentSatisfaction: real('parent_satisfaction'),
  studentRetentionRate: real('student_retention_rate'),
  teacherAttendanceRate: real('teacher_attendance_rate'),
  overallScore: real('overall_score'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const manageRevenueForecasts = pgTable('manage_revenue_forecasts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  branchId: uuid('branch_id').references(() => branches.id),
  forecastMonth: date('forecast_month').notNull(),
  expectedRevenue: real('expected_revenue'),
  churnAdjustment: real('churn_adjustment'),
  seasonalFactor: real('seasonal_factor'),
  confidence: real('confidence'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

**Step 3: Push schema to database**

```bash
pnpm --filter @94cram/shared drizzle-kit push
```

**Step 4: Commit**

```bash
git add packages/shared/src/db/schema/manage.ts
git commit -m "feat(shared): add intelligence hub schema tables"
```

### Task 2.2: Create intelligence service

**Files:**
- Create: `apps/manage-backend/src/services/intelligence.ts`
- Reference: `apps/manage-backend/src/ai/churn-v2.ts`
- Reference: `apps/manage-backend/src/services/ai-analysis.ts`
- Reference: `apps/manage-backend/src/routes/admin/finance.ts`

**Step 1: Create intelligence.ts with learning profile aggregation**

```typescript
// Core function: aggregate learning profiles
export async function aggregateLearningProfiles(tenantId: string, branchId?: string) {
  // 1. Get all active students
  // 2. For each student:
  //    a. Query inclass internal API for attendance rate (30d)
  //    b. Query inclass internal API for exam scores trend
  //    c. Query manage_payments for payment status
  //    d. Query contact book feedback for read rate
  //    e. Get churn risk from churn-v2 calculateChurnRisk
  //    f. Calculate renewal probability
  //    g. Generate AI summary via Gemini
  // 3. Upsert into manage_student_learning_profiles
}
```

**Step 2: Add renewal probability calculation**

Extend existing `calculateChurnRisk` logic:
- Factor in enrollment end date proximity
- Factor in attendance trend (declining = lower renewal)
- Factor in score trend
- Output 0-100% renewal probability

**Step 3: Add teacher performance calculation**

```typescript
export async function calculateTeacherPerformance(tenantId: string, period: 'monthly'|'quarterly') {
  // For each teacher:
  // 1. studentProgressRate: compare avg scores at period start vs end for their classes
  // 2. classAttendanceRate: avg attendance rate of their classes
  // 3. parentSatisfaction: avg rating from contact_book_feedback
  // 4. studentRetentionRate: active/total enrollments for their courses
  // 5. teacherAttendanceRate: from manage_teacher_attendance
  // Overall = weighted sum (30/20/25/15/10)
}
```

**Step 4: Add revenue forecast**

```typescript
export async function generateRevenueForecast(tenantId: string, months: number = 3) {
  // 1. Count active enrollments x course fees
  // 2. Apply churn prediction (reduce by predicted losses)
  // 3. Apply seasonal factor (Feb/Jul/Aug = 1.3x, others = 1.0x)
  // 4. Calculate confidence based on data completeness
  // 5. Insert into manage_revenue_forecasts
}
```

**Step 5: Add health score**

```typescript
export async function calculateHealthScore(tenantId: string): Promise<{
  score: number, breakdown: Record<string, number>
}> {
  // Weighted: revenue trend 25%, renewal rate 25%, attendance 20%, satisfaction 15%, teacher stability 15%
}
```

**Step 6: Commit**

```bash
git add apps/manage-backend/src/services/intelligence.ts
git commit -m "feat(manage): add intelligence service with aggregation logic"
```

### Task 2.3: Add intelligence routes

**Files:**
- Create: `apps/manage-backend/src/routes/admin/intelligence.ts`
- Modify: `apps/manage-backend/src/index.ts` (register routes)

**Step 1: Create intelligence.ts routes**

All routes behind admin auth middleware:

```typescript
// GET /admin/intelligence/dashboard - main KPI overview
// GET /admin/intelligence/learning-profiles - student list with filters
// GET /admin/intelligence/learning-profiles/:studentId - single student
// POST /admin/intelligence/learning-profiles/refresh - manual trigger
// GET /admin/intelligence/renewal-predictions - renewal list
// GET /admin/intelligence/renewal-predictions/summary - risk distribution
// GET /admin/intelligence/teacher-performance - teacher ranking
// GET /admin/intelligence/teacher-performance/:teacherId - single teacher
// GET /admin/intelligence/revenue-forecast - 3-month forecast
// GET /admin/intelligence/health-score - overall health
```

Each route with zod validation for query params (branchId, period, page, limit, sortBy).

**Step 2: Register in index.ts**

```typescript
import { intelligenceRoutes } from './routes/admin/intelligence'
app.route('/api/admin/intelligence', intelligenceRoutes)
```

**Step 3: Add cron scheduler**

In manage-backend startup, add:
```typescript
// Daily 03:00 - update learning profiles
// Weekly Monday 04:00 - update teacher performance
// Monthly 1st 05:00 - update revenue forecast
```

Use `node-cron` or simple `setInterval` with time check.

**Step 4: Commit**

```bash
git add apps/manage-backend/src/routes/admin/intelligence.ts apps/manage-backend/src/index.ts
git commit -m "feat(manage): add intelligence hub API routes and cron scheduler"
```

### Task 2.4: Build manage-dashboard intelligence pages

**Files:**
- Create: `apps/manage-dashboard/src/app/(dashboard)/intelligence/page.tsx`
- Create: `apps/manage-dashboard/src/app/(dashboard)/intelligence/students/page.tsx`
- Create: `apps/manage-dashboard/src/app/(dashboard)/intelligence/students/[id]/page.tsx`
- Create: `apps/manage-dashboard/src/app/(dashboard)/intelligence/renewal/page.tsx`
- Create: `apps/manage-dashboard/src/app/(dashboard)/intelligence/teachers/page.tsx`
- Create: `apps/manage-dashboard/src/app/(dashboard)/intelligence/revenue/page.tsx`
- Reference: `apps/manage-dashboard/src/app/(dashboard)/finance/page.tsx` (layout pattern)

**Step 1: Create main intelligence dashboard page**

`/intelligence/page.tsx`:
- Health score gauge (circular progress, 0-100)
- KPI cards row: 續班率, 營收預測, 平均出勤率, 家長滿意度
- Quick alerts: 高風險學生 count, 績效異常教師 count
- Navigation cards to sub-pages

**Step 2: Create students learning profiles page**

`/intelligence/students/page.tsx`:
- Filterable table: student name, attendance %, score trend (arrow icon), payment status (badge), churn risk (color-coded), renewal probability (%)
- Sort by any column
- Search by name
- Click row -> navigate to detail

**Step 3: Create single student detail page**

`/intelligence/students/[id]/page.tsx`:
- Radar chart: 5 dimensions (attendance, scores, payment, engagement, churn risk)
- Timeline: key events (score changes, absences, payment events)
- AI summary card
- Action buttons: 聯繫家長, 安排補課

**Step 4: Create renewal prediction page**

`/intelligence/renewal/page.tsx`:
- Donut chart: high/medium/low risk distribution
- Table: students sorted by renewal probability (ascending = highest risk first)
- Filter by risk level
- Batch action: send care message to selected students

**Step 5: Create teacher performance page**

`/intelligence/teachers/page.tsx`:
- Ranking table: teacher name, overall score, 5 sub-scores as progress bars
- Period selector: monthly/quarterly
- Click -> modal with detailed breakdown

**Step 6: Create revenue forecast page**

`/intelligence/revenue/page.tsx`:
- Line chart: actual revenue (past 6 months) + forecast (next 3 months) with confidence band
- Table: monthly breakdown with churn adjustment and seasonal factor
- YoY / MoM comparison cards

**Step 7: Commit**

```bash
git add apps/manage-dashboard/src/app/\(dashboard\)/intelligence/
git commit -m "feat(manage-dashboard): add intelligence hub pages"
```

### Task 2.5: Update manage-dashboard landing page

**Files:**
- Modify: `apps/manage-dashboard/src/app/landing/page.tsx`

**Step 1: Add intelligence FeatureCard**

After existing FeatureCards:
```tsx
<FeatureCard
  emoji="🧠"
  title="經營智慧中樞"
  desc="AI 驅動的 CEO 駕駛艙 — 續班率預測、營收預測、教師績效、學生全貌分析，一頁掌握全局。"
/>
```

**Step 2: Update AI analysis card description**

Change the existing AI card desc from:
"AI 流失預警，提前發現可能退班的學生。招生 CRM + RAG 知識庫，智慧營運決策。"
To:
"AI 流失預警 + 續班率預測，提前 4-6 週鎖定風險學生。經營智慧中樞整合營收預測、教師績效、學生全貌。"

**Step 3: Update pricing AI plan features**

```tsx
// Change AI version features from:
['無限學生', 'AI 流失預警', 'RAG 知識庫（AI 客服）', '多分校管理', '專屬客服']
// To:
['無限學生', 'AI 流失預警 + 續班預測', '經營智慧中樞', '營收預測 + 教師績效', '多分校管理', '專屬客服']
```

**Step 4: Update comparison table**

Add two new rows:
- 續班率預測: 業界A -, 業界B -, 蜂神榜 check
- 經營智慧中樞: 業界A -, 業界B -, 蜂神榜 check

**Step 5: Commit**

```bash
git add apps/manage-dashboard/src/app/landing/page.tsx
git commit -m "feat(manage-dashboard): update landing page with intelligence hub"
```

### Task 2.6: Typecheck and verify Phase 2

```bash
pnpm typecheck
pnpm --filter manage-backend build
pnpm --filter manage-dashboard build
```

---

## Phase 3: 94inClass Real-Time Classroom Interaction (2-4 weeks)

### Task 3.1: Add classroom schema tables

**Files:**
- Modify: `packages/shared/src/db/schema/inclass.ts`

**Step 1: Read current inclass.ts schema**

**Step 2: Add three new tables**

```typescript
// === Classroom Interaction Tables ===

export const inclassClassroomSessions = pgTable('inclass_classroom_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  scheduleId: uuid('schedule_id').references(() => inclassSchedules.id),
  teacherId: uuid('teacher_id').notNull(),
  courseId: uuid('course_id'),
  sessionCode: varchar('session_code', { length: 8 }).notNull(), // 4-6 digit code for students to join
  sessionDate: date('session_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active/ended
  createdAt: timestamp('created_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
})

export const inclassClassroomActivities = pgTable('inclass_classroom_activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  sessionId: uuid('session_id').notNull().references(() => inclassClassroomSessions.id),
  type: varchar('type', { length: 20 }).notNull(), // poll/quiz/random_pick/rush_answer
  question: text('question').notNull(),
  options: jsonb('options'), // string[] for choices
  correctAnswer: varchar('correct_answer', { length: 500 }), // for quiz type
  results: jsonb('results'), // aggregated results
  winnerId: uuid('winner_id'), // for random_pick/rush_answer
  status: varchar('status', { length: 20 }).notNull().default('active'), // active/closed
  createdAt: timestamp('created_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
})

export const inclassStudentResponses = pgTable('inclass_student_responses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  activityId: uuid('activity_id').notNull().references(() => inclassClassroomActivities.id),
  studentId: uuid('student_id').notNull(),
  answer: varchar('answer', { length: 500 }).notNull(),
  responseTimeMs: integer('response_time_ms'), // for rush_answer
  isCorrect: boolean('is_correct'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

**Step 3: Push schema**

```bash
pnpm --filter @94cram/shared drizzle-kit push
```

**Step 4: Commit**

```bash
git add packages/shared/src/db/schema/inclass.ts
git commit -m "feat(shared): add classroom interaction schema tables"
```

### Task 3.2: Create classroom service with SSE

**Files:**
- Create: `apps/inclass-backend/src/services/classroom.ts`

**Step 1: Create in-memory session manager**

```typescript
// Map<sessionId, Set<WritableStreamDefaultWriter>> for SSE connections
const teacherStreams = new Map<string, Set<WritableStreamDefaultWriter>>()
const studentStreams = new Map<string, Set<WritableStreamDefaultWriter>>()

export function addTeacherStream(sessionId: string, writer: WritableStreamDefaultWriter) { ... }
export function addStudentStream(sessionId: string, writer: WritableStreamDefaultWriter) { ... }
export function broadcastToStudents(sessionId: string, event: SSEEvent) { ... }
export function broadcastToTeacher(sessionId: string, event: SSEEvent) { ... }
```

**Step 2: Add session management functions**

```typescript
export async function startSession(tenantId, teacherId, courseId, scheduleId?) { ... }
export async function endSession(sessionId) { ... }
export async function generateSessionCode(): string { /* 6-digit random */ }
```

**Step 3: Add activity management functions**

```typescript
export async function createActivity(sessionId, type, question, options?, correctAnswer?) { ... }
export async function closeActivity(activityId) { /* aggregate results, broadcast final */ }
export async function submitResponse(activityId, studentId, answer, responseTimeMs?) { ... }
export async function getActivityResults(activityId) { ... }
export async function randomPick(sessionId) { /* pick random student from enrolled */ }
```

**Step 4: Commit**

```bash
git add apps/inclass-backend/src/services/classroom.ts
git commit -m "feat(inclass): add classroom service with SSE stream management"
```

### Task 3.3: Create classroom routes

**Files:**
- Create: `apps/inclass-backend/src/routes/classroom.ts`
- Modify: `apps/inclass-backend/src/index.ts`

**Step 1: Create classroom.ts routes**

```typescript
// Session management (teacher only)
POST /classroom/session/start    -> startSession
POST /classroom/session/:id/end  -> endSession
GET  /classroom/session/:id      -> getSession

// Activity management (teacher only)
POST /classroom/activity                -> createActivity
POST /classroom/activity/:id/close      -> closeActivity
GET  /classroom/activity/:id/results    -> getActivityResults
GET  /classroom/session/:id/activities  -> listActivities

// Student participation
POST /classroom/activity/:id/respond    -> submitResponse
GET  /classroom/join/:code              -> joinByCode (lookup session by code)

// SSE streams
GET  /classroom/session/:id/stream         -> student SSE stream
GET  /classroom/session/:id/teacher-stream -> teacher SSE stream
```

**Step 2: Implement SSE endpoints**

```typescript
app.get('/classroom/session/:id/stream', async (c) => {
  const sessionId = c.req.param('id')
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        const send = (data: string) => {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }
        // Register this stream
        addStudentStream(sessionId, { send, close: () => controller.close() })
        // Send initial state
        send(JSON.stringify({ type: 'connected', sessionId }))
      },
      cancel() {
        // Remove stream on disconnect
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    }
  )
})
```

**Step 3: Register in index.ts**

```typescript
import { classroomRoutes } from './routes/classroom'
app.route('/api', classroomRoutes)
```

**Step 4: Commit**

```bash
git add apps/inclass-backend/src/routes/classroom.ts apps/inclass-backend/src/index.ts
git commit -m "feat(inclass): add classroom interaction routes with SSE"
```

### Task 3.4: Build inclass-dashboard classroom pages

**Files:**
- Create: `apps/inclass-dashboard/src/app/(dashboard)/classroom/page.tsx`
- Create: `apps/inclass-dashboard/src/app/(dashboard)/classroom/[sessionId]/page.tsx`
- Create: `apps/inclass-dashboard/src/app/(dashboard)/classroom/student/page.tsx`
- Create: `apps/inclass-dashboard/src/app/(dashboard)/classroom/student/[sessionId]/page.tsx`

**Step 1: Create teacher classroom launcher**

`/classroom/page.tsx`:
- Select course/class from dropdown
- "Start Interactive Session" button
- Recent sessions history table

**Step 2: Create teacher control console**

`/classroom/[sessionId]/page.tsx`:
- Session code display (large, for students to see)
- QR Code for students to scan and join
- Connected students count
- Activity creation panel:
  - Type selector (投票/搶答/隨機抽問/測驗)
  - Question text input
  - Options inputs (for poll/quiz)
  - Correct answer selector (for quiz)
  - "Launch" button
- Active activity display:
  - Real-time response count
  - Live results chart (bar chart for polls, leaderboard for rush)
  - "Close Activity" button
- Activity history list

**Step 3: Create student join page**

`/classroom/student/page.tsx`:
- Input field for session code (6 digits)
- "Join" button
- Or scan QR code instruction

**Step 4: Create student participation page**

`/classroom/student/[sessionId]/page.tsx`:
- Wait screen when no active activity ("Waiting for teacher...")
- When activity arrives via SSE:
  - Poll: show options as big buttons, tap to vote
  - Quiz: show options, tap to answer, show correct/incorrect
  - Rush answer: "BUZZ" button, then answer input
  - Random pick: show animation, reveal selected student
- Results display after activity closes

**Step 5: Commit**

```bash
git add apps/inclass-dashboard/src/app/\(dashboard\)/classroom/
git commit -m "feat(inclass-dashboard): add classroom interaction pages"
```

### Task 3.5: Update inclass-dashboard landing page

**Files:**
- Modify: `apps/inclass-dashboard/src/app/landing/page.tsx`

**Step 1: Add classroom FeatureCard**

After existing FeatureCards:
```tsx
<FeatureCard
  emoji="🎯"
  title="即時課堂互動"
  desc="投票、搶答、隨機抽問 — 讓課堂活起來。教師發起互動，學生用手機即時參與，結果同步顯示。"
/>
```

**Step 2: Update integration section**

In the InClass integration card items, add "即時課堂互動".

**Step 3: Commit**

```bash
git add apps/inclass-dashboard/src/app/landing/page.tsx
git commit -m "feat(inclass-dashboard): update landing page with classroom interaction"
```

### Task 3.6: Update stock-dashboard landing page

**Files:**
- Modify: `apps/stock-dashboard/src/app/(marketing)/page.tsx`

**Step 1: Update system integration card**

Change the integration feature description:
```
From: "與 94Manage、94inClass 無縫串接，資料同步"
To:   "與經營智慧中樞無縫整合 — 庫存成本自動納入營收預測，教材消耗納入經營健康分數"
```

**Step 2: Add intelligence integration feature card**

Add to the features array:
```typescript
{
  emoji: '🧠',
  title: '智慧經營整合',
  description: '庫存數據自動匯入 94Manage 經營智慧中樞，採購成本影響即時反映在營收預測中',
  accent: '#6366F1',
}
```

**Step 3: Commit**

```bash
git add apps/stock-dashboard/src/app/\(marketing\)/page.tsx
git commit -m "feat(stock-dashboard): update landing page with intelligence integration"
```

### Task 3.7: Final typecheck and build verification

**Step 1: Full typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors

**Step 2: Build all affected apps**

```bash
pnpm --filter @94cram/shared build
pnpm --filter bot-gateway build
pnpm --filter bot-dashboard build
pnpm --filter manage-backend build
pnpm --filter manage-dashboard build
pnpm --filter inclass-backend build
pnpm --filter inclass-dashboard build
pnpm --filter stock-dashboard build
```

**Step 3: Fix any errors and commit**

```bash
git add -A
git commit -m "fix: resolve build errors across all apps"
```

---

## Summary

| Phase | Tasks | Key Deliverables |
|-------|-------|-----------------|
| 0 | 0.1 | Notification scheduler wired to real push |
| 1 | 1.1-1.9 | AI tutor bot + dashboard + landing page |
| 2 | 2.1-2.6 | Intelligence hub + dashboard + landing page |
| 3 | 3.1-3.7 | Classroom interaction + dashboard + all landing pages |

Total: 22 tasks across 4 phases.
