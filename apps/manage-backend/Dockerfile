FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/ packages/
COPY apps/manage-backend/package.json apps/manage-backend/

RUN pnpm install --frozen-lockfile || pnpm install

COPY apps/manage-backend/ apps/manage-backend/

WORKDIR /app/apps/manage-backend
RUN pnpm build

# --- Production (zero-dependency, tsup bundles everything) ---
FROM node:20-slim
WORKDIR /app

COPY --from=builder /app/apps/manage-backend/dist ./dist
COPY --from=builder /app/apps/manage-backend/package.json ./

ENV NODE_ENV=production
ENV PORT=PORT=3100
EXPOSE PORT=3100

CMD ["node", "dist/index.js"]
