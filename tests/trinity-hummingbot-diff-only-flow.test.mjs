import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  createHummingbotDiffProposal,
  createHummingbotDiffProposalFixture,
  ensureDiffOutputRootAllowed,
  evaluateHummingbotDiffOnlyAction,
  saveHummingbotDiffProposal,
} from "../dist/index.js";

test("Trinity can generate Hummingbot diff proposal without mutation permissions", () => {
  const proposal = createHummingbotDiffProposal(createHummingbotDiffProposalFixture());

  assert.equal(proposal.status, "created");
  assert.match(proposal.diffText, /RSI_OVERBOUGHT/);
  assert.equal(proposal.sidecar.capabilityId, "trading.hummingbot.strategy.diff_proposal");
  assert.equal(proposal.sidecar.mode, "diff_only");
  assert.equal(proposal.sidecar.realFileMutationAllowed, false);
  assert.equal(proposal.sidecar.applyPatchAllowed, false);
  assert.equal(proposal.sidecar.secretsAccessAllowed, false);
  assert.equal(proposal.sidecar.connectorAccessAllowed, false);
  assert.equal(proposal.sidecar.hummingbotRuntimeAllowed, false);
  assert.equal(proposal.sidecar.backtestAllowed, false);
  assert.equal(proposal.sidecar.networkAllowed, false);
  assert.equal(proposal.sidecar.mcpAllowed, false);
  assert.equal(proposal.auditEvidence.includes("apply_patch_blocked"), true);
  assert.match(proposal.proofReport, /Artifact was produced as text only/);
  assert.match(proposal.consoleSnapshot, /applyPatchAllowed=false/);
});

test("diff proposal saves sidecar, proof report, console snapshot, and proposal inside output allowlist", () => {
  const root = mkdtempSync(join("/tmp", "acs-hb-diff-"));
  const saved = saveHummingbotDiffProposal(createHummingbotDiffProposalFixture(), {
    cwd: "/",
    outputRoot: root,
    allowlist: [root],
  });

  assert.equal(saved.outputDir.startsWith(root), true);
  assert.equal(existsSync(saved.files.proposalMarkdown), true);
  assert.equal(existsSync(saved.files.sidecarJson), true);
  assert.equal(existsSync(saved.files.proofReport), true);
  assert.equal(existsSync(saved.files.consoleSnapshot), true);

  const sidecar = JSON.parse(readFileSync(saved.files.sidecarJson, "utf8"));
  assert.equal(sidecar.applyPatchAllowed, false);
  assert.equal(sidecar.secretsAccessAllowed, false);
  assert.equal(sidecar.connectorAccessAllowed, false);
  assert.equal(sidecar.auditRequired, true);
  assert.equal(sidecar.evidenceRequired, true);

  const proof = readFileSync(saved.files.proofReport, "utf8");
  const consoleSnapshot = readFileSync(saved.files.consoleSnapshot, "utf8");
  assert.match(proof, /Output root must pass ACS allowlist validation/);
  assert.match(consoleSnapshot, /hummingbotRuntimeAllowed=false/);
});

test("output root outside allowlist is rejected", () => {
  assert.throws(
    () => ensureDiffOutputRootAllowed("/tmp/not-allowed", ["/tmp/allowed"], "/"),
    /diff_output_root_not_allowlisted/,
  );
});

test("apply patch and secret access attempts are denied", () => {
  const applyPatch = evaluateHummingbotDiffOnlyAction("apply_patch");
  const secrets = evaluateHummingbotDiffOnlyAction("access_api_keys");
  const connector = evaluateHummingbotDiffOnlyAction("access_connector");

  assert.equal(applyPatch.allowed, false);
  assert.equal(applyPatch.blockedReason, "diff_only_flow_blocks_side_effect");
  assert.equal(applyPatch.reasonCodes.includes("apply_patch_no_go"), true);
  assert.equal(secrets.allowed, false);
  assert.equal(secrets.reasonCodes.includes("secret_access_no_go"), true);
  assert.equal(connector.allowed, false);
  assert.equal(connector.reasonCodes.includes("connector_access_no_go"), true);
});

test("sensitive Hummingbot paths are rejected before artifact creation", () => {
  const fixture = createHummingbotDiffProposalFixture();

  assert.throws(
    () => createHummingbotDiffProposal({
      ...fixture,
      sourceStrategyPath: "/mnt/d/Rede/Github/Axodus/tradingbot/conf/connectors/binance.yml",
    }),
    /sensitive_hummingbot_path_forbidden/,
  );

  assert.throws(
    () => createHummingbotDiffProposal({
      ...fixture,
      targetStrategyPath: "/mnt/d/Rede/Github/Axodus/tradingbot/hummingbot/connector/exchange/binance/binance_auth.py",
    }),
    /sensitive_hummingbot_path_forbidden/,
  );
});

test("non diff-only ACS decision cannot create a diff proposal", () => {
  const fixture = createHummingbotDiffProposalFixture();

  assert.throws(
    () => createHummingbotDiffProposal({
      ...fixture,
      acsDecision: {
        ...fixture.acsDecision,
        decision: "pending_approval",
        allowedModes: ["approval_required"],
      },
    }),
    /acs_decision_not_diff_only/,
  );
});

test("diff proposal schema and documentation are present", () => {
  const schemaPath = join(process.cwd(), "src", "schemas", "hummingbot-diff-proposal.schema.yaml");
  const docsPath = join(process.cwd(), ".instructions", "ACS_TRINITY_HUMMINGBOT_DIFF_ONLY_FLOW.md");
  const schema = readFileSync(schemaPath, "utf8");
  const docs = readFileSync(docsPath, "utf8");

  assert.equal(existsSync(schemaPath), true);
  assert.equal(existsSync(docsPath), true);
  assert.match(schema, /applyPatchAllowed/);
  assert.match(schema, /secretsAccessAllowed/);
  assert.match(schema, /proofReport/);
  assert.match(schema, /consoleSnapshot/);
  assert.match(docs, /apply patch attempts are denied/i);
  assert.match(docs, /No real Hummingbot file is altered/i);
});
