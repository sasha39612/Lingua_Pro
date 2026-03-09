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

# Copy frontend source and build
COPY frontend/ ./frontend/

ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* vars are baked into the JS bundle at build time — must be set here
ARG NEXT_PUBLIC_API_URL=http://localhost:8080/graphql
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /app/frontend
RUN pnpm run build

# ── Stage 2: runner ───────────────────────────────────────────────────────
# next.config.ts has output: 'standalone' — use the self-contained bundle
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone server + static assets (must be placed adjacent to server.js)
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public

EXPOSE 3000
CMD ["node", "frontend/server.js"]
