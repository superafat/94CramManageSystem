# 94Platform 系統總後台設計

## 目標

建立 94cram.com 的系統總後台，讓平台擁有者（你）能集中管理所有訂閱補習班、財務收支、AI 配額、知識庫、安全監控等全平台事務。將散落在各子系統的總管功能統一搬移至此。

## 設計決策

1. **前端放在 Portal 內** — 在現有 `apps/portal` 加上 `/admin` 路由，94cram.com/admin 就是總後台。首頁維持行銷頁不動。
2. **後端程式碼獨立** — 新建 `apps/platform-backend`（Hono router），但部署時掛載在 manage-backend 的 `/api/platform/*` 路徑下（Sub-router 模式），零額外 Cloud Run 成本。
3. **日後可拆分** — 程式碼已隔離，營收起來後只需改 import 和部署設定即可拆成獨立 service。
4. **專屬登入頁** — `94cram.com/admin/login`，共用 users 表和 JWT 簽發，但登入時檢查 `role = 'superadmin'`，否則拒絕。
5. **搬移並刪除** — 總後台建好後，從 manage-dashboard 刪除 trials、analytics 等總管頁面，保持單一資訊來源。
6. **介面全中文** — 所有 UI 文字使用正體中文白話文，不用英文術語。

---

## 架構總覽

```
94cram.com (Portal — Next.js)
├── /                        ← 行銷首頁（不動）
├── /admin/login             ← 總後台登入
├── /admin                   ← 總覽儀表板
├── /admin/tenants           ← 補習班管理
├── /admin/accounts          ← 帳號審核
├── /admin/trials            ← 試用管理
├── /admin/finance           ← 財務管理
│   ├── /subscriptions       ← 收入總覽 + 收款紀錄
│   ├── /costs               ← 支出管理
│   └── /reports             ← 財務報表
├── /admin/knowledge         ← 全域知識庫
├── /admin/ai                ← AI 與 Bot 管理
├── /admin/analytics         ← 數據分析
├── /admin/security          ← 安全監控
└── /admin/settings          ← 平台設定
```

### 後端掛載

```
manage-backend app.ts:
  app.route('/api/platform', platformRoutes)  // 全部 SUPERADMIN only
```

Portal `next.config.ts` rewrites:
```
/api/platform/* → manage-backend Cloud Run URL
```

### 側邊欄（中文）

```
📊 總覽
🏫 補習班管理
👤 帳號審核
🎫 試用管理
💰 財務管理
  ├─ 收入總覽
  ├─ 收款紀錄
  ├─ 支出管理
  └─ 財務報表
📚 全域知識庫
🤖 AI 與 Bot 管理
📈 數據分析
🔒 安全監控
⚙️ 平台設定
```

---

## 登入流程

1. 進入 `94cram.com/admin/login`
2. 輸入 email + 密碼
3. 呼叫 `POST /api/platform/auth/login`
4. 後端驗證帳密 → 檢查 `role = 'superadmin'` → 否則回傳「無權限」
5. 簽發 JWT（共用現有 jose 簽發邏輯）
6. 前端存 cookie → 導向 `/admin`
7. `/admin/*` 所有頁面用 Next.js middleware 檢查 JWT + role

---

## 功能模組

### 1. 總覽儀表板 (`/admin`)

| 區塊 | 內容 |
|------|------|
| 補習班總數 | 使用中 / 試用中 / 已停用 |
| 本月收入 | 每月固定收入、較上月增減 |
| 本月支出 | 基礎設施 + AI 費用 |
| 本月毛利 | 收入 - 支出 |
| 待處理事項 | 待審核帳號數、試用申請數、逾期未付數 |
| 近 7 天趨勢 | 新註冊租戶、全站流量 |

### 2. 補習班管理 (`/admin/tenants`)

| 功能 | 說明 |
|------|------|
| 列表 | 所有租戶：名稱、方案、狀態、學生數、使用者數、建立日期 |
| 新增 | 建立新補習班 + 初始管理員帳號 |
| 編輯 | 修改名稱、slug、方案（免費/基本/專業/企業）、狀態 |
| 停用/啟用 | 停用後該租戶所有使用者無法登入 |
| 刪除 | 軟刪除（`deleted_at`），需二次確認 |
| 詳情頁 | 該租戶統計：學生數、老師數、課程數、AI 用量、Bot 綁定數 |
| 催繳提醒 | 一鍵發送催繳通知 |

**來源**：整合現有 `headquarters` + `tenants` 路由，權限從 ADMIN 收緊為 SUPERADMIN。

### 3. 帳號審核 (`/admin/accounts`)

