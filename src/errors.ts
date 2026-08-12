export class AcsError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "AcsError";
  }
}

export class DuplicateRegistrationError extends AcsError {
  constructor(kind: string, id: string) {
    super(`${kind} already registered: ${id}`, "ACS_DUPLICATE_REGISTRATION");
  }
}

export class NotFoundError extends AcsError {
  readonly kind: string;
  readonly id: string;

  constructor(kind: string, id: string) {
    super(`${kind} not found: ${id}`, "ACS_NOT_FOUND");
    this.kind = kind;
    this.id = id;
  }
}

export class PolicyRejectedError extends AcsError {
  constructor(reason: string) {
    super(reason, "ACS_POLICY_REJECTED");
  }
}

export function toEntityRef(kind: string, id: string): string {
  return `${kind}:${id}`;
}
