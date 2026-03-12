-- CreateTable
CREATE TABLE "texts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "original_text" TEXT NOT NULL,
    "corrected_text" TEXT,
    "text_score" DOUBLE PRECISION,
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "texts_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "texts_user_id_idx" ON "texts"("user_id");

-- CreateIndex
CREATE INDEX "texts_language_idx" ON "texts"("language");

-- CreateIndex
CREATE INDEX "texts_created_at_idx" ON "texts"("created_at");

-- CreateIndex
CREATE INDEX "tasks_language_idx" ON "tasks"("language");

-- CreateIndex
CREATE INDEX "tasks_level_idx" ON "tasks"("level");

-- CreateIndex
CREATE INDEX "tasks_skill_idx" ON "tasks"("skill");
