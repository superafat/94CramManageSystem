# 94Manage 學生管理增強：QR Code 家長綁定 + 年級自動運算

## 目標

降低行政人員綁定家長的溝通成本，並自動化學生年級維護：QR Code 掃描即綁定、出生日期自動換算年級、9/1 自動升級。

## 現有基礎（不需改動 schema）

- ✅ 學生 CRUD `/api/admin/students`（manage_students 表）
- ✅ LINE 文字綁定「綁定 姓名 手機末4碼」（users.line_user_id）
- ✅ inclass_parents 表（studentId + lineUserId）
- ✅ parent_students 關聯表（DB 已存在）
- ✅ LINE Bot 互動（bot-gateway）

---

## 功能 A：DB Schema 變更

### 新表 — `manage_binding_tokens`（QR 綁定 Token）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID PK | |
| tenant_id | UUID FK → tenants | |
| student_id | UUID FK → manage_students | 被綁定的學生 |
| token | VARCHAR(64) UNIQUE | 隨機 token（crypto.randomBytes(32).toString('hex')） |
| expires_at | TIMESTAMP | 過期時間（null = 永久有效） |
| used_at | TIMESTAMP | 綁定成功的時間（null = 未使用） |
| used_by_line_id | VARCHAR(255) | 綁定的 LINE userId |
| created_at | TIMESTAMP | |

索引：`UNIQUE(token)`、`idx_binding_tokens_student(tenant_id, student_id)`

### 現有表增強 — `manage_students`

| 新增欄位 | 型別 | 說明 |
|----------|------|------|
| date_of_birth | DATE | 出生日期（nullable，雙軌並行） |

原有 `grade` 欄位保留。有 `date_of_birth` 時前端優先顯示自動計算結果，無則顯示手動 `grade`。

### 不動的表

- `users` — 現有 `line_user_id` 欄位已足夠
- `inclass_parents` — 現有 `lineUserId` + `studentId` 已足夠
- `parent_students` — 已存在的關聯表，不改

---

## 功能 B：API 端點

### QR 綁定 Token API（新）

| Method | Endpoint | 功能 |
|--------|----------|------|
| POST | `/api/admin/students/:id/binding-token` | 生成綁定 QR Token（body: `{ expiresIn: '7d' | '30d' | 'forever' }`） |
| GET | `/api/admin/students/:id/binding-token` | 查詢該學生目前有效的 token |
| DELETE | `/api/admin/students/:id/binding-token` | 作廢現有 token |

### 綁定執行 API（公開，不需登入）

| Method | Endpoint | 功能 |
|--------|----------|------|
| GET | `/api/bind/:token` | 驗證 token 有效性 → 回傳學生姓名供確認 |
| POST | `/api/bind/:token` | 執行綁定（body: `{ lineUserId }`） |

### 學生 API 增強

| Method | Endpoint | 功能 |
|--------|----------|------|
| GET | `/api/admin/students` | 增強：回傳 `computed_grade`（由 date_of_birth 計算） |
| PUT | `/api/admin/students/:id` | 增強：支援 `dateOfBirth` 欄位寫入 |
| GET | `/api/admin/students/grade-upgrade-preview` | 預覽 9/1 升級結果（不實際執行） |

### LINE Bot 增強（bot-gateway）

| 指令 | 功能 |
|------|------|
| 文字「切換」 | 列出已綁定的小孩，發送 LINE Flex Message 選單 |
| Postback `switch_child:{studentId}` | 切換當前活躍學生 |

---

## 功能 C：前端介面

### 學生詳情頁增強 — `/students/[id]`

- 新增「家長綁定」區塊：
  - 顯示 QR Code 圖片（前端用 `qrcode` 套件生成 SVG）
  - QR 下方顯示 token 狀態（有效/已過期/已使用）+ 綁定的 LINE 帳號
  - 「生成 QR Code」按鈕 → Modal 選擇時效（7天/30天/永久）→ 呼叫 POST API
  - 「列印 QR Code」按鈕 → `window.print()` 列印區域
  - 「作廢」按鈕 → DELETE API

### 學生表單增強 — 新增/編輯 Modal

- 新增「出生日期」date input
- 輸入出生日期後，下方即時顯示自動計算的年級（如「國中一年級」）
- 原有 `grade` 欄位：有生日時自動帶入唯讀，無生日時可手動編輯

### 學生列表頁增強 — `/students`

- 年級欄位改為顯示 `computed_grade`（API 回傳）
- 自動計算的年級旁顯示小標籤「自動」，手動的不顯示

---

## 功能 D：年級自動計算

### 計算邏輯（前後端共用 utility）

```typescript
function computeGrade(dateOfBirth: string, referenceDate?: Date): string
```

台灣學制規則（以 9 月 1 日為分界）：

| 年齡（足歲） | 學制 | 標籤 |
|--------------|------|------|
| 3 | 幼兒園 | 小班 |
| 4 | 幼兒園 | 中班 |
| 5 | 幼兒園 | 大班 |
| 6 | 國小 | 一年級 |
| 7 | 國小 | 二年級 |
| ... | ... | ... |
| 11 | 國小 | 六年級 |
| 12 | 國中 | 一年級 |
| 13 | 國中 | 二年級 |
| 14 | 國中 | 三年級 |
| 15 | 高中 | 一年級 |
| 16 | 高中 | 二年級 |
| 17 | 高中 | 三年級 |
| ≥18 | — | 已畢業 |

### 9/1 自動升級

- 不需要 cron job
- `computeGrade()` 每次呼叫時以「當前日期」為基準即時計算
- 9 月 1 日後自動反映新學年

---

## 功能 E：LINE Bot 多子切換

### 流程

```
家長輸入「切換」
    ↓
Bot 查詢 parent_students 關聯表（WHERE parent_id = user.id）
    ↓
取得所有綁定的學生列表
    ↓
發送 Flex Message 按鈕列表
    ↓
家長點擊某學生 → Postback switch_child:{studentId}
    ↓
Bot 更新 user session（記錄 active_student_id）
    ↓
後續查詢均以 active_student_id 為主
```

---

## Demo 數據

- 綁定 Token：3 筆 demo tokens（不同狀態：有效/已過期/已使用）
- 學生 dateOfBirth：demo 學生加上出生日期
- QR Code：前端直接生成 SVG（不需後端 demo）
- LINE Bot 切換：demo 回傳固定學生列表

## 設計決策

1. **QR = Token URL** — 不依賴 LIFF，純 URL + LINE 內建瀏覽器即可運作
2. **Token 可設定時效** — 7天/30天/永久，行政自選
3. **年級用即時計算** — 不存 computed_grade 到 DB，每次查詢時算，9/1 自動升級
4. **雙軌並行** — 有生日用自動算，沒生日用手動 grade，不強制遷移
5. **LINE Bot 切換** — 最輕量的多子管理，不新建家長 Web 前端
6. **前端 QR 生成** — 用 `qrcode` npm 套件在瀏覽器端生成 SVG，不需後端圖片 API
