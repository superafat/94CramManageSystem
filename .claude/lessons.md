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
