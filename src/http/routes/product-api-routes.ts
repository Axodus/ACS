import { fail, ok, type AcsHttpEnvelopeMeta } from "../responses.js";
import {
  AcsHttpValidationError,
  assertAllowedQueryParams,
  readPathSegment,
} from "../validation.js";
import type { ControlPlaneContext } from "../control-plane-context.js";
import { ProductApiClient } from "../../control-plane/product-api-client.js";
import { NotFoundError } from "../../errors.js";
import { AgentRevisionConflictError } from "../../control-plane/agent-service.js";
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

    // GET /api/v1/agents
    if (apiPath === "agents" && url.search === "") {
      assertAllowedQueryParams(url, []);
      const agents = await api.listAgents();
      return { status: 200, body: ok(agents, [], options.correlationId, routeMeta) };
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

    // GET /api/v1/agents/:agentId
    if (segments[2] === "agents" && segments[3]) {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const agent = await api.getAgent(agentId);
      if (!agent) {
        return fail(`agent not found: ${agentId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(agent, [], options.correlationId, routeMeta) };
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

function mapDomainErrorToHttp(error: unknown, correlationId: string | undefined, meta: AcsHttpEnvelopeMeta) {
  if (error instanceof NotFoundError) {
    return fail(error.message, 404, "not_found", correlationId, undefined, meta);
  }
  if (error instanceof AgentRevisionConflictError) {
    return fail(error.message, 409, "conflict", correlationId, undefined, meta);
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
