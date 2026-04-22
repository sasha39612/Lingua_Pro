-- Add characters column for TTS character-based cost tracking
-- gpt-4o-mini-tts pricing is per-character ($15/1M chars), not per-token.
-- null for token-based models — not applicable.
ALTER TABLE ai_usage_events ADD COLUMN IF NOT EXISTS characters INTEGER;
