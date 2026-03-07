# 四系統合體與企業級 SSO 安全實作方案

> 日期：2026-03-07  
> 範圍：94Manage、94inClass、94Stock、94BOT、Portal Admin  
> 目標：在不破壞既有租戶隔離的前提下，完成四個業務系統的統一登入、統一授權、統一租戶上下文、統一審計與安全收斂。

---

## 1. 目標摘要

本方案要解決的不是只有「共用一張 users 表」，而是要把目前分散在各 app 的登入、session、tenant context、平台 admin 特例、bot 綁定與跨服務驗證，整合成一套可部署、可稽核、可漸進遷移的安全架構。

最終目標：

1. 同一個使用者帳號可在四個業務系統間單點登入。
2. 同一個 session 在同網域子站間自動生效，並能一致登出。
3. 所有 API 僅信任已驗證的 server-side token，不信任前端自行保存的權威狀態。
4. tenant、branch、system entitlement 由中央 auth 決定，不再由前端自行拼裝。
5. Portal Admin 與一般租戶使用者共享同一套身份核心，但採用更高等級的權限與風控。
6. 94BOT Dashboard 使用同一套 SSO；Telegram / LINE bot 則透過綁定關係映射至同一身份核心。

---

## 2. 已驗證的現況

目前系統已經具備一部分統一基礎：

1. `users`、`tenants`、`branches` 已存在於 shared schema，可作為統一身份核心。
2. `@94cram/shared/auth` 已提供共用 JWT 與 cookie helper。
3. 三個業務 backend 已能簽發共格式 JWT。
4. Dashboard proxy 已可從 cookie 取 token 並轉發到 backend。

但目前仍不是企業級 SSO，原因如下：

1. `manage-dashboard` 仍有自己查 DB、自己簽 JWT 的登入 route，未統一走 backend auth service。
2. `manage-dashboard`、`inclass-dashboard`、`stock-dashboard`、`bot-dashboard` 仍大量依賴 localStorage 保存 `user`、`tenantId`、`branchId`、甚至 `token`。
3. `Portal` 使用獨立的 `platform_token` cookie，且存在 client-side decode 與 middleware decode payload 的模式。
4. `systems` claim 已存在，但尚未成為真正的 audience / entitlement enforcement。
5. `94BOT` 的瀏覽器 dashboard 與 Telegram 綁定身份還是兩套概念，只是部分共用 tenant。

結論：

- 現況是 shared identity foundation。
- 不是 centralized auth。
- 更不是 enterprise SSO。

---

## 3. 設計原則

1. 單一身份來源：所有使用者資料以 shared `users` 為唯一真實來源。
2. 單一登入入口：所有瀏覽器登入一律走中央 auth service。
3. 單一 session 規則：access / refresh token 只由 auth service 簽發與輪替。
4. 前端不保存權威 token：前端最多保存非敏感 UI cache，不保存可作為最終授權依據的 token。
5. 顯式租戶界線：tenant 不可由前端 header 任意覆寫；只能由驗證後 token、明確切換流程或 server-side policy 決定。
6. 分層授權：身份、租戶、分校、系統、資源、操作權限分層處理。
7. 預設拒絕：任何 entitlement、token audience、internal key、service identity 缺失時一律 fail closed。
8. 可漸進遷移：新舊登入模式需可短暫共存，但新模式必須是唯一持續演進方向。

---

## 4. 目標架構

### 4.1 統一元件

新增一個中央身份服務：

- 建議名稱：`apps/auth-service` 或先由 `manage-backend` 中切出 `/api/auth/*` 作為唯一 issuer。
- 對外網域：`auth.94cram.com`
- 責任：
  - login
  - logout
  - refresh
  - me
  - Google OAuth / Firebase / 未來 MFA
  - session revoke
  - entitlement resolve
  - tenant switch
  - audit

所有前端站點：

- manage.94cram.com
- inclass.94cram.com
- stock.94cram.com
- bot.94cram.com
- portal.94cram.com

只做兩件事：

1. 把瀏覽器 cookie 帶到 auth / backend。
2. 透過 `GET /api/auth/me` 取得目前使用者 session 與 entitlements。

