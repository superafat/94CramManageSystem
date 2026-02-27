FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/bot-dashboard/package.json apps/bot-dashboard/

RUN echo "shamefully-hoist=true" > .npmrc
RUN pnpm install --no-frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/bot-dashboard/ apps/bot-dashboard/

WORKDIR /app/apps/bot-dashboard
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/bot-dashboard/.next/standalone ./
COPY --from=builder /app/apps/bot-dashboard/.next/static ./apps/bot-dashboard/.next/static

USER nextjs
EXPOSE 3400
ENV PORT=3400
CMD ["node", "apps/bot-dashboard/server.js"]
