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

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma with `@nestjs/prisma` integration
- **AI Integration**: Calls AI Orchestrator for task generation and corrections

## Communication

- **Inbound**: API Gateway calls text-service endpoints via internal Docker network.
- **Outbound**: Calls AI Orchestrator (via internal network) for task generation and text analysis.

## Database Tables

Primarily uses the `texts` table:
- Stores original user submissions, AI-corrected versions, scores, and feedback
- Queries the `tasks` table for AI-generated reading prompts and writing assignments
- References the `users` table for student context