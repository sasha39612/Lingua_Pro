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
pnpm test         # Vitest unit tests
pnpm analyze      # Build with @next/bundle-analyzer — opens .next/analyze/*.html
pnpm size         # size-limit bundle budget check (requires a prior build)
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

# Database (services with Prisma: auth, text, audio, ai-orchestrator)
pnpm prisma:generate   # Generate Prisma client manually
pnpm prisma:migrate    # Create + apply migration (dev only)
# Production migrations run automatically via entrypoint.sh on container startup
# ai-orchestrator: run prisma:generate after adding DATABASE_URL_AI_ORCHESTRATOR to .env
```

### Tests
```bash
# Unit tests — Vitest (all services)
pnpm --filter frontend test
pnpm --filter audio-service test
pnpm --filter stats-service test
pnpm --filter auth-service test
pnpm --filter ai-orchestrator test
pnpm --filter text-service test
pnpm --filter api-gateway test
pnpm -r test                       # run all at once

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
- `audio-service` → `ai-orchestrator` (REST): transcription (`POST /audio/transcribe`), pronunciation analysis (`POST /audio/pronunciation/analyze`)
- `stats-service` → `text-service` (REST `GET /text/by-language`) + `audio-service` (REST `GET /audio/by-language`): stats aggregation — stats-service has no database of its own

### API Gateway (`backend/api-gateway/`)
- **Apollo Federation Gateway** using `IntrospectAndCompose` — federates **only** auth-service and text-service (the two GraphQL subgraphs); polls schemas every 10s
- **audio-service and stats-service are REST-only** — they are NOT in the subgraph list; never add them
- Applies **JWT auth** via `JwtAuthGuard` on HTTP routes (decorating public routes with `@Public()`); GraphQL requests use `AuthContextService` inside the Apollo `expressMiddleware` context function
- Passes auth context downstream via HTTP headers: `x-user-id`, `x-user-role`, `x-user-language`, `x-trace-id`
- **Circuit breaker** via `opossum` (10s timeout, 50% error threshold, 30s reset)
- **Rate limiting** handled by Nginx; `@nestjs/throttler` removed due to NestJS 11 incompatibility — do not re-add it

### Backend Services

| Service | Port | Framework | GraphQL subgraph? | Database | Notes |
|---------|------|-----------|-------------------|----------|-------|
| auth-service | 4001 | Raw Node.js `http` + `buildSubgraphSchema` | ✅ yes | `auth_db` | No NestJS, uses argon2, JWT via `jsonwebtoken`; exposes `users(limit,offset,cursor)` + `usersCount` queries (admin + internal-token gated) |
| text-service | 4002 | NestJS + Apollo subgraph | ✅ yes | `text_db` | Calls ai-orchestrator for analysis; `GET /text/admin/summary` (internal-token gated) |
| audio-service | 4003 | NestJS | ❌ REST only | `audio_db` | Custom Prisma output path; frontend calls it directly; `GET /audio/admin/summary` (internal-token gated) |
| stats-service | 4004 | NestJS | ❌ REST only | **none** | Aggregates via fetch to text-service + audio-service; `GET /admin/stats` aggregates all services (internal-token gated) |
| ai-orchestrator | 4005 | NestJS | ❌ REST only | `ai_orchestrator_db` | Azure Speech SDK + OpenAI (GPT + Whisper + TTS); local fallbacks when keys not set; logs usage to `ai_usage_events` |

### Database (database-per-service)
One PostgreSQL container (`postgres:5432`) with four isolated databases:

| Database | Owner | Tables |
|----------|-------|--------|
| `auth_db` | auth-service | `users`, `sessions` |
| `text_db` | text-service | `texts` (with `skill` column, default `'writing'`), `tasks` |
| `audio_db` | audio-service | `audio_records`, `tasks`, `listening_scores` |
| `ai_orchestrator_db` | ai-orchestrator | `ai_usage_events` (Phase 2 — accumulates token/cost/failure data) |

Databases are created by `infrastructure/postgres-init/init.sql` on first Postgres startup. Prisma schemas contain only the tables each service owns — **no cross-service FK relations** (userId is a plain `Int`). Stats-service has no database: it calls `GET /text/by-language` and `GET /audio/by-language` on the respective services.

Audio-service uses a **custom Prisma output path** (`output = "../src/generated/prisma"`). The generated client is copied in its Dockerfile:
```dockerfile
COPY --from=builder /app/backend/audio-service/src/generated ./src/generated
```

