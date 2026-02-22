# Phase 4 Task: SSO 統一 + 跨系統整合

你是 94CramManageSystem monorepo 的工程師。以下是你的任務。

## 專案路徑
`/Users/dali/Github/94CramManageSystem`

## 背景
monorepo 有 3 個 backend（manage/inclass/stock），目前各自使用不同的 JWT library 和 DB driver。你需要統一它們。

## 任務清單（按順序執行）

### Task 1: 統一 packages/shared/src/auth（JWT）

**目標**：改用 `jose` library，取代現有的 `jsonwebtoken`

1. 修改 `packages/shared/src/auth/jwt.ts`：
   - 用 `jose`（`jwtVerify`, `SignJWT`）取代 `jsonwebtoken`
   - 保留現有 interface `JWTPayload`，加上 `sub` field 對應 userId
   - `sign()` 用 `new SignJWT().setProtectedHeader({alg:'HS256'}).setExpirationTime('7d').sign()`
   - `verify()` 用 `jwtVerify(token, secret)`
   - secret 用 `new TextEncoder().encode(process.env.JWT_SECRET)`

2. 修改 `packages/shared/src/auth/middleware.ts`：
   - 提供 Hono middleware factory：`createAuthMiddleware()`
   - 從 Bearer header 提取 token → verify → 設 context variables
   - Context variables: `userId`, `tenantId`, `email`, `name`, `role`, `systems`
   - 提供 `createInternalKeyMiddleware()` 檢查 `X-Internal-Key` header

3. 修改 `packages/shared/package.json`：
   - dependencies 移除 `jsonwebtoken`、`@types/jsonwebtoken`
   - dependencies 加入 `jose: "^6.0.0"`
   - dependencies 把 `pg` 換成 `postgres: "^3.4.0"`（Task 2 會用）
   - devDependencies 移除 `@types/pg`

### Task 2: 統一 packages/shared/src/db（DB 連線）

**目標**：改用 `postgres`（postgres.js），取代現有的 `pg`（node-postgres）

1. 修改 `packages/shared/src/db/connection.ts`：
   - 用 `postgres` 取代 `pg`
   - 提供 `createDbConnection(url?: string)` factory，回傳 drizzle instance
   - 支援 Cloud SQL unix socket（parse `?host=/cloudsql/...`）
   - import 從 `drizzle-orm/postgres-js` 取代 `drizzle-orm/node-postgres`
   - re-export `pgTable` 等 column helpers 從 `drizzle-orm/pg-core`

### Task 3: 三個 backend 改接 shared

#### 3a. manage-backend
- `apps/manage-backend/src/middleware/auth.ts`：改為 import `@94cram/shared/auth` 的 `createAuthMiddleware`，但保留現有的 RBAC 邏輯（`getUserPermissions`, `requireRole` 等），只替換 JWT verify 部分
- `apps/manage-backend/src/db/index.ts`：改為 import `@94cram/shared/db` 的 `createDbConnection`，保留 metrics 邏輯
- `apps/manage-backend/package.json`：加 `"@94cram/shared": "workspace:*"` dependency（如果還沒有的話）

#### 3b. stock-backend
- `apps/stock-backend/src/middleware/auth.ts`：改為 import `@94cram/shared/auth` 的 `createAuthMiddleware`
- `apps/stock-backend/src/db/index.ts`：改為使用 `@94cram/shared/db` 的 `createDbConnection`，保留 metrics
- 移除 `hono/jwt` import

#### 3c. inclass-backend（最大改動）
- `apps/inclass-backend/src/middleware/auth.ts`：改用 shared auth，注意 inclass 用 `schoolId` 對應 `tenantId`，需做 mapping
- `apps/inclass-backend/src/db/index.ts`：從 `pg` (node-postgres) 改為 `postgres` (postgres.js)，用 shared 的 `createDbConnection`
- `apps/inclass-backend/package.json`：移除 `pg`，確保有 `@94cram/shared`
- ⚠️ inclass 的 schema 用 `schools` 表而非 `tenants`，先保留不改名（Phase 6 再處理資料遷移）

### Task 4: 跨系統內部 API

1. `packages/shared/src/utils/internal-api.ts`（新建）：
   ```ts
   // Internal API helper
   const SERVICE_URLS: Record<string, string> = {
     manage: process.env.MANAGE_API_URL || 'http://localhost:3100',
     inclass: process.env.INCLASS_API_URL || 'http://localhost:3102',
     stock: process.env.STOCK_API_URL || 'http://localhost:3101',
   };
   
   export async function internalFetch(service: string, path: string, options?: RequestInit) {
     const baseUrl = SERVICE_URLS[service];
     const url = `${baseUrl}/api/internal${path}`;
     const res = await fetch(url, {
       ...options,
       headers: {
         ...options?.headers,
         'X-Internal-Key': process.env.INTERNAL_API_KEY || '',
         'Content-Type': 'application/json',
       },
     });
     if (!res.ok) throw new Error(`Internal API ${service}${path}: ${res.status}`);
     return res.json();
   }
   ```

2. 每個 backend 加 `/api/internal/health` 路由：
   - manage-backend: `src/routes/internal.ts`
   - inclass-backend: `src/routes/internal.ts`
   - stock-backend: `src/routes/internal.ts`
   - 用 `createInternalKeyMiddleware()` 保護
   - 回傳 `{ service: "94manage", status: "ok", timestamp: Date.now() }`

3. 更新 `packages/shared/src/index.ts` 加入 utils export

### Task 5: Dashboard 跨系統導航

在每個 dashboard 建立一個 `SystemSwitcher` component：
- `packages/shared/src/components/SystemSwitcher.tsx`（不要，各 dashboard 技術不同）
- 改成：每個 dashboard 自己加一個 `SystemSwitcher` component
  - manage-dashboard: `src/components/SystemSwitcher.tsx`
  - inclass-dashboard: `src/components/SystemSwitcher.tsx`
  - stock-dashboard: `src/components/SystemSwitcher.tsx`
- 內容：三個按鈕（📚 學員管理 / ✋ 點名系統 / 📦 庫存管理），連到對應 URL
- URL 用環境變數：`NEXT_PUBLIC_MANAGE_URL`, `NEXT_PUBLIC_INCLASS_URL`, `NEXT_PUBLIC_STOCK_URL`
- 預設 localhost 開發 URL
- 莫蘭迪色系配色（柔和灰綠 #A8B5A2, 柔和灰粉 #C4A9A1, 柔和灰藍 #9CADB7）

## 完成後
1. `cd /Users/dali/Github/94CramManageSystem`
2. `pnpm install`
3. `pnpm typecheck`（盡量修到 0 errors，但如果原有代碼就有 error 不必管）
4. `git add -A && git commit -m "Phase 4: SSO + shared auth/db + internal API + system switcher"`
5. `git push origin main`

## 鐵律
- 不刪不改現有業務邏輯，只替換 auth 和 db 基礎設施
- 保留各 backend 的 metrics、error handling、RBAC 等現有邏輯
- 如果某個檔案改動會太大，可以保留舊的 auth 作為 fallback import
- inclass 的 `schoolId` 暫時 alias 到 `tenantId`