- 跨租戶待審核帳號列表
- 審核通過 / 駁回
- 搜尋、按租戶篩選

**來源**：現有 `headquarters GET/POST /accounts` 路由。

### 4. 試用管理 (`/admin/trials`)

- 試用申請列表
- 審核通過（設定 30 天專業版）/ 駁回 / 撤銷
- 試用到期自動通知

**來源**：從 manage-dashboard `/dashboard/trials` 搬移，刪除原頁面。

### 5. 財務管理 (`/admin/finance`)

#### 5a. 收入總覽 + 收款紀錄 (`/admin/finance/subscriptions`)

| 功能 | 說明 |
|------|------|
| 方案定價表 | 管理各方案月費（免費=0 / 基本=500 / 專業=1500 / 企業=自訂） |
| 租戶訂閱狀態 | 全部租戶：方案、月費、付款狀態、到期日 |
| 收款紀錄 | 每筆收款：租戶、金額、日期、付款方式、發票號碼 |
| 新增收款 | 手動登記收款（轉帳確認後手動入帳） |
| 逾期警示 | 未付款超過 N 天的租戶列表，一鍵催繳 |
| 匯出報表 | 匯出月度/季度收入明細 CSV |

#### 5b. 支出管理 (`/admin/finance/costs`)

| 功能 | 說明 |
|------|------|
| GCP 成本追蹤 | Cloud Run 各 service 用量、Cloud SQL 連線時數 |
| AI 費用追蹤 | Gemini / Claude / MiniMax 各 provider 呼叫次數與費用 |
| 手動支出登記 | 域名續約、SSL、第三方服務費等固定支出 |
| 按租戶分攤 | 估算每個租戶的基礎設施成本佔比 |
| 月度成本報告 | 按類別彙總：基礎設施、AI、人工、其他 |

#### 5c. 財務報表 (`/admin/finance/reports`)

| 報表 | 說明 |
|------|------|
| 損益表 | 月度/季度收入項目 vs 支出項目 |
| 每月固定收入趨勢 | 新增、流失、淨變化 |
| 客戶累計貢獻 | 每個租戶的歷史總收入 |
| 方案轉換率 | 免費→基本→專業的升級/降級統計 |
| 應收帳款 | 未收款項彙總、帳齡分析（30/60/90天） |

### 6. 全域知識庫 (`/admin/knowledge`)

- 全域知識條目 CRUD（所有租戶共用的 FAQ、政策、教材）
- 標題、內容、分類標籤
- 區分「全域」vs「租戶專屬」
- Bot 全域記憶管理（bot-gateway `bot_memory_global` 的管理介面）

**來源**：manage-backend 現有 knowledge 路由 + bot-gateway 全域記憶。

### 7. AI 與 Bot 管理 (`/admin/ai`)

| 功能 | 說明 |
|------|------|
| AI 供應商狀態 | 各 provider 的啟用狀態、可用性 |
| 全平台 AI 用量 | 跨租戶彙總：今日/本週/本月呼叫次數與費用 |
| 按租戶用量 | 每個租戶的 AI 呼叫次數、Bot 訊息數 |
| 租戶配額設定 | 設定每個租戶的 AI 呼叫上限、Bot 綁定上限 |
| 訂閱方案管理 | 管理租戶的 Bot 訂閱方案（接管 bot-gateway `PUT /subscriptions`） |
| 速率/成本限制 | 設定各 provider 的速率限制和成本上限 |

**來源**：manage-backend `ai-providers` 路由 + bot-gateway 訂閱/設定 API。

**權限修正**：
- bot-gateway `PUT /subscriptions` 的 plan/limits 欄位改為只有 SUPERADMIN 能修改
- bot-gateway `PUT /settings` 的 `max_ai_calls`、`max_bindings` 改為 SUPERADMIN only

### 8. 數據分析 (`/admin/analytics`)

- 全站流量分析：PV/UV、頁面排行、流量來源
- AI 爬蟲統計：今日/本月、爬蟲分佈
- 跨租戶使用統計：各系統活躍度

**來源**：從 manage-dashboard `/dashboard/analytics` 搬移，刪除原頁面。

### 9. 安全監控 (`/admin/security`)

| 功能 | 說明 |
|------|------|
| 失敗登入紀錄 | 全平台的登入失敗記錄（IP、時間、嘗試帳號） |
| 封鎖 IP 列表 | 目前被封鎖的 IP 及原因 |
| 手動解鎖 | 解除 IP 封鎖 |

**來源**：從 inclass-backend `/security/*` 搬移，原端點改為 SUPERADMIN only。

### 10. 平台設定 (`/admin/settings`)

