# 94CramManageSystem — 整合修復任務

## 背景

這是一個 pnpm monorepo，包含三個補習班管理系統 + 一個統一入口：

- **94Manage** (manage-backend:3100, manage-dashboard:3200) — 學員管理
- **94inClass** (inclass-backend:3102, inclass-dashboard:3201) — 點名系統
- **94Stock** (stock-backend:3101, stock-dashboard:3000) — 庫存管理
- **94Portal** (portal:3300) — 統一入口，導向三個系統

## 任務一：修復所有 TypeScript 錯誤

### 已知錯誤（manage-backend）

```
src/routes/health.ts(81,19): error TS2554: Expected 2-3 arguments, but got 1.
src/services/notification-scenarios.ts(87,43): error TS2344: Type 'T' does not satisfy the constraint 'readonly any[]'.
src/services/notification-scenarios.ts(88,43): error TS2322
src/services/notification.ts(198,58): error TS2345: 
  'string | null' is not assignable to 'string | undefined'
  → lineUserId 欄位在 DB 是 null，但函數期望 undefined
```

### 修復策略

1. `health.ts(81)`: 補上缺少的參數，或修正函數呼叫
2. `notification-scenarios.ts(87-88)`: 加上 `extends readonly any[]` 型別約束，或改寫成 `as unknown as T`
3. `notification.ts(198)`: 將 `lineUserId: string | null` 轉換為 `lineUserId: user.lineUserId ?? undefined`
4. 掃描其他所有 apps 確認沒有隱藏錯誤

執行 `pnpm typecheck` 直到全部通過。

---

## 任務二：四個系統互相串連整合

### 問題診斷

每個系統都有 `SystemSwitcher.tsx` 導覽條，但：
1. **沒有 .env 檔案**（manage-dashboard、inclass-dashboard 都沒有 .env.local）
2. **SystemSwitcher 的 URL 都用 localhost**（應該讀取 NEXT_PUBLIC_* 環境變數）
3. **沒有 SSO 共享 token**（各系統各自登入，無法跨系統保持登入狀態）
4. **Portal** 的環境變數用的是 `MANAGE_URL`（沒有 `NEXT_PUBLIC_` 前綴），但 portal 是 server-side 渲染，這樣可以

### 需要做的事

#### A. 為各 dashboard 建立 .env.local（本機開發用）

```
# apps/manage-dashboard/.env.local
NEXT_PUBLIC_API_BASE=http://localhost:3100
NEXT_PUBLIC_MANAGE_URL=http://localhost:3200
NEXT_PUBLIC_INCLASS_URL=http://localhost:3201
NEXT_PUBLIC_STOCK_URL=http://localhost:3000

# apps/inclass-dashboard/.env.local
NEXT_PUBLIC_API_BASE=http://localhost:3102
NEXT_PUBLIC_MANAGE_URL=http://localhost:3200
NEXT_PUBLIC_INCLASS_URL=http://localhost:3201
NEXT_PUBLIC_STOCK_URL=http://localhost:3000

# apps/stock-dashboard/.env.local
NEXT_PUBLIC_API_BASE=http://localhost:3101
NEXT_PUBLIC_MANAGE_URL=http://localhost:3200
NEXT_PUBLIC_INCLASS_URL=http://localhost:3201
NEXT_PUBLIC_STOCK_URL=http://localhost:3000
```

#### B. 為各 dashboard 建立 .env.production（Cloud Run 用）

```
# apps/manage-dashboard/.env.production
NEXT_PUBLIC_API_BASE=https://cram94-manage-backend-1015149159553.asia-east1.run.app
NEXT_PUBLIC_MANAGE_URL=https://cram94-manage-dashboard-1015149159553.asia-east1.run.app
NEXT_PUBLIC_INCLASS_URL=https://cram94-inclass-dashboard-1015149159553.asia-east1.run.app
NEXT_PUBLIC_STOCK_URL=https://cram94-stock-dashboard-1015149159553.asia-east1.run.app

# apps/inclass-dashboard/.env.production
NEXT_PUBLIC_API_BASE=https://cram94-inclass-backend-1015149159553.asia-east1.run.app
NEXT_PUBLIC_MANAGE_URL=https://cram94-manage-dashboard-1015149159553.asia-east1.run.app
NEXT_PUBLIC_INCLASS_URL=https://cram94-inclass-dashboard-1015149159553.asia-east1.run.app
NEXT_PUBLIC_STOCK_URL=https://cram94-stock-dashboard-1015149159553.asia-east1.run.app

# apps/stock-dashboard/.env.production
NEXT_PUBLIC_API_BASE=https://cram94-stock-backend-1015149159553.asia-east1.run.app
NEXT_PUBLIC_MANAGE_URL=https://cram94-manage-dashboard-1015149159553.asia-east1.run.app
NEXT_PUBLIC_INCLASS_URL=https://cram94-inclass-dashboard-1015149159553.asia-east1.run.app
NEXT_PUBLIC_STOCK_URL=https://cram94-stock-dashboard-1015149159553.asia-east1.run.app
```

