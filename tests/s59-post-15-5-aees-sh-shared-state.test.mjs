import assert from "node:assert/strict";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  PostgresSharedAuthoritativeState,
  RevisionConflictError,
  SHARED_STATE_SCHEMA_VERSION,
  createSharedControlPlaneContext,
  sharedStateOptionsFromEnvironment,
} = await import(`${distRoot}/index.js`);

test("SH01 shared profile is explicit, async, and fail-closed without database configuration", async () => {
  assert.throws(
    () => sharedStateOptionsFromEnvironment({ ACS_STATE_BACKEND: "local" }),
    /ACS_STATE_BACKEND=shared/,
  );
  assert.throws(
    () => sharedStateOptionsFromEnvironment({ ACS_STATE_BACKEND: "shared" }),
    /ACS_SHARED_DATABASE_URL/,
  );

  const unavailable = new PostgresSharedAuthoritativeState({
    connectionString: "postgres://127.0.0.1:1/unavailable",
    connectionTimeoutMs: 100,
    statementTimeoutMs: 100,
  });
  try {
    const health = await unavailable.health();
    assert.equal(health.reachable, false);
    assert.equal(health.reasonCode, "SHARED_STATE_UNAVAILABLE");
  } finally {
    await unavailable.close();
  }
});

test("SH02 PostgreSQL transactions rollback and CAS is single-winner", {
  skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured",
}, async () => {
  const suffix = `${Date.now()}-${process.pid}`;
  const tenantId = `tenant-s59-${suffix}`;
  const agentId = `agent-s59-${suffix}`;
  const left = await createSharedControlPlaneContext({
    instanceId: `s59-left-${suffix}`,
    connectionString: process.env.ACS_SH_DATABASE_URL,
  });
  const right = await createSharedControlPlaneContext({
    instanceId: `s59-right-${suffix}`,
    connectionString: process.env.ACS_SH_DATABASE_URL,
  });
  try {
    assert.deepEqual(left.productionComposition, {
      profile: "shared",
      localAuthorityFallback: false,
      networkIoCapable: true,
      schemaVersion: SHARED_STATE_SCHEMA_VERSION,
      topology: "shared_network_database",
    });
    const now = Date.now();
    const rolledBackId = `tenant-rollback-${suffix}`;
    await assert.rejects(
      left.state.withTransaction("rollback proof", async (tx) => {
        await tx.tenants.create({
          tenantId: rolledBackId,
          status: "active",
          administrativeMetadata: {},
          lifecycle: { createdAt: now, updatedAt: now, activatedAt: now },
          revision: 1,
        });
        throw new Error("force rollback");
      }),
    );
    await assert.rejects(() => right.state.tenants.get(rolledBackId));

    await left.authority.createTenant({
      tenant: {
        tenantId,
        status: "active",
        administrativeMetadata: {},
        lifecycle: { createdAt: now, updatedAt: now, activatedAt: now },
        revision: 1,
      },
      context: { actor: "s59", correlationId: `corr-${suffix}` },
    });
    assert.equal((await right.state.tenants.get(tenantId)).tenantId, tenantId);

    const revision1 = {
      agentId,
      revision: 1,
      fingerprint: "one",
      definition: {
        agentId,
        name: "S59 Agent",
        status: "draft",
        capabilityIds: [],
        skillIds: [],
        toolIds: [],
        credentialConnectionIds: [],
        runnerPreferences: [],
      },
      createdAt: now,
      updatedAt: now,
    };
    await left.authority.createAgent(revision1, { actor: "s59", correlationId: `agent-${suffix}` });
    const attempts = await Promise.allSettled([
      left.authority.saveAgent({ ...revision1, revision: 2, fingerprint: "left", updatedAt: now + 1 }, 1, { actor: "left", correlationId: `left-${suffix}` }),
      right.authority.saveAgent({ ...revision1, revision: 2, fingerprint: "right", updatedAt: now + 1 }, 1, { actor: "right", correlationId: `right-${suffix}` }),
    ]);
    assert.equal(attempts.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(attempts.filter((item) => item.status === "rejected" && item.reason instanceof RevisionConflictError).length, 1);
  } finally {
    await Promise.all([left.close(), right.close()]);
  }
});

test("SH03 two independent database connections share rate-limit atomicity", {
  skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured",
}, async () => {
  const suffix = `${Date.now()}-${process.pid}`;
  const left = await createSharedControlPlaneContext({ instanceId: `rate-left-${suffix}`, connectionString: process.env.ACS_SH_DATABASE_URL });
  const right = await createSharedControlPlaneContext({ instanceId: `rate-right-${suffix}`, connectionString: process.env.ACS_SH_DATABASE_URL });
  try {
    const bucket = { policyId: `policy-${suffix}`, keyHash: "same", windowStart: 0, windowMs: 60_000, cost: 1 };
    const values = await Promise.all([left.state.rateLimits.consume(bucket), right.state.rateLimits.consume(bucket)]);
    assert.deepEqual(values.map((entry) => entry.consumed).sort((a, b) => a - b), [1, 2]);
  } finally {
    await Promise.all([left.close(), right.close()]);
  }
});
