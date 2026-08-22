FROM node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_APP_URL=https://app.paintappstore.in
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

COPY marketing-next/package.json marketing-next/package-lock.json* ./
RUN npm ci

COPY marketing-next ./

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
