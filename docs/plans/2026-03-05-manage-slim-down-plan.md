# 94manage 架構瘦身 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將 94manage 的課堂教學功能（成績、出勤、聯絡簿、補課）遷移至 94inClass，修復 403 bug 和 Cloud Run 啟動問題。

**Architecture:** 按角色完全切分 — 學生/家長用 inClass，老師/行政用 manage。維持共用 DB 直接查詢，新功能表用 `inclass_` 前綴。合併兩系統的精華實作。

**Tech Stack:** Hono (backend), Next.js 14 (dashboard), Drizzle ORM, PostgreSQL, tsx runtime, LINE/Telegram notifications

---

## Phase 0: 修復 403 Bug + Cloud Run 啟動問題

### Task 1: 修復 inclass-backend Dockerfile (tsx runtime)

**Files:**
- Modify: `apps/inclass-backend/Dockerfile`
- Reference: `apps/bot-gateway/Dockerfile` (已修復版本)

**Step 1: 修改 Dockerfile 加入 tsx**

在 runtime stage 加入 `tsx` 安裝，CMD 改用 tsx 執行：

```dockerfile
# 在 runtime stage 的 apt-get 之後加入
RUN npm install -g tsx

# 修改 CMD
CMD ["tsx", "dist/index.js"]
```

具體位置：
- 在 `RUN apt-get update && apt-get install -y ...` 之後加入 `RUN npm install -g tsx`
- 將 `CMD ["node", "dist/index.js"]` 改為 `CMD ["tsx", "dist/index.js"]`

**Step 2: 驗證 build**

Run: `docker build --platform linux/amd64 -f apps/inclass-backend/Dockerfile -t test-inclass .`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/inclass-backend/Dockerfile
git commit -m "fix(inclass): add tsx runtime to Dockerfile for @94cram/shared .ts imports"
```

---

### Task 2: 修復 inclass-dashboard API proxy

**Files:**
- Modify: `apps/inclass-dashboard/next.config.ts`

**Step 1: 加入 /api/* rewrite 規則**

在現有的 `/health` rewrite 之後加入 API proxy：

```typescript
async rewrites() {
  const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER || '1015149159553'
  const BACKEND_URL = process.env.BACKEND_URL || `https://cram94-inclass-backend-${GCP_PROJECT_NUMBER}.asia-east1.run.app`
  return [
    {
      source: '/health',
      destination: `${BACKEND_URL}/health`,
    },
    {
      source: '/api/:path*',
      destination: `${BACKEND_URL}/api/:path*`,
    },
  ]
}
```

**Step 2: 驗證 typecheck**

Run: `pnpm --filter inclass-dashboard exec tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add apps/inclass-dashboard/next.config.ts
git commit -m "fix(inclass): add API proxy rewrite to fix cross-origin 403 on demo login"
```

---

### Task 3: 驗證 + Push P0

**Step 1: 全域 typecheck**

Run: `pnpm typecheck`
Expected: 0 errors (或僅 pre-existing errors)

**Step 2: Push + 確認 CI**

```bash
git push origin main
```

等 3 分鐘後：
Run: `gh run list --limit 5 --repo superafat/94CramManageSystem`
Expected: Deploy 94inClass 應該 success（不再 startup failure）

---

## Phase 1: 成績管理合併

### Task 4: 增強 inclass-backend 成績 API

**Files:**
- Modify: `apps/inclass-backend/src/routes/exams.ts`
- Reference: `apps/manage-backend/src/routes/admin/grades.ts`

**Step 1: 加入成績統計端點**

在 `exams.ts` 中加入從 manage grades.ts 合併的功能：
- `GET /exams/grades/:studentId` — 查詢學生成績列表（支持 examType, from, to 篩選）
- 自動計算 percentage, letterGrade (A-F), passed (>=60)

```typescript
// GET /exams/grades/:studentId - 學生成績歷史
exams.get('/grades/:studentId', async (c) => {
  const tenantId = c.get('tenantId')
  const { studentId } = c.req.param()
  const { examType, from, to } = c.req.query()

  const conditions = [
    eq(inclassExamScores.studentId, studentId),
    // join with exams for tenantId filter
  ]

  // Query exam_scores joined with exams
  // Calculate percentage, letterGrade, passed
  // Return sorted by examDate desc
})
```

**Step 2: 加入批量成績新增**

```typescript
// POST /exams/grades/batch - 批量新增成績
exams.post('/grades/batch', async (c) => {
  // Accept { records: [{ studentId, examId, score, note }] }
  // Validate with zod
  // Batch insert into inclass_exam_scores
})
```

**Step 3: 驗證 typecheck**

Run: `pnpm --filter inclass-backend exec tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```bash
git add apps/inclass-backend/src/routes/exams.ts
git commit -m "feat(inclass): enhance exam grades API with statistics and batch insert"
```

