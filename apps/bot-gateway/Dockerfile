FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/bot-gateway/package.json apps/bot-gateway/
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/bot-gateway/ apps/bot-gateway/
WORKDIR /app/apps/bot-gateway
RUN pnpm build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app /app
WORKDIR /app/apps/bot-gateway
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
