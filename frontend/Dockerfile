# Frontend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/next.config.ts ./

RUN pnpm install --prod --no-frozen-lockfile

EXPOSE 3000
CMD ["pnpm", "start"]