# 94manage 功能清單與特徵分析

> 生成日期：2026-03-05
> 基於 apps/manage-backend + apps/manage-dashboard 完整掃描

---

## 📊 概況統計

| 分類 | 數量 | 備註 |
|------|------|------|
| **後端路由檔案** | 20 個 | 包含 admin、platform、parent、bot-ext 等命名空間 |
| **前端頁面** | 57 個 | Next.js App Router 結構，各級別組件具有 layout.tsx + page.tsx |
| **前端路由組** | ~15 個 | 主要分組：dashboard、個人視圖、管理面板、家長入口 |
| **核心資料模型** | 12 個 | students, teachers, grades, attendance, contact-book 等 |
| **權限模組** | 是 | RBAC 基礎，Permission + Role 系統 |

---

## 🎯 後端路由檔案完整清單

### A. 核心管理路由 (apps/manage-backend/src/routes/admin/)

#### 1. **students.ts** (學員管理)
- `GET /students` — 列表（支援搜尋、篩選、分頁）
- `POST /students` — 建立新學員
- `GET /students/:id` — 詳細資訊
- `PUT /students/:id` — 更新學員資料
- `DELETE /students/:id` — 軟刪除
- **權限**: STUDENTS_READ / STUDENTS_WRITE
- **特徵**: 支援分級、狀態（active/inactive/dropped/graduated/suspended）、多分校篩選

#### 2. **grades.ts** (成績管理)
- `GET /grades` — 查詢成績（支援日期範圍、考試類型、學生篩選）
- `POST /grades` — 單筆或批量建立成績紀錄
- **權限**: GRADES_READ / GRADES_WRITE
- **特徵**: 自動計算百分比、letter grade (A-F)、及格判定

#### 3. **attendance.ts** (點名/出勤)
- `GET /attendance` — 查詢出勤紀錄（支援日期範圍）
- `POST /attendance` — 建立出勤紀錄（單筆或批量）
- **權限**: ATTENDANCE_READ / ATTENDANCE_WRITE
- **特徵**: 關聯課程（lesson_id）、簡單的 present 布林值

#### 4. **contact-book.ts** (電子聯絡簿) ⭐ 最複雜
- `GET /contact-book/entries` — 查詢課程某日期的聯絡簿項目（包含所有學生狀態）
- `POST /contact-book/entries` — 建立（單筆或批量）
  - 支援 groupProgress, groupHomework, individualNote, individualHomework, teacherTip
  - 支援成績子表 (scores array)
- `GET /contact-book/entries/:id` — 詳細（含成績、照片、反饋、AI 分析）
- `PUT /contact-book/entries/:id` — 編輯（draft 狀態）
- `DELETE /contact-book/entries/:id` — 刪除（draft 狀態）
- `POST /contact-book/entries/:id/send` — 發送（draft → sent，觸發 LINE/Telegram 通知）
- `POST /contact-book/templates` — 建立課程範本
- `GET /contact-book/templates` — 取得範本
- `POST /contact-book/ai-analysis` — AI 分析學生弱點（呼叫 Gemini API）
- `POST /contact-book/ai-writing` — AI 助寫聯絡簿內容
- `POST /contact-book/upload` — 上傳照片（5MB 限制，支援 JPEG/PNG/WebP）
- `DELETE /contact-book/photos/:photoId` — 刪除照片
- `GET /contact-book/feedback-stats` — 反饋統計（按課程/老師聚合，含評分分佈）
- **權限**: GRADES_READ / ATTENDANCE_WRITE （大部分）
- **特徵**: 最複雜的多表協作，包含子表(scores/photos/feedback/aiAnalysis)、狀態機制、AI 整合

