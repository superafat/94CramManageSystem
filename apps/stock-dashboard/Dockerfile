FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/stock-dashboard/package.json apps/stock-dashboard/

RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/shared/ packages/shared/
COPY apps/stock-dashboard/ apps/stock-dashboard/

WORKDIR /app/apps/stock-dashboard
RUN pnpm build

# --- Production ---
FROM node:20-slim
WORKDIR /app

COPY --from=builder /app/apps/stock-dashboard/.next .next
COPY --from=builder /app/apps/stock-dashboard/public public/
COPY --from=builder /app/apps/stock-dashboard/package.json ./
COPY --from=builder /app/apps/stock-dashboard/node_modules node_modules/
COPY --from=builder /app/apps/stock-dashboard/next.config.* ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npx", "next", "start"]
