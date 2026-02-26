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

FROM node:20-slim
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs appuser
COPY --from=builder --chown=appuser:nodejs /app/apps/inclass-backend/dist ./apps/inclass-backend/dist
COPY --from=builder --chown=appuser:nodejs /app/apps/inclass-backend/package.json ./apps/inclass-backend/package.json
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/packages ./packages
COPY --from=builder --chown=appuser:nodejs /app/package.json ./package.json
WORKDIR /app/apps/inclass-backend
ENV NODE_ENV=production
USER appuser
EXPOSE 8080
CMD ["node", "dist/index.js"]
