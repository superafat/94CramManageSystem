# 電子聯絡簿 v2 設計文件

> 日期：2026-03-04
> 狀態：已核准

## 1. 概述

完全取代現有的訊息公告板式聯絡簿（`/contact-book`），改為「每日每生」結構化聯絡簿系統。

### 核心功能

- **分校端**：老師按班級 → 學生，填寫每日聯絡簿（集體進度、個別指導、成績、小叮嚀、照片）
- **家長端**：後台 `/my-children/contact-book` + LINE LIFF 頁面查看聯絡簿
- **AI 分析**：Gemini API 分析學生弱點，推薦補強方向
- **LINE 通知**：老師發送後自動推送 Flex Message 給已綁定家長
- **照片上傳**：GCS Bucket 儲存
- **Demo 模式**：所有功能都有 mock 資料

## 2. 資料庫 Schema（正規化多表）

### 主表：`manage_contact_book_entries`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | uuid PK | |
| tenant_id | uuid FK tenants | 租戶 |
| student_id | uuid FK manage_students | 學生 |
| teacher_id | uuid FK manage_teachers | 填寫老師 |
| course_id | uuid FK manage_courses | 班級/課程 |
| entry_date | date | 聯絡簿日期 |
| status | varchar(20) | draft / sent / read |
| group_progress | text | 全班集體課程進度 |
| group_homework | text | 全體共同作業 |
| individual_note | text | 個別指導說明 |
| individual_homework | text | 個別專屬作業 |
| teacher_tip | text | 親師通訊小叮嚀 |
| sent_at | timestamp | 發送時間 |
| read_at | timestamp | 家長已讀時間 |
| created_at | timestamp | |
| updated_at | timestamp | |

索引：
- `(tenant_id, course_id, entry_date)`
- `(tenant_id, student_id, entry_date)` UNIQUE

### 成績子表：`manage_contact_book_scores`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | uuid PK | |
| entry_id | uuid FK entries | |
| subject | varchar(100) | 測驗科目/項目 |
| score | numeric | 成績 |
| class_avg | numeric | 班級平均（可選）|
| full_score | numeric default 100 | 滿分 |
| created_at | timestamp | |

### 照片子表：`manage_contact_book_photos`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | uuid PK | |
| entry_id | uuid FK entries | |
| url | text | GCS 圖片 URL |
| caption | varchar(200) | 圖片說明（可選）|
| sort_order | int | 排序 |
| created_at | timestamp | |

### 家長反饋子表：`manage_contact_book_feedback`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | uuid PK | |
| entry_id | uuid FK entries | |
| parent_user_id | uuid FK users | |
| rating | int | 1-5 星滿意度 |
| comment | text | 文字回饋 |
| created_at | timestamp | |

### AI 分析子表：`manage_contact_book_ai_analysis`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | uuid PK | |
| entry_id | uuid FK entries | |
| weakness_summary | text | 弱點分析摘要 |
| recommended_course_name | varchar(200) | 推薦課程名稱 |
| recommended_course_desc | text | 推薦課程說明 |
| raw_response | jsonb | Gemini 原始回應 |
| created_at | timestamp | |

### 班級模板表：`manage_contact_book_templates`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | uuid PK | |
| tenant_id | uuid FK tenants | |
| course_id | uuid FK manage_courses | |
| entry_date | date | |
| group_progress | text | |
| group_homework | text | |
| created_by | uuid FK users | |
| created_at | timestamp | |

UNIQUE: `(tenant_id, course_id, entry_date)`

## 3. API 設計

### 分校端（需 JWT auth）

```
GET    /api/admin/contact-book/entries?courseId=&date=     # 班級某日所有 entry
POST   /api/admin/contact-book/entries                     # 建立/批次建立
GET    /api/admin/contact-book/entries/:id                  # 單筆完整 entry（含子表）
PUT    /api/admin/contact-book/entries/:id                  # 更新
POST   /api/admin/contact-book/entries/:id/send             # 正式發送
DELETE /api/admin/contact-book/entries/:id                  # 刪除草稿

POST   /api/admin/contact-book/templates                   # 儲存班級進度模板
GET    /api/admin/contact-book/templates?courseId=&date=    # 取得模板

POST   /api/admin/contact-book/upload                      # 上傳圖片到 GCS
POST   /api/admin/contact-book/ai-analysis                 # Gemini 弱點分析
```

### 家長端

```
GET    /api/parent-ext/contact-book?studentId=              # 聯絡簿列表
GET    /api/parent-ext/contact-book/:id                     # 單筆聯絡簿
POST   /api/parent-ext/contact-book/:id/feedback            # 提交回饋
```

### LINE LIFF

```
GET    /api/line/contact-book/:id                           # LIFF 取得聯絡簿
POST   /api/line/contact-book/:id/feedback                  # LIFF 提交回饋
```

## 4. 前端頁面

### 分校端（/contact-book）

左右分欄佈局：
- **左側**：課程選擇 + 日期選擇 + 學生名單（狀態 badge + 星等）+ 批次建立按鈕
- **右側**：選取學生後的聯絡簿編輯表單
  1. 全班集體進度 & 作業（從模板帶入）
  2. 個別指導與加強 + 載入歷史弱點建議
  3. 今日考試成績錄入（同步成績管理）
  4. 親師通訊小叮嚀
  5. 今日學習剪影（GCS 上傳，最多 5 張）
  6. AI 智能分析建議（Gemini）
  7. 最新家長反饋

Header 操作：預覽家長版 / 正式發送

### 家長端

**後台版（/my-children/contact-book）**：
- 選擇孩子 → 日期列表 → 卡片式聯絡簿
- 滿意度回饋表單

**LINE LIFF 版**：
- 同樣卡片式排版
- LINE userId 自動辨識，免登入

## 5. LINE 通知流程

```
老師「正式發送」
  → status = 'sent', sentAt = now()
  → 查詢學生家長 LINE userId
  → bot-gateway 推送 Flex Message（摘要卡片 + LIFF 連結）
  → 家長點擊 → LIFF 頁面
  → 家長閱讀 → readAt 更新
```

## 6. AI 分析流程

```
老師點「生成 AI 分析」
  → 撈取學生近 30 天成績
  → Gemini 2.5 Flash prompt：分析弱點 + 推薦補強方向
  → 存入 manage_contact_book_ai_analysis
  → 前端顯示弱點摘要 + 推薦課程
```

## 7. Demo 模式

- 聯絡簿 API → mock 資料（3-5 筆範例）
- AI 分析 → 預設弱點分析文字
- 照片上傳 → 模擬成功
- LINE 發送 → 模擬成功

## 8. 棄用

- 舊表 `manage_contact_messages` 保留但不再使用（避免 migration 風險）
- 舊頁面 `/contact-book` 完全重寫
