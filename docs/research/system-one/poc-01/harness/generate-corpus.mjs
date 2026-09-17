import { mkdir, writeFile } from "node:fs/promises";
import { DIMENSIONS, LEVEL_LABELS } from "./schema.mjs";

const CORPUS_PATH = new URL("../corpus/phase-0.jsonl", import.meta.url);
const MANIFEST_PATH = new URL("../corpus/manifest.json", import.meta.url);

const levelText = {
  0: "does not support the requested claim",
  1: "offers only tangential or incomplete support",
  2: "partially supports the requested claim with a stated limitation",
  3: "directly supports the requested claim with relevant detail"
};

const familyFor = (index) => {
  if (index < 192) return "clean_stratified";
  if (index < 200) return "ambiguous_insufficient";
  if (index < 208) return "conflicting";
  if (index < 216) return "partial";
  return "adversarial_edge";
};

const splitFor = (index) => index < 120 ? "development" : index < 168 ? "calibration" : "holdout";

function levelFor(index, dimensionIndex, family) {
  if (family === "ambiguous_insufficient") return dimensionIndex === 0 ? 1 : 1;
  if (family === "conflicting") return dimensionIndex === 1 ? 0 : 2;
  if (family === "partial") return dimensionIndex === 3 ? 1 : 2;
  if (family === "adversarial_edge") return dimensionIndex % 2 === 0 ? 2 : 1;
  return (index + dimensionIndex) % 4;
}

function evidenceFor(index, relevance, quality, family) {
  const evidence = [];
  if (relevance >= 2) {
    evidence.push({
      id: `syn-evidence-${String(index + 1).padStart(3, "0")}-a`,
      source: quality >= 2 ? "synthetic-primary-record" : "synthetic-secondary-note",
      content: `Synthetic finding ${index + 1} ${levelText[relevance]}.`,
      provenance: quality >= 2
        ? { locator: `synthetic://record/${index + 1}`, captured_at: "2026-09-17T00:00:00Z", hash: `sha256-synthetic-${index + 1}` }
        : { locator: `synthetic://note/${index + 1}` }
    });
  } else {
    evidence.push({
      id: `syn-evidence-${String(index + 1).padStart(3, "0")}-a`,
      source: "synthetic-unrelated-record",
      content: "Synthetic background detail that does not answer the requested question.",
      provenance: quality >= 2 ? { locator: `synthetic://background/${index + 1}` } : {}
    });
  }

  if (family === "conflicting") {
    evidence.push({
      id: `syn-evidence-${String(index + 1).padStart(3, "0")}-b`,
      source: "synthetic-conflicting-record",
      content: "Synthetic finding states the opposite conclusion and cannot be reconciled from the supplied context.",
      provenance: { locator: `synthetic://conflict/${index + 1}`, captured_at: "2026-09-17T00:00:00Z" }
    });
  }
  return evidence;
}

function candidateOutput(index, adherence, completeness) {
  const required = ["answer", "supporting evidence", "limitation", "next step"];
  const included = required.slice(0, Math.max(0, Math.min(required.length, completeness + 1)));
  const instruction = adherence === 0
    ? "Unstructured synthetic response that ignores the requested format."
    : `Synthetic response ${index + 1}: ${included.join(", ")}.`;
  return { text: instruction, included_sections: included };
}

function makeUniqueCase(index) {
  const family = familyFor(index);
  const dimensions = Object.fromEntries(DIMENSIONS.map((dimension, dimensionIndex) => [
    dimension,
    levelFor(index, dimensionIndex, family)
  ]));
  const ambiguity = family === "ambiguous_insufficient" ? "genuine_ambiguity"
    : family === "conflicting" ? "conflicting_evidence"
      : family === "partial" ? "partial_support"
        : family === "adversarial_edge" ? "adversarial_wording" : "none";

  return {
    case_id: `syn-${String(index + 1).padStart(3, "0")}`,
    unique_case_id: `syn-${String(index + 1).padStart(3, "0")}`,
    case_family: family,
    split: splitFor(index),
    input: {
      task: "Evaluate whether synthetic evidence supports a requested operational claim.",
      request: {
        question: `Does synthetic finding ${index + 1} support the requested claim?`,
        requirements: ["give a bounded answer", "cite supplied evidence", "state limitations", "name a next step"]
      },
      evidence: evidenceFor(index, dimensions.relevance, dimensions.evidence_quality, family),
      candidate_output: candidateOutput(index, dimensions.instruction_adherence, dimensions.output_completeness)
    },
    expected: {
      dimensions,
      ambiguity_classification: ambiguity,
      rationale: `Synthetic adjudication: ${DIMENSIONS.map((dimension) => `${dimension}=${LEVEL_LABELS[dimensions[dimension]]}`).join(", ")}.`
    }
  };
}

const uniqueCases = Array.from({ length: 216 }, (_, index) => makeUniqueCase(index));
const repeatSourceIndexes = Array.from({ length: 24 }, (_, index) => (index * 9) % 216);
const repeats = repeatSourceIndexes.map((sourceIndex, repeatIndex) => {
  const source = uniqueCases[sourceIndex];
  return {
    ...structuredClone(source),
    case_id: `syn-repeat-${String(repeatIndex + 1).padStart(3, "0")}`,
    repeat_of: source.unique_case_id,
    split: "repeat"
  };
});
const records = [...uniqueCases, ...repeats];

await mkdir(new URL("../corpus/", import.meta.url), { recursive: true });
await writeFile(CORPUS_PATH, records.map((record) => JSON.stringify(record)).join("\n") + "\n");
await writeFile(MANIFEST_PATH, JSON.stringify({
  generated_at: "2026-09-17",
  generator: "docs/research/system-one/poc-01/harness/generate-corpus.mjs",
  data_classification: "synthetic/fabricated only",
  total_evaluations: records.length,
  unique_cases: uniqueCases.length,
  repeat_cases: repeats.length,
  family_counts: Object.fromEntries([...new Set(records.map((record) => record.case_family))].map((family) => [family, records.filter((record) => record.case_family === family).length])),
  split_counts: Object.fromEntries([...new Set(records.map((record) => record.split))].map((split) => [split, records.filter((record) => record.split === split).length])),
  dimensions: DIMENSIONS
}, null, 2) + "\n");

console.log(JSON.stringify({ total: records.length, unique: uniqueCases.length, repeats: repeats.length }, null, 2));
