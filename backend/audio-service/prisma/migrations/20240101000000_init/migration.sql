-- CreateTable
CREATE TABLE "audio_records" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "transcript" TEXT,
    "pronunciation_score" DOUBLE PRECISION,
    "feedback" TEXT,
    "audio_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "language" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "audio_url" TEXT,
    "reference_text" TEXT,
    "answer_options" TEXT[],
    "correct_answer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audio_records_user_id_idx" ON "audio_records"("user_id");

-- CreateIndex
CREATE INDEX "audio_records_language_idx" ON "audio_records"("language");

-- CreateIndex
CREATE INDEX "audio_records_created_at_idx" ON "audio_records"("created_at");

-- CreateIndex
CREATE INDEX "tasks_language_idx" ON "tasks"("language");

-- CreateIndex
CREATE INDEX "tasks_level_idx" ON "tasks"("level");

-- CreateIndex
CREATE INDEX "tasks_skill_idx" ON "tasks"("skill");