| 功能 | 說明 |
|------|------|
| 全域設定 | 預設方案、試用天數、全平台公告 |
| 方案定價 | 各方案的價格與功能清單 |
| Bot 排程監控 | 查看自動通知排程狀態 |
| 服務健康狀態 | 各 Cloud Run service 的健康檢查結果 |

---

## DB Schema 變更

### 新增表（`platform_` 前綴）

#### `platform_plan_pricing` — 方案定價

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID PK | |
| plan_key | VARCHAR(20) UNIQUE | free / basic / pro / enterprise |
| name | VARCHAR(50) | 免費版 / 基本版 / 專業版 / 企業版 |
| monthly_price | INTEGER | 月費（新台幣），免費版 = 0 |
| features | JSONB | 功能清單 `{ maxStudents, maxAiCalls, ... }` |
| is_active | BOOLEAN | 是否開放選用 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `platform_payments` — 收款紀錄

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID PK | |
| tenant_id | UUID FK → tenants | 付款的補習班 |
| amount | INTEGER | 金額（新台幣） |
| paid_at | DATE | 付款日期 |
| method | VARCHAR(20) | 付款方式：transfer / cash / other |
| invoice_no | VARCHAR(50) | 發票/收據號碼（nullable） |
| period_start | DATE | 帳期起始 |
| period_end | DATE | 帳期結束 |
| notes | TEXT | 備註 |
| created_at | TIMESTAMP | |

索引：`idx_payments_tenant(tenant_id)`、`idx_payments_paid_at(paid_at)`

#### `platform_costs` — 支出紀錄

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID PK | |
| category | VARCHAR(20) | infra / ai / domain / labor / other |
| subcategory | VARCHAR(50) | cloud-run / cloud-sql / gemini / claude 等 |
| amount | INTEGER | 金額（新台幣） |
| date | DATE | 支出日期 |
| description | TEXT | 說明 |
| is_recurring | BOOLEAN | 是否為每月固定支出 |
| created_at | TIMESTAMP | |

索引：`idx_costs_date(date)`、`idx_costs_category(category)`

#### `platform_settings` — 平台全域設定

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID PK | |
| key | VARCHAR(100) UNIQUE | 設定鍵名 |
| value | JSONB | 設定值 |
| updated_at | TIMESTAMP | |

### 現有表修改

#### `tenants` 表增強

| 新增欄位 | 型別 | 說明 |
|----------|------|------|
| plan | VARCHAR(20) DEFAULT 'free' | 訂閱方案（若不存在則新增） |
| deleted_at | TIMESTAMP | 軟刪除時間 |
| suspended_reason | TEXT | 停用原因 |
| last_payment_at | DATE | 最近付款日期 |
| payment_due_at | DATE | 下次付款截止日 |

---

## API 端點

### 平台認證

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | `/api/platform/auth/login` | 登入（檢查 superadmin） |
| POST | `/api/platform/auth/logout` | 登出 |
| GET | `/api/platform/auth/me` | 取得目前使用者資訊 |

### 總覽

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/platform/dashboard` | 總覽數據（租戶統計、收支、待處理） |

### 補習班管理

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/platform/tenants` | 租戶列表（支援篩選、搜尋、分頁） |
| POST | `/api/platform/tenants` | 新增租戶 + 初始管理員 |
| GET | `/api/platform/tenants/:id` | 租戶詳情 + 統計 |
| PUT | `/api/platform/tenants/:id` | 編輯租戶 |
| DELETE | `/api/platform/tenants/:id` | 軟刪除租戶 |
| POST | `/api/platform/tenants/:id/suspend` | 停用租戶 |
| POST | `/api/platform/tenants/:id/activate` | 啟用租戶 |
| POST | `/api/platform/tenants/:id/remind` | 催繳提醒 |

### 帳號審核

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/platform/accounts` | 待審核帳號列表 |
| POST | `/api/platform/accounts/:id/approve` | 通過 |
| POST | `/api/platform/accounts/:id/reject` | 駁回 |

### 試用管理

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/platform/trials` | 試用列表 |
| GET | `/api/platform/trials/:tenantId` | 試用詳情 |
| POST | `/api/platform/trials/:tenantId/approve` | 通過 |
| POST | `/api/platform/trials/:tenantId/reject` | 駁回 |
| POST | `/api/platform/trials/:tenantId/revoke` | 撤銷 |

