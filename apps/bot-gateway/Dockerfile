FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/bot-gateway/package.json apps/bot-gateway/
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/bot-gateway/ apps/bot-gateway/
WORKDIR /app/apps/bot-gateway
RUN pnpm build

FROM node:20-slim
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser
COPY --from=builder --chown=appuser:nodejs /app /app
WORKDIR /app/apps/bot-gateway
ENV NODE_ENV=production
USER appuser
EXPOSE 3300
CMD ["node", "dist/index.js"]
