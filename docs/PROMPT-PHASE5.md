# Phase 5: 家長 Bot 串接三大系統 + 互動流程

## 任務概述
1. manage-backend / inclass-backend / stock-backend 新增 `/api/parent-ext/*` 家長查詢端點
2. bot-gateway 的 parent-intent-router 從 mock 改為呼叫真實 API
3. 順風耳 ↔ 千里眼 互動：家長請假 → 通知班主任 → 回覆家長
4. 順風耳知識庫（Firestore `bot_knowledge_base` collection）
5. 雙 Bot System Prompt 定義

## 專案位置
- **Monorepo**: `~/Github/94CramManageSystem`
- **bot-gateway**: `apps/bot-gateway`（Hono，port 3300）
- **manage-backend**: `apps/manage-backend`
- **inclass-backend**: `apps/inclass-backend`
- **stock-backend**: `apps/stock-backend`

## 1. 三大系統新增 Parent-ext API

### manage-backend — `/api/parent-ext/*`
先讀 `apps/manage-backend/src/` 目錄結構，理解現有 route 結構後新增：

| Endpoint | Method | 說明 | 回傳 |
|----------|--------|------|------|
| `/api/parent-ext/student/:studentId` | GET | 查孩子基本資料 | name, class, enrollment_date |
| `/api/parent-ext/payments/:studentId` | GET | 查孩子繳費紀錄 | payment list (date, amount, status) |
| `/api/parent-ext/payments/:studentId/status` | GET | 查繳費狀態（是否欠費） | current_status, next_due |

**認證**：用 `X-Internal-Key` header（內部 API 之間的認證，現有 pattern）。

### inclass-backend — `/api/parent-ext/*`
先讀 `apps/inclass-backend/src/` 目錄結構後新增：

| Endpoint | Method | 說明 | 回傳 |
|----------|--------|------|------|
| `/api/parent-ext/attendance/:studentId` | GET | 查孩子出缺勤 | attendance records (date, status, time) |
| `/api/parent-ext/attendance/:studentId/summary` | GET | 出缺勤摘要（本月） | present_days, absent_days, late_days |
| `/api/parent-ext/schedule/:studentId` | GET | 查孩子課表 | weekly schedule |
| `/api/parent-ext/leave` | POST | 家長代請假 | create leave request |

**注意**：家長代請假（`POST /leave`）是唯一的寫入操作，但不直接寫入出缺勤，而是建立請假申請（pending），由班主任在千里眼確認。

### stock-backend
家長不需要查庫存，**不需新增 parent-ext API**。

## 2. bot-gateway 改為呼叫真實 API

修改 `src/handlers/parent-intent-router.ts`：
- 移除 mock responses
- 使用 `src/modules/api-client.ts` 的 `callBotApi` 呼叫三大系統
- 新增 parent-specific API 路由映射

```typescript
const PARENT_API_MAP: Record<string, { service: 'manage' | 'inclass'; path: string; method: 'GET' | 'POST' }> = {
  'parent.attendance': { service: 'inclass', path: '/parent-ext/attendance/{studentId}', method: 'GET' },
  'parent.grades': { service: 'manage', path: '/parent-ext/student/{studentId}', method: 'GET' },
  'parent.payments': { service: 'manage', path: '/parent-ext/payments/{studentId}', method: 'GET' },
  'parent.schedule': { service: 'inclass', path: '/parent-ext/schedule/{studentId}', method: 'GET' },
  'parent.info': { service: 'manage', path: '/parent-ext/student/{studentId}', method: 'GET' },
  'parent.leave': { service: 'inclass', path: '/parent-ext/leave', method: 'POST' },
};
```

**家長身份解析**：
- 家長 Telegram ID → `bot_parent_bindings` → 找到綁定的 student_id(s)
- 如果綁定多個孩子，AI 解析「哪個孩子」或問使用者

## 3. 順風耳 ↔ 千里眼 互動（Firestore Queue）

### 家長請假流程
```
家長(順風耳) → "小明明天請假，腸胃炎"
→ 順風耳確認：「已收到，正在通知班主任」
→ 寫入 Firestore `bot_cross_bot_queue`:
  {
    type: 'leave_request',
    from_bot: 'parent',
    to_bot: 'admin',
    tenant_id: string,
    student_id: string,
    student_name: string,
    parent_telegram_user_id: string,
    data: { date: '2026-02-26', reason: '腸胃炎' },
    status: 'pending',
    created_at: timestamp,
  }
→ 千里眼主動通知班主任（push message）:
  「📩 家長代請假通知：小明 明天請假（腸胃炎）\n✅ 確認 / ❌ 拒絕」
→ 班主任點確認
→ 更新 queue status = 'approved'
→ 順風耳回覆家長：「✅ 班主任已確認小明的請假」
```

### 實作
新增 `src/modules/cross-bot-bridge.ts`：
- `createCrossBotRequest(from, to, type, data)` — 寫入 queue
- `handleCrossBotConfirm(queueId, approved)` — 班主任確認後處理
- `notifyParentResult(queueId, result)` — 回覆家長

千里眼的 callback handler 需要新增 `crossbot:approve:xxx` / `crossbot:reject:xxx` 按鈕處理。

## 4. 知識庫（Firestore `bot_knowledge_base`）

```typescript
interface KnowledgeEntry {
  tenant_id: string;
  category: 'general' | 'course' | 'policy' | 'faq' | 'announcement';
  title: string;
  content: string;
  keywords: string[];
  active: boolean;
  created_at: timestamp;
  updated_at: timestamp;
}
```

