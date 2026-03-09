# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (`frontend/`)
```bash
cd frontend
pnpm dev          # Start dev server on :3000
pnpm build        # Production build
pnpm lint         # ESLint via Next.js
```

### Backend Services (each in `backend/<service>/`)
```bash
# Development
pnpm start        # ts-node (auth-service, text-service, ai-orchestrator)
pnpm start:dev    # ts-node-dev with --respawn (api-gateway, stats-service)

# Build & Production
pnpm build        # tsc → dist/
pnpm start:prod   # node dist/main.js

# Database (services with Prisma)
pnpm prisma:generate   # Generate Prisma client
pnpm prisma:migrate    # Run migrations (dev)
```

### Tests (audio-service, stats-service)
```bash
cd backend/audio-service   # or stats-service
pnpm test                  # jest
```

### Full Stack
```bash
docker-compose up -d       # Build and start all services
docker-compose ps          # Check health
docker-compose pull && docker-compose up -d  # Deploy update
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
      → text-service    (:4002)
      → audio-service   (:4003)
      → stats-service   (:4004)
      → ai-orchestrator (:4005, optional)
```

All frontend GraphQL goes through the Next.js `/api/graphql` route, which proxies to the API Gateway. The frontend uses persisted queries with SHA-256 hashes, falling back to full query strings if the persisted query isn't found.

### API Gateway (`backend/api-gateway/`)
- **Apollo Federation Gateway** using `IntrospectAndCompose` — it polls all subgraph schemas every 10s
- Applies **JWT auth** globally via `JwtAuthGuard` (decorating public routes with `@Public()`)
- Passes auth context downstream via HTTP headers: `x-user-id`, `x-user-role`, `x-user-language`, `x-trace-id`
- **Circuit breaker** via `opossum` (10s timeout, 50% error threshold, 30s reset)
- **Rate limiting** via `@nestjs/throttler`: 120 requests / 60s per IP

### Backend Services
Each service is a **separate NestJS application** implementing an Apollo Federation subgraph. Services communicate with each other only through the API Gateway in normal operation; direct inter-service HTTP calls happen for specific delegation scenarios (e.g., api-gateway calling text-service for mutation delegation).

| Service | Port | Framework | Notes |
|---------|------|-----------|-------|
| auth-service | 4001 | Raw Node.js `http` + `buildSubgraphSchema` | No NestJS, uses Prisma + argon2 for passwords, JWT via `jsonwebtoken` |
| text-service | 4002 | NestJS + Apollo subgraph | Calls ai-orchestrator for analysis |
| audio-service | 4003 | NestJS | REST controller for audio upload; Prisma for storage |
| stats-service | 4004 | NestJS | REST endpoints for stats aggregation |
| ai-orchestrator | 4005 | NestJS | OpenAI client (GPT-4o-mini for text/tasks, Whisper for transcription); local fallbacks when `AI_API_KEY` not set |

### AI Orchestrator
- All AI calls are funneled through `OrchestratorService`
- Every OpenAI call has a **retry policy** (3 attempts, exponential backoff 400ms base) and a **timeout** (15–25s per operation)
- **Local fallbacks** exist for all AI operations — the service stays functional without `AI_API_KEY`
- Models are configurable via env vars: `OPENAI_TEXT_MODEL`, `OPENAI_TASK_MODEL`, `OPENAI_EVAL_MODEL`, `OPENAI_TRANSCRIPTION_MODEL` (all default to `gpt-4o-mini` or `whisper-1`)

### Database
- **Each service has its own Prisma schema** and manages its own DB tables. The auth-service schema is the canonical schema (includes User, Session, Text, AudioRecord, Task). Text-service and audio-service have their own subsets.
- All use `@prisma/adapter-pg` (Prisma v7 driver adapters) with a `pg.Pool` connection

### Frontend (`frontend/`)
- **Next.js 15 App Router** with TypeScript strict mode
- **No Apollo Client** — uses a custom lightweight `graphqlRequest()` function in `src/lib/graphql-client.ts`
- All GraphQL operations defined in `src/lib/graphql-operations.ts`; hashes for persisted queries in `src/lib/persisted-queries.ts`
- **Zustand** for global state (`src/store/app-store.ts`)
- **React Hook Form + Zod** for form validation
- **TanStack Query** (`@tanstack/react-query`) for server state / caching
- App routes map 1:1 to skill pages: `/writing`, `/reading`, `/listening`, `/speaking`, `/stats`, `/dashboard`, `/admin`

## Project Structure

