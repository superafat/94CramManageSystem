# 電子聯絡簿 v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完全重建電子聯絡簿系統，從訊息公告板模式改為「每日每生」結構化聯絡簿，含 AI 分析、GCS 照片、LINE LIFF、Demo 模式。

**Architecture:** 正規化多表（entries + scores + photos + feedback + ai_analysis + templates），Hono API 路由，Next.js 前端左右分欄，LINE Flex Message 推送 + LIFF 頁面。

**Tech Stack:** Drizzle ORM, Hono, Next.js 16, Tailwind CSS, @google-cloud/storage, Gemini 2.5 Flash, LINE Messaging API, LINE LIFF SDK

---

## Phase 1：資料庫 Schema

### Task 1: 新增 Drizzle Schema 定義

**Files:**
- Modify: `packages/shared/src/db/schema/manage.ts`

**Step 1: 在 manage.ts 末尾新增 6 張表的 Drizzle 定義**

```typescript
// ── 電子聯絡簿 v2 ──────────────────────────────────────────────

// 班級模板（老師填全班共用進度/作業）
export const manageContactBookTemplates = pgTable('manage_contact_book_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  courseId: uuid('course_id').references(() => manageCourses.id).notNull(),
  entryDate: date('entry_date').notNull(),
  groupProgress: text('group_progress'),
  groupHomework: text('group_homework'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueIdx: uniqueIndex('manage_cb_tpl_unique_idx').on(table.tenantId, table.courseId, table.entryDate),
}));

// 主表：每日每生一筆
export const manageContactBookEntries = pgTable('manage_contact_book_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  studentId: uuid('student_id').references(() => manageStudents.id).notNull(),
  teacherId: uuid('teacher_id').references(() => manageTeachers.id),
  courseId: uuid('course_id').references(() => manageCourses.id).notNull(),
  entryDate: date('entry_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, sent, read
  groupProgress: text('group_progress'),
  groupHomework: text('group_homework'),
  individualNote: text('individual_note'),
  individualHomework: text('individual_homework'),
  teacherTip: text('teacher_tip'),
  sentAt: timestamp('sent_at'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  courseDate: index('manage_cb_entry_course_date_idx').on(table.tenantId, table.courseId, table.entryDate),
  studentDate: uniqueIndex('manage_cb_entry_student_date_idx').on(table.tenantId, table.studentId, table.entryDate),
}));

// 成績子表
export const manageContactBookScores = pgTable('manage_contact_book_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => manageContactBookEntries.id, { onDelete: 'cascade' }).notNull(),
  subject: varchar('subject', { length: 100 }).notNull(),
  score: numeric('score').notNull(),
  classAvg: numeric('class_avg'),
  fullScore: numeric('full_score').default('100'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 照片子表
export const manageContactBookPhotos = pgTable('manage_contact_book_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => manageContactBookEntries.id, { onDelete: 'cascade' }).notNull(),
  url: text('url').notNull(),
  caption: varchar('caption', { length: 200 }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 家長反饋子表
export const manageContactBookFeedback = pgTable('manage_contact_book_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => manageContactBookEntries.id, { onDelete: 'cascade' }).notNull(),
  parentUserId: uuid('parent_user_id').references(() => users.id).notNull(),
  rating: integer('rating'), // 1-5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

// AI 分析子表
export const manageContactBookAiAnalysis = pgTable('manage_contact_book_ai_analysis', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => manageContactBookEntries.id, { onDelete: 'cascade' }).notNull(),
  weaknessSummary: text('weakness_summary'),
  recommendedCourseName: varchar('recommended_course_name', { length: 200 }),
  recommendedCourseDesc: text('recommended_course_desc'),
  rawResponse: jsonb('raw_response'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Step 2: 確認 import 有 `uniqueIndex`, `date`, `numeric`, `integer`**

在 manage.ts 頂部確認 drizzle-orm 的 import 包含所需型別。

**Step 3: 同步到資料庫**

```bash
pnpm --filter @94cram/shared drizzle-kit push
```

**Step 4: 驗證 typecheck**

```bash
pnpm typecheck
```

**Step 5: Commit**

```bash
git add packages/shared/src/db/schema/manage.ts
git commit -m "feat(shared): 新增電子聯絡簿 v2 schema（6 張表）"
```

---

## Phase 2：後端 API — 分校端

### Task 2: 建立聯絡簿 Admin 路由骨架

**Files:**
- Create: `apps/manage-backend/src/routes/admin/contact-book.ts`
- Modify: `apps/manage-backend/src/routes/admin/index.ts`（掛載路由）

**Step 1: 建立路由檔案骨架**

建立 `contact-book.ts`，包含以下端點骨架（含 Zod 驗證）：

```
GET    /entries          — 班級某日所有 entry
POST   /entries          — 建立（單筆或批次）
GET    /entries/:id      — 單筆完整 entry（JOIN 子表）
PUT    /entries/:id      — 更新 entry
POST   /entries/:id/send — 正式發送
DELETE /entries/:id      — 刪除草稿
POST   /templates        — 儲存模板
GET    /templates        — 取得模板
POST   /upload           — 上傳圖片（下一 task）
POST   /ai-analysis      — AI 分析（下一 task）
```

**Step 2: 在 admin/index.ts 掛載**

```typescript
import { contactBookRoutes } from './contact-book'
adminApp.route('/contact-book', contactBookRoutes)
```

**Step 3: typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git commit -m "feat(backend): 新增聯絡簿 admin 路由骨架"
```

