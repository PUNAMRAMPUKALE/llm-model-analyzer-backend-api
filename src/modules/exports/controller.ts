import { Router } from 'express';
import { ExportsService } from './service.js';

export const exportsRouter = Router();
const svc = new ExportsService();

exportsRouter.get('/:experimentId.json', async (req, res) => {
  const data = await svc.asJSON(req.params.experimentId);
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data, null, 2));
});

exportsRouter.get('/:experimentId.csv', async (req, res) => {
  const data = await svc.asCSV(req.params.experimentId);
  res.setHeader('Content-Type', 'text/csv');
  res.send(data);
});