---

### Task 5: 加入成績管理前端頁面增強

**Files:**
- Modify: `apps/inclass-dashboard/src/app/grades/page.tsx`

**Step 1: 增強成績頁面**

在現有成績頁面加入：
- 成績趨勢圖表（使用現有分數資料）
- 科目篩選
- 成績統計卡片（平均、最高、最低、及格率）

**Step 2: 驗證 typecheck**

Run: `pnpm --filter inclass-dashboard exec tsc --noEmit`

**Step 3: Commit**

```bash
git add apps/inclass-dashboard/src/app/grades/page.tsx
git commit -m "feat(inclass): enhance grades page with statistics and filters"
```

---

## Phase 2: 出勤管理合併

### Task 6: 增強 inclass-backend 出勤 API

**Files:**
- Modify: `apps/inclass-backend/src/routes/attendance.ts`
- Reference: `apps/manage-backend/src/routes/admin/attendance.ts`

**Step 1: 加入出勤查詢與統計端點**

```typescript
// GET /attendance/history - 出勤歷史查詢（支持 studentId, from, to 篩選）
attendance.get('/history', async (c) => {
  const tenantId = c.get('tenantId')
  const { studentId, from, to } = c.req.query()
  // Query inclass_attendances with filters
  // Return with student name joined
})

// GET /attendance/stats - 出勤統計
attendance.get('/stats', async (c) => {
  const tenantId = c.get('tenantId')
  const { studentId, from, to } = c.req.query()
  // Count by status: present, absent, late, leave
  // Calculate attendance rate
})
```

**Step 2: 加入簽退端點**

```typescript
// POST /attendance/checkout - 簽退
attendance.post('/checkout', async (c) => {
  // Update checkOutTime on today's attendance record
  // Fire-and-forget notify parent via manage internal API
})
```

**Step 3: 加入請假記錄管理**

```typescript
// POST /attendance/leave - 請假申請
// GET /attendance/leaves - 請假記錄查詢
```

**Step 4: 驗證 typecheck**

Run: `pnpm --filter inclass-backend exec tsc --noEmit`

**Step 5: Commit**

```bash
git add apps/inclass-backend/src/routes/attendance.ts
git commit -m "feat(inclass): enhance attendance API with history, stats, checkout, and leave"
```

---

### Task 7: 增強出勤前端頁面

**Files:**
- Modify: `apps/inclass-dashboard/src/app/main/page.tsx` (dashboard 含出勤)

**Step 1: 增強出勤區塊**

在 main dashboard 加入：
- 出勤率統計卡片
- 近期出勤記錄列表
- 簽退按鈕

**Step 2: Commit**

```bash
git add apps/inclass-dashboard/src/app/main/page.tsx
git commit -m "feat(inclass): enhance dashboard with attendance stats and checkout"
```

---

## Phase 3: 電子聯絡簿遷移

### Task 8: 建立 inclass 聯絡簿 DB schema

**Files:**
- Modify: `packages/shared/src/db/schema/inclass.ts`

**Step 1: 新增 6 個 inclass_ 聯絡簿表**

從 manage.ts 複製聯絡簿表定義，將前綴從 `manage_` 改為 `inclass_`：

```typescript
// inclass_contact_book_templates
export const inclassContactBookTemplates = pgTable('inclass_contact_book_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  courseId: uuid('course_id').references(() => manageCourses.id).notNull(),
  entryDate: date('entry_date').notNull(),
  groupProgress: text('group_progress'),
  groupHomework: text('group_homework'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueTenantCourseDate: uniqueIndex('inclass_cb_templates_tenant_course_date_idx')
    .on(table.tenantId, table.courseId, table.entryDate),
}))

// inclass_contact_book_entries
export const inclassContactBookEntries = pgTable('inclass_contact_book_entries', {
  // ... same structure as manage version, with inclass_ prefix
})

// inclass_contact_book_scores
// inclass_contact_book_photos
// inclass_contact_book_feedback
// inclass_contact_book_ai_analysis
// (all mirroring manage versions with inclass_ prefix and FK adjustments)
```

