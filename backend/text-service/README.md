# Text Service

Handles reading and writing tasks. Generates AI-based text prompts and comprehension questions. Evaluates written submissions, scores text, and interacts with the PostgreSQL database to store results.

## Responsibilities

- **Reading Tasks**: Display text passages at appropriate student levels (A0–C2) and language.
- **Writing Tasks**: Generate AI-prompted writing assignments based on student level.
- **Comprehension Questions**: Create multiple-choice or free-text questions for reading passages.
- **Text Evaluation**: Receive student submissions and send to AI Orchestrator for analysis.
- **Scoring**: Calculate text_score based on AI corrections and store results.
- **Data Persistence**: Save original text, corrected text, scores, and feedback history to PostgreSQL.
- **Health Check**: Exposes `/health` endpoint for monitoring.
- **REST API**: Post to `/text/check` for analysis; GET `/text/tasks` to fetch or generate tasks.
- **GraphQL**: Supports the `Text` and `Task` types, `submitText` mutation and `tasks` query.

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Framework**: NestJS (HTTP + GraphQL)
- **Database**: PostgreSQL
- **ORM**: Prisma with `@nestjs/prisma` integration; text submissions and tasks are persisted
  * Prisma 7+ uses a `prisma/prisma.config.ts` file for the datasource URL (see text-service directory).
  * Ensure `DATABASE_URL` (and optionally `DATABASE_URL_UNPOOLED`) are set in environment or a `.env` file.
- **AI Integration**: Calls AI Orchestrator (`/text/analyze`, `/tasks/generate`) which in turn uses GPT‑4‑Turbo per language

## Communication

- **Inbound**: API Gateway calls text-service endpoints via internal Docker network.
- **Outbound**: Calls AI Orchestrator (via internal network) for task generation and text analysis.

## Database Tables

Primarily uses the `texts` table:
- Stores original user submissions, AI-corrected versions, scores, and feedback
- Queries the `tasks` table for AI-generated reading prompts and writing assignments
- References the `users` table for student context