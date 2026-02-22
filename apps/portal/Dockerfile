FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# 從本地 build 好的 standalone 複製
COPY .next/standalone/ ./
COPY .next/static ./.next/static
COPY public ./public

USER nextjs
EXPOSE 3300
ENV PORT=3300
CMD ["node", "apps/portal/server.js"]
