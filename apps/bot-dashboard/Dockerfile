# 自包含 Dockerfile - 從 apps/bot-dashboard 目錄部署
FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# 複製 workspace 檔案
COPY pnpm-workspace.yaml ./
COPY package.json ./

# 複製 shared package
COPY packages/shared/ ./packages/shared/

# 安裝依賴
RUN pnpm install --no-frozen-lockfile

# 複製程式碼
COPY next.config.ts ./
COPY tsconfig.json ./
COPY src ./src
COPY postcss.config.mjs ./

# 建置
RUN pnpm build

# Runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3400
ENV PORT=3400
CMD ["node", "server.js"]
