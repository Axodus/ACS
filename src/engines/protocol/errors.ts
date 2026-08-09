import type { EngineErrorPayload } from "./types.js";

export class EngineTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineTransportError";
  }
}

export class EngineTimeoutError extends EngineTransportError {
  constructor(message: string) {
    super(message);
    this.name = "EngineTimeoutError";
  }
}

export class EngineProtocolError extends Error {
  readonly payload: EngineErrorPayload;

  constructor(payload: EngineErrorPayload) {
    super(payload.message);
    this.name = "EngineProtocolError";
    this.payload = payload;
  }
}
