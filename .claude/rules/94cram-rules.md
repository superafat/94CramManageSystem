# 94CramManageSystem 開發規則

## 程式碼規範

- TypeScript strict mode，不允許 `any`（除非有充分理由並加上 TODO 說明）
- API 路由統一在各 app 的 `src/routes/` 目錄
- 錯誤處理必須明確，不允許空的 catch block
- 每個 API endpoint 必須有 zod 驗證

## 測試規範

- 新增 API endpoint 必須有基本的錯誤情境測試
- 不允許為了讓測試通過而修改測試本身

## Git 規範

- Commit message 格式：`feat(scope): 說明` / `fix(scope): 說明`
- scope 範例：manage, inclass, stock, portal, shared
- 不直接 push main，走 GitHub Actions CI/CD

## 部署規範

- Docker image 必須 `--platform linux/amd64`
- Cloud Run service 名稱前綴 `cram94-`
- 新建任何 GCP 資源前先確認費用（月預算 NT$300）

## 安全規範

- JWT secret 從環境變數讀取，不 hardcode
- DB 連線字串從環境變數讀取
- `.env` 檔案不 commit（已在 .gitignore）
- Cloud SQL 連線用 Cloud Run 內建 socket，不用 TCP（生產環境）

## 禁止事項

- 不允許 `rm -rf` 沒有確認
- 不修改 `packages/shared` 的共用表 schema 除非明確任務要求
- 不在本機跑生產 DB migration（只跑 `drizzle-kit push`）
