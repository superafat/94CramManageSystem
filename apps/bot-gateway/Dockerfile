FROM node:20-slim AS builder
WORKDIR /app

# 安裝 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 複製 workspace 根配置和 shared package
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/ packages/
COPY apps/bot-gateway/package.json apps/bot-gateway/

# 安裝所有依賴（包含 workspace 依賴）
RUN echo "shamefully-hoist=true" > .npmrc
RUN pnpm install --no-frozen-lockfile

# 複製 bot-gateway 原始碼並建置
COPY apps/bot-gateway/ apps/bot-gateway/
WORKDIR /app/apps/bot-gateway
RUN pnpm build

# Runtime image
FROM node:20-slim
WORKDIR /app

# Install tsx globally for loading shared package .ts files
RUN npm install -g tsx

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser

COPY --from=builder --chown=appuser:nodejs /app/apps/bot-gateway/dist ./apps/bot-gateway/dist
COPY --from=builder --chown=appuser:nodejs /app/apps/bot-gateway/package.json ./apps/bot-gateway/package.json
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/packages ./packages
COPY --from=builder --chown=appuser:nodejs /app/package.json ./package.json
WORKDIR /app/apps/bot-gateway

ENV NODE_ENV=production
USER appuser
EXPOSE 3300
CMD ["tsx", "dist/index.js"]