#### C. 修正 manage-dashboard 的 API_BASE 預設值

`apps/manage-dashboard/src/lib/api.ts` 第一行：
```typescript
// 現在：const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api'
// 改為：
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3100'
```
（`/api` 是相對路徑，在 Next.js 中表示自己的 `/api` route，不是 backend 的 API）

#### D. 修正 inclass-dashboard 的 API_BASE

`apps/inclass-dashboard/src/contexts/AuthContext.tsx`：
```typescript
// 現在：NEXT_PUBLIC_API_BASE || 'https://cram94-inclass-backend-...'
// 改為（本機開發友善）：
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3102'
```

也要掃描 inclass-dashboard 其他地方有沒有 hardcode production URL 的情況，統一用 `process.env.NEXT_PUBLIC_API_BASE` 讀取。

#### E. 確認各 backend 有 CORS 設定（允許跨來源請求）

掃描 manage-backend、inclass-backend、stock-backend 的 CORS 設定：
- 應該允許 localhost:3200、3201、3000、3300（開發）
- 應該允許 *.asia-east1.run.app（生產）
- 如果沒有 CORS 設定，加上

---

## 任務三：確保每個按鍵功能都正常、API 都有正確串好

### A. 驗證各 dashboard 的關鍵功能

**manage-dashboard** — 逐一確認：
- [ ] 登入 / 登出
- [ ] 學員列表頁（`/dashboard` 或 `/students`）— API: `GET /api/admin/students`
- [ ] SystemSwitcher 三個按鈕的 URL 是否正確

**inclass-dashboard** — 逐一確認：
- [ ] 登入 / 登出 (`POST /api/auth/login`)
- [ ] 學生列表 (`GET /api/students`)
- [ ] 點名功能 (`POST /api/attendance/checkin`)
- [ ] SystemSwitcher 三個按鈕的 URL 是否正確

**stock-dashboard** — 逐一確認：
- [ ] 登入 / 登出
- [ ] 商品列表 API 是否正確串
- [ ] SystemSwitcher 三個按鈕的 URL 是否正確

**portal** — 逐一確認：
- [ ] 三個系統卡片按鈕是否指向正確的 URL（.env.production 裡的）
- [ ] 導覽到各系統後，登入頁是否能正常使用

### B. 確認各 backend API 的 health endpoint

```bash
# 本機驗證（需要先跑各 backend）
curl http://localhost:3100/api/health
curl http://localhost:3102/api/health
curl http://localhost:3101/api/health
```

### C. 修正 manage-backend health.ts 的 TS 錯誤

這是任務一發現的問題，確保 health endpoint 可以正常使用。

---

## 任務四：整合驗證清單

完成以上修復後，執行：

```bash
# 1. 全部 TypeScript 檢查
pnpm typecheck

# 2. 確認 .env 檔案都建立了
ls apps/manage-dashboard/.env.local
ls apps/inclass-dashboard/.env.local
ls apps/stock-dashboard/.env.local
ls apps/manage-dashboard/.env.production
ls apps/inclass-dashboard/.env.production
ls apps/stock-dashboard/.env.production

# 3. Build 測試（確認不會因為缺少環境變數而 build 失敗）
pnpm build
```

---

## 完成條件

1. ✅ `pnpm typecheck` 全部通過，0 errors
2. ✅ 所有 dashboard 的 `.env.local` 和 `.env.production` 建立完成
3. ✅ manage-dashboard 的 API_BASE 預設值修正
4. ✅ inclass-dashboard 的 hardcode production URL 移除
5. ✅ 各 backend CORS 設定確認
6. ✅ SystemSwitcher URL 在所有三個 dashboard 正確指向對的系統
7. ✅ `pnpm build` 成功（或至少 typecheck 通過）

---

## 完成後通知

當所有任務完成後，執行：
```bash
openclaw system event --text "✅ 94CramManageSystem 整合修復完成：TypeScript 0 errors，四個系統串連 env 設定完畢，API 串接驗證完成，pnpm typecheck 全部通過。" --mode now
```
