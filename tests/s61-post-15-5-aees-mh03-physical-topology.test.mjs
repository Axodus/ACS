import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createAeesMh03PreflightManifest,
  writeAeesMh03PreflightManifest,
} from "../scripts/certify-aees-mh03-preflight.mjs";

test("MH03 refuses to promote multiple local processes or containers to physical multi-host", () => {
  const manifest = createAeesMh03PreflightManifest();

  assert.equal(manifest.prerequisites.AEES_SH, "PASS");
  assert.equal(manifest.prerequisites.MH02, "PASS");
  assert.equal(manifest.topology.classification, "SINGLE_PHYSICAL_HOST_ONLY");
  assert.equal(manifest.topology.verifiedPhysicalHostCount, 1);
  assert.equal(manifest.topology.requiredPhysicalHostCount, 2);
  assert.equal(manifest.topology.loopbackOrSameHostSubstitutesAccepted, false);
  assert.equal(manifest.gates.MH03_A.result, "FAIL");
  assert.equal(manifest.gates.MH03_B.result, "NOT_STARTED_BY_GATE");
  assert.equal(manifest.gates.MH03_C.result, "NOT_STARTED_BY_GATE");
  assert.equal(manifest.gates.MH03_D.result, "NOT_STARTED_BY_GATE");
  assert.equal(manifest.gates.MH03_E.decision, "NOT_CERTIFIED");
  assert.equal(manifest.certificationResult, "NOT_CERTIFIED");
});

test("MH03 terminal evidence retains prior certifications and contains no credentials", () => {
  const directory = mkdtempSync(join(tmpdir(), "acs-aees-mh03-"));
  const outputPath = join(directory, "manifest.json");
  try {
    writeAeesMh03PreflightManifest(outputPath);
    const raw = readFileSync(outputPath, "utf8");
    const manifest = JSON.parse(raw);

    assert.equal(manifest.inheritedBoundaries.sharedDatabase, "POSTGRESQL_NETWORK_ADAPTER_CERTIFIED_DUAL_PROCESS_SINGLE_HOST");
    assert.equal(manifest.inheritedBoundaries.vault, "SINGLE_INSTANCE_EXTERNAL");
    assert.equal(manifest.residuals.find((item) => item.id === "ACS-ORG-019")?.status, "OPEN_BLOCKER");
    assert.equal(manifest.failureDomainMatrix.every((item) => item.result === "NOT_EXECUTED_BY_GATE"), true);
    assert.equal(raw.includes("Bearer "), false);
    assert.equal(raw.includes("BEGIN PRIVATE KEY"), false);
    assert.equal(raw.includes("postgresql://"), false);
    assert.equal(raw.includes("secretValue"), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
