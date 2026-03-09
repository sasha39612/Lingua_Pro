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

# Copy service source and build
COPY backend/api-gateway/ ./backend/api-gateway/

WORKDIR /app/backend/api-gateway
RUN pnpm run build

# ── Stage 2: runner ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app/backend/api-gateway

RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=8080

# Node resolves node_modules up the directory tree — copy root workspace node_modules
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/backend/api-gateway/dist ./dist

EXPOSE 8080
CMD ["node", "dist/main.js"]
