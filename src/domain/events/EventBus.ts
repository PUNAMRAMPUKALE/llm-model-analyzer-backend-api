import { EventEmitter } from 'node:events';
import type { DomainEvent, EventName } from './events.js';

type Handler = (e: DomainEvent) => void;

export class EventBus {
  private ee = new EventEmitter();
  on(name: EventName, handler: Handler) {
    this.ee.on(name, handler);
  }
  emit(name: EventName, payload: DomainEvent['payload'] = {}) {
    const evt: DomainEvent = { name, payload, ts: Date.now() };
    this.ee.emit(name, evt);
    return evt;
  }
}
export const eventBus = new EventBus();
