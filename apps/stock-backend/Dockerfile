FROM node:20-slim AS builder
WORKDIR /app

# 安裝 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 複製 workspace 根設定
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/stock-backend/package.json apps/stock-backend/

# 安裝依賴
RUN pnpm install --frozen-lockfile || pnpm install

# 複製源碼
COPY packages/shared/ packages/shared/
COPY apps/stock-backend/ apps/stock-backend/

# Build
WORKDIR /app/apps/stock-backend
RUN pnpm build

# --- Production ---
FROM node:20-slim
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/packages/shared/ packages/shared/
COPY --from=builder /app/apps/stock-backend/dist apps/stock-backend/dist
COPY --from=builder /app/apps/stock-backend/package.json apps/stock-backend/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/apps/stock-backend/node_modules apps/stock-backend/node_modules/
COPY --from=builder /app/packages/shared/node_modules packages/shared/node_modules/ 

WORKDIR /app/apps/stock-backend
ENV NODE_ENV=production
ENV PORT=3101
EXPOSE 3101

CMD ["node", "dist/index.js"]
