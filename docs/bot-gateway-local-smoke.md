# Bot Gateway Local Smoke Guide

適用範圍：本機驗證 bot-gateway 對 manage / inclass / stock backend 的內部 bot API 呼叫鏈。

## 前置條件

1. [apps/bot-gateway/.env.example](apps/bot-gateway/.env.example) 的欄位已補齊到本機 `.env`
2. 本機已存在 GCP service account key：`$HOME/gcp-sa-key.json`
3. 可讀取 GCP Secret Manager 的 `INTERNAL_API_KEY`
4. 若要打本機 backend，需先啟動對應服務；若要打 Cloud Run，請覆蓋 `MANAGE_URL` / `INCLASS_URL` / `STOCK_URL`

## 建議本機設定

```bash
SERVICE_URL=http://localhost:3300
INTERNAL_API_KEY=your_internal_api_key_here
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/gcp-sa-key.json
```

說明：
本機 `.env` 不要存真實 Telegram token 以外的多份備份，也不要把 production secret 直接複製到 repo 內其他檔案。

## 取得 INTERNAL_API_KEY

```bash
gcloud secrets versions access latest --secret=INTERNAL_API_KEY
```

## 打 Cloud Run smoke

```bash
cd /Users/dali/Github/94CramManageSystem
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/gcp-sa-key.json"
export CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE="$HOME/gcp-sa-key.json"
export INTERNAL_API_KEY="$(gcloud secrets versions access latest --secret=INTERNAL_API_KEY)"
export MANAGE_URL="https://cram94-manage-backend-1015149159553.asia-east1.run.app"
export INCLASS_URL="https://cram94-inclass-backend-1015149159553.asia-east1.run.app"
export STOCK_URL="https://cram94-stock-backend-1015149159553.asia-east1.run.app"
export SMOKE_TENANT_ID="11111111-1111-1111-1111-111111111111"

pnpm --filter @94cram/bot-gateway smoke:cloudrun
```

輸出說明：

1. `ok` 代表 bot auth 與 route 都通了
2. `tenant` 代表認證成功但 tenant 不存在，通常表示請求鏈正常
3. `service-config` 代表目標 backend 缺少 `SERVICE_URL` 或 `INTERNAL_API_KEY`
4. `oidc` / `internal-key` / `network` 可直接對應不同故障面

## 目前已知結果

1. manage Cloud Run 可通過 auth 鏈並進入業務層，對假 tenant 會回 `Tenant not found`
2. inclass Cloud Run 若缺 `SERVICE_URL` 會回 `服務未設定`
3. 本機若 backend 未啟動，會得到 `ECONNREFUSED`
4. 本機若沒有 ADC，會得到 `Could not load the default credentials`

## Secret Hygiene

1. [apps/bot-gateway/.env](apps/bot-gateway/.env) 保持未追蹤
2. 不把 secret 值貼進 docs、plans、prompt 文件
3. 若 token 曾出現在已提交文件，先輪替再清理 repo
4. 本機 smoke 完成後可執行 `unset INTERNAL_API_KEY GOOGLE_APPLICATION_CREDENTIALS CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE`
