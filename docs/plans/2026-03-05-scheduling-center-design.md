# 94Manage 排課中心：全新排課管理 + 名單聯動 + 個指併行 + 補課增強

## 目標

建立獨立「排課中心」頁面，整合排課行事曆、名單聯動、個指併行視圖、補課預檢與批量安排、補課通知書 PDF。

## 現有基礎（不需改動 schema）

- ✅ 課程 CRUD `/api/w8/courses`（manageCourses 表）
- ✅ 排課 CRUD `/api/w8/schedules`（inclassSchedules 週期性規則）
- ✅ 學生報名 `manage_enrollments`（studentId + courseId + status）
- ✅ 補課管理 `manage_makeup_classes`（pending→scheduled→completed）
- ✅ 課表頁面 `/schedules`（週/日/月視圖、新增/編輯/取消）
- ✅ LINE 通知 fire-and-forget（POST /api/notifications/send）

---

## 功能 A：DB Schema 變更

### 新表 — `manage_makeup_slots`（補課時段）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID PK | |
| tenant_id | UUID FK → tenants | |
| subject | VARCHAR(100) | 補課科目 |
| makeup_date | DATE | 補課日期 |
| start_time | VARCHAR(10) | 開始時間 HH:MM |
| end_time | VARCHAR(10) | 結束時間 HH:MM |
| teacher_id | UUID FK → manageTeachers | 授課老師 |
| room | VARCHAR(50) | 教室 |
| max_students | INTEGER DEFAULT 10 | 最大容納人數 |
| notes | TEXT | 備註 |
| created_at | TIMESTAMP | |

### 現有表增強 — `manage_makeup_classes`

| 新增欄位 | 型別 | 說明 |
|----------|------|------|
| slot_id | UUID FK → manageMakeupSlots | nullable，關聯補課時段 |

原有 `makeupDate/makeupTime/makeupEndTime/makeupTeacherId/makeupRoom` 保留（向後相容），新流程優先使用 slot 資訊。

### 不動的表

- `inclass_schedules` — 個指沿用一學生一記錄，前端按時段分組顯示
- `manage_enrollments` — 現有 studentId+courseId+status 結構足夠

---

## 功能 B：API 端點

### 補課時段 API（新）

| Method | Endpoint | 功能 |
|--------|----------|------|
| GET | `/api/admin/makeup-slots` | 列出（可篩 date, teacherId, subject） |
| POST | `/api/admin/makeup-slots` | 新增補課時段 |
| PUT | `/api/admin/makeup-slots/:id` | 修改時段 |
| DELETE | `/api/admin/makeup-slots/:id` | 刪除時段（僅無學生時） |

### 補課管理 API（增強）

| Method | Endpoint | 功能 |
|--------|----------|------|
| PUT | `/api/admin/makeup-classes/:id` | 增強：支援傳 slotId 關聯時段 |
| POST | `/api/admin/makeup-classes/batch-assign` | 新增：批量將多學生加入同一 slot |
| GET | `/api/admin/makeup-slots/:id/students` | 新增：查看某時段已加入的學生 |

### 排課中心 API（增強現有）

| Method | Endpoint | 功能 |
|--------|----------|------|
| GET | `/api/w8/schedules` | 增強：回傳加入 courseType、studentName（個指用） |
| POST | `/api/admin/enrollments/batch` | 新增：批量報名 |
| DELETE | `/api/admin/enrollments/batch` | 新增：批量退選 |

### 補課通知書 API（新）

| Method | Endpoint | 功能 |
|--------|----------|------|
| POST | `/api/admin/makeup-classes/:id/notify` | 生成通知書 + 發送 LINE 通知 |
| GET | `/api/admin/makeup-classes/:id/notice-pdf` | 下載補課通知書 PDF |

---

## 功能 C：排課中心前端 `/scheduling-center`

### 整體版面 — 左右雙欄

```
┌─────────────────────────────────────────────────────┐
│  排課中心                    [日] [週] [月]  ← →    │
├──────────────┬──────────────────────────────────────┤
│ 📋 課程列表   │                                      │
│              │         大型互動行事曆                 │
│ [全部]       │                                      │
│ [團班]       │   ┌─────┐ ┌─────┐                    │
│ [安親]       │   │數學A│ │英文B│  ← 色塊+狀態標色   │
│ [個指]       │   │上課中│ │未開始│                    │
│              │   └─────┘ └─────┘                    │
│ ──搜尋──     │                                      │
│ 國中數學A班  │   ┌─────────────┐                    │
│ 國中英文B班  │   │ 張志豪 數學  │ ← 個指併行        │
│ 張志豪 個指  │   │ 李小明 英文  │    同時段分行      │
│ ...          │   └─────────────┘                    │
├──────────────┴──────────────────────────────────────┤
│ 統計列：今日 12 堂 ｜ 上課中 3 ｜ 已結束 5 ｜ 未開始 4 │
└─────────────────────────────────────────────────────┘
```

