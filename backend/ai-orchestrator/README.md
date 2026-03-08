# AI Orchestrator

Coordinates AI-driven task generation and feedback across services. Centralizes calls to GPT, Whisper, and other AI models to produce level-based prompts and manage streaming responses.

## Current Implementation Status

Implemented and available now:

- `GET /health`
- `POST /text/analyze`
- `GET /text/analyze/stream` (SSE)
- `POST /tasks/generate`
- `POST /audio/transcribe`
- `POST /audio/pronunciation/evaluate`

The service uses OpenAI when `AI_API_KEY` is provided. If it is missing or an upstream request fails, deterministic fallback logic is used so downstream services still get valid responses.
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

- **Runtime**: Node.js 18+
- **Framework**: NestJS
- **Language**: TypeScript (strict mode)
- **AI APIs**: OpenAI (GPT-4 Turbo, Whisper)
- **Streaming**: Server-Sent Events (SSE) or WebSocket for real-time feedback
- **Environment Config**: Secure storage of AI_API_KEY

## Environment Variables

- `PORT` (optional, default: `4005`)
- `AI_API_KEY` (required for real OpenAI calls)
- `OPENAI_TEXT_MODEL` (optional, default: `gpt-4o-mini`)
- `OPENAI_TASK_MODEL` (optional, default: `gpt-4o-mini`)
- `OPENAI_EVAL_MODEL` (optional, default: `gpt-4o-mini`)
- `OPENAI_TRANSCRIPTION_MODEL` (optional, default: `whisper-1`)

Example:

```env
PORT=4005
AI_API_KEY=your-openai-key
OPENAI_TEXT_MODEL=gpt-4o-mini
OPENAI_TASK_MODEL=gpt-4o-mini
OPENAI_EVAL_MODEL=gpt-4o-mini
OPENAI_TRANSCRIPTION_MODEL=whisper-1
```

## Local Run

From repo root:

```bash
pnpm --filter ai-orchestrator install
pnpm --filter ai-orchestrator run build
pnpm --dir backend/ai-orchestrator run start:prod
```

## API Contracts

### `GET /health`

Returns service status.

### `POST /text/analyze`

Request:

```json
{
	"text": "I am studing english",
	"language": "English"
}
```

Response:

```json
{
	"correctedText": "I am studying english.",
	"feedback": "Minor corrections were applied to improve spelling and punctuation.",
	"textScore": 0.82
}
```

### `GET /text/analyze/stream?text=...&language=...`

SSE stream with events in order:

- `analysis_started`
- `result`
- `analysis_complete`

### `POST /tasks/generate`

Request:

```json
{
	"language": "English",
	"level": "A2",
	"skill": "reading"
}
```

Response:

```json
{
	"tasks": [
		{
			"language": "English",
			"level": "A2",
			"skill": "reading",
			"prompt": "English reading task for level A2: Complete the missing word in a short sentence.",
			"audioUrl": null,
			"referenceText": null,
			"answerOptions": ["Option A", "Option B", "Option C", "Option D"],
			"correctAnswer": "A"
		}
	]
}
```

### `POST /audio/transcribe`

Request:

```json
{
	"audioBase64": "<base64-audio>",
	"mimeType": "audio/wav",
	"language": "English"
}
```

Response:

```json
{
	"transcript": "...",
	"language": "English",
	"confidence": 0.88
}
```

### `POST /audio/pronunciation/evaluate`

Request:

```json
{
	"referenceText": "I am studying English today",
	"language": "English",
	"transcript": "I am studying english today"
}
```

Response:

```json
{
	"transcript": "I am studying english today",
	"pronunciationScore": 0.98,
	"feedback": "Strong pronunciation overall. Focus on natural rhythm and sentence stress.",
	"phonemeHints": ["/th/ in \"think\"", "/w/ vs /v/", "final consonant release"]
}
```

## Communication

- **Inbound**: Text Service, Audio Service, and API Gateway calls via internal Docker network.
- **Outbound**: Makes external API calls to OpenAI (GPT-4 Turbo, Whisper) with retry logic and timeout management.