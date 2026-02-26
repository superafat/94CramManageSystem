# 自包含 Dockerfile - 不依賴 monorepo 根目錄
FROM node:20-slim AS builder
WORKDIR /app

# 安裝 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 複製 bot-gateway 本身
COPY apps/bot-gateway/package.json apps/bot-gateway/package.json
COPY apps/bot-gateway/tsconfig.json apps/bot-gateway/tsconfig.json
COPY apps/bot-gateway/src apps/bot-gateway/src

# 安裝依賴 - 只需要自己的依賴
WORKDIR /app/apps/bot-gateway
RUN pnpm install --frozen-lockfile || pnpm install

# 建置
RUN pnpm build

# Runtime image
FROM node:20-slim
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser

COPY --from=builder --chown=appuser:nodejs /app /app
WORKDIR /app/apps/bot-gateway

ENV NODE_ENV=production
USER appuser
EXPOSE 3300
CMD ["node", "dist/index.js"]
