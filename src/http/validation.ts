export class AcsHttpValidationError extends Error {
  readonly code = "invalid_query";

  constructor(message: string, readonly details?: unknown) {
    super(message);
    this.name = "AcsHttpValidationError";
  }
}

export function assertAllowedQueryParams(url: URL, allowed: readonly string[]): void {
  const allowedSet = new Set(allowed);
  const unknown = [...url.searchParams.keys()].filter((key) => !allowedSet.has(key));
  if (unknown.length > 0) {
    throw new AcsHttpValidationError(`unsupported query parameter: ${unknown[0]}`, {
      allowed,
      received: unknown,
    });
  }
}

export function readOptionalQuery(url: URL, name: string): string | undefined {
  const value = url.searchParams.get(name);
  if (value === null) {
    return undefined;
  }

  return assertSafeIdentifier(value, name);
}

export function readRequiredQuery(url: URL, name: string): string {
  const value = readOptionalQuery(url, name);
  if (!value) {
    throw new AcsHttpValidationError(`${name} query parameter is required`);
  }

  return value;
}

export function readPathSegment(segments: readonly string[], index: number, name: string): string {
  const raw = segments[index];
  if (!raw) {
    throw new AcsHttpValidationError(`${name} path parameter is required`);
  }

  return assertSafeIdentifier(decodeURIComponent(raw), name);
}

export function assertSafeIdentifier(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new AcsHttpValidationError(`${name} cannot be empty`);
  }

  if (normalized.length > 160) {
    throw new AcsHttpValidationError(`${name} is too long`, { maxLength: 160 });
  }

  if (!/^[a-zA-Z0-9._:-]+$/.test(normalized)) {
    throw new AcsHttpValidationError(`${name} contains unsupported characters`);
  }

  return normalized;
}
