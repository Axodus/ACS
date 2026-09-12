import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { createAcsAuthContext } from "../dist/http/auth.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";
import { routeProductApiRequest } from "../dist/http/routes/product-api-routes.js";
import { NativeIdempotencyConflictError, RevisionConflictError } from "../dist/index.js";
import { createWorkforceDefinitionV2, createWorkforceRevisionV2 } from "../dist/native-core/workforce.js";

const digest = "a".repeat(64);
const revisionRef = (entity_kind, entity_id, revision) => ({ entity_kind, entity_id, revision, fingerprint: digest });
const entityRef = (kind, id, revision) => ({ kind, id, ...(revision === undefined ? {} : { revision }) });

const scope = {
  organization_id: "org-imp-03e2",
  product_domain: "acs",
  tenant_id: "tenant-imp-03e2",
  owner_ref: "owner:acs",
  authority_scope_ref: "authority:acs",
  knowledge_scope_refs: [],
};

const member = {
  slot_id: "primary",
  agent_selector: { mode: "pinned", agent_id: "agent-1", pinned_revision_ref: revisionRef("agent", "agent-1", 7) },
  role_ref: revisionRef("resource", "role-1", 2),
  responsibilities: ["coordinate"],
  capability_requirement_refs: [],
  authority_constraint_refs: [],
  participation_constraint_refs: [],
};

function request(method, url, body) {
  const stream = Readable.from([JSON.stringify(body)]);
  stream.method = method;
  stream.url = url;
  stream.headers = { "content-type": "application/json" };
  return stream;
}

function fakeCore() {
  const definition = createWorkforceDefinitionV2({ workforce_id: "wf-1", scope, current_status: "draft", current_revision: 1, ownership_ref: scope.owner_ref, created_at: 1000, updated_at: 1000 });
  const revision1 = createWorkforceRevisionV2({ workforce_id: "wf-1", revision: 1, display_name: "Workforce 1", purpose: "Product API acceptance", lifecycle_status: "draft", members: [member], composition_constraints: [], governance: { authority_refs: [entityRef("authority", "authority-1")], membership_policy_ref: revisionRef("policy", "membership", 1) }, evidence: { audit_policy_ref: revisionRef("policy", "audit", 1) }, commit: { created_by: "fixture", committed_at: 1000, change_reason: "fixture" } });
  const definitions = new Map([["wf-1", definition]]);
  const revisions = new Map([["wf-1", [revision1]]]);
  const idempotency = new Map();
  const commands = [];
  const runs = [{ run: { run_id: "run-1", status: "created", created_at: 1100, definition_refs: { workforce_revision_ref: revisionRef("workforce", "wf-1", 1) } }, membership_snapshot_id: "snapshot-run-1", admitted_at: 1100 }];

  return {
    commands,
    listWorkforceDefinitions: async () => [...definitions.values()],
    listWorkforceRevisions: async (workforceId) => revisions.get(workforceId) ?? [],
    getWorkforceRevision: async (workforceId, revision) => revisions.get(workforceId)?.find((candidate) => candidate.ref.revision === revision),
    getWorkforceLineage: async (workforceId) => ({ definition: definitions.get(workforceId), revisions: revisions.get(workforceId) ?? [] }),
    listWorkforceRuns: async (workforceId) => workforceId === "wf-1" ? runs : [],
    advanceWorkforceLineage: async (command) => {
      const key = `${command.idempotency.scope}:${command.idempotency.key}`;
      const previous = idempotency.get(key);
      if (previous) {
        if (previous.requestHash !== command.idempotency.request_hash) throw new NativeIdempotencyConflictError(command.idempotency.scope, command.idempotency.key);
        return previous.result;
      }
      const current = definitions.get(command.definition.workforce_id);
      if (!current || current.current_revision !== command.expectedHead) throw new RevisionConflictError(`native-workforce:${command.definition.workforce_id}`, command.expectedHead, current?.current_revision);
      definitions.set(command.definition.workforce_id, command.definition);
      revisions.set(command.definition.workforce_id, [...(revisions.get(command.definition.workforce_id) ?? []), command.revision]);
      commands.push(command);
      const result = { lineage: { definition: command.definition, revisions: revisions.get(command.definition.workforce_id) }, event: { event: command.event }, outbox: { outboxId: command.outboxId } };
      idempotency.set(key, { requestHash: command.idempotency.request_hash, result });
      return result;
    },
  };
}