**Step 2: Export 新表**

在 `packages/shared/src/db/schema/index.ts` 中 export 新表。

**Step 3: Push schema**

Run: `pnpm --filter @94cram/shared drizzle-kit push`
Expected: 6 new tables created

**Step 4: Commit**

```bash
git add packages/shared/src/db/schema/inclass.ts packages/shared/src/db/schema/index.ts
git commit -m "feat(shared): add inclass contact book schema (6 tables)"
```

---

### Task 9: 遷移聯絡簿後端路由到 inclass

**Files:**
- Create: `apps/inclass-backend/src/routes/contact-book.ts`
- Create: `apps/inclass-backend/src/routes/contact-book-parent.ts`
- Modify: `apps/inclass-backend/src/index.ts` (mount new routes)

**Step 1: 複製 admin contact-book 路由**

從 `apps/manage-backend/src/routes/admin/contact-book.ts` 複製，修改：
- Import 路徑改用 inclass 表名 (inclassContactBookEntries 等)
- 移除 admin prefix（路由改為 `/contact-book/*`）
- 權限檢查適配 inclass 的 auth middleware

**Step 2: 複製 parent contact-book 路由**

從 `apps/manage-backend/src/routes/parent/contact-book.ts` 複製，修改表名。

**Step 3: 複製依賴服務**

需要在 inclass-backend 中加入或引用：
- AI 分析服務 (`analyzeStudentWeakness`) — 可直接複製或透過 internal API 呼叫 manage
- GCS 照片上傳 (`uploadContactBookPhoto`) — 複製服務
- LINE 通知 (`pushContactBookNotification`) — 複製服務
- 通知 helper (`notifyContactBook`) — 複製核心函數

建議：將共用服務抽到 `@94cram/shared` 或在 inclass-backend 中建立對應服務檔。

**Step 4: Mount 路由**

在 `apps/inclass-backend/src/index.ts` 中：
```typescript
import { contactBookRoutes } from './routes/contact-book'
import { contactBookParentRoutes } from './routes/contact-book-parent'

app.route('/api/contact-book', contactBookRoutes)
app.route('/api/parent/contact-book', contactBookParentRoutes)
```

**Step 5: 驗證 typecheck**

Run: `pnpm --filter inclass-backend exec tsc --noEmit`

**Step 6: Commit**

```bash
git add apps/inclass-backend/src/routes/contact-book.ts \
       apps/inclass-backend/src/routes/contact-book-parent.ts \
       apps/inclass-backend/src/services/ \
       apps/inclass-backend/src/index.ts
git commit -m "feat(inclass): migrate contact book routes from manage (admin + parent)"
```

---

### Task 10: 遷移聯絡簿前端頁面到 inclass

**Files:**
- Create: `apps/inclass-dashboard/src/app/contact-book/page.tsx`
- Reference: `apps/manage-dashboard/src/app/(dashboard)/contact-book/page.tsx` (1491 行)

**Step 1: 複製並適配聯絡簿頁面**

從 manage-dashboard 複製聯絡簿頁面，修改：
- API 路徑從 `/api/admin/contact-book/*` 改為 `/api/contact-book/*`
- 保留全部功能：課程選擇、自動儲存、批次建立、AI 助寫、照片上傳、成績輸入

**Step 2: 加入側邊欄導航**

在 inclass-dashboard 的 layout/navigation 中加入「聯絡簿」選項。

**Step 3: 驗證 typecheck**

Run: `pnpm --filter inclass-dashboard exec tsc --noEmit`

**Step 4: Commit**

```bash
git add apps/inclass-dashboard/src/app/contact-book/
git commit -m "feat(inclass): add contact book page (migrated from manage)"
```

---

## Phase 4: 補課管理遷移

### Task 11: 建立 inclass 補課 DB schema

**Files:**
- Modify: `packages/shared/src/db/schema/inclass.ts`

**Step 1: 新增 2 個 inclass_ 補課表**

