# Frontend Dockerfile
# Builds the Next.js application
FROM node:18-alpine AS builder
WORKDIR /app
# install pnpm globally
RUN npm install -g pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install
COPY . .
RUN pnpm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY --from=builder /app/.next .next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
RUN pnpm install --prod
EXPOSE 3000
CMD ["pnpm", "start"]