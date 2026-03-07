# Manage Teacher Avatar Deploy Checklist

適用範圍：94Manage 教師頭像、教師 CRUD 與 manage_teachers production schema 相容修正。

## Deploy 前

1. 執行 `pnpm install`
2. 執行 `pnpm typecheck`
3. 執行 `pnpm --filter manage-dashboard exec tsc --noEmit`
4. 執行 `pnpm --filter manage-backend exec vitest run src/routes/teacher-avatar-upload.test.ts`
5. 確認 root `.env` 的 `DATABASE_URL` 不是 placeholder，且可連到 `94platform`
6. 確認以下環境變數已同步存在於 `.env.example`、`apps/manage-backend/.env.example`、`.github/workflows/deploy-manage.yml`
   - `GCS_BUCKET_NAME`
   - `GCS_TEACHER_AVATAR_BUCKET_NAME`
7. 確認 `GCS_TEACHER_AVATAR_BUCKET_NAME` 指向 `94allsolve-question-images`
8. 確認 bucket `94allsolve-question-images` 仍有 bucket-level public read
9. 確認 Cloud Run / Secret Manager 仍提供 `DATABASE_URL`、`JWT_SECRET`、`INTERNAL_API_KEY`

## Live 驗證

1. 以 live smoke 方式執行

```bash
set -a && source .env >/dev/null 2>&1 && \
export ENABLE_LIVE_AVATAR_SMOKE=1 && \
export LIVE_DATABASE_URL="$DATABASE_URL" && \
export LIVE_JWT_SECRET="$(gcloud secrets versions access latest --secret=JWT_SECRET)" && \
export LIVE_INTERNAL_API_KEY="$(gcloud secrets versions access latest --secret=INTERNAL_API_KEY)" && \
export LIVE_TEACHER_ID="e0000000-0000-0000-0000-000000000001" && \
export LIVE_TENANT_ID="00000000-0000-0000-0000-000000000001" && \
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/gcp-sa-key.json" && \
pnpm --filter manage-backend exec vitest run src/routes/teacher-avatar-live.test.ts
```

1. 預期結果
   - avatar upload: `201`
   - avatar persist patch: `200`
   - teacher create/read: `201` / `200`
   - teacher update: `200`
   - teacher delete/read after delete: `200` / `404`
   - Vitest summary: `4 passed`

## Deploy 後

1. 開啟 manage 教師管理頁，確認表單只顯示 production 目前可持久化欄位
2. 實測新增教師、編輯時薪、編輯授課科目
3. 實測既有教師頭像上傳、裁切、重整後仍可顯示
4. 實測薪資預覽與排課頁面能正常顯示教師名稱，不再依賴舊 `teachers` table
5. 若要恢復勞健保、個資、匯款、授課年級、教師職務欄位，先補齊 `manage_teachers` schema，再重新開放 UI
