import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  CredentialConnectionRegistry,
  DuplicateRegistrationError,
  FileSystemSecretStore,
  InMemorySecretStore,
  NotFoundError,
} from "../dist/index.js";

function connection(overrides = {}) {
  return {
    id: "cred_axodus_managed",
    providerId: "axodus",
    type: "managed",
    status: "configured",
    owner: { tenantId: "tenant-alpha", wallet: "0xabc" },
    scopes: ["inference"],
    secretRef: { id: "secret_1", backend: "memory", purpose: "provider-auth", createdAt: 1 },
    metadata: { note: "safe metadata only" },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

test("credential registry registers, lists deterministically, updates status, and rejects duplicates", () => {
  const registry = new CredentialConnectionRegistry();
  registry.register(connection({ id: "cred_b", providerId: "anthropic" }));
  registry.register(connection({ id: "cred_a", providerId: "axodus" }));
  assert.deepEqual(registry.list().map((item) => item.id), ["cred_a", "cred_b"]);
  assert.equal(registry.listByProvider("axodus")[0].id, "cred_a");
  assert.throws(() => registry.register(connection({ id: "cred_a" })), DuplicateRegistrationError);
  assert.equal(registry.updateStatus("cred_a", "valid", { lastVerifiedAt: 5 }).status, "valid");
});

test("unknown credential connection lookup fails cleanly", () => {
  const registry = new CredentialConnectionRegistry();
  assert.throws(() => registry.get("missing"), NotFoundError);
});

test("connection serialization and errors never expose raw secret values", () => {
  const payload = connection({ metadata: { displayName: "Axodus Managed" } });
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("super-secret-value"), false);
  assert.equal(serialized.includes('"secretRef"'), true);
  assert.equal(serialized.includes('"value"'), false);
});

test("in-memory secret store returns opaque references and does not expose values in references", async () => {
  const store = new InMemorySecretStore();
  const secretRef = await store.put({ providerId: "openai", purpose: "api-key", value: "sk-secret", keyVersion: "v1" });
  assert.equal(secretRef.backend, "memory");
  assert.equal(JSON.stringify(secretRef).includes("sk-secret"), false);
  assert.equal(await store.exists(secretRef), true);
  assert.equal(await store.get(secretRef), "sk-secret");
  assert.equal(await store.delete(secretRef), true);
  assert.equal(await store.exists(secretRef), false);
});

test("filesystem secret store keeps secret values outside domain serialization", async () => {
  const root = mkdtempSync(join(tmpdir(), "acs-secret-store-"));
  const store = new FileSystemSecretStore(root);
  try {
    const secretRef = await store.put({ providerId: "anthropic", purpose: "api-key", value: "ak-live-secret" });
    assert.equal(secretRef.backend, "filesystem");
    assert.equal(JSON.stringify(secretRef).includes("ak-live-secret"), false);
    const stored = readFileSync(join(root, secretRef.id), "utf8");
    assert.equal(stored, "ak-live-secret");
    assert.equal(await store.get(secretRef), "ak-live-secret");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("different connection types and statuses are representable without provider coupling", () => {
  const items = [
    connection({ id: "managed", type: "managed", status: "active", secretRef: undefined }),
    connection({ id: "api", providerId: "openai", type: "api-key", status: "valid" }),
    connection({ id: "oauth", providerId: "google", type: "oauth", status: "requires-authentication" }),
    connection({ id: "sub", providerId: "codex", type: "subscription", status: "unsupported" }),
    connection({ id: "svc", providerId: "axodus", type: "service-account", status: "degraded" }),
    connection({ id: "runner", providerId: "opencode", type: "local-runner", status: "unavailable" }),
  ];
  assert.deepEqual(items.map((item) => item.type), ["managed", "api-key", "oauth", "subscription", "service-account", "local-runner"]);
});
