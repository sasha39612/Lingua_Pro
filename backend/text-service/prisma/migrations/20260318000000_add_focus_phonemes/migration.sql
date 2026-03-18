-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "focus_phonemes" TEXT[] NOT NULL DEFAULT '{}';
