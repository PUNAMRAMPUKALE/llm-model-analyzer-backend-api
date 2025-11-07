import { Router } from 'express';
import { RunsService } from './service.js';
import { prisma } from '../../infra/prisma.js';
import { sseInit } from '../sse/sse.js';
import { eventBus } from '../../domain/events/EventBus.js';

export const runsRouter = Router();
const svc = new RunsService();

runsRouter.post('/:experimentId/run', async (req, res, next) => {
  try {
    const run = await svc.run(req.params.experimentId);
    res.status(202).json({ runId: run.id, status: run.status });
  } catch (e) { next(e); }
});

runsRouter.get('/:runId', async (req, res) => {
  const run = await prisma.run.findUnique({
    where: { id: req.params.runId },
    include: { responses: { include: { metric: true } } }
  });
  if (!run) return res.status(404).json({ error: 'Not found' });
  res.json(run);
});

runsRouter.get('/:runId/stream', async (req, res) => {
  const { send } = sseInit(req, res);
  const runId = req.params.runId;

  const onProgress = (evt: any) => {
    if (evt.payload.runId === runId) send('progress', evt.payload);
  };
  const onCompleted = (evt: any) => {
    if (evt.payload.runId === runId) {
      send('completed', evt.payload);
      send('end', {});
    }
  };
  const onFailed = (evt: any) => {
    if (evt.payload.runId === runId) {
      send('failed', evt.payload);
      send('end', {});
    }
  };

  eventBus.on('run.progress', onProgress);
  eventBus.on('run.completed', onCompleted);
  eventBus.on('run.failed', onFailed);

  req.on('close', () => {
    // nothing needed; EventEmitter listeners are cheap
  });
});
