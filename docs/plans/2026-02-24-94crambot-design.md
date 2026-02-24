# 94CramBot 設計文件

**日期：** 2026-02-24
**狀態：** 已核准
**版本：** v3.0

---

## 變更紀錄

| 版本 | 日期 | 變更 |
|------|------|------|
| v1.0 | 2026-02-24 | 初版：Bot Gateway + 三後端 bot routes |
| v2.0 | 2026-02-24 | 新增 Bot Dashboard、enabled_modules 模組控制、補齊缺漏端點 |
| v3.0 | 2026-02-25 | 新增 94CramVIPBot（家長端 Telegram Bot）、推播通知 API、家長綁定機制 |

### v3.0 主要變更

1. **新增 94CramVIPBot**（`@cram94VIPbot`）— 家長端 Telegram Bot，接收通知 + 查詢
2. **Bot Gateway 新增 VIP webhook**（`/webhook/telegram-vip`）— 處理家長端訊息
3. **Bot Gateway 新增推播 API**（`/api/notify/*`）— 三後端主動推播通知給家長
4. **新增家長綁定機制** — 支援預建對應（C）和姓名配對（B）兩種方式
5. **新增 VIP 意圖集** — 家長查詢出缺勤、成績、繳費、課表
6. **Firestore 新增 vip_user_bindings** — 家長端綁定關係

---

## 一、目標

在 94cram.com 平台新增第四個服務 94CramBot，包含：

1. **Bot Gateway**（v1 已完成，v2/v3 擴充）— 同時處理管理端和家長端 Telegram Bot
2. **Bot Dashboard**（v2 新增）— 獨立 Next.js 網站，介紹頁 + 管理後台
3. **模組控制機制**（v2 新增）— 管理端 Bot 租戶選擇啟用 manage / inclass / stock 模組
4. **94CramVIPBot**（v3 新增）— 家長端 Telegram Bot，推播通知 + 資料查詢
5. **推播通知 API**（v3 新增）— 三後端觸發事件後主動推播給家長
6. **三後端 bot routes**（v1 已完成，v2 補齊缺漏，v3 新增推播觸發）

---

## 二、技術決策

| 決策項目 | 選擇 | 原因 |
|---------|------|------|
| Bot Gateway 框架 | Hono + @hono/node-server | 對齊現有 3 個後端 |
| Bot Dashboard 框架 | Next.js + React | 對齊現有 3 個 Dashboard |
| 語言 | TypeScript + ESM | 對齊現有架構 |
| AI SDK | @google/generative-ai | 輕量，API Key 即可使用 |
| IAM 驗證 | google-auth-library | GCP 服務間標準驗證方式 |
| Bot 路由 DB 查詢 | 直接寫 Drizzle 查詢 | 不動現有程式碼，零風險 |
| Bot 資料儲存 | Firestore | 適合 document 模型（綁定、暫存、快取、日誌） |
| Dashboard 資料來源 | Bot Gateway REST API | Dashboard 透過 Next.js rewrites 代理到 Bot Gateway |
| 建置工具 | tsup（Gateway）、Next.js standalone（Dashboard） | 對齊現有架構 |
| 雙 Bot 架構 | 1 Gateway 2 Webhook | 共用基礎設施，分開角色和權限 |
| 推播觸發 | 後端主動 POST 到 Bot Gateway | 最即時，後端觸發事件時加一行呼叫 |
| 家長綁定 | 預建對應 + 姓名配對 | 兩種方式並存，適應不同情境 |

---

## 三、架構總覽

