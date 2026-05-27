export type AcsAuthMode = "disabled" | "mock" | "required";
export type AcsAuthActorType = "system" | "agent" | "tenant-admin" | "user" | "governance";

export interface AcsAuthContext {
  readonly mode: AcsAuthMode;
  readonly actorType?: AcsAuthActorType;
  readonly actorId?: string;
  readonly tenantId?: string;
  readonly wallet?: string;
  readonly scopes: readonly string[];
  readonly authenticated: boolean;
  readonly warnings: readonly string[];
}

export interface CreateAcsAuthContextInput {
  readonly mode?: AcsAuthMode;
  readonly actorType?: AcsAuthActorType;
  readonly actorId?: string;
  readonly tenantId?: string;
  readonly wallet?: string;
  readonly scopes?: readonly string[];
  readonly authenticated?: boolean;
}

const ACTOR_TYPES: readonly AcsAuthActorType[] = ["system", "agent", "tenant-admin", "user", "governance"];

export function createAcsAuthContext(input: CreateAcsAuthContextInput = {}): AcsAuthContext {
  const mode = input.mode ?? "disabled";
  const authenticated = input.authenticated ?? mode === "disabled";
  const warnings = [
    ...(mode === "disabled" ? ["ACS HTTP auth enforcement is disabled in the current inspection MVP."] : []),
    ...(mode === "mock" ? ["ACS HTTP auth context is mock-only; no token validation was performed."] : []),
    ...(mode === "required" && !authenticated ? ["ACS HTTP auth would be required in production."] : []),
  ];

  return {
    mode,
    ...(input.actorType ? { actorType: input.actorType } : {}),
    ...(input.actorId ? { actorId: input.actorId } : {}),
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    ...(input.wallet ? { wallet: input.wallet } : {}),
    scopes: input.scopes ?? [],
    authenticated,
    warnings,
  };
}

export function parseMockAuthContext(headers: Readonly<Record<string, string | undefined>>): AcsAuthContext {
  const mode = parseAuthMode(headers["x-acs-auth-mode"]);
  const actorType = parseActorType(headers["x-acs-actor-type"]);
  const scopes = (headers["x-acs-scopes"] ?? "")
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
  const authenticatedHeader = headers["x-acs-authenticated"];

  return createAcsAuthContext({
    mode,
    ...(actorType ? { actorType } : {}),
    ...(headers["x-acs-actor-id"] ? { actorId: headers["x-acs-actor-id"] } : {}),
    ...(headers["x-acs-tenant-id"] ? { tenantId: headers["x-acs-tenant-id"] } : {}),
    ...(headers["x-acs-wallet"] ? { wallet: headers["x-acs-wallet"] } : {}),
    scopes,
    ...(authenticatedHeader ? { authenticated: authenticatedHeader === "true" } : {}),
  });
}

function parseAuthMode(value: string | undefined): AcsAuthMode {
  if (value === "mock" || value === "required") {
    return value;
  }

  return "disabled";
}

function parseActorType(value: string | undefined): AcsAuthActorType | undefined {
  return ACTOR_TYPES.find((candidate) => candidate === value);
}
