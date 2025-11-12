// backend/src/modules/runs/service.ts
import { prisma } from "../../infra/prisma.js";
import type { GridSpec, LLMParams } from "../../domain/models.js";
import { eventBus } from "../../domain/events/EventBus.js";
import { ENV } from "../../config/env.js";
import { buildStructuredPrompt } from "../llm/PromptOrchestrator.js";
import type { LLMProvider } from "../llm/LLMProvider.js";   // <-- new source
import { GroqProvider } from "../llm/GroqProvider.js";
import { MetricsClient } from "../metrics/MetricsClient.js";

/** ---- Pure helpers ---- */
export function mergeGrid(base: GridSpec, override?: GridSpec): GridSpec {
  return { ...base, ...(override ?? {}) };
}

/**
 * Expand a grid of arrays → list of concrete LLMParams.
 * Includes penalties to drive stronger diversity; top_k is kept in the params
 * object for storage/telemetry but the Groq provider will ignore it when calling the API.
 */
export function expandGrid(model: string, grid: GridSpec): LLMParams[] {
  const temps: number[] = grid.temperature ?? [0.0, 0.3, 0.6, 0.9];
  const tps: number[] = grid.top_p ?? [0.7, 0.9];
  const ks: (number | undefined)[] = grid.top_k ?? [undefined];
  const maxs: number[] = grid.max_tokens ?? [256];

  // penalties default to [undefined] so they do not multiply if absent
  const pres: (number | undefined)[] = (grid as any).presence_penalty ?? [undefined];
  const freq: (number | undefined)[] = (grid as any).frequency_penalty ?? [undefined];

  // Seeds: if a specific seed is provided (number or null), keep that scalar;
  // otherwise we let run() fill null with randomized seeds per sample.
  const seeds: (number | null)[] = grid.seed != null ? [grid.seed] : [null];

  const combos: LLMParams[] = [];
  for (const temperature of temps) {
    for (const top_p of tps) {
      for (const maybeTopK of ks) {
        for (const max_tokens of maxs) {
          for (const maybePres of pres) {
            for (const maybeFreq of freq) {
              for (const seed of seeds) {
                const p: LLMParams & Record<string, any> = {
                  model,
                  temperature,
                  top_p,
                  max_tokens,
                  seed,
                };
                if (maybeTopK !== undefined) p.top_k = maybeTopK; // kept for storage; provider filters out
                if (maybePres !== undefined) p.presence_penalty = maybePres;
                if (maybeFreq !== undefined) p.frequency_penalty = maybeFreq;
                combos.push(p);
              }
            }
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

    // === Orchestrate a high-quality, structured prompt around the user prompt ===
    // Allow UI to pass an optional quality mode via gridOverride.qualityMode (not in schema on purpose).
    const qualityMode =
      typeof (gridOverride as any)?.qualityMode === "string"
        ? (gridOverride as any).qualityMode
        : "strong";
    const spec = buildStructuredPrompt(exp.prompt, qualityMode); // { prompt, penalties, targetLines, keywords }

    const run = await prisma.run.create({
      data: { experimentId, status: "RUNNING", startedAt: new Date() },
    });

    eventBus.emit("run.started", { experimentId, runId: run.id });

    const baseGrid: GridSpec = (exp.gridSpec ?? {}) as GridSpec;
    const effectiveGrid: GridSpec = mergeGrid(baseGrid, gridOverride);
    const paramsList = expandGrid(exp.model, effectiveGrid);
    const samples = effectiveGrid.samples ?? baseGrid.samples ?? 2;

    try {
      for (const params of paramsList) {
        for (let s = 0; s < samples; s++) {
          const paramsWithSeed: LLMParams & Record<string, any> = {
            ...params,
            seed:
              params.seed !== null && params.seed !== undefined
                ? params.seed
                : Math.floor(Date.now() + s + Math.random() * 1e6),
          };

          // If penalties weren’t provided by grid, default to orchestrator’s strong penalties
          if (paramsWithSeed.presence_penalty === undefined && spec.penalties?.presencePenalty != null) {
            paramsWithSeed.presence_penalty = spec.penalties.presencePenalty;
          }
          if (paramsWithSeed.frequency_penalty === undefined && spec.penalties?.frequencyPenalty != null) {
            paramsWithSeed.frequency_penalty = spec.penalties.frequencyPenalty;
          }

          // Prefer generous token budget when user asked for long content; fall back to provided
          if (!paramsWithSeed.max_tokens || paramsWithSeed.max_tokens < 3500) {
            paramsWithSeed.max_tokens = Math.max(paramsWithSeed.max_tokens ?? 0, 4000);
          }

          // === Generate with the structured prompt (NOT the raw user prompt) ===
          const gen = await this.llm.generate(spec.prompt, paramsWithSeed);

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

          // === Compute metrics against the ORIGINAL user prompt for correct completeness ===
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
      await prisma.run.update({ where: { id: run.id }, data: { status: "FAILED", completedAt: new Date() } });
      eventBus.emit("run.failed", { runId: run.id });
      throw err;
    }
  }
}