test("IMP-03E2 exposes revision, lifecycle, and Workforce-scoped Runs through the Product API boundary", async () => {
  const nativeCore = fakeCore();
  const context = createControlPlaneContext({ nativeCore, startLocalWorker: false, tenantId: scope.tenant_id });
  const auth = createAcsAuthContext({ mode: "development", actorType: "system", actorId: "system", authenticated: true, trusted: true, platformAdmin: true });
  const revisionBody = {
    expectedRevision: 1,
    displayName: "Workforce 2",
    purpose: "Updated composition",
    members: [member],
    compositionConstraints: [],
    authorityRefs: [entityRef("authority", "authority-1")],
    membershipPolicyRef: revisionRef("policy", "membership", 1),
    auditPolicyRef: revisionRef("policy", "audit", 1),
    changeReason: "Add canonical revision",
    idempotencyKey: "revision-2",
    requestedAt: 2000,
  };
  try {
    const created = await routeProductApiRequest(request("POST", "/api/v1/workforces/wf-1/revisions", revisionBody), "/api/v1/workforces/wf-1/revisions", context, { auth });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.currentRevision.ref.revision, 2);
    assert.equal(nativeCore.commands[0].event.event_type, "workforce.revision.created");
    assert.equal(nativeCore.commands[0].revision.members[0].slot_id, "primary");
    assert.equal(nativeCore.commands[0].revision.members[0].role_ref.revision, 2);
    assert.equal(nativeCore.commands[0].revision.members[0].agent_selector.mode, "pinned");
    assert.equal(nativeCore.commands[0].revision.members[0].agent_selector.pinned_revision_ref.revision, 7);
    assert.equal(nativeCore.commands[0].revision.supersedes_revision, 1);

    const retry = await routeProductApiRequest(request("POST", "/api/v1/workforces/wf-1/revisions", revisionBody), "/api/v1/workforces/wf-1/revisions", context, { auth });
    assert.equal(retry.status, 201);
    assert.equal(retry.body.data.currentRevision.ref.fingerprint, created.body.data.currentRevision.ref.fingerprint);
    assert.equal(nativeCore.commands.length, 1);

    const lifecycleBody = { expectedRevision: 2, targetStatus: "active", changeReason: "Activate Workforce", idempotencyKey: "lifecycle-3", requestedAt: 3000 };
    const lifecycle = await routeProductApiRequest(request("POST", "/api/v1/workforces/wf-1/lifecycle", lifecycleBody), "/api/v1/workforces/wf-1/lifecycle", context, { auth });
    assert.equal(lifecycle.status, 200, JSON.stringify(lifecycle.body));
    assert.equal(lifecycle.body.data.identity.current_status, "active");
    assert.equal(nativeCore.commands[1].event.event_type, "workforce.lifecycle.changed");

    const stale = await routeProductApiRequest(request("POST", "/api/v1/workforces/wf-1/revisions", { ...revisionBody, expectedRevision: 2, idempotencyKey: "stale-revision", requestedAt: 4000 }), "/api/v1/workforces/wf-1/revisions", context, { auth });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.code, "conflict");

    const runs = await routeProductApiRequest({ method: "GET", url: "/api/v1/workforces/wf-1/runs", headers: {} }, "/api/v1/workforces/wf-1/runs", context, { auth });
    assert.equal(runs.status, 200);
    assert.deepEqual(runs.body.data.map((run) => [run.runId, run.admittedWorkforceRevision, run.membershipSnapshotId]), [["run-1", 1, "snapshot-run-1"]]);
  } finally {
    await context.close();
  }
});
