-- CreateIndex
CREATE INDEX "idx_experiment_created_at" ON "Experiment"("createdAt");

-- CreateIndex
CREATE INDEX "idx_metric_created_at" ON "Metric"("createdAt");

-- CreateIndex
CREATE INDEX "idx_metric_overall_quality" ON "Metric"("overallQuality");

-- CreateIndex
CREATE INDEX "idx_response_run_created" ON "Response"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_response_tokens_out" ON "Response"("tokensOut");

-- CreateIndex
CREATE INDEX "idx_response_latency_ms" ON "Response"("latencyMs");

-- CreateIndex
CREATE INDEX "idx_run_experiment_started_id" ON "Run"("experimentId", "startedAt", "id");

-- CreateIndex
CREATE INDEX "idx_run_experiment_status_started" ON "Run"("experimentId", "status", "startedAt");
