import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createAeesMhPreflightManifest,
  writeAeesMhPreflightManifest,
} from "../scripts/certify-aees-mh-preflight.mjs";

test("AEES-MH imports the terminal H baseline and fails MH01 without shared multi-host authority", () => {
  const manifest = createAeesMhPreflightManifest();

  assert.equal(manifest.baseline.epic15_5ClosureImported, true);
  assert.equal(manifest.baseline.certifiedTopology, "PRODUCTION_LIKE_SINGLE_HOST");
  assert.equal(manifest.baseline.globalProductionClaim, "NOT_CERTIFIED");
  assert.equal(manifest.baseline.residuals.length, 7);
  assert.equal(manifest.baseline.residuals.every((item) => item.imported), true);
  assert.equal(manifest.discovery.stateInventory.length, 7);
  assert.equal(
    manifest.discovery.stateInventory.every((item) => item.classification === "SINGLE_HOST_LOCAL"),
    true,
  );
  assert.equal(manifest.gates.MH01.result, "FAIL");
  assert.equal(manifest.gates.MH02.result, "NOT_STARTED_BY_GATE");
  assert.equal(manifest.gates.MH03.result, "NOT_STARTED_BY_GATE");
  assert.equal(manifest.validation.epic15_5CoreFiles, "14/14 PASS");
  assert.equal(manifest.validation.loopbackProcessScenarios, "26/26 PASS_OUTSIDE_SANDBOX");
  assert.equal(manifest.certificationResult, "NOT_CERTIFIED");
  assert.equal(manifest.sensitiveEvidenceMatches, 0);
});

test("AEES-MH evidence manifest is structured, bounded, and credential-free", () => {
  const directory = mkdtempSync(join(tmpdir(), "acs-aees-mh-"));
  const outputPath = join(directory, "manifest.json");
  try {
    writeAeesMhPreflightManifest(outputPath);
    const raw = readFileSync(outputPath, "utf8");
    const manifest = JSON.parse(raw);

    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.gates.MH01.result, "FAIL");
    assert.equal(raw.includes("Bearer "), false);
    assert.equal(raw.includes("ACS_VAULT_TOKEN="), false);
    assert.equal(raw.includes("BEGIN PRIVATE KEY"), false);
    assert.equal(raw.includes("secretValue"), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
