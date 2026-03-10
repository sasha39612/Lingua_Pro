# Lingua Pro — Language Training Platform

A microservices-based language learning platform supporting Listening, Reading, Writing, and Speaking skills with AI-powered feedback.

## Supported Languages
- English, German, Albanian, Polish (extensible)

## Core Features
- User registration/login with JWT (student/admin roles)
- Writing tasks → AI corrections per language
- Audio recording → AI pronunciation analysis
- Statistics dashboard (text + audio scores, by language and period)
- AI-generated tasks based on student CEFR level (A0–C2)

---

## Quick Start (local)

```bash
# 1. Copy and fill in environment variables
cp .env.example .env

# 2. Build and start all containers
docker-compose up -d

# 3. Check that all services are healthy
docker-compose ps
```

To rebuild a single service after code changes:
```bash
docker-compose up -d --build text-service
```

---

## Environment Variables

All variables live in a single `.env` file at the repo root. See [`.env.example`](.env.example) for all required keys:

| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | PostgreSQL credentials |
| `DATABASE_URL_AUTH` | auth-service connection string (`auth_db`) |
| `DATABASE_URL_TEXT` | text-service connection string (`text_db`) |
| `DATABASE_URL_AUDIO` | audio-service connection string (`audio_db`) |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRY` | Token lifetime (default `7d`) |
| `AI_API_KEY` | OpenAI API key |
| `OPENAI_TEXT_MODEL` / `OPENAI_TASK_MODEL` / `OPENAI_EVAL_MODEL` | GPT model overrides (default `gpt-4o-mini`) |
| `OPENAI_TRANSCRIPTION_MODEL` | Whisper model override (default `whisper-1`) |

---

## Repository Structure

```
Lingua_Pro/
├── .env.example                     # Template for all required env vars
├── .dockerignore                    # Monorepo-level Docker build exclusions
├── docker-compose.yml               # Local development orchestration
├── docker-compose.prod.yml          # Production override (GHCR images, resource limits)
├── pnpm-workspace.yaml              # pnpm monorepo: frontend + backend/*
├── frontend/                        # Next.js 15, TypeScript, TailwindCSS
├── backend/
│   ├── api-gateway/                 # Apollo Federation Gateway, :8080
│   ├── auth-service/                # JWT auth, plain Node.js, :4001 — owns auth_db
│   ├── text-service/                # Writing/reading tasks, NestJS, :4002 — owns text_db
│   ├── audio-service/               # Speaking/listening + audio storage, NestJS, :4003 — owns audio_db
│   ├── stats-service/               # Performance aggregation (no DB), NestJS, :4004
│   └── ai-orchestrator/             # OpenAI GPT + Whisper integration, NestJS, :4005
├── nginx/
│   ├── nginx.conf                   # Global Nginx config (rate limiting, upload limits)
│   └── conf.d/lingua.conf           # Virtual host: HTTP→HTTPS, SSL, proxy rules
├── scripts/
│   ├── bootstrap-server.sh          # One-time setup for a fresh Hetzner Ubuntu instance
│   ├── ssl-init.sh                  # Obtain Let's Encrypt certificate
│   ├── deploy.sh                    # Pull GHCR images and restart services (used by CI)
│   ├── health-check.sh              # Cron health monitor (optional Slack alerts)
│   └── e2e-test.sh                  # End-to-end smoke test (requires curl + jq, services running)
├── infrastructure/
│   ├── postgres-init/init.sql       # Creates auth_db, text_db, audio_db on first boot
│   └── README.md                    # Infrastructure reference
└── .github/
    ├── workflows/deploy.yml          # GitHub Actions CI/CD pipeline
    ├── workflows/lint.yml            # Lint & type check (push + PRs)
    └── workflows/test.yml            # Unit tests — Vitest (push + PRs)
