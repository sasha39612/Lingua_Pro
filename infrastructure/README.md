# Infrastructure

Contains deployment manifests, Terraform/CloudFormation templates, and configuration for CI/CD. Includes networking, database provisioning, and service definitions used by docker-compose or Kubernetes.

## Technology Stack Overview

- **Frontend**: Next.js 15+ (latest stable), React 18+, TypeScript (strict)
- **Backend**: Node.js 18+, NestJS (all microservices)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Containerization**: Docker + Docker Compose
- **Networking**: Docker bridge network (`lingua-network`)
- **Deployment**: Hetzner cloud
- **CI/CD**: GitHub Actions

---

## Database Schema

The PostgreSQL database is initialized with the following tables:

### `users`
Stores student and admin account information.
- `id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR, unique)
- `password_hash` (VARCHAR)
- `role` (VARCHAR: 'student' or 'admin')
- `language` (VARCHAR: default 'english')
- `created_at`, `updated_at` (TIMESTAMP)

### `texts`
Stores writing and reading task results.
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER, FK to users)
- `language` (VARCHAR)
- `original_text` (TEXT)
- `corrected_text` (TEXT)
- `text_score` (FLOAT)
- `feedback` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

### `audio_records`
Stores speaking and listening task results.
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER, FK to users)
- `language` (VARCHAR)
- `transcript` (TEXT)
- `pronunciation_score` (FLOAT)
- `feedback` (TEXT)
- `audio_url` (VARCHAR)
- `created_at`, `updated_at` (TIMESTAMP)

### `tasks`
Stores AI-generated tasks per level and language (recommended but optional).
- `id` (SERIAL PRIMARY KEY)
- `language` (VARCHAR)
- `level` (VARCHAR: A0–C2)
- `skill` (VARCHAR: 'listening', 'reading', 'writing', or 'speaking')
- `prompt` (TEXT)
- `audio_url` (VARCHAR, optional)
- `reference_text` (TEXT, optional)
- `answer_options` (TEXT[], optional)
- `correct_answer` (TEXT, optional)
- `created_at` (TIMESTAMP)

## Schema Initialization

Run `database-schema.sql` against the PostgreSQL instance to create all tables and indexes:

```bash
psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f database-schema.sql
```

Or use Docker Compose to initialize automatically by adding an init script to the postgres service.

## Prisma Setup

Each microservice that accesses the database (auth-service, text-service, audio-service, stats-service) includes a Prisma schema file in `prisma/schema.prisma`.

### Initialize Prisma for a Service

From within each service directory:

```bash
# Install Prisma dependencies
npm install @prisma/client @nestjs/prisma

# Generate Prisma client from schema
npx prisma generate

# Run migrations (if schema changes)
npx prisma migrate dev --name <migration_name>

# (Optional) View database via Prisma Studio
npx prisma studio
```

### Key Prisma Files

- `prisma/schema.prisma` – Data model definition (auto-generates migrations)
- `.env` – Must include `DATABASE_URL=postgresql://user:password@host:port/database`
- `prisma/migrations/` – Auto-generated migration files

### NestJS Integration

Services use `@nestjs/prisma` for seamless NestJS integration:

```typescript
import { PrismaService } from '@nestjs/prisma';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findUser(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
```

This ensures type-safe database operations with auto-generated TypeScript types.