#### 5. **makeup-classes.ts** (補課管理)
- `GET /makeup-classes` — 列表（支援狀態、學生、月份篩選）
- `POST /makeup-classes` — 建立補課紀錄
- `PUT /makeup-classes/:id` — 排課（可用 slotId 或手動指定時間）
- `PUT /makeup-classes/:id/complete` — 標記完成
- `POST /makeup-classes/batch-assign` — 批量指派補課時段
- `DELETE /makeup-classes/:id` — 取消（soft delete，status = cancelled）
- `POST /makeup-classes/:id/notify` — 發送補課通知 (LINE/Telegram)
- `GET /makeup-classes/:id/notice-pdf` — 產生補課通知單 HTML
- **權限**: ATTENDANCE_READ / ATTENDANCE_WRITE
- **狀態機制**: pending → scheduled → completed | cancelled
- **特徵**: 與 makeup-slots 關聯、支援人數上限檢查

#### 6. **makeup-slots.ts** (補課時段管理)
- `GET /makeup-slots` — 列表（支援日期範圍）
- `POST /makeup-slots` — 建立時段
- `PUT /makeup-slots/:id` — 更新時段
- `DELETE /makeup-slots/:id` — 刪除
- `GET /makeup-slots/:slotId/students` — 查詢已分配學生清單
- **特徵**: 定義補課時段（日期、時間、老師、教室、最大人數）

#### 7. **billing.ts** (帳單/費用管理) ⭐ 次複雜
- `GET /billing` — 帳單列表
- `GET /billing/:branchId` — 分校帳單
- `GET /billing/course/:courseId` — 課程帳單
- `POST /billing/generate` — 生成帳單
- `POST /billing/:invoiceId/pay` — 記錄付款
- `POST /billing/payment-records/batch` — 批量記錄付款
- `GET /billing/payment-records` — 付款紀錄查詢
- `GET /billing/daycare-packages` — 托育套餐列表
- `POST /billing/daycare-packages` — 建立套餐
- `PUT /billing/daycare-packages/:id` — 更新套餐
- `DELETE /billing/daycare-packages/:id` — 刪除套餐
- `GET /billing/price-memory` — 課程定價歷史
- `PUT /billing/price-memory` — 更新定價記錄
- `GET /billing/session-count` — 課程時數查詢
- `GET /courses/:id/fees` — 課程費用詳情
- `PUT /courses/:id/fees` — 更新課程費用
- **權限**: BILLING_READ / BILLING_WRITE
- **特徵**: 支援托育按次計費、定價歷史追蹤

#### 8. **scheduling.ts** (課程排課)
- `GET /scheduling/week` — 週課表
- `GET /schedule/:branchId` — 分校課表
- `POST /schedule/check` — 檢查時間衝突
- `POST /schedule/create` — 建立課表時段
- **權限**: SCHEDULE_READ / SCHEDULE_WRITE
- **特徵**: 衝突檢查（學生、老師、教室同時段）、支援 Markdown 輸出

#### 9. **enrollments.ts** (報名/選課)
- `POST /enrollments/batch` — 批量報名課程
- **權限**: ATTENDANCE_WRITE
- **特徵**: ON CONFLICT 處理重複報名

#### 10. **finance.ts** (財務總覽)
- `GET /finance/summary` — 財務摘要（支援月/季/年聚合）
  - 營收（已付帳單總和）
  - 支出（expense table）
  - 課程數、師資數、學生數
- `POST /finance/ai-analysis` — AI 財務分析
- **權限**: BILLING_READ
- **特徵**: 時間範圍彈性聚合

#### 11. **contact-book.ts** 子功能 → 見上方

#### 12. **audit.ts** (審計日誌)
- `GET /audit-logs` — 審計日誌查詢
- `GET /alerts` — 警報列表（異常事件）
- `POST /alerts/:id/confirm` — 確認警報
- `POST /alerts/:id/revert` — 還原被警報的操作
- **權限**: REPORTS_READ / STUDENTS_WRITE
- **特徵**: 系統事件追蹤

