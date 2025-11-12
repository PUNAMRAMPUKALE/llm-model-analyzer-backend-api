// backend/src/modules/experiments/service.ts
import type { CreateExperimentDto, PageQuery } from './dto.js';
import { ExperimentsRepository } from './repository.js';

export class ExperimentsService {
  constructor(private readonly repo = new ExperimentsRepository()) {}

  create(dto: CreateExperimentDto) {
    return this.repo.create(dto);
  }

  async list(limit = 100) {
    return this.repo.list(limit); // returns Experiment[]
  }

  async getOrThrow(id: string) {
    const exp = await this.repo.findById(id);
    if (!exp) {
      const err = new Error('Experiment not found');
      (err as any).status = 404;
      throw err;
    }
    return exp;
  }

  async getResponses(experimentId: string, page: PageQuery) {
    const { rows, nextCursor } = await this.repo.listResponses(experimentId, page.limit, page.cursor);
    return { data: Array.isArray(rows) ? rows : [], nextCursor };
  }

  async getMetrics(experimentId: string, page: PageQuery) {
    const { rows, nextCursor } = await this.repo.listMetrics(experimentId, page.limit, page.cursor);
    return { data: Array.isArray(rows) ? rows : [], nextCursor };
  }
}