### Task 3: 實作 CRUD API（entries + templates）

**Files:**
- Modify: `apps/manage-backend/src/routes/admin/contact-book.ts`

**Step 1: 實作 GET /entries**

Query params: `courseId`, `date`。用 Drizzle 查詢 entries + LEFT JOIN scores/photos/feedback/ai_analysis。回傳完整的學生列表含狀態。

**Step 2: 實作 POST /entries**

支援兩種模式：
- 單筆建立：`{ studentId, courseId, entryDate, ... }`
- 批次建立：`{ courseId, entryDate, studentIds: [] }` → 從 template 帶入 group 欄位

**Step 3: 實作 GET /entries/:id**

JOIN 所有子表，回傳完整聯絡簿資料。

**Step 4: 實作 PUT /entries/:id**

更新 entry 主表 + upsert scores/photos。只允許 draft 狀態修改。

**Step 5: 實作 DELETE /entries/:id**

只允許刪除 draft 狀態。CASCADE 自動清除子表。

**Step 6: 實作 POST /entries/:id/send**

更新 status='sent', sentAt=now()。呼叫 LINE 通知（Task 6 實作）。

**Step 7: 實作 POST /templates + GET /templates**

UPSERT 模板（tenant + course + date unique）。

**Step 8: typecheck + 本機測試**

```bash
pnpm typecheck
```

**Step 9: Commit**

```bash
git commit -m "feat(backend): 實作聯絡簿 CRUD API"
```

### Task 4: GCS 照片上傳 API

**Files:**
- Create: `apps/manage-backend/src/services/gcs.ts`
- Modify: `apps/manage-backend/src/routes/admin/contact-book.ts`
- Modify: `apps/manage-backend/package.json`（加 @google-cloud/storage）

**Step 1: 安裝 @google-cloud/storage**

```bash
cd apps/manage-backend && pnpm add @google-cloud/storage
```

**Step 2: 建立 GCS service**

