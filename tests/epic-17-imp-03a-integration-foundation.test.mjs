import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  ACS_NATIVE_SCHEMA_VERSION,
  NativeContractValidationError,
  SHARED_STATE_MIGRATIONS,
  SHARED_STATE_SCHEMA_VERSION,
  createIntegrationChannelDefinitionV1,
  createIntegrationChannelRevisionV1,
  createIntegrationConnectionDefinitionV1,
  createIntegrationConnectionRevisionV1,
} = await import(`${distRoot}/index.js`);

const connectionRevision = () => createIntegrationConnectionRevisionV1({
  connection_id: "connection-1",
  revision: 1,
  connector_definition_ref: "resource:mcp-definition-1",
  configuration: { transport: "https", region: "us-east-1" },
  credential_ref: {
    credential_ref: "credential:tenant-1:provider-1",
    credential_version: "v3",
    secret_store_ref: "secret-store:primary",
  },
  lifecycle: "active",
  commit: { created_by: "principal:admin", committed_at: 100, change_reason: "initial connection" },
});

test("IMP-03A Connection and Channel preserve immutable tenant-scoped historical references", () => {
  const connection = connectionRevision();
  const connectionHead = createIntegrationConnectionDefinitionV1({
    connection_id: "connection-1",
    tenant_id: "tenant-1",
    connector_definition_ref: "resource:mcp-definition-1",
    lifecycle: "active",
    current_revision: 1,
    created_at: 100,
    updated_at: 100,
  });
  const channel = createIntegrationChannelRevisionV1({
    channel_id: "channel-1",
    revision: 1,
    connection_revision_ref: connection.ref,
    direction: "ingress",
    endpoint: { kind: "webhook", uri: "https://provider.example.test/hooks/inbound" },
    admission_policy_ref: "policy:channel-admission-v1",
    lifecycle: "active",
    commit: { created_by: "principal:admin", committed_at: 100, change_reason: "initial channel" },
  });
  const channelHead = createIntegrationChannelDefinitionV1({
    channel_id: "channel-1",
    tenant_id: "tenant-1",
    lifecycle: "active",
    current_revision: 1,
    created_at: 100,
    updated_at: 100,
  });

  assert.equal(connectionHead.tenant_id, "tenant-1");
  assert.equal(channelHead.tenant_id, "tenant-1");
  assert.deepEqual(channel.connection_revision_ref, connection.ref);
  assert.equal(Object.isFrozen(channel), true);
});

test("IMP-03A rejects secret material and unsafe endpoint credentials in canonical contracts", () => {
  assert.throws(() => createIntegrationConnectionRevisionV1({
    connection_id: "connection-unsafe",
    revision: 1,
    connector_definition_ref: "resource:provider-1",
    configuration: { api_key: "plaintext-forbidden" },
    lifecycle: "active",
    commit: { created_by: "principal:admin", committed_at: 100, change_reason: "unsafe" },
  }), NativeContractValidationError);

  assert.throws(() => createIntegrationChannelRevisionV1({
    channel_id: "channel-unsafe",
    revision: 1,
    connection_revision_ref: connectionRevision().ref,
    direction: "ingress",
    endpoint: { kind: "webhook", uri: "https://user:password@provider.example.test/hooks" },
    lifecycle: "active",
    commit: { created_by: "principal:admin", committed_at: 100, change_reason: "unsafe" },
  }), NativeContractValidationError);
});

test("IMP-03A schema version 8 adds exactly the four additive Integration tables", () => {
  assert.equal(SHARED_STATE_SCHEMA_VERSION, 8);
  const migration = SHARED_STATE_MIGRATIONS.find((entry) => entry.version === 8);
  assert.ok(migration);
  const sql = migration.statements.join("\n");
  for (const table of [
    "acs_integration_connections",
    "acs_integration_connection_revisions",
    "acs_integration_channels",
    "acs_integration_channel_revisions",
  ]) assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.match(sql, /FOREIGN KEY \(connection_id, tenant_id, connection_revision, connection_fingerprint\)/);
  assert.match(sql, /acs_integration_connection_head_fk/);
  assert.match(sql, /acs_integration_channel_head_fk/);
  assert.doesNotMatch(sql, /DROP TABLE|DELETE FROM|TRUNCATE/i);
});

test("IMP-03A has no legacy SQLite import or persistence bridge", async () => {
  const sources = await Promise.all([
    readFile(new URL("../src/native-core/integration.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/control-plane/shared-state/migrations.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(sources.join("\n"), /sqlite|legacy import|backfill/i);
  assert.equal(ACS_NATIVE_SCHEMA_VERSION, "1.0");
});
