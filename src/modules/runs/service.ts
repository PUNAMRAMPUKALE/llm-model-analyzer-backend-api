import { prisma } from '../../infra/prisma.js';
import type { GridSpec, LLMParams } from '../../domain/models.js';
import { eventBus } from '../../domain/events/EventBus.js';
import { ENV } from '../../config/env.js';
import { MockProvider } from '../llm/MockProvider.js';
import type { LLMProvider } from '../llm/LLMProvider.js';
import { MetricsClient } from '../metrics/MetricsClient.js';

function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, curr) => acc.flatMap(a => curr.map(v => [...a, v])),
    [[]]
  );
}

export class RunsService {
  private llm: LLMProvider;
  private metrics = new MetricsClient();

  constructor() {
    this.llm = new MockProvider();
    if (ENV.LLM_PROVIDER === 'openai') {
      // dynamically import later; keeping mock as default
    }
  }

expandGrid(model: string, grid: GridSpec): LLMParams[] {
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
            const params: LLMParams = { model, temperature, top_p, max_tokens, seed };
            if (maybeTopK !== undefined) params.top_k = maybeTopK; // omit when undefined
            combos.push(params);
          }
        }
      }
    }
  }

  return combos;
}


  async run(experimentId: string) {
    const exp = await prisma.experiment.findUnique({ where: { id: experimentId } });
    if (!exp) throw new Error('Experiment not found');

    const run = await prisma.run.create({
      data: { experimentId, status: 'RUNNING', startedAt: new Date() }
    });

    eventBus.emit('run.started', { experimentId, runId: run.id });

    const grid: GridSpec = exp.gridSpec as any;
    const paramsList = this.expandGrid(exp.model, grid);
    const samples = (grid.samples ?? 2);

    try {
      for (const params of paramsList) {
        for (let s = 0; s < samples; s++) {
          const gen = await this.llm.generate(exp.prompt, params);

          const response = await prisma.response.create({
            data: {
              runId: run.id,
              params: params as any,
              text: gen.text,
              tokensIn: gen.tokensIn,
              tokensOut: gen.tokensOut,
              latencyMs: gen.latencyMs
            }
          });

          eventBus.emit('response.generated', { runId: run.id, responseId: response.id });

          // compute metrics via ML service
          const m = await this.metrics.compute(exp.prompt, response.text);

          await prisma.metric.create({
            data: {
              responseId: response.id,
              scores: m.scores as any,
              details: m.details as any,
              overallQuality: (m as any).overall_quality ?? (m as any).overallQuality ?? 0,
              versions: m.model_versions as any
            }
          });

          eventBus.emit('metrics.computed', { runId: run.id, responseId: response.id });
          eventBus.emit('run.progress', { runId: run.id });
        }
      }

      await prisma.run.update({ where: { id: run.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
      eventBus.emit('run.completed', { runId: run.id });
      return run;
    } catch (e) {
      await prisma.run.update({ where: { id: run.id }, data: { status: 'FAILED' } });
      eventBus.emit('run.failed', { runId: run.id });
      throw e;
    }
  }
}
