import { fail, ok, type AcsHttpEnvelopeMeta } from "../responses.js";
import {
  AcsHttpValidationError,
  assertAllowedQueryParams,
  assertSafeIdentifier,
  readPathSegment,
} from "../validation.js";
import type { ControlPlaneContext } from "../control-plane-context.js";
import { ProductApiClient } from "../../control-plane/product-api-client.js";
import type {
  AgentCreateInput,
  AgentCreateRevisionInput,
  AgentDuplicateInput,
  AgentListItem,
  UpdateAgentInput,
} from "../../control-plane/product-api-client.js";
import { DuplicateRegistrationError, NotFoundError } from "../../errors.js";
import { AgentLifecycleGuardError, AgentRevisionConflictError } from "../../control-plane/agent-service.js";
import type {
  AgentDefinition,
  AgentModelStrategy,
  GovernedAgentStatus,
} from "../../control-plane/unified-agent-model.js";
import { validateAgentDefinition } from "../../control-plane/unified-agent-model.js";
import {
  EngineSandboxOnlyError,
} from "../../engines/engine-errors.js";
import type { AcsRouteOptions } from "./acs-routes.js";
import type { IncomingMessage } from "node:http";
import type { DeploymentMode } from "../../control-plane/unified-agent-model.js";
import type { DeploymentRequest } from "../../control-plane/deployment-service.js";

function isDeploymentMode(value: string): value is DeploymentMode {
  return value === "sandbox" || value === "staged" || value === "live";
}

