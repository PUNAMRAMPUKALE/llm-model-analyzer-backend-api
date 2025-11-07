import { prisma } from '../../infra/prisma.js';
import type { CreateExperimentDto } from './dto.js';

export class ExperimentsService {
  async create(dto: CreateExperimentDto) {
    return prisma.experiment.create({
      data: {
        title: dto.title,
        prompt: dto.prompt,
        model: dto.model,
        gridSpec: dto.gridSpec as any,
      }
    });
  }

  async get(id: string) {
    return prisma.experiment.findUnique({
      where: { id },
      include: {
        runs: {
          include: {
            responses: { include: { metric: true } }
          }
        }
      }
    });
  }
}
