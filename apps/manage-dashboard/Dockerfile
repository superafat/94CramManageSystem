FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/manage-dashboard/package.json apps/manage-dashboard/

RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/shared/ packages/shared/
COPY apps/manage-dashboard/ apps/manage-dashboard/

WORKDIR /app/apps/manage-dashboard
RUN pnpm build

# --- Production ---
FROM node:20-slim
WORKDIR /app

COPY --from=builder /app/apps/manage-dashboard/.next .next
COPY --from=builder /app/apps/manage-dashboard/public public/
COPY --from=builder /app/apps/manage-dashboard/package.json ./
COPY --from=builder /app/apps/manage-dashboard/node_modules node_modules/
COPY --from=builder /app/apps/manage-dashboard/next.config.* ./

ENV NODE_ENV=production
ENV PORT=3200
EXPOSE 3200

CMD ["npx", "next", "start", "--port", "3200"]
