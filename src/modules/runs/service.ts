// backend/src/modules/runs/service.ts
import { prisma } from "../../infra/prisma.js";
import type { GridSpec, LLMParams } from "../../domain/models.js";
import { eventBus } from "../../domain/events/EventBus.js";
import { ENV } from "../../config/env.js";
import type { LLMProvider } from "../llm/LLMProvider.js";
import { GroqProvider } from "../llm/GroqProvider.js";
import { MetricsClient } from "../metrics/MetricsClient.js";

/** ---- NEW: pure helpers, easy to unit test ---- */
export function mergeGrid(base: GridSpec, override?: GridSpec): GridSpec {
  return { ...base, ...(override ?? {}) };
}

export function expandGrid(model: string, grid: GridSpec): LLMParams[] {
  const temps: number[] = grid.temperature ?? [0.0, 0.3, 0.6, 0.9];
  const tps: number[] = grid.top_p ?? [0.7, 0.9];
  const ks: (number | undefined)[] = grid.top_k ?? [undefined];
  const maxs: number[] = grid.max_tokens ?? [256];
  const seeds: (number | null)[] = grid.seed != null ? [grid.seed] : [null];

  const combos: LLMParams[] = [];
  for (const temperature of temps) {
    for (const top_p of tps) {
      for (const maybeTopK of ks) {
        for (const max_tokens of maxs) {
          for (const seed of seeds) {
            const p: LLMParams = { model, temperature, top_p, max_tokens, seed };
            if (maybeTopK !== undefined) p.top_k = maybeTopK; // omit key when undefined
            combos.push(p);
          }
        }
      }
    }
  }
  return combos;
}
/** ---------------------------------------------- */

export class RunsService {
  private readonly llm: LLMProvider;
  private readonly metrics = new MetricsClient();

  constructor() {
    if (!ENV.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is required (no mock provider enabled).");
    }
    this.llm = new GroqProvider() as unknown as LLMProvider;
  }

  /** kept for backward compat; delegates to pure helper */
  expandGrid(model: string, grid: GridSpec): LLMParams[] {
    return expandGrid(model, grid);
  }

  async run(experimentId: string, gridOverride?: GridSpec) {
    const exp = await prisma.experiment.findUnique({ where: { id: experimentId } });
    if (!exp) throw new Error("Experiment not found");

    const run = await prisma.run.create({
      data: { experimentId, status: "RUNNING", startedAt: new Date() },
    });

    eventBus.emit("run.started", { experimentId, runId: run.id });

    const baseGrid: GridSpec = (exp.gridSpec ?? {}) as GridSpec;
    const effectiveGrid: GridSpec = mergeGrid(baseGrid, gridOverride); // ← use helper

    const paramsList = expandGrid(exp.model, effectiveGrid);          // ← use helper
    const samples = effectiveGrid.samples ?? baseGrid.samples ?? 2;

    try {
      for (const params of paramsList) {
        for (let s = 0; s < samples; s++) {
          const paramsWithSeed: LLMParams = {
            ...params,
            seed:
              params.seed !== null && params.seed !== undefined
                ? params.seed
                : Math.floor(Date.now() + s + Math.random() * 1e6),
          };

          const gen = await this.llm.generate(exp.prompt, paramsWithSeed);

          const response = await prisma.response.create({
            data: {
              runId: run.id,
              params: paramsWithSeed as any,
              text: gen.text,
              tokensIn: gen.tokensIn,
              tokensOut: gen.tokensOut,
              latencyMs: gen.latencyMs,
            },
          });

          eventBus.emit("response.generated", { runId: run.id, responseId: response.id });

          const m = await this.metrics.compute(exp.prompt, response.text);
          await prisma.metric.create({
            data: {
              responseId: response.id,
              scores: (m.scores ?? {}) as any,
              details: (m.details ?? {}) as any,
              overallQuality:
                (m as any).overallQuality ?? (m as any).overall_quality ?? 0,
              versions: (m as any).model_versions ?? {},
            },
          });

          eventBus.emit("metrics.computed", { runId: run.id, responseId: response.id });
          eventBus.emit("run.progress", { runId: run.id });
        }
      }

      await prisma.run.update({
        where: { id: run.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      eventBus.emit("run.completed", { runId: run.id });
      return run;
    } catch (err) {
      await prisma.run.update({ where: { id: run.id }, data: { status: "FAILED" } });
      eventBus.emit("run.failed", { runId: run.id });
      throw err;
    }
  }
}
