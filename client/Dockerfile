# Build context: repository root
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY client/package.json ./client/

RUN npm ci --workspace=client --workspace=@paint-saas/shared-types --include-workspace-root

COPY packages/shared-types ./packages/shared-types
COPY client ./client

RUN npm run build --workspace=@paint-saas/shared-types \
  && npm run build --workspace=client

FROM nginx:1.27-alpine AS runner

COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
