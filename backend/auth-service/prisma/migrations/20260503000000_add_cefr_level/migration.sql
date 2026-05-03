-- CreateEnum
CREATE TYPE "CEFRLevel" AS ENUM ('A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "level" "CEFRLevel" NOT NULL DEFAULT 'A2';
