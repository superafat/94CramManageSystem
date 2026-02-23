FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 pkg-config \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/ packages/
COPY apps/manage-backend/package.json apps/manage-backend/
RUN pnpm install --frozen-lockfile || pnpm install
RUN cd node_modules/.pnpm/canvas@3.2.1/node_modules/canvas && npm run install || true
RUN cd /app && cd packages/manage-errors && pnpm build && cd ../..
COPY apps/manage-backend/ apps/manage-backend/
WORKDIR /app/apps/manage-backend
RUN pnpm build

FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app /app
WORKDIR /app/apps/manage-backend
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
