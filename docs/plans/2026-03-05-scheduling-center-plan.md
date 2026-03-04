# 排課中心 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立獨立排課中心頁面，整合行事曆視覺化、名單聯動、個指併行視圖、補課預檢/批量安排、補課通知書 PDF。

**Architecture:** 新增 `manage_makeup_slots` 表支撐補課分組；新建 `/scheduling-center` 前端頁面（左側課程列表 + 右側自建行事曆）；增強現有補課 API 支援 slot 關聯與批量操作；新增批量報名 API 支撐名單聯動。

**Tech Stack:** Hono + Drizzle ORM (backend), Next.js + Tailwind CSS (frontend), html-pdf-node (PDF 生成)

---

## Task 1: Schema — 新增補課時段表 + 增強補課記錄表

**Files:**
- Modify: `packages/shared/src/db/schema/manage.ts`

**說明：**

在 `manage.ts` 最後（`manageMakeupClasses` 定義之後）新增 `manageMakeupSlots` 表：

```typescript
export const manageMakeupSlots = pgTable('manage_makeup_slots', {
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
  index('idx_makeup_slots_tenant').on(table.tenantId),
  index('idx_makeup_slots_date').on(table.tenantId, table.makeupDate),
])
```

在 `manageMakeupClasses` 表新增 `slotId` 欄位：

```typescript
slotId: uuid('slot_id').references(() => manageMakeupSlots.id),
```

**驗證：** `pnpm --filter @94cram/shared typecheck` → 0 errors

---

## Task 2: Backend — 補課時段 CRUD API

**Files:**
- Create: `apps/manage-backend/src/routes/admin/makeup-slots.ts`
- Modify: `apps/manage-backend/src/routes/admin/index.ts`（掛載新路由）

**說明：**

新建 `makeup-slots.ts`，參考現有 `makeup-classes.ts` 的程式結構（import pattern、Hono 路由、zod 驗證、`_helpers` 的 db/sql/success 等）。

4 個端點：

1. **GET `/makeup-slots`**
   - Query params: `date`(單日), `dateFrom`/`dateTo`(範圍), `teacherId`, `subject`
   - JOIN `manageTeachers` 取 teacher_name
   - 額外查詢每個 slot 的已報名人數（COUNT makeup_classes WHERE slot_id = slot.id AND status != 'cancelled'）
   - 回傳：`{ slots: [{ ...slot, teacher_name, current_students }] }`

2. **POST `/makeup-slots`**
   - Body: `{ subject, makeupDate, startTime, endTime, teacherId?, room?, maxStudents?, notes? }`
   - Permission: `ATTENDANCE_WRITE`
   - 回傳：`{ slot: insertedRow }`

3. **PUT `/makeup-slots/:id`**
   - Body: 同 POST（partial）
   - 驗證 tenant_id 匹配
   - 回傳：`{ slot: updatedRow }`

4. **DELETE `/makeup-slots/:id`**
   - 檢查：若有 makeup_classes 關聯（status != cancelled）→ 回傳 400 「此時段尚有學生，無法刪除」
   - 真刪除（不是軟刪除）
   - 回傳：`{ message: '已刪除' }`

在 `admin/index.ts` 掛載：
```typescript
import { makeupSlotsRoutes } from './makeup-slots'
adminRoutes.route('/', makeupSlotsRoutes)
```

**驗證：** `pnpm --filter @94cram/manage-backend typecheck` → 0 errors

---

## Task 3: Backend — 補課管理 API 增強（slot 關聯 + 批量 + 學生查詢）

**Files:**
- Modify: `apps/manage-backend/src/routes/admin/makeup-classes.ts`

**說明：**

3 個變更：

1. **PUT `/makeup-classes/:id` 增強**（約 128–161 行）
   - `scheduleMakeupSchema` 新增 optional `slotId: z.string().uuid().optional()`
   - 若傳入 `slotId`：從 slot 讀取 date/time/teacher/room 填入 makeup_classes，同時寫入 slot_id
   - 若未傳 `slotId`：沿用原有邏輯（手動填入 date/time 等）

2. **POST `/makeup-classes/batch-assign`（新增端點）**
   - Body: `{ slotId: string, makeupClassIds: string[] }`
   - 驗證 slot 存在且屬於同 tenant
   - 查詢 slot 的 current_students + batch 數量 ≤ maxStudents
   - 批量 UPDATE：set slot_id, makeupDate/Time/Teacher/Room from slot, status='scheduled'
   - 回傳：`{ updated: number }`

