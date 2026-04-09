-- Add skill column to texts table with default 'writing' for existing rows
ALTER TABLE "texts" ADD COLUMN IF NOT EXISTS "skill" TEXT NOT NULL DEFAULT 'writing';

-- Add index for skill-based queries
CREATE INDEX IF NOT EXISTS "texts_skill_idx" ON "texts"("skill");