```
┌─────────────┐    /webhook/telegram       ┌──────────────────┐
│ @cram94bot   │ ────────────────────────> │  Bot Gateway     │
│ （管理端）    │ <──────────────────────── │  cram94-bot-gw   │
└─────────────┘    Bot Reply               │  Port: 3300      │
                                           │                  │
┌─────────────┐    /webhook/telegram-vip   │  Webhooks:       │
│@cram94VIPbot │ ────────────────────────> │  - /telegram     │
│ （家長端）    │ <──────────────────────── │  - /telegram-vip │
└─────────────┘    Bot Reply / Push        │                  │
                                           │  Modules:        │
┌─────────────┐    Next.js rewrites        │  - Platform      │
│  Bot         │ ────────────────────────> │    Adapter       │
│  Dashboard   │ <──────────────────────── │  - Auth Manager  │
│  Port: 3301  │    REST API               │  - VIP Auth Mgr  │ ← v3
└─────────────┘                            │  - AI Engine     │
                                           │  - VIP Engine    │ ← v3
                                           │  - Confirm Mgr   │
                                           │  - Notify Mgr    │ ← v3
                                           │  - API Client    │
                                           │  - Dashboard API │
                                           └──────┬───────────┘
                                                  │ GCP IAM Token
                              ┌───────────────────┼───────────────────┐
                              │                   │                   │
                              ▼                   ▼                   ▼
                     ┌────────────┐      ┌────────────┐      ┌────────────┐
                     │ manage     │      │ inclass    │      │ stock      │
                     │ backend    │      │ backend    │      │ backend    │
                     │            │      │            │      │            │
                     │/api/bot-ext│      │ /api/bot/  │      │ /api/bot/  │
                     │  finance/* │      │  attend/*  │      │  stock/*   │
                     │  student/* │      │  data/*    │      │  data/*    │
                     │  data/*    │      │            │      │            │
                     └─────┬──────┘      └─────┬──────┘      └─────┬──────┘
                           │                   │                   │
                           │  POST /api/notify │                   │
                           └───────────────────┼───────────────────┘
                                               │
                                        ┌──────┴───────┐
                                        │  PostgreSQL  │
                                        │  (Drizzle)   │
                                        └──────────────┘

Bot Gateway 自有資料：Firestore
- bot_user_bindings（管理端綁定 + enabled_modules）
- vip_user_bindings（家長端綁定 + 學生對應）       ← v3 新增
- bot_pending_actions（待確認操作）
- bot_tenant_cache（租戶快取）
- bot_operation_logs（操作日誌）
- bot_bind_codes（管理端綁定碼）
- vip_bind_codes（家長端綁定碼 + 學生資訊）        ← v3 新增
- bot_tenant_settings（租戶 Bot 設定）
- bot_usage_stats（月用量統計）
```

---

## 四、兩個 Bot 角色對照

| | @cram94bot（管理端） | @cram94VIPbot（家長端） |
|---|---|---|
| 對象 | 補習班主任 / 行政 / 老師 | 家長 |
| 功能 | 管理操作（點名、繳費、出貨...） | 接收通知 + 查詢 |
| 互動方向 | 雙向（指令 → 操作 → 結果） | 推播 + 查詢（無寫入操作） |
| AI 引擎 | Gemini 2.0 Flash（意圖解析） | Gemini 2.0 Flash（查詢意圖解析，較簡單） |
| 確認機制 | 有（寫入操作需確認） | 無（家長端無寫入操作） |
| 綁定方式 | 6 位數綁定碼（管理端生成） | 6 位數綁定碼（管理端生成，帶學生資訊）或姓名配對 |
| Webhook | `/webhook/telegram` | `/webhook/telegram-vip` |
| Firestore | `bot_user_bindings` | `vip_user_bindings` |

---

## 五、94CramVIPBot 家長端設計（v3 新增）

### 5.1 家長綁定流程

**流程 C（主要）— 預建對應：**

1. 補習班主任在 Bot Dashboard 設定頁 → 「生成家長綁定碼」
2. 選擇學生 → 系統產生 6 位數綁定碼，存入 Firestore `vip_bind_codes`（帶 student_id、student_name）
3. 主任把綁定碼給家長（口頭、LINE、紙條皆可）
4. 家長在 Telegram 搜尋 `@cram94VIPbot`，發送 `/bind 123456`
5. Bot 驗證碼 → 自動建立家長-學生綁定關係
6. 一位家長可綁定多個小孩

**流程 B（備用）— 姓名配對：**

1. 主任生成不帶學生資訊的通用綁定碼
2. 家長 `/bind 123456` 後，Bot 回覆「請輸入您孩子的姓名」
3. 家長輸入姓名 → Bot 從 tenant cache 模糊匹配 → 列出候選學生
4. 家長點選確認 → 建立綁定

