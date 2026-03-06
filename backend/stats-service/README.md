# Stats Service

Aggregates and exposes performance metrics across all student activities. Computes average scores, mistake counts, and historical progress for frontend graphs and reports.

## Responsibilities

- **Score Aggregation**: Collect text_score, pronunciation_score, and comprehension scores from all services.
- **User Progress Tracking**: Calculate metrics over time (weekly, monthly, all-time).
- **Metrics Computation**: Compute averages (avg_text_score, avg_pronunciation_score), mistake counts per category.
- **Performance History**: Maintain historical records for trend analysis and progress visualization.
- **Data Queries**: Expose endpoints for frontend to retrieve user stats, skill breakdowns, and comparison data.
- **Real-time Updates**: Sync with Text and Audio services to keep metrics current.
- **Health Check**: Exposes `/health` endpoint for monitoring.

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma with `@nestjs/prisma` integration
- **Caching** (optional): Redis for frequently accessed metrics

## Communication

- **Inbound**: API Gateway calls stats-service endpoints via internal Docker network.
- **Outbound**: Queries PostgreSQL directly for aggregated metrics; does not call other microservices.

## Database Tables

Queries across all tables for aggregation:
- `users` for user metadata and language selection
- `texts` for writing/reading scores, aggregating `text_score` over time
- `audio_records` for speaking/listening scores, aggregating `pronunciation_score` over time
- Computes metrics like avg_text_score, avg_pronunciation_score, mistake counts per category

## Project Structure

```text
backend/stats-service
├── src
│   ├── app.ts
│   ├── server.ts
│   ├── app.module.ts
│   ├── health.controller.ts
│   ├── prisma
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── stats
│   │   ├── stats.module.ts
│   │   ├── stats.controller.ts
│   │   ├── stats.service.ts
│   │   └── dto
│   │       └── get-stats-query.dto.ts
│   └── routes
│       └── stats.routes.ts
├── prisma
│   └── schema.prisma
├── package.json
├── tsconfig.json
└── README.md
```

> Keep only the folders/files that actually exist in your repo.  
> If Express legacy files are removed, also remove `app.ts` and `src/routes/*` from this tree.