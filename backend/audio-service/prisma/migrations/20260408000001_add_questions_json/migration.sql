-- Add questionsJson column to tasks table for new listening passage format
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "questions_json" TEXT;