### 5.2 Firestore vip_user_bindings 結構

```typescript
interface VipTenantBinding {
  tenant_id: string;
  tenant_name: string;
  students: Array<{
    student_id: string;
    student_name: string;
    class_name?: string;
  }>;
}

interface VipUserBinding {
  bindings: VipTenantBinding[];
  active_tenant_id: string;
  active_tenant_name: string;
  created_at: Date;
  last_active_at: Date;
}
```

### 5.3 Firestore vip_bind_codes 結構

```typescript
interface VipBindCode {
  tenant_id: string;
  tenant_name: string;
  student_id?: string;     // 有值 = 流程 C，無值 = 流程 B
  student_name?: string;
  used: boolean;
  created_at: Date;
  expires_at: Date;        // 24 小時有效（比管理端長，因為家長可能較慢操作）
}
```

### 5.4 VIP 推播通知類型

三個後端在事件發生時，POST 到 Bot Gateway `/api/notify/*`：

| 通知類型 | 觸發來源 | 推播內容 |
|---------|---------|---------|
| attendance.arrival | inclass-backend 點名成功 | 「✅ [學生名] 已到班（[時間]）」 |
| attendance.leave | inclass-backend 登記請假 | 「📋 [學生名] 今日請假」 |
| grade.exam | manage-backend 登記成績 | 「📝 [學生名] [科目] 小考成績：[分數]」 |
| grade.report | manage-backend 發佈成績單 | 「📊 [學生名] 期中成績單已出」 |
| payment.due | manage-backend 繳費提醒 | 「💰 [學生名] [月份] 學費 NT$[金額] 尚未繳費」 |
| payment.received | manage-backend 確認收費 | 「✅ [學生名] 已繳費 NT$[金額]」 |
| course.new | manage-backend 開課通知 | 「📚 新課程：[課程名] [日期] 開課」 |
| course.change | manage-backend 調課通知 | 「🔄 [課程名] 時間變更為 [新時間]」 |
| announcement | manage-backend 公告 | 「📢 [公告標題]：[內容摘要]」 |

### 5.5 VIP 家長查詢意圖

| Intent ID | 說明 | 類型 | 後端 API |
|-----------|------|------|---------|
| vip.query_attendance | 查孩子出缺勤紀錄 | 查詢 | inclass /attendance/list |
| vip.query_grade | 查孩子成績 | 查詢 | manage /student/grades |
| vip.query_payment | 查繳費狀態 | 查詢 | manage /finance/history |
| vip.query_schedule | 查課表 | 查詢 | manage /student/schedule |
| vip.switch_child | 切換查詢的孩子 | 系統 | — |
| vip.help | 查看使用說明 | 系統 | — |

VIP 意圖全部是**查詢類**，無寫入操作，不需要確認機制。

### 5.6 VIP AI Engine

獨立的 system prompt，比管理端更簡單：
- 只有查詢意圖
- 語調親切友善（面向家長）
- 支援「我兒子」「我女兒」等口語化表達
- 多小孩時需先釐清是哪個孩子

### 5.7 VIP 推播 API（Bot Gateway 新增端點）

三個後端透過 GCP IAM 認證呼叫：

| 路由 | 方法 | 說明 |
|------|------|------|
| /api/notify/attendance | POST | 出勤通知（到班/請假） |
| /api/notify/grade | POST | 成績通知（小考/成績單） |
| /api/notify/payment | POST | 繳費通知（提醒/確認） |
| /api/notify/course | POST | 課程通知（開課/調課） |
| /api/notify/announcement | POST | 補習班公告 |

**統一請求格式：**

```typescript
interface NotifyRequest {
  tenant_id: string;
  student_id: string;        // 用來查找該學生綁定的家長
  type: string;              // 通知類型
  title: string;             // 通知標題
  message: string;           // 完整通知訊息（已格式化）
  data?: Record<string, unknown>; // 額外資料
}
```

