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
COPY --from=builder /app /app
WORKDIR /app/apps/inclass-backend
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
