# 94CramBot 雙機器人完整規劃書
> 版本：v1.0 | 2026-02-25 | 千里眼 × 順風耳
> 附件：`BOT_PERSONA_千里眼.md` / `BOT_PERSONA_順風耳.md`

---

## 一、架構總覽

```
                    ┌─────────────────────────────────────┐
                    │         Cloud Run (bot-gateway)       │
                    │              Port 3300                │
                    │                                       │
    Telegram ──────►│  /webhook/telegram      → 千里眼邏輯  │
    @cram94_bot     │  ├─ AI Intent Parser (Gemini)         │
                    │  ├─ confirm-manager (寫入二次確認)     │
                    │  └─ 呼叫 manage/inclass/stock API      │
                    │                                       │
    Telegram ──────►│  /webhook/telegram-parent → 順風耳邏輯 │
    @Cram94_VIP_bot │  ├─ Keyword + Gemini Intent Parser    │
                    │  ├─ 只能查詢，不能寫入                 │
                    │  ├─ 知識庫 fallback                    │
                    │  └─ cross-bot-bridge (代請假)          │
                    │                                       │
                    │  /api/*  → Dashboard REST API          │
                    │                                       │
                    │  Firestore (狀態/綁定/知識庫/queue)    │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
                    │    manage / inclass / stock backends  │
                    │    /api/parent-ext/* (家長查詢)       │
                    │    /api/bot-ext/*    (千里眼操作)     │
                    └─────────────────────────────────────┘
```

---

## 二、雙 Bot 對照表

| 項目 | 🏫 千里眼 | 👨‍👩‍👧 順風耳 |
|------|----------|-----------|
| **Telegram** | @cram94_bot | @Cram94_VIP_bot |
| **蜂神榜階級** | L3 千里眼 | L3 順風耳 |
| **服務對象** | 班主任、行政人員 | 學生家長 |
| **性格** | 資深行政秘書：專業、俐落、直接 | 櫃台姐姐：溫暖、耐心、有禮 |
| **稱呼用戶** | 「你」（同事） | 「您」（客戶敬語） |
| **權限** | 讀 + 寫（寫入需確認） | **只讀**（唯一例外：代請假轉交千里眼） |
| **操作範圍** | manage + inclass + stock 全部 | 只有綁定孩子的出勤/成績/繳費/課表 |
| **AI 模型** | Gemini 2.0 Flash | Gemini 2.0 Flash |
| **語氣** | 簡潔直接，emoji ≤ 5 | 溫暖親切，emoji ≤ 6 |
| **壞消息** | 直說：「庫存不足！」 | 委婉：「有一筆待繳款項」 |
| **不認識的問題** | 「我專門管行政的」 | 查知識庫 → 轉老師 |
| **字數上限** | 300 字/訊息 | 350 字/訊息 |
| **認證** | Firestore 綁定碼（6 碼） | Firestore 家長邀請碼（6 碼） |

---

## 三、互動流程

### 3.1 家長代請假（最核心跨 Bot 流程）

```
家長 ──(順風耳)──► 確認請假資訊
                    │
                    ▼
            Firestore bot_cross_bot_queue
            { type: 'leave_request', status: 'pending' }
                    │
                    ▼
        千里眼主動推送給班主任：
        「📨 家長通知：小明 02/27 請假（回診）」
        [✅ 確認] [❌ 拒絕]
                    │
            ┌───────┴───────┐
            ▼               ▼
         確認             拒絕（附理由）
            │               │
            ▼               ▼
    更新 queue           更新 queue
    status=approved      status=rejected
            │               │
            ▼               ▼
    順風耳通知家長：     順風耳通知家長：
    「✅ 已核准」        「老師回覆：那天有考試...」
```

### 3.2 家長問知識庫外的問題

```
家長 ──(順風耳)──► 解析意圖 → unknown
                    │
                    ▼
              搜尋知識庫
              ┌──── 命中 → 直接回覆
              └──── 沒命中
                    │
                    ▼
        「這個問題我幫您問一下老師 🙏」
                    │
                    ▼
            Firestore queue → 千里眼 → 班主任
                    │
                    ▼（班主任回覆後）
        順風耳用自己的語氣重新包裝回覆家長
```

### 3.3 系統自動推播

```
inclass-backend 出席事件
        │
        ▼
  bot-gateway listener
        │
        ▼
  查詢 bot_parent_bindings
  → 找到該學生綁定的家長
        │
        ▼
  順風耳推播：「🔔 小明已到班！」
```

---

## 四、Firestore Collections 總覽

| Collection | 用途 | 屬於 |
|-----------|------|------|
| `bot_user_bindings` | 千里眼用戶綁定 | 千里眼 |
| `bot_bind_codes` | 千里眼綁定碼 | 千里眼 |
| `bot_tenant_settings` | 租戶設定（模組開關） | 共用 |
| `bot_tenant_cache` | 租戶快取（學生/品項） | 千里眼 |
| `bot_usage_stats` | 用量統計 | 共用 |
| `bot_operation_logs` | 操作日誌 | 千里眼 |
| `bot_pending_actions` | 待確認操作 | 千里眼 |
| `bot_parent_bindings` | 順風耳家長綁定 | 順風耳 |
| `bot_parent_invites` | 家長邀請碼 | 順風耳 |
| `bot_subscriptions` | 訂閱狀態 | 共用 |
| `bot_notifications` | 推播紀錄 | 順風耳 |
| `bot_knowledge_base` | 知識庫 | 順風耳 |
| `bot_cross_bot_queue` | 跨 Bot 通訊 queue | 共用 |

---

## 五、隱私與安全邊界

| 規則 | 說明 |
|------|------|
| 家長只查自己孩子 | parent_bindings 限制 student_id |
| 千里眼只查自己補習班 | tenant_id 隔離 |
| 順風耳不洩漏千里眼存在 | 家長不需知道有「管理員 Bot」 |
| 順風耳不洩漏其他家長/學生 | 嚴禁跨學生查詢 |
| 成績低於平均不顯示平均 | 避免比較壓力 |
| 千里眼不洩漏系統架構 | API key、tenant_id 等不說 |
| 跨 Bot 訊息經語氣轉換 | 班主任原話不直接轉給家長 |
| 嚴重狀況轉人工 | 連續缺席/長期欠費 → 建議聯繫老師 |

---

## 六、訂閱方案

| 方案 | 千里眼 | 順風耳 | 家長上限 | AI Calls/月 | 月費 |
|------|--------|--------|---------|-------------|------|
| 免費 | ✅ | ❌ | — | 100 | NT$0 |
| 基礎 | ✅ | ✅ | 50 | 500 | NT$299 |
| 專業 | ✅ | ✅ | 200 | 2,000 | NT$599 |
| 企業 | ✅ | ✅ | 無上限 | 無上限 | NT$999 |

---

## 七、檔案索引

| 檔案 | 內容 |
|------|------|
| `docs/BOT_PERSONA_千里眼.md` | 千里眼完整角色定義（人格 + System Prompt + 測試用例） |
| `docs/BOT_PERSONA_順風耳.md` | 順風耳完整角色定義（人格 + System Prompt + 測試用例） |
| `docs/94CRAMBOT_UPGRADE_PLAN.md` | 升級規劃書（Phase 1-5 執行計劃） |
| `apps/bot-gateway/` | 後端（雙 webhook + REST API + cross-bot bridge） |
| `apps/bot-dashboard/` | 前端（首頁 + 登入 + 管理介面） |
