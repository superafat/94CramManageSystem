FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# 複製 workspace 設定
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY packages/manage-errors/package.json packages/manage-errors/
COPY apps/manage-backend/package.json apps/manage-backend/

RUN pnpm install --frozen-lockfile || pnpm install

# 複製源碼
COPY packages/shared/ packages/shared/
COPY packages/manage-errors/ packages/manage-errors/
COPY apps/manage-backend/ apps/manage-backend/

WORKDIR /app/apps/manage-backend
RUN pnpm build

# --- Production ---
FROM node:20-slim
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/packages/shared/ packages/shared/
COPY --from=builder /app/packages/manage-errors/ packages/manage-errors/
COPY --from=builder /app/apps/manage-backend/dist apps/manage-backend/dist
COPY --from=builder /app/apps/manage-backend/package.json apps/manage-backend/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/apps/manage-backend/node_modules apps/manage-backend/node_modules/ 2>/dev/null || true
COPY --from=builder /app/packages/shared/node_modules packages/shared/node_modules/ 2>/dev/null || true
COPY --from=builder /app/packages/manage-errors/node_modules packages/manage-errors/node_modules/ 2>/dev/null || true

WORKDIR /app/apps/manage-backend
ENV NODE_ENV=production
ENV PORT=3100
EXPOSE 3100

CMD ["node", "dist/index.js"]