```typescript
// inclass_makeup_slots — 補課時段
export const inclassMakeupSlots = pgTable('inclass_makeup_slots', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  subject: varchar('subject', { length: 100 }).notNull(),
  makeupDate: date('makeup_date').notNull(),
  startTime: varchar('start_time', { length: 10 }).notNull(),
  endTime: varchar('end_time', { length: 10 }).notNull(),
  teacherId: uuid('teacher_id').references(() => manageTeachers.id),
  room: varchar('room', { length: 50 }),
  maxStudents: integer('max_students').default(10),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_inclass_makeup_slots_tenant').on(table.tenantId),
  index('idx_inclass_makeup_slots_date').on(table.tenantId, table.makeupDate),
])

// inclass_makeup_classes — 補課記錄
export const inclassMakeupClasses = pgTable('inclass_makeup_classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  studentId: uuid('student_id').references(() => manageStudents.id).notNull(),
  originalDate: date('original_date').notNull(),
  originalCourseId: uuid('original_course_id'),
  originalCourseName: varchar('original_course_name', { length: 100 }),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  makeupDate: date('makeup_date'),
  makeupTime: varchar('makeup_time', { length: 10 }),
  makeupEndTime: varchar('makeup_end_time', { length: 10 }),
  makeupTeacherId: uuid('makeup_teacher_id').references(() => manageTeachers.id),
  makeupRoom: varchar('makeup_room', { length: 50 }),
  slotId: uuid('slot_id').references(() => inclassMakeupSlots.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('inclass_makeup_classes_tenant_idx').on(table.tenantId),
  studentIdx: index('inclass_makeup_classes_student_idx').on(table.studentId),
  statusIdx: index('inclass_makeup_classes_status_idx').on(table.tenantId, table.status),
}))
```

**Step 2: Push schema**

Run: `pnpm --filter @94cram/shared drizzle-kit push`

**Step 3: Commit**

```bash
git add packages/shared/src/db/schema/inclass.ts
git commit -m "feat(shared): add inclass makeup class schema (2 tables)"
```

---

### Task 12: 遷移補課後端路由到 inclass

**Files:**
- Create: `apps/inclass-backend/src/routes/makeup-classes.ts`
- Create: `apps/inclass-backend/src/templates/makeup-notice.ts`
- Modify: `apps/inclass-backend/src/index.ts`

**Step 1: 複製補課路由**

從 `apps/manage-backend/src/routes/admin/makeup-classes.ts` 複製，修改：
- Import 改用 inclass 表名
- 路由前綴改為 `/makeup-classes/*`
- 通知功能透過 internal API 呼叫 manage-backend 的 notify endpoint

所有 8 個端點：
- GET `/makeup-classes` — 查詢列表
- POST `/makeup-classes` — 新增補課
- PUT `/makeup-classes/:id` — 排定補課
- PUT `/makeup-classes/:id/complete` — 標記完成
- POST `/makeup-classes/batch-assign` — 批量分配
- DELETE `/makeup-classes/:id` — 取消
- POST `/makeup-classes/:id/notify` — 發送通知
- GET `/makeup-classes/:id/notice-pdf` — 通知書

**Step 2: 複製通知書模板**

從 `apps/manage-backend/src/templates/makeup-notice.ts` 複製到 inclass。

**Step 3: Mount 路由**

```typescript
import { makeupClassRoutes } from './routes/makeup-classes'
app.route('/api/makeup-classes', makeupClassRoutes)
```

**Step 4: 驗證 typecheck**

Run: `pnpm --filter inclass-backend exec tsc --noEmit`

**Step 5: Commit**

```bash
git add apps/inclass-backend/src/routes/makeup-classes.ts \
       apps/inclass-backend/src/templates/makeup-notice.ts \
       apps/inclass-backend/src/index.ts
git commit -m "feat(inclass): migrate makeup class management from manage (8 endpoints)"
```

---

### Task 13: 遷移補課前端頁面到 inclass

**Files:**
- Create: `apps/inclass-dashboard/src/app/makeup-classes/page.tsx`

**Step 1: 複製並適配補課頁面**

從 manage-dashboard 複製，修改 API 路徑：
- `/api/admin/makeup-classes/*` → `/api/makeup-classes/*`
- `/api/admin/makeup-slots/*` → `/api/makeup-slots/*`

保留功能：三 Tab 切換、批量排定、時段管理、通知發送、通知書生成。

**Step 2: 加入側邊欄導航**

在 inclass-dashboard 導航加入「補課管理」。

**Step 3: 驗證 typecheck**

Run: `pnpm --filter inclass-dashboard exec tsc --noEmit`

**Step 4: Commit**

```bash
git add apps/inclass-dashboard/src/app/makeup-classes/
git commit -m "feat(inclass): add makeup class management page (migrated from manage)"
```