### 行事曆色塊狀態

| 狀態 | 顏色 | 判斷邏輯 |
|------|------|----------|
| 上課中 | 綠色 `#8FA895` 脈動邊框 | 當前時間在 startTime ~ endTime 內 |
| 已下課 | 灰綠 `#8FA895/50` | 今天，已過 endTime |
| 已結束 | 灰色 `#9CA3AF` | 過去日期 |
| 未開始 | 藍色 `#6B9BD2` | 未來時段 |

### 課程類型色標

| 類型 | 色標 |
|------|------|
| 團班 | 藍色左邊條 |
| 安親 | 綠色左邊條 |
| 個指 | 紫色左邊條 |

### 點擊色塊 → 側邊詳情面板

顯示課程資訊（名稱、時間、老師、教室）+ 學生名單（人數/上限）+ [編輯課程] [管理名單] 按鈕。

### 名單管理 Modal

- 左：全校學生列表（搜尋 + 年級篩選）
- 右：已加入此課程的學生
- 勾選/取消 → 呼叫 batch enrollments API
- 顯示目前人數 / 最大人數

### 個指併行視圖

同一時段的個指課程垂直堆疊顯示，每行含學生名、科目、老師。每行獨立點擊可編輯老師指派。提供「同步所有老師」按鈕。

---

## 功能 D：補課機制增強

### 補課流程改造

```
缺席 → 自動建立 pending 記錄（現有）
    ↓
行政點「安排補課」
    ↓
步驟一：搜尋現有補課時段（篩科目+日期範圍）
    ↓
有合適時段 → 加入（slot_id 關聯）
無合適時段 → 建立新時段
    ↓
status: pending → scheduled
    ↓
自動觸發通知（LINE + 通知書 PDF）
    ↓
完成 → status: completed
```

### 批量補課

- 補課管理頁新增「批量安排」：勾選多筆 pending（同科目）→ 搜 slot → 批量加入
- 呼叫 `POST /api/admin/makeup-classes/batch-assign`

### 補課通知書 PDF

```
┌──────────────────────────────────┐
│        📋 補課通知書               │
│                                  │
│  學生姓名：張志豪                  │
│  原缺課日期：2026/03/05           │
│  原課程：國中數學 A 班             │
│                                  │
│  ── 補課安排 ──                   │
│  日期：2026/03/10（週一）          │
│  時間：18:00 ~ 20:00             │
│  老師：王老師                     │
│  教室：A201                      │
│  備註：請攜帶課本與作業             │
│                                  │
│  94補習班 敬上                    │
│  聯絡電話：02-xxxx-xxxx          │
└──────────────────────────────────┘
```

- 後端：HTML 模板 → PDF（html-pdf-node 或類似輕量方案）
- LINE 通知：文字摘要 + PDF 下載連結
- Demo 模式：回傳靜態範例 PDF

---

## 功能 E：Sidebar 調整

- 現有「課表管理」→ 改為「排課中心」指向 `/scheduling-center`
- 現有 `/schedules` 保留但 Sidebar 隱藏（避免 breaking change）
- 「補課管理」保留在出席管理下方

---

## Demo 數據

- 排課中心：沿用現有 demo schedules + courses，增加個指併行假資料
- 補課時段：3 筆 demo slots（不同科目/日期/老師）
- 補課通知書：靜態 HTML 模板 demo 回傳
- 批量報名：demo handler

## 設計決策

1. **補課時段獨立表** — 不改現有 makeup_classes 結構，用 slot_id FK 關聯，向後相容
2. **個指一學生一記錄** — 沿用 inclassSchedules，前端按時段分組顯示併行視圖
3. **名單用 enrollments** — 不新建表，批量操作用新的 batch API
4. **PDF 用輕量方案** — 不引入 puppeteer（太重），用 html-pdf-node 或純 HTML 下載
5. **現有 /schedules 保留** — 新頁面不破壞舊入口，Sidebar 切換指向新頁面
6. **行事曆自建** — 不引入 FullCalendar 等重量級套件，用 Tailwind 自建符合莫蘭迪色系的行事曆
