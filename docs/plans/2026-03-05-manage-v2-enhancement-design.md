# 94Manage 第二波增強設計：補課管理 + 異常通知 + AI 助寫 + 反饋看板

## 目標

增強出缺勤管理（補課自動化、異常通知）、電子聯絡簿（AI 助寫、反饋看板）。

## 現有基礎（不需改動）

- ✅ 學生出缺勤記錄（點名+請假）
- ✅ 聯絡簿班級展開+成績連動+照片+AI弱點分析
- ✅ 家長星級評分+反饋
- ✅ LINE/Telegram 通知推播
- ✅ 帳務智慧收費+薪資連動+動態分類

---

## 功能 A：補課管理系統（全新）

### DB — `manage_makeup_classes`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID PK | |
| tenant_id | UUID FK → tenants | |
| student_id | UUID FK → manageStudents | 需補課的學生 |
| original_date | DATE | 原本缺課日期 |
| original_course_id | UUID | 原課程 |
| original_course_name | VARCHAR(100) | 原課程名稱（冗餘，方便顯示） |
| status | VARCHAR(20) | pending/scheduled/completed/cancelled |
| makeup_date | DATE | 補課日期 |
| makeup_time | VARCHAR(10) | 補課時間 HH:MM |
| makeup_end_time | VARCHAR(10) | 結束時間 |
| makeup_teacher_id | UUID FK → manageTeachers | 指派老師 |
| makeup_room | VARCHAR(50) | 地點 |
| notes | TEXT | 備註 |
| created_at | TIMESTAMP | |

### API

| Method | Endpoint | 功能 |
|--------|----------|------|
| GET | `/api/admin/makeup-classes` | 列出（可篩 status, studentId, month） |
| POST | `/api/admin/makeup-classes` | 新增待補課記錄 |
| PUT | `/api/admin/makeup-classes/:id` | 排定補課（填入日期/老師/地點） |
| PUT | `/api/admin/makeup-classes/:id/complete` | 標記完成 |
| DELETE | `/api/admin/makeup-classes/:id` | 取消 |

### 前端 — `/makeup-classes` 獨立頁面

- Sidebar「補課管理」（出席管理下方）
- 三個 Tab：待排定 / 已排定 / 已完成
- 統計卡片：待補課數 / 本月已完成
- 「排定補課」Modal：日期、時間、老師下拉、地點

---

## 功能 B：異常通知增強

### 學生曠課 → 自動通知家長

- 出缺勤頁面：點名儲存時，對 `absent` 學生自動觸發 LINE 通知
- 呼叫 `POST /api/notifications/send`（type: `absence_alert`）
- 前端加開關：「自動通知缺席學生家長」

### 教師曠職 → 通知老師+管理者

- 師資出缺勤頁面：標記 `absent` 時觸發通知
- 新增 notification scenario: `teacher_absence`

---

## 功能 C：AI 助寫助手

### 後端

- 新增 `POST /api/admin/contact-book/ai-writing`
- Body: `{ keywords: string, studentName?: string }`
- 呼叫 Gemini，prompt：將關鍵字轉為專業溫暖的家長對話（200字內）
- 回傳：`{ success: true, data: { text: string } }`

### 前端

- 聯絡簿 Modal 的 teacherNote/individualNote 欄位旁加「AI 助寫」按鈕
- 點擊彈出小 input：輸入關鍵字 → 呼叫 API → 回填文字
- Loading 狀態 + 可編輯結果

---

## 功能 D：家長反饋看板

### 後端

- 新增 `GET /api/admin/contact-book/feedback-stats`
- 回傳：平均評分、各星級分布、按課程/老師統計、近期反饋列表

### 前端

- 報表中心 `/reports` 頁面新增「家長反饋」區塊（或 Tab）
- 平均星級大數字卡片
- 近 30 天趨勢折線圖
- 按課程/老師的滿意度排行
- 最新反饋列表

---

## Demo 數據

- 補課假資料（5 筆不同 status）
- 反饋統計假資料
- AI 助寫 demo 回傳

## 設計決策

1. **補課用獨立表** — 不改 attendance 表，補課是獨立工作流
2. **異常通知用現有通知系統** — 只新增 scenario，不改架構
3. **AI 助寫複用 Gemini** — 跟弱點分析用同一個 AI 服務
4. **反饋看板放報表頁** — 不新建獨立頁面，利用現有報表框架
