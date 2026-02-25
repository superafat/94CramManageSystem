# 測試覆蓋率分析報告

> 分析日期：2026-02-25

## 總覽

| 指標 | 數值 |
|------|------|
| 原始碼檔案數 | ~221 個 .ts 檔 |
| 原始碼行數 | ~32,684 行 |
| 測試檔案數 | **5 個** |
| 測試程式碼行數 | **182 行** |
| 估計覆蓋率 | **< 2%** |

## 現有測試盤點

目前只有 **2 個區域** 有測試：

### 1. `packages/manage-errors`（2 個測試檔）
- `errors.test.ts` — Error class 建構與屬性驗證（11 個 error class）
- `middleware.test.ts` — Error handler middleware + asyncHandler

**評價**：✅ 品質不錯，覆蓋了 error class 和 middleware 的主要場景。

### 2. `apps/manage-backend`（3 個測試檔）
- `ai/__tests__/router.test.ts` — intent 分類與路由（8 個 case）
- `ai/__tests__/llm.integration.test.ts` — intent 分類 edge case（7 個 case）
- `db/__tests__/monitoring.test.ts` — DB 健康檢查與指標追蹤

**評價**：✅ AI router 測試充分；DB monitoring 測試實用。

---

## 完全沒有測試的關鍵區域（按優先序排列）

### P0 — 最高優先（安全性 & 核心業務邏輯）

#### 1. JWT 認證 (`packages/shared/src/auth/jwt.ts`)
- `sign()` / `verify()` / `decode()` — 三系統共用的核心認證
- **風險**：JWT 驗證邏輯有 bug 會影響所有三個系統
- **建議測試**：
  - sign → verify 完整流程
  - verify 缺少必要欄位時拋出錯誤
  - verify 過期 token 時拋出錯誤
  - decode 格式錯誤時回傳 null
  - 缺少 JWT_SECRET 時拋出明確錯誤

#### 2. Auth Middleware (`packages/shared/src/auth/middleware.ts`)
- `createAuthMiddleware()` — 統一認證中介層
- `createInternalKeyMiddleware()` — 內部 API 認證
- **風險**：認證繞過 = 全系統安全漏洞
- **建議測試**：
  - 無 token 時回傳 401
  - token 無效時回傳 401
  - skipPaths 正確跳過
  - OPTIONS preflight 正確處理
  - 驗證成功時 context 正確設置 userId/tenantId/role
  - Internal API key 不符時回傳 403

#### 3. RBAC 權限控制 (`apps/manage-backend/src/middleware/rbac.ts`)
- `getUserPermissions()` / `hasPermission()` / `hasRole()`
- `requireRole()` / `requirePermission()` / `requireAnyPermission()`
- **風險**：權限檢查錯誤 = 越權存取
- **建議測試**：
  - 每個 Role 的權限映射正確
  - superadmin bypass 正確運作
  - 無權限時拋出 403 HTTPException
  - customPermissions 合併邏輯
  - `isParentAccessingOwnChild()` 邏輯

#### 4. 密碼驗證 (`apps/manage-backend/src/routes/auth.ts`)
- `verifyPassword()` — 支援 bcrypt 和 legacy sha256+salt
- `timingSafeEqual()` — timing-safe 比較
- **風險**：密碼比對有誤 = 帳號被破解或無法登入
- **建議測試**：
  - bcrypt 密碼驗證
  - legacy sha256+salt 密碼驗證
  - 空密碼回傳 false
  - timing-safe 比較正確性

### P1 — 高優先（核心業務功能）

#### 5. Validation Middleware (`apps/manage-backend/src/middleware/validation.ts`)
- `validateRequest()` / `validateQuery()` / `validateParams()` / `validateAll()`
- **建議測試**：
  - 合法輸入通過驗證，validatedData 正確設置
  - Zod 驗證失敗時回傳 400 + 結構化錯誤訊息
  - 非 JSON body 時回傳 400
  - `formatZodError()` 格式正確

#### 6. 出席打卡 API (`apps/inclass-backend/src/routes/attendance.ts`)
- POST `/checkin` — NFC/人臉/手動打卡
- GET `/today` — 當日出席記錄
- **建議測試**（需 mock DB）：
  - NFC 卡查找學生 → 打卡成功
  - 學生不存在回傳 404
  - 當日重複打卡回傳 400
  - 無 classId 且無 active enrollment 回傳 400

