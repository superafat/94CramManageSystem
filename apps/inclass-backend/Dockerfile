FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/inclass-backend/package.json apps/inclass-backend/

RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/shared/ packages/shared/
COPY apps/inclass-backend/ apps/inclass-backend/

WORKDIR /app/apps/inclass-backend
RUN pnpm build

# --- Production ---
FROM node:20-slim
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/packages/shared/ packages/shared/
COPY --from=builder /app/apps/inclass-backend/dist apps/inclass-backend/dist
COPY --from=builder /app/apps/inclass-backend/package.json apps/inclass-backend/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/apps/inclass-backend/node_modules apps/inclass-backend/node_modules/ 2>/dev/null || true
COPY --from=builder /app/packages/shared/node_modules packages/shared/node_modules/ 2>/dev/null || true

WORKDIR /app/apps/inclass-backend
ENV NODE_ENV=production
ENV PORT=3102
EXPOSE 3102

CMD ["node", "dist/index.js"]
