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
- **Environment variables**: `.env` files per service or centralized for shared variables:
  ```env
  POSTGRES_USER=demo
  POSTGRES_PASSWORD=demo
  POSTGRES_DB=english_platform
  AI_API_KEY=...
  JWT_SECRET=...

Volumes & persistence: Ensure audio/text storage survives container restarts.

Health endpoints: Each container exposes /health for monitoring.

CI/CD: GitHub Actions (or another CI) builds and pushes Docker images directly to Hetzner; implement proper tagging and restart strategies.

Notes

Level-based AI tasks ensure content matches student skill (A0–C2).

Streaming feedback allows partial results while AI is processing — critical for long tasks.

Data persistence in PostgreSQL ensures history and statistics are maintained.

Frontend communicates only with API Gateway for clean microservice separation.

JWT authentication secures role-based access (student/admin).
