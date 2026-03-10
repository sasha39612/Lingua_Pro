# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (`frontend/`)
```bash
cd frontend
pnpm dev          # Start dev server on :3000
pnpm build        # Production build
pnpm lint         # ESLint via Next.js
pnpm typecheck    # TypeScript type check (tsc --noEmit)
```

### Backend Services (each in `backend/<service>/`)
```bash
# Development
pnpm start        # ts-node (auth-service, text-service, ai-orchestrator)
pnpm start:dev    # ts-node-dev with --respawn (api-gateway, stats-service)

# Build & Production
pnpm build        # prisma generate && tsc → dist/  (auth, text, audio)
                  # tsc → dist/  (api-gateway, stats-service, ai-orchestrator)
pnpm typecheck    # tsc --noEmit (no output, fast type check)
pnpm start:prod   # node dist/main.js  (node dist/server.js for stats-service)

# Database (services with Prisma: auth, text, audio)
pnpm prisma:generate   # Generate Prisma client manually
pnpm prisma:migrate    # Create + apply migration (dev only)
# Production migrations run automatically via entrypoint.sh on container startup
```

### Tests (audio-service, stats-service)
```bash
cd backend/audio-service   # or stats-service
pnpm test                  # jest

# End-to-end smoke test (requires curl + jq, all services must be running)
bash scripts/e2e-test.sh
# Against a remote host:
GW_URL=http://your-host:8080 bash scripts/e2e-test.sh
```

### Full Stack
```bash
docker-compose up -d       # Build and start all services (local dev)
docker-compose ps          # Check health

# Production deploy (uses pre-built GHCR images)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build
```

### Root (pnpm workspace)
```bash
pnpm --filter api-gateway build       # Run script in specific workspace package
pnpm --filter frontend dev
```

## Architecture

### Request Flow
```
Frontend (Next.js :3000)
  → /api/graphql (Next.js route → proxies to api-gateway)
    → API Gateway (:8080, NestJS, Apollo Federation Gateway)
      → auth-service    (:4001)
      → text-service    (:4002)  → ai-orchestrator (:4005)
      → audio-service   (:4003)  → ai-orchestrator (:4005)
      → stats-service   (:4004)  → text-service (:4002) + audio-service (:4003)
```

All frontend GraphQL goes through the Next.js `/api/graphql` route, which proxies to the API Gateway. The frontend uses persisted queries with SHA-256 hashes, falling back to full query strings if the persisted query isn't found.

**Direct inter-service HTTP calls are a normal part of the architecture** — not just delegation edge cases:
- `text-service` → `ai-orchestrator` (REST): text analysis, task generation
- `audio-service` → `ai-orchestrator` (REST): Whisper transcription, pronunciation analysis
- `stats-service` → `text-service` (REST `GET /text/by-language`) + `audio-service` (REST `GET /audio/by-language`): stats aggregation — stats-service has no database of its own

### API Gateway (`backend/api-gateway/`)
- **Apollo Federation Gateway** using `IntrospectAndCompose` — federates **only** auth-service and text-service (the two GraphQL subgraphs); polls schemas every 10s
- **audio-service and stats-service are REST-only** — they are NOT in the subgraph list; never add them
- Applies **JWT auth** globally via `JwtAuthGuard` (decorating public routes with `@Public()`)
- Passes auth context downstream via HTTP headers: `x-user-id`, `x-user-role`, `x-user-language`, `x-trace-id`
- **Circuit breaker** via `opossum` (10s timeout, 50% error threshold, 30s reset)
- **Rate limiting** via `@nestjs/throttler`: 120 requests / 60s per IP

### Backend Services

| Service | Port | Framework | GraphQL subgraph? | Database | Notes |
|---------|------|-----------|-------------------|----------|-------|
| auth-service | 4001 | Raw Node.js `http` + `buildSubgraphSchema` | ✅ yes | `auth_db` | No NestJS, uses argon2, JWT via `jsonwebtoken` |
| text-service | 4002 | NestJS + Apollo subgraph | ✅ yes | `text_db` | Calls ai-orchestrator for analysis |
| audio-service | 4003 | NestJS | ❌ REST only | `audio_db` | Custom Prisma output path; frontend calls it directly |
| stats-service | 4004 | NestJS | ❌ REST only | **none** | Aggregates via fetch to text-service + audio-service |
| ai-orchestrator | 4005 | NestJS | none | OpenAI client; local fallbacks when `AI_API_KEY` not set |