### 4.2 Session 模式

Cookie 方案：

- `cram94_access`
- `cram94_refresh`
- Domain=`.94cram.com`
- Path=`/`
- HttpOnly
- Secure
- SameSite=`Lax`

說明：

1. 只有中央 auth service 可以設定與清除這兩個 cookie。
2. 所有子站都能自動攜帶 cookie，形成真正跨子網域單點登入。
3. 現有 `token`、`refresh_token`、`platform_token` 視為過渡期相容項，最終要移除。

### 4.3 Token 內容

Access token 建議 claims：

```json
{
  "iss": "https://auth.94cram.com",
  "sub": "user-uuid",
  "sid": "session-uuid",
  "tenantId": "tenant-uuid",
  "branchId": "branch-uuid-or-null",
  "role": "admin",
  "entitlements": ["manage", "inclass", "stock", "bot"],
  "permissions": ["manage:students:read", "inclass:grades:write"],
  "amr": ["pwd", "google"],
  "iat": 0,
  "exp": 0,
  "jti": "token-uuid"
}
```

Refresh token 建議：

1. 帶 `sid` 與 `jti`。
2. 必須可 server-side revoke。
3. 每次 refresh 旋轉，舊 token 立即失效。

不再依賴：

1. 前端 localStorage token。
2. 僅 decode payload 判斷是否合法。
3. 以 `systems` claim 當裝飾資訊而不實際 enforcement。

### 4.4 授權模型

建議明確拆成五層：

1. Identity：user 本身。
2. Membership：user 屬於哪些 tenant。
3. Context：目前活躍 tenant / branch。
4. Entitlement：可進哪些系統，例如 `manage`、`inclass`、`stock`、`bot`、`platform`。
5. Permission：系統內細權限，例如 `students:read`、`grades:write`。

現有 `user_permissions` 可保留，但需補齊資料模型：

1. `user_tenant_memberships`
2. `user_branch_memberships`
3. `user_system_entitlements`
4. `sessions`
5. `session_devices`
6. `session_events`

---

## 5. 四個系統如何整合

### 5.1 94Manage

目標：

1. 移除 `manage-dashboard` 自行查 DB / 自行簽 JWT 的登入 route。
2. 改成直接呼叫中央 auth service。
3. `tenantId`、`branchId` 不再由 localStorage 主導；只做 UI cache。

必要調整：

1. `X-Tenant-Id` 不再由前端長期持有當權威來源。
2. 所有 manage API 根據 token 與 server-side tenant policy 判斷。
3. tenant 切換需走明確的 server-side endpoint，例如 `POST /api/auth/switch-tenant`。

### 5.2 94inClass

目標：

1. 移除 `localStorage token` 作為主要權威。
2. `AuthContext` 只負責呼叫 `me` 與 `logout`，不再自行保存可授權 token。
3. 成績、聯絡簿、報表頁面一律從 cookie session 恢復登入狀態。

必要調整：

1. `/api/auth/login`、`/api/auth/register` 最終統一收斂到中央 auth service。
2. `schoolId` 與 `tenantId` 命名要一致，避免 session 恢復出現雙語意。

### 5.3 94Stock

目標：

1. 保留與 shared users 整合，但不再單獨維護完整登入流程。
2. stock dashboard 僅透過 cookie session 與 `me` API 還原身分。
3. tenant setup 等特殊流程改為管理端或平台端受控操作。

必要調整：

1. 停用 browser 端自行保存 user 作為最終登入判斷。
2. 強化 stock entitlement 驗證，避免其他系統 token 被誤用。

### 5.4 94BOT Dashboard + Bot Gateway

Bot 分成兩層：

1. Bot Dashboard：人類管理者登入後操作後台。
2. Telegram / LINE Bot：終端使用者透過對話介面發指令。

整合策略：

1. Bot Dashboard 納入同一套 SSO，與 manage / inclass / stock 使用同一 session。
2. Bot Gateway 的 dashboard API 繼續驗證 shared JWT，但 JWT issuer 要統一為中央 auth service。
3. Telegram / LINE 綁定不視為獨立帳號系統，而是「外部通道綁定到中央 identity」。

新增模型建議：