#### 13. **analytics.ts** (分析追蹤)
- `GET /analytics/overview` — 概覽
- `GET /analytics/pages` — 頁面訪問
- `GET /analytics/referrers` — 來源追蹤
- `GET /analytics/bots` — Bot 檢測
- `GET /analytics/bots/logs` — Bot 日誌
- **特徵**: 網站分析集成

#### 14. **ai-providers.ts** (AI 提供商管理)
- `GET /ai/providers` — 列表
- `GET /ai/quota` — 配額總覽
- `GET /ai/quota/:provider/history` — 配額使用歷史
- `POST /ai/quota/:provider/reset` — 重設配額
- `POST /ai/quota/limits` — 設定配額限制
- `POST /ai/strategy` — 設定 AI 策略
- **特徵**: Gemini/OpenAI 等多提供商支援

#### 15. **reports.ts** (報表)
- `GET /reports/trend` — 趨勢報表
- `GET /reports/branch/:branchId` — 分校報表
- `GET /reports/student/:studentId` — 學生報表
- `GET /churn/:branchId` — 流失率分析

#### 16. **settings.ts** (設定)
- `GET /settings` — 取得設定
- `POST /settings` — 更新設定
- **特徵**: Tenant 層級設定

#### 17. **binding-tokens.ts** (家長綁定令牌)
- `GET /students/:id/binding-token` — 取得綁定令牌
- `POST /students/:id/binding-token` — 建立令牌
- `DELETE /students/:id/binding-token` — 撤銷令牌
- **特徵**: 家長掃 QR Code 綁定子女

#### 18. **conversations.ts** (對話/訊息)
- `GET /conversations` — 列表
- **特徵**: 與 LINE 整合

#### 19. **knowledge.ts** (知識庫)
- `POST /knowledge/ingest` — 上傳知識文檔
- **權限**: Role.ADMIN

#### 20. **tenants.ts** (租戶管理 - Superadmin)
- `GET /tenants` — 所有租戶
- `GET /tenants/:tenantId/stats` — 租戶統計
- `GET /trials` — 試用版列表
- `GET /trials/:tenantId` — 試用詳情
- `POST /trials/:tenantId/approve` — 核准試用
- `POST /trials/:tenantId/reject` — 拒絕試用
- `POST /trials/:tenantId/revoke` — 撤銷試用
- **權限**: Role.SUPERADMIN

---

### B. 其他路由命名空間

#### platform/ (平台層級 - Superadmin / 跨租戶)
- /platform/auth — 平台登入
- /platform/tenants — 租戶管理
- /platform/accounts — 帳戶管理
- /platform/security — 安全設定
- /platform/dashboard — 平台儀表板
- /platform/analytics — 平台分析
- /platform/ai — AI 設定
- /platform/finance — 平台財務
- /platform/knowledge — 知識庫
- /platform/settings — 平台設定

#### parent/ (家長端)
- /parent/contact-book — 家長聯絡簿查詢
- /parent/index — 家長首頁

#### w8/ (W8 工資系統 - 老師端)
- /w8/teachers — 老師清單
- /w8/schedules — 老師課表
- /w8/salary — 薪水計算
- /w8/expenses — 支出管理
- /w8/courses — 課程數據
- /w8/notifications — 老師通知

#### bot-ext/ (LINE Bot 擴展)
- /bot-ext/data — Bot 數據查詢
- /bot-ext/student — 學生數據
- /bot-ext/finance — 帳單查詢
- /bot-ext/line — LINE 整合

#### 其他
- /auth.ts — 通用登入
- /demo.ts — Demo 模式
- /bind.ts — 家長綁定
- /users.ts — 用戶管理
- /notifications.ts — 通知系統

---

## 📱 前端頁面 (Next.js App Router)

### 頂層組織