```

---

## Service Ports

| Service | Port | Health endpoint |
|---------|------|----------------|
| frontend | 3000 | `/health` |
| api-gateway | 8080 | `/health` |
| auth-service | 4001 | `/health` |
| text-service | 4002 | `/health` |
| audio-service | 4003 | `/health` |
| stats-service | 4004 | `/health` |
| ai-orchestrator | 4005 | `/health` |
| postgres | 5432 | `pg_isready` |

---

## Database Architecture

Each service owns an isolated database on the shared PostgreSQL instance:

| Service | Database | Tables |
|---------|----------|--------|
| auth-service | `auth_db` | `users`, `sessions` |
| text-service | `text_db` | `texts`, `tasks` |
| audio-service | `audio_db` | `audio_records`, `tasks` |
| stats-service | — | no DB — aggregates via REST calls to text/audio services |

Databases are created automatically by `infrastructure/postgres-init/init.sql` on first Postgres container startup. Prisma migrations run at service startup via `entrypoint.sh`.

---

## Docker Build Architecture

All Dockerfiles use a **two-stage build** (builder → runner) with **monorepo root build context** (`context: .`) because `pnpm-lock.yaml` lives at the root.

- **Builder stage**: `pnpm install --frozen-lockfile`, `prisma generate && tsc` (where applicable)
- **Runner stage**: copies compiled `dist/` + root `node_modules/` — no install step, lean image

Services with Prisma (auth, text, audio) run `prisma migrate deploy` at startup via `entrypoint.sh`.

The frontend uses Next.js [`output: 'standalone'`](frontend/next.config.ts). `NEXT_PUBLIC_API_URL` is baked in at build time via `ARG` — it must be set when building the production image.

---

## Testing

### Unit Tests (Vitest)

All 7 packages have Vitest unit test suites:

```bash
pnpm -r test   # run all at once
# or per package:
pnpm --filter frontend test
pnpm --filter auth-service test
pnpm --filter text-service test
pnpm --filter audio-service test
pnpm --filter stats-service test
pnpm --filter ai-orchestrator test
pnpm --filter api-gateway test
```

| Package | Files | Tests | What's covered |
|---------|-------|-------|----------------|
| `frontend` | 4 | 43 | `graphqlRequest` (persisted queries, fallback, error handling), `useAppStore` (all actions), all 6 TanStack Query hooks (`useRegisterMutation`, `useLoginMutation`, `useCheckTextMutation`, `useTasksQuery`, `useTextsQuery`, `useMeQuery`), persisted-query hash map integrity |
| `auth-service` | 1 | 32 | All GraphQL resolvers — `register`, `login`, `me`, `user`, `validateToken`, `refreshToken`, `logout`, `updateUserRole`; JWT sign/verify, argon2 hashing, session revocation |
| `text-service` | 3 | 24 | `TextService` (analyzeText with orchestrator/fallback/DB-fail, getTextsByLanguage, getTasks), `TextController` (all REST endpoints, error propagation), `PrismaService` (lifecycle hooks, connection strings) |
| `audio-service` | 4 | 59 | `AudioService` (evaluateComprehension, processAudio, getRecords, generateComprehension), `AudioController` (all 8 endpoints, missing-field validation), `AudioRepository` (all Prisma queries), `AiOrchestratorService` (Whisper path, fallback, confidence scoring, pronunciation analysis) |
| `stats-service` | 3 | 32 | `StatsService` (averages, language normalisation, mistake counts, daily history, charts, resilience), `StatsController` (language uppercasing, period forwarding), `GetStatsQueryDto` (class-validator rules) |
| `ai-orchestrator` | 2 | 34 | `OrchestratorService` (all operations: local fallbacks, task shape, phoneme hints, score clamping, OpenAI error fallback), `OrchestratorController` (all 5 endpoints including SSE streaming) |
| `api-gateway` | 5 | 25 | `JwtAuthGuard` (public routes, missing/invalid/valid/malformed token, dev-secret fallback), `CircuitBreakerService` (success, async fallback, rejection propagation), `AuthContextService` (header extraction, token parsing edge cases), `GqlThrottlerGuard` (HTTP + GraphQL context extraction), `GatewayResolver` (health + hello) |

### End-to-End Smoke Test

`scripts/e2e-test.sh` runs a full integration smoke test against running services. Requires `curl` and `jq`.

```bash
# Against local docker-compose stack (default)
bash scripts/e2e-test.sh

# Against a remote host
GW_URL=http://your-host:8080 bash scripts/e2e-test.sh
```

The script covers:
1. Health checks for all 5 backend services
2. Auth — register + login via GraphQL
3. Text submission → AI analysis
4. `GET /text/by-language` REST endpoint
5. AI Orchestrator text analysis and task generation
6. Text tasks via GraphQL
7. Audio comprehension evaluation
8. Stats aggregation

---

## Deploying on Hetzner

### First-time server setup

```bash
# 1. Bootstrap a fresh Ubuntu 24.04 instance (installs Docker, Nginx, Certbot)
bash scripts/bootstrap-server.sh

