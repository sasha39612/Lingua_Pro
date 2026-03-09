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

## Quick Start

```bash
# 1. Copy and fill in environment variables
cp .env.example .env

# 2. Build and start all 8 containers
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
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | PostgreSQL credentials |
| `DATABASE_URL` | Full connection string — use `postgres` as host (Docker service name) |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRY` | Token lifetime (default `7d`) |
| `AI_API_KEY` | OpenAI API key |
| `OPENAI_TEXT_MODEL` / `OPENAI_TASK_MODEL` / `OPENAI_EVAL_MODEL` | GPT model overrides (default `gpt-4o-mini`) |
| `OPENAI_TRANSCRIPTION_MODEL` | Whisper model override (default `whisper-1`) |

---

## Repository Structure

```
Lingua_Pro/
├── .env.example                 # Template for all required env vars
├── .dockerignore                # Monorepo-level Docker build exclusions
├── docker-compose.yml           # Orchestrates all 8 containers
├── pnpm-workspace.yaml          # pnpm monorepo: frontend + backend/*
├── frontend/                    # Next.js 15, TypeScript, TailwindCSS
└── backend/
    ├── api-gateway/             # Apollo Federation Gateway, :8080
    ├── auth-service/            # JWT auth, plain Node.js, :4001
    ├── text-service/            # Writing/reading tasks, NestJS, :4002
    ├── audio-service/           # Speaking/listening + audio storage, NestJS, :4003
    ├── stats-service/           # Performance aggregation, NestJS, :4004
    └── ai-orchestrator/         # OpenAI GPT + Whisper integration, NestJS, :4005
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

## Docker Build Architecture

All Dockerfiles use a **two-stage build** (builder → runner) and a **monorepo root build context** (`context: .` in docker-compose.yml) because the single `pnpm-lock.yaml` lives at the root.

- **Builder stage**: installs all workspace deps with `pnpm install --frozen-lockfile`, runs `prisma generate && tsc`
- **Runner stage**: copies compiled `dist/` + root `node_modules/` from the builder — no install step, lean image

Services with Prisma (auth, text, audio, stats) use an `entrypoint.sh` that runs `prisma migrate deploy` before starting, ensuring schema migrations are always applied on startup.

The frontend uses Next.js [`output: 'standalone'`](frontend/next.config.ts) — the runner image contains only the self-contained bundle at `.next/standalone/`.

---

## Deploying on Hetzner

1. Provision a Hetzner instance (Ubuntu 24.04), install Docker + Docker Compose.
2. Clone the repository and create `.env`:
   ```bash
   cp .env.example .env
   # Edit .env with real credentials
   ```
3. Start the stack:
   ```bash
   docker-compose up -d
   ```
4. Verify all services are healthy:
   ```bash
   docker-compose ps
   curl http://localhost:8080/health
   ```
5. To update after a push:
   ```bash
   docker-compose up -d --build
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
- **ORM**: Prisma (each service has its own `prisma/schema.prisma`)
- **API**: Apollo Federation (subgraph per service) + REST (inter-service)

### AI
- **Text analysis & task generation**: OpenAI GPT (default `gpt-4o-mini`)
- **Audio transcription**: OpenAI Whisper (default `whisper-1`)
- **Fallbacks**: All AI operations have local fallbacks — the platform works without `AI_API_KEY`

### Infrastructure
- **Database**: PostgreSQL 15 (Alpine), persisted via Docker volume
- **Networking**: `lingua-network` Docker bridge
- **Deployment**: Hetzner cloud, Docker Compose
- **CI/CD**: GitHub Actions
