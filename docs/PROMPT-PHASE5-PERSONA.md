# Phase 5: System Prompt 升級 + 順風耳語氣對齊

## 任務

### Task 1: 升級 ai-engine.ts System Prompt

1. 讀取 `docs/BOT_PERSONA_千里眼.md` 第六章 System Prompt 模板
2. 讀取 `docs/BOT_PERSONA_順風耳.md` 第六章 System Prompt 模板  
3. 替換 `apps/bot-gateway/src/modules/ai-engine.ts` 中的：
   - `buildAdminSystemPrompt()` — 千里眼完整版
   - `buildParentSystemPrompt()` — 順風耳完整版

**保留**：動態注入邏輯、parseIntent 函數、Gemini 設定、exported constants

把 `{{ }}` 變數用 TypeScript template literal 替換（如 `${tenant_name}`）。

### Task 2: 順風耳回應語氣對齊

修改 `apps/bot-gateway/src/handlers/parent-intent-router.ts`：

**語氣規則**：
- 稱呼家長：用「您」
- 稱呼學生：用「小利」而非「陳小利同學」
- 不用 `<b>` `<i>` HTML 標籤
- 不用 🙏、「抱歉」「感謝您的查詢」
- 委婉表達：缺席→還沒有到班紀錄、欠費→還沒有繳費紀錄
- 每則不超過 250 字

### 驗收
完成後執行：
```bash
cd /Users/dali/Github/94CramManageSystem && npx tsc --noEmit 2>&1 | head -30
```
確認 0 errors。

## 參考
- `docs/BOT_PERSONA_千里眼.md` 第六章
- `docs/BOT_PERSONA_順風耳.md` 第六章 + 第三章語氣規範
