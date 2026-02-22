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

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/inclass-dashboard/.next/standalone ./
COPY --from=builder /app/apps/inclass-dashboard/.next/static ./apps/inclass-dashboard/.next/static
COPY --from=builder /app/apps/inclass-dashboard/public ./apps/inclass-dashboard/public

USER nextjs
EXPOSE 3201
ENV PORT=3201
CMD ["node", "apps/inclass-dashboard/server.js"]