### Stats-service (no DB)
`stats.service.ts` uses Node 20 native `fetch()` to call three sources in parallel:
- `GET http://text-service:4002/text/by-language?language=&from=`
- `GET http://audio-service:4003/audio/by-language?language=&from=`
- `GET http://audio-service:4003/audio/listening-by-language?language=&from=`

Then aggregates scores (merging speaking + listening into `avg_pronunciation_score`), builds daily history, and categorises mistake types in-process. No Prisma, no database dependency. Each fetch is independently resilient — failure of one source returns partial stats from the remaining two.

`AdminStatsService` provides the admin dashboard endpoint (`GET /admin/stats`) — calls text/audio/auth services in parallel (all with `x-internal-token + x-internal-service + x-request-id` headers), merges results into `AdminStatsOverview`. Weighted averages always carry raw `score_sum + count` pairs — never average pre-computed averages. Key fields: `feature_usage_proxy` (session-derived AI load proxies, not actual API call counts), `funnel.active_users_cross_service_estimate` (systematic overcount — see Admin data aggregation conventions).

### AI Orchestrator
`OrchestratorService` is a **thin facade** that composes five focused provider services:

| Provider | Responsibility | Model / Service |
|----------|---------------|-----------------|
| `SpeechService` | Audio transcription, phoneme extraction, word alignment | Azure Speech SDK (primary); Whisper fallback |
| `TextAiService` | Text analysis — grammar, corrections, feedback | `OPENAI_TEXT_MODEL` (default `gpt-4o`) |
| `TaskService` | CEFR task generation; `skill=writing` → `WritingTask` JSON in `prompt`; `skill=reading` → passage + 16 questions; `generateListeningExercise()` → 8-question CEFR-graded exercise (2×B1 MC, 2×B2 T/F/NG, 2×C1 short_answer, 2×C2 paraphrase) with weighted scoring 1–4 pts, total 20; **all question types use 4 options + numeric `correctAnswer` 0-3** — `short_answer` and `paraphrase` render as dropdowns on the frontend | `OPENAI_TASK_MODEL` (default `gpt-4o-mini`) |
| `PronunciationAiService` | Human-readable pronunciation feedback string **only** | `OPENAI_EVAL_MODEL` (default `gpt-4o`) |
| `TtsService` | Text-to-speech audio generation → base64 MP3 | `OPENAI_TTS_MODEL` (default `gpt-4o-mini-tts`) |

