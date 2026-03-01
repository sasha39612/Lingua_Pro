# AI Orchestrator

Coordinates AI-driven task generation and feedback across services. Centralizes calls to GPT, Whisper, and other AI models to produce level-based prompts and manage streaming responses.
## Responsibilities

- **Task Generation**: Generate AI prompts for reading, writing, and listening tasks based on student level (A0–C2) and language.
- **Text Analysis**: Call GPT-4 Turbo to analyze student writing, provide corrections, and grammar feedback.
- **Audio Transcription**: Call Whisper API to transcribe student speech recordings.
- **Pronunciation Evaluation**: Analyze pronunciation against reference and compute pronunciation_score.
- **Retry & Timeout Management**: Handle API retries on failure, implement exponential backoff, enforce timeouts.
- **Streaming Response Support**: Stream partial results back to services for real-time feedback delivery.
- **Language-Specific Handling**: Tailor prompts and feedback for English, German, Albanian, Polish, etc.
- **Error Handling**: Log failures, fallback to defaults if AI APIs unavailable.
- **Health Check**: Exposes `/health` endpoint for monitoring.

## Technology Stack

- **Runtime**: Node.js
- **Framework**: NestJS
- **AI APIs**: OpenAI (GPT-4 Turbo, Whisper)
- **Streaming**: Server-Sent Events (SSE) or WebSocket for real-time feedback
- **Environment Config**: Secure storage of AI_API_KEY

## Communication

- **Inbound**: Text Service, Audio Service, and API Gateway calls via internal Docker network.
- **Outbound**: Makes external API calls to OpenAI (GPT-4 Turbo, Whisper) with retry logic and timeout management.