FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/manage-dashboard/package.json apps/manage-dashboard/

RUN echo "shamefully-hoist=true" > .npmrc
RUN pnpm install --no-frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/manage-dashboard/ apps/manage-dashboard/

WORKDIR /app/apps/manage-dashboard
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/manage-dashboard/.next/standalone ./
COPY --from=builder /app/apps/manage-dashboard/.next/static ./apps/manage-dashboard/.next/static

USER nextjs
EXPOSE 3200
ENV PORT=3200
CMD ["node", "apps/manage-dashboard/server.js"]
