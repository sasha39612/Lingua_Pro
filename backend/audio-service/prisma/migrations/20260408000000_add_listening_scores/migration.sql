-- CreateTable
CREATE TABLE IF NOT EXISTS "listening_scores" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "task_id" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listening_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "listening_scores_user_id_idx" ON "listening_scores"("user_id");

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "listening_scores_user_id_task_id_key" ON "listening_scores"("user_id", "task_id");

-- AddForeignKey (idempotent via DO block)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'listening_scores_task_id_fkey'
  ) THEN
    ALTER TABLE "listening_scores" ADD CONSTRAINT "listening_scores_task_id_fkey"
      FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
