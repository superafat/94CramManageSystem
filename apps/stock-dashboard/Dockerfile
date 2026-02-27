FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/stock-dashboard/package.json apps/stock-dashboard/

RUN echo "shamefully-hoist=true" > .npmrc
RUN pnpm install --no-frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/stock-dashboard/ apps/stock-dashboard/

WORKDIR /app/apps/stock-dashboard
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/stock-dashboard/.next/standalone ./
COPY --from=builder /app/apps/stock-dashboard/.next/static ./apps/stock-dashboard/.next/static
COPY --from=builder /app/apps/stock-dashboard/public ./apps/stock-dashboard/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/stock-dashboard/server.js"]
