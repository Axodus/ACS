import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import test from "node:test";
import { createAcsAuthContext } from "../dist/http/auth.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";
import { routeProductApiRequest } from "../dist/http/routes/product-api-routes.js";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const policyRef = (id) => ({ entity_kind: "policy", entity_id: id, revision: 1, fingerprint: sha256(id) });

function jsonRequest(body) {
  const request = Readable.from([JSON.stringify(body)]);
  request.method = "POST";
  request.url = "/api/v1/workforces";
  request.headers = { "content-type": "application/json" };
  return request;
}

function getRequest(url) {
  return { method: "GET", url, headers: {} };
}

function createWorkforceNativeCore() {
  const scope = {
    organization_id: "org-dev",
    product_domain: "acs",
    tenant_id: "tenant-dev",
    owner_ref: "owner-dev",
    authority_scope_ref: "authority-dev",
    knowledge_scope_refs: ["knowledge-dev"],
  };
  const definitions = new Map();
  const revisions = new Map();
  const idempotency = new Map();
  const commands = [];
  return {
    commands,
    listWorkforceDefinitions: async () => [...definitions.values()],
    listWorkforceRevisions: async (workforceId) => revisions.get(workforceId) ?? [],
    getWorkforceLineage: async (workforceId) => ({
      definition: definitions.get(workforceId),
      revisions: revisions.get(workforceId) ?? [],
    }),
    getAgentLineage: async (agentId) => ({
      definition: { agent_id: agentId, scope, status: "active" },
      revisions: [],
    }),
    advanceWorkforceLineage: async (command) => {
      const key = `${command.idempotency.scope}:${command.idempotency.key}`;
      const existing = idempotency.get(key);
      if (existing) return existing;
      assert.equal(command.expectedHead, 0);
      definitions.set(command.definition.workforce_id, command.definition);
      revisions.set(command.definition.workforce_id, [command.revision]);
      commands.push(command);
      const result = {
        lineage: { definition: command.definition, revisions: [command.revision] },
        event: { streamScope: `workforce:${command.definition.workforce_id}`, event: command.event },
        outbox: {
          outboxId: command.outboxId,
          eventId: command.event.event_id,
          deliveryKind: command.deliveryKind,
          status: "pending",
          availableAt: command.event.timestamp,
          attemptCount: 0,
          createdAt: command.event.timestamp,
        },
      };
      idempotency.set(key, result);
      return result;
    },
  };
}

test("IMP-03F-FIX-02 creates a canonical draft Workforce r1 and preserves retry identity", async () => {
  const nativeCore = createWorkforceNativeCore();
  const context = createControlPlaneContext({ nativeCore, startLocalWorker: false });
  const auth = createAcsAuthContext({
    mode: "development",
    actorType: "system",
    actorId: "system",
    authenticated: true,
    trusted: true,
    platformAdmin: true,
  });
  const input = {
    workforceId: "workforce-first",
    displayName: "First Workforce",
    purpose: "Initial controlled composition",
    ownershipRef: "owner-dev",
    slotId: "lead",
    agentId: "agent-existing",
    responsibilities: ["coordinate"],
    membershipPolicyRef: policyRef("membership-policy"),
    auditPolicyRef: policyRef("audit-policy"),
    changeReason: "Initial Workforce creation",
    idempotencyKey: "create-workforce-first-001",
    requestedAt: 1_700_000_000_000,
  };
  try {
    const empty = await routeProductApiRequest(getRequest("/api/v1/workforces"), "/api/v1/workforces", context, { auth });
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.body.data, []);

    const created = await routeProductApiRequest(jsonRequest(input), "/api/v1/workforces", context, { auth, correlationId: "first-attempt" });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.identity.workforce_id, input.workforceId);
    assert.equal(created.body.data.identity.current_status, "draft");
    assert.equal(created.body.data.currentRevision.ref.revision, 1);
    assert.equal(created.body.data.currentRevision.lifecycle_status, "draft");

    const retried = await routeProductApiRequest(jsonRequest(input), "/api/v1/workforces", context, { auth, correlationId: "retry-with-other-correlation" });
    assert.equal(retried.status, 201, JSON.stringify(retried.body));
    assert.equal(retried.body.data.currentRevision.ref.fingerprint, created.body.data.currentRevision.ref.fingerprint);
    assert.equal(nativeCore.commands.length, 1);

    const command = nativeCore.commands[0];
    assert.equal(command.revision.ref.revision, 1);
    assert.equal(command.revision.lifecycle_status, "draft");
    assert.equal(command.event.event_type, "workforce.created");
    assert.equal(command.event.idempotency_key, input.idempotencyKey);
    assert.equal(command.outboxId.startsWith("outbox-workforce-created-"), true);
    assert.equal(command.authority.decision, "allowed");
    assert.equal(command.authority.evaluated_at, input.requestedAt);

    const list = await routeProductApiRequest(getRequest("/api/v1/workforces"), "/api/v1/workforces", context, { auth });
    assert.equal(list.status, 200);
    assert.deepEqual(list.body.data.map((entry) => entry.workforceId), [input.workforceId]);
    const direct = await routeProductApiRequest(getRequest(`/api/v1/workforces/${input.workforceId}`), `/api/v1/workforces/${input.workforceId}`, context, { auth });
    assert.equal(direct.status, 200);
    assert.equal(direct.body.data.identity.workforce_id, input.workforceId);
  } finally {
    await context.close();
  }
});