### Database (database-per-service)
One PostgreSQL container (`postgres:5432`) with three isolated databases:

| Database | Owner | Tables |
|----------|-------|--------|
| `auth_db` | auth-service | `users`, `sessions` |
| `text_db` | text-service | `texts`, `tasks` |
| `audio_db` | audio-service | `audio_records`, `tasks` |

Databases are created by `infrastructure/postgres-init/init.sql` on first Postgres startup. Prisma schemas contain only the tables each service owns — **no cross-service FK relations** (userId is a plain `Int`). Stats-service has no database: it calls `GET /text/by-language` and `GET /audio/by-language` on the respective services.

Audio-service uses a **custom Prisma output path** (`output = "../src/generated/prisma"`). The generated client is copied in its Dockerfile:
```dockerfile
COPY --from=builder /app/backend/audio-service/src/generated ./src/generated
```

### Stats-service (no DB)
`stats.service.ts` uses Node 20 native `fetch()` to call:
- `GET http://text-service:4002/text/by-language?language=&from=`
- `GET http://audio-service:4003/audio/by-language?language=&from=`

Then aggregates scores, builds daily history, and categorises mistake types in-process. No Prisma, no database dependency.

### AI Orchestrator
- All AI calls are funnelled through `OrchestratorService`
- **Retry policy**: 3 attempts, exponential backoff (400ms base); **timeout**: 15–25s per operation
- **Local fallbacks** for all operations — stays functional without `AI_API_KEY`
- Models configurable via env: `OPENAI_TEXT_MODEL`, `OPENAI_TASK_MODEL`, `OPENAI_EVAL_MODEL`, `OPENAI_TRANSCRIPTION_MODEL`

### Frontend (`frontend/`)
- **Next.js 15 App Router** with TypeScript strict mode
- **No Apollo Client** — custom lightweight `graphqlRequest()` in `src/lib/graphql-client.ts`
- All GraphQL operations in `src/lib/graphql-operations.ts`; hashes in `src/lib/persisted-queries.ts`
- **Zustand** for global state (`src/store/app-store.ts`)
- **React Hook Form + Zod** for form validation; **TanStack Query** for server state / caching
- `NEXT_PUBLIC_API_URL` is **baked at build time** — must be set as `ARG` in Dockerfile before `pnpm run build`

## Project Structure

