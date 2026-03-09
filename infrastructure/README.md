# Infrastructure

Configuration and reference documentation for deployment, database schema, and Prisma setup.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript strict |
| Backend | Node.js 20, NestJS, TypeScript strict |
| Auth service | Plain Node.js `http` (no NestJS), port 4001 |
| API gateway | Apollo Federation Gateway, port 8080 |
| Database | PostgreSQL 15-alpine |
| ORM | Prisma (per-service schemas, `prisma migrate deploy` at startup) |
| Package manager | pnpm workspace (`pnpm-lock.yaml` at repo root) |
| Containers | Docker + Docker Compose |
| Networking | Docker bridge network (`lingua-network`) |
| Deployment | Hetzner cloud |
| CI/CD | GitHub Actions |

---

## Docker Compose

All services are defined in [`docker-compose.yml`](../docker-compose.yml) at the monorepo root.

**Build context is always the monorepo root** (`context: .`) because `pnpm-lock.yaml` lives there. Each service specifies its own Dockerfile via the `dockerfile:` key:

```yaml
api-gateway:
  build:
    context: .
    dockerfile: backend/api-gateway/Dockerfile
```

### Service startup order

`depends_on` with `condition: service_healthy` enforces this chain:

```
postgres (healthy)
  → auth-service, text-service, audio-service, stats-service, ai-orchestrator (healthy)
    → api-gateway (healthy)
      → frontend
```

### Volumes

| Volume | Used by | Purpose |
|--------|---------|---------|
| `postgres_data` | postgres | Persist database across restarts |
| `audio_data` | audio-service | Persist uploaded audio files at `/var/app/uploads` |

---

## Environment Variables

Create `.env` at the repo root (copy from [`.env.example`](../.env.example)):

```env
POSTGRES_USER=lingua
POSTGRES_PASSWORD=secret
POSTGRES_DB=english_platform

# Use 'postgres' as host — that's the Docker service name
DATABASE_URL=postgresql://lingua:secret@postgres:5432/english_platform

JWT_SECRET=supersecret
JWT_EXPIRY=7d

AI_API_KEY=your_openai_api_key_here

# All default to gpt-4o-mini / whisper-1 if not set
OPENAI_TEXT_MODEL=gpt-4o-mini
OPENAI_TASK_MODEL=gpt-4o-mini
OPENAI_EVAL_MODEL=gpt-4o-mini
OPENAI_TRANSCRIPTION_MODEL=whisper-1
```

---

## Database Schema

Each service that uses the database has its own `prisma/schema.prisma`. The canonical schema (all tables) lives in [`backend/auth-service/prisma/schema.prisma`](../backend/auth-service/prisma/schema.prisma).

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `email` | VARCHAR UNIQUE | |
| `password_hash` | VARCHAR | argon2 hash |
| `role` | VARCHAR | `student` or `admin` |
| `language` | VARCHAR | default `english` |
| `created_at`, `updated_at` | TIMESTAMP | |

### `sessions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `user_id` | FK → users | CASCADE delete |
| `token` | VARCHAR UNIQUE | JWT token |
| `expires_at` | TIMESTAMP | |
| `created_at` | TIMESTAMP | |

### `texts`
| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `user_id` | FK → users | |
| `language` | VARCHAR | |
| `original_text` | TEXT | |
| `corrected_text` | TEXT | nullable |
| `text_score` | FLOAT | 0.0–1.0 |
| `feedback` | TEXT | nullable |
| `created_at`, `updated_at` | TIMESTAMP | |

### `audio_records`
| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `user_id` | FK → users | |
| `language` | VARCHAR | |
| `transcript` | TEXT | nullable |
| `pronunciation_score` | FLOAT | 0.0–1.0 |
| `feedback` | TEXT | nullable |
| `audio_url` | VARCHAR | nullable |
| `created_at`, `updated_at` | TIMESTAMP | |

### `tasks`
| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `language` | VARCHAR | |
| `level` | VARCHAR | A0–C2 |
| `skill` | VARCHAR | `listening`, `reading`, `writing`, `speaking` |
| `prompt` | TEXT | |
| `audio_url` | VARCHAR | nullable |
| `reference_text` | TEXT | nullable |
| `answer_options` | TEXT[] | 4 options |
| `correct_answer` | VARCHAR | nullable |
| `created_at` | TIMESTAMP | |

---

## Prisma Setup

### Migrations (production)

Migrations run automatically via `entrypoint.sh` in each Prisma service container at startup:

```sh
npx prisma migrate deploy --schema=./prisma/schema.prisma
exec node dist/main.js
```

Services with Prisma: `auth-service`, `text-service`, `audio-service`, `stats-service`.

### Local development

From within a service directory:

```bash
# Generate Prisma client after schema changes
pnpm prisma:generate

# Create a new migration
pnpm prisma:migrate

# Inspect the database
npx prisma studio
```

### Key files per service

```
backend/<service>/
├── prisma/
│   ├── schema.prisma      # Data model — defines tables, relations, indexes
│   └── migrations/        # Auto-generated SQL migration files
└── src/prisma/
    └── prisma.service.ts  # NestJS injectable PrismaService
```

### Special: audio-service custom Prisma output

`audio-service/prisma/schema.prisma` uses a custom output path:
```
generator client {
  output = "../src/generated/prisma"
}
```
The generated client lands at `src/generated/prisma/` and is required at runtime. The Docker runner image copies this directory from the builder:
```dockerfile
COPY --from=builder /app/backend/audio-service/src/generated ./src/generated
```

---

## Hetzner Deployment

```bash
# 1. Provision Ubuntu 24.04, install Docker + Docker Compose
# 2. Clone repo and configure environment
cp .env.example .env
# edit .env with real credentials

# 3. Start all services (builds images on first run)
docker-compose up -d

# 4. Verify
docker-compose ps
curl http://localhost:8080/health

# 5. Update after a git pull
docker-compose up -d --build
```

### CI/CD with GitHub Actions

Typical pipeline:
1. Build Docker images and push to a registry (GHCR or Docker Hub)
2. SSH into Hetzner host
3. Run `docker-compose pull && docker-compose up -d`
