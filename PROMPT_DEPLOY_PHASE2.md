# Phase 7 Step 2: 修正 Build 錯誤 + 部署全部 6 個 App

## 工作目錄
`/Users/dali/Github/94CramManageSystem`

## 問題 1: stock-backend tsconfig 損壞
`apps/stock-backend/tsconfig.json` extends 一個不存在的 `../tsconfig.base.json`。

**修正**：把 stock-backend 的 tsconfig.json 改為完整獨立設定（參考 manage-backend 的格式）：
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## 問題 2: packages/shared 可能也有 tsconfig 問題
檢查 `packages/shared/tsconfig.json`，確保也有 `esModuleInterop: true` 和 `skipLibCheck: true`。
如果也 extends 不存在的 base，就改為獨立設定。

## 問題 3: stock-dashboard Dockerfile 需改 standalone mode
看一下現在 stock-dashboard 的 Dockerfile，確認是否已經用 standalone mode。
如果還是用 `npx next start`，改為 standalone 模式（用 `node server.js`）。
同樣檢查 manage-dashboard 和 inclass-dashboard 的 Dockerfile。

## 驗證
修正後執行：
```bash
cd /Users/dali/Github/94CramManageSystem
# 本地 build 測試（不需要 docker）
cd apps/stock-backend && pnpm build
cd ../../apps/manage-backend && pnpm build
cd ../../apps/inclass-backend && pnpm build
```

如果全部 build 成功，git commit：
```
fix: stock-backend tsconfig + shared tsconfig + standalone dashboards
```

## 完成條件
- [ ] stock-backend tsconfig.json 修正為完整獨立設定
- [ ] packages/shared tsconfig.json 確認/修正
- [ ] 3 個 backend pnpm build 全部通過
- [ ] git commit

完成後回覆：RALPH_DONE