3. **GET `/makeup-slots/:slotId/students`（新增端點，放在 makeup-slots.ts）**
   - JOIN `manageMakeupClasses` + `manageStudents` WHERE slot_id = :slotId AND status != 'cancelled'
   - 回傳：`{ students: [{ id, student_name, original_course_name, status }] }`

**驗證：** `pnpm --filter @94cram/manage-backend typecheck` → 0 errors

---

## Task 4: Backend — 批量報名 API

**Files:**
- Modify: `apps/manage-backend/src/routes/admin/index.ts`（或新建 enrollments.ts）

**說明：**

新增 2 個端點（可直接寫在 admin/index.ts 或新建 `enrollments.ts`）：

1. **POST `/enrollments/batch`**
   - Body: `{ courseId: string, studentIds: string[] }`
   - 對每個 studentId：INSERT INTO manage_enrollments (tenant_id, student_id, course_id, status='active', start_date=today)
   - 用 `ON CONFLICT DO NOTHING`（已存在的跳過）
   - 回傳：`{ enrolled: number }`

2. **DELETE `/enrollments/batch`**
   - Body: `{ courseId: string, studentIds: string[] }`
   - UPDATE manage_enrollments SET status='cancelled', deleted_at=now() WHERE course_id AND student_id IN (...)
   - 回傳：`{ removed: number }`

**驗證：** `pnpm --filter @94cram/manage-backend typecheck` → 0 errors

---

## Task 5: Backend — 排課 GET 增強（courseType + studentName）

**Files:**
- Modify: `apps/manage-backend/src/routes/w8/schedules.ts`

**說明：**

修改 GET `/schedules`（約 43–52 行）的 SQL：

- JOIN `manageCourses` 多取 `course_type`
- 對 `course_type='individual'` 的記錄：額外 LEFT JOIN `manageEnrollments` + `manageStudents` 取 student_name
- 回傳每筆 schedule 多帶 `course_type` 和 `student_name`（團班/安親為 null）

注意：現有 SQL 使用 raw SQL（`db.execute(sql...)`），不是 Drizzle query builder。照原有風格擴充。

**驗證：** `pnpm --filter @94cram/manage-backend typecheck` → 0 errors

---

## Task 6: Backend — 補課通知書 PDF + 通知

**Files:**
- Create: `apps/manage-backend/src/templates/makeup-notice.ts`（HTML 模板）
- Modify: `apps/manage-backend/src/routes/admin/makeup-classes.ts`（新增 2 端點）

**說明：**

1. **HTML 模板** `makeup-notice.ts`
   - export function `generateMakeupNoticeHTML(data)` → 回傳完整 HTML 字串
   - 包含：學生姓名、原缺課日期、原課程、補課日期/時間/老師/教室/備註
   - 莫蘭迪色系設計，底部「94補習班 敬上」

2. **POST `/makeup-classes/:id/notify`**
   - 查詢 makeup_class 詳情（JOIN student + teacher）
   - 生成 HTML → 使用 html-pdf-node 轉 PDF
   - Fire-and-forget POST `/api/notifications/send`（type: 'makeup_scheduled'）
   - 回傳：`{ success: true, message: '通知已發送' }`

3. **GET `/makeup-classes/:id/notice-pdf`**
   - 查詢同上
   - 生成 PDF → 直接回傳 PDF stream（Content-Type: application/pdf）
   - 若 html-pdf-node 不可用（Cloud Run 無 chromium），fallback 回傳 HTML

**依賴安裝：** `pnpm --filter @94cram/manage-backend add html-pdf-node`（若不可用改用 `@react-pdf/renderer` 或純 HTML 下載）

**驗證：** `pnpm --filter @94cram/manage-backend typecheck` → 0 errors

---

## Task 7: Frontend — 排課中心頁面（行事曆 + 雙欄 + 狀態標色）

**Files:**
- Create: `apps/manage-dashboard/src/app/scheduling-center/page.tsx`
- Create: `apps/manage-dashboard/src/app/scheduling-center/layout.tsx`
- Create: `apps/manage-dashboard/src/app/scheduling-center/components/ScheduleCalendar.tsx`
- Create: `apps/manage-dashboard/src/app/scheduling-center/components/CoursePanel.tsx`
- Create: `apps/manage-dashboard/src/app/scheduling-center/components/ScheduleBlock.tsx`
- Create: `apps/manage-dashboard/src/app/scheduling-center/components/types.ts`

**說明：**