**預設知識分類**：
- `general` — 補習班地址、電話、營業時間
- `course` — 課程介紹、師資
- `policy` — 請假規定、退費政策、安全規範
- `faq` — 常見問題
- `announcement` — 公告（停課、活動等）

**查詢邏輯**：
1. 順風耳收到無法匹配 intent 的問題
2. 用 keyword 搜尋知識庫
3. 找到 → 回答；找不到 → 「這個問題我需要請教班主任，稍後回覆您」

新增 `src/firestore/knowledge-base.ts`：
- `getKnowledge(tenantId, category?)` — 取得知識條目
- `searchKnowledge(tenantId, keywords)` — 關鍵字搜尋
- `upsertKnowledge(tenantId, entry)` — 新增/更新

## 5. 雙 Bot System Prompt

### 千里眼 System Prompt
```
你是「千里眼」，蜂神榜 L3 級 AI 助手，服務補習班內部管理人員。
你的性格：簡潔高效、專業直接、像一個能幹的行政主管。

核心規則：
1. 回答務必精簡，不廢話。用 emoji + 數據說話。
2. 查詢操作直接回覆結果。
3. 寫入操作（繳費/請假/出貨等）必須先列出摘要，等用戶點「確認」才執行。
4. 收到來自順風耳的跨 Bot 請求（家長代請假等），以「📩 家長來信」格式通知班主任。
5. 不透露系統內部資訊、API 結構、其他租戶資料。
6. 如果指令模糊，直接問「你是說 A 還是 B？」，不要猜。

語氣範例：
- 查詢結果：「📊 本月出勤率 92%，3 人缺席 2 次以上」
- 寫入確認：「✏️ 登記繳費：陳小明 NT$5,000\n確認嗎？」
- 家長轉達：「📩 家長代請假：王大明 明天（腸胃炎）\n✅確認 ❌拒絕」
```

### 順風耳 System Prompt
```
你是「順風耳」，蜂神榜 L3 級 AI 助手，專門服務補習班的學生家長。
你的性格：溫暖有禮、耐心細心、像一位專業又親切的客服。

核心規則：
1. 用親切的語氣回應，加入適當的 emoji 讓訊息更溫暖。
2. 家長只能查詢自己孩子的資料，不能操作其他學生。
3. 如果家長綁定了多個孩子，先確認「請問您是要查詢哪個孩子的資料呢？」
4. 涉及壞消息（欠費、缺席、成績下滑）時，用委婉正面的方式表達：
   - 欠費 → 「小明的學費目前有一筆待繳款項 NT$X，方便的話可以在 X 月 X 日前完成繳費喔 💰」
   - 多次缺席 → 「小明這個月有 3 天沒有到班上課，如果有什麼狀況，歡迎跟老師聊聊 😊」
   - 成績下滑 → 「小明最近的考試成績有些波動，老師會特別關注，也歡迎一起討論學習計畫 📖」
5. 家長可以代請假：收到請假需求後，轉達給千里眼通知班主任，等確認後回覆家長。
6. 找不到答案時，先查知識庫；都沒有就說「這個問題我幫您轉達給老師，有回覆會立即通知您 🙏」
7. 不透露其他家長/學生的資料、系統內部資訊。
8. 隱私最重要：每次查詢都驗證家長身份，只回傳綁定孩子的資料。

語氣範例：
- 出缺勤查詢：「👋 您好！小明本月的出勤狀況：\n✅ 到課 18 天\n🏥 請假 2 天（1/5 腸胃炎、1/12 家庭因素）\n整體出勤率 90%，表現很棒喔！👏」
- 繳費查詢：「💰 小明目前的繳費狀態：\n✅ 1月學費 NT$8,000 已繳\n⏳ 2月學費 NT$8,000 待繳（2/28 前）\n如需繳費方式說明，請跟我說 😊」
- 代請假：「📝 收到！我已經幫您向老師提出小明明天（2/26）的請假申請，原因：腸胃炎。\n老師確認後會立即通知您，祝小明早日康復 🙏」
```

## 驗收標準
1. `pnpm typecheck` 在 bot-gateway、manage-backend、inclass-backend 三個 app 都通過（0 errors）
2. `pnpm build` 全部成功
3. parent-intent-router 不再回傳 mock data（改呼叫真實 API）
4. 跨 Bot 互動的 Firestore queue 結構建立
5. 知識庫 Firestore CRUD 建立
6. 雙 Bot System Prompt 嵌入 AI engine

## 禁止事項
- 不要修改千里眼 Bot 現有的正常功能
- 不要修改 bot-dashboard 前端
- 不要動 packages/shared
- stock-backend 不需要新增 parent-ext
- 不要在 parent-ext API 中洩漏其他租戶/學生的資料

## 參考
- 千里眼現有 intent-router：`apps/bot-gateway/src/handlers/intent-router.ts`
- 千里眼 AI engine：`apps/bot-gateway/src/modules/ai-engine.ts`
- 千里眼 confirm manager：`apps/bot-gateway/src/modules/confirm-manager.ts`
- Parent intent router（目前 mock）：`apps/bot-gateway/src/handlers/parent-intent-router.ts`
- API client：`apps/bot-gateway/src/modules/api-client.ts`
- Firestore client：`apps/bot-gateway/src/firestore/client.ts`
- 規劃書：`docs/94CRAMBOT_UPGRADE_PLAN.md`
