import { Router } from 'express';
import { ExperimentsService } from './service.js';
import { CreateExperimentSchema, IdParamSchema, PageQuerySchema, GridSpecSchema } from './dto.js';
import { RunsService } from '../runs/service.js';

export const experimentsRouter = Router();
const svc = new ExperimentsService();
const runs = new RunsService();

experimentsRouter.post('/', async (req, res) => {
  const dto = CreateExperimentSchema.parse(req.body);
  const exp = await svc.create(dto);
  res.status(201).json(exp);
});

experimentsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    const exp = await svc.getOrThrow(id);
    res.json(exp);
  } catch (e) { next(e); }
});

experimentsRouter.post('/:id/run', async (req, res, next) => {
  try {
    const { id } = IdParamSchema.parse(req.params);

    // gridOverride is OPTIONAL; validate if present
    const gridOverride = req.body?.gridOverride !== undefined
      ? GridSpecSchema.parse(req.body.gridOverride)
      : undefined;

    await svc.getOrThrow(id); // 404 if missing
    const run = await runs.run(id, gridOverride);   // ← pass override through
    res.json({ ok: true, runId: run.id });
  } catch (e) { next(e); }
});

experimentsRouter.get('/:id/responses', async (req, res, next) => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    const page = PageQuerySchema.parse(req.query);
    const out = await svc.getResponses(id, page);
    res.json(out);
  } catch (e) { next(e); }
});

experimentsRouter.get('/:id/metrics', async (req, res, next) => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    const page = PageQuerySchema.parse(req.query);
    const out = await svc.getMetrics(id, page);
    res.json(out?.data ?? []);
  } catch (e) { next(e); }
});