```typescript
// services/gcs.ts
import { Storage } from '@google-cloud/storage'

const storage = new Storage()
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'cram94-contact-book-photos'

export async function uploadFile(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
  const bucket = storage.bucket(BUCKET_NAME)
  const file = bucket.file(`contact-book/${fileName}`)
  await file.save(buffer, { contentType, resumable: false })
  await file.makePublic()
  return `https://storage.googleapis.com/${BUCKET_NAME}/contact-book/${fileName}`
}
```

**Step 3: 實作 POST /upload 端點**

接收 multipart/form-data，驗證圖片類型和大小（5MB），上傳到 GCS，回傳 URL。插入 `manage_contact_book_photos`。

**Step 4: typecheck**

```bash
pnpm typecheck
```

**Step 5: Commit**

```bash
git commit -m "feat(backend): 新增 GCS 照片上傳服務"
```

### Task 5: AI 弱點分析 API

**Files:**
- Create: `apps/manage-backend/src/services/ai-analysis.ts`
- Modify: `apps/manage-backend/src/routes/admin/contact-book.ts`

**Step 1: 建立 AI 分析 service**

用現有的 `@google/generative-ai`（專案已安裝），撈取學生近 30 天 scores 資料，組成 prompt：

```
你是一位資深補習班教學顧問。請根據以下學生近期考試成績，分析學習弱點並推薦補強方向。
學生姓名：{name}
近期成績：
- {subject}: {score}/{fullScore} (班級平均: {classAvg})
...
請回傳 JSON：{ weaknessSummary: string, recommendedCourseName: string, recommendedCourseDesc: string }
```

**Step 2: 實作 POST /ai-analysis 端點**

Request: `{ studentId, entryId }`
Response: AI 分析結果（同時存入 ai_analysis 子表）

**Step 3: typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git commit -m "feat(backend): 新增 Gemini AI 弱點分析服務"
```

---

## Phase 3：後端 API — 家長端 + LINE

### Task 6: 家長端 API

**Files:**
- Modify: `apps/manage-backend/src/routes/parent-ext.ts`

或建立新的 JWT 認證家長路由：
- Create: `apps/manage-backend/src/routes/parent/contact-book.ts`

**Step 1: 新增家長聯絡簿路由**

```
GET  /api/parent-ext/contact-book?studentId=&limit=&offset=  — 聯絡簿列表（只回傳 sent/read）
GET  /api/parent-ext/contact-book/:id                         — 單筆完整聯絡簿
POST /api/parent-ext/contact-book/:id/feedback                — 提交滿意度回饋
```

- 列表 API：只回傳 status = 'sent' 或 'read' 的 entries
- 詳情 API：同時更新 readAt（首次查看時）和 status='read'
- 反饋 API：驗證 rating 1-5，存入 feedback 子表

**Step 2: typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git commit -m "feat(backend): 新增家長端聯絡簿 API"
```

### Task 7: LINE 通知推送

**Files:**
- Create: `apps/manage-backend/src/services/line-notify.ts`
- Modify: `apps/manage-backend/src/routes/admin/contact-book.ts`（send 端點呼叫）

**Step 1: 建立 LINE Flex Message 推送 service**

用 LINE Messaging API push message，組建 Flex Message bubble：
- Header：學生姓名 + 日期
- Body：成績摘要 + 作業摘要 + 老師小叮嚀前 50 字
- Footer：「查看完整聯絡簿」按鈕（URI action → LIFF URL）

**Step 2: 在 send 端點中呼叫**

查詢學生 → 找家長 user → 找 LINE userId → 推送 Flex Message。
找不到 LINE userId 時靜默跳過（不阻塞發送流程）。

**Step 3: typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git commit -m "feat(backend): 新增 LINE Flex Message 聯絡簿通知"
```

### Task 8: LINE LIFF API

**Files:**
- Create: `apps/manage-backend/src/routes/line/contact-book.ts`
- Modify: `apps/manage-backend/src/routes/line.ts`（掛載）

**Step 1: 建立 LIFF 專用路由**

```
GET  /api/line/contact-book/:id          — LIFF 取得聯絡簿（用 LINE userId 驗證）
POST /api/line/contact-book/:id/feedback — LIFF 提交回饋
```

認證方式：Header `Authorization: Bearer {LIFF access token}` → 驗證 LINE userId → 查找對應 user。

