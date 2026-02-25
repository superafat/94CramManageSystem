# 94CramBot 升級規劃書
> 版本: v1.0 | 2026-02-25 | 姜子牙 擬
> 需求：94CramBot 從「直連 Telegram」升級為「首頁 + 登入 + 雙 Bot 訂閱管理」

---

## 一、現況 vs 目標

| 項目 | 現況 | 目標 |
|------|------|------|
| Portal 點 94CramBot | 直接跳 `t.me/cram94bot` | 進入 94CramBot 獨立首頁 |
| Bot 數量 | 1 個（管理員用） | 2 個：管理員 Bot + 家長 Bot |
| 訂閱管理 | 無 | 登入後 Dashboard 管理訂閱/用量 |
| 認證 | Firestore `/bind` 綁定碼 | 共用 94 SSO（JWT）登入 |
| 後端 | `bot-gateway`（單 webhook） | `bot-gateway` 擴充雙 webhook |

---

## 二、雙 Bot 定義

### 🏫 千里眼 — 補習班內部 Bot（`@cram94_bot`）
- **角色名**：蜂神榜L3-千里眼
- **對象**：補習班老師、班主任、管理員
- **功能**：自然語言操作三大系統（點名/繳費/庫存）
- **權限**：查詢 + 寫入（寫入需二次確認）
- **現有功能全保留**，不動

### 👨‍👩‍👧 順風耳 — 家長服務 Bot（`@Cram94_VIP_bot`）
- **角色名**：蜂神榜L3-順風耳
- **對象**：學生家長
- **功能**：
  - 📋 查看孩子出缺勤紀錄
  - 📊 查看孩子成績
  - 💰 查看繳費狀態/歷史
  - 🔔 接收即時通知（到校/離校/請假/成績更新）
  - 📅 查看課表/行事曆
- **權限**：**唯讀**，不能寫入任何資料
- **綁定方式**：補習班在 Dashboard 生成家長邀請碼 → 家長用 `/bind` 綁定孩子

---

## 三、新增項目

### 1. `apps/bot-dashboard`（新前端）
> 94CramBot 的獨立網站，類似其他 dashboard

**路由結構：**
```
/                     → 首頁 Landing Page（介紹雙 Bot 功能、定價、FAQ）
/login                → SSO 登入（共用 @94cram/shared JWT）
/dashboard            → 主控台（需登入）
/dashboard/admin-bot  → 管理員 Bot 設定（綁定碼、模組開關、用量）
/dashboard/parent-bot → 家長 Bot 設定（邀請碼、通知設定、家長列表）
/dashboard/usage      → 用量統計（AI calls、API calls、月報）
/dashboard/settings   → 全域設定（方案、Webhook、通知偏好）
```

**技術棧：**
- Next.js + Tailwind（跟其他 dashboard 一致）
- `@94cram/shared` JWT 認證
- 莫蘭迪色系（Bot 主色 `#A89BB5` 紫色調）
- Port: `3400`

### 2. `bot-gateway` 擴充（改現有後端）

**新增：**
```
src/
├── webhooks/
│   ├── telegram.ts        ← 現有（管理員 Bot）
│   └── telegram-parent.ts ← 新增（家長 Bot）
├── handlers/
│   ├── intent-router.ts   ← 現有
│   └── parent-router.ts   ← 新增（家長查詢路由）
├── modules/
│   ├── ai-engine.ts       ← 擴充家長 Bot prompt
│   └── parent-adapter.ts  ← 家長 Bot 專用邏輯
├── api/                   ← 新增：Dashboard REST API
│   ├── auth.ts            ← SSO JWT 驗證 middleware
│   ├── subscriptions.ts   ← 訂閱管理 CRUD
│   ├── bind-codes.ts      ← 綁定碼/邀請碼管理
│   ├── usage.ts           ← 用量查詢 API
│   └── parent-invites.ts  ← 家長邀請碼 CRUD
└── config.ts              ← 加入 TELEGRAM_PARENT_BOT_TOKEN
```

**config.ts 新增欄位：**
```typescript
TELEGRAM_PARENT_BOT_TOKEN: z.string().min(1),
BOT_DASHBOARD_URL: z.string().url().optional(),
```

**新 Firestore Collections：**
```
bot_parent_bindings     → 家長 Telegram ID ↔ 學生 ID 對應
bot_parent_invites      → 家長邀請碼（tenant+student+code+expiry）
bot_subscriptions       → 租戶訂閱狀態（admin_bot: active/inactive, parent_bot: active/inactive）
bot_notifications       → 通知紀錄（推播歷史）
```

