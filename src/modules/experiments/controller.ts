import { Router } from 'express';
import { ExperimentsService } from './service.js';
import { CreateExperimentSchema } from './dto.js';
import { eventBus } from '../../domain/events/EventBus.js';

export const experimentsRouter = Router();
const svc = new ExperimentsService();

experimentsRouter.post('/', async (req, res) => {
  const dto = CreateExperimentSchema.parse(req.body);
  const exp = await svc.create(dto);
  eventBus.emit('experiment.created', { experimentId: exp.id });
  res.status(201).json(exp);
});

experimentsRouter.get('/:id', async (req, res) => {
  const exp = await svc.get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Not found' });
  res.json(exp);
});