### 財務管理

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/platform/finance/overview` | 財務總覽（收入/支出/毛利） |
| GET | `/api/platform/finance/pricing` | 方案定價列表 |
| PUT | `/api/platform/finance/pricing/:id` | 修改定價 |
| GET | `/api/platform/finance/payments` | 收款紀錄（支援篩選、分頁） |
| POST | `/api/platform/finance/payments` | 新增收款 |
| PUT | `/api/platform/finance/payments/:id` | 修改收款 |
| DELETE | `/api/platform/finance/payments/:id` | 刪除收款 |
| GET | `/api/platform/finance/costs` | 支出紀錄 |
| POST | `/api/platform/finance/costs` | 新增支出 |
| PUT | `/api/platform/finance/costs/:id` | 修改支出 |
| DELETE | `/api/platform/finance/costs/:id` | 刪除支出 |
| GET | `/api/platform/finance/reports/pnl` | 損益表 |
| GET | `/api/platform/finance/reports/mrr` | 每月固定收入趨勢 |
| GET | `/api/platform/finance/reports/receivables` | 應收帳款 |
| GET | `/api/platform/finance/reports/export` | 匯出 CSV |

### 知識庫

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/platform/knowledge` | 全域知識列表 |
| POST | `/api/platform/knowledge` | 新增知識條目 |
| PUT | `/api/platform/knowledge/:id` | 編輯 |
| DELETE | `/api/platform/knowledge/:id` | 刪除 |
| GET | `/api/platform/knowledge/bot-memory` | Bot 全域記憶列表 |
| POST | `/api/platform/knowledge/bot-memory` | 新增全域記憶 |
| DELETE | `/api/platform/knowledge/bot-memory/:id` | 刪除全域記憶 |

### AI 與 Bot 管理

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/platform/ai/providers` | AI 供應商狀態 |
| GET | `/api/platform/ai/usage` | 全平台 AI 用量彙總 |
| GET | `/api/platform/ai/usage/:tenantId` | 單一租戶 AI 用量 |
| POST | `/api/platform/ai/quota/limits` | 設定速率/成本限制 |
| GET | `/api/platform/ai/subscriptions` | 全部租戶 Bot 訂閱列表 |
| PUT | `/api/platform/ai/subscriptions/:tenantId` | 修改租戶方案與配額 |

### 數據分析

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/platform/analytics/overview` | 流量總覽 |
| GET | `/api/platform/analytics/pages` | 頁面排行 |
| GET | `/api/platform/analytics/referrers` | 流量來源 |
| GET | `/api/platform/analytics/bots` | 爬蟲統計 |

### 安全監控

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/platform/security/failed-logins` | 失敗登入紀錄 |
| GET | `/api/platform/security/blocked-ips` | 封鎖 IP |
| DELETE | `/api/platform/security/blocked-ips/:ip` | 解除封鎖 |

### 平台設定

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/platform/settings` | 全域設定 |
| PUT | `/api/platform/settings` | 更新設定 |
| GET | `/api/platform/health` | 各 service 健康狀態 |

---

## 跨系統權限修正

### manage-backend

- `tenants` 路由：`requireRole(ADMIN)` → `requireRole(SUPERADMIN)`
- `trials` 路由：同上
- `headquarters` 路由：已是 SUPERADMIN，不動
- `analytics` 路由：已是 SUPERADMIN，不動

### inclass-backend

- `/security/failed-logins`：加 `requireRole(SUPERADMIN)`
- `/security/blocked-ips`：加 `requireRole(SUPERADMIN)`

### bot-gateway

- `PUT /subscriptions`：plan / limits 欄位改為 SUPERADMIN only
- `PUT /settings`：`max_ai_calls`、`max_bindings` 改為 SUPERADMIN only

### stock-backend

- `POST /register`：新租戶建立後預設 `status: 'pending'`，需總後台審核才啟用

---

## 從 manage-dashboard 搬移並刪除的頁面

| 原頁面 | 搬移至 | 處理 |
|--------|--------|------|
| `/dashboard/trials` | `/admin/trials` | 刪除原頁面 + 側邊欄連結 |
| `/dashboard/analytics` | `/admin/analytics` | 刪除原頁面 + 側邊欄連結 |
| headquarters 相關功能 | `/admin/tenants` + `/admin/accounts` | 整合至總後台 |

---

## 前端技術

- 框架：Next.js（與 Portal 共用）
- 樣式：Tailwind CSS 莫蘭迪色系（與其他 dashboard 一致）
- 圖表：`recharts`（與 manage-dashboard 一致）
- 表格：手刻 table + 分頁（與現有風格一致）
- 認證：cookie-based JWT + Next.js middleware

---

## Demo 模式

- 總後台也支援 demo 模式（不連真實 DB）
- `/api/platform/*` 的 demo handler 回傳假資料
- 方便展示和開發測試