**Step 2: typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git commit -m "feat(backend): 新增 LINE LIFF 聯絡簿 API"
```

---

## Phase 4：前端 — 分校端

### Task 9: 分校端聯絡簿頁面（左側面板）

**Files:**
- Rewrite: `apps/manage-dashboard/src/app/contact-book/page.tsx`

**Step 1: 重寫 page.tsx — 左側面板**

左右分欄佈局（桌面 sidebar 280px + main，手機全寬切換）：
- 課程下拉選擇器（從 /api/w8/courses 取得）
- 日期選擇器（預設今天）
- 「班級進度設定」按鈕
- 學生名單卡片：頭像（姓氏首字圓形）+ 姓名 + status badge + 家長星等
- 底部「批次建立今日聯絡簿」按鈕
- 搜尋框（姓名篩選）

狀態 badge 顏色：
- draft → 灰色「草稿」
- sent → 藍色「已發送」
- read → 綠色「已讀」
- 無 entry → 橘色「待處理」

**Step 2: typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git commit -m "feat(dashboard): 聯絡簿 v2 — 左側學生面板"
```

### Task 10: 分校端聯絡簿頁面（右側編輯區）

**Files:**
- Modify: `apps/manage-dashboard/src/app/contact-book/page.tsx`

**Step 1: 右側編輯表單**

選取學生後顯示以下 Section（使用 Card 元件）：

1. **Header**：學生姓名 + 日期 + 「預覽家長版」Modal + 「正式發送」按鈕（confirm dialog）
2. **全班集體進度 & 作業**：兩個 textarea（從模板帶入，灰色提示）
3. **個別指導與加強**：個別學習說明 textarea + 個別專屬作業 textarea + 「載入歷史弱點建議」按鈕
4. **今日考試成績錄入**：科目 input + 分數 number input + 班級平均 number input + 「新增」按鈕。已加入的成績顯示為 chips 可刪除。提示文字「填寫完成後將同步更新至成績管理中心」
5. **親師通訊小叮嚀**：textarea
6. **今日學習剪影**：拖拽上傳區 + 預覽 grid（最多 5 張）+ 上傳進度條
7. **AI 智能分析建議**：「生成 AI 分析」按鈕 → loading → 顯示弱點摘要 + 推薦課程卡片
8. **最新家長反饋**：星等 + 留言 + 時間（唯讀）

所有欄位自動存草稿（debounce 1s 呼叫 PUT API）。

**Step 2: 「班級進度設定」Modal**

點擊後彈出 Modal：
- 今日團體課程進度 textarea
- 全體共同作業 textarea
- 「儲存並套用到所有學生」按鈕 → POST /templates + 批次更新已有 entries

**Step 3: 「預覽家長版」Modal**

預覽模式：模擬家長端卡片式排版，唯讀。

**Step 4: typecheck**

```bash
pnpm typecheck
```

**Step 5: Commit**

```bash
git commit -m "feat(dashboard): 聯絡簿 v2 — 右側編輯區（全功能）"
```

---

## Phase 5：前端 — 家長端

### Task 11: 家長端聯絡簿後台頁面

**Files:**
- Create: `apps/manage-dashboard/src/app/my-children/contact-book/page.tsx`
- Create: `apps/manage-dashboard/src/app/my-children/contact-book/layout.tsx`

**Step 1: 聯絡簿列表頁**

- 選擇孩子 → 日期列表（卡片式，最新在上）
- 每張卡片顯示：日期 + 課程名 + 成績摘要 + 已讀/未讀 badge
- 點擊 → 展開完整聯絡簿

**Step 2: 聯絡簿詳情（卡片式排版）**

對照 Gemini 家長端設計，用卡片式排版：
- 今日學習成就（成績大字 + 班級平均）
- 今日課表與進度（集體 + 個別）
- 學習剪影（照片 grid）
- 老師的小叮嚀（引言風格）
- AI 學習建議（課程推薦卡片）
- 今日學習滿意度（5 星 + textarea + 送出按鈕）

