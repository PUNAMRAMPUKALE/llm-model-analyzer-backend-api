import { Request, Response } from 'express';

export function sseInit(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const keepAlive = setInterval(() => res.write(':\n\n'), 15000);
  req.on('close', () => clearInterval(keepAlive));
  return {
    send: (event: string, data: unknown) =>
      res.write(`event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`),
    close: () => res.end(),
  };
}
