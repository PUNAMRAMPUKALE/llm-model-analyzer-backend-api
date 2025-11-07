import { prisma } from '../../infra/prisma.js';

export class ExportsService {
  async asJSON(experimentId: string) {
    const exp = await prisma.experiment.findUnique({
      where: { id: experimentId },
      include: {
        runs: {
          include: { responses: { include: { metric: true } } }
        }
      }
    });
    return exp;
  }

  async asCSV(experimentId: string) {
    const exp = await prisma.experiment.findUnique({
      where: { id: experimentId },
      include: {
        runs: {
          include: { responses: { include: { metric: true } } }
        }
      }
    });
    if (!exp) return '';
    const rows: string[] = [
      ['runId','responseId','temperature','top_p','top_k','max_tokens','tokensOut','latencyMs','overallQuality'].join(',')
    ];
    for (const run of exp.runs) {
      for (const r of run.responses) {
        rows.push([
          run.id,
          r.id,
          String((r.params as any).temperature ?? ''),
          String((r.params as any).top_p ?? ''),
          String((r.params as any).top_k ?? ''),
          String((r.params as any).max_tokens ?? ''),
          String(r.tokensOut),
          String(r.latencyMs),
          String(r.metric?.overallQuality ?? '')
        ].join(','));
      }
    }
    return rows.join('\n');
  }
}