1. `user_channel_bindings`
   - userId
   - channelType (`telegram`, `line`)
   - externalUserId
   - tenantId
   - verifiedAt
   - status

這樣 bot 的操作可直接映射回同一個 user / tenant / entitlement 模型。

### 5.5 Portal Admin

Portal 是最需要收斂的特例。

目標：

1. 廢除獨立的 `platform_token` cookie。
2. Portal Admin 仍共用中央 auth issuer，但其 entitlement 必須是 `platform`。
3. platform admin 可要求更高保證等級，例如 MFA。

原則：

1. 同一個身份核心。
2. 不同 assurance level。
3. 不同 entitlements。

Portal 不應再使用 client-side decode token 做授權判斷。

---

## 6. 安全模型

### 6.1 威脅與對應

1. 子站偽造 tenant header。
   - 對策：tenant 只從驗證後 token 與 server-side policy 決定。

2. localStorage token 被 XSS 竊取。
   - 對策：access / refresh token 改為 HttpOnly cookie；前端不持有權威 token。

3. Portal 用 decode payload 當授權判斷。
   - 對策：所有授權檢查改為 verify signature 或呼叫 auth introspection / me endpoint。

4. 系統間 token 混用。
   - 對策：加入 issuer、audience 或 entitlement enforcement；後端 middleware 顯式驗證系統存取資格。

5. refresh token 長期有效且不可撤銷。
   - 對策：refresh token rotation + session store + revoke list。

6. Bot 外部綁定與 browser session 脫鉤。
   - 對策：所有外部綁定都映射到中央 user identity，並納入審計。

7. 內部 API 只靠 service account 或只靠 internal key。
   - 對策：維持雙重驗證，service identity + internal key 缺一不可。

### 6.2 需要強制落地的安全要求

1. 所有 session cookie 必須為 HttpOnly + Secure。
2. 所有 auth middleware 必須 verify JWT，不可只 decode。
3. 所有 `/api/internal/*` 維持雙層保護。
4. 所有管理員登入事件必須寫入 audit log。
5. 平台管理員必須預留 MFA 擴充點。
6. refresh token 必須可依 user、session、device 個別撤銷。
7. 每個 app 必須有明確的 public route 與 protected route 定義。

---

## 7. 實作分期

### Phase A：收斂登入入口

目標：先消滅最危險的分裂點。

工作項目：

1. 停用 `manage-dashboard` 自行查 DB / 自行簽 token。
2. Portal 改由中央 auth service 取得與驗證 session。
3. bot-dashboard 持續透過 manage-backend 代理登入，但後端 issuer 收斂為單一 auth flow。
4. 所有 dashboard 改成以 `GET /api/auth/me` 恢復 session。

完成條件：

1. 瀏覽器登入都只打同一套 auth endpoint。
2. 不再有前端 app route 自己連 DB 做正式登入。

### Phase B：統一 Cookie 與 Session Store

工作項目：

1. 導入 `cram94_access`、`cram94_refresh`。
2. 設定 Domain=`.94cram.com`。
3. 建立 session store。
4. 導入 refresh rotation 與 revoke。

完成條件：

1. 任一子站登入後，其他子站可直接識別登入狀態。
2. 單點登出有效。

### Phase C：移除 localStorage 權威狀態

工作項目：

1. manage/inclass/stock/bot-dashboard 不再保存授權 token。
2. `tenantId`、`branchId` 只作為展示快取，來源仍以 `me` 為準。
3. 統一前端 auth provider。

完成條件：

1. 清空 localStorage 後重新整理，仍能透過 cookie 恢復登入。
2. localStorage 被污染時，不會改變真實權限。

### Phase D：Entitlement 與 Audience Enforcement

工作項目：

1. 後端 middleware 驗證 app entitlement。
2. 平台後台要求 `platform` entitlement。
3. bot dashboard 要求 `bot` entitlement。
4. 補齊系統級拒絕與 audit。

完成條件：

1. 非授權系統 token 無法使用他站 API。
2. 所有拒絕都可被審計。

### Phase E：Bot 綁定與身份核心統一

工作項目：

