# 94BOT Dashboard - AI 助教管理系統完整設計

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立完整的 94BOT Dashboard，涵蓋四個 Bot (千里眼/順風耳/神算子/聞仲老師) 的 AI prompt 設定、模型參數調整、對話紀錄管理、Bot 狀態監控、知識庫管理、統計分析、綁定管理、訂閱計費與系統設定。

**Architecture:** Firestore-Native 全棧。bot-dashboard (Next.js) 透過 proxy 呼叫 bot-gateway (Hono API)，所有資料存 Firestore，知識庫檔案存 GCS，AI 用 Gemini API。

**Tech Stack:** Next.js + TypeScript + Tailwind CSS (莫蘭迪色系) + Recharts / Hono + Firestore + GCS + Gemini API

---

## 1. 整體架構

### 系統架構

```
bot-dashboard (Next.js :3202)
  -> /api/[...path] proxy
    -> bot-gateway (Hono API)
      -> Firestore (設定/對話/綁定)
      -> GCS (知識庫檔案)
      -> Gemini API (embedding/爬取解析)
```

### 頁面結構 (Sidebar 導航)

```
94BOT Dashboard
+-- 總覽 /dashboard
|   +-- 4 個 Bot 狀態卡片、今日對話數、用量摘要
|
+-- Bot 管理
|   +-- 千里眼 (Admin Bot)    /dashboard/clairvoyant
|   +-- 順風耳 (Parent Bot)   /dashboard/windear
|   +-- 神算子 (Student Bot)  /dashboard/ai-tutor
|   +-- 聞仲老師 (LINE Bot)   /dashboard/wentaishi
|       (每個 Bot 子頁面包含: prompt 編輯、模型參數、狀態監控)
|
+-- 對話紀錄 /dashboard/conversations
|   +-- 統一查詢所有 Bot 的對話，支援篩選/搜尋/匯出
|
+-- 知識庫 /dashboard/knowledge-base
|   +-- Q&A 管理
|   +-- 檔案上傳
|   +-- 網頁爬取
|
+-- 統計分析 /dashboard/analytics
|   +-- 用量圖表、熱門問題、回應品質、各 Bot 比較
|
+-- 綁定管理 /dashboard/bindings
|   +-- 四個 Bot 的邀請碼/綁定用戶統一管理
|
+-- 訂閱與計費 /dashboard/plans
|   +-- 方案管理、用量限額
|
+-- 系統設定 /dashboard/settings
    +-- 歡迎訊息、啟用模組、log 保留天數
```

### 角色權限

| 功能 | admin | staff |
|------|-------|-------|
| Bot prompt 編輯 | YES | NO |
| 模型參數調整 | YES | NO |
| 知識庫管理 | YES | NO |
| 對話紀錄查看 | YES | YES |
| 統計分析查看 | YES | YES |
| 綁定管理 | YES | NO |
| 訂閱/計費 | YES | NO |
| 系統設定 | YES | NO |

---

## 2. Bot Prompt 管理與模型參數

### Firestore Collection: `bot-prompt-settings`

```typescript
interface BotPromptSettings {
  botType: 'clairvoyant' | 'windear' | 'ai-tutor' | 'wentaishi';
  tenantId: string;

  // 結構化欄位 (表單模式)
  structured: {
    roleName: string;
    roleDescription: string;
    toneRules: string[];
    forbiddenActions: string[];
    capabilities: string[];
    knowledgeScope: string;
    customRules: string[];
  };

  // 完整 prompt (進階模式)
  fullPrompt: string;

  // 使用哪個模式
  mode: 'structured' | 'advanced';

  // 聞仲老師特有: 三種子 prompt (parent/student/default)
  subPrompts?: Record<string, {
    structured: BotPromptSettings['structured'];
    fullPrompt: string;
    mode: 'structured' | 'advanced';
  }>;

  // 模型參數
  model: {
    name: string;           // 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro'
    temperature: number;    // 0.0 - 2.0
    maxOutputTokens: number;// 256 - 8192
    topP: number;           // 0.0 - 1.0
    topK: number;           // 1 - 100
  };

  updatedAt: Date;
  updatedBy: string;
}
```

### Prompt 編輯 UI

