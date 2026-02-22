FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/ packages/
COPY apps/inclass-backend/package.json apps/inclass-backend/

RUN pnpm install --frozen-lockfile || pnpm install

COPY apps/inclass-backend/ apps/inclass-backend/

WORKDIR /app/apps/inclass-backend
RUN pnpm build

# --- Production (zero-dependency, tsup bundles everything) ---
FROM node:20-slim
WORKDIR /app

COPY --from=builder /app/apps/inclass-backend/dist ./dist
COPY --from=builder /app/apps/inclass-backend/package.json ./

ENV NODE_ENV=production
ENV PORT=3102
EXPOSE 3102

CMD ["node", "dist/index.js"]
