import type { IncomingMessage } from "node:http";
import { AcsError } from "../../errors.js";
import type { GovernedAction, TenantGovernanceRule } from "../../control-plane/tenant-governance.js";
import { projectAdministrativeAuditEntries, projectAdministrativeAuditEntry, type TenantAdministrativeAuditFilter } from "../../control-plane/tenant-audit.js";
import { fail, ok, type AcsHttpEnvelopeMeta } from "../responses.js";
import { AcsHttpValidationError, assertAllowedQueryParams, assertSafeIdentifier, readPathSegment } from "../validation.js";
import type { AcsRouteOptions } from "./acs-routes.js";
import type { ControlPlaneContext } from "../control-plane-context.js";

type Authority =
  | { readonly kind: "platform_admin"; readonly principalId: string }
  | { readonly kind: "tenant_member"; readonly principalId: string; readonly tenantId: string };

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    request.on("data", (chunk) => {
      data += chunk;
    });
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

export async function routeTenantAdministrationRequest(
  request: IncomingMessage,
  url: URL,
  apiPath: string,
  context: ControlPlaneContext,
  options: AcsRouteOptions,
  meta: AcsHttpEnvelopeMeta,
) {
  const segments = apiPath.split("/").filter(Boolean);
  const auth = meta.auth;
  const actorId = auth?.actorId?.trim();
  if (!auth || !actorId || !auth.authenticated || !auth.trusted) {
    return fail("administrative actor context required", 401, "unauthorized", options.correlationId, undefined, meta, "unauthorized", {
      retryable: false,
      severity: "warning",
    });
  }

  const isPlatformActor = auth.platformAdmin;
  const platformAuthority: Authority = { kind: "platform_admin", principalId: actorId };
  const tenantAuthority = (tenantId: string): Authority => ({ kind: "tenant_member", principalId: actorId, tenantId });

  const resolveAuthority = (tenantId: string): Authority | undefined => {
    if (isPlatformActor) return platformAuthority;
    if (auth.tenantId && auth.tenantId !== tenantId) return undefined;
    return tenantAuthority(tenantId);
  };

  const readBody = async (): Promise<Record<string, unknown>> => {
    const body = await readJsonBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new AcsHttpValidationError("JSON body must be an object");
    }
    return body as Record<string, unknown>;
  };

  const tenantSummary = (tenantId: string, authority: Authority) => {
    const tenant = context.tenantService.getTenant(tenantId);
    const memberships = context.tenantMembershipService.listMemberships(tenantId);
    const governance = context.tenantGovernanceService.readGovernanceState(tenantId, authority);
    return {
      tenantId: tenant.tenantId,
      status: tenant.status,
      administrativeMetadata: tenant.administrativeMetadata,
      lifecycle: tenant.lifecycle,
      revision: tenant.revision,
      ownerSummary: {
        principalIds: memberships.filter((membership) => membership.role === "tenant_owner" && membership.status === "active").map((membership) => membership.principalId),
        count: memberships.filter((membership) => membership.role === "tenant_owner" && membership.status === "active").length,
      },
      membershipSummary: {
        total: memberships.length,
        active: memberships.filter((membership) => membership.status === "active").length,
        suspended: memberships.filter((membership) => membership.status === "suspended").length,
        removed: memberships.filter((membership) => membership.status === "removed").length,
      },
      governanceSummary: {
        hasPolicy: Boolean(governance.policy),
        ...(governance.policy ? { policyId: governance.policy.policyId, defaultEffect: governance.policy.defaultEffect, ruleCount: governance.policy.rules.length } : { ruleCount: 0 }),
      },
      entitlementSummary: {
        total: governance.entitlements.length,
        enabled: governance.entitlements.filter((entitlement) => entitlement.enabled).length,
      },
      limitSummary: {
        total: governance.limits.length,
      },
    };
  };

  const tenantDetail = (tenantId: string, authority: Authority) => {
    const tenant = context.tenantService.getTenant(tenantId);
    const memberships = context.tenantMembershipService.listMemberships(tenantId);
    const governance = context.tenantGovernanceService.readGovernanceState(tenantId, authority);
    return {
      ...tenantSummary(tenant.tenantId, authority),
      memberships,
      governance,
    };
  };

  const assertRequestTenantScope = (body: Record<string, unknown>, pathTenantId: string) => {
    if (!("tenantId" in body)) return;
    const bodyTenantId = typeof body.tenantId === "string" ? assertSafeIdentifier(body.tenantId, "tenantId") : undefined;
    if (bodyTenantId && bodyTenantId !== pathTenantId) {
      throw new AcsHttpValidationError("body tenantId must match path tenantId");
    }
  };

  const tenantAuditList = (tenantId: string, url: URL) => {
    const filter: {
      category?: TenantAdministrativeAuditFilter["category"];
      outcome?: TenantAdministrativeAuditFilter["outcome"];
      actor?: string;
      correlationId?: string;
      eventType?: string;
    } = {};
    const category = url.searchParams.get("category");
    const outcome = url.searchParams.get("outcome");
    const actor = url.searchParams.get("actor");
    const correlationId = url.searchParams.get("correlationId");
    const eventType = url.searchParams.get("eventType");
    if (category === "tenant.lifecycle" || category === "tenant.membership" || category === "tenant.ownership" || category === "tenant.governance" || category === "tenant.entitlement" || category === "tenant.limit" || category === "tenant.enforcement" || category === "tenant.unknown") {
      filter.category = category;
    }
    if (outcome === "succeeded" || outcome === "denied" || outcome === "failed" || outcome === "allowed") {
      filter.outcome = outcome;
    }
    if (actor) filter.actor = assertSafeIdentifier(actor, "actor");
    if (correlationId) filter.correlationId = assertSafeIdentifier(correlationId, "correlationId");
    if (eventType) filter.eventType = eventType;
    const events = context.auditService.queryEvents({ tenantId, ...(filter.actor ? { actor: filter.actor } : {}), ...(filter.correlationId ? { correlationId: filter.correlationId } : {}), ...(filter.eventType ? { eventType: filter.eventType } : {}) });
    return projectAdministrativeAuditEntries(events, filter).filter((entry) => entry.category !== "tenant.unknown");
  };

  const tenantAuditDetail = (tenantId: string, eventId: string) => {
    const event = context.auditService.queryEvents({ tenantId }).find((entry) => entry.eventId === eventId);
    if (!event) {
      throw new AcsError("audit event not found: " + tenantId + "/" + eventId, "ACS_TENANT_AUDIT_EVENT_NOT_FOUND");
    }
    const projected = projectAdministrativeAuditEntry(event);
    if (projected.category === "tenant.unknown") {
      throw new AcsError("audit event not found: " + tenantId + "/" + eventId, "ACS_TENANT_AUDIT_EVENT_NOT_FOUND");
    }
    return projected;
  };

  const tenantId = segments[2] ? readPathSegment(segments, 2, "tenantId") : undefined;

  try {
    if (!tenantId) {
      if (request.method === "GET") {
        assertAllowedQueryParams(url, []);
        if (!isPlatformActor) {
          return fail("tenant listing is platform-scoped", 403, "forbidden", options.correlationId, undefined, meta, "platform_scope_required", {
            retryable: false,
            severity: "warning",
          });
        }
        return { status: 200, body: ok(context.tenantService.listTenants().map((tenant) => tenantSummary(tenant.tenantId, platformAuthority)), [], options.correlationId, meta) };
      }
      if (request.method === "POST") {
        if (!isPlatformActor) {
          return fail("tenant creation is platform-scoped", 403, "forbidden", options.correlationId, undefined, meta, "platform_scope_required", {
            retryable: false,
            severity: "warning",
          });
        }
        const body = await readBody();
        const tenantIdValue = typeof body.tenantId === "string" ? assertSafeIdentifier(body.tenantId, "tenantId") : undefined;
        if (!tenantIdValue) {
          throw new AcsHttpValidationError("tenantId is required");
        }
        if ("bootstrapOwnerPrincipalId" in body) {
          throw new AcsHttpValidationError("bootstrapOwnerPrincipalId must be created through /ownership/bootstrap");
        }
        const receipt = context.tenantService.createTenant({
          tenantId: tenantIdValue,
          ...(typeof body.displayName === "string" ? { displayName: body.displayName } : {}),
          ...(typeof body.description === "string" ? { description: body.description } : {}),
          createdBy: actorId,
          at: Date.now(),
          ...(auth?.actorId ? { actor: auth.actorId } : {}),
          ...(typeof body.reason === "string" ? { reason: body.reason } : {}),
          ...(options.correlationId ? { correlationId: options.correlationId } : {}),
          ...(typeof body.provenance === "string" ? { provenance: body.provenance } : {}),
        });
        return { status: 201, body: ok({ tenant: tenantSummary(receipt.tenant.tenantId, platformAuthority), receipt }, [], options.correlationId, meta) };
      }
      return fail("method not allowed; allowed methods: GET, POST", 405, "method_not_allowed", options.correlationId, { allowed: "GET, POST" }, meta, "method_not_allowed", {
        retryable: false,
        severity: "warning",
      });
    }

    if (segments.length === 3) {
      const authority = resolveAuthority(tenantId);
      if (!authority) {
        return fail("tenant scope mismatch", 403, "forbidden", options.correlationId, { tenantId }, meta, "cross_tenant_scope", {
          retryable: false,
          severity: "warning",
        });
      }
      if (request.method === "GET") {
        assertAllowedQueryParams(url, []);
        return { status: 200, body: ok(tenantDetail(tenantId, authority), [], options.correlationId, meta) };
      }
      return fail("method not allowed; allowed methods: GET", 405, "method_not_allowed", options.correlationId, { allowed: "GET" }, meta, "method_not_allowed", {
        retryable: false,
        severity: "warning",
      });
    }

    const authority = resolveAuthority(tenantId);
    if (!authority) {
      return fail("tenant scope mismatch", 403, "forbidden", options.correlationId, { tenantId }, meta, "cross_tenant_scope", {
        retryable: false,
        severity: "warning",
      });
    }

    const scope = segments[3];
    const tail = segments.slice(4);

    if (scope === "audit") {
      if (tail.length === 0 && request.method === "GET") {
        assertAllowedQueryParams(url, ["category", "outcome", "actor", "correlationId", "eventType"]);
        const entries = tenantAuditList(tenantId, url);
        return { status: 200, body: ok({ tenantId, entries, total: entries.length }, [], options.correlationId, meta) };
      }
      if (tail.length === 1 && request.method === "GET") {
        const eventId = readPathSegment(tail, 0, "eventId");
        const entry = tenantAuditDetail(tenantId, eventId);
        return { status: 200, body: ok({ tenantId, event: entry }, [], options.correlationId, meta) };
      }
      return fail("method not allowed; allowed methods: GET", 405, "method_not_allowed", options.correlationId, { allowed: "GET" }, meta, "method_not_allowed", {
        retryable: false,
        severity: "warning",
      });
    }

    if (scope === "activate" || scope === "suspend" || scope === "reactivate" || scope === "archive") {
      if (request.method !== "POST") {
        return fail("method not allowed; allowed methods: POST", 405, "method_not_allowed", options.correlationId, { allowed: "POST" }, meta, "method_not_allowed", {
          retryable: false,
          severity: "warning",
        });
      }
      const mutation = scope === "activate"
        ? context.tenantService.activateTenant
        : scope === "suspend"
          ? context.tenantService.suspendTenant
          : scope === "reactivate"
            ? context.tenantService.reactivateTenant
            : context.tenantService.archiveTenant;
      const receipt = mutation.call(context.tenantService, tenantId, {
        at: Date.now(),
        ...(auth?.actorId ? { actor: auth.actorId } : {}),
      });
      return { status: 200, body: ok({ tenant: receipt.tenant, receipt, detail: tenantDetail(tenantId, authority) }, [], options.correlationId, meta) };
    }

    if (scope === "ownership") {
      if (tail.length === 1 && tail[0] === "bootstrap" && request.method === "POST") {
        const body = await readBody();
        assertRequestTenantScope(body, tenantId);
        const principalId = typeof body.principalId === "string" ? assertSafeIdentifier(body.principalId, "principalId") : undefined;
        if (!principalId) throw new AcsHttpValidationError("principalId is required");
        const receipt = context.tenantMembershipService.bootstrapTenantOwner({
          tenantId,
          principalId,
          authority,
          at: Date.now(),
          ...(auth?.actorId ? { actor: auth.actorId } : {}),
          ...(typeof body.reason === "string" ? { reason: body.reason } : {}),
          ...(options.correlationId ? { correlationId: options.correlationId } : {}),
          ...(typeof body.provenance === "string" ? { provenance: body.provenance } : {}),
        });
        return { status: 200, body: ok({ membership: receipt.membership, receipt, tenant: tenantDetail(tenantId, authority) }, [], options.correlationId, meta) };
      }
      if (tail.length === 1 && tail[0] === "transfer" && request.method === "POST") {
        const body = await readBody();
        assertRequestTenantScope(body, tenantId);
        const fromPrincipalId = typeof body.fromPrincipalId === "string" ? assertSafeIdentifier(body.fromPrincipalId, "fromPrincipalId") : undefined;
        const toPrincipalId = typeof body.toPrincipalId === "string" ? assertSafeIdentifier(body.toPrincipalId, "toPrincipalId") : undefined;
        if (!fromPrincipalId || !toPrincipalId) throw new AcsHttpValidationError("fromPrincipalId and toPrincipalId are required");
        const receipt = context.tenantMembershipService.transferOwnership({
          tenantId,
          fromPrincipalId,
          toPrincipalId,
          authority,
          at: Date.now(),
          ...(auth?.actorId ? { actor: auth.actorId } : {}),
          ...(typeof body.reason === "string" ? { reason: body.reason } : {}),
          ...(options.correlationId ? { correlationId: options.correlationId } : {}),
          ...(typeof body.provenance === "string" ? { provenance: body.provenance } : {}),
        });
        return { status: 200, body: ok({ membership: receipt.membership, receipt, tenant: tenantDetail(tenantId, authority) }, [], options.correlationId, meta) };
      }
      return fail("method not allowed; allowed methods: POST", 405, "method_not_allowed", options.correlationId, { allowed: "POST" }, meta, "method_not_allowed", {
        retryable: false,
        severity: "warning",
      });
    }

    if (scope === "members") {
      if (tail.length === 0 && request.method === "GET") {
        assertAllowedQueryParams(url, []);
        return { status: 200, body: ok(tenantDetail(tenantId, authority).memberships, [], options.correlationId, meta) };
      }
      if (tail.length === 0 && request.method === "POST") {
        const body = await readBody();
        assertRequestTenantScope(body, tenantId);
        const principalId = typeof body.principalId === "string" ? assertSafeIdentifier(body.principalId, "principalId") : undefined;
        if (!principalId) throw new AcsHttpValidationError("principalId is required");
        const role = typeof body.role === "string" ? body.role : "operator";
        if (role === "tenant_owner") {
          throw new AcsHttpValidationError("tenant_owner must be bootstrapped or transferred");
        }
        const receipt = context.tenantMembershipService.addMembership({
          tenantId,
          principalId,
          role: role as "tenant_admin" | "operator" | "auditor",
          authority,
          at: Date.now(),
          ...(auth?.actorId ? { actor: auth.actorId } : {}),
          ...(typeof body.reason === "string" ? { reason: body.reason } : {}),
          ...(options.correlationId ? { correlationId: options.correlationId } : {}),
          ...(typeof body.provenance === "string" ? { provenance: body.provenance } : {}),
        });
        return { status: 200, body: ok({ membership: receipt.membership, receipt, tenant: tenantDetail(tenantId, authority) }, [], options.correlationId, meta) };
      }
      if (tail.length === 1) {
        const principalId = readPathSegment(tail, 0, "principalId");
        if (request.method === "GET") {
          assertAllowedQueryParams(url, []);
          const membership = tenantDetail(tenantId, authority).memberships.find((entry) => entry.principalId === principalId);
          if (!membership) {
            throw new AcsError("membership not found: " + tenantId + "/" + principalId, "ACS_TENANT_MEMBERSHIP_NOT_FOUND");
          }
          return { status: 200, body: ok(membership, [], options.correlationId, meta) };
        }
      }
      if (tail.length === 2 && request.method === "POST") {
        const principalId = readPathSegment(tail, 0, "principalId");
        const action = tail[1];
        const body = await readBody();
        assertRequestTenantScope(body, tenantId);
        if (action === "change-role") {
          const role = typeof body.role === "string" ? body.role : undefined;
          if (!role || role === "tenant_owner") throw new AcsHttpValidationError("role must be tenant_admin, operator, or auditor");
          const receipt = context.tenantMembershipService.changeRole({
            tenantId,
            principalId,
            role: role as "tenant_admin" | "operator" | "auditor",
            authority,
            at: Date.now(),
            ...(auth?.actorId ? { actor: auth.actorId } : {}),
            ...(typeof body.reason === "string" ? { reason: body.reason } : {}),
            ...(options.correlationId ? { correlationId: options.correlationId } : {}),
            ...(typeof body.provenance === "string" ? { provenance: body.provenance } : {}),
          });
          return { status: 200, body: ok({ membership: receipt.membership, receipt, tenant: tenantDetail(tenantId, authority) }, [], options.correlationId, meta) };
        }
        if (action === "suspend") {
          const receipt = context.tenantMembershipService.suspendMembership({ tenantId, principalId, authority, at: Date.now(), ...(auth?.actorId ? { actor: auth.actorId } : {}), ...(typeof body.reason === "string" ? { reason: body.reason } : {}), ...(options.correlationId ? { correlationId: options.correlationId } : {}), ...(typeof body.provenance === "string" ? { provenance: body.provenance } : {}) });
          return { status: 200, body: ok({ membership: receipt.membership, receipt, tenant: tenantDetail(tenantId, authority) }, [], options.correlationId, meta) };
        }
        if (action === "reactivate") {
          const receipt = context.tenantMembershipService.reactivateMembership({ tenantId, principalId, authority, at: Date.now(), ...(auth?.actorId ? { actor: auth.actorId } : {}), ...(typeof body.reason === "string" ? { reason: body.reason } : {}), ...(options.correlationId ? { correlationId: options.correlationId } : {}), ...(typeof body.provenance === "string" ? { provenance: body.provenance } : {}) });
          return { status: 200, body: ok({ membership: receipt.membership, receipt, tenant: tenantDetail(tenantId, authority) }, [], options.correlationId, meta) };
        }
        if (action === "remove") {
          const receipt = context.tenantMembershipService.removeMembership({ tenantId, principalId, authority, at: Date.now(), ...(auth?.actorId ? { actor: auth.actorId } : {}), ...(typeof body.reason === "string" ? { reason: body.reason } : {}), ...(options.correlationId ? { correlationId: options.correlationId } : {}), ...(typeof body.provenance === "string" ? { provenance: body.provenance } : {}) });
          return { status: 200, body: ok({ membership: receipt.membership, receipt, tenant: tenantDetail(tenantId, authority) }, [], options.correlationId, meta) };
        }
      }
      return fail("method not allowed; allowed methods: GET, POST", 405, "method_not_allowed", options.correlationId, { allowed: "GET, POST" }, meta, "method_not_allowed", {
        retryable: false,
        severity: "warning",
      });
    }

    if (scope === "governance") {
      if (tail.length === 0 && request.method === "GET") {
        assertAllowedQueryParams(url, []);
        return { status: 200, body: ok(tenantDetail(tenantId, authority).governance, [], options.correlationId, meta) };
      }
      if (tail.length === 1 && tail[0] === "policies" && request.method === "GET") {
        assertAllowedQueryParams(url, []);
        return { status: 200, body: ok(tenantDetail(tenantId, authority).governance.policy ?? null, [], options.correlationId, meta) };
      }
      if (tail.length === 1 && tail[0] === "policy" && request.method === "PUT") {
        const body = await readBody();
        assertRequestTenantScope(body, tenantId);
        const policyId = typeof body.policyId === "string" ? assertSafeIdentifier(body.policyId, "policyId") : undefined;
        const defaultEffect = body.defaultEffect === "allow" || body.defaultEffect === "deny" ? body.defaultEffect : undefined;
        if (!policyId || !defaultEffect) throw new AcsHttpValidationError("policyId and defaultEffect are required");
        const rules = Array.isArray(body.rules) ? body.rules : [];
        const normalizedRules: TenantGovernanceRule[] = rules.map((rule, index) => {
          if (!rule || typeof rule !== "object" || Array.isArray(rule)) throw new AcsHttpValidationError("rule " + index + " must be an object");
          const entry = rule as Record<string, unknown>;
          const ruleId = typeof entry.ruleId === "string" ? assertSafeIdentifier(entry.ruleId, "ruleId") : undefined;
          const action = typeof entry.action === "string" ? entry.action : undefined;
          const effect = entry.effect === "allow" || entry.effect === "deny" ? entry.effect : undefined;
          const priority = typeof entry.priority === "number" ? entry.priority : undefined;
          if (!ruleId || !action || !effect || priority === undefined) throw new AcsHttpValidationError("rule " + index + " requires ruleId, action, effect, and priority");
          return { ruleId, action: action as GovernedAction, effect, priority, ...(typeof entry.reason === "string" ? { reason: entry.reason } : {}) };
        });
        const receipt = context.tenantGovernanceService.replacePolicy({
          tenantId,
          authority,
          policyId,
          defaultEffect,
          rules: normalizedRules,
          at: Date.now(),
          ...(auth?.actorId ? { actor: auth.actorId } : {}),
          ...(typeof body.reason === "string" ? { reason: body.reason } : {}),
          ...(options.correlationId ? { correlationId: options.correlationId } : {}),
          ...(typeof body.provenance === "string" ? { provenance: body.provenance } : {}),
        });
        return { status: 200, body: ok({ value: receipt.nextValue, receipt, tenant: tenantDetail(tenantId, authority) }, [], options.correlationId, meta) };
      }
      if (tail.length === 1 && tail[0] === "evaluate" && request.method === "POST") {
        const body = await readBody();
        assertRequestTenantScope(body, tenantId);
        const action = typeof body.action === "string" ? body.action : undefined;
        if (!action) throw new AcsHttpValidationError("action is required");
        const receipt = context.tenantGovernanceService.evaluateGovernedAction({ tenantId, action: action as GovernedAction, at: Date.now(), ...(auth?.actorId ? { actor: auth.actorId } : {}), ...(options.correlationId ? { correlationId: options.correlationId } : {}) });
        return { status: 200, body: ok(receipt, [], options.correlationId, meta) };
      }
      return fail("method not allowed; allowed methods: GET, POST, PUT", 405, "method_not_allowed", options.correlationId, { allowed: "GET, POST, PUT" }, meta, "method_not_allowed", {
        retryable: false,
        severity: "warning",
      });
    }

    if (scope === "entitlements") {
      if (tail.length === 0 && request.method === "GET") {
        assertAllowedQueryParams(url, []);
        return { status: 200, body: ok(tenantDetail(tenantId, authority).governance.entitlements, [], options.correlationId, meta) };
      }
      if (tail.length === 1) {
        const entitlementKey = readPathSegment(tail, 0, "entitlementKey");
        if (request.method === "PUT") {
          const body = await readBody();
          assertRequestTenantScope(body, tenantId);
          const enabled = body.enabled === true;
          const receipt = enabled
            ? context.tenantGovernanceService.grantEntitlement({ tenantId, authority, entitlementKey, enabled: true, at: Date.now(), ...(auth?.actorId ? { actor: auth.actorId } : {}), ...(typeof body.reason === "string" ? { reason: body.reason } : {}), ...(options.correlationId ? { correlationId: options.correlationId } : {}), ...(typeof body.provenance === "string" ? { provenance: body.provenance } : {}) })
            : context.tenantGovernanceService.revokeEntitlement({ tenantId, authority, entitlementKey, enabled: false, at: Date.now(), ...(auth?.actorId ? { actor: auth.actorId } : {}), ...(typeof body.reason === "string" ? { reason: body.reason } : {}), ...(options.correlationId ? { correlationId: options.correlationId } : {}), ...(typeof body.provenance === "string" ? { provenance: body.provenance } : {}) });
          return { status: 200, body: ok({ value: receipt.nextValue, receipt, tenant: tenantDetail(tenantId, authority) }, [], options.correlationId, meta) };
        }
        if (request.method === "DELETE") {
          const body = await readBody().catch(() => ({} as Record<string, unknown>));
          assertRequestTenantScope(body, tenantId);
          const receipt = context.tenantGovernanceService.revokeEntitlement({ tenantId, authority, entitlementKey, enabled: false, at: Date.now(), ...(auth?.actorId ? { actor: auth.actorId } : {}), ...(typeof body.reason === "string" ? { reason: body.reason } : {}), ...(options.correlationId ? { correlationId: options.correlationId } : {}) });
          return { status: 200, body: ok({ value: receipt.nextValue, receipt, tenant: tenantDetail(tenantId, authority) }, [], options.correlationId, meta) };
        }
      }
      return fail("method not allowed; allowed methods: GET, PUT, DELETE", 405, "method_not_allowed", options.correlationId, { allowed: "GET, PUT, DELETE" }, meta, "method_not_allowed", {
        retryable: false,
        severity: "warning",
      });
    }

    if (scope === "limits") {
      if (tail.length === 0 && request.method === "GET") {
        assertAllowedQueryParams(url, []);
        const governance = tenantDetail(tenantId, authority).governance;
        return {
          status: 200,
          body: ok(
            governance.limits.map((limit) => ({
              ...limit,
              evaluation: context.tenantGovernanceService.evaluateLimit({ tenantId, limitKey: limit.limitKey, at: Date.now() }),
            })),
            [],
            options.correlationId,
            meta,
          ),
        };
      }
      if (tail.length === 1) {
        const limitKey = readPathSegment(tail, 0, "limitKey");
        if (request.method === "PUT") {
          const body = await readBody();
          assertRequestTenantScope(body, tenantId);
          const value = typeof body.value === "number" ? body.value : undefined;
          if (value === undefined) throw new AcsHttpValidationError("value is required");
          const receipt = context.tenantGovernanceService.setLimit({ tenantId, authority, limitKey, value, at: Date.now(), ...(auth?.actorId ? { actor: auth.actorId } : {}), ...(typeof body.reason === "string" ? { reason: body.reason } : {}), ...(options.correlationId ? { correlationId: options.correlationId } : {}), ...(typeof body.provenance === "string" ? { provenance: body.provenance } : {}) });
          return { status: 200, body: ok({ value: receipt.nextValue, receipt, tenant: tenantDetail(tenantId, authority) }, [], options.correlationId, meta) };
        }
        if (request.method === "DELETE") {
          const body = await readBody().catch(() => ({} as Record<string, unknown>));
          assertRequestTenantScope(body, tenantId);
          const receipt = context.tenantGovernanceService.clearLimit({ tenantId, authority, limitKey, value: 0, at: Date.now(), ...(auth?.actorId ? { actor: auth.actorId } : {}), ...(typeof body.reason === "string" ? { reason: body.reason } : {}), ...(options.correlationId ? { correlationId: options.correlationId } : {}) });
          return { status: 200, body: ok({ value: receipt.nextValue, receipt, tenant: tenantDetail(tenantId, authority) }, [], options.correlationId, meta) };
        }
      }
      return fail("method not allowed; allowed methods: GET, PUT, DELETE", 405, "method_not_allowed", options.correlationId, { allowed: "GET, PUT, DELETE" }, meta, "method_not_allowed", {
        retryable: false,
        severity: "warning",
      });
    }

    return fail("method not allowed; allowed methods: GET, POST, PUT, DELETE", 405, "method_not_allowed", options.correlationId, { allowed: "GET, POST, PUT, DELETE" }, meta, "method_not_allowed", {
      retryable: false,
      severity: "warning",
    });
  } catch (error) {
    if (error instanceof AcsHttpValidationError) {
      return fail(error.message, 400, error.code, options.correlationId, error.details, meta, "validation_error", { retryable: false, severity: "error" });
    }
    if (error instanceof AcsError) {
      switch (error.code) {
        case "ACS_TENANT_IDENTITY_INVALID":
        case "ACS_PRINCIPAL_IDENTITY_INVALID":
        case "ACS_TENANT_GOVERNED_ACTION_INVALID":
        case "ACS_TENANT_GOVERNANCE_EFFECT_INVALID":
        case "ACS_TENANT_ENTITLEMENT_INVALID":
        case "ACS_TENANT_LIMIT_INVALID":
        case "ACS_TENANT_GOVERNANCE_POLICY_INVALID":
          return fail(error.message, 400, "invalid_request", options.correlationId, { code: error.code }, meta, "invalid_request", { retryable: false, severity: "error" });
        case "ACS_TENANT_ALREADY_EXISTS":
        case "ACS_TENANT_MEMBERSHIP_ALREADY_EXISTS":
          return fail(error.message, 409, "conflict", options.correlationId, { code: error.code }, meta, "conflict", { retryable: false, severity: "error" });
        case "ACS_TENANT_NOT_FOUND":
        case "ACS_TENANT_MEMBERSHIP_NOT_FOUND":
        case "ACS_TENANT_GOVERNANCE_RULE_NOT_FOUND":
        case "ACS_TENANT_GOVERNANCE_STATE_NOT_FOUND":
          return fail(error.message, 404, "not_found", options.correlationId, { code: error.code }, meta, "not_found", { retryable: false, severity: "error" });
        case "ACS_TENANT_INVALID_TRANSITION":
        case "ACS_TENANT_ARCHIVED":
        case "ACS_TENANT_MEMBERSHIP_REVISION_CONFLICT":
        case "ACS_TENANT_GOVERNANCE_REVISION_CONFLICT":
        case "ACS_TENANT_MEMBERSHIP_ROLE_TRANSITION_INVALID":
        case "ACS_TENANT_LAST_OWNER_PROTECTED":
        case "ACS_TENANT_OWNERSHIP_TRANSFER_INVALID":
        case "ACS_TENANT_STATE_BLOCKS_MEMBERSHIP_MUTATION":
        case "ACS_TENANT_STATE_BLOCKS_GOVERNANCE_MUTATION":
        case "ACS_TENANT_ARCHIVED_GOVERNANCE_MUTATION":
          return fail(error.message, 409, "conflict", options.correlationId, { code: error.code }, meta, "conflict", { retryable: false, severity: "warning" });
        case "ACS_TENANT_ADMIN_AUTHORITY_DENIED":
        case "ACS_TENANT_CROSS_TENANT_FORBIDDEN":
        case "ACS_TENANT_CROSS_TENANT_GOVERNANCE_FORBIDDEN":
        case "ACS_TENANT_GOVERNANCE_MUTATION_UNAUTHORIZED":
          return fail(error.message, 403, "forbidden", options.correlationId, { code: error.code }, meta, "blocked_by_authority", { retryable: false, severity: "warning" });
        case "ACS_TENANT_LIMIT_EXCEEDS_HARD_MAXIMUM":
          return fail(error.message, 429, "limit_exceeded", options.correlationId, { code: error.code }, meta, "blocked_by_limit", { retryable: false, severity: "warning" });
        case "ACS_TENANT_MEMBERSHIP_INACTIVE":
          return fail(error.message, 409, "conflict", options.correlationId, { code: error.code }, meta, "inactive_membership", { retryable: false, severity: "warning" });
        default:
          return fail(error.message, 500, "internal_error", options.correlationId, { code: error.code }, meta, "runtime_failure", { retryable: true, severity: "error" });
      }
    }
    return fail(error instanceof Error ? error.message : "unknown admin tenant API error", 500, "internal_error", options.correlationId, undefined, meta, "runtime_failure", { retryable: true, severity: "error" });
  }
}