### `types.ts`
```typescript
export type CalendarView = 'day' | 'week' | 'month'
export type ScheduleStatus = 'in_session' | 'dismissed' | 'ended' | 'upcoming'
export type CourseTypeFilter = 'all' | 'group' | 'daycare' | 'individual'

export interface ScheduleEvent {
  id: string
  courseId: string
  courseName: string
  courseType: 'group' | 'individual' | 'daycare'
  teacherName: string
  startTime: string  // HH:MM
  endTime: string
  room?: string
  dayOfWeek: number  // 0-6
  studentName?: string  // 個指用
  studentCount?: number // 團班/安親用
  maxStudents?: number
}
```

### `page.tsx`
- 雙欄佈局：左 `CoursePanel`（240px）+ 右 `ScheduleCalendar`（flex-1）
- 頂部：標題 + 視圖切換（日/週/月）+ 前後導航 + 日期顯示
- 底部統計列：今日總堂數、上課中、已結束、未開始
- 資料源：GET `/api/w8/schedules?start_date=&end_date=`
  - 將 `inclassSchedules` 週期規則展開為具體日期的 events（與現有 schedules 頁面相同邏輯）

### `CoursePanel.tsx`
- 類型篩選按鈕：全部/團班/安親/個指
- 搜尋框
- 課程列表（含色標 + 學生人數）
- 點擊課程 → 行事曆高亮該課程

### `ScheduleCalendar.tsx`
- 週視圖：7 列 × 時間格線（08:00–22:00）
- 日視圖：單列時間格線
- 月視圖：日曆格子，每格顯示課程數量
- 每個時段渲染 `ScheduleBlock`

### `ScheduleBlock.tsx`
- 根據 courseType 顯示不同左邊條色（藍=團班、綠=安親、紫=個指）
- 根據當前時間計算狀態並套用顏色（上課中=綠色脈動邊框、已下課=灰綠、已結束=灰、未開始=藍）
- 個指併行：同時段同位置的個指課程垂直堆疊

### 點擊色塊 → 側邊詳情 Drawer
- 顯示：課程名稱、時間、老師、教室
- 學生名單（從 enrollments 查）
- [編輯] [管理名單] 按鈕

### `layout.tsx`
- 使用 `AppLayout` wrapper

**驗證：** `pnpm --filter @94cram/manage-dashboard typecheck` → 0 errors

---

## Task 8: Frontend — 名單管理 Modal

**Files:**
- Create: `apps/manage-dashboard/src/app/scheduling-center/components/RosterModal.tsx`

**說明：**

名單管理 Modal（從 Task 7 的詳情 Drawer 中「管理名單」按鈕開啟）：

- 左欄：全校 active 學生列表
  - 搜尋框（姓名/年級）
  - 勾選框，已在名單中的預勾
- 右欄：目前已加入此課程的學生
  - 可點 × 移除
- 底部：確認按鈕
  - 計算 diff（新增 vs 移除）
  - 呼叫 `POST /api/admin/enrollments/batch`（新增）
  - 呼叫 `DELETE /api/admin/enrollments/batch`（移除）
- 顯示：目前 N / maxStudents 人

**驗證：** `pnpm --filter @94cram/manage-dashboard typecheck` → 0 errors

---

## Task 9: Frontend — 補課管理頁面增強（slot 搜尋 + 批量 + 通知書）

**Files:**
- Modify: `apps/manage-dashboard/src/app/makeup-classes/page.tsx`

**說明：**

### 「安排補課」流程改造

現有「排定補課」Modal 改為兩步驟：

**步驟一：搜尋現有補課時段**
- 篩選：科目下拉 + 日期範圍
- 呼叫 GET `/api/admin/makeup-slots?subject=&dateFrom=&dateTo=`
- 列出可用時段（日期、時間、老師、教室、已報名/上限）
- 每行 [加入此時段] 按鈕 → PUT `/api/admin/makeup-classes/:id` body: `{ slotId }`
- 底部 [建立新補課時段] → 開啟新增 slot 表單

**步驟二（若建立新時段）：**
- 表單：科目、日期、開始/結束時間、老師下拉、教室、最大人數
- POST `/api/admin/makeup-slots` → 自動關聯

### 批量安排

- Tab「待排定」新增全選/多選功能
- 勾選多筆後顯示「批量安排補課」按鈕
- 開啟 slot 搜尋（同上），但操作變為 POST `/api/admin/makeup-classes/batch-assign`

### 通知書下載

