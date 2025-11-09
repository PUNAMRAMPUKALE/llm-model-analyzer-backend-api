import type { CreateExperimentDto, PageQuery } from './dto.js';
import { ExperimentsRepository } from './repository.js';

export class ExperimentsService {
  constructor(private readonly repo = new ExperimentsRepository()) {}

  /** Create a new experiment */
  create(dto: CreateExperimentDto) {
    return this.repo.create(dto);
  }

  /** Get an experiment, throw if not found (controller maps this to 404) */
  async getOrThrow(id: string) {
    const exp = await this.repo.findById(id);
    if (!exp) {
      const err = new Error('Experiment not found');
      (err as any).status = 404;
      throw err;
    }
    return exp;
  }
// src/modules/experiments/service.ts
async getResponses(experimentId: string, page: PageQuery) {
  const { rows, nextCursor } = await this.repo.listResponses(experimentId, page.limit, page.cursor);
  // Always return an array, even if no rows
  return { data: Array.isArray(rows) ? rows : [], nextCursor };
}

async getMetrics(experimentId: string, page: PageQuery) {
  const { rows, nextCursor } = await this.repo.listMetrics(experimentId, page.limit, page.cursor);
  return { data: Array.isArray(rows) ? rows : [], nextCursor };
}
}

