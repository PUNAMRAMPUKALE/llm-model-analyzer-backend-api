export type EventName =
  | 'experiment.created'
  | 'run.started'
  | 'run.progress'
  | 'response.generated'
  | 'metrics.computed'
  | 'run.completed'
  | 'run.failed';

export type EventPayload = Record<string, unknown> & {
  experimentId?: string;
  runId?: string;
  responseId?: string;
};

export type DomainEvent = { name: EventName; payload: EventPayload; ts: number };