# 2. Clone the repo and configure environment
cd /opt/lingua-pro
git clone <repo-url> .
cp .env.example .env
nano .env   # fill in real credentials

# 3. Obtain SSL certificate and configure Nginx
bash scripts/ssl-init.sh your-domain.com your@email.com

# 4. Deploy (pull images from GHCR and start)
bash scripts/deploy.sh
```

### CI/CD (GitHub Actions)

**On every push and pull request** (`lint.yml`):
- ESLint on the frontend
- TypeScript type check (`tsc --noEmit`) on all 7 packages

**On every push and pull request** (`test.yml`):
- Vitest unit tests for all 7 packages (matrix strategy, runs in parallel)

**On push to `master`** (`deploy.yml`):
1. Builds all 7 Docker images in parallel (matrix strategy)
2. Pushes to GitHub Container Registry (GHCR) tagged with `latest` and commit SHA
3. SSHs into Hetzner and runs `scripts/deploy.sh`

**Required GitHub Secrets / Variables:**

| Key | Where | Value |
|-----|-------|-------|
| `HETZNER_HOST` | Secret | Server IP address |
| `HETZNER_USER` | Secret | SSH user (`root` or deploy user) |
| `HETZNER_SSH_KEY` | Secret | Private SSH key |
| `DOMAIN` | Variable (`vars.DOMAIN`) | Your domain name |

### Manual update after git pull

```bash
cd /opt/lingua-pro
git pull
bash scripts/deploy.sh
```

---

## Skill & Feature Requirements

| Skill | Feature | Description | AI Integration |
|-------|---------|-------------|----------------|
| **Listening** | Play audio task | Student listens to a passage | Optionally show transcript |
| | Answer questions | Multiple choice / free text | AI generates questions per level |
| | AI feedback | Explain mistakes or missed keywords | Streaming feedback supported |
| **Reading** | Show text passage | Display passage for selected level | Optional audio |
| | Answer questions | Multiple choice / free text | AI generates and evaluates answers |
| | AI mistake breakdown | Highlight errors, speed/comprehension | Streaming feedback supported |
| **Writing** | Writing prompt | AI-generated per level | Stored in DB |
| | Submit text | AI analysis | GPT returns corrections |
| | AI corrections | Grammar, style, punctuation | Streaming feedback supported |
| **Speaking** | Record audio | User records via microphone | Frontend handles recording |
| | Send to AI | Whisper transcribes + evaluates | Returns transcript + score |
| | Playback & retry | Listen and retry | AI feedback streams |
| **Auth** | Registration / Login | JWT, email + password | Roles: student / admin |
| **Statistics** | View performance | Aggregated writing & speaking scores | Week/month/all-time |
| **AI Tasks** | Generate per level | Prompts for any skill and CEFR level | Centralized via AI Orchestrator |

---

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router, `output: 'standalone'`)
- **Language**: TypeScript strict mode
- **Styling**: TailwindCSS
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **Server state**: TanStack Query
- **GraphQL**: Custom fetch client with persisted queries (no Apollo Client)

### Backend
- **Runtime**: Node.js 20 / Alpine
- **Framework**: NestJS (all services except auth-service which uses plain Node.js `http`)
- **Package manager**: pnpm workspace
- **ORM**: Prisma per service (auth, text, audio — each with its own schema and database)
- **API**: Apollo Federation (subgraph per service) + REST (inter-service)

### AI
- **Text analysis & task generation**: OpenAI GPT (default `gpt-4o-mini`)
- **Audio transcription**: OpenAI Whisper (default `whisper-1`)
- **Fallbacks**: All AI operations have local fallbacks — the platform works without `AI_API_KEY`

### Infrastructure
- **Database**: PostgreSQL 15 (Alpine) — one instance, three isolated databases
- **Networking**: `lingua-network` Docker bridge
- **Reverse proxy**: Nginx (host) with SSL termination via Let's Encrypt
- **Deployment**: Hetzner cloud, Docker Compose
- **CI/CD**: GitHub Actions → GHCR → Hetzner SSH deploy
