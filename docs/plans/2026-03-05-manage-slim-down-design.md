# 94manage 架構瘦身 — 功能遷移至 94inClass 設計文件

**日期**: 2026-03-05
**狀態**: Approved

## 目標

將 94manage 中「課堂教學與學員服務」相關功能遷移至 94inClass，實現系統解耦：
- **94manage** 定位為「行政營運中心」（老師、行政人員使用）
- **94inClass** 定位為「課堂教學與學員服務中心」（學生、家長使用）

## 決策記錄

| 決策項目 | 選擇 | 理由 |
|---------|------|------|
| 功能重疊處理 | 合併精華 (C) | 取兩邊最好的部分合併 |
| 角色分工 | 按角色完全切分 (C) | 學生+家長用 inClass，老師+行政用 manage |
| 資料架構 | 維持共用 DB + 漸進遷移 (C) | 短期零風險，新表用 inclass_ 前綴 |
| 遷移範圍 | 核心教學功能一次到位 (B) | 成績+出勤+聯絡簿+補課，構成完整教學閉環 |

## 系統職責重定義

### 94manage「行政營運中心」
- **使用者**: 老師、行政人員
- **核心功能**: 老師排課（資源調度）、薪資計算、帳單/財務、報表、合約管理、支出管理
- **保留路由**: scheduling, billing, finance, salary, reports, expenses, platform

### 94inClass「課堂教學與學員服務中心」
- **使用者**: 學生、家長（老師查看用）
- **核心功能**: 點名、成績管理、電子聯絡簿、補課管理、學生課表
- **現有功能**: attendance (checkin), exams, students, classes, parents, face recognition

## 遷移範圍（第一階段）

### P0: 修復 403 Bug + Cloud Run 啟動問題

**403 Demo 登入修復**:
- 檢查 inclass-dashboard CORS 設定
- 驗證 API_BASE 環境變數指向正確的 backend URL
- 確認 demo route 不被 JWT middleware 攔截
- 檢查 rate limiter 是否阻擋

**Cloud Run 啟動失敗修復** (pre-existing):
- 原因: `@94cram/shared` package.json exports 指向 `.ts` 檔案，Node.js 20 無法載入
- 修法: 同 bot-gateway — Dockerfile 安裝 tsx，CMD 使用 tsx 執行

### P1: 成績管理（合併精華）

**來源**: manage `grades.ts` (2 endpoints) + inClass `exams.ts` (5 endpoints)

**策略**: 保留 inClass 現有的考試 CRUD，加入 manage 的：
- 自動成績計算邏輯
- AI 學習分析
- 成績統計報表

**不需要新表**: 使用現有 `inclass_exams` + `inclass_exam_scores`

### P2: 出勤/點名（合併精華）

**來源**: manage `attendance.ts` (2 endpoints) + inClass `attendance.ts` (POST /checkin, GET /today)

**策略**: 保留 inClass 現有的 checkin 流程，加入 manage 的：
- 出勤統計 API
- 家長通知整合（通知已在 notify-helper 實作）
- 請假/遲到記錄管理

**不需要新表**: 使用現有 `inclass_attendances` + manage 的 `manage_student_leaves`

### P3: 電子聯絡簿（遷移至 inClass）

**來源**: manage `contact-book.ts` (1061 行, 13 endpoints)

**策略**: 完整搬移，包含：
- 聯絡簿 CRUD (draft → sent)
- AI 助寫 (Gemini 2.0 Flash Lite)
- 多媒體附件
- 家長回饋
- AI 分析

**新增表** (inclass_ 前綴):
- `inclass_contact_book_templates`
- `inclass_contact_book_entries`
- `inclass_contact_book_scores`
- `inclass_contact_book_photos`
- `inclass_contact_book_feedback`
- `inclass_contact_book_ai_analysis`

### P4: 補課管理（遷移至 inClass）

**來源**: manage `makeup-classes.ts` (8 endpoints)

**策略**: 完整搬移，包含：
- 補課申請/審核流程
- 狀態機 (pending → scheduled → completed | cancelled)
- 補課時段管理
- 家長通知

**新增表** (inclass_ 前綴):
- `inclass_makeup_slots`
- `inclass_makeup_classes`

## 資料架構

```
共用 DB (platform94) — 維持現狀
├── 共用表 (不動): tenants, users, branches, user_permissions
├── manage_ 表 (不動): courses, students, teachers, enrollments, payments...
├── inclass_ 表 (現有, 不動): attendances, exams, exam_scores, schedules...
└── inclass_ 表 (新增):
    ├── contact book 6 表 (從 manage_ schema 複製，前綴改 inclass_)
    └── makeup 2 表 (從 manage_ schema 複製，前綴改 inclass_)
```

**關鍵決策**:
- inClass 繼續直接讀取 `manage_students`, `manage_courses`, `manage_teachers`
- 新功能表用 `inclass_` 前綴，為未來獨立部署預留空間
- 舊 manage_ 聯絡簿/補課表暫時保留（過渡期），不寫入新資料

## manage 端瘦身

### 移除的後端路由
- `routes/admin/contact-book.ts` → 移至 inclass-backend
- `routes/admin/makeup-classes.ts` → 移至 inclass-backend
- `routes/admin/grades.ts` → 合併至 inclass-backend exams
- `routes/admin/attendance.ts` → 合併至 inclass-backend attendance

### 移除的前端頁面
- `/contact-book/*` → 改為導向 inClass URL
- `/makeup-classes/*` → 改為導向 inClass URL
- `/grades/*` → 改為導向 inClass URL
- `/attendance/*` → 改為導向 inClass URL

### 保留在 manage 的功能
- 老師排課 (`scheduling.ts`)
- 帳單/財務 (`billing.ts`, `finance.ts`)
- 薪資 (`w8/salary.ts`)
- 報表 (`reports.ts`)
- 平台管理 (`platform/*`)
- 支出管理 (`expenses.ts`)
- 學員基本資料 CRUD (`students.ts`)
- 課程管理 (`courses.ts`)
- 老師管理 (`teachers.ts`)

## 風險與緩解

| 風險 | 緩解措施 |
|------|---------|
| 聯絡簿遷移複雜度高 (1061 行 + 6 表) | 先建表 + 搬路由，保留原始邏輯不改寫 |
| 通知系統引用路徑變更 | notify-helper 已在 manage-backend，需同步到 inclass-backend |
| 現有資料遷移 | 第一階段不遷移舊資料，新資料寫入新表 |
| 家長端 (/my-children/*) 目前在 manage | 第二階段處理，不在本次範圍 |

## 第二階段（未來）

- 家長端頁面 (`/my-children/*`) 遷移至 inClass
- 學生排課視角
- 舊資料遷移腳本
- 考慮 API 解耦（inClass 透過 internal API 取 manage 資料）