- **結構化模式 (預設):** 表單欄位獨立編輯 (角色設定、語氣規則、禁止事項、能力範圍、自訂規則)
- **進階模式:** 完整 textarea 自由編輯
- **預覽面板:** 即時顯示組合後的完整 prompt (唯讀)
- **恢復預設按鈕:** 還原為 hardcoded 預設值

### 模型參數 UI

- 模型選擇: 下拉選單 (flash-lite / flash / pro)
- Temperature: 滑桿 0.0-2.0
- Max Tokens: 滑桿 256-8192
- Top P: 滑桿 0.0-1.0
- Top K: 滑桿 1-100
- 預估成本顯示

### bot-gateway 整合

- 啟動時從 Firestore 載入所有 tenant 的 prompt 設定，快取在記憶體
- Dashboard 更新設定時，API 回傳成功後同時清除快取
- `ai-engine.ts` 的 `buildXxxSystemPrompt()` 改為: 先查快取 -> 有設定用設定 -> 沒設定用現有 hardcoded 預設值 (向下相容)

---

## 3. 對話紀錄管理

### Firestore Collection: `bot-conversations`

```typescript
interface BotConversation {
  id: string;
  tenantId: string;
  botType: 'clairvoyant' | 'windear' | 'ai-tutor' | 'wentaishi';
  platform: 'telegram' | 'line';

  userId: string;
  userName: string;
  userRole: 'admin' | 'parent' | 'student' | 'guest';

  userMessage: string;
  botReply: string;
  intent: string;

  model: string;
  latencyMs: number;
  tokensUsed?: number;

  createdAt: Date;
}
```

### 功能

- **篩選:** 按 Bot 類型、平台、用戶角色、日期範圍、intent
- **搜尋:** 訊息內容關鍵字搜尋 (Firestore prefix search)
- **分頁:** 每頁 50 筆，cursor-based pagination
- **匯出:** CSV 格式下載 (前端生成，上限 5,000 筆)
- **準即時:** 每 30 秒自動輪詢，頂部提示「有 N 筆新對話」
- **詳情展開:** 點擊列展開完整對話內容 + metadata

### 遷移策略

- 新對話寫入 `bot-conversations`
- 舊 `student-conversations` 資料保留，Dashboard 查詢時同時查兩個 collection
- 未來可選擇性批次遷移舊資料

---

## 4. 知識庫管理

### Firestore Collection: `knowledge-base`

```typescript
interface KnowledgeEntry {
  id: string;
  tenantId: string;
  type: 'qa' | 'file' | 'webpage';

  // Q&A
  question?: string;
  answer?: string;

  // 檔案
  fileName?: string;
  fileUrl?: string;
  fileMimeType?: string;
  fileSize?: number;

  // 網頁爬取
  sourceUrl?: string;
  lastCrawledAt?: Date;
  crawlStatus?: 'pending' | 'processing' | 'completed' | 'failed';

  // 共用
  title: string;
  content: string;
  tags: string[];
  embedding?: number[];      // Gemini text-embedding 768 維

  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### GCS 儲存

- Bucket: `cram94-knowledge-base`
- 路徑: `{tenantId}/{entryId}/{fileName}`
- 支援: PDF, Word (.docx), PNG/JPG, 純文字
- 單檔上限: 10MB / 每 tenant 總上限: 500MB

### 處理流程

- **檔案:** 上傳 -> GCS -> Gemini 解析內容 -> 存 content + embedding
- **網頁:** URL -> fetch HTML -> 提取純文字 -> Gemini 摘要 -> 存 content + embedding
- **AI 引用:** 用戶提問 -> embedding 查詢向量 -> Firestore vector search top-5 -> 注入 system prompt

### 安全考量

- MIME type 驗證 (不信任副檔名)
- GCS signed URL (1 小時有效)
- 網頁爬取: 僅 HTTP/HTTPS、排除內網 IP、timeout 10 秒
- 每 tenant 每日爬取上限 20 次

---

## 5. 統計分析與 Bot 狀態監控

### Firestore Collection: `bot-health`

```typescript
interface BotHealth {
  botType: 'clairvoyant' | 'windear' | 'ai-tutor' | 'wentaishi';
  tenantId: string;
  platform: 'telegram' | 'line';

  webhookActive: boolean;
  lastEventAt: Date;
  lastReplyAt: Date;
  lastErrorAt?: Date;
  lastError?: string;

