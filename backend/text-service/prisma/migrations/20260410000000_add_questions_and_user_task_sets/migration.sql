-- Add questions column to tasks table (used by reading tasks to store 16 questions as JSON)
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "questions" JSONB;

-- Remove stale reading tasks that were cached before the questions column existed.
-- They have questions=NULL and would be returned as empty question sets, breaking the reading test.
-- New tasks will be generated with proper questions on next load.
DELETE FROM "tasks" WHERE "skill" = 'reading' AND "questions" IS NULL;

-- Create user_task_sets table for per-user task assignment tracking
CREATE TABLE IF NOT EXISTS "user_task_sets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "task_ids" INTEGER[] NOT NULL,
    "score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_task_sets_pkey" PRIMARY KEY ("id")
);

-- Unique constraint for per-user task set lookup
CREATE UNIQUE INDEX IF NOT EXISTS "user_task_sets_user_id_language_level_skill_key"
    ON "user_task_sets"("user_id", "language", "level", "skill");

-- Index for userId-based queries
CREATE INDEX IF NOT EXISTS "user_task_sets_user_id_idx" ON "user_task_sets"("user_id");
