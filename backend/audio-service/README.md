# Audio Service

Manages listening and speaking tasks. Streams audio passages, records student responses, and interfaces with AI for transcription, pronunciation scoring, and feedback. Stores audio and scores in the database.

## Responsibilities

- **Listening Tasks**: Stream pre-generated or AI-created audio passages at appropriate levels.
- **Speaking Tasks**: Receive audio recordings from students via microphone capture.
- **Audio Transcription**: Send audio to AI Orchestrator for Whisper transcription.
- **Pronunciation Scoring**: Evaluate speech against reference and return pronunciation_score.
- **Comprehension**: Generate and evaluate listening comprehension questions.
- **Playback & Retry**: Allow students to listen to their own recordings and re-record.
- **Data Persistence**: Store audio files (or references), transcripts, scores, and feedback in PostgreSQL.
- **Health Check**: Exposes `/health` endpoint for monitoring.

## Technology Stack

- **Runtime**: Node.js
- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma with `@nestjs/prisma` integration
- **Audio Storage**: File system or cloud (S3/similar)
- **AI Integration**: Calls AI Orchestrator for Whisper and pronunciation analysis

## Communication

- **Inbound**: API Gateway calls audio-service endpoints via internal Docker network.
- **Outbound**: Calls AI Orchestrator (via internal network) for transcription and pronunciation scoring.

## Database Tables

Primarily uses the `audio_records` table:
- Stores transcripts, pronunciation scores, feedback, and audio file URLs
- Queries the `tasks` table for AI-generated listening prompts and audio passages
- References the `users` table for student context