**Step 3: typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git commit -m "feat(dashboard): 家長端聯絡簿頁面"
```

### Task 12: LINE LIFF 頁面

**Files:**
- Create: `apps/manage-dashboard/src/app/liff/contact-book/[id]/page.tsx`
- Create: `apps/manage-dashboard/src/app/liff/layout.tsx`

**Step 1: LIFF 佈局**

獨立 layout（不含 sidebar/header），手機優先：
- 初始化 LIFF SDK（`@line/liff`）
- 取得 LINE access token
- 渲染聯絡簿卡片

**Step 2: LIFF 聯絡簿頁面**

複用家長端的卡片式排版元件。
底部導航列：聯絡簿 / 成績單 / 相簿（前兩個先做，相簿連結到 LIFF 聯絡簿列表）

**Step 3: 安裝 @line/liff**

```bash
cd apps/manage-dashboard && pnpm add @line/liff
```

**Step 4: typecheck**

```bash
pnpm typecheck
```

**Step 5: Commit**

```bash
git commit -m "feat(dashboard): LINE LIFF 聯絡簿頁面"
```

---

## Phase 6：Demo 模式 + 收尾

### Task 13: Demo 模式

**Files:**
- Modify: `apps/manage-dashboard/src/lib/demo-data.ts`（或相關 demo 檔）
- Modify: API 路由中的 demo 分支

**Step 1: 新增 demo mock 資料**

在 demo 模式下（demo tenant ID），API 回傳預設 mock 資料：
- 3 個學生的當日聯絡簿（不同狀態：draft / sent / read）
- 每人 1-2 筆成績
- 1 筆 AI 分析結果
- 1 筆家長反饋
- 照片用 placeholder URL

**Step 2: AI 分析 demo fallback**

Demo 模式不呼叫 Gemini API，回傳預設分析文字。

**Step 3: LINE 發送 demo fallback**

Demo 模式不呼叫 LINE API，log 訊息即可。

**Step 4: GCS 上傳 demo fallback**

Demo 模式回傳 placeholder URL，不實際上傳。

**Step 5: Commit**

```bash
git commit -m "feat(demo): 聯絡簿 v2 demo 模式"
```

### Task 14: 整合測試 + 清理

**Files:**
- 全部修改過的檔案

**Step 1: typecheck 全域**

```bash
pnpm typecheck
```

**Step 2: 本機啟動測試**

```bash
pnpm dev
```

手動驗證：
- [ ] 分校端：選課程 → 選日期 → 看到學生列表
- [ ] 分校端：點學生 → 編輯聯絡簿 → 存草稿
- [ ] 分校端：班級進度設定 → 套用到所有學生
- [ ] 分校端：成績輸入
- [ ] 分校端：照片上傳（GCS 或 demo fallback）
- [ ] 分校端：AI 分析
- [ ] 分校端：正式發送
- [ ] 家長端：/my-children/contact-book 看到聯絡簿列表
- [ ] 家長端：查看詳情
- [ ] 家長端：提交滿意度回饋
- [ ] Demo 模式：所有功能正常

**Step 3: 清理舊 mock 資料**

移除 contact-book/page.tsx 中的舊 MOCK_MESSAGES 等不再需要的程式碼。

**Step 4: 最終 Commit**

```bash
git commit -m "feat(manage): 電子聯絡簿 v2 完成 — 結構化每日聯絡簿"
```

---

## 依賴圖

```
Task 1 (Schema)
  ├─→ Task 2 (路由骨架) → Task 3 (CRUD)
  │     ├─→ Task 4 (GCS)
  │     ├─→ Task 5 (AI)
  │     └─→ Task 7 (LINE 通知)
  ├─→ Task 6 (家長 API)
  └─→ Task 8 (LIFF API)

Task 3 + 4 + 5 → Task 9 (前端左側) → Task 10 (前端右側)
Task 6 → Task 11 (家長前端)
Task 8 → Task 12 (LIFF 前端)
Task 9-12 → Task 13 (Demo) → Task 14 (整合)
```

**可並行的 Tasks：**
- Task 4, 5, 7 可同時開發（都只依賴 Task 3）
- Task 6, 8 可同時開發（都只依賴 Task 1）
- Task 11, 12 可同時開發（分別依賴 Task 6, 8）