```
/app
├── /dashboard/              # 管理後台 (guard: Admin/Manager)
│   ├── page.tsx            # 儀表板
│   ├── /analytics          # 分析
│   ├── /audit              # 審計
│   ├── /conversations      # 訊息
│   ├── /knowledge          # 知識庫
│   ├── /settings           # 設定
│   └── /trials             # 試用版管理
│
├── /students/              # 學員管理 (guard: Admin/Teacher)
│   ├── page.tsx            # 列表
│   └── /[id]/page.tsx      # 詳細頁 (edit form)
│
├── /grades/                # 成績管理 (guard: Admin/Teacher)
│   ├── page.tsx            # 列表
│   └── layout.tsx
│
├── /attendance/            # 點名系統 (guard: Admin/Teacher)
│   └── page.tsx
│
├── /contact-book/          # 電子聯絡簿 (guard: Admin/Teacher)
│   ├── page.tsx            # 聯絡簿列表/編輯
│   └── layout.tsx
│
├── /makeup-classes/        # 補課管理 (guard: Admin)
│   ├── page.tsx
│   └── layout.tsx
│
├── /teacher-attendance/    # 老師出勤 (guard: Admin)
│   └── page.tsx
│
├── /schedules/             # 課表管理 (guard: Admin)
│   ├── page.tsx            # 課表檢視
│   └── layout.tsx
│
├── /scheduling-center/     # 排課中心 (guard: Admin)
│   ├── page.tsx            # AI 排課介面
│   └── layout.tsx
│
├── /enrollment/            # 報名管理 (guard: Admin)
│   ├── page.tsx
│   └── layout.tsx
│
├── /teachers/              # 師資管理 (guard: Admin)
│   ├── page.tsx
│   └── layout.tsx
│
├── /billing/               # 帳單管理 (guard: Admin)
│   ├── page.tsx
│   └── layout.tsx
│
├── /finance/               # 財務 (guard: Admin)
│   ├── page.tsx
│   └── layout.tsx
│
├── /salary/                # 薪水（W8） (guard: HR/Admin)
│   ├── page.tsx
│   └── layout.tsx
│
├── /expenses/              # 支出 (guard: Admin)
│   ├── page.tsx
│   └── layout.tsx
│
├── /reports/               # 報表 (guard: Admin)
│   ├── page.tsx
│   └── layout.tsx
│
├── /headquarters/          # 總部視圖 (guard: Superadmin)
│   ├── page.tsx
│   └── layout.tsx
│
├── /my-children/           # 家長視圖：我的小孩
│   ├── page.tsx            # 子女清單
│   ├── /grades/            # 子女成績
│   ├── /billing/           # 子女帳單
│   ├── /contact-book/      # 子女聯絡簿
│   ├── /notifications/     # 通知
│   └── /recommendations/   # 推薦課程
│
├── /my-schedule/           # 個人課表（老師）
│   └── page.tsx
│
├── /my-salary/             # 個人薪水（老師）
│   └── page.tsx
│
├── /my-grades/             # 個人成績（學生）
│   └── page.tsx
│
├── /bind/[token]/          # 家長綁定頁面
│   └── page.tsx            # 掃 QR Code 綁定
│
├── /liff/                  # LINE LIFF 視圖
│   ├── /contact-book/[id]  # LINE 內打開聯絡簿
│   └── layout.tsx
│
├── /login/                 # 登入頁面
│   └── page.tsx
│
├── /landing/               # 著陸頁
│   └── page.tsx
│
├── /demo/                  # Demo 模式入口
│   └── page.tsx
│
├── /guide/                 # 使用說明
│   └── page.tsx
│
├── /trial-signup/          # 試用版註冊
│   └── page.tsx
│
├── /contact-book/ (LIFF)   # → 重複計算，應為 /liff/contact-book
│   └── page.tsx
│
└── /layout.tsx             # 全局 layout
    /page.tsx              # 根路由重定向
```

### 頁面分類統計

