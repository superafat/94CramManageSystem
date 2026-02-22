# 修正 Backend ESM Module Resolution 問題

## 工作目錄
`/Users/dali/Github/94CramManageSystem`

## 問題
所有 3 個 backend 使用 `"type": "module"` (ESM)，但 `tsc` 編譯出來的 `.js` 沒有加 `.js` 副檔名在 import 路徑上。
這導致 Node.js ESM 模式下 `ERR_MODULE_NOT_FOUND`。

例如：`import routes from './routes/index'` 需要變成 `import routes from './routes/index.js'`

## 解決方案（選最簡單的）
**方案：改用 tsup 打包所有 backend**

為每個 backend 安裝 `tsup` 並修改 build script：

### 1. 安裝 tsup
```bash
cd /Users/dali/Github/94CramManageSystem
pnpm --filter @94cram/stock-backend add -D tsup
pnpm --filter @94cram/manage-backend add -D tsup
pnpm --filter @94cram/inclass-backend add -D tsup
```

### 2. 為每個 backend 建立 tsup.config.ts
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // 不 bundle node_modules
  external: [/node_modules/],
  // 但是要 bundle 本地 imports
  noExternal: [],
});
```

### 3. 修改 package.json 的 build script
每個 backend 的 package.json：
```json
"build": "tsup"
```

### 4. 驗證
```bash
cd apps/stock-backend && pnpm build && node dist/index.js
# 應該能成功啟動（可以 Ctrl+C 中斷）
cd ../manage-backend && pnpm build
cd ../inclass-backend && pnpm build
```

### 5. Git commit
```
fix: use tsup for backend builds to resolve ESM module resolution
```

## 注意事項
- tsup 會自動處理 ESM 的 import 路徑問題
- 不需要改任何 TypeScript 源碼
- Dockerfile 不需要改（CMD 仍然是 `node dist/index.js`）
- tsup 會產生單一 bundle file 或正確的 ESM output

## 完成條件
- [ ] 3 個 backend 都安裝了 tsup
- [ ] 3 個 backend 都能 `pnpm build` 成功
- [ ] stock-backend 能在本地 `node dist/index.js` 啟動不報 ERR_MODULE_NOT_FOUND
- [ ] git commit 完成

完成後回覆：RALPH_DONE
