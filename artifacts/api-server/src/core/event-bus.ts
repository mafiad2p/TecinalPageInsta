import { childLogger } from "./logger.js";

type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

const log = childLogger({ module: "event-bus" });

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  on<T>(event: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(event) ?? [];
    existing.push(handler as EventHandler);
    this.handlers.set(event, existing);
    log.debug({ event }, "Handler registered");
  }

  off(event: string, handler: EventHandler): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(
      event,
      existing.filter((h) => h !== handler)
    );
  }

  async emit<T>(event: string, data: T): Promise<void> {
    const handlers = this.handlers.get(event) ?? [];
    log.info({ event, handlerCount: handlers.length }, "Event emitted");
    await Promise.all(
      handlers.map((h) =>
        Promise.resolve(h(data)).catch((err) => {
          log.error({ event, err }, "Event handler error");
        })
      )
    );
  }

  listEvents(): string[] {
    return [...this.handlers.keys()];
  }
}

export const eventBus = new EventBus();
export type { EventHandler };