---

## Phase 5: Manage 端瘦身

### Task 14: 在 manage-dashboard 加入功能重導向

**Files:**
- Modify: `apps/manage-dashboard/src/app/(dashboard)/contact-book/page.tsx`
- Modify: `apps/manage-dashboard/src/app/(dashboard)/makeup-classes/page.tsx`
- Modify: `apps/manage-dashboard/src/app/(dashboard)/grades/page.tsx`
- Modify: `apps/manage-dashboard/src/app/(dashboard)/attendance/page.tsx`

**Step 1: 替換頁面為重導向提示**

每個遷移的頁面改為顯示提示訊息 + 連結到 inClass：

```tsx
'use client'
export default function ContactBookRedirect() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h2 className="text-xl font-semibold text-gray-700">此功能已遷移至 94inClass</h2>
      <p className="text-gray-500">聯絡簿管理已移至課堂教學中心，請點擊下方連結前往。</p>
      <a
        href={process.env.NEXT_PUBLIC_INCLASS_URL || 'https://cram94-inclass-dashboard-1015149159553.asia-east1.run.app'}
        className="px-6 py-3 bg-[#8FA895] text-white rounded-lg hover:bg-[#7a9380] transition"
        target="_blank"
        rel="noopener noreferrer"
      >
        前往 94inClass
      </a>
    </div>
  )
}
```

**Step 2: 驗證 typecheck**

Run: `pnpm --filter manage-dashboard exec tsc --noEmit`

**Step 3: Commit**

```bash
git add apps/manage-dashboard/src/app/
git commit -m "feat(manage): replace migrated pages with redirect to 94inClass"
```

---

### Task 15: 清理 manage-backend 遷移路由（保守策略）

**Files:**
- Modify: `apps/manage-backend/src/index.ts` (或路由掛載檔)

**Step 1: 註解掉遷移路由（不刪除）**

暫時停用已遷移的路由，但保留程式碼以便回退：

```typescript
// [2026-03-05] 已遷移至 94inClass — 過渡期保留程式碼
// app.route('/api/admin/contact-book', contactBookAdminRoutes)
// app.route('/api/admin/grades', gradesRoutes)
// app.route('/api/admin/attendance', attendanceRoutes)
// app.route('/api/admin/makeup-classes', makeupClassRoutes)
```

**Step 2: 驗證 typecheck**

Run: `pnpm typecheck`

**Step 3: Commit**

```bash
git add apps/manage-backend/
git commit -m "refactor(manage): disable migrated routes (contact-book, grades, attendance, makeup)"
```

---

### Task 16: 最終驗證 + Push

**Step 1: 全域 typecheck**

Run: `pnpm typecheck`
Expected: 0 errors

**Step 2: Push + CI 確認**

```bash
git push origin main
```

等待 CI 結果：
- CI — Typecheck & Build: should pass
- Deploy 94Manage: should pass
- Deploy 94inClass: should pass (tsx fix)
- Deploy 94CramBot: should pass

**Step 3: 功能驗證**

- 訪問 inClass dashboard demo login — 不再 403
- 測試聯絡簿、成績、出勤、補課功能
- 確認 manage dashboard 遷移頁面顯示重導向提示

---

## 依賴服務遷移清單

以下服務需在 inclass-backend 中建立：

| 服務 | 來源 | 策略 |
|------|------|------|
| `ai-analysis.ts` | manage-backend | 複製（Gemini API 呼叫） |
| `gcs.ts` (照片上傳) | manage-backend | 複製（GCS bucket 共用） |
| `line-notify.ts` (Flex Message) | manage-backend | 複製（LINE Channel 共用） |
| `notify-helper.ts` (核心) | manage-backend | 簡化版複製（LINE + Telegram 雙通道） |
| `makeup-notice.ts` (模板) | manage-backend/templates | 直接複製 |

## 環境變數需求（inclass-backend 新增）

```
GEMINI_API_KEY          # AI 分析 + 助寫
LINE_CHANNEL_ACCESS_TOKEN  # LINE 推播
LINE_CHANNEL_SECRET     # LINE webhook 驗證
LINE_LIFF_ID           # LIFF 聯絡簿頁面
GCS_BUCKET_NAME        # 照片上傳 (default: cram94-contact-book-photos)
```

需在 `.github/workflows/deploy-inclass.yml` 中加入 Secret Manager 設定。
