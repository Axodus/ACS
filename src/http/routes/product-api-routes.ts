import { fail, ok, type AcsHttpEnvelopeMeta } from "../responses.js";
import type { EventSeverity } from "../../control-plane/operational-evidence-service.js";
import {
  AcsHttpValidationError,
  assertAllowedQueryParams,
  assertSafeIdentifier,
  readPathSegment,
} from "../validation.js";
import type { ControlPlaneContext } from "../control-plane-context.js";
import { ProductApiClient } from "../../control-plane/product-api-client.js";
import { enforceTenantGovernanceMutation } from "../tenant-governance-enforcer.js";
import type {
  AgentCreateInput,
  AgentCreateRevisionInput,
  AgentDuplicateInput,
  AgentListItem,
  AgentReadinessDetail,
  DeploymentPlan,
  DeploymentSummary,
  ExecutionRunSummary,
  ProviderConnectionSummary,
  CredentialSummary,
  RuntimeSummary,
  WorkerSummary,
  UpdateAgentInput,
} from "../../control-plane/product-api-client.js";
import { AcsError, DuplicateRegistrationError, NotFoundError, PolicyRejectedError, toEntityRef } from "../../errors.js";
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
import { routeTenantAdministrationRequest } from "./admin-tenant-routes.js";

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
    economicService: context.economicService,
    runnerService: context.runnerService,
    workerRegistry: context.workerRegistry,
    workerAssignmentService: context.workerAssignmentService,
    engineService: context.engineService,
    compositionResources: context.compositionResources,
    credentialRegistry: context.credentials,
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

    if (apiPath === "admin/tenants" || apiPath.startsWith("admin/tenants/")) {
      return routeTenantAdministrationRequest(request, url, apiPath, context, options, routeMeta);
    }

    // S03 exposes only the billing boundary and financial truth projection; it does not mutate billing state.
    if (apiPath === "system/billing-boundary" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const summary = await api.getBillingBoundaryReport();
      return { status: 200, body: ok(summary, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "system/billing-boundary") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // S05 exposes only the payment rails boundary; it does not move money.
    if (apiPath === "system/payment-rails-boundary" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const summary = await api.getPaymentRailsBoundaryReport();
      return { status: 200, body: ok(summary, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "system/payment-rails-boundary") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // S04 exposes only the pricing / invoice candidate boundary; it does not compute price or issue invoices.
    if (apiPath === "system/pricing-invoice-boundary" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const summary = await api.getPricingInvoiceBoundaryReport();
      return { status: 200, body: ok(summary, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "system/pricing-invoice-boundary") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // S06 exposes only the tenant billing and account responsibility boundary; it does not mutate tenant state.
    if (apiPath === "system/tenant-billing-boundary" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const summary = await api.getTenantBillingBoundaryReport();
      return { status: 200, body: ok(summary, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "system/tenant-billing-boundary") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // S07 exposes only receipt, settlement and reconciliation evidence boundaries; it does not settle or reconcile money.
    if (apiPath === "system/settlement-reconciliation" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const summary = await api.getSettlementReconciliationBoundaryReport();
      return { status: 200, body: ok(summary, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "system/settlement-reconciliation") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // S08 exposes only financial audit, compliance and risk boundaries; it does not certify audit or compliance.
    if (apiPath === "system/financial-audit" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const summary = await api.getFinancialAuditBoundaryReport();
      return { status: 200, body: ok(summary, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "system/financial-audit") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // Unsupported composition mutations: Milestone C is read-only. The Product
    // API rejects governed mutations with a structured error instead of
    // simulating success. This catch-all runs before the catalog routes so the
    // mutation paths never fall through to a generic method_not_allowed.
    if (
      (segments[2] === "skills" && segments[3] && (segments[4] === "install" || segments[4] === "remove") && segments.length === 5)
      || (segments[2] === "plugins" && segments[3] && (segments[4] === "install" || segments[4] === "remove") && segments.length === 5)
      || (segments[2] === "agents" && segments[3] && segments[4] === "skills" && segments[5] && (segments[6] === "assign" || segments[6] === "unassign") && segments.length === 7)
      || (segments[2] === "agents" && segments[3] && segments[4] === "tools" && segments[5] && (segments[6] === "assign" || segments[6] === "unassign") && segments.length === 7)
      || (segments[2] === "agents" && segments[3] && segments[4] === "composition" && segments[5]
        && (segments[5] === "role" || segments[5] === "profile" || segments[5] === "engine" || segments[5] === "provider" || segments[5] === "model")
        && segments.length === 6)
    ) {
      return unsupportedCompositionMutation(options.correlationId, routeMeta, segments.join("/"));
    }

    // ---- Milestone C: composition surface (read-only) ----

    // GET /api/v1/composition and GET /api/v1/composition/summary
    if ((apiPath === "composition" || apiPath === "composition/summary") && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const summary = await api.getCompositionSummary();
      return { status: 200, body: ok(summary, [], options.correlationId, routeMeta) };
    }

    if (apiPath === "composition" || apiPath === "composition/summary") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/roles and GET /api/v1/roles/:roleId
    if (segments[2] === "roles" && segments.length === 3 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const roles = await api.listRoles();
      return { status: 200, body: ok(roles, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "roles" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const roleId = readPathSegment(segments, 3, "roleId");
      const role = await api.getRoleDetail(roleId);
      return { status: 200, body: ok(role, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "roles") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/profiles and GET /api/v1/profiles/:profileId
    if (segments[2] === "profiles" && segments.length === 3 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const profiles = await api.listProfiles();
      return { status: 200, body: ok(profiles, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "profiles" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const profileId = readPathSegment(segments, 3, "profileId");
      const profile = await api.getProfileDetail(profileId);
      return { status: 200, body: ok(profile, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "profiles") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/capabilities and GET /api/v1/capabilities/:capabilityId
    if (segments[2] === "capabilities" && segments.length === 3 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const capabilities = await api.listCapabilities();
      return { status: 200, body: ok(capabilities, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "capabilities" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const capabilityId = readPathSegment(segments, 3, "capabilityId");
      const capability = await api.getCapabilityDetail(capabilityId);
      return { status: 200, body: ok(capability, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "capabilities") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/skills and GET /api/v1/skills/:skillId
    if (segments[2] === "skills" && segments.length === 3 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const skills = await api.listSkills();
      return { status: 200, body: ok(skills, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "skills" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const skillId = readPathSegment(segments, 3, "skillId");
      const skill = await api.getSkillDetail(skillId);
      return { status: 200, body: ok(skill, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "skills") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/tools and GET /api/v1/tools/:toolId
    if (segments[2] === "tools" && segments.length === 3 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const tools = await api.listTools();
      return { status: 200, body: ok(tools, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "tools" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const toolId = readPathSegment(segments, 3, "toolId");
      const tool = await api.getToolDetail(toolId);
      return { status: 200, body: ok(tool, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "tools") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/plugins and GET /api/v1/plugins/:pluginId
    if (segments[2] === "plugins" && segments.length === 3 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const plugins = await api.listPlugins();
      return { status: 200, body: ok(plugins, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "plugins" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const pluginId = readPathSegment(segments, 3, "pluginId");
      const plugin = await api.getPluginDetail(pluginId);
      return { status: 200, body: ok(plugin, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "plugins") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/plugin-packages
    if (apiPath === "plugin-packages" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const packages = await api.listPluginPackages();
      return { status: 200, body: ok(packages, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "plugin-packages") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/package-sources
    if (apiPath === "package-sources" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const sources = await api.listPackageSources();
      return { status: 200, body: ok(sources, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "package-sources") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/engines and GET /api/v1/engines/:engineId
    if (segments[2] === "engines" && segments.length === 3 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const engines = await api.listEngines();
      return { status: 200, body: ok(engines, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "engines" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const engineId = readPathSegment(segments, 3, "engineId");
      const engine = await api.getEngineDetail(engineId);
      return { status: 200, body: ok(engine, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "engines") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/models
    if (apiPath === "models" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const models = await api.listModels();
      return { status: 200, body: ok(models, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "models") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
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
      const enforcement = enforceTenantGovernanceMutation({
        context,
        auth: options.auth,
        correlationId: options.correlationId,
        operation: "agent.create",
        requirement: {
          governedAction: "agent.create",
          limitKey: "max_agents",
          requestedAmount: 1,
          usage: (await api.listAgents()).length,
        },
      });
      if (!enforcement.allowed) {
        return mapGovernanceEnforcementFailure(enforcement, options.correlationId, routeMeta);
      }
      const body = await readJsonBody(request);
      const input: AgentCreateInput = parseAgentCreateInput(body);
      const result = await api.createAgent(input);
      return { status: 201, body: ok(result, [], options.correlationId, routeMeta) };
    }

    // Other methods on the agents collection are not supported.
    if (segments[2] === "agents" && segments.length === 3) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET, POST");
    }

    // GET /api/v1/agents/:agentId/composition
    if (segments[2] === "agents" && segments[3] && segments[4] === "composition" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const composition = await api.getAgentComposition(agentId);
      if (!composition) {
        return fail(`agent not found: ${agentId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(composition, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "agents" && segments[3] && segments[4] === "composition" && segments.length === 5) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/agents/:agentId/composition/capabilities
    if (segments[2] === "agents" && segments[3] && segments[4] === "composition" && segments[5] === "capabilities" && segments.length === 6 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const capabilities = await api.getAgentEffectiveCapabilities(agentId);
      if (!capabilities) {
        return fail(`agent not found: ${agentId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(capabilities, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "agents" && segments[3] && segments[4] === "composition" && segments[5] === "capabilities" && segments.length === 6) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/agents/:agentId/composition/compatibility
    if (segments[2] === "agents" && segments[3] && segments[4] === "composition" && segments[5] === "compatibility" && segments.length === 6 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const compatibility = await api.getAgentCompositionCompatibility(agentId);
      if (!compatibility) {
        return fail(`agent not found: ${agentId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(compatibility, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "agents" && segments[3] && segments[4] === "composition" && segments[5] === "compatibility" && segments.length === 6) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // POST /api/v1/agents/:agentId/deploy
    if (segments[2] === "agents" && segments[3] && segments[4] === "deploy" && request.method === "POST") {
      const agentId = readPathSegment(segments, 3, "agentId");
      const body = readBodyRecord(await readJsonBody(request));
      const mode = typeof body.mode === "string" ? body.mode : "";

      if (!isDeploymentMode(mode)) {
        return fail(`invalid deploymentMode: ${mode}`, 400, "invalid_request", options.correlationId, undefined, routeMeta);
      }

      const requestData: DeploymentRequest = {
        agentId,
        revision: typeof body.revision === "number" ? body.revision : 1,
        composition: isPlainObject(body.composition) ? body.composition as Record<string, unknown> : {},
        deploymentMode: mode,
        targetId: typeof body.targetId === "string" ? body.targetId : "local",
      };

      const enforcement = enforceTenantGovernanceMutation({
        context,
        auth: options.auth,
        correlationId: options.correlationId,
        operation: "deployment.create",
        requirement: {
          governedAction: "deployment.create",
        },
      });
      if (!enforcement.allowed) {
        return mapGovernanceEnforcementFailure(enforcement, options.correlationId, routeMeta);
      }

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
      const enforcement = enforceTenantGovernanceMutation({
        context,
        auth: options.auth,
        correlationId: options.correlationId,
        operation: "agent.configure",
        requirement: {
          governedAction: "agent.configure",
        },
      });
      if (!enforcement.allowed) {
        return mapGovernanceEnforcementFailure(enforcement, options.correlationId, routeMeta);
      }
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
      const enforcement = enforceTenantGovernanceMutation({
        context,
        auth: options.auth,
        correlationId: options.correlationId,
        operation: "agent.configure",
        requirement: {
          governedAction: "agent.configure",
        },
      });
      if (!enforcement.allowed) {
        return mapGovernanceEnforcementFailure(enforcement, options.correlationId, routeMeta);
      }
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
      const enforcement = enforceTenantGovernanceMutation({
        context,
        auth: options.auth,
        correlationId: options.correlationId,
        operation: "agent.create",
        requirement: {
          governedAction: "agent.create",
          limitKey: "max_agents",
          requestedAmount: 1,
          usage: (await api.listAgents()).length,
        },
      });
      if (!enforcement.allowed) {
        return mapGovernanceEnforcementFailure(enforcement, options.correlationId, routeMeta);
      }
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
      const enforcement = enforceTenantGovernanceMutation({
        context,
        auth: options.auth,
        correlationId: options.correlationId,
        operation: "agent.configure",
        requirement: {
          governedAction: "agent.configure",
        },
      });
      if (!enforcement.allowed) {
        return mapGovernanceEnforcementFailure(enforcement, options.correlationId, routeMeta);
      }
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
      const enforcement = enforceTenantGovernanceMutation({
        context,
        auth: options.auth,
        correlationId: options.correlationId,
        operation: "agent.configure",
        requirement: {
          governedAction: "agent.configure",
        },
      });
      if (!enforcement.allowed) {
        return mapGovernanceEnforcementFailure(enforcement, options.correlationId, routeMeta);
      }
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
      const enforcement = enforceTenantGovernanceMutation({
        context,
        auth: options.auth,
        correlationId: options.correlationId,
        operation: "agent.configure",
        requirement: {
          governedAction: "agent.configure",
        },
      });
      if (!enforcement.allowed) {
        return mapGovernanceEnforcementFailure(enforcement, options.correlationId, routeMeta);
      }
      const body = await readJsonBody(request);
      const input: UpdateAgentInput = parseAgentUpdateInput(body, agentId);
      const result = await api.updateAgent(agentId, input);
      return { status: 200, body: ok(result, [], options.correlationId, routeMeta) };
    }

    // DELETE /api/v1/agents/:agentId (protected delete)
    if (segments[2] === "agents" && segments[3] && segments.length === 4 && request.method === "DELETE") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const enforcement = enforceTenantGovernanceMutation({
        context,
        auth: options.auth,
        correlationId: options.correlationId,
        operation: "agent.configure",
        requirement: {
          governedAction: "agent.configure",
        },
      });
      if (!enforcement.allowed) {
        return mapGovernanceEnforcementFailure(enforcement, options.correlationId, routeMeta);
      }
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

    // GET /api/v1/providers and GET /api/v1/providers/:providerId
    if (apiPath === "providers" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const providers = await api.listProviders();
      return { status: 200, body: ok(providers, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "providers" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const providerId = readPathSegment(segments, 3, "providerId");
      const provider = await api.getProviderDetail(providerId);
      return { status: 200, body: ok(provider, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "providers") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/credentials and GET /api/v1/credentials/:credentialId
    if (segments[2] === "credentials" && segments.length === 3 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const credentials = await api.listCredentials();
      return { status: 200, body: ok(credentials, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "credentials" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const credentialId = readPathSegment(segments, 3, "credentialId");
      const credential = await api.getCredentialDetail(credentialId);
      if (!credential) {
        return fail(`credential not found: ${credentialId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(credential, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "credentials") {
      return unsupportedExecutionMutation(options.correlationId, routeMeta, segments.join("/"));
    }

    // GET /api/v1/provider-connections and GET /api/v1/provider-connections/:connectionId
    if (apiPath === "provider-connections" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const connections = await api.listProviderConnections();
      return { status: 200, body: ok(connections, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "provider-connections" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const connectionId = readPathSegment(segments, 3, "connectionId");
      const connection = await api.getProviderConnectionDetail(connectionId);
      if (!connection) {
        return fail(`provider connection not found: ${connectionId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(connection, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "provider-connections") {
      return unsupportedExecutionMutation(options.correlationId, routeMeta, segments.join("/"));
    }

    // GET /api/v1/agents/:agentId/readiness
    if (segments[2] === "agents" && segments[3] && segments[4] === "readiness" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const readiness = await api.getAgentReadiness(agentId);
      if (!readiness) {
        return fail(`agent not found: ${agentId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(readiness, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "agents" && segments[3] && segments[4] === "readiness" && segments.length === 5) {
      return unsupportedExecutionMutation(options.correlationId, routeMeta, segments.join("/"));
    }

    // GET /api/v1/agents/:agentId/deployment-plan and /execution-plan
    if (segments[2] === "agents" && segments[3] && (segments[4] === "deployment-plan" || segments[4] === "execution-plan") && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const plan = segments[4] === "deployment-plan" ? await api.getAgentDeploymentPlan(agentId) : await api.getAgentExecutionPlan(agentId);
      if (!plan) {
        return fail(`agent not found: ${agentId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(plan, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "agents" && segments[3] && (segments[4] === "deployment-plan" || segments[4] === "execution-plan") && segments.length === 5) {
      return unsupportedExecutionMutation(options.correlationId, routeMeta, segments.join("/"));
    }
    if (segments[2] === "agents" && segments[3] && segments[4] === "deploy" && segments.length === 5) {
      return unsupportedExecutionMutation(options.correlationId, routeMeta, segments.join("/"));
    }
    if (apiPath === "deployment-plans" && request.method === "GET") {
      return fail("deployment plan lookup requires an agent-scoped route in this milestone", 404, "not_found", options.correlationId, undefined, routeMeta);
    }
    if (segments[2] === "deployment-plans" && segments.length === 4 && request.method === "GET") {
      return fail("deployment plan lookup requires an agent-scoped route in this milestone", 404, "not_found", options.correlationId, undefined, routeMeta);
    }
    if (segments[2] === "deployment-plans") {
      return unsupportedExecutionMutation(options.correlationId, routeMeta, segments.join("/"));
    }

    // GET /api/v1/deployments and GET /api/v1/deployments/:deploymentId
    if (apiPath === "deployments" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const deployments = await api.listDeploymentSummaries();
      return { status: 200, body: ok(deployments, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "deployments" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const deploymentId = readPathSegment(segments, 3, "deploymentId");
      const deployment = await api.getDeploymentSummary(deploymentId);
      if (!deployment) {
        return fail(`deployment not found: ${deploymentId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(deployment, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "deployments") {
      return unsupportedExecutionMutation(options.correlationId, routeMeta, segments.join("/"));
    }

    // GET /api/v1/runtimes and GET /api/v1/runtimes/:runtimeId
    if (apiPath === "runtimes" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const runtimes = await api.listRuntimeSummaries();
      return { status: 200, body: ok(runtimes, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "runtimes" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const runtimeId = readPathSegment(segments, 3, "runtimeId");
      const runtime = await api.getRuntimeSummary(runtimeId);
      if (!runtime) {
        return fail(`runtime not found: ${runtimeId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(runtime, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "runtimes" && segments.length === 4) {
      return unsupportedExecutionMutation(options.correlationId, routeMeta, segments.join("/"));
    }
    if (segments[2] === "runtimes" && segments[3] && ["start", "stop", "restart"].includes(segments[4] ?? "") && segments.length === 5) {
      return unsupportedExecutionMutation(options.correlationId, routeMeta, segments.join("/"));
    }

    // GET /api/v1/execution-runs and GET /api/v1/execution-runs/:runId
    if (apiPath === "execution-runs" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const runs = await api.listExecutionRunSummaries();
      return { status: 200, body: ok(runs, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "execution-runs" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const runId = readPathSegment(segments, 3, "runId");
      const run = await api.getExecutionRunSummary(runId);
      if (!run) {
        return fail(`execution run not found: ${runId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(run, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "execution-runs") {
      return unsupportedExecutionMutation(options.correlationId, routeMeta, segments.join("/"));
    }

    // GET /api/v1/agents/:agentId/execution-runs
    if (segments[2] === "agents" && segments[3] && segments[4] === "execution-runs" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const runs = await api.listAgentExecutionRunSummaries(agentId);
      return { status: 200, body: ok(runs, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "agents" && segments[3] && segments[4] === "execution-runs" && segments.length === 5) {
      return unsupportedExecutionMutation(options.correlationId, routeMeta, segments.join("/"));
    }

    // GET /api/v1/workers and GET /api/v1/workers/:workerId
    if (apiPath === "workers" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const workers = await api.listWorkerSummaries();
      return { status: 200, body: ok(workers, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "workers" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const workerId = readPathSegment(segments, 3, "workerId");
      const worker = await api.getWorkerSummary(workerId);
      if (!worker) {
        return fail(`worker not found: ${workerId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(worker, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "workers" && segments[3] && segments[4] === "workloads" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const workerId = readPathSegment(segments, 3, "workerId");
      const workloads = await api.listWorkerWorkloads(workerId);
      return { status: 200, body: ok(workloads, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "workers" && segments.length === 4) {
      return unsupportedExecutionMutation(options.correlationId, routeMeta, segments.join("/"));
    }
    if (segments[2] === "workers" && segments[3] && segments[4] === "workloads" && segments.length === 5) {
      return unsupportedExecutionMutation(options.correlationId, routeMeta, segments.join("/"));
    }

    // Unsupported governed mutations
    if (
      (segments[2] === "credentials" && segments.length >= 4 && request.method !== "GET")
      || (segments[2] === "provider-connections" && segments.length >= 4 && request.method !== "GET")
      || (segments[2] === "agents" && segments[4] && ["readiness", "deployment-plan", "execution-plan", "deployments", "execution-runs"].includes(segments[4]) && request.method !== "GET")
      || (segments[2] === "deployments" && request.method !== "GET")
      || (segments[2] === "runtimes" && request.method !== "GET")
      || (segments[2] === "execution-runs" && request.method !== "GET")
      || (segments[2] === "workers" && request.method !== "GET")
    ) {
      return unsupportedExecutionMutation(options.correlationId, routeMeta, segments.join("/"));
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
      const body = readBodyRecord(await readJsonBody(request));
      const requestData = {
        deploymentId: typeof body.deploymentId === "string" ? body.deploymentId : "",
        runtimeInstanceId,
        deploymentMode: "sandbox",
        ...(typeof body.agentId === "string" && body.agentId ? { agentId: body.agentId } : {}),
        ...(typeof body.targetId === "string" && body.targetId ? { targetId: body.targetId } : {}),
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

    // ---- Milestone E: Operational Evidence & Economics ----

    // GET /api/v1/events
    if (apiPath === "events" && request.method === "GET") {
      assertAllowedQueryParams(url, ["agentId", "deploymentId", "runtimeId", "executionRunId", "correlationId", "severity", "limit"]);
      const rawEvQuery = buildEvidenceQuery(url);
      const eventsQuery: { agentId?: string; deploymentId?: string; runtimeId?: string; executionRunId?: string; correlationId?: string; severity?: EventSeverity; limit?: number } = {
        ...(rawEvQuery.agentId ? { agentId: rawEvQuery.agentId } : {}),
        ...(rawEvQuery.deploymentId ? { deploymentId: rawEvQuery.deploymentId } : {}),
        ...(rawEvQuery.runtimeId ? { runtimeId: rawEvQuery.runtimeId } : {}),
        ...(rawEvQuery.executionRunId ? { executionRunId: rawEvQuery.executionRunId } : {}),
        ...(rawEvQuery.correlationId ? { correlationId: rawEvQuery.correlationId } : {}),
        ...(rawEvQuery.severity ? { severity: rawEvQuery.severity as EventSeverity } : {}),
        ...(rawEvQuery.limit ? { limit: rawEvQuery.limit } : {}),
      };
      const events = await api.listEvents(eventsQuery);
      return { status: 200, body: ok(events, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "events") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/events/:eventId
    if (segments[2] === "events" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const eventId = readPathSegment(segments, 3, "eventId");
      const event = await api.getEventDetail(eventId);
      if (!event) {
        return fail(`event not found: ${eventId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(event, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "events" && segments.length === 4) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/logs and GET /api/v1/logs/:logId
    if (apiPath === "logs" && request.method === "GET") {
      assertAllowedQueryParams(url, ["agentId", "deploymentId", "runtimeId", "executionRunId", "correlationId", "severity", "limit"]);
      const result = await api.listLogs({});
      return { status: 200, body: ok(result, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "logs" && segments.length === 4 && request.method === "GET") {
      const logId = readPathSegment(segments, 3, "logId");
      const availability = await api.getLogAvailability();
      return { status: 200, body: ok(availability, [], options.correlationId, routeMeta) };
    }

    // GET /api/v1/audit (operational audit trail)
    if (apiPath === "audit" && request.method === "GET") {
      assertAllowedQueryParams(url, ["agentId", "deploymentId", "runtimeId", "executionRunId", "correlationId", "limit"]);
      const query = buildAuditQuery(url);
      const entries = await api.listAuditEntries(query);
      return { status: 200, body: ok(entries, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "audit/:auditId" && request.method === "GET") {
      const auditId = readPathSegment(segments, 3, "auditId");
      const entry = await api.getAuditEntry(auditId);
      if (!entry) {
        return fail(`audit entry not found: ${auditId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(entry, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "audit") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // Entity-scoped events and audit
    if (segments[2] === "agents" && segments[3] && segments[4] === "events" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, ["correlationId", "severity", "limit"]);
      const agentId = readPathSegment(segments, 3, "agentId");
      const query = buildEvidenceQuery(url, agentId);
      const events = await api.listAgentEvents(agentId);
      return { status: 200, body: ok(events, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "agents" && segments[3] && segments[4] === "audit" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, ["correlationId", "limit"]);
      const agentId = readPathSegment(segments, 3, "agentId");
      const entries = await api.listAgentAudit(agentId);
      return { status: 200, body: ok(entries, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "deployments" && segments[3] && segments[4] === "events" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, ["correlationId", "severity", "limit"]);
      const deploymentId = readPathSegment(segments, 3, "deploymentId");
      const events = await api.listDeploymentEvents(deploymentId);
      return { status: 200, body: ok(events, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "deployments" && segments[3] && segments[4] === "audit" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, ["correlationId", "limit"]);
      const deploymentId = readPathSegment(segments, 3, "deploymentId");
      const entries = await api.listDeploymentAudit(deploymentId);
      return { status: 200, body: ok(entries, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "runtimes" && segments[3] && segments[4] === "events" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, ["correlationId", "severity", "limit"]);
      const runtimeId = readPathSegment(segments, 3, "runtimeId");
      const events = await api.listRuntimeEvents(runtimeId);
      return { status: 200, body: ok(events, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "runtimes" && segments[3] && segments[4] === "audit" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, ["correlationId", "limit"]);
      const runtimeId = readPathSegment(segments, 3, "runtimeId");
      const entries = await api.listRuntimeAudit(runtimeId);
      return { status: 200, body: ok(entries, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "workers" && segments[3] && segments[4] === "events" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, ["correlationId", "severity", "limit"]);
      const workerId = readPathSegment(segments, 3, "workerId");
      const events = await api.listWorkerEvents(workerId);
      return { status: 200, body: ok(events, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "workers" && segments[3] && segments[4] === "audit" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, ["correlationId", "limit"]);
      const workerId = readPathSegment(segments, 3, "workerId");
      const entries = await api.listWorkerAudit(workerId);
      return { status: 200, body: ok(entries, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "execution-runs" && segments[3] && segments[4] === "events" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, ["correlationId", "severity", "limit"]);
      const runId = readPathSegment(segments, 3, "runId");
      const events = await api.listExecutionRunEvents(runId);
      return { status: 200, body: ok(events, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "execution-runs" && segments[3] && segments[4] === "audit" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, ["correlationId", "limit"]);
      const runId = readPathSegment(segments, 3, "runId");
      const entries = await api.listExecutionRunAudit(runId);
      return { status: 200, body: ok(entries, [], options.correlationId, routeMeta) };
    }

    // GET /api/v1/evidence and GET /api/v1/evidence/:evidenceId
    if (apiPath === "evidence" && request.method === "GET") {
      assertAllowedQueryParams(url, ["agentId", "deploymentId", "runtimeId", "executionRunId", "correlationId", "kind", "limit"]);
      const rawQuery = buildEvidenceQuery(url);
      const query: { agentId?: string; deploymentId?: string; runtimeId?: string; executionRunId?: string; correlationId?: string; limit?: number } = {
        ...(rawQuery.agentId ? { agentId: rawQuery.agentId } : {}),
        ...(rawQuery.deploymentId ? { deploymentId: rawQuery.deploymentId } : {}),
        ...(rawQuery.runtimeId ? { runtimeId: rawQuery.runtimeId } : {}),
        ...(rawQuery.executionRunId ? { executionRunId: rawQuery.executionRunId } : {}),
        ...(rawQuery.correlationId ? { correlationId: rawQuery.correlationId } : {}),
        ...(rawQuery.limit ? { limit: rawQuery.limit } : {}),
      };
      const evidence = await api.listEvidence(query);
      return { status: 200, body: ok(evidence, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "evidence" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const evidenceId = readPathSegment(segments, 3, "evidenceId");
      const record = await api.getEvidenceDetail(evidenceId);
      if (!record) {
        return fail(`evidence not found: ${evidenceId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(record, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "evidence") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/diagnostics and GET /api/v1/diagnostics/:diagnosticId
    if (apiPath === "diagnostics" && request.method === "GET") {
      assertAllowedQueryParams(url, ["agentId", "deploymentId", "runtimeId", "executionRunId", "correlationId", "limit"]);
      const rawDiagQuery = buildEvidenceQuery(url);
      const diagnosticsQuery: { agentId?: string; deploymentId?: string; runtimeId?: string; executionRunId?: string; correlationId?: string; kind?: never; limit?: number } = {
        ...(rawDiagQuery.agentId ? { agentId: rawDiagQuery.agentId } : {}),
        ...(rawDiagQuery.deploymentId ? { deploymentId: rawDiagQuery.deploymentId } : {}),
        ...(rawDiagQuery.runtimeId ? { runtimeId: rawDiagQuery.runtimeId } : {}),
        ...(rawDiagQuery.executionRunId ? { executionRunId: rawDiagQuery.executionRunId } : {}),
        ...(rawDiagQuery.correlationId ? { correlationId: rawDiagQuery.correlationId } : {}),
        ...(rawDiagQuery.limit ? { limit: rawDiagQuery.limit } : {}),
      };
      const diagnostics = await api.listDiagnostics(diagnosticsQuery);
      return { status: 200, body: ok(diagnostics, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "diagnostics" && segments.length === 4 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const diagnosticId = readPathSegment(segments, 3, "diagnosticId");
      const report = await api.getDiagnosticDetail(diagnosticId);
      if (!report) {
        return fail(`diagnostic not found: ${diagnosticId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(report, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "diagnostics") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/readiness/evidence
    if (apiPath === "readiness/evidence" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const evidence = await api.listReadinessEvidence();
      return { status: 200, body: ok(evidence, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "readiness/evidence") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // Entity-scoped evidence
    if (segments[2] === "agents" && segments[3] && segments[4] === "evidence" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const evidence = await api.listAgentEvidence(agentId);
      return { status: 200, body: ok(evidence, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "deployments" && segments[3] && segments[4] === "evidence" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const deploymentId = readPathSegment(segments, 3, "deploymentId");
      const evidence = await api.listDeploymentEvidence(deploymentId);
      return { status: 200, body: ok(evidence, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "runtimes" && segments[3] && segments[4] === "evidence" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const runtimeId = readPathSegment(segments, 3, "runtimeId");
      const evidence = await api.listRuntimeEvidence(runtimeId);
      return { status: 200, body: ok(evidence, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "workers" && segments[3] && segments[4] === "evidence" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const workerId = readPathSegment(segments, 3, "workerId");
      const evidence = await api.listWorkerEvidence(workerId);
      return { status: 200, body: ok(evidence, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "execution-runs" && segments[3] && segments[4] === "evidence" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const runId = readPathSegment(segments, 3, "runId");
      const evidence = await api.listExecutionRunEvidence(runId);
      return { status: 200, body: ok(evidence, [], options.correlationId, routeMeta) };
    }

    // GET /api/v1/economics and GET /api/v1/economics/summary
    if ((apiPath === "economics" || apiPath === "economics/summary") && request.method === "GET") {
      assertAllowedQueryParams(url, ["agentId", "deploymentId", "runtimeId", "executionRunId", "limit"]);
      const query = buildEconomicQuery(url);
      const summary = await api.getEconomicSummary(query);
      return { status: 200, body: ok(summary, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "economics" || apiPath === "economics/summary") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // Entity-scoped economics
    if (segments[2] === "agents" && segments[3] && segments[4] === "economics" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const summary = await api.getAgentEconomics(agentId);
      return { status: 200, body: ok(summary, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "deployments" && segments[3] && segments[4] === "economics" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const deploymentId = readPathSegment(segments, 3, "deploymentId");
      const summary = await api.getDeploymentEconomics(deploymentId);
      return { status: 200, body: ok(summary, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "runtimes" && segments[3] && segments[4] === "economics" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const runtimeId = readPathSegment(segments, 3, "runtimeId");
      const summary = await api.getRuntimeEconomics(runtimeId);
      return { status: 200, body: ok(summary, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "execution-runs" && segments[3] && segments[4] === "economics" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const runId = readPathSegment(segments, 3, "runId");
      const summary = await api.getExecutionRunEconomics(runId);
      return { status: 200, body: ok(summary, [], options.correlationId, routeMeta) };
    }

    // GET /api/v1/economics/quotes and GET /api/v1/economics/quotes/:quoteId
    if (apiPath === "economics/quotes" && request.method === "GET") {
      assertAllowedQueryParams(url, ["agentId", "executionRunId", "limit"]);
      const query: { agentId?: string; executionRunId?: string; limit?: number } = {};
      const agentIdParam = url.searchParams.get("agentId");
      if (agentIdParam) query.agentId = agentIdParam;
      const runIdParam = url.searchParams.get("executionRunId");
      if (runIdParam) query.executionRunId = runIdParam;
      const limitParam = url.searchParams.get("limit");
      if (limitParam) query.limit = parseInt(limitParam, 10);
      const quotes = await api.listQuotes(query);
      return { status: 200, body: ok(quotes, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "economics" && segments[3] === "quotes" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const quoteId = readPathSegment(segments, 4, "quoteId");
      const quote = await api.getQuoteDetail(quoteId);
      if (!quote) {
        return fail(`quote not found: ${quoteId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(quote, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "economics" && segments[3] === "quotes" && segments.length === 5) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }
    if (apiPath === "economics/quotes") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/economics/reservations and GET /api/v1/economics/reservations/:reservationId
    if (apiPath === "economics/reservations" && request.method === "GET") {
      assertAllowedQueryParams(url, ["agentId", "executionRunId", "limit"]);
      const query: { agentId?: string; executionRunId?: string; limit?: number } = {};
      const agentIdParam = url.searchParams.get("agentId");
      if (agentIdParam) query.agentId = agentIdParam;
      const runIdParam = url.searchParams.get("executionRunId");
      if (runIdParam) query.executionRunId = runIdParam;
      const limitParam = url.searchParams.get("limit");
      if (limitParam) query.limit = parseInt(limitParam, 10);
      const reservations = await api.listReservations(query);
      return { status: 200, body: ok(reservations, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "economics" && segments[3] === "reservations" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const reservationId = readPathSegment(segments, 4, "reservationId");
      const reservation = await api.getReservationDetail(reservationId);
      if (!reservation) {
        return fail(`reservation not found: ${reservationId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(reservation, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "economics" && segments[3] === "reservations" && segments.length === 5) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }
    if (apiPath === "economics/reservations") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // Entity-scoped quotes
    if (segments[2] === "agents" && segments[3] && segments[4] === "economics" && segments[5] === "quotes" && segments.length === 6 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const agentId = readPathSegment(segments, 3, "agentId");
      const quotes = await api.listAgentQuotes(agentId);
      return { status: 200, body: ok(quotes, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "execution-runs" && segments[3] && segments[4] === "economics" && segments[5] === "reservation" && segments.length === 6 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const runId = readPathSegment(segments, 3, "runId");
      const reservation = await api.getExecutionRunReservation(runId);
      if (!reservation) {
        return fail(`no reservation found for execution run: ${runId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(reservation, [], options.correlationId, routeMeta) };
    }

    // Economic mutation actions (governed — return 405 if unsupported)
    if (segments[2] === "agents" && segments[3] && segments[4] === "economics" && segments[5] === "quote" && segments.length === 6 && request.method === "POST") {
      return unsupportedEconomicMutation(options.correlationId, routeMeta, "quote");
    }
    if (segments[2] === "economics" && segments[3] === "quotes" && segments[4] && segments[5] === "reserve" && segments.length === 6 && request.method === "POST") {
      return unsupportedEconomicMutation(options.correlationId, routeMeta, "reserve");
    }
    if (segments[2] === "economics" && segments[3] === "reservations" && segments[4] && segments[5] === "cancel" && segments.length === 6 && request.method === "POST") {
      return unsupportedEconomicMutation(options.correlationId, routeMeta, "cancel");
    }

    // GET /api/v1/economics/metering and GET /api/v1/economics/metering/:meterId
    if (apiPath === "economics/metering" && request.method === "GET") {
      assertAllowedQueryParams(url, ["agentId", "deploymentId", "runtimeId", "executionRunId", "limit"]);
      const query = buildMeteringQuery(url);
      const records = await api.listMeteringRecords(query);
      return { status: 200, body: ok(records, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "economics" && segments[3] === "metering" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const meterId = readPathSegment(segments, 4, "meterId");
      const record = await api.getMeteringRecord(meterId);
      if (!record) {
        return fail(`metering record not found: ${meterId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(record, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "economics" && segments[3] === "metering" && segments.length === 5) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }
    if (apiPath === "economics/metering") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/economics/settlements and GET /api/v1/economics/settlements/:settlementId
    if (apiPath === "economics/settlements" && request.method === "GET") {
      assertAllowedQueryParams(url, ["settlementId", "meterId", "executionRunId", "limit"]);
      const query: { settlementId?: string; meterId?: string; executionRunId?: string; limit?: number } = {};
      const settlementIdParam = url.searchParams.get("settlementId");
      if (settlementIdParam) query.settlementId = settlementIdParam;
      const meterIdParam = url.searchParams.get("meterId");
      if (meterIdParam) query.meterId = meterIdParam;
      const runIdParam = url.searchParams.get("executionRunId");
      if (runIdParam) query.executionRunId = runIdParam;
      const limitParam = url.searchParams.get("limit");
      if (limitParam) query.limit = parseInt(limitParam, 10);
      const settlements = await api.listSettlements(query);
      return { status: 200, body: ok(settlements, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "economics" && segments[3] === "settlements" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const settlementId = readPathSegment(segments, 4, "settlementId");
      const settlement = await api.getSettlementDetail(settlementId);
      if (!settlement) {
        return fail(`settlement not found: ${settlementId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(settlement, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "economics" && segments[3] === "settlements" && segments.length === 5) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }
    if (apiPath === "economics/settlements") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // GET /api/v1/economics/receipts and GET /api/v1/economics/receipts/:receiptId
    if (apiPath === "economics/receipts" && request.method === "GET") {
      assertAllowedQueryParams(url, ["settlementId", "executionRunId", "limit"]);
      const query: { settlementId?: string; executionRunId?: string; limit?: number } = {};
      const settlementIdParam = url.searchParams.get("settlementId");
      if (settlementIdParam) query.settlementId = settlementIdParam;
      const runIdParam = url.searchParams.get("executionRunId");
      if (runIdParam) query.executionRunId = runIdParam;
      const limitParam = url.searchParams.get("limit");
      if (limitParam) query.limit = parseInt(limitParam, 10);
      const receipts = await api.listReceipts(query);
      return { status: 200, body: ok(receipts, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "economics" && segments[3] === "receipts" && segments.length === 5 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const receiptId = readPathSegment(segments, 4, "receiptId");
      const receipt = await api.getReceiptDetail(receiptId);
      if (!receipt) {
        return fail(`receipt not found: ${receiptId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(receipt, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "economics" && segments[3] === "receipts" && segments.length === 5) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }
    if (apiPath === "economics/receipts") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // Entity-scoped metering and settlement
    if (segments[2] === "execution-runs" && segments[3] && segments[4] === "economics" && segments[5] === "metering" && segments.length === 6 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const runId = readPathSegment(segments, 3, "runId");
      const records = await api.getExecutionRunMetering(runId);
      return { status: 200, body: ok(records, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "execution-runs" && segments[3] && segments[4] === "economics" && segments[5] === "settlement" && segments.length === 6 && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const runId = readPathSegment(segments, 3, "runId");
      const settlement = await api.getExecutionRunSettlement(runId);
      if (!settlement) {
        return fail(`settlement not found for execution run: ${runId}`, 404, "not_found", options.correlationId, undefined, routeMeta);
      }
      return { status: 200, body: ok(settlement, [], options.correlationId, routeMeta) };
    }

    // Economic mutation: settle metering record (governed — return 405 if unsupported)
    if (segments[2] === "economics" && segments[3] === "metering" && segments[4] && segments[5] === "settle" && segments.length === 6 && request.method === "POST") {
      return unsupportedEconomicMutation(options.correlationId, routeMeta, "settle");
    }

    // GET /api/v1/economics/audit
    if (apiPath === "economics/audit" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const entries = await api.listEconomicAudit();
      return { status: 200, body: ok(entries, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "economics/audit") {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    // ---- Milestone F: Governance / System boundary (read-only) ----
    //
    // These projections expose guardrails, policy visibility, configuration
    // visibility, administration/tenants boundaries and the EPIC-11
    // acceptance report. They are read-only: they never mutate state and they
    // never claim production readiness.
    if (apiPath === "system/guardrails" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const view = await api.getSystemGuardrails();
      return { status: 200, body: ok(view, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "system/configuration" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const view = await api.getSystemConfiguration();
      return { status: 200, body: ok(view, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "system/policies" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const view = await api.getSystemPolicies();
      return { status: 200, body: ok(view, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "system/administration" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const view = await api.getSystemAdministration();
      return { status: 200, body: ok(view, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "system/tenants" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const view = await api.getSystemTenants();
      return { status: 200, body: ok(view, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "system/acceptance" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const report = await api.getEpic11AcceptanceReport();
      return { status: 200, body: ok(report, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "system/production-readiness" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const report = await api.getProductionReadinessReport();
      return { status: 200, body: ok(report, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "system/governance-boundary" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const report = await api.getGovernanceBoundaryReport();
      return { status: 200, body: ok(report, [], options.correlationId, routeMeta) };
    }
    if (apiPath === "system/operational-reliability" && request.method === "GET") {
     assertAllowedQueryParams(url, []);
     const report = await api.getOperationalReliabilityReport();
     return { status: 200, body: ok(report, [], options.correlationId, routeMeta) };
   }
    if (apiPath === "system/observability" && request.method === "GET") {
      assertAllowedQueryParams(url, []);
      const report = await api.getObservabilityReport();
      return { status: 200, body: ok(report, [], options.correlationId, routeMeta) };
    }
    if (segments[2] === "system" && segments[3]) {
      return methodNotAllowed(options.correlationId, routeMeta, "GET");
    }

    return fail("route not found", 404, "not_found", options.correlationId, undefined, routeMeta);
  } catch (error) {
    return mapDomainErrorToHttp(error, options.correlationId, routeMeta);
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
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
    "method_not_allowed",
    { retryable: false, severity: "warning" },
  );
}

function unsupportedCompositionMutation(correlationId: string | undefined, meta: AcsHttpEnvelopeMeta, path: string) {
  return fail(
    `${path} is not supported in this milestone; composition mutations are governed by the Product API`,
    405,
    "unsupported_action",
    correlationId,
    { path, guidance: "Unsupported / Governed by Product API / Coming later" },
    meta,
    "unsupported_action",
    { retryable: false, severity: "warning", guardrails: ["read_only", "governed_by_product_api"] },
  );
}

function unsupportedExecutionMutation(correlationId: string | undefined, meta: AcsHttpEnvelopeMeta, path: string) {
  return fail(
    `${path} is not supported in this milestone; operational execution mutations are governed by the Product API`,
    405,
    "unsupported_action",
    correlationId,
    { path, guidance: "Unsupported / Governed by Product API / Coming later" },
    meta,
    "unsupported_action",
    { retryable: false, severity: "warning", guardrails: ["read_only", "governed_by_product_api"] },
  );
}

function unsupportedEconomicMutation(correlationId: string | undefined, meta: AcsHttpEnvelopeMeta, action: string) {
  return fail(
    `Economic ${action} is not supported in this milestone; governed by Product API`,
    405,
    "unsupported_action",
    correlationId,
    { action, guidance: "Unsupported / Governed by Product API / Economics is operational, not billing" },
    meta,
    "unsupported_action",
    { retryable: false, severity: "warning", guardrails: ["not_billing", "governed_by_product_api"] },
  );
}

function buildEvidenceQuery(url: URL, agentId?: string) {
  const query: {
    agentId?: string;
    deploymentId?: string;
    runtimeId?: string;
    executionRunId?: string;
    correlationId?: string;
    severity?: string;
    limit?: number;
  } = { ...(agentId ? { agentId } : {}) };
  const p = url.searchParams;
  if (p.has("deploymentId")) query.deploymentId = p.get("deploymentId")!;
  if (p.has("runtimeId")) query.runtimeId = p.get("runtimeId")!;
  if (p.has("executionRunId")) query.executionRunId = p.get("executionRunId")!;
  if (p.has("correlationId")) query.correlationId = p.get("correlationId")!;
  if (p.has("severity")) query.severity = p.get("severity")!;
  if (p.has("limit")) query.limit = parseInt(p.get("limit")!, 10);
  return query;
}

function buildAuditQuery(url: URL) {
  const query: {
    agentId?: string;
    deploymentId?: string;
    runtimeId?: string;
    executionRunId?: string;
    correlationId?: string;
    limit?: number;
  } = {};
  const p = url.searchParams;
  if (p.has("agentId")) query.agentId = p.get("agentId")!;
  if (p.has("deploymentId")) query.deploymentId = p.get("deploymentId")!;
  if (p.has("runtimeId")) query.runtimeId = p.get("runtimeId")!;
  if (p.has("executionRunId")) query.executionRunId = p.get("executionRunId")!;
  if (p.has("correlationId")) query.correlationId = p.get("correlationId")!;
  if (p.has("limit")) query.limit = parseInt(p.get("limit")!, 10);
  return query;
}

function buildEconomicQuery(url: URL) {
  const query: {
    agentId?: string;
    deploymentId?: string;
    runtimeId?: string;
    executionRunId?: string;
    limit?: number;
  } = {};
  const p = url.searchParams;
  if (p.has("agentId")) query.agentId = p.get("agentId")!;
  if (p.has("deploymentId")) query.deploymentId = p.get("deploymentId")!;
  if (p.has("runtimeId")) query.runtimeId = p.get("runtimeId")!;
  if (p.has("executionRunId")) query.executionRunId = p.get("executionRunId")!;
  if (p.has("limit")) query.limit = parseInt(p.get("limit")!, 10);
  return query;
}

function buildMeteringQuery(url: URL) {
  return buildEconomicQuery(url);
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

function mapGovernanceEnforcementFailure(
  decision: {
    readonly allowed: boolean;
    readonly deniedLayer?: string;
    readonly reason: string;
  },
  correlationId: string | undefined,
  meta: AcsHttpEnvelopeMeta,
) {
  switch (decision.deniedLayer) {
    case "authority":
      return fail(decision.reason, 403, "forbidden", correlationId, { enforcement: decision }, meta, "blocked_by_authority", {
        retryable: false,
        severity: "warning",
        guardrails: ["tenant_governance_enforcement"],
      });
    case "governance":
      return fail(decision.reason, 403, "policy_rejected", correlationId, { enforcement: decision }, meta, "blocked_by_governance", {
        retryable: false,
        severity: "warning",
        guardrails: ["tenant_governance_enforcement"],
      });
    case "entitlement":
      return fail(decision.reason, 403, "entitlement_required", correlationId, { enforcement: decision }, meta, "blocked_by_entitlement", {
        retryable: false,
        severity: "warning",
        guardrails: ["tenant_governance_enforcement"],
      });
    case "limit":
      return fail(decision.reason, 429, "limit_exceeded", correlationId, { enforcement: decision }, meta, "blocked_by_limit", {
        retryable: false,
        severity: "warning",
        guardrails: ["tenant_governance_enforcement"],
      });
    case "system_hard_limit":
      return fail(decision.reason, 429, "limit_exceeded", correlationId, { enforcement: decision }, meta, "blocked_by_system_limit", {
        retryable: false,
        severity: "warning",
        guardrails: ["tenant_governance_enforcement"],
      });
    case "tenant_state":
      return fail(decision.reason, 409, "conflict", correlationId, { enforcement: decision }, meta, "tenant_state_blocked", {
        retryable: false,
        severity: "warning",
        guardrails: ["tenant_governance_enforcement"],
      });
    case "invalid_request":
      return fail(decision.reason, 400, "invalid_request", correlationId, { enforcement: decision }, meta, "invalid_request", {
        retryable: false,
        severity: "error",
      });
    case "infrastructure":
    default:
      return fail(decision.reason, 500, "internal_error", correlationId, { enforcement: decision }, meta, "runtime_failure", {
        retryable: true,
        severity: "error",
      });
  }
}

function mapDomainErrorToHttp(error: unknown, correlationId: string | undefined, meta: AcsHttpEnvelopeMeta) {
  if (error instanceof NotFoundError) {
    return fail(
      error.message,
      404,
      "not_found",
      correlationId,
      { kind: error.kind, id: error.id },
      meta,
      "not_found",
      { entityRefs: [toEntityRef(error.kind, error.id)], retryable: false, severity: "error" },
    );
  }
  if (error instanceof DuplicateRegistrationError) {
    return fail(error.message, 409, "conflict", correlationId, undefined, meta, "conflict", {
      retryable: false,
      severity: "error",
    });
  }
  if (error instanceof AgentRevisionConflictError) {
    return fail(error.message, 409, "conflict", correlationId, undefined, meta, "stale_revision", {
      retryable: true,
      severity: "warning",
      guardrails: ["refresh_before_retry"],
    });
  }
  if (error instanceof AgentLifecycleGuardError) {
    const reason = typeof error.details.reason === "string" ? error.details.reason : "blocked_by_lifecycle";
    return fail(error.message, 409, "agent_lifecycle_guard", correlationId, error.details, meta, reason, {
      retryable: false,
      severity: "warning",
      guardrails: ["blocked_with_reason"],
    });
  }
  if (error instanceof EngineSandboxOnlyError) {
    return fail(error.message, 403, "forbidden", correlationId, error.details, meta, "blocked_by_sandbox", {
      retryable: false,
      severity: "warning",
      guardrails: ["sandbox_only"],
    });
  }
  if (error instanceof AcsHttpValidationError) {
    return fail(error.message, 400, error.code, correlationId, error.details, meta, "validation_error", {
      retryable: false,
      severity: "error",
    });
  }
  if (error instanceof PolicyRejectedError) {
    return fail(error.message, 403, "policy_rejected", correlationId, undefined, meta, "blocked_by_policy", {
      retryable: false,
      severity: "warning",
      guardrails: ["governance"],
    });
  }
  if (error instanceof Error) {
    return fail(error.message, 500, "internal_error", correlationId, undefined, meta, "runtime_failure", {
      retryable: true,
      severity: "error",
    });
  }
  return fail("unknown product API error", 500, "internal_error", correlationId, undefined, meta, "runtime_failure", {
    retryable: true,
    severity: "error",
  });
}