**Hard scoring boundary** — never cross it:
- **Azure** = all numeric scores (`pronunciationScore`, `accuracyScore`, `fluencyScore`, `completenessScore`, `prosodyScore`)
- **GPT** = human-readable `feedback` string and `phonemeHints[]` only — GPT never produces scores
- **Fallback** (languages Azure Pronunciation Assessment doesn't support, e.g. Polish, Ukrainian) = Whisper transcription + per-word `normalizedEditDistance` scoring; no phoneme data

**Word alignment** — `SpeechService` computes `WordAlignment[]` via token-level Levenshtein after Azure responds:
```
type: 'correct' | 'missing' | 'extra' | 'mispronounced'
```

**Audio conversion** — `SpeechService` uses FFmpeg to convert incoming `audio/webm` (browser MediaRecorder) to 16 kHz mono PCM WAV before passing to Azure SDK. FFmpeg is installed in the Docker image.

**Retry policy**: 3 attempts, exponential backoff (400ms base); **timeout**: 15–25s per operation

**Local fallbacks** for all operations — stays functional without `AI_API_KEY` or `AZURE_SPEECH_KEY`

**Endpoints**:
- `POST /text/analyze` — text correction + feedback
- `POST /text/analyze-writing` — structured writing evaluation: 4 scored criteria (task achievement, grammar/vocabulary, coherence/structure, style) + corrected text; feedback written in the task language
- `POST /tasks/generate` — CEFR task generation; `skill=writing` returns a `WritingTask` JSON stored in `prompt` field (situation, taskPoints, instructions, exampleStructure, wordCountMin/Max, style)
- `POST /tasks/generate-listening` — listening passage generation; without `version` param returns old 5-question MC format (`ListeningPassage`); with `version: '2'` returns 8-question CEFR-graded `ListeningPassageV2` (used by audio-service)
- `POST /audio/transcribe` — transcription with `words[]` and `source`
- `POST /audio/pronunciation/analyze` — Azure scores + GPT feedback + word alignment
- `POST /audio/tts` — TTS audio generation
- `GET /text/analyze/stream` — SSE streaming text analysis
- `GET /usage/admin` — AI usage event summary grouped by featureType/endpoint/model (admin `x-user-role` header required)

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
│   ├── postgres-init/init.sql       # Creates auth_db, text_db, audio_db, ai_orchestrator_db on first boot
│   └── README.md
├── .github/
│   ├── workflows/deploy.yml          # CI/CD: parallel image builds → GHCR → SSH deploy
│   ├── workflows/lint.yml            # Lint & type check on push + PRs
│   └── workflows/test.yml            # Vitest unit tests on push + PRs
│
├── frontend/                        # Next.js 15 App Router
│   └── src/
│       ├── app/
│       │   ├── api/
│       │   │   ├── graphql/route.ts     # Proxy → API Gateway :8080
│       │   │   ├── ai-feedback/route.ts # SSE streaming endpoint
│       │   │   ├── audio/analyze/route.ts # Multipart audio → base64 → audio-service POST /audio/analyze-base64
│       │   │   ├── reading/task/route.ts  # GET ?language&level&userId → text-service GET /text/tasks?skill=reading
│       │   │   ├── writing/task/route.ts  # GET ?language&level&userId → text-service GET /text/tasks?skill=writing; returns { taskId, writingTask }
│       │   │   ├── writing/analyze/route.ts # POST { text, language, taskContext } → ai-orchestrator POST /text/analyze-writing; returns WritingAnalysisResult
│       │   │   ├── stats/route.ts         # GET ?language&period → stats-service GET /stats; proxy with auth headers
│       │   │   ├── admin/
│       │   │   │   ├── stats/route.ts     # GET ?period&language → stats-service GET /admin/stats; JWT role=admin + x-internal-token
│       │   │   │   └── users/route.ts     # GET ?limit&offset → api-gateway AdminUsers GQL query; JWT role=admin
│       │   │   └── text/score/route.ts    # POST { userId, language, skill, score } → text-service POST /text/score; fire-and-forget score persistence
│       │   └── [writing|reading|listening|speaking|stats|dashboard|admin|settings]/
│       ├── components/
│       │   ├── app-shell.tsx            # Layout wrapper (nav, sidebar)
│       │   ├── audio-recorder.tsx       # MediaRecorder wrapper
│       │   ├── streamed-feedback.tsx    # SSE feedback consumer
│       │   ├── admin-page.tsx           # 4-tab admin dashboard (overview/users/learning/ai-usage "AI Load (Proxy)"); role guard → ForbiddenPanel
│       │   └── stats/                   # Stats page sub-components
│       │       ├── types.ts             # Period, SkillKey, SummaryStats, SkillScores, ChartData, WeakPoint
│       │       ├── utils.ts             # getNextLevel, computeStreak, buildWeakPoints, formatMistakeLabel
│       │       ├── stats-header.tsx     # Period + skill selectors (uses SelectDropdown)
│       │       ├── summary-cards.tsx    # 4 cards: Level, Active Days, Accuracy, Streak
│       │       ├── level-progress-card.tsx
│       │       ├── skills-card.tsx      # 4 skill bars: Reading/Writing/Speaking/Listening
│       │       ├── weak-points-card.tsx # Weak points with "Practice" links → skill pages
│       │       ├── achievements.tsx     # 6 achievements computed from real data
│       │       └── charts-section.tsx   # SVG line chart (progress over time) + bar chart (mistakes by type)
│       ├── lib/
│       │   ├── graphql-client.ts        # fetch wrapper (persisted queries + fallback)
│       │   ├── graphql-operations.ts    # All GQL query/mutation strings (includes AdminUsers)
│       │   ├── graphql-hooks.ts         # TanStack Query hooks
│       │   ├── admin-hooks.ts           # useAdminStats, useAdminUsers (staleTime: 60_000)
│       │   ├── persisted-queries.ts     # SHA-256 hash map per operation name
│       │   └── types.ts                 # Includes AdminUser, AdminStatsOverview
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
    │   └── src/graphql/auth.schema.ts   # register, login, me, logout; users(limit,offset,cursor) + usersCount (admin JWT or x-internal-token + x-internal-service)
    │
    ├── text-service/                # NestJS + Apollo subgraph, :4002 → text_db
    │   ├── prisma/schema.prisma         # texts, tasks (no User model — userId is plain Int)
    │   └── src/
    │       ├── graphql/text.schema.ts
    │       └── text/
    │           ├── text.service.ts      # analyzeText, getTextsByLanguage, getTasks, recordScore, getAdminSummary (raw SQL, UTC)
    │           └── text.controller.ts   # POST /text/check, POST /text/score, GET /text/tasks, GET /text/by-language, GET /text/admin/summary
    │
    ├── audio-service/               # NestJS, :4003 → audio_db
    │   ├── prisma/schema.prisma         # audio_records, tasks (no User model)
    │   └── src/
    │       ├── audio/
    │       │   ├── audio.controller.ts  # POST /check, POST /analyze-base64, GET /records/:id, GET /by-language, GET /listening-by-language, GET /listening-task, POST /listening-answers, GET /audio/admin/summary
    │       │   ├── audio.service.ts     # getAdminSummary, adminActiveUserIds (raw SQL, UTC)
    │       │   └── audio.repository.ts  # Prisma queries (uses src/generated/prisma); admin SQL helpers (getDailyCounts, getTopUsers, etc.); exports AudioPeriod, audioPeriodToFromDate, audioSafeAvg
    │       └── generated/prisma/        # Custom Prisma output (committed type stubs only)
    │
    ├── stats-service/               # NestJS, :4004 — NO DATABASE
    │   └── src/
    │       ├── stats/
    │       │   ├── stats.controller.ts    # GET /stats?language=&period=; GET /admin/stats (x-internal-token gated)
    │       │   ├── stats.service.ts       # fetch() → text-service + audio-service
    │       │   └── admin-stats.service.ts # Parallel fetch from text/audio/auth; merges AdminStatsOverview; weighted avg guards
    │       └── server.ts
    │
    └── ai-orchestrator/             # NestJS, :4005
        ├── prisma/schema.prisma             # AiUsageEvent model → ai_usage_events table (ai_orchestrator_db)
        └── src/
            ├── types.ts                     # Shared types: PhonemeDetail, WordDetail, WordAlignment, PronunciationAnalysisResult, TtsResult, …
            ├── util.ts                      # Pure helpers: withRetry, withRetryTracked, withTimeout, safeJsonParse, decodeBase64, normalizedEditDistance, enrichPhonemeContext, PHONEME_MAP, …
            ├── orchestrator.controller.ts   # HTTP layer — 7 endpoints; generates requestId per request (or reads x-request-id header)
            ├── orchestrator.service.ts      # Thin facade — composes the 5 providers below
            ├── speech.service.ts            # Azure transcription + phoneme extraction + word alignment; Whisper fallback
            ├── text-ai.service.ts           # GPT-4o: text analysis (reading/writing domain); logs usage events
            ├── task.service.ts              # GPT-4o-mini: CEFR task generation; skill='reading' generates 1 full exercise (passage + 16 questions across 5 types); generateListeningExercise() generates 8-question CEFR-graded exercise (v2 format)
            ├── pronunciation-ai.service.ts  # GPT-4o: feedback string + phoneme hints ONLY (no scores)
            ├── tts.service.ts               # gpt-4o-mini-tts: text → base64 MP3
            ├── prisma/
            │   └── prisma.service.ts        # Conditional require('../generated/prisma'); degrades gracefully if not yet generated
            └── usage/
                ├── ai-usage.service.ts      # log() — fire-and-forget; never throws; no-ops when Prisma unavailable
                ├── error-type.ts            # ErrorType const + classifyError(err) — centralised error classification
                └── usage.controller.ts      # GET /usage/admin — groups ai_usage_events (x-user-role: admin)
```

## Environment Variables

Create `.env` at the repo root (copy from `.env.example`):
```env
POSTGRES_USER=lingua
POSTGRES_PASSWORD=secret

DATABASE_URL_AUTH=postgresql://lingua:secret@postgres:5432/auth_db
DATABASE_URL_TEXT=postgresql://lingua:secret@postgres:5432/text_db
DATABASE_URL_AUDIO=postgresql://lingua:secret@postgres:5432/audio_db
DATABASE_URL_AI_ORCHESTRATOR=postgresql://lingua:secret@postgres:5432/ai_orchestrator_db

JWT_SECRET=supersecretjwtkey
JWT_EXPIRY=7d

# Internal service auth (shared secret — never expose to browser)
INTERNAL_SERVICE_SECRET=your-internal-service-secret-here

AI_API_KEY=your-openai-api-key-here
OPENAI_TEXT_MODEL=gpt-4o
OPENAI_TASK_MODEL=gpt-4o-mini
OPENAI_EVAL_MODEL=gpt-4o
OPENAI_TRANSCRIPTION_MODEL=whisper-1
OPENAI_TTS_MODEL=gpt-4o-mini-tts

# Azure Speech Services (ai-orchestrator — primary transcription + pronunciation scoring)
AZURE_SPEECH_KEY=your-azure-speech-key-here
AZURE_SPEECH_REGION=westeurope
```

Service-level env (with defaults):
- `AUTH_SERVICE_URL` → `http://auth-service:4001/graphql`
- `TEXT_SERVICE_URL` → `http://text-service:4002` (used by stats-service)
- `AUDIO_SERVICE_URL` → `http://audio-service:4003` (used by stats-service)
- `AI_ORCHESTRATOR_URL` → `http://ai-orchestrator:4005`
- `API_GATEWAY_URL` → `http://api-gateway:8080` (used by frontend admin proxy)

## Key Conventions

- **Every service must expose `GET /health`** — checked by Docker Compose healthchecks
- **Subgraph services** implement Apollo Federation via `buildSubgraphSchema` or `@nestjs/graphql` with federation enabled
- The auth-service is intentionally **plain Node.js** (no NestJS) for minimal footprint
- `x-user-id`, `x-user-role`, `x-user-language` headers propagate auth context from gateway to subservices — services trust these headers without re-validation
- **No cross-DB foreign keys** — each service stores `userId` as a plain `Int`; user identity is trusted from headers
- Stats-service uses Node 20 native `fetch()` — no `@nestjs/axios` or Prisma dependency
- CEFR levels: A0, A1, A2, B1, B2, C1, C2
- Supported languages: English, German, Albanian, Polish, Ukrainian

### Internal service authentication
Admin endpoints (text/audio/stats-service) and the auth-service `usersCount` query are protected by two headers that **both** must be present and valid:
- `x-internal-token` — value must match `INTERNAL_SERVICE_SECRET` env var (server-side only — never sent to browser)
- `x-internal-service` — value must be in the service's allowlist (e.g. `['stats-service', 'api-gateway']`)

This pattern is used instead of trusting `x-user-role` (which is forgeable by any service in the Docker network). The allowed-service list is logged on each call for auditability.

**`x-user-role: admin`** is only trusted for endpoints where the gateway has already verified the JWT — never use it as the sole guard for internal service-to-service calls.

### Admin data aggregation conventions
- **All admin aggregations use raw SQL** (`prisma.$queryRaw`) — never `prisma.groupBy()`; this ensures `DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')` is applied consistently (Prisma `groupBy` ignores timezone transforms)
- **Weighted averages** — always carry `score_sum` and `count` separately; compute `score_sum / count` at the final merge step with a `count > 0` guard; never average pre-computed averages
- **DAU estimates** — field is `active_users_cross_service_estimate` (systematic overcount: per-service distinct user counts summed; users active on both text and audio the same day are counted twice); exact dedup via `?exact=true` (hard-gated to `period=week` + `x-debug-mode: true`); exact-mode SQL applies `LIMIT` inside a subquery **before** any `DISTINCT` so Postgres never builds a large hash-dedup set in memory; limits are env-configurable (`MAX_EXACT_IDS_PER_DAY`, `MAX_EXACT_IDS_TOTAL`)
- **Language normalisation** — `normLang()` in `admin-stats.service.ts` maps all variants to canonical keys (`'en'`/`'english'` → `'english'`, etc.) via `LANG_CANONICAL`; unknown values map to `'other'` and emit a `console.warn` for future mapping — never use raw strings as analytics keys
- **In-flight deduplication** — `AdminStatsService.getAdminStats()` deduplicates concurrent requests with a stable key (`period:language:exact:debug`) and an `AbortController` timeout that cancels all upstream fetches if they hang; prevents fan-out storms when multiple admins load simultaneously
- **UTC date strings** — all `time_series.date` values are `YYYY-MM-DD` in UTC; use `parseUtcDate(dateStr)` (defined in `admin-page.tsx`) — never `new Date(dateStr)` which applies local timezone offset

### AI usage logging
- `AiUsageService.log()` is **fire-and-forget** — always call with `void`, never `await`; it never throws and no-ops gracefully if Prisma is unavailable
- `withRetryTracked()` returns `{ result, attempts }` — declare `let attempts = 0` **outside** the try block so the catch block can read it; `retryCount = attempts - 1` (0 = clean first-attempt success)
- Log **after** the full retry sequence completes, never inside the retry callback — logging inside inflates counts and creates misleading failure data
- `requestId` is generated once per incoming HTTP request (or read from `x-request-id` header) and passed through all service calls so multiple AI operations triggered by one user action can be correlated
