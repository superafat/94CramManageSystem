# Phase 4: Portal 串接 + 部署

## 任務概述
1. 修改 Portal 的 Bot 連結指向 bot-dashboard
2. 建立 CI/CD workflow
3. Docker build 驗證
4. Cloud Run 部署

## 專案位置
- **Monorepo**: `~/Github/94CramManageSystem`
- **apps/portal**: `apps/portal`（Next.js，port 3300）
- **apps/bot-dashboard**: `apps/bot-dashboard`（Next.js，port 3400）
- **apps/bot-gateway**: `apps/bot-gateway`（Hono，port 3300）

## 具體任務

### 1. Portal Bot 連結修改
修改 `apps/portal/src/app/page.tsx`：

```typescript
// 現有
{
  key: 'bot',
  emoji: '🤖',
  name: '94CramBot AI 助手',
  url: 'https://t.me/cram94bot',
  ...
}

// 改為
{
  key: 'bot',
  emoji: '🤖',
  name: '94CramBot AI 助手',
  // 生產環境用 Cloud Run URL，开发/測試用 localhost:3400
  url: process.env.BOT_DASHBOARD_URL || 'http://localhost:3400',
  ...
}
```

環境變數 `BOT_DASHBOARD_URL` 在部署時傳入。

### 2. CI/CD Workflow — deploy-bot.yml
新建 `.github/workflows/deploy-bot.yml`：

**觸發條件**：
- `push` 到 `main` branch
- 改動路徑：`apps/bot-dashboard/**` 或 `apps/bot-gateway/**`

**Jobs**：
1. **build-and-deploy-dashboard**:
   - Checkout code
   - Setup pnpm
   - `pnpm install`
   - `pnpm --filter @94cram/bot-dashboard build`
   - Auth GCP (`google-github-actions/auth`)
   - Configure Docker buildx
   - Build & push to Artifact Registry (`cram94/bot-dashboard:latest`)
   - Deploy to Cloud Run (`cram94-bot-dashboard`)

2. **build-and-deploy-gateway**:
   - 同樣流程，只是對 `bot-gateway`
   - Artifact Registry: `cram94/bot-gateway:latest`
   - Cloud Run service: `cram94-bot-gateway`
   - 環境變數傳入：
     - `TELEGRAM_BOT_TOKEN`（千里眼）
     - `TELEGRAM_PARENT_BOT_TOKEN`（順風耳）
     - `GEMINI_API_KEY`
     - `MANAGE_URL`, `INCLASS_URL`, `STOCK_URL`
     - `GCP_PROJECT_ID`
     - `JWT_SECRET`
     - `BOT_DASHBOARD_URL`

### 3. 本地 Docker Build 測試

**bot-dashboard**:
```bash
cd apps/bot-dashboard
docker build -t cram94-bot-dashboard:test --platform linux/amd64 .
docker run -p 3400:3400 cram94-bot-dashboard:test
# 驗證 http://localhost:3400 可訪問
```

**bot-gateway**:
```bash
cd apps/bot-gateway
docker build -t cram94-bot-gateway:test --platform linux/amd64 .
docker run -p 3300:3300 cram94-bot-gateway:test
# 驗證 http://localhost:3300/health 回 {"status":"ok"}
```

### 4. Cloud Run 部署（如權限允許）

**先決條件**：
- GCP 認證已設定（`gcloud auth`）
- Artifact Registry `cram94` 已存在
- Cloud Run API 已啟用

**部署指令**（如果 CI/CD 失敗時手動用）：

```bash
# bot-dashboard
gcloud run deploy cram94-bot-dashboard \
  --image asia-east1-docker.pkg.dev/cram94-manage-system/cram94/bot-dashboard:latest \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --port 3400

# bot-gateway
gcloud run deploy cram94-bot-gateway \
  --image asia-east1-docker.pkg.dev/cram94-manage-system/cram94/bot-gateway:latest \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --port 3300 \
  --set-env-vars TELEGRAM_BOT_TOKEN=...,TELEGRAM_PARENT_BOT_TOKEN=...
```

### 5. 設定 Webhook（部署成功後）

千里眼 Bot：
```
https://cram94-bot-gateway-xxxx.asia-east1.run.app/webhook/telegram
```

順風耳 Bot：
```
https://cram94-bot-gateway-xxxx.asia-east1.run.app/webhook/telegram-parent
```

用 @BotFather 的 `/setwebhook` 指令或直接 curl Telegram API。

## 驗收標準
1. Portal Bot 連結指向正確的環境變數 URL
2. `pnpm build` 在 both apps 成功
3. Docker build 成功（linux/amd64）
4. CI/CD workflow 檔案建立且語法正確
5. Cloud Run 部署成功（如果權限允許）
6. `/health` endpoint 可訪問

## 禁止事項
- 不要修改 Phase 1-3 已完成的程式碼
- 不要修改其他不相關的 apps
- 不要 commit 真正的 secrets 到 GitHub

## 參考
- 現有 CI/CD workflow：`.github/workflows/deploy-portal.yml`
- 現有 Dockerfile：`apps/bot-dateway/Dockerfile`、`apps/bot-gateway/Dockerfile`
- Portal 入口頁：`apps/portal/src/app/page.tsx`
- 部署過的其他 app：deploy-manage.yml、deploy-inclass.yml
