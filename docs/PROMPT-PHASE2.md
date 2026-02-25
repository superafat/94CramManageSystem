# Phase 2: 94CramBot Dashboard — 管理介面

## 任務概述
為 `apps/bot-dashboard` 補齊 Dashboard 內頁：千里眼管理、順風耳管理、用量統計、設定。
Phase 1 已建好腳手架、首頁、登入、Dashboard 空殼（側邊欄 + auth guard）。

## 專案位置
- **Monorepo**: `~/Github/94CramManageSystem`
- **本 app**: `apps/bot-dashboard`（Next.js + Tailwind，port 3400）
- **現有頁面**: `/`（首頁）、`/login`、`/dashboard`（空殼 with sidebar）
- **設計系統**: 莫蘭迪紫色調 `#A89BB5`，千里眼色 `#7B8FA1`，順風耳色 `#C4A9A1`，背景 `#F5F0F7`

## 需要建立的頁面

### 1. `/dashboard/admin-bot` — 千里眼管理
> 管理補習班內部 Bot（@cram94_bot）

**區塊：**
- **Bot 狀態卡片**：顯示千里眼 Bot 狀態（已啟用/未啟用）、綁定人數、今日操作數
- **綁定碼管理**：
  - 「生成綁定碼」按鈕 → 生成 6 碼數字，顯示在 modal 中（含倒數計時 5 分鐘過期）
  - 綁定碼歷史列表（碼、狀態 pending/used/expired、建立時間、使用者）
- **已綁定用戶列表**：Telegram 用戶名、角色、綁定時間、最後活躍時間、「解除綁定」按鈕
- **模組開關**：三個 toggle switch（manage/inclass/stock），控制該租戶啟用哪些模組
- 所有資料目前用 mock/placeholder，API 尚未建（Phase 3 才做）
- 用 `useState` 管理 toggle 狀態（不需 persist）

### 2. `/dashboard/parent-bot` — 順風耳管理
> 管理家長服務 Bot（@Cram94_VIP_bot）

**區塊：**
- **Bot 狀態卡片**：顯示順風耳 Bot 狀態、已邀請家長數、已綁定家長數
- **訂閱狀態提示**：如果是免費方案，顯示「升級方案以啟用順風耳 Bot」提示橫幅
- **家長邀請碼管理**：
  - 「生成邀請碼」按鈕 → 選擇要綁定的學生 → 生成邀請碼（給家長用）
  - 邀請碼列表（碼、綁定學生、狀態、建立時間）
- **已綁定家長列表**：Telegram 用戶名、綁定的學生、綁定時間、「解除綁定」按鈕
- **通知設定**：
  - 到校通知 toggle
  - 離校通知 toggle
  - 成績更新通知 toggle
  - 繳費提醒 toggle
  - 每項有說明文字
- 所有資料用 mock/placeholder

### 3. `/dashboard/usage` — 用量統計
> 查看 Bot 使用量

**區塊：**
- **本月摘要卡片**（4 張）：AI Calls 用量 / API Calls / 操作成功率 / 活躍用戶數
- **每日用量圖表**：折線圖或長條圖，顯示過去 30 天的 AI calls + API calls
  - 可以用簡單的 CSS bar chart（不要引入 chart.js 或其他大型圖表庫）
  - 或用 SVG 手繪簡單 bar chart
- **操作紀錄表格**：最近 20 筆操作（時間、用戶、意圖、狀態 ✅/❌）
- **方案用量進度條**：顯示「已用 XX / 上限 YY AI Calls」，接近上限顯示警告色
- 所有資料用 mock data

### 4. `/dashboard/settings` — 設定
> 全域設定頁面

**區塊：**
- **目前方案**：顯示目前訂閱方案（免費/基礎/專業/企業）+ 「升級方案」按鈕
- **方案比較表**：4 個方案的功能對照（跟首頁定價一致）
- **Webhook 設定**：URL 輸入框 + 事件 checkbox（操作完成/每日摘要/異常警報）
- **通知偏好**：Email 通知 toggle / Telegram 通知 toggle
- **危險區域**：
  - 「重置所有綁定」按鈕（紅色，需二次確認 modal）
  - 「刪除帳號」按鈕（紅色，需輸入補習班名稱確認）

### 5. 共用元件
- **StatCard**: 統計卡片元件（icon + label + value + optional trend）
- **ToggleSwitch**: 莫蘭迪色 toggle switch
- **Modal**: 確認對話框（confirm/cancel）
- **DataTable**: 簡單表格元件（欄位定義 + 資料 + 空狀態）
- **Badge**: 狀態標籤（active/inactive/expired/pending）
- **ProgressBar**: 用量進度條

放在 `src/components/ui/` 目錄下。

## 技術要求
- **Mobile-first**：手機版優先，表格在手機上改為卡片列表
- **Mock data**：所有資料用 hardcoded mock，檔案放 `src/lib/mock-data.ts`
- **不要安裝新的 npm packages**（用 Tailwind 手刻所有 UI）
- **`"use client"` 只用在需要互動的元件**（toggle/modal/form）
- **莫蘭迪配色一致**：跟首頁 + 登入頁風格統一

## Dashboard Sidebar 更新
Phase 1 的 Sidebar 已有 5 個導航項目，確認路徑對應：
- 首頁 → `/dashboard`
- 千里眼管理 → `/dashboard/admin-bot`（或 `/dashboard/clairvoyant`，看現有 code）
- 順風耳管理 → `/dashboard/parent-bot`
- 用量統計 → `/dashboard/usage`
- 設定 → `/dashboard/settings`

先讀 `src/components/layout/Sidebar.tsx` 和 `src/app/dashboard/layout.tsx` 確認現有路徑命名，保持一致。

## 驗收標準
1. `pnpm build` 成功（0 errors）
2. `npx tsc --noEmit` 通過（0 errors）
3. 所有 4 個新頁面可導航訪問
4. 手機版排版正確（表格轉卡片、toggle 可觸控）
5. Mock data 合理（不是 lorem ipsum，是補習班情境的假資料）
6. 共用元件至少包含 StatCard、ToggleSwitch、Modal

## 禁止事項
- 不要修改 `/`（首頁）和 `/login` 頁面
- 不要修改 `packages/shared` 的程式碼
- 不要安裝新的 npm packages（chart.js、recharts 等都不要）
- 不要修改其他 apps 的程式碼

## 參考
- Phase 1 已建好的 Dashboard 空殼：`src/app/dashboard/page.tsx`、`src/app/dashboard/layout.tsx`
- 設計風格：`src/app/page.tsx`（首頁的莫蘭迪紫色調）
- 規劃書：`docs/94CRAMBOT_UPGRADE_PLAN.md`
