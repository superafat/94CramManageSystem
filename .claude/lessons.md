# Claude Code Lessons — 94CramManageSystem

> 每次修正後更新，防止重複犯同樣的錯誤

## 2026-02-25 — 環境變數

- **問題**: manage-dashboard `API_BASE` 預設值是 `'/api'`（相對路徑），在本機開發時連到自己的 Next.js `/api` route 而不是 backend
- **教訓**: Next.js dashboard 的 `NEXT_PUBLIC_API_BASE` 預設值必須是 `http://localhost:<backend-port>`
- **規則**: 所有 `process.env.NEXT_PUBLIC_API_BASE ||` 的 fallback 必須是完整 `http://` 路徑

## 2026-02-25 — TypeScript null vs undefined

- **問題**: DB 欄位是 `string | null`，但函數 interface 期望 `string | undefined`
- **教訓**: Drizzle ORM 回傳 `null`，但 TypeScript interface 常用 `undefined`
- **規則**: 傳遞 DB 欄位到 function 時用 `field ?? undefined` 做轉換

## 2026-03-06 — 薪資保險方案

- **問題**: 薪資頁曾用單一全域勞健保級距套用到所有老師，導致個別投保設定失真
- **教訓**: 薪資與保險資料要綁在老師個人設定，不要在頁面用全域 state 代算正式結果
- **規則**: 牽涉薪資扣項或保險負擔時，後端回傳每位老師的毛額、個人負擔、雇主負擔與淨額，前端只做展示與手動微調

## 2026-03-06 — 二代健保補充保費

- **問題**: 兼職堂薪老師若只顯示「需判斷」而沒有試算金額，薪資審核時無法快速覆核
- **教訓**: 補充保費要區分「法規試算提醒」與「正式代扣結果」，避免把估算直接當成已扣金額
- **規則**: 兼職薪資畫面要同時回傳 `should_withhold_supplemental_health`、試算金額與原因說明，且不要直接併入淨額，除非有明確覆核流程
- **規則補充**: 一旦補上覆核流程，後端結算 API 必須接受明確的 `withholdSupplementalHealth` 決策並把覆核備註寫入薪資紀錄，不能讓前端只改顯示不改正式結算結果

## 2026-03-06 — 學收繳費單工作台

- **問題**: 原本帳務頁分散在安親/團班/個指分頁，操作路徑不一致，且難以快速掌握同月份每個班級已繳/未繳狀態。
- **教訓**: 學收主流程應統一成「左班級列表、右學生設定與發布」；模式設定、金額記憶、通知發布要在同一個操作面完成。
- **規則**: 針對學收改版時，後端需同時提供 `classes-overview`、`course detail`、`publish notices` 三段 API，且課程明細必須回傳當月支付狀態與價格記憶欄位，避免前端自行猜測。

## 2026-03-07 — Dashboard Auth Proxy

- **問題**: 多個 dashboard 透過 Next.js proxy 代理 backend API，但回應只保留 `Content-Type`，導致 backend 設定的 `Set-Cookie` 在 login/logout/refresh 流程中被吃掉。
- **教訓**: 只要 proxy auth 相關 API，就必須顯式轉發 `Set-Cookie`，否則看似成功登入，實際上 session 並沒有真正落到瀏覽器。
- **規則**: 所有 dashboard 或 portal 的 proxy route 在回傳 backend response 時，一律保留 `Set-Cookie` header；auth/session 問題先檢查這一層。

## 2026-03-07 — 前端本地登入實作漂移

- **問題**: `manage-dashboard`、`inclass-dashboard` 曾在 Next route 內直接查 DB 並簽 JWT，和 backend auth service 分叉，造成同一帳號在不同系統的登入行為與安全策略不一致。
- **教訓**: 前端 app route 不應成為正式 auth issuer；正式登入必須統一收斂到 backend auth service。
- **規則**: 任何 dashboard 新增或調整正式登入流程時，不得在前端 app route 直接查 DB 或自行簽 JWT；只能代理到唯一的 backend auth issuer。

## 2026-03-07 — Cookie 名稱遷移

- **問題**: 直接把共享 access/refresh cookie 改名會讓舊 dashboard proxy、portal 與既有 session 恢復邏輯同時失效。
- **教訓**: 認證 cookie 改名必須有相容期，至少要同時發新舊 cookie、同時讀新舊 cookie、清除時也要雙清除。
- **規則**: 任何 auth cookie 命名調整都必須先提供雙寫雙讀相容層，待所有 consumer 完成遷移後才能刪除 legacy 名稱。

## 2026-03-07 — Session-backed Auth 不可只發 cookie

- **問題**: 只在 login/refresh 設 access + refresh cookie，卻不寫 `auth_sessions`、不記錄 revoke event，會讓 session 管理、裝置登出、tenant switch 都無法真正落地。
- **教訓**: 企業級 SSO 不是 JWT 能驗就算完成；所有正式登入鏈路都必須同時建立 session row、補齊 membership/entitlement、在 refresh/logout 時撤銷舊 session。
- **規則**: 凡是正式 auth issuer 或 auth proxy 對接的 backend route，login/google/demo/refresh/logout 至少要做到 `issue cookie + persist auth_sessions + record auth_session_events + revoke rotated refresh session`。