1. 把 Telegram / LINE 綁定映射到中央 `userId`。
2. 導入 `user_channel_bindings`。
3. bot 指令執行日誌寫回統一 audit pipeline。

完成條件：

1. 同一使用者的 bot 行為與 web 行為可被關聯稽核。

### Phase F：平台級安全增強

工作項目：

1. 平台管理員 MFA。
2. 裝置管理頁。
3. 異常登入告警。
4. 高風險操作二次驗證。

---

## 8. 資料模型建議

建議新增：

### 8.1 user_tenant_memberships

```sql
id
user_id
tenant_id
membership_role
status
created_at
updated_at
```

### 8.2 user_branch_memberships

```sql
id
user_id
branch_id
branch_role
status
created_at
updated_at
```

### 8.3 user_system_entitlements

```sql
id
user_id
tenant_id
system_key -- manage|inclass|stock|bot|platform
access_level
created_at
updated_at
```

### 8.4 auth_sessions

```sql
id
user_id
tenant_id
device_id
refresh_token_hash
ip_address
user_agent
last_seen_at
revoked_at
created_at
expires_at
```

### 8.5 user_channel_bindings

```sql
id
user_id
tenant_id
channel_type -- telegram|line
external_user_id
status
verified_at
created_at
updated_at
```

---

## 9. 驗收標準

### 9.1 功能驗收

1. 在 manage 登入後，不需重新登入即可開啟 inclass、stock、bot-dashboard。
2. 在任一站登出後，其他站重新整理會失效。
3. 切換 tenant 後，四站 API context 一致變更。
4. 沒有 `bot` entitlement 的帳號無法進 bot dashboard。
5. 沒有 `platform` entitlement 的帳號無法進 portal admin。

### 9.2 安全驗收

1. localStorage 不再保存權威 token。
2. Portal 不再使用 `platform_token`。
3. 所有 protected route 都不接受 decode-only token。
4. refresh token 可單筆撤銷。
5. 所有登入、登出、refresh、tenant switch、權限拒絕都有 audit log。

### 9.3 測試要求

1. 單元測試：JWT verify、refresh rotation、entitlement enforcement。
2. 整合測試：四站登入、跨站 session、單點登出。
3. E2E：
   - manage login -> open inclass
   - inclass login -> open stock
   - platform admin unauthorized path
   - bot-dashboard unauthorized entitlement
4. 安全測試：
   - 偽造 tenant header
   - 篡改 token payload
   - 過期 refresh 重放
   - Portal 舊 cookie 模式回歸

---

## 10. 建議執行順序

如果要兼顧風險與落地速度，建議順序如下：

1. 先做 Phase A：拔掉分裂登入入口。
2. 再做 Phase B：真正建立跨子網域 SSO cookie。
3. 接著做 Phase C：拔掉 localStorage 權威 token。
4. 然後做 Phase D：把 entitlement 真的執行起來。
5. 最後做 Phase E/F：bot 身份整合與平台 MFA。

這樣可以先把「同帳號但不同行為」與「安全模型分裂」兩個最大風險收掉，再往企業級功能擴展。

---

## 11. 明確不做的事

1. 不直接在所有系統同時大改 schema 後一次上線。
2. 不保留多套正式登入入口長期共存。
3. 不再新增任何 decode-only 授權流程。
4. 不以 localStorage token 作為未來架構基礎。
5. 不把 Telegram / LINE 綁定獨立成另一個身份系統。

---

## 12. 建議的下一步實作包

可拆成四個實作包依序交付：

1. `auth-foundation`
   - 中央 auth issuer
   - me / login / logout / refresh
   - shared cookie rename 與兼容層

2. `dashboard-auth-convergence`
   - manage / inclass / stock / bot-dashboard 前端 auth 收斂
   - localStorage 權威狀態拔除

3. `portal-platform-hardening`
   - platform_token 移除
   - Portal middleware 改 verify
   - platform entitlement 與 MFA 預留

4. `bot-identity-unification`
   - dashboard 與 channel bindings 對齊 user identity
   - audit 整合

---

本文件取代「共用 JWT_SECRET + users 表就等於 SSO」的舊假設。之後所有四系統合體與身份整合實作，應以本方案為準。