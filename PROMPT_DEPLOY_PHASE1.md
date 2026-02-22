# Phase 7: 全系統部署 — Step 1: 修正 CI/CD + 手動部署 6 個 Backend/Dashboard

## 背景
94CramManageSystem monorepo 已完成 Phase 0-6，94Portal 已部署到 `https://94cram.com`。
現在需要部署其餘 6 個 app 到 Cloud Run。

## ⚠️ 重要：GCP 命名限制
Cloud Run service name **不能數字開頭**。
目前 CI/CD workflow 中的 service name 都是 `94xxx-` 開頭，這是錯的。

**正確命名**（與已上線的 `cram94-portal` 一致）：
| 舊名（CI/CD 中） | 新名 |
|---|---|
| `94stock-backend` | `cram94-stock-backend` |
| `94stock-dashboard` | `cram94-stock-dashboard` |
| `94manage-backend` | `cram94-manage-backend` |
| `94manage-dashboard` | `cram94-manage-dashboard` |
| `94inclass-backend` | `cram94-inclass-backend` |
| `94inclass-dashboard` | `cram94-inclass-dashboard` |

## 任務

### Step 1: 修正 CI/CD workflow 的 service name
修改以下 4 個檔案中所有 `gcloud run deploy` 的 service name：
- `.github/workflows/deploy-stock.yml`: `94stock-*` → `cram94-stock-*`
- `.github/workflows/deploy-manage.yml`: `94manage-*` → `cram94-manage-*`
- `.github/workflows/deploy-inclass.yml`: `94inclass-*` → `cram94-inclass-*`
- `.github/workflows/deploy-portal.yml`: 確認已是 `cram94-portal`（應該沒問題）

### Step 2: 修正 Dashboard Dockerfile（Next.js standalone mode）
stock-dashboard 的 Dockerfile 沒用 standalone mode，會裝太多 node_modules。
參考 portal 的 Dockerfile，改用 standalone output。

**需要做的**：
1. 確認 `apps/stock-dashboard/next.config.*` 有 `output: 'standalone'`
2. 確認 `apps/manage-dashboard/next.config.*` 有 `output: 'standalone'`
3. 確認 `apps/inclass-dashboard/next.config.*` 有 `output: 'standalone'`
4. 更新 3 個 dashboard 的 Dockerfile 改用 standalone mode（參考 portal 的 pattern）

### Step 3: 確保所有 backend 的 INTERNAL_API_KEY secret 被注入
檢查 deploy-stock.yml 和 deploy-inclass.yml 的 backend deploy 步驟：
- 需要有 `--set-secrets="DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,INTERNAL_API_KEY=INTERNAL_API_KEY:latest"`
- 需要有 `--add-cloudsql-instances=cram94-manage-system:asia-east1:platform94-db`

### Step 4: git commit 所有修正
commit message: `fix: rename Cloud Run services cram94-* prefix + standalone dashboards`

## 完成條件
- [ ] 4 個 workflow yml 的 service name 全部改為 `cram94-*` 前綴
- [ ] 3 個 dashboard 的 next.config 有 `output: 'standalone'`
- [ ] 3 個 dashboard 的 Dockerfile 改用 standalone mode
- [ ] 3 個 backend 的 deploy 步驟都有正確的 secrets 和 cloudsql instance
- [ ] git commit 完成

完成後回覆：RALPH_DONE
