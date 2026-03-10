# ── Stage 1: builder ──────────────────────────────────────────────────────
# Build context: monorepo root (docker-compose sets context: .)
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifests first — layer cache invalidated only when these change
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/
COPY backend/api-gateway/package.json ./backend/api-gateway/
COPY backend/auth-service/package.json ./backend/auth-service/
COPY backend/text-service/package.json ./backend/text-service/
COPY backend/audio-service/package.json ./backend/audio-service/
COPY backend/stats-service/package.json ./backend/stats-service/
COPY backend/ai-orchestrator/package.json ./backend/ai-orchestrator/

RUN pnpm install --frozen-lockfile

# Copy service source (includes prisma/ schema) and build
# build script runs: prisma generate && tsc
COPY backend/text-service/ ./backend/text-service/

WORKDIR /app/backend/text-service
RUN pnpm run build

# ── Stage 2: runner ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app/backend/text-service

RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=4002

# Node resolves node_modules up the directory tree — copy root workspace node_modules
# (includes Prisma engine binaries compiled for Linux/Alpine by the builder)
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/backend/text-service/dist ./dist
COPY --from=builder /app/backend/text-service/prisma ./prisma
COPY backend/text-service/prisma.config.ts ./prisma.config.ts

COPY backend/text-service/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 4002
ENTRYPOINT ["./entrypoint.sh"]
