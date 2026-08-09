export class EngineError extends Error {
  readonly code: string | undefined;
  readonly retryable: boolean | undefined;
  readonly details: Record<string, unknown> | undefined;

  constructor(message: string, options: { code?: string; retryable?: boolean; details?: Record<string, unknown> } = {}) {
    super(message);
    this.name = new.target.name;
    this.code = options.code;
    this.retryable = options.retryable;
    this.details = options.details;
  }
}

export class EngineUnavailableError extends EngineError {}
export class EngineProtocolFailureError extends EngineError {}
export class EngineUnsupportedOperationError extends EngineError {}
export class EngineTargetNotFoundError extends EngineError {}
export class EngineInvalidResponseError extends EngineError {}
export class EngineTimeoutDomainError extends EngineError {}
export class EngineRegistryDuplicateError extends EngineError {}
export class EngineRegistryNotFoundError extends EngineError {}
