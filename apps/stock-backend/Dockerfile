FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/ packages/
COPY apps/stock-backend/package.json apps/stock-backend/
RUN echo "shamefully-hoist=true" > .npmrc
RUN pnpm install --no-frozen-lockfile
COPY apps/stock-backend/ apps/stock-backend/
WORKDIR /app/apps/stock-backend
RUN pnpm build

FROM node:20-slim
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser
COPY --from=builder --chown=appuser:nodejs /app/apps/stock-backend/dist ./apps/stock-backend/dist
COPY --from=builder --chown=appuser:nodejs /app/apps/stock-backend/package.json ./apps/stock-backend/package.json
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/packages ./packages
COPY --from=builder --chown=appuser:nodejs /app/package.json ./package.json
WORKDIR /app/apps/stock-backend
ENV NODE_ENV=production
USER appuser
EXPOSE 3101
CMD ["node", "dist/index.js"]