**推播流程：**
1. 後端 POST 到 `/api/notify/*`
2. Bot Gateway 驗證 GCP IAM Token
3. 從 `vip_user_bindings` 查找哪些家長綁定了這個學生
4. 逐一發送 Telegram 訊息給所有綁定的家長
5. 記錄到 `bot_operation_logs`（type: 'notification'）

---

## 六、新增檔案結構（v3）

### 6.1 Bot Gateway 新增/修改

```
apps/bot-gateway/src/
├── app.ts                              # v3: 新增 VIP webhook + notify 路由
├── config.ts                           # v3: 新增 TELEGRAM_VIP_BOT_TOKEN
├── webhooks/
│   ├── telegram.ts                     # 管理端（不動）
│   └── telegram-vip.ts                 # v3 新增：家長端 webhook
├── modules/
│   ├── auth-manager.ts                 # 管理端（v2 修改）
│   ├── vip-auth-manager.ts             # v3 新增：家長端認證
│   ├── ai-engine.ts                    # 管理端（v2 修改）
│   ├── vip-engine.ts                   # v3 新增：家長端 AI 引擎
│   ├── notify-manager.ts              # v3 新增：推播管理
│   └── ...
├── commands/
│   ├── bind.ts                         # 管理端（不動）
│   └── vip-bind.ts                     # v3 新增：家長端綁定
├── handlers/
│   ├── intent-router.ts                # 管理端（v2 修改）
│   └── vip-router.ts                   # v3 新增：家長端查詢路由
├── firestore/
│   ├── bindings.ts                     # 管理端（v2 修改）
│   ├── vip-bindings.ts                 # v3 新增：家長端綁定 CRUD
│   └── ...
├── routes/
│   ├── dashboard/                      # v2 新增（不動）
│   │   └── ...
│   └── notify/                         # v3 新增：推播 API
│       └── index.ts                    # POST /api/notify/* 路由
└── utils/
    ├── telegram.ts                     # v3: 新增 VIP bot sendMessage
    └── ...
```

### 6.2 三後端新增（v3 推播觸發）

```
apps/manage-backend/src/
├── utils/
│   └── bot-notify.ts                   # v3 新增：推播工具函式

apps/inclass-backend/src/
├── utils/
│   └── bot-notify.ts                   # v3 新增：推播工具函式

apps/stock-backend/src/
├── utils/
│   └── bot-notify.ts                   # v3 新增：推播工具函式（預留）
```

各後端的推播工具函式：

```typescript
// bot-notify.ts（三個後端共用邏輯）
import { GoogleAuth } from 'google-auth-library';

const BOT_GATEWAY_URL = process.env.BOT_GATEWAY_URL;
const auth = new GoogleAuth();

export async function notifyParent(params: {
  tenant_id: string;
  student_id: string;
  type: string;
  title: string;
  message: string;
}) {
  if (!BOT_GATEWAY_URL) return; // 未設定則靜默跳過
  try {
    const client = await auth.getIdTokenClient(BOT_GATEWAY_URL);
    await client.request({
      url: `${BOT_GATEWAY_URL}/api/notify/${params.type.split('.')[0]}`,
      method: 'POST',
      data: params,
    });
  } catch (error) {
    console.error('[Bot Notify] Failed:', error);
    // 推播失敗不影響主流程
  }
}
```

### 6.3 Bot Dashboard 新增（v3）

```
apps/bot-dashboard/src/app/dashboard/
├── vip-bindings/page.tsx               # v3 新增：家長綁定管理
├── notifications/page.tsx              # v3 新增：推播紀錄
```

---

## 七、enabled_modules 模組控制機制（v2，不變）

（與 v2 相同，略）

### 7.1 核心概念

管理端 Bot（@cram94bot）租戶選擇啟用 manage / inclass / stock 模組。

### 7.2 Firestore binding 結構

```typescript
interface TenantBinding {
  tenant_id: string;
  tenant_name: string;
  role: string;
  enabled_modules: ('manage' | 'inclass' | 'stock')[];
}
```

### 7.3 模組 → 意圖對照

