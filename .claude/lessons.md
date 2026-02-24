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