| 類型 | 數量 | 樣板 |
|------|------|------|
| **管理員專用** (Admin) | 22 | students, grades, attendance, contact-book, makeup, scheduling, billing, finance, salary, expenses, reports, audit, analytics, knowledge, trial, teachers, headquarters |
| **老師專用** (Teacher) | 6 | my-schedule, my-salary, grades (view), contact-book (view), attendance (mark) |
| **家長專用** (Parent) | 6 | my-children, my-children/grades, my-children/billing, my-children/contact-book, my-children/notifications, my-children/recommendations |
| **學生專用** (Student) | 2 | my-grades, contact-book (view) |
| **公開** (Public) | 5 | login, landing, demo, guide, trial-signup |
| **特殊** (Special) | 4 | bind, liff, contact-book, layout |

---

## 🎨 功能特徵分類

### ⭐ 學生導向功能（候選遷移到 94inClass）

| 功能 | 後端路由 | 前端頁面 | 複雜度 | 相關性 |
|------|---------|---------|--------|--------|
| **成績管理** | grades.ts | /grades | 中 | 高 ✅ |
| **出勤記錄** | attendance.ts | /attendance | 低 | 高 ✅ |
| **電子聯絡簿** | contact-book.ts (1061 行) | /contact-book | 高 | 高 ✅ |
| **補課管理** | makeup-classes.ts | /makeup-classes | 中 | 中 ⚠️ |
| **課程排課** | scheduling.ts | /schedules, /scheduling-center | 中 | 低 |
| **報名選課** | enrollments.ts | /enrollment | 低 | 中 |

### 📊 管理/營運導向（保留在 94manage）

| 功能 | 後端路由 | 前端頁面 | 複雜度 | 備註 |
|------|---------|---------|--------|------|
| **帳單管理** | billing.ts (665 行) | /billing, /finance | 高 | 核心商業邏輯 |
| **財務分析** | finance.ts | /finance | 中 | 管理決策 |
| **老師薪水** | w8/salary | /salary | 中 | HR 功能 |
| **支出追蹤** | w8/expenses | /expenses | 低 | 成本控制 |
| **課表管理** | scheduling.ts | /schedules | 中 | 運營複雜 |
| **審計日誌** | audit.ts | /dashboard/audit | 低 | 合規 |
| **報表中心** | reports.ts | /reports | 中 | 業務智能 |

### 🌉 跨應用場景（需協作）

| 功能 | 影響面 | 現狀 | 建議 |
|------|--------|------|------|
| **學生資料同步** | grades, attendance, contact-book | 94manage 為權威源 | 94inClass 讀取共用 students 表 |
| **課程資訊** | enrollment, scheduling, makeup-classes | 各自管理 | 統一課程 schema |
| **家長通知** | contact-book, makeup-classes | 各系統獨立 | 共用 notification 系統 |
| **老師視圖** | grades, attendance, contact-book | 各系統獨立 | 94inClass 為點名中心 |

---

## 🔐 權限模型

### 權限列表 (Permission enum)

```typescript
SUPERADMIN        // 平台超級管理員
ADMIN             // 租戶管理員
MANAGER           // 分校主任
TEACHER           // 老師
PARENT            // 家長

STUDENTS_READ / STUDENTS_WRITE       // 學員管理
GRADES_READ / GRADES_WRITE           // 成績
ATTENDANCE_READ / ATTENDANCE_WRITE   // 出勤
SCHEDULE_READ / SCHEDULE_WRITE       // 課表
BILLING_READ / BILLING_WRITE         // 帳單
REPORTS_READ                         // 報表
```

### 路由保護等級