| 模組 | 管理端意圖 |
|------|----------|
| manage | manage.payment, manage.add_student, manage.query_student, manage.query_finance, manage.query_payment_history |
| inclass | inclass.leave, inclass.late, inclass.query, inclass.report |
| stock | stock.ship, stock.restock, stock.query, stock.history |

---

## 八、意圖分類總覽（v3 更新）

### 8.1 管理端意圖（@cram94bot）

| Intent ID | 模組 | 說明 | 類型 |
|-----------|------|------|------|
| inclass.leave | inclass | 登記請假 | 寫入 |
| inclass.late | inclass | 登記遲到 | 寫入 |
| inclass.query | inclass | 查出缺勤 | 查詢 |
| inclass.report | inclass | 出缺勤報告 | 查詢 |
| manage.payment | manage | 登記繳費 | 寫入 |
| manage.add_student | manage | 新增學生 | 寫入 |
| manage.query_student | manage | 查學生資料 | 查詢 |
| manage.query_finance | manage | 查財務報表 | 查詢 |
| manage.query_payment_history | manage | 查繳費紀錄 | 查詢 |
| stock.ship | stock | 出貨（減庫存） | 寫入 |
| stock.restock | stock | 進貨（加庫存） | 寫入 |
| stock.query | stock | 查庫存 | 查詢 |
| stock.history | stock | 出入貨紀錄 | 查詢 |
| system.switch | 系統 | 切換補習班 | 系統 |
| system.help | 系統 | 查看使用說明 | 系統 |

### 8.2 家長端意圖（@cram94VIPbot）— v3 新增

| Intent ID | 說明 | 類型 |
|-----------|------|------|
| vip.query_attendance | 查孩子出缺勤紀錄 | 查詢 |
| vip.query_grade | 查孩子成績 | 查詢 |
| vip.query_payment | 查繳費狀態 | 查詢 |
| vip.query_schedule | 查課表 | 查詢 |
| vip.switch_child | 切換查詢的孩子 | 系統 |
| vip.help | 查看使用說明 | 系統 |

---

## 九、API 端點總覽（v3 更新）

### 9.1 94inClass 端點

| 路由 | 方法 | 說明 | 狀態 |
|------|------|------|------|
| /api/bot/attendance/leave | POST | 登記請假 | v1 已完成 |
| /api/bot/attendance/late | POST | 登記遲到 | v1 已完成 |
| /api/bot/attendance/list | POST | 查詢出缺勤列表 | v1 已完成 |
| /api/bot/attendance/report | POST | 查詢出缺勤報告 | **v2 補齊** |
| /api/bot/data/students | POST | 取得學生名單 | v1 已完成 |
| /api/bot/data/classes | POST | 取得班級列表 | v1 已完成 |

### 9.2 94Manage 端點（掛載於 /api/bot-ext）

| 路由 | 方法 | 說明 | 狀態 |
|------|------|------|------|
| /api/bot-ext/finance/payment | POST | 登記繳費 | v1 已完成 |
| /api/bot-ext/finance/summary | POST | 查詢收費摘要 | v1 已完成 |
| /api/bot-ext/finance/history | POST | 查詢繳費紀錄 | v1 已完成（v2 接線） |
| /api/bot-ext/student/create | POST | 新增學生 | v1 已完成 |
| /api/bot-ext/student/search | POST | 搜尋學生 | v1 已完成 |
| /api/bot-ext/student/grades | POST | 查詢學生成績 | **v3 新增** |
| /api/bot-ext/student/schedule | POST | 查詢學生課表 | **v3 新增** |
| /api/bot-ext/data/students | POST | 取得學生名單 | v1 已完成 |
| /api/bot-ext/data/classes | POST | 取得班級列表 | v1 已完成 |
| /api/bot-ext/data/bindcode | POST | 生成管理端綁定碼 | **v2 補齊** |
| /api/bot-ext/data/vip-bindcode | POST | 生成家長端綁定碼 | **v3 新增** |

### 9.3 94Stock 端點

