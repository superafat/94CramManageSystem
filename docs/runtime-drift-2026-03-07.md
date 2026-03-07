# Runtime Drift Report 2026-03-07

## 已完成

1. 三個 live backend 已直接更新 `SERVICE_URL`
2. `apps/bot-gateway` 已新增可分類失敗原因的 smoke 腳本
3. `deploy-bot.yml` 已補上 `workflow_dispatch`，但尚未 push 到 GitHub
4. 本機 `apps/bot-gateway/.env` 已移除真實 Telegram token

## Live Cloud Run 狀態

### manage backend

- `SERVICE_URL`: present
- `INTERNAL_API_KEY`: present
- smoke 結果: `tenant` / `HTTP 404`
- 解讀: bot auth 與 route 已通，業務層只是找不到 demo tenant

### inclass backend

- `SERVICE_URL`: present
- `INTERNAL_API_KEY`: present
- smoke 結果: `service-config` / `HTTP 503`
- 解讀: 已不是單純缺少 env name，仍需進一步查明是 runtime 讀值、secret 值內容，或 live image 與目前 source 行為不一致

### stock backend

- `SERVICE_URL`: present
- `INTERNAL_API_KEY`: present
- smoke 結果: `service-config` / `HTTP 503`
- 解讀: 與 inclass 同類問題

## GitHub Actions 狀態

- remote `deploy-bot.yml` 目前沒有 `workflow_dispatch`
- 本地工作樹已補上 `workflow_dispatch`
- 未 push 前，`gh workflow run deploy-bot.yml --ref main` 會回 `HTTP 422`

## 新風險

1. bot middleware 原本寫死的服務帳號 `cram94-bot-gateway@cram94-manage-system.iam.gserviceaccount.com` 與 live Cloud Run 實際使用的 `deploy94@cram94-manage-system.iam.gserviceaccount.com` 不一致
2. 這表示：
   - inclass / stock 的 botAuth 可能因此錯誤拒絕 live bot-gateway
   - manage 之前能進業務層，較可能是該路徑尚未完全依賴同一段驗證結果
   - 三個 backend 的 bot caller enforcement 需要重新對齊

## 目前阻塞

1. 本機 Docker daemon 未啟動，無法完成 deploy checklist 中的本機 `docker build --platform linux/amd64`
2. 目前可用的 service account key 沒有 Cloud Logging viewer 權限，無法直接讀取 Cloud Run revision log 來判定 503 的精確分支
3. 不進行 commit / push 的前提下，無法讓 GitHub 上的 workflow 立刻具備手動觸發能力

## 建議下一步

1. 確認 live bot caller 真正使用的 service account 名稱，並與三個 backend 的 `BOT_SERVICE_ACCOUNT` 常數對齊
2. 取得 Cloud Logging viewer 權限後，檢查 inclass / stock 的 `[botAuth]` log
3. push 目前的 workflow 變更後，再用 `gh workflow run deploy-bot.yml` 驗證手動部署與 smoke
4. 啟動 Docker Desktop 後，補跑三個 backend 的本機 linux/amd64 build 驗證
