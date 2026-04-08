-- Add questionsJson column to tasks table for new listening passage format
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "questions_json" TEXT;
-- Add updated_at column to audio_records if missing (Prisma @updatedAt requirement)
ALTER TABLE "audio_records" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
UPDATE "audio_records" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
