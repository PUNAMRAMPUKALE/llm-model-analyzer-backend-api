// backend/src/modules/experiments/repository.ts
import { prisma } from '../../infra/prisma.js';
import type { CreateExperimentDto } from './dto.js';

export class ExperimentsRepository {
  async create(input: CreateExperimentDto) {
    return prisma.experiment.create({
      data: {
        title: input.title,
        prompt: input.prompt,
        model: input.model,
        gridSpec: input.gridSpec as object,
      },
      select: { id: true, title: true, prompt: true, model: true, gridSpec: true, createdAt: true },
    });
  }

  async list(limit = 100) {
    return prisma.experiment.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, title: true, prompt: true, model: true, gridSpec: true, createdAt: true },
    });
  }

  async findById(id: string) {
    return prisma.experiment.findUnique({
      where: { id },
      select: {
        id: true, title: true, prompt: true, model: true, gridSpec: true, createdAt: true,
        runs: {
          orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
          select: { id: true, status: true, startedAt: true, completedAt: true, responses: { select: { id: true } } },
        },
      },
    });
  }

  async listResponses(experimentId: string, limit: number, cursor?: string) {
    const rows = await prisma.response.findMany({
      where: { run: { experimentId } },
      orderBy: { createdAt: 'asc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true, runId: true, text: true, tokensIn: true, tokensOut: true, latencyMs: true, params: true, createdAt: true,
      },
    });
    const nextCursor = rows.length === limit ? rows[rows.length - 1].id : undefined;
    return { rows, nextCursor };
  }

  async listMetrics(experimentId: string, limit: number, cursor?: string) {
    const rows = await prisma.metric.findMany({
      where: { response: { run: { experimentId } } },
      orderBy: { createdAt: 'asc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true, responseId: true, overallQuality: true, scores: true, details: true, versions: true,
      },
    });
    const nextCursor = rows.length === limit ? rows[rows.length - 1].id : undefined;
    return { rows, nextCursor };
  }
}
