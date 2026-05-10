import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import type { TelemetryEvent, TelemetryEventType, TelemetryId } from "./types.js";

export interface TelemetrySink {
  record(type: TelemetryEventType, subjectId: string, data?: Readonly<Record<string, unknown>>): TelemetryEvent;
  list(): readonly TelemetryEvent[];
}

export class InMemoryTelemetrySink implements TelemetrySink {
  readonly #events: TelemetryEvent[] = [];
  #sequence = 0;

  record(type: TelemetryEventType, subjectId: string, data: Readonly<Record<string, unknown>> = {}): TelemetryEvent {
    const event: TelemetryEvent = {
      id: this.#nextId(),
      type,
      timestamp: new Date().toISOString(),
      subjectId,
      data,
    };

    this.#events.push(event);
    return event;
  }

  list(): readonly TelemetryEvent[] {
    return [...this.#events];
  }

  #nextId(): TelemetryId {
    this.#sequence += 1;
    return `tel_${this.#sequence.toString().padStart(6, "0")}`;
  }
}

export class JsonlTelemetrySink implements TelemetrySink {
  #sequence = 0;

  constructor(private readonly filePath: string) {
    this.#sequence = this.#readLastSequence();
  }

  record(type: TelemetryEventType, subjectId: string, data: Readonly<Record<string, unknown>> = {}): TelemetryEvent {
    const event: TelemetryEvent = {
      id: this.#nextId(),
      type,
      timestamp: new Date().toISOString(),
      subjectId,
      data,
    };

    mkdirSync(dirname(this.filePath), { recursive: true });
    appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, { encoding: "utf8" });
    return event;
  }

  list(): readonly TelemetryEvent[] {
    if (!existsSync(this.filePath)) {
      return [];
    }

    return readFileSync(this.filePath, "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as TelemetryEvent);
  }

  #nextId(): TelemetryId {
    this.#sequence += 1;
    return `tel_${this.#sequence.toString().padStart(6, "0")}`;
  }

  #readLastSequence(): number {
    const lastEvent = this.list().at(-1);
    if (!lastEvent) {
      return 0;
    }

    const sequence = Number.parseInt(lastEvent.id.replace(/^tel_/, ""), 10);
    return Number.isFinite(sequence) ? sequence : 0;
  }
}
