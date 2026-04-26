-- Add writing analysis criteria score columns to texts table.
-- All columns nullable for backward compatibility with existing records.
ALTER TABLE "texts" ADD COLUMN IF NOT EXISTS "grammar_vocabulary_score" DOUBLE PRECISION;
ALTER TABLE "texts" ADD COLUMN IF NOT EXISTS "task_achievement_score" DOUBLE PRECISION;
ALTER TABLE "texts" ADD COLUMN IF NOT EXISTS "coherence_structure_score" DOUBLE PRECISION;
ALTER TABLE "texts" ADD COLUMN IF NOT EXISTS "style_score" DOUBLE PRECISION;