- 已排定 Tab 每行新增「通知」按鈕組：
  - [發送通知] → POST `/api/admin/makeup-classes/:id/notify`
  - [下載通知書] → 開新分頁 GET `/api/admin/makeup-classes/:id/notice-pdf`

**驗證：** `pnpm --filter @94cram/manage-dashboard typecheck` → 0 errors

---

## Task 10: Frontend — Sidebar 調整

**Files:**
- Modify: `apps/manage-dashboard/src/components/layout/Sidebar.tsx`

**說明：**

找到現有課表管理項目（約 35 行）：
```typescript
{ href: '/schedules', icon: '📅', label: '課表管理', ... }
```

改為：
```typescript
{ href: '/scheduling-center', icon: '📅', label: '排課中心', roles: ['superadmin', 'admin', 'staff', 'teacher', 'student'] },
```

`/schedules` 路由保留但不在 Sidebar 顯示（避免 breaking change）。

**驗證：** `pnpm --filter @94cram/manage-dashboard typecheck` → 0 errors

---

## Task 11: Demo 數據

**Files:**
- Modify: `apps/manage-dashboard/src/lib/demo-data.ts`

**說明：**

### 新增 Demo 資料

1. **DEMO_MAKEUP_SLOTS**（3 筆）
   ```typescript
   [
     { id: 'ms-1', subject: '數學', makeup_date: '2026-03-10', start_time: '18:00', end_time: '20:00', teacher_id: 't1', teacher_name: '王老師', room: 'A201', max_students: 10, current_students: 3 },
     { id: 'ms-2', subject: '英文', makeup_date: '2026-03-12', start_time: '14:00', end_time: '16:00', teacher_id: 't2', teacher_name: '李老師', room: 'B102', max_students: 8, current_students: 5 },
     { id: 'ms-3', subject: '國文', makeup_date: '2026-03-15', start_time: '10:00', end_time: '12:00', teacher_id: 't1', teacher_name: '王老師', room: 'A201', max_students: 10, current_students: 0 },
   ]
   ```

2. **個指併行 demo schedules** — 在現有 DEMO_WEEK_SCHEDULES 中加入同時段不同老師的個指記錄

### 新增 Demo Handlers

- `GET /api/admin/makeup-slots` → 回傳 DEMO_MAKEUP_SLOTS（支援 subject/date 篩選）
- `POST /api/admin/makeup-slots` → 回傳 `{ slot: { id: 'ms-demo-new', ...body } }`
- `PUT /api/admin/makeup-slots/:id` → 回傳 `{ slot: { id, ...body } }`
- `DELETE /api/admin/makeup-slots/:id` → 回傳 `{ message: '已刪除' }`
- `GET /api/admin/makeup-slots/:id/students` → 回傳該 slot 關聯的學生
- `POST /api/admin/makeup-classes/batch-assign` → 回傳 `{ updated: body.makeupClassIds.length }`
- `POST /api/admin/enrollments/batch` → 回傳 `{ enrolled: body.studentIds.length }`
- `DELETE /api/admin/enrollments/batch` → 回傳 `{ removed: body.studentIds.length }`
- `POST /api/admin/makeup-classes/:id/notify` → 回傳 `{ success: true, message: '通知已發送（Demo）' }`
- `GET /api/admin/makeup-classes/:id/notice-pdf` → 回傳 HTML 字串模擬（or redirect）
- `GET /api/w8/schedules` → 增強回傳加入 `course_type` 和 `student_name`

**驗證：** `pnpm --filter @94cram/manage-dashboard typecheck` → 0 errors

---

## Task 12: 全域 Typecheck 驗證

**指令：**
- `pnpm --filter @94cram/shared typecheck` → 0 errors
- `pnpm --filter @94cram/manage-backend typecheck` → 0 errors（或 `tsc --noEmit`）
- `pnpm --filter @94cram/manage-dashboard typecheck` → 0 errors（或 `tsc --noEmit`）

---

## 設計決策摘要

1. **補課時段獨立表** — `manage_makeup_slots` 支撐分組，原有 makeup_classes 用 slot_id FK 關聯
2. **個指一學生一記錄** — 沿用 inclassSchedules，前端按 dayOfWeek+startTime+endTime 分組顯示
3. **名單用 enrollments** — 批量操作用新的 batch API，不新建表
4. **行事曆自建** — 不引入 FullCalendar，用 Tailwind 自建符合莫蘭迪色系
5. **PDF 輕量方案** — html-pdf-node，Cloud Run 無 chromium 時 fallback 純 HTML
6. **現有 /schedules 保留** — Sidebar 改指向新頁面，舊路由不刪除