#### 7. 庫存進出 API (`apps/stock-backend/src/routes/inventory.ts`)
- POST `/in` — 入庫
- POST `/out` — 出庫（含庫存不足檢查 + 低庫存警報）
- POST `/transfer` — 倉庫間調撥（原子事務）
- **建議測試**（需 mock DB）：
  - 入庫 → 庫存增加
  - 出庫 → 庫存減少
  - 庫存不足時出庫失敗
  - 調撥時來源倉庫 ≠ 目標倉庫
  - 低庫存警報觸發邏輯
  - barcode 查找 itemId

#### 8. 招生管理 API (`apps/manage-backend/src/routes/enrollment.ts`)
- 漏斗數據、轉換率統計、試聽預約、Lead 狀態更新
- **建議測試**：
  - 漏斗計算邏輯
  - 試聽日期必須為未來
  - Lead 狀態轉換
  - tenantId 隔離（跨 tenant 看不到資料）

### P2 — 中優先（跨系統整合 & Bot）

#### 9. Internal API (`packages/shared/src/utils/internal-api.ts`)
- `internalFetch()` — 跨系統 API 呼叫
- **建議測試**：
  - 正確拼接 URL 和 header
  - 未知 service 拋出錯誤
  - HTTP 錯誤時拋出帶狀態碼的錯誤

#### 10. Bot Gateway (`apps/bot-gateway/`)
- 24 個檔案、完全無測試
- intent router、command handlers、Firestore 操作
- **建議測試**：
  - intent 路由邏輯
  - bind/sync/switch 指令解析
  - rate-limit 工具函式

#### 11. Notification Services
- `apps/manage-backend/src/services/notification.ts`
- `apps/stock-backend/src/services/notifications.ts`
- `apps/inclass-backend/src/services/notification.ts`
- **建議測試**：通知訊息格式、發送條件邏輯

### P3 — 低優先（但仍建議）

#### 12. 前端 Dashboard 元件
- `manage-dashboard`、`inclass-dashboard`、`stock-dashboard`
- 目前零測試
- **建議**：至少為關鍵頁面加上 smoke test（能正常 render）

#### 13. Utility 函式
- `apps/manage-backend/src/utils/` — batch、i18n、markdown、logger 等
- `apps/inclass-backend/src/utils/date.ts`
- **建議**：純函式最容易測試，投入少回報高

---

## 建議的實施計畫

### 第一階段：基礎建設（1-2 天）
1. 在根目錄和各 app 設定 vitest 配置（共用 `vitest.workspace.ts`）
2. 在 `package.json` 加入統一的 `pnpm test` 指令
3. 在 CI/CD（GitHub Actions）加入測試步驟

### 第二階段：P0 安全性測試（2-3 天）
1. `packages/shared` — JWT sign/verify/decode 測試
2. `packages/shared` — Auth middleware 測試
3. `apps/manage-backend` — RBAC 權限測試
4. `apps/manage-backend` — 密碼驗證測試

### 第三階段：P1 核心業務測試（3-5 天）
1. Validation middleware 測試
2. Attendance API 測試（mock DB）
3. Inventory API 測試（mock DB）
4. Enrollment API 測試

### 第四階段：P2/P3 擴展（持續進行）
1. Bot gateway 測試
2. Internal API 測試
3. 前端 smoke test
4. Utility 函式測試

---

## 關鍵統計

| 區域 | 原始碼檔案 | 測試檔案 | 覆蓋率 |
|------|-----------|---------|--------|
| packages/shared | 14 | 0 | 0% |
| packages/manage-errors | 2+ | 2 | ~80% |
| apps/manage-backend | ~50 | 3 | ~5% |
| apps/inclass-backend | ~20 | 0 | 0% |
| apps/stock-backend | ~30 | 0 | 0% |
| apps/bot-gateway | ~24 | 0 | 0% |
| apps/manage-dashboard | ~30 | 0 | 0% |
| apps/inclass-dashboard | ~15 | 0 | 0% |
| apps/stock-dashboard | ~20 | 0 | 0% |
| apps/portal | ~5 | 0 | 0% |
| apps/manage-miniapp | ~15 | 0 | 0% |

**結論**：目前的測試覆蓋率極低（< 2%），最急迫需要補的是 **認證/授權** 相關的 P0 測試，因為這是三個系統共用的安全基礎。