| 路由 | 方法 | 說明 | 狀態 |
|------|------|------|------|
| /api/bot/stock/ship | POST | 出貨 | v1 已完成 |
| /api/bot/stock/restock | POST | 進貨 | v1 已完成 |
| /api/bot/stock/check | POST | 查庫存 | v1 已完成 |
| /api/bot/stock/history | POST | 出入貨紀錄 | **v2 補齊** |
| /api/bot/data/items | POST | 取得品項列表 | v1 已完成 |
| /api/bot/data/warehouses | POST | 取得倉庫列表 | v1 已完成 |

### 9.4 Bot Gateway 推播 API（v3 新增）

| 路由 | 方法 | 說明 |
|------|------|------|
| /api/notify/attendance | POST | 出勤通知（到班/請假） |
| /api/notify/grade | POST | 成績通知（小考/成績單） |
| /api/notify/payment | POST | 繳費通知（提醒/確認） |
| /api/notify/course | POST | 課程通知（開課/調課） |
| /api/notify/announcement | POST | 補習班公告 |

### 9.5 統一回應格式（不變）

```json
{ "success": true, "message": "人類可讀描述", "data": { ... } }
{ "success": false, "error": "error_code", "message": "錯誤描述", "suggestions": [...] }
```

---

## 十、Bot Dashboard 功能（v3 更新）

### 10.1 Landing Page（公開）

- **Hero** — 「94CramBot AI 助手」+ 「94CramVIPBot 家長通知」
- **雙 Bot 介紹** — 管理端功能卡 + 家長端功能卡
- **整合架構** — 與三大系統的連接圖
- **定價方案** — 3 個方案（含 VIP 推播功能）
- **FAQ** — 常見問題（含 VIPBot 相關）
- **CTA Footer**

### 10.2 定價方案（v3 更新）

| | 免費版 | 基礎版 | 專業版 |
|---|---|---|---|
| 價格 | NT$0 | NT$499/月 | NT$999/月 |
| 年繳 | — | NT$5,988 | NT$11,988 |
| **管理端** | | | |
| 管理端綁定人數 | 3 人 | 10 人 | 無限 |
| 可啟用模組 | 1 個 | 2 個 | 全部 |
| AI 對話次數 | 50 次/月 | 500 次/月 | 無限 |
| 操作紀錄保留 | 7 天 | 30 天 | 90 天 |
| **家長端（VIP）** | | | |
| 家長端綁定人數 | 10 人 | 50 人 | 無限 |
| 推播通知 | ✅ | ✅ | ✅ |
| 家長查詢 | 基本（出缺勤） | 完整 | 完整 |

### 10.3 管理後台頁面（v3 更新）

| 頁面 | 路由 | 功能 |
|------|------|------|
| 總覽 | /dashboard | 管理端/家長端綁定人數、操作次數、模組狀態 |
| 管理端綁定 | /dashboard/bindings | 管理端 Telegram 綁定用戶列表 |
| 家長端綁定 | /dashboard/vip-bindings | **v3 新增** 家長綁定列表（家長名、綁定學生、時間） |
| 模組管理 | /dashboard/modules | 三模組開關 |
| 使用紀錄 | /dashboard/logs | 操作日誌 |
| 推播紀錄 | /dashboard/notifications | **v3 新增** 推播通知紀錄（時間、類型、學生、狀態） |
| 用量統計 | /dashboard/usage | API + AI + 推播用量 |
| 設定 | /dashboard/settings | 綁定碼生成（管理端 + 家長端）、歡迎訊息 |

---

## 十一、多租戶管理（v3 更新）

### 11.1 管理端綁定（與 v2 相同）

1. 主任在 Dashboard → 設定 → 生成管理端綁定碼
2. 主任在 Telegram `@cram94bot` 發送 `/bind 123456`
3. 綁定成功，啟用已開啟的模組

### 11.2 家長端綁定（v3 新增）

**流程 C（主要 — 預建對應）：**
1. 主任在 Dashboard → 設定 → 生成家長綁定碼 → 選擇學生
2. 系統產生碼，存入 `vip_bind_codes`（帶 student_id）
3. 家長在 `@cram94VIPbot` 發送 `/bind 123456`
4. 自動綁定，家長直接看到「您已綁定 [學生名]」

