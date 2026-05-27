import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  createTrinityTelegramResponseFixtures,
  createTrinityTelegramResponseTemplate,
  getTrinityTelegramResponseTemplateCatalog,
} from "../dist/index.js";

function byKind(kind) {
  const context = createTrinityTelegramResponseFixtures()
    .find((fixture) => createTrinityTelegramResponseTemplate(fixture).kind === kind);
  assert.ok(context, `missing ${kind}`);
  return createTrinityTelegramResponseTemplate(context);
}

test("Trinity Telegram response catalog covers required template types", () => {
  const kinds = getTrinityTelegramResponseTemplateCatalog().map((entry) => entry.kind);

  for (const kind of [
    "research_allowed",
    "artifact_pending",
    "diff_proposal",
    "sandbox_mutation_pending",
    "artifact_created",
    "blocked",
    "human_review",
    "default_deny",
  ]) {
    assert.equal(kinds.includes(kind), true, kind);
  }
});

test("research allowed template does not claim file writes", () => {
  const response = byKind("research_allowed");

  assert.equal(response.decision, "allow_report_only");
  assert.match(response.text, /Posso responder com análise técnica/);
  assert.match(response.text, /Nenhuma escrita de arquivo/);
  assert.equal(response.communicatesBlockedActions, true);
  assert.equal(response.claimsUnauthorizedAction, false);
});

test("artifact pending template explains output allowlist, proof, rollback, and evidence", () => {
  const response = byKind("artifact_pending");

  assert.equal(response.decision, "route_to_artifact_flow");
  assert.match(response.text, /output allowlist, proof, rollback e evidence/);
  assert.match(response.text, /Nada foi salvo por Trinity neste canal/);
  assert.equal(response.communicatesBlockedActions, true);
});

test("pending sandbox mutation template requires approval and ticket", () => {
  const response = byKind("sandbox_mutation_pending");

  assert.equal(response.decision, "pending_approval");
  assert.match(response.text, /approval, execution ticket, sandbox, proof e rollback/);
  assert.match(response.text, /Nenhuma criação, edição, desativação ou remoção foi executada agora/);
  assert.equal(response.claimsUnauthorizedAction, false);
});

test("diff proposal template references output and does not claim patch application", () => {
  const response = byKind("diff_proposal");

  assert.equal(response.decision, "allow_diff_only");
  assert.match(response.text, /proposta de diff auditável/);
  assert.match(response.text, /Nenhum patch foi aplicado/);
  assert.match(response.text, /OutputRef:/);
  assert.match(response.text, /EvidenceRef:/);
  assert.doesNotMatch(response.text, /patch aplicado/i);
});

test("artifact created template references evidence without implying runtime execution", () => {
  const response = byKind("artifact_created");

  assert.equal(response.kind, "artifact_created");
  assert.match(response.text, /Artifact registrado pelo ACS/);
  assert.match(response.text, /não implica execução ou runtime real/);
  assert.match(response.text, /RollbackRef:/);
});

test("blocked and default deny templates communicate denial safely", () => {
  const blocked = byKind("blocked");
  const deny = byKind("default_deny");

  assert.match(blocked.text, /bloqueada pela política ACS/);
  assert.match(blocked.text, /Modo permitido: nenhum/);
  assert.match(deny.text, /Sem decisão ACS válida/);
  assert.match(deny.text, /Ausência de resposta ACS não é permissão/);
});

test("templates sanitize sensitive terms", () => {
  const fixture = createTrinityTelegramResponseFixtures()[0];
  const response = createTrinityTelegramResponseTemplate({
    ...fixture,
    outputRef: "conf/connectors/binance_api_key_secret.yml",
    evidenceRef: "api_secret=SHOULD_NOT_RENDER",
  });

  assert.equal(response.exposesSensitiveDetails, false);
  assert.doesNotMatch(response.text, /api_key/i);
  assert.doesNotMatch(response.text, /api_secret/i);
  assert.doesNotMatch(response.text, /conf\/connectors/i);
  assert.match(response.text, /\[sensitive-ref\]/);
});

test("response contract documentation is present", () => {
  const docsPath = join(process.cwd(), ".instructions", "ACS_TRINITY_TELEGRAM_RESPONSE_CONTRACT.md");
  const docs = readFileSync(docsPath, "utf8");

  assert.equal(existsSync(docsPath), true);
  assert.match(docs, /Research Allowed/);
  assert.match(docs, /Artifact Pending/);
  assert.match(docs, /Strategy Mutation Pending/);
  assert.match(docs, /Diff Proposal/);
  assert.match(docs, /Blocked/);
});