export async function routeProductApiRequest(
  request: IncomingMessage,
  requestUrl: string,
  context: ControlPlaneContext,
  options: AcsRouteOptions = {},
) {
  const routeMeta: AcsHttpEnvelopeMeta = {
    ...(options.auth ? { auth: options.auth } : {}),
    ...(options.rateLimit ? { rateLimit: options.rateLimit } : {}),
  };

  const api = new ProductApiClient({
    agentService: context.agentService,
    deploymentService: context.deploymentService,
    runtimeService: context.runtimeService,
    auditService: context.auditService,
    targetService: context.targetService,
    providerService: context.providerService,
    runnerService: context.runnerService,
    workerRegistry: context.workerRegistry,
    workerAssignmentService: context.workerAssignmentService,
    engineService: context.engineService,
  });

  const url = new URL(requestUrl, "http://localhost");
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const segments = path.split("/").filter(Boolean);

  if (segments[0] !== "api" || segments[1] !== "v1") {
    return fail("route not found", 404, "not_found", options.correlationId, undefined, routeMeta);
  }

  const apiPath = segments.slice(2).join("/");

  try {
    // A01 exposes only boundary connectivity; it does not assert runtime readiness.
    if (apiPath === "health") {
      assertAllowedQueryParams(url, []);
      return {
        status: 200,
        body: ok({
          service: "acs-product-api",
          status: "ok",
          mode: "inspection",
          automation: "disabled",
        }, [], options.correlationId, routeMeta),
      };
    }

    // A02 exposes only a read-only aggregate; it does not introduce mutations.
    if (apiPath === "dashboard" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const summary = await api.getDashboardSummary();
      return { status: 200, body: ok(summary, [], options.correlationId, routeMeta) };
    }

    // A03 exposes only a read-only readiness inspection; it does not mutate state.
    if (apiPath === "readiness" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const summary = await api.getGlobalReadinessSummary();
      return { status: 200, body: ok(summary, [], options.correlationId, routeMeta) };
    }

    // Agent inventory (read-only list with governed search/filter/sort)
    if (segments[2] === "agents" && segments.length === 3 && request.method === "GET") {
      assertAllowedQueryParams(url, ["search", "status", "environment", "sort"]);
      const agents = await api.listAgents();
      const filtered = filterAgentList(agents, url);
      return { status: 200, body: ok(filtered, [], options.correlationId, routeMeta) };
    }

    // POST /api/v1/agents (create agent)
    if (segments[2] === "agents" && segments.length === 3 && request.method === "POST") {
      assertAllowedQueryParams(url, []);
      const body = await readJsonBody(request);
      const input: AgentCreateInput = parseAgentCreateInput(body);
      const result = await api.createAgent(input);
      return { status: 201, body: ok(result, [], options.correlationId, routeMeta) };
    }

    // Other methods on the agents collection are not supported.
    if (segments[2] === "agents" && segments.length === 3) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET, POST");
    }

    // POST /api/v1/agents/:agentId/deploy
    if (segments[2] === "agents" && segments[3] && segments[4] === "deploy" && request.method === "POST") {
      const agentId = readPathSegment(segments, 3, "agentId");
      const body = await readJsonBody(request);

      if (!isDeploymentMode(body.mode)) {
        return fail(`invalid deploymentMode: ${body.mode}`, 400, "invalid_request", options.correlationId, undefined, routeMeta);
      }

      const requestData: DeploymentRequest = {
        agentId,
        revision: body.revision,
        composition: body.composition,
        deploymentMode: body.mode,
        targetId: body.targetId,
      };

      const deployment = await api.deployAgent(requestData);
      return { status: 201, body: ok(deployment, [], options.correlationId, routeMeta) };
    }

    // GET /api/v1/agents/:agentId/revisions
    if (segments[2] === "agents" && segments[3] && segments[4] === "revisions" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const revisions = await api.getAgentRevisions(agentId);
      return { status: 200, body: ok(revisions, [], options.correlationId, routeMeta) };
    }

    // POST /api/v1/agents/:agentId/revisions (create revision)
    if (segments[2] === "agents" && segments[3] && segments[4] === "revisions" && segments.length === 5 && request.method === "POST") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const body = await readJsonBody(request);
      const input: AgentCreateRevisionInput = parseAgentCreateRevisionInput(body, agentId);
      const result = await api.createAgentRevision(agentId, input);
      return { status: 200, body: ok(result, [], options.correlationId, routeMeta) };
    }

    if (segments[2] === "agents" && segments[3] && segments[4] === "revisions" && segments.length === 5) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET, POST");
    }

    // POST /api/v1/agents/:agentId/revisions/:revisionId/adopt
    // POST /api/v1/agents/:agentId/revisions/:revisionId/restore
    if (segments[2] === "agents" && segments[3] && segments[4] === "revisions"
      && segments[5] && (segments[6] === "adopt" || segments[6] === "restore") && segments.length === 7
      && request.method === "POST") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const revisionId = readPathSegment(segments, 5, "revisionId");
      const result = segments[6] === "adopt"
        ? await api.adoptAgentRevision(agentId, revisionId)
        : await api.restoreAgentRevision(agentId, revisionId);
      return { status: 200, body: ok(result, [], options.correlationId, routeMeta) };
    }

    if (segments[2] === "agents" && segments[3] && segments[4] === "revisions" && segments[5]
      && (segments[6] === "adopt" || segments[6] === "restore") && segments.length === 7) {
      return methodNotAllowed(options.correlationId, routeMeta, "POST");
    }

    // GET /api/v1/agents/:agentId/lifecycle
    if (segments[2] === "agents" && segments[3] && segments[4] === "lifecycle" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const lifecycle = await api.getAgentLifecycle(agentId);
      if (!lifecycle) {
        return fail(`agent not found: ${agentId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(lifecycle, [], options.correlationId, routeMeta) };
    }

    if (segments[2] === "agents" && segments[3] && segments[4] === "lifecycle" && segments.length === 5) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // POST /api/v1/agents/:agentId/duplicate
    if (segments[2] === "agents" && segments[3] && segments[4] === "duplicate" && segments.length === 5 && request.method === "POST") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const body = await readJsonBody(request);
      const input: AgentDuplicateInput = parseAgentDuplicateInput(body);
      const result = await api.duplicateAgent(agentId, input);
      return { status: 200, body: ok(result, [], options.correlationId, routeMeta) };
    }

    if (segments[2] === "agents" && segments[3] && segments[4] === "duplicate" && segments.length === 5) {
      return methodNotAllowed(options.correlationId, routeMeta, "POST");
    }

    // POST /api/v1/agents/:agentId/archive
    if (segments[2] === "agents" && segments[3] && segments[4] === "archive" && segments.length === 5 && request.method === "POST") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const result = await api.archiveAgent(agentId);
      return { status: 200, body: ok(result, [], options.correlationId, routeMeta) };
    }

    if (segments[2] === "agents" && segments[3] && segments[4] === "archive" && segments.length === 5) {
      return methodNotAllowed(options.correlationId, routeMeta, "POST");
    }

    // POST /api/v1/agents/:agentId/restore
    if (segments[2] === "agents" && segments[3] && segments[4] === "restore" && segments.length === 5 && request.method === "POST") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const result = await api.restoreAgent(agentId);
      return { status: 200, body: ok(result, [], options.correlationId, routeMeta) };
    }

    if (segments[2] === "agents" && segments[3] && segments[4] === "restore" && segments.length === 5) {
      return methodNotAllowed(options.correlationId, routeMeta, "POST");
    }

    // PATCH /api/v1/agents/:agentId (update agent)
    if (segments[2] === "agents" && segments[3] && segments.length === 4 && request.method === "PATCH") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const body = await readJsonBody(request);
      const input: UpdateAgentInput = parseAgentUpdateInput(body, agentId);
      const result = await api.updateAgent(agentId, input);
      return { status: 200, body: ok(result, [], options.correlationId, routeMeta) };
    }

    // DELETE /api/v1/agents/:agentId (protected delete)
    if (segments[2] === "agents" && segments[3] && segments.length === 4 && request.method === "DELETE") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const result = await api.deleteAgent(agentId);
      return { status: 200, body: ok(result, [], options.correlationId, routeMeta) };
    }

    // GET /api/v1/agents/:agentId
    if (segments[2] === "agents" && segments[3] && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const agent = await api.getAgent(agentId);
      if (!agent) {
        return fail(`agent not found: ${agentId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(agent, [], options.correlationId, routeMeta) };
    }

    // Other methods on a single agent resource are not supported.
    if (segments[2] === "agents" && segments[3] && segments.length === 4) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET, PATCH, DELETE");
    }

    // GET /api/v1/targets
    if (apiPath === "targets") {
      assertAllowedQueryParams(url, []);
      const targets = await api.listTargets();
      return { status: 200, body: ok(targets, [], options.correlationId, routeMeta) };
    }

    // GET /api/v1/providers
    if (apiPath === "providers") {
      assertAllowedQueryParams(url, []);
      const providers = await api.listProviders();
      return { status: 200, body: ok(providers, [], options.correlationId, routeMeta) };
    }

    // GET /api/v1/runners
    if (apiPath === "runners") {
      assertAllowedQueryParams(url, []);
      const runners = await api.listRunners();
      return { status: 200, body: ok(runners, [], options.correlationId, routeMeta) };
    }

    // GET /api/v1/deployments/:deploymentId
    if (segments[2] === "deployments" && segments[3]) {
      const deploymentId = readPathSegment(segments, 3, "deploymentId");
      const deployments = await api.listDeployments();
      const deployment = deployments.find(d => d.deploymentId === deploymentId);
      if (!deployment) {
        return fail(`deployment not found: ${deploymentId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(deployment, [], options.correlationId, routeMeta) };
    }

    // POST /api/v1/runtimes/:runtimeInstanceId/start
    if (segments[2] === "runtimes" && segments[3] && segments[4] === "start") {
      const runtimeInstanceId = readPathSegment(segments, 3, "runtimeInstanceId");
      const body = await readJsonBody(request);
      const requestData = {
        deploymentId: body.deploymentId ?? "",
        runtimeInstanceId,
        deploymentMode: "sandbox",
        ...(body.agentId ? { agentId: body.agentId } : {}),
        ...(body.targetId ? { targetId: body.targetId } : {}),
      };
      const runtime = await api.startRuntime(requestData);
      return { status: 200, body: ok(runtime, [], options.correlationId, routeMeta) };
    }

    // POST /api/v1/runtimes/:runtimeInstanceId/stop
    if (segments[2] === "runtimes" && segments[3] && segments[4] === "stop") {
      const runtimeInstanceId = readPathSegment(segments, 3, "runtimeInstanceId");
      const runtime = await api.stopRuntime(runtimeInstanceId);
      return { status: 200, body: ok(runtime, [], options.correlationId, routeMeta) };
    }

    // GET /api/v1/audit
    if (apiPath === "audit") {
      const filter = {};
      const events = await api.queryAuditEvents(filter);
      return { status: 200, body: ok(events, [], options.correlationId, routeMeta) };
    }

    return fail("route not found", 404, "not_found", options.correlationId, undefined, routeMeta);
  } catch (error) {
    return mapDomainErrorToHttp(error, options.correlationId, routeMeta);
  }
}

async function readJsonBody(request: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    request.on("data", (chunk) => { data += chunk; });
    request.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new AcsHttpValidationError("invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}

function methodNotAllowed(correlationId: string | undefined, meta: AcsHttpEnvelopeMeta, allowed: string) {
  return fail(
    `method not allowed; allowed methods: ${allowed}`,
    405,
    "method_not_allowed",
    correlationId,
    { allowed },
    meta,
  );
}

const AGENT_STATUS_VALUES: readonly GovernedAgentStatus[] = ["draft", "active", "disabled", "archived"];
const AGENT_SORT_VALUES = ["name", "updatedAt", "status"] as const;

function filterAgentList(agents: readonly AgentListItem[], url: URL): readonly AgentListItem[] {
  const search = url.searchParams.get("search")?.trim().toLowerCase();
  const status = url.searchParams.get("status");
  const environment = url.searchParams.get("environment");
  const sort = url.searchParams.get("sort") ?? "name";

  let filtered: readonly AgentListItem[] = agents;
  if (search) {
    filtered = filtered.filter((agent) =>
      agent.name.toLowerCase().includes(search) || agent.agentId.toLowerCase().includes(search));
  }
  if (status !== null) {
    if (!AGENT_STATUS_VALUES.includes(status as GovernedAgentStatus)) {
      throw new AcsHttpValidationError(`invalid status filter: ${status}`, { allowed: AGENT_STATUS_VALUES });
    }
    filtered = filtered.filter((agent) => agent.status === status);
  }
  if (environment !== null) {
    if (environment !== "sandbox") {
      throw new AcsHttpValidationError(`invalid environment filter: ${environment}`, { allowed: ["sandbox"] });
    }
    filtered = filtered.filter((agent) => agent.environment === environment);
  }

  if (!AGENT_SORT_VALUES.includes(sort as (typeof AGENT_SORT_VALUES)[number])) {
    throw new AcsHttpValidationError(`invalid sort: ${sort}`, { allowed: AGENT_SORT_VALUES });
  }
  const sorted = [...filtered];
  if (sort === "updatedAt") {
    sorted.sort((left, right) => right.updatedAt - left.updatedAt);
  } else if (sort === "status") {
    sorted.sort((left, right) => left.status.localeCompare(right.status));
  } else {
    sorted.sort((left, right) => left.name.localeCompare(right.name));
  }
  return sorted;
}

function parseAgentCreateInput(body: unknown): AgentCreateInput {
  const record = readBodyRecord(body);
  const definition = readAgentDefinition(record.definition, undefined);
  const createdBy = readOptionalString(record.createdBy, "createdBy");
  return { definition, ...(createdBy ? { createdBy } : {}) };
}

function parseAgentUpdateInput(body: unknown, agentId: string): UpdateAgentInput {
  const record = readBodyRecord(body);
  const definition = readAgentDefinition(record.definition, agentId);
  const expectedRevision = readExpectedRevision(record.expectedRevision);
  const updatedBy = readOptionalString(record.updatedBy, "updatedBy");
  return { definition, expectedRevision, ...(updatedBy ? { updatedBy } : {}) };
}

function parseAgentCreateRevisionInput(body: unknown, agentId: string): AgentCreateRevisionInput {
  const record = readBodyRecord(body);
  const definition = readAgentDefinition(record.definition, agentId);
  const expectedRevision = readExpectedRevision(record.expectedRevision);
  const actor = readOptionalString(record.actor, "actor");
  return { definition, expectedRevision, ...(actor ? { actor } : {}) };
}

function parseAgentDuplicateInput(body: unknown): AgentDuplicateInput {
  const record = readBodyRecord(body);
  const newAgentId = typeof record.newAgentId === "string" && record.newAgentId.trim()
    ? assertSafeIdentifier(record.newAgentId, "newAgentId")
    : (() => { throw new AcsHttpValidationError("newAgentId is required for duplicate"); })();
  const name = readOptionalString(record.name, "name");
  const actor = readOptionalString(record.actor, "actor");
  return { newAgentId, ...(name ? { name } : {}), ...(actor ? { actor } : {}) };
}

function readBodyRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AcsHttpValidationError("request body must be a JSON object");
  }
  return body as Record<string, unknown>;
}

function readOptionalString(value: unknown, name: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new AcsHttpValidationError(`${name} must be a non-empty string`);
  }
  return value;
}

function readExpectedRevision(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new AcsHttpValidationError("expectedRevision must be a positive integer");
  }
  return value;
}

function readAgentDefinition(value: unknown, expectedAgentId: string | undefined): AgentDefinition {
  const record = readBodyRecord(value);
  const agentId = typeof record.agentId === "string" && record.agentId.trim()
    ? assertSafeIdentifier(record.agentId, "definition.agentId")
    : (() => { throw new AcsHttpValidationError("definition.agentId is required"); })();
  if (expectedAgentId !== undefined && agentId !== expectedAgentId) {
    throw new AcsHttpValidationError(`definition.agentId must match ${expectedAgentId}`);
  }
  const name = typeof record.name === "string" && record.name.trim()
    ? record.name.trim()
    : (() => { throw new AcsHttpValidationError("definition.name is required"); })();
  const rawStatus = record.status === undefined ? "draft" : record.status;
  if (typeof rawStatus !== "string" || !AGENT_STATUS_VALUES.includes(rawStatus as GovernedAgentStatus)) {
    throw new AcsHttpValidationError("definition.status must be draft, active, disabled or archived", {
      allowed: AGENT_STATUS_VALUES,
    });
  }
  const definition: AgentDefinition = {
    agentId,
    name,
    status: rawStatus as GovernedAgentStatus,
    capabilityIds: readStringArray(record.capabilityIds, "capabilityIds"),
    skillIds: readStringArray(record.skillIds, "skillIds"),
    toolIds: readStringArray(record.toolIds, "toolIds"),
    credentialConnectionIds: readStringArray(record.credentialConnectionIds, "credentialConnectionIds"),
    runnerPreferences: readStringArray(record.runnerPreferences, "runnerPreferences"),
    ...(typeof record.roleId === "string" ? { roleId: record.roleId } : {}),
    ...(typeof record.roleRevision === "number" ? { roleRevision: record.roleRevision } : {}),
    ...(typeof record.profileId === "string" ? { profileId: record.profileId } : {}),
    ...(typeof record.profileRevision === "number" ? { profileRevision: record.profileRevision } : {}),
    ...(typeof record.executionPolicyId === "string" ? { executionPolicyId: record.executionPolicyId } : {}),
    ...(isPlainObject(record.modelStrategy)
      ? { modelStrategy: record.modelStrategy as unknown as AgentModelStrategy }
      : {}),
    ...(isPlainObject(record.metadata) ? { metadata: record.metadata as Record<string, unknown> } : {}),
  };
  const findings = validateAgentDefinition(definition);
  const errors = findings.filter((finding) => finding.severity === "error");
  if (errors.length > 0) {
    throw new AcsHttpValidationError("agent definition is invalid", { findings: errors });
  }
  return definition;
}

function readStringArray(value: unknown, name: string): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !entry.trim())) {
    throw new AcsHttpValidationError(`${name} must be an array of non-empty strings`);
  }
  return value as readonly string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mapDomainErrorToHttp(error: unknown, correlationId: string | undefined, meta: AcsHttpEnvelopeMeta) {
  if (error instanceof NotFoundError) {
    return fail(error.message, 404, "not_found", correlationId, undefined, meta);
  }
  if (error instanceof DuplicateRegistrationError) {
    return fail(error.message, 409, "conflict", correlationId, undefined, meta);
  }
  if (error instanceof AgentRevisionConflictError) {
    return fail(error.message, 409, "conflict", correlationId, undefined, meta);
  }
  if (error instanceof AgentLifecycleGuardError) {
    return fail(error.message, 409, "agent_lifecycle_guard", correlationId, error.details, meta);
  }
  if (error instanceof EngineSandboxOnlyError) {
    return fail(error.message, 403, "forbidden", correlationId, error.details, meta);
  }
  if (error instanceof AcsHttpValidationError) {
    return fail(error.message, 400, error.code, correlationId, error.details, meta);
  }
  if (error instanceof Error) {
    return fail(error.message, 500, "internal_error", correlationId, undefined, meta);
  }
  return fail("unknown product API error", 500, "internal_error", correlationId, undefined, meta);
}
