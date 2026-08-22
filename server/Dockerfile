# Build context: repository root (docker compose: context: .  dockerfile: server/Dockerfile)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY server/package.json ./server/

RUN npm ci --workspace=server --workspace=@paint-saas/shared-types --include-workspace-root

COPY packages/shared-types ./packages/shared-types
COPY server ./server

RUN npm run build --workspace=@paint-saas/shared-types \
  && npm run build --workspace=server

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY server/package.json ./server/

RUN npm ci --workspace=server --include-workspace-root --omit=dev

COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/server/dist ./server/dist

EXPOSE 5000

CMD ["node", "server/dist/server.js"]
