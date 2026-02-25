# Phase 1: 94CramBot Dashboard — 首頁 + 登入

## 任務概述
在 monorepo `apps/` 下新建 `bot-dashboard`，這是 94CramBot 的獨立網站前端。
包含 Landing Page（介紹雙 Bot + 定價 + FAQ）和 SSO 登入頁面。

## 專案背景
- **Monorepo**: `~/Github/94CramManageSystem`（pnpm workspace）
- **現有 dashboard 範例**: `apps/manage-dashboard`（Next.js + Tailwind 莫蘭迪色系）
- **共用 auth**: `packages/shared/src/auth/jwt.ts`（jose JWT sign/verify）
- **設計系統**: 莫蘭迪色系，Bot 主色 `#A89BB5`（紫色調）

## 雙 Bot 介紹內容

### 🏫 千里眼（@cram94_bot）— 補習班內部 Bot
- 蜂神榜L3-千里眼
- 對象：補習班老師、班主任、管理員
- 功能：用自然語言操作點名、繳費、庫存等三大系統
- Gemini AI 理解指令，寫入操作二次確認
- 亮點：自然語言 AI 操作 / Telegram 即時回應 / 跨系統統一入口

### 👨‍👩‍👧 順風耳（@Cram94_VIP_bot）— 家長服務 Bot
- 蜂神榜L3-順風耳
- 對象：學生家長
- 功能：查看孩子出缺勤、成績、繳費狀態、即時通知
- 純唯讀，不能寫入任何資料
- 亮點：即時到校通知 / 成績推播 / 繳費提醒 / 課表查詢

## 訂閱方案（顯示在定價區）

| 方案 | 千里眼 | 順風耳 | AI Calls/月 | 價格 |
|------|--------|--------|-------------|------|
| 免費 | ✅ | ❌ | 100 | NT$0 |
| 基礎 | ✅ | ✅（50 家長） | 500 | NT$299/月 |
| 專業 | ✅ | ✅（200 家長） | 2000 | NT$599/月 |
| 企業 | ✅ | ✅（無上限） | 無上限 | NT$999/月 |

## 具體要求

### 1. 建立 apps/bot-dashboard 腳手架
- `package.json`: name `@94cram/bot-dashboard`, port 3400
- Next.js (App Router) + Tailwind CSS
- 參考 `apps/manage-dashboard` 的 package.json 結構（next, react, jose, tailwind）
- `tsconfig.json` 繼承 monorepo 設定
- 加入 `@94cram/shared` 依賴（workspace:*）

### 2. Landing Page（`/` 首頁）
- Hero 區：標題「94CramBot AI 助手」、副標題「千里眼 × 順風耳，補習班智慧雙引擎」
- 雙 Bot 介紹卡片（千里眼 + 順風耳，各自功能亮點）
- 定價方案區（4 個方案卡片）
- FAQ 區（至少 6 個 Q&A）
- Footer（與 Portal 風格一致）
- CTA 按鈕：「免費開始使用」→ 導向 /login
- 莫蘭迪色系：主色 `#A89BB5` 紫色調，背景 `#F5F0F7`
- 千里眼色 `#7B8FA1`（藍灰）、順風耳色 `#C4A9A1`（暖粉）
- **95% 用戶用手機** → 手機版優先設計（mobile-first responsive）

### 3. 登入頁（`/login`）
- SSO 登入表單（email + password）
- 呼叫 manage-backend `/api/auth/login` API
- 成功後將 JWT 存 cookie，redirect 到 `/dashboard`
- 錯誤處理（帳密錯誤、網路錯誤）
- 莫蘭迪紫色調

### 4. Dashboard 空殼（`/dashboard`）
- 建立 layout.tsx（側邊欄 + 頂欄，莫蘭迪風格）
- 側邊欄項目：首頁 / 千里眼管理 / 順風耳管理 / 用量統計 / 設定
- `page.tsx` 顯示歡迎訊息 + 簡單的統計卡片（placeholder 數據）
- Auth guard middleware（檢查 JWT cookie，未登入 redirect /login）

### 5. Dockerfile
- 參考 `apps/manage-dashboard/Dockerfile`
- Multi-stage build, standalone output
- Port 3400
- `--platform linux/amd64`（Cloud Run 需求）

### 6. pnpm workspace 整合
- 確認 `pnpm-workspace.yaml` 已包含 `apps/bot-dashboard`
- root `package.json` 不需修改（pnpm workspace 自動偵測）

## 驗收標準
1. `cd apps/bot-dashboard && pnpm install && pnpm build` 成功（0 errors）
2. `pnpm dev` 後瀏覽器開 http://localhost:3400 看到首頁
3. 首頁手機版排版正確（Chrome DevTools 切 iPhone 14）
4. `/login` 頁面可見，表單可輸入
5. `/dashboard` 有 auth guard，未登入時 redirect 到 /login
6. `pnpm typecheck` 通過

## 禁止事項
- 不要修改其他 apps 的程式碼
- 不要修改 packages/shared 的程式碼
- 不要安裝不必要的大型 UI library（保持輕量，用 Tailwind 手刻）
- 不要使用 `"use client"` 除非該元件真的需要互動

## 參考文件
- Portal 首頁風格：`apps/portal/src/app/page.tsx`
- Dashboard 結構：`apps/manage-dashboard/src/`
- 共用 JWT：`packages/shared/src/auth/jwt.ts`
- 規劃書：`docs/94CRAMBOT_UPGRADE_PLAN.md`
