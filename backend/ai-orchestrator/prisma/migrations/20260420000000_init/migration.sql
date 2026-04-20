-- CreateTable
CREATE TABLE "ai_usage_events" (
    "id" SERIAL NOT NULL,
    "feature_type" TEXT NOT NULL,
    "endpoint" TEXT,
    "request_type" TEXT NOT NULL DEFAULT 'sync',
    "model" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_type" TEXT,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "duration_ms" INTEGER,
    "retry_count" INTEGER,
    "request_id" TEXT,
    "user_id" INTEGER,
    "language" TEXT,
    "cost_usd" DOUBLE PRECISION,
    "pricing_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_events_feature_type_idx" ON "ai_usage_events"("feature_type");

-- CreateIndex
CREATE INDEX "ai_usage_events_endpoint_idx" ON "ai_usage_events"("endpoint");

-- CreateIndex
CREATE INDEX "ai_usage_events_request_id_idx" ON "ai_usage_events"("request_id");

-- CreateIndex
CREATE INDEX "ai_usage_events_created_at_idx" ON "ai_usage_events"("created_at");

-- CreateIndex
CREATE INDEX "ai_usage_events_success_idx" ON "ai_usage_events"("success");

-- CreateIndex
CREATE INDEX "ai_usage_events_model_idx" ON "ai_usage_events"("model");
