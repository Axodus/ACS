import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { JsonlTelemetrySink } from "../dist/index.js";

test("persists telemetry events as local JSONL records", () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-telemetry-"));
  const telemetryPath = join(workspace, "telemetry", "events.jsonl");

  try {
    const telemetry = new JsonlTelemetrySink(telemetryPath);

    const first = telemetry.record("agent.registered", "redhat", { name: "RedHat Dev" });
    const second = telemetry.record("workflow.started", "dev-coordination");

    assert.match(first.id, /^tel_/);
    assert.match(second.id, /^tel_/);
    assert.notEqual(first.id, second.id);
    assert.equal(telemetry.list().length, 2);
    assert.equal(telemetry.list()[0].subjectId, "redhat");
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
