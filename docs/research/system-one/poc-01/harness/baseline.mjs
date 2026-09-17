import { DIMENSIONS, LEVEL_LABELS } from "./schema.mjs";

const tokens = (value) => new Set(String(value ?? "").toLowerCase().match(/[a-z0-9]+/g) ?? []);

function lexicalCoverage(task, evidence) {
  const taskTokens = tokens(task);
  const evidenceTokens = tokens(evidence.map((item) => item.content).join(" "));
  if (!taskTokens.size) return 0;
  return [...taskTokens].filter((token) => evidenceTokens.has(token)).length / taskTokens.size;
}
function qualitySignal(evidence) {
  if (!evidence.length) return 0;
  const complete = evidence.filter((item) => item.provenance?.locator && item.provenance?.captured_at && item.provenance?.hash).length;
  const partial = evidence.filter((item) => item.provenance?.locator).length;
  return complete / evidence.length >= 0.5 ? 3 : partial / evidence.length >= 0.5 ? 2 : 1;
}

function outputSignal(input) {
  const sections = new Set(input.candidate_output?.included_sections ?? []);
  return Math.max(0, Math.min(3, sections.size - 1));
}

export function evaluateWithBaseline(record) {
  const { input } = record;
  const evidence = input.evidence ?? [];
  const coverage = lexicalCoverage(`${input.task} ${input.request?.question}`, evidence);
  const relevance = coverage >= 0.35 ? 3 : coverage >= 0.2 ? 2 : coverage >= 0.08 ? 1 : 0;
  const adherence = input.candidate_output?.text?.includes("Synthetic response") ? 2 : 0;
  const completeness = outputSignal(input);
  const quality = qualitySignal(evidence);
  const values = { relevance, evidence_quality: quality, instruction_adherence: adherence, output_completeness: completeness };

  return {
    provider: "acs-deterministic-baseline",
    result_state: "answered",
    judgments: Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, {
      level: values[dimension],
      label: LEVEL_LABELS[values[dimension]],
      confidence: null,
      probabilities: null,
      basis: "deterministic lexical/provenance rule"
    }]))
  };
}