### 3. Portal 修改

**修改 `apps/portal/src/app/page.tsx`：**
```diff
- url: 'https://t.me/cram94bot',
+ url: process.env.BOT_URL || 'https://cram94-bot-dashboard-1015149159553.asia-east1.run.app',
```

---

## 四、家長 Bot 意圖清單

| Intent | 說明 | 參數 |
|--------|------|------|
| `parent.attendance` | 查孩子出缺勤 | child_name?, date?, period? |
| `parent.grades` | 查孩子成績 | child_name?, subject?, exam? |
| `parent.payments` | 查繳費狀態 | child_name?, month? |
| `parent.schedule` | 查課表 | child_name?, day? |
| `parent.info` | 查孩子基本資料 | child_name? |
| `parent.help` | 使用說明 | — |

---

## 五、訂閱方案（bot-dashboard 顯示）

| 方案 | 管理員 Bot | 家長 Bot | AI Calls/月 | 價格 |
|------|-----------|---------|-------------|------|
| 免費 | ✅ | ❌ | 100 | NT$0 |
| 基礎 | ✅ | ✅（50 家長） | 500 | NT$299/月 |
| 專業 | ✅ | ✅（200 家長） | 2000 | NT$599/月 |
| 企業 | ✅ | ✅（無上限） | 無上限 | NT$999/月 |

---

## 六、部署

| App | Cloud Run Name | Port | Docker |
|-----|---------------|------|--------|
| bot-dashboard | `cram94-bot-dashboard` | 3400 | 新建 Dockerfile |
| bot-gateway | `cram94-bot-gateway` | 3300 | 現有（擴充） |

**CI/CD：** 新增 `.github/workflows/deploy-bot.yml`
- Path filter: `apps/bot-gateway/**` 或 `apps/bot-dashboard/**`

---

## 七、執行階段

### Phase 1：bot-dashboard 首頁 + 登入（2 個 sub-task）
1. 建立 `apps/bot-dashboard` 腳手架（Next.js + Tailwind + 莫蘭迪色）
2. Landing Page（介紹雙 Bot、定價、FAQ）+ SSO 登入頁

### Phase 2：Dashboard 管理介面（3 個 sub-task）
1. 管理員 Bot 頁面（綁定碼管理、模組開關、用量圖表）
2. 家長 Bot 頁面（邀請碼管理、家長列表、通知設定）
3. 用量統計頁面 + 設定頁面

### Phase 3：bot-gateway 擴充（3 個 sub-task）
1. Dashboard REST API（auth + subscriptions + bind-codes + usage）
2. 家長 Bot webhook + intent router + AI prompt
3. 家長通知推播系統（到校/離校事件 → 推 Telegram）

### Phase 4：Portal 串接 + 部署（2 個 sub-task）
1. Portal 修改 Bot 連結 → bot-dashboard URL
2. Docker + CI/CD + Cloud Run 部署

### Phase 5：家長 Bot 與三大系統串接（2 個 sub-task）
1. manage-backend / inclass-backend 新增 `/api/parent-ext/*` 家長查詢 API
2. inclass-backend 出席事件觸發 → 推播通知家長 Bot

---

## 八、費用影響

| 項目 | 新增費用 |
|------|---------|
| Cloud Run（bot-dashboard） | 免費 tier 內（靜態站低流量） |
| Firestore（新 collections） | 免費 tier 內 |
| 新 Telegram Bot Token | 免費（@BotFather 建立） |
| Gemini API（家長 Bot） | 共用現有額度 |
| **月預算影響** | **NT$0 新增**（維持 NT$300 內） |

---

## 九、風險

| 風險 | 等級 | 對策 |
|------|------|------|
| Gemini API 用量翻倍（雙 Bot） | 中 | 家長 Bot 查詢可走直連 API 不經 AI |
| 家長 Bot 被濫用（大量查詢） | 低 | Rate limit + 訂閱限制 |
| 新 Telegram Bot 需 @BotFather 建立 | 低 | 請老闆建立或授權 |

---

## 十、不做的事

- ❌ 不重寫現有管理員 Bot 邏輯（全保留）
- ❌ 不遷移 Firestore 到 Cloud SQL（Bot 資料適合 NoSQL）
- ❌ 不做 LINE Bot 整合（94LineBot 獨立專案）
- ❌ 家長 Bot 不支援寫入操作（純唯讀）

---

**等老闆確認後開始執行。** 🎣
