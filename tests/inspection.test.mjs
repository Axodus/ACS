import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  inspectCapabilities,
  inspectPolicyCheck,
  inspectPolicyMatrix,
  inspectProductAccess,
  inspectTenantServices,
} from "../dist/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, "..", "scripts", "acs.mjs");

test("lists all capabilities and filters by level", () => {
  const all = inspectCapabilities();
  const core = inspectCapabilities({ level: "core" });
  const service = inspectCapabilities({ level: "service" });
  const product = inspectCapabilities({ level: "product" });

  assert.ok(all.capabilities.length >= 6);
  assert.ok(core.capabilities.every((capability) => capability.consumptionLevel === "core"));
  assert.ok(service.capabilities.every((capability) => capability.consumptionLevel === "service"));
  assert.ok(product.capabilities.every((capability) => capability.consumptionLevel === "product"));
});

test("lists all tenant services and filters by tenant", () => {
  const all = inspectTenantServices();
  const tenant = inspectTenantServices({ tenantId: "dao-alpha" });

  assert.ok(all.tenants.length >= 3);
  assert.deepEqual(tenant.tenants.map((entry) => entry.tenantId), ["dao-alpha"]);
  assert.ok(tenant.tenants[0].services.some((service) => service.serviceId === "service.risk-analysis"));
});

test("blocks service access for disabled tenant", () => {
  const tenant = inspectTenantServices({ tenantId: "dao-disabled" });
  const risk = tenant.tenants[0].services.find((service) => service.serviceId === "service.risk-analysis");

  assert.equal(risk.allowed, false);
  assert.match(risk.blockedReason, /has not enabled|suspended/);
});

test("lists product access rules and checks Trading Ignition access", () => {
  const licensed = inspectProductAccess({
    walletAddress: "0xlicensed",
    productId: "product.trading-ignition",
  });
  const unlicensed = inspectProductAccess({
    walletAddress: "0xunlicensed",
    productId: "product.trading-ignition",
  });

  assert.equal(licensed.products[0].productId, "product.trading-ignition");
  assert.equal(licensed.products[0].allowed, true);
  assert.equal(unlicensed.products[0].allowed, false);
  assert.match(unlicensed.products[0].blockedReason, /valid NFT license|marketplace purchase/);
});

test("policy-check returns governance and automation metadata", () => {
  const result = inspectPolicyCheck({
    capabilityId: "product.trading-ignition",
    tenantId: "dao-alpha",
  });

  assert.equal(result.capabilityId, "product.trading-ignition");
  assert.equal(result.automationLevel, "manual_approval");
  assert.equal(result.requiresGovernanceApproval, true);
  assert.equal(result.telemetryRequired, true);
  assert.equal(result.receiptsRequired, true);
});

test("policy matrix inspection exposes automation metadata", () => {
  const result = inspectPolicyMatrix();
  const withdraw = result.policies.find((policy) => policy.capabilityId === "withdraw.funds");

  assert.equal(withdraw.automationLevel, "blocked");
  assert.equal(withdraw.telemetryRequired, true);
  assert.equal(withdraw.receiptsRequired, true);
});

test("inspection CLI commands return valid JSON without runtime side effects", () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-inspection-cli-"));

  try {
    const commands = [
      ["capabilities"],
      ["capabilities", "--level", "product"],
      ["tenant-services"],
      ["tenant-services", "--tenant", "dao-alpha"],
      ["product-access", "--wallet", "0xlicensed", "--product", "product.trading-ignition"],
      ["policy-matrix"],
      ["policy-check", "--capability", "product.trading-ignition", "--tenant", "dao-alpha"],
    ];

    for (const command of commands) {
      const output = execFileSync(process.execPath, [cliPath, ...command], {
        cwd: workspace,
        encoding: "utf8",
      });
      assert.doesNotThrow(() => JSON.parse(output), command.join(" "));
    }

    assert.equal(existsSync(join(workspace, ".acs")), false);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