```
Lingua_Pro/
├── docker-compose.yml               # Local dev orchestration
├── docker-compose.prod.yml          # Production override (GHCR images, resource limits, localhost ports)
├── pnpm-workspace.yaml              # Monorepo: frontend + backend/*
├── nginx/
│   ├── nginx.conf                   # Rate limiting, 50M upload limit
│   └── conf.d/lingua.conf           # HTTP→HTTPS, SSL, proxy rules (replace YOUR_DOMAIN)
├── scripts/
│   ├── bootstrap-server.sh          # One-time Ubuntu 24.04 setup (Docker, Nginx, Certbot)
│   ├── ssl-init.sh                  # Let's Encrypt cert + nginx reload + renewal cron
│   ├── deploy.sh                    # docker-compose pull + up --no-build (called by CI)
│   ├── health-check.sh              # Cron health monitor with optional Slack alerts
│   └── e2e-test.sh                  # End-to-end smoke test (requires curl + jq, services running)
├── infrastructure/
│   ├── postgres-init/init.sql       # Creates auth_db, text_db, audio_db on first boot
│   └── README.md
├── .github/
│   ├── workflows/deploy.yml          # CI/CD: parallel image builds → GHCR → SSH deploy
│   └── workflows/lint.yml            # Lint & type check on push + PRs
│
├── frontend/                        # Next.js 15 App Router
│   └── src/
│       ├── app/
│       │   ├── api/
│       │   │   ├── graphql/route.ts     # Proxy → API Gateway :8080
│       │   │   └── ai-feedback/route.ts # SSE streaming endpoint
│       │   └── [writing|reading|listening|speaking|stats|dashboard|admin|settings]/
│       ├── components/
│       │   ├── app-shell.tsx            # Layout wrapper (nav, sidebar)
│       │   ├── audio-recorder.tsx       # MediaRecorder wrapper
│       │   └── streamed-feedback.tsx    # SSE feedback consumer
│       ├── lib/
│       │   ├── graphql-client.ts        # fetch wrapper (persisted queries + fallback)
│       │   ├── graphql-operations.ts    # All GQL query/mutation strings
│       │   ├── graphql-hooks.ts         # TanStack Query hooks
│       │   ├── persisted-queries.ts     # SHA-256 hash map per operation name
│       │   └── types.ts
│       └── store/app-store.ts           # Zustand (auth token, user, language)
│
└── backend/
    ├── api-gateway/                 # NestJS, Apollo Federation Gateway, :8080
    │   └── src/
    │       ├── auth/jwt-auth.guard.ts
    │       ├── graphql/
    │       └── services/circuit-breaker.service.ts
    │
    ├── auth-service/                # Plain Node.js http, :4001 → auth_db
    │   ├── prisma/schema.prisma         # users, sessions only
    │   └── src/graphql/auth.schema.ts   # register, login, me, logout
    │
    ├── text-service/                # NestJS + Apollo subgraph, :4002 → text_db
    │   ├── prisma/schema.prisma         # texts, tasks (no User model — userId is plain Int)
    │   └── src/
    │       ├── graphql/text.schema.ts
    │       └── text/
    │           ├── text.service.ts      # analyzeText, getTextsByLanguage, getTasks
    │           └── text.controller.ts   # POST /text/check, GET /text/tasks, GET /text/by-language
    │
    ├── audio-service/               # NestJS, :4003 → audio_db
    │   ├── prisma/schema.prisma         # audio_records, tasks (no User model)
    │   └── src/
    │       ├── audio/
    │       │   ├── audio.controller.ts  # POST /check, GET /records/:id, GET /by-language
    │       │   ├── audio.service.ts
    │       │   └── audio.repository.ts  # Prisma queries (uses src/generated/prisma)
    │       └── generated/prisma/        # Custom Prisma output (committed type stubs only)
    │
    ├── stats-service/               # NestJS, :4004 — NO DATABASE
    │   └── src/
    │       ├── stats/
    │       │   ├── stats.controller.ts  # GET /stats?language=&period=
    │       │   └── stats.service.ts     # fetch() → text-service + audio-service
    │       └── server.ts
    │
    └── ai-orchestrator/             # NestJS, :4005
        └── src/
            ├── orchestrator.controller.ts
            └── orchestrator.service.ts  # OpenAI calls + retry + local fallbacks
```

## Environment Variables

Create `.env` at the repo root (copy from `.env.example`):
```env
POSTGRES_USER=lingua
POSTGRES_PASSWORD=secret

DATABASE_URL_AUTH=postgresql://lingua:secret@postgres:5432/auth_db
DATABASE_URL_TEXT=postgresql://lingua:secret@postgres:5432/text_db
DATABASE_URL_AUDIO=postgresql://lingua:secret@postgres:5432/audio_db

JWT_SECRET=supersecretjwtkey
JWT_EXPIRY=7d

AI_API_KEY=your-openai-api-key-here
OPENAI_TEXT_MODEL=gpt-4o-mini
OPENAI_TASK_MODEL=gpt-4o-mini
OPENAI_EVAL_MODEL=gpt-4o-mini
OPENAI_TRANSCRIPTION_MODEL=whisper-1
```

Service-level env (with defaults):
- `AUTH_SERVICE_URL` → `http://auth-service:4001/graphql`
- `TEXT_SERVICE_URL` → `http://text-service:4002` (used by stats-service)
- `AUDIO_SERVICE_URL` → `http://audio-service:4003` (used by stats-service)
- `AI_ORCHESTRATOR_URL` → `http://ai-orchestrator:4005`

## Key Conventions

- **Every service must expose `GET /health`** — checked by Docker Compose healthchecks
- **Subgraph services** implement Apollo Federation via `buildSubgraphSchema` or `@nestjs/graphql` with federation enabled
- The auth-service is intentionally **plain Node.js** (no NestJS) for minimal footprint
- `x-user-id`, `x-user-role`, `x-user-language` headers propagate auth context from gateway to subservices — services trust these headers without re-validation
- **No cross-DB foreign keys** — each service stores `userId` as a plain `Int`; user identity is trusted from headers
- Stats-service uses Node 20 native `fetch()` — no `@nestjs/axios` or Prisma dependency
- CEFR levels: A0, A1, A2, B1, B2, C1, C2
- Supported languages: English, German, Albanian, Polish
