# Phase 4-5-6 執行規劃書
> 2026-02-22 | 姜子牙擬 | 老闆核可後派工執行

---

## 現況審查（Phase 0~3 完成後）

### ✅ 完成
- Monorepo `94CramManageSystem`：420 files, 7 apps, 4 packages
- GCP `cram94-manage-system`：Cloud SQL + SA + Registry + Secrets
- CI/CD：3 workflows (stock/manage/inclass)
- 全部 push 到 GitHub

### ⚠️ 審查發現的問題（Phase 4 必須解決）
1. **JWT 三套實作**：manage 用 `jose`、inclass 用 `jose`(寫法不同)、stock 用 `hono/jwt`、shared 用 `jsonwebtoken` → **四種 JWT library，互不相容**
2. **DB driver 不一致**：manage/stock 用 `postgres`(postgres.js)、inclass 用 `pg`(node-postgres) → 連線方式不同
3. **JWT payload 格式不統一**：manage 有 `tenantId`+`permissions`+`role`，inclass 有 `schoolId`+`userId`，stock 有 `tenantId`+`role`
4. **各 backend 各自讀 DB schema**：沒有使用 `@94cram/shared` 的 schema
5. **pnpm install 未執行**：monorepo 還沒跑過安裝

---

## Phase 4：SSO + 跨系統整合

### 4.1 統一 JWT Auth（最關鍵）
**目標**：三系統用同一套 JWT → 登入一次，三系統通用

**做法**：
- 統一用 `jose` library（已是 manage/inclass 的選擇，效能好）
- 修改 `packages/shared/src/auth/jwt.ts`：改用 `jose` 取代 `jsonwebtoken`
- 統一 JWT Payload：
  ```ts
  {
    sub: userId,       // 標準 claim
    tenantId: string,
    email: string,
    name: string,
    role: 'admin' | 'teacher' | 'staff' | 'parent' | 'student',
    systems: ['manage', 'inclass', 'stock'],  // 授權系統
    iat: number,
    exp: number
  }
  ```
- 三個 backend 的 `middleware/auth.ts` 全部改為 import `@94cram/shared/auth`
- Cookie domain: `.94cram.app`

### 4.2 統一 DB 連線
**目標**：三系統用相同的 DB driver + 連線方式

**做法**：
- 統一用 `postgres`(postgres.js) — manage/stock 已在用
- 修改 `packages/shared/src/db/connection.ts`：提供 `createDB()` factory
- 三個 backend 的 `db/index.ts` 改為 import `@94cram/shared/db`
- inclass-backend 需從 `pg` 遷至 `postgres`

### 4.3 跨系統內部 API
**目標**：系統間可安全呼叫彼此

**做法**：
- 每個 backend 加 `/api/internal/*` 路由
- 認證用 `X-Internal-Key` header（值存在 Secret Manager `INTERNAL_API_KEY`）
- `@94cram/shared` 提供 `internalFetch()` helper
- 場景：
  - 94Stock 查詢 94Manage 的學生清單
  - 94inClass 出勤資料回流 94Manage 報表

### 4.4 Dashboard 跨系統導航
- 每個 dashboard sidebar 底部加「切換系統」按鈕
- 連結指向其他系統的 URL

### 4.5 執行順序
1. 先跑 `pnpm install`（之前沒跑）
2. 修 `packages/shared/auth` → jose + 統一 payload
3. 修 `packages/shared/db` → postgres.js + factory
4. manage-backend 改接 shared auth + db
5. stock-backend 改接 shared auth + db
6. inclass-backend 改接 shared auth + db（最大改動：pg → postgres.js）
7. 加 `/api/internal/*` 路由
8. 各 dashboard 加跨系統連結
9. 本地測試 → commit → push

---

## Phase 5：94Portal 統一入口

### 設計
- `apps/portal`：Next.js 輕量 app
- **首頁**：登入畫面（94cram.app 主域）
- **登入後**：顯示系統圖標選擇器（根據帳號的 `systems` 權限）
- **圖標**：
  - 📚 94Manage（學員管理）
  - ✋ 94inClass（點名系統）
  - 📦 94Stock（庫存管理）
- 點擊後跳轉到對應子系統（帶 JWT cookie）
- 莫蘭迪色系 + 動物森友會風格

### 技術
- Dockerfile + `deploy-portal.yml`
- Cloud Run service: `94portal`
- DNS: `94cram.app` → portal, `manage.94cram.app` → manage-dashboard, etc.

### 執行順序
1. 建 `apps/portal` 骨架（Next.js + Tailwind）
2. 登入 API（用 shared auth）
3. 系統選擇頁面
4. Dockerfile + workflow
5. 部署 + DNS

---

## Phase 6：收尾

### 6.1 資料遷移
- `pg_dump` 舊 94Manage（`94-ai-homework` Cloud SQL `fengshen-db`）
- `pg_dump` 舊 94inClass（`cch-ai-homework` Cloud SQL `fengshen-db`）
- 轉換 table names → `manage_`/`inclass_` prefix
- Import 到新 `94platform` DB

### 6.2 DNS 切換
- `94cram.app` → Portal
- `manage.94cram.app` → manage-dashboard
- `inclass.94cram.app` → inclass-dashboard
- `stock.94cram.app` → stock-dashboard
- `api-manage.94cram.app` → manage-backend
- `api-inclass.94cram.app` → inclass-backend
- `api-stock.94cram.app` → stock-backend

### 6.3 舊系統下線
- 確認新系統正常運作 1 週
- Archive 舊 GitHub repos（94Manage, 94inClass, 94Stock）
- 關閉舊 GCP Projects（`94-ai-homework`, `cch-ai-homework`）

### 6.4 Billing Alert
- 設定 $5 USD/月 預算警報

### 6.5 文件更新
- README.md
- MEMORY.md
- 規劃書標記完成

---

## 派工策略

| Phase | 執行者 | 模型 | 預估時間 |
|-------|--------|------|---------|
| 4.1-4.3 | 子代理（coding） | MiniMax M2.5 | 2-3 小時 |
| 4.4 | 子代理（coding） | MiniMax M2.5 | 30 分 |
| 5 | 子代理（coding） | MiniMax M2.5 | 1-2 小時 |
| 6.1 | 姜子牙本機 | N/A（gcloud + psql） | 30 分 |
| 6.2 | 姜子牙本機 | N/A（gcloud domains） | 15 分 |
| 6.3-6.5 | 姜子牙 | N/A | 15 分 |

**總預估**：4-6 小時（可分日執行）

---

**等老闆確認後開始執行。**
