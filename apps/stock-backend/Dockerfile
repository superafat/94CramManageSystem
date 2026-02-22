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

# --- Production (zero-dependency, tsup bundles everything) ---
FROM node:20-slim
WORKDIR /app

COPY --from=builder /app/apps/stock-backend/dist ./dist
COPY --from=builder /app/apps/stock-backend/package.json ./

ENV NODE_ENV=production
ENV PORT=3101
EXPOSE 3101

CMD ["node", "dist/index.js"]
