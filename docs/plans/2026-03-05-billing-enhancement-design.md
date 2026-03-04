# 94Manage 帳務管理系統增強設計

## 目標

增強帳務管理系統的彈性與自動化：安親套餐計費、價格記憶後端持久化、團班月繳/堂繳雙軌。

## 現有基礎

| 功能 | 狀態 | 備註 |
|------|------|------|
| 三種課程計費 Tab（安親/團班/個指） | ✅ 已有 | billing/page.tsx |
| 價格記憶（localStorage） | ✅ 已有 | _helpers.ts |
| 遲繳三等級警示 | ✅ 已有 | critical/overdue/pending |
| 薪資三軌 + 課表連動 | ✅ 已有 | salary/ |
| 獎金/扣薪 + 考勤自動扣薪 | ✅ 已有 | adjustments |
| 勞健保 12 級級距 | ✅ 已有 | constants.ts |
| 雜項支出 + 動態分類 | ✅ 已有 | expenses/ |

## 增強區塊

### 區塊一：安親套餐系統

**DB Schema — `manage_daycare_packages`**

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID PK | |
| tenant_id | UUID FK → tenants | 租戶隔離 |
| branch_id | UUID FK → branches | nullable, null=全分校通用 |
| name | VARCHAR(100) | 套餐名稱（如「全方位套餐」） |
| services | TEXT[] | 包含服務（如 ['安親','課輔','餐食','才藝']） |
| price | DECIMAL(10,2) | 套餐價格 |
| description | TEXT | 備註 |
| is_active | BOOLEAN DEFAULT true | 啟用狀態 |
| created_at | TIMESTAMP | |

**API**

| Method | Endpoint | 功能 |
|--------|----------|------|
| GET | `/api/admin/billing/daycare-packages` | 列出套餐（可篩 branchId） |
| POST | `/api/admin/billing/daycare-packages` | 新增套餐 |
| PUT | `/api/admin/billing/daycare-packages/:id` | 更新套餐 |
| DELETE | `/api/admin/billing/daycare-packages/:id` | 刪除套餐 |

**前端 — 安親 Tab**

- 頂部「套餐模式 / 單點模式」切換
- 套餐模式：學生列表每行顯示下拉選套餐 → 帶入價格
- 單點模式：沿用現有月費邏輯（fee_monthly）
- 「管理套餐」按鈕 → Modal 做 CRUD

---

### 區塊二：價格記憶後端持久化

**DB Schema — `manage_price_memory`**

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID PK | |
| tenant_id | UUID FK → tenants | |
| course_id | VARCHAR(100) | 課程或套餐 ID |
| student_id | VARCHAR(100) | 學生 ID |
| amount | DECIMAL(10,2) | 上次收費金額 |
| payment_type | VARCHAR(20) | monthly/quarterly/semester/yearly/per_session/package |
| metadata | JSONB | 額外資訊（套餐名稱等） |
| updated_at | TIMESTAMP | |

UNIQUE(tenant_id, course_id, student_id)

**API**

| Method | Endpoint | 功能 |
|--------|----------|------|
| GET | `/api/admin/billing/price-memory?courseId=&studentIds=` | 批量查詢 |
| PUT | `/api/admin/billing/price-memory` | 批量更新（繳費時呼叫） |

**前端改動**

- `_helpers.ts` 改用 API 取代 localStorage
- 保留 localStorage 作為離線 fallback
- 繳費確認時同步寫入後端

---

### 區塊三：團班月繳/堂繳切換

**後端**

- 新增 `GET /api/admin/billing/session-count?courseId=&month=`
- 查詢指定課程在指定月份的實際排課堂數

**前端 — 團班 Tab**

- 頂部「月繳 / 堂繳」toggle
- 月繳：沿用 fee_monthly（支援季繳/學期繳/年繳折扣）
- 堂繳：fee_per_session × 當月實際堂數

---

### Demo 數據

- 套餐假資料（3 種套餐）
- 價格記憶 demo handler
- 堂數計算 demo handler

## 設計決策

1. **安親套餐用獨立表** — 不改 manageCourses，套餐是分校層級設定
2. **價格記憶用 UPSERT** — tenant+course+student 唯一，更新時 ON CONFLICT 覆蓋
3. **堂繳用排課 API 計算** — 不存冗餘數據，從 schedules 表即時查
4. **遲繳通知先做 Dashboard** — 不做外部推播，保持簡單