```
Lingua_Pro/
├── docker-compose.yml               # Orchestrates all services
├── pnpm-workspace.yaml              # Monorepo: frontend + backend/*
├── frontend/                        # Next.js 15 App Router
│   └── src/
│       ├── app/
│       │   ├── api/
│       │   │   ├── graphql/route.ts     # Proxy → API Gateway :8080
│       │   │   └── ai-feedback/route.ts # SSE streaming endpoint
│       │   ├── layout.tsx
│       │   ├── page.tsx                 # Landing / home
│       │   ├── login/
│       │   ├── dashboard/
│       │   ├── writing/
│       │   ├── reading/
│       │   ├── listening/
│       │   ├── speaking/
│       │   ├── stats/
│       │   ├── admin/
│       │   └── settings/
│       ├── components/                  # One component per page + shared
│       │   ├── app-shell.tsx            # Layout wrapper (nav, sidebar)
│       │   ├── providers.tsx            # React Query + Zustand providers
│       │   ├── audio-recorder.tsx       # MediaRecorder wrapper
│       │   ├── streamed-feedback.tsx    # SSE feedback consumer
│       │   └── [skill]-page.tsx         # writing, reading, listening, speaking, stats…
│       ├── lib/
│       │   ├── graphql-client.ts        # fetch wrapper (persisted queries + fallback)
│       │   ├── graphql-operations.ts    # All GQL query/mutation strings
│       │   ├── graphql-hooks.ts         # TanStack Query hooks over graphqlRequest
│       │   ├── graphql-types.ts         # TypeScript types for GQL responses
│       │   ├── persisted-queries.ts     # SHA-256 hash map per operation name
│       │   └── types.ts                 # Shared domain types
│       └── store/
│           └── app-store.ts             # Zustand store (auth token, user, language)
│
└── backend/
    ├── api-gateway/                 # NestJS, Apollo Federation Gateway, :8080
    │   └── src/
    │       ├── app.module.ts            # Gateway + federation config
    │       ├── auth/
    │       │   ├── jwt-auth.guard.ts    # Global JWT guard
    │       │   ├── auth-context.service.ts
    │       │   └── public.decorator.ts  # @Public() to skip auth
    │       ├── graphql/
    │       │   ├── gateway.resolver.ts
    │       │   ├── delegated.resolver.ts
    │       │   ├── mutation-delegation.resolver.ts
    │       │   ├── gql-throttler.guard.ts
    │       │   └── text-input.types.ts
    │       └── services/
    │           └── circuit-breaker.service.ts  # opossum wrapper
    │
    ├── auth-service/                # Plain Node.js http, :4001
    │   ├── prisma/schema.prisma         # Canonical schema (User, Session, Text, AudioRecord, Task)
    │   └── src/
    │       ├── main.ts                  # Raw HTTP server
    │       └── graphql/auth.schema.ts   # buildSubgraphSchema (register, login, me, logout)
    │
    ├── text-service/                # NestJS + Apollo subgraph, :4002
    │   ├── prisma/schema.prisma         # User, Text, Task
    │   └── src/
    │       ├── app.module.ts
    │       ├── graphql/text.schema.ts   # checkText, generateTask mutations
    │       ├── text/
    │       │   ├── text.service.ts      # Calls ai-orchestrator REST
    │       │   └── text.controller.ts
    │       └── prisma/prisma.service.ts
    │
    ├── audio-service/               # NestJS, :4003
    │   ├── prisma/schema.prisma         # AudioRecord
    │   └── src/
    │       ├── audio/
    │       │   ├── audio.controller.ts  # POST /audio/analyze, GET /audio/records
    │       │   ├── audio.service.ts     # Calls ai-orchestrator REST
    │       │   └── audio.repository.ts  # Prisma queries
    │       ├── ai-orchestrator/
    │       │   └── ai-orchestrator.service.ts  # HTTP client for orchestrator
    │       └── prisma/prisma.service.ts
    │
    ├── stats-service/               # NestJS, :4004
    │   ├── prisma/schema.prisma
    │   └── src/
    │       ├── stats/
    │       │   ├── stats.controller.ts  # GET /stats?language=&period=
    │       │   └── stats.service.ts     # Aggregates text + audio scores
    │       └── prisma/
    │
    └── ai-orchestrator/             # NestJS, :4005
        └── src/
            ├── orchestrator.controller.ts  # REST: POST /analyze, /transcribe, /evaluate, /generate-tasks
            └── orchestrator.service.ts     # OpenAI calls with retry, timeout, local fallbacks
```

## Environment Variables

Create a `.env` file at the repo root:
```env
POSTGRES_USER=demo
POSTGRES_PASSWORD=demo
POSTGRES_DB=english_platform
AI_API_KEY=your-openai-api-key-here
JWT_SECRET=supersecretjwtkey
DATABASE_URL=postgresql://demo:demo@postgres:5432/english_platform
```

Service-level env overrides (with defaults):
- `AUTH_SERVICE_URL` → `http://auth-service:4001/graphql`
- `TEXT_SERVICE_URL` → `http://text-service:4002/graphql`
- `AUDIO_SERVICE_URL` → `http://audio-service:4003/graphql`
- `STATS_SERVICE_URL` → `http://stats-service:4004/graphql`
- `AI_ORCHESTRATOR_URL` / `AI_ORCHESTRATOR_GRAPHQL_URL`

## Key Conventions

- **Every service must expose `/health` (GET)** — checked by Docker Compose healthchecks
- **Subgraph services** implement Apollo Federation: use `buildSubgraphSchema` or `@nestjs/graphql` with federation enabled
- The auth-service is intentionally **plain Node.js** (no NestJS) for minimal footprint
- `x-user-id`, `x-user-role`, `x-user-language` headers are the mechanism for passing auth context from gateway to subservices — services trust these headers (no re-validation)
- CEFR levels used throughout: A0, A1, A2, B1, B2, C1, C2
- Supported languages: English, German, Albanian, Polish
