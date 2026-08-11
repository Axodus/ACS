import { relative, resolve, sep } from "node:path";

export interface IsolationScope {
  readonly tenantId: string;
  readonly workloadId: string;
}

export interface IsolationRoots {
  readonly sourceRoot: string;
  readonly runtimeRoot: string;
  readonly stateRoot: string;
  readonly configRoot: string;
  readonly artifactsRoot: string;
  readonly workspaceRoot: string;
}

export interface ControlPlaneIsolation {
  readonly scope: IsolationScope;
  readonly roots: IsolationRoots;
}

export class IsolationScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IsolationScopeError";
  }
}

export class IsolationRootError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IsolationRootError";
  }
}

export function normalizeIsolationScope(scope: IsolationScope): IsolationScope {
  if (!scope.tenantId || !scope.workloadId) {
    throw new IsolationScopeError("tenant and workload identity are required for isolation");
  }
  return {
    tenantId: scope.tenantId,
    workloadId: scope.workloadId,
  };
}

export function assertSameIsolationScope(left: IsolationScope | undefined, right: IsolationScope | undefined): void {
  if (!left || !right) {
    return;
  }
  if (left.tenantId !== right.tenantId || left.workloadId !== right.workloadId) {
    throw new IsolationScopeError(`scope mismatch: ${left.tenantId}/${left.workloadId} cannot access ${right.tenantId}/${right.workloadId}`);
  }
}

export function normalizeIsolationRoots(input: IsolationRoots): IsolationRoots {
  const roots: IsolationRoots = {
    sourceRoot: resolve(input.sourceRoot),
    runtimeRoot: resolve(input.runtimeRoot),
    stateRoot: resolve(input.stateRoot),
    configRoot: resolve(input.configRoot),
    artifactsRoot: resolve(input.artifactsRoot),
    workspaceRoot: resolve(input.workspaceRoot),
  };

  assertDisjoint(roots.sourceRoot, roots.runtimeRoot, "source_root", "runtime_root");
  assertWithin(roots.stateRoot, roots.runtimeRoot, "state_root", "runtime_root");
  assertWithin(roots.configRoot, roots.runtimeRoot, "config_root", "runtime_root");
  assertWithin(roots.artifactsRoot, roots.runtimeRoot, "artifacts_root", "runtime_root");
  assertWithin(roots.workspaceRoot, roots.runtimeRoot, "workspace_root", "runtime_root");

  return roots;
}

export function isPathInsideRoot(candidate: string, root: string): boolean {
  const resolvedCandidate = resolve(candidate);
  const resolvedRoot = resolve(root);
  const relativePath = relative(resolvedRoot, resolvedCandidate);
  return relativePath === "" || (!relativePath.startsWith("..") && !relativePath.includes(`${sep}..${sep}`));
}

export function assertWithin(candidate: string, root: string, candidateLabel: string, rootLabel: string): void {
  if (!isPathInsideRoot(candidate, root)) {
    throw new IsolationRootError(`${candidateLabel} must remain within ${rootLabel}`);
  }
}

export function assertDisjoint(left: string, right: string, leftLabel: string, rightLabel: string): void {
  const leftWithinRight = isPathInsideRoot(left, right);
  const rightWithinLeft = isPathInsideRoot(right, left);
  if (leftWithinRight || rightWithinLeft) {
    throw new IsolationRootError(`${leftLabel} and ${rightLabel} must not overlap`);
  }
}
