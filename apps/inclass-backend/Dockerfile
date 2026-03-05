FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
# canvas requires build tools
RUN apt-get update && apt-get install -y \
    python3 make g++ \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    curl ca-certificates \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/ packages/
COPY apps/inclass-backend/package.json apps/inclass-backend/
RUN echo "shamefully-hoist=true" > .npmrc
RUN pnpm install --no-frozen-lockfile
COPY apps/inclass-backend/ apps/inclass-backend/
WORKDIR /app/apps/inclass-backend
# Download face-api model files
RUN bash scripts/download-models.sh
RUN pnpm build

FROM node:20-slim
WORKDIR /app
# canvas and tensorflow runtime deps
RUN apt-get update && apt-get install -y \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 \
    libjpeg62-turbo libgif7 librsvg2-2 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*
# Install tsx globally for loading shared package .ts files
RUN npm install -g tsx
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs appuser
COPY --from=builder --chown=appuser:nodejs /app/apps/inclass-backend/dist ./apps/inclass-backend/dist
COPY --from=builder --chown=appuser:nodejs /app/apps/inclass-backend/models ./apps/inclass-backend/models
COPY --from=builder --chown=appuser:nodejs /app/apps/inclass-backend/package.json ./apps/inclass-backend/package.json
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/packages ./packages
COPY --from=builder --chown=appuser:nodejs /app/package.json ./package.json
WORKDIR /app/apps/inclass-backend
ENV NODE_ENV=production
USER appuser
EXPOSE 3102
CMD ["tsx", "dist/index.js"]
