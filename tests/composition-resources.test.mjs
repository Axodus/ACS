import assert from "node:assert/strict";
import test from "node:test";
import { CompositionResourceRegistry, CompositionResourceService, NotFoundError } from "../dist/index.js";

test("composition resources list deterministically across roles, profiles, skills, tools, and capabilities", () => {
  const service = new CompositionResourceService();
  assert.deepEqual(service.listRoles().map((item) => item.id), ["role.executor", "role.planner"]);
  assert.deepEqual(service.listProfiles().map((item) => item.id), ["profile.default"]);
  assert.deepEqual(service.listSkills().map((item) => item.id), ["skill.analysis"]);
  assert.deepEqual(service.listTools().map((item) => item.id), ["tool.registry"]);
  assert.equal(service.listCapabilities().some((item) => item.id === "product.trading-ignition"), true);
});

test("unknown governed resources fail cleanly", () => {
  const service = new CompositionResourceService();
  assert.throws(() => service.getRole("missing"), NotFoundError);
  assert.throws(() => service.getTool("missing"), NotFoundError);
});

test("role and profile references remain revision-aware", () => {
  const service = new CompositionResourceService();
  const findings = service.validateReferences({
    role: { id: "role.executor", revision: 1 },
    profile: { id: "profile.default", revision: 2 },
  });
  assert.equal(findings.every((finding) => finding.code === "RESOURCE_REVISION_STALE"), true);
});

test("capability and skill/tool validation is deterministic and secret-free", () => {
  const registry = new CompositionResourceRegistry();
  const findings = registry.validateReferences({
    skills: [{ id: "skill.analysis", revision: 1 }],
    tools: [{ id: "tool.registry", revision: 1 }],
    capabilities: ["core.governance-alignment", "missing.capability"],
  });
  assert.equal(findings.find((finding) => finding.code === "RESOURCE_CAPABILITY_UNKNOWN")?.message.includes("missing.capability"), true);
  assert.equal(JSON.stringify({
    roles: registry.list("role"),
    profiles: registry.list("profile"),
    skills: registry.list("skill"),
    tools: registry.list("tool"),
  }).includes("secret"), false);
});