  messagesReceived24h: number;
  repliesSent24h: number;
  errors24h: number;
  avgLatencyMs24h: number;

  updatedAt: Date;
}
```

### 健康檢查機制

- bot-gateway 每次處理 webhook 事件時更新 `bot-health` (fire-and-forget)
- 每 5 分鐘匯總一次 24h 統計
- Dashboard 每 30 秒輪詢
- 狀態判定: 綠 (< 30 分鐘) / 黃 (30 分鐘 ~ 24 小時) / 紅 (> 24 小時 或 errors > 10)

### 總覽 Dashboard

- 三個摘要卡片: 今日對話、本月對話、活躍用戶
- 四個 Bot 狀態卡片: 狀態燈號、最後活動、平均延遲、今日收/回/錯
- 用量趨勢折線圖 (近 7 天，按 Bot 分色)

### 統計分析頁面

- 對話量趨勢圖 (可按 Bot/時間範圍篩選)
- 回應品質: 平均延遲、錯誤率、token 使用量
- 熱門問題 Top 10
- 用戶活躍度圓餅圖 (按角色分布)
- Bot 比較長條圖

### 圖表套件: Recharts

---

## 6. 綁定管理

統一介面管理四個 Bot 的綁定，tab 切換:

- 千里眼: 現有 `bot_user_bindings` + `bot_bind_codes`
- 順風耳: 現有 `parent-bindings` + `parent-invites`
- 神算子: 現有 `student-bindings` + `student-invites`
- 聞仲老師: 新增 LINE 綁定管理

每個 tab 顯示: 已綁定用戶列表 (含解除按鈕) + 邀請碼列表 (含產生/刪除)

---

## 7. 訂閱與計費

沿用現有 `subscriptions` collection:

- 三個方案卡片: 免費 / 基本 (NT$299) / 專業 (NT$599)
- 用量進度條: AI 呼叫次數、知識庫容量
- 方案比較表

---

## 8. 系統設定

沿用現有 `settings` collection，擴充:

- 歡迎訊息 (textarea)
- 啟用模組 (checkbox: manage/inclass/stock)
- Log 保留天數 (下拉選單)
- 通知設定: Bot 異常通知、每日摘要報告

---

## 9. 新增 API Endpoints (bot-gateway)

```
# Prompt 管理
GET    /api/bot-prompts/:botType          取得 prompt 設定
PUT    /api/bot-prompts/:botType          更新 prompt 設定
POST   /api/bot-prompts/:botType/reset    恢復預設

# 知識庫
GET    /api/knowledge-base                列表 (type/tag 篩選)
POST   /api/knowledge-base                新增 Q&A
POST   /api/knowledge-base/upload         上傳檔案
POST   /api/knowledge-base/crawl          爬取網頁
PUT    /api/knowledge-base/:id            更新
DELETE /api/knowledge-base/:id            刪除

# 對話紀錄 (擴充)
GET    /api/conversations                 統一查詢所有 Bot
GET    /api/conversations/export          匯出 CSV

# Bot 狀態
GET    /api/bot-health                    所有 Bot 健康狀態

# 統計分析 (擴充)
GET    /api/analytics/overview            總覽數據
GET    /api/analytics/trends              趨勢圖表
GET    /api/analytics/top-questions       熱門問題
```

### 權限中介層

```typescript
function requireAdmin(c, next) {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin required' }, 403);
  return next();
}

// admin only: bot-prompts, knowledge-base, bindings, subscriptions, settings
// admin + staff: conversations, analytics, bot-health (GET only)
```

---

## 10. 決策紀錄

| 決策 | 選項 | 結果 |
|------|------|------|
| Bot prompt 範圍 | 部分 vs 全部 | 全部四個 Bot |
| 功能範圍 | 分階段 vs 全部 | 全部 8 個功能模組 |
| 角色權限 | 單一/兩層/三層 | 兩層: admin + staff |
| Prompt 編輯介面 | 簡單/結構化/混合 | 混合: 結構化 + 進階模式 |
| 知識庫範圍 | 文字/檔案/爬取 | 全部: 文字 + 檔案 + 爬取 |
| 對話即時性 | 非即時/輪詢/串流 | 準即時 (30 秒輪詢) |
| 資料架構 | Firestore/混合/全 PG | Firestore-Native |