- **authMiddleware**: 所有 /api/* 路由都需要有效 JWT
- **requirePermission()**: 細粒度權限檢查
- **requireRole()**: 角色檢查（SUPERADMIN、ADMIN）
- **Role-based filtering**: 查詢時自動篩選（Teacher 只看自己分校、Parent 只看自己小孩）

---

## 🔌 外部整合

### AI 服務
- **Gemini 2.0 Flash Lite**: 聯絡簿助寫、學生弱點分析
- **OpenAI** (可選)
- **配額管理**: /ai/quota 路由

### 通知系統
- **LINE Notify**: 聯絡簿發送、補課通知、排課異動
- **Telegram**: 家長推播
- **Email** (implied)

### 媒體儲存
- **Google Cloud Storage (GCS)**: 聯絡簿照片上傳

### 資料庫
- **PostgreSQL** @ 35.221.144.161 (cloud-sql)
- **Drizzle ORM** schema 同步

---

## 📈 複雜度分析

### 程式碼行數（路由層）

| 檔案 | 行數 | 複雜度 | 主要原因 |
|------|------|--------|---------|
| contact-book.ts | 1061 | ⭐⭐⭐⭐⭐ | 多子表、狀態機制、AI 整合、批量操作 |
| billing.ts | 665 | ⭐⭐⭐⭐ | 多表協作、托育計費邏輯、定價歷史 |
| students.ts | 293 | ⭐⭐⭐ | 複雜查詢、多篩選條件、角色過濾 |
| makeup-classes.ts | 437 | ⭐⭐⭐ | 狀態機制、時段指派、批量操作 |
| scheduling.ts | 134 | ⭐⭐ | 衝突檢查、週期課表 |
| finance.ts | 228 | ⭐⭐ | 時間聚合、多維彙總 |
| audit.ts | 214 | ⭐⭐ | 日誌追蹤、警報判定 |

---

## 🚀 遷移候選評估

### 強候選（建議遷移至 94inClass）

#### 1. **成績管理** (grades.ts → inclass)
- 低耦合：獨立表 `grades` + `students` FK
- 高價值：核心學生功能
- 實現成本：低（CRUD 直譯即可）
- **優先級**: P0

#### 2. **出勤記錄** (attendance.ts → inclass)
- 核心功能：點名系統的基礎
- 低複雜度：簡單 insert/query
- **優先級**: P0

#### 3. **電子聯絡簿** (contact-book.ts → 共享)
- 現狀：94manage 完全所有
- 問題：94inClass 點名無聯絡簿反饋
- 建議：遷移核心表結構，保留多媒體/AI 邏輯於 94manage
- **優先級**: P1 (分階段)

### 中等候選

#### 4. **補課管理** (makeup-classes.ts)
- 依賴：enrollment 狀態
- 建議：保留在 94manage，94inClass 透過 API 同步補課資訊
- **優先級**: P2

### 保留在 94manage

- **帳單** (billing.ts) — 商業邏輯複雜，跨課程聚合
- **財務** (finance.ts) — 管理視圖，不是學生功能
- **老師薪水** (w8/salary) — HR 系統
- **課表排課** (scheduling.ts) — 全系統協調
- **報表** (reports.ts) — 管理決策層

---

## 📋 資料模型依賴圖

```
共用表:
  tenants
  users (RBAC)
  branches
  user_permissions

94manage 獨有:
  manage_students ──→ manage_grades
                   ├→ manage_attendance
                   ├→ manage_contact_book_entries
                   │  ├→ manage_contact_book_scores
                   │  ├→ manage_contact_book_photos
                   │  ├→ manage_contact_book_feedback
                   │  └→ manage_contact_book_ai_analysis
                   ├→ manage_makeup_classes
                   ├→ manage_enrollments
                   └→ parent_students

  manage_teachers
  manage_courses ──→ manage_enrollments
  manage_billing_records
  manage_expenses
  manage_schedules
  manage_makeup_slots

94inClass 獨有:
  inclass_schedules
  inclass_attendance (獨立的點名記錄)

潛在共享:
  manage_contact_book_* (如果遷移)
  manage_grades (如果遷移)
```

---

## ✅ 結論

### 94manage 定位
- **主業**: 學員生命週期管理（招生→報名→出勤→成績→帳單→離校）
- **核心**: 帳單、財務、營運管理
- **支撐**: 聯絡簿反饋、補課追蹤、老師薪水

### 94inClass 定位
- **主業**: 實時點名、課堂管理、家長實時反饋
- **可獲取**: 成績（透過 API 同步）、聯絡簿基礎（如遷移）
- **獨有**: 課堂簽到、實時家長通知、出勤異常警報

### 遷移路徑
1. **Phase 1** (P0): 遷移 `grades` + `attendance` 基礎表
2. **Phase 2** (P1): 遷移 `contact_book_entries` 核心，保留媒體/AI
3. **Phase 3** (P2): 同步補課資訊（API 而非遷移）

---

## 📎 附錄：完整路由樹

```
POST   /auth/login
POST   /auth/logout
GET    /users/profile

# Admin Routes (ALL require auth + Permission)
GET    /students
POST   /students
GET    /students/:id
PUT    /students/:id
DELETE /students/:id

GET    /grades
POST   /grades

GET    /attendance
POST   /attendance

GET    /contact-book/entries
POST   /contact-book/entries
GET    /contact-book/entries/:id
PUT    /contact-book/entries/:id
DELETE /contact-book/entries/:id
POST   /contact-book/entries/:id/send
GET    /contact-book/templates
POST   /contact-book/templates
POST   /contact-book/ai-analysis
POST   /contact-book/ai-writing
POST   /contact-book/upload
DELETE /contact-book/photos/:photoId
GET    /contact-book/feedback-stats

GET    /makeup-classes
POST   /makeup-classes
PUT    /makeup-classes/:id
PUT    /makeup-classes/:id/complete
POST   /makeup-classes/batch-assign
DELETE /makeup-classes/:id
POST   /makeup-classes/:id/notify
GET    /makeup-classes/:id/notice-pdf

GET    /makeup-slots
POST   /makeup-slots
PUT    /makeup-slots/:id
DELETE /makeup-slots/:id
GET    /makeup-slots/:slotId/students

GET    /billing
GET    /billing/:branchId
GET    /billing/course/:courseId
POST   /billing/generate
POST   /billing/:invoiceId/pay
POST   /billing/payment-records/batch
GET    /billing/payment-records
GET    /billing/daycare-packages
POST   /billing/daycare-packages
PUT    /billing/daycare-packages/:id
DELETE /billing/daycare-packages/:id
GET    /billing/price-memory
PUT    /billing/price-memory
GET    /billing/session-count

GET    /scheduling/week
GET    /schedule/:branchId
POST   /schedule/check
POST   /schedule/create

POST   /enrollments/batch

GET    /finance/summary
POST   /finance/ai-analysis

GET    /audit-logs
GET    /alerts
POST   /alerts/:id/confirm
POST   /alerts/:id/revert

GET    /analytics/overview
GET    /analytics/pages
GET    /analytics/referrers
GET    /analytics/bots
GET    /analytics/bots/logs

GET    /ai/providers
GET    /ai/quota
GET    /ai/quota/:provider/history
POST   /ai/quota/:provider/reset
POST   /ai/quota/limits
POST   /ai/strategy

GET    /reports/trend
GET    /reports/branch/:branchId
GET    /reports/student/:studentId
GET    /churn/:branchId

GET    /settings
POST   /settings

GET    /students/:id/binding-token
POST   /students/:id/binding-token
DELETE /students/:id/binding-token

GET    /conversations

POST   /knowledge/ingest

GET    /tenants
GET    /tenants/:tenantId/stats
GET    /trials
GET    /trials/:tenantId
POST   /trials/:tenantId/approve
POST   /trials/:tenantId/reject
POST   /trials/:tenantId/revoke

# Parent Routes
GET    /parent/contact-book

# W8 Routes (Teacher Portal)
GET    /w8/teachers
GET    /w8/schedules
GET    /w8/salary
GET    /w8/expenses
GET    /w8/courses
GET    /w8/notifications

# Bot Routes
GET    /bot-ext/data
GET    /bot-ext/student
GET    /bot-ext/finance
GET    /bot-ext/line

# Platform Routes (Superadmin)
POST   /platform/auth/login
GET    /platform/dashboard
...etc
```