**流程 B（備用 — 姓名配對）：**
1. 主任生成不帶學生的通用碼
2. 家長 `/bind 123456` → Bot 問「請輸入孩子姓名」
3. 家長輸入 → 模糊匹配 → 候選列表 → 家長確認

### 11.3 防串錯

所有訊息都顯示補習班名稱和學生名稱。

---

## 十二、Firestore Collections（v3 更新）

| Collection | Document ID | 用途 | 版本 |
|-----------|-------------|------|------|
| bot_user_bindings | {telegram_user_id} | 管理端綁定 | v1 |
| vip_user_bindings | {telegram_user_id} | 家長端綁定 | **v3** |
| bot_pending_actions | auto | 待確認操作 | v1 |
| bot_tenant_cache | {tenant_id} | 租戶快取 | v1 |
| bot_operation_logs | auto | 操作/推播日誌 | v1 |
| bot_bind_codes | {code} | 管理端綁定碼 | v1 |
| vip_bind_codes | {code} | 家長端綁定碼 | **v3** |
| bot_tenant_settings | {tenant_id} | 租戶設定 | v2 |
| bot_usage_stats | {tenant_id}_{month} | 用量統計 | v2 |

---

## 十三、部署（v3 更新）

### 13.1 CI/CD

| Workflow | 觸發 | 服務 | 狀態 |
|----------|------|------|------|
| deploy-bot.yml | apps/bot-gateway/** | Bot Gateway | v1 已完成 |
| deploy-bot-dashboard.yml | apps/bot-dashboard/** | Bot Dashboard | **v2 新增** |

### 13.2 Cloud Run 設定

| 服務 | 名稱 | Port | 記憶體 |
|------|------|------|--------|
| Bot Gateway | cram94-bot-gateway | 3300 | 512MB |
| Bot Dashboard | cram94-bot-dashboard | 3301 | 256MB |

### 13.3 環境變數（v3 更新）

**Bot Gateway：**
```
# v1
TELEGRAM_BOT_TOKEN=
GEMINI_API_KEY=
MANAGE_URL=
INCLASS_URL=
STOCK_URL=
SERVICE_URL=
GCP_PROJECT_ID=cram94-manage-system

# v2
JWT_SECRET=

# v3
TELEGRAM_VIP_BOT_TOKEN=              # VIPBot 的 Token
```

**三後端新增：**
```
BOT_GATEWAY_URL=https://cram94-bot-gateway-1015149159553.asia-east1.run.app
```

### 13.4 Telegram Webhook 設定

```bash
# 管理端 Bot
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://cram94-bot-gateway-1015149159553.asia-east1.run.app/webhook/telegram"

# 家長端 VIPBot
curl -X POST "https://api.telegram.org/bot${TELEGRAM_VIP_BOT_TOKEN}/setWebhook" \
  -d "url=https://cram94-bot-gateway-1015149159553.asia-east1.run.app/webhook/telegram-vip"
```

---

## 十四、安全機制（v3 更新）

| 層級 | 機制 |
|------|------|
| 1. Telegram 綁定 | 管理端 + 家長端各自綁定碼 |
| 2. GCP IAM | Bot Gateway ↔ 三後端 + 三後端 → Bot Gateway 推播 |
| 3. tenant_id 隔離 | 管理端/家長端都只存取已綁定的 tenant |
| 4. 模組隔離 | 管理端 Bot 只執行已啟用模組 |
| 5. 角色隔離 | 家長端只能查詢，不能寫入 |
| 6. 確認機制 | 管理端寫入需確認（家長端無寫入） |
| 7. 操作日誌 | 所有操作 + 推播記錄 |
| 8. 速率限制 | 管理端 30/min，家長端 20/min |
| 9. Dashboard JWT | 管理後台 JWT 驗證 |
| 10. 用量限制 | 依方案限制 |

---

## 十五、不動的東西

- 現有 `/api/*` 路由完全不動
- 現有 middleware 完全不動
- 現有 Drizzle schema 完全不動
- 現有三個 Dashboard 完全不動
- v1/v2 已完成的功能保持不動，只做擴充
