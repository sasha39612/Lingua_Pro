# Lingua Pro — Language Training Platform MVP Requirements

## Core Skills
- Listening
- Reading
- Writing
- Speaking

## Supported Languages
- English
- German
- Albanian
- Polish
- Other (future expansion)

## Minimum Features
- User registration/login with JWT (student/admin roles)
- Writing tasks → AI corrections (per language)
- Recording audio → AI pronunciation analysis (per language)
- View statistics (text + audio scores, per language)
- AI-generated tasks based on student level (A0–C2) and language

---

## Skill & Feature Requirements

| Skill | Feature / Action | Description / Requirements | Notes / AI Integration |
|-------|-----------------|---------------------------|-----------------------|
| **Listening** | Play audio task | Student listens to a passage/audio prompt | Optionally show transcript |
|  | Answer comprehension questions | Multiple choice / free text questions | AI generates questions per level |
|  | AI feedback | Explain mistakes or missed keywords | Streaming feedback supported |
|  | Save & score audio | Save audio, calculate score | Display in stats |
| **Reading** | Show text passage | Display passage for selected level | Optional audio for listening practice |
|  | Answer comprehension questions | Multiple choice / free text | AI generates questions and evaluates answers |
|  | AI mistake breakdown | Highlight misread words, speed/comprehension errors | Optional streaming feedback |
|  | Save & score answers | Save answers and score | Display in stats |
| **Writing** | Writing task / prompt | AI-generated prompt per level | Stored in DB for history |
|  | Submit text | Send text to AI for analysis | GPT-4 Turbo returns corrections |
|  | AI corrections & suggestions | Grammar, style, punctuation | Streaming feedback supported |
|  | Save & score text | Save original + corrected text, calculate text_score | Display in stats |
| **Speaking** | Record audio | User records speech via microphone | Frontend handles recording |
|  | Send audio to AI | Whisper transcribes + evaluates pronunciation | Return transcript + pronunciation score |
|  | Playback & retry | Student can listen and retry recording | AI feedback streams |
|  | Save & score audio | Store in DB for stats | Score contributes to metrics |
| **Authentication** | Registration / Login (JWT) | Secure login/signup with email & password | Roles: student / admin |
| **Statistics** | View performance | Aggregate writing & speaking scores | Week/month/all-time |
|  | Track progress over time | Display avg_text_score, avg_pronunciation_score, mistake counts | Charts in frontend |
| **AI Task Generation** | Generate tasks per level | Generate prompts/audio/reading passages based on level | Centralized via AI Orchestrator |

---

## Repository Structure

**Monorepo recommended** for demo/learning purposes:


english-platform/
frontend/
backend/
api-gateway/
auth-service/
text-service/
audio-service/
stats-service/
ai-orchestrator/
infrastructure/
docker-compose.yml


**Actions:**
- Each folder contains a `README.md` describing its purpose
- Initialize Git repository with `main` branch
- All services must include a `Dockerfile` from day one

---

## Server-First Development (Hetzner)

This project is designed to run **entirely on remote servers**. No local development is expected.

**Key Practices:**
- **Containerize everything**: frontend, backend services, database, AI orchestrator.
- **PostgreSQL in container**: Use a Docker volume for persistence.
- **Docker Compose**: Orchestrate all services on Hetzner for easy startup/restart.
- **Environment variables**: `.env` files per service or centralized for shared variables. An example `.env`:
  ```env
  POSTGRES_USER=demo
  POSTGRES_PASSWORD=demo
  POSTGRES_DB=english_platform
  AI_API_KEY=your-openai-api-key-here
  JWT_SECRET=supersecretjwtkey
  SUPPORTED_LANGUAGES=EN,DE,AL,PL
  ```
- **Volumes & persistence**: Ensure audio/text storage survives container restarts (e.g. `audio_data` volume mounted by audio-service).
- **Health endpoints**: Each container exposes `/health` for monitoring.
- **CI/CD**: GitHub Actions (or another CI) builds and pushes Docker images directly to Hetzner; implement proper tagging and restart strategies.

### Starting on Hetzner
1. Provision a Hetzner cloud instance (e.g., Ubuntu 24.04) and install Docker & Docker Compose.
2. Clone the repository and create a `.env` file with the required variables.
3. Either build images locally and push to a registry accessible from the server, or rely on the Dockerfiles in each directory.
4. On the Hetzner host, run:
   ```bash
   docker-compose pull    # fetch updated images if using a registry
   docker-compose up -d   # builds and starts all containers
   ```
5. Verify health with `docker-compose ps` or `curl http://localhost:<port>/health` for each service.
6. For updates, rebuild images, push, then `docker-compose pull && docker-compose up -d` again.

These steps allow developers to bring the full stack online with a single command on the remote server.

---

## Implementation Notes

- **Level-based AI tasks** ensure content matches student skill (A0–C2).
- **Streaming feedback** allows partial results while AI is processing — critical for long tasks.
- **Data persistence** in PostgreSQL ensures history and statistics are maintained.
- **Frontend → API Gateway only** ensures clean microservice separation.
- **JWT authentication** secures role-based access (student/admin).

---

## Technology Stack

### Frontend
- **Framework**: Next.js 15+ (latest stable)
- **UI Library**: React 18+
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS or similar
- **API Communication**: GraphQL client (Apollo Client)
- **State Management**: React Context or Zustand

### Backend Microservices
- **Runtime**: Node.js 18+
- **Framework**: NestJS
- **Package Manager**: pnpm workspace (preferred over npm)
- **ORM**: Prisma with `@nestjs/prisma` integration
- **Language**: TypeScript (strict mode)
- **API**: GraphQL (API Gateway) + REST (inter-service communication)

### AI Orchestrator
- **Runtime**: Node.js 18+
- **Framework**: NestJS
- **Language**: TypeScript (strict mode)
- **External APIs**: OpenAI (GPT-4 Turbo, Whisper)
- **Streaming**: Server-Sent Events (SSE) or WebSocket

### Database
- **Engine**: PostgreSQL 15+
- **Migrations**: Prisma migrate
- **Multi-language Support**: `language` column on users, texts, and audio_records tables
- **Supported Languages**: English, German, Albanian, Polish (extensible)

### Development & Deployment
- **Containerization**: Docker + Docker Compose
- **Networking**: Internal Docker bridge network (`lingua-network`)
- **Deployment Target**: Hetzner cloud
- **CI/CD**: GitHub Actions (image build and push)

---
