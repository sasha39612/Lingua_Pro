-- Add audio duration for Azure Speech / Whisper cost tracking (audio_seconds rate kind).
-- null for text-only models (gpt-4o, gpt-4o-mini, TTS).
ALTER TABLE ai_usage_events ADD COLUMN IF NOT EXISTS audio_duration_sec DOUBLE PRECISION;

-- Add estimation flag for mid-stream token estimation fallback.
-- estimated=true when token counts are derived (e.g. stream failed before final usage chunk).
-- estimation_method records the derivation method (e.g. 'chars_div_4') for analytics filtering.
ALTER TABLE ai_usage_events ADD COLUMN IF NOT EXISTS estimated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ai_usage_events ADD COLUMN IF NOT EXISTS estimation_method TEXT;
