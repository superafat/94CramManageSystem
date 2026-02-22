FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/inclass-dashboard/package.json apps/inclass-dashboard/

RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/shared/ packages/shared/
COPY apps/inclass-dashboard/ apps/inclass-dashboard/

WORKDIR /app/apps/inclass-dashboard
RUN pnpm build

# --- Production ---
FROM node:20-slim
WORKDIR /app

COPY --from=builder /app/apps/inclass-dashboard/.next .next
COPY --from=builder /app/apps/inclass-dashboard/public public/
COPY --from=builder /app/apps/inclass-dashboard/package.json ./
COPY --from=builder /app/apps/inclass-dashboard/node_modules node_modules/
COPY --from=builder /app/apps/inclass-dashboard/next.config.* ./

ENV NODE_ENV=production
ENV PORT=3201
EXPOSE 3201

CMD ["npx", "next", "start", "--port", "3201"]
