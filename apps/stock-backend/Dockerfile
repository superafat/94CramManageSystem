FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/ packages/
COPY apps/stock-backend/package.json apps/stock-backend/
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/stock-backend/ apps/stock-backend/
WORKDIR /app/apps/stock-backend
RUN pnpm build

FROM node:20-slim
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser
COPY --from=builder --chown=appuser:nodejs /app /app
WORKDIR /app/apps/stock-backend
ENV NODE_ENV=production
USER appuser
EXPOSE 8080
CMD ["node", "dist/index.js"]
