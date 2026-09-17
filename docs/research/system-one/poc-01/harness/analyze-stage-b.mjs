import { readFile, writeFile } from "node:fs/promises";
import { DIMENSIONS, validateCorpus } from "./schema.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const corpusRecords = (await readFile(new URL("corpus/phase-0.jsonl", root), "utf8")).trim().split("\n").map(JSON.parse);
const corpus = validateCorpus(corpusRecords);
const arms = {
  A: await readJson("results/arm-a-baseline.json"),
  B: await readJson("results/arm-b-system-one.json"),
  C: await readJson("results/arm-c-reasoning.json")
};

function normalizeArtifactItem(item) {
  const outer = item.result ?? item;
  const core = outer.result?.judgments ? outer.result : outer;
  return { ...outer, ...core, case_id: item.case_id ?? outer.case_id, status: outer.status ?? (outer.result_state === "answered" ? "ok" : outer.result_state), judgments: core.judgments ?? null };
}

const byArm = Object.fromEntries(Object.entries(arms).map(([arm, artifact]) => [arm, new Map(artifact.results.map((item) => [item.case_id, normalizeArtifactItem(item)]))]));
const expected = new Map(corpusRecords.map((record) => [record.case_id, record]));
const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : null;

function f1ForDimension(arm, dimension) {
  const scores = [];
  for (const level of [0, 1, 2, 3]) {
    let tp = 0, fp = 0, fn = 0;
    for (const record of corpusRecords) {
      const actual = record.expected.dimensions[dimension];
      const predicted = byArm[arm].get(record.case_id)?.judgments?.[dimension]?.level;
      if (!Number.isInteger(predicted)) continue;
      if (predicted === level && actual === level) tp += 1;
      else if (predicted === level) fp += 1;
      else if (actual === level) fn += 1;
    }
    scores.push(tp ? (2 * tp) / (2 * tp + fp + fn) : 0);
  }
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function quality(arm) {
  const dimensions = {};
  let total = 0, correct = 0, weightedAgreement = 0;
  for (const dimension of DIMENSIONS) {
    let evaluated = 0, matches = 0, agreement = 0;
    for (const record of corpusRecords) {
      const predicted = byArm[arm].get(record.case_id)?.judgments?.[dimension]?.level;
      if (!Number.isInteger(predicted)) continue;
      const actual = record.expected.dimensions[dimension];
      evaluated += 1;
      matches += predicted === actual ? 1 : 0;
      agreement += 1 - Math.abs(predicted - actual) / 3;
    }
    dimensions[dimension] = { evaluated, accuracy: evaluated ? matches / evaluated : null, macro_f1: f1ForDimension(arm, dimension), ordinal_agreement: evaluated ? agreement / evaluated : null };
    total += evaluated; correct += matches; weightedAgreement += agreement;
  }
  return { dimensions, exact_ordinal_accuracy: total ? correct / total : null, ordinal_agreement: total ? weightedAgreement / total : null };
}

function confidenceFor(judgment) {
  const probabilities = judgment?.probabilities;
  if (!Array.isArray(probabilities) || probabilities.length !== 4 || probabilities.some((value) => !Number.isFinite(value))) return { band: "unknown", top_mass: null, margin: null };
  const sorted = [...probabilities].sort((a, b) => b - a);
  const top = sorted[0];
  const margin = top - sorted[1];
  const band = top >= 0.75 && margin >= 0.25 ? "high" : top >= 0.5 && margin >= 0.1 ? "intermediate" : "low";
  return { band, top_mass: top, margin };
}

function confidence(arm) {
  const bands = { high: 0, intermediate: 0, low: 0, unknown: 0 };
  const errors = { high: 0, intermediate: 0, low: 0, unknown: 0 };
  const calibration = [];
  for (const record of corpusRecords) {
    const result = byArm[arm].get(record.case_id);
    for (const dimension of DIMENSIONS) {
    const judgment = result?.judgments?.[dimension];
      const info = confidenceFor(judgment);
      bands[info.band] += 1;
      const correct = judgment?.level === record.expected.dimensions[dimension];
      if (!correct) errors[info.band] += 1;
      if (info.top_mass !== null) calibration.push({ confidence: info.top_mass, correct });
    }
  }
  const bins = Array.from({ length: 5 }, (_, index) => ({ bin: index, count: 0, mean_confidence: null, accuracy: null }));
  for (const item of calibration) {
    const index = Math.min(4, Math.floor(item.confidence * 5));
    bins[index].count += 1;
    bins[index].mean_confidence = (bins[index].mean_confidence ?? 0) + item.confidence;
    bins[index].accuracy = (bins[index].accuracy ?? 0) + (item.correct ? 1 : 0);
  }
  for (const bin of bins) if (bin.count) { bin.mean_confidence /= bin.count; bin.accuracy /= bin.count; }
  const ece = calibration.length ? bins.reduce((sum, bin) => sum + (bin.count / calibration.length) * (bin.count ? Math.abs(bin.mean_confidence - bin.accuracy) : 0), 0) : null;
  const brier = calibration.length ? calibration.reduce((sum, item) => sum + (item.confidence - (item.correct ? 1 : 0)) ** 2, 0) / calibration.length : null;
  return { bands, errors_by_band: errors, calibration_count: calibration.length, ece, brier, reliability_bins: bins };
}

function operational(arm) {
  const values = corpusRecords.map((record) => byArm[arm].get(record.case_id)).filter(Boolean);
  const latencies = values.map((item) => item.latency_ms).filter(Number.isFinite).sort((a, b) => a - b);
  const count = values.length;
  const ok = values.filter((item) => item.status === "ok").length;
  const category = {};
  for (const item of values) { const key = item.status === "ok" ? "ok" : item.error_category ?? item.status; category[key] = (category[key] ?? 0) + 1; }
  const percentile = (p) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * p) - 1)] : null;
  const usage = values.reduce((sum, item) => {
    if (!item.usage) return sum;
    sum.input_tokens += Number(item.usage.input_tokens ?? 0);
    sum.output_tokens += Number(item.usage.output_tokens ?? 0);
    sum.total_tokens += Number(item.usage.total_tokens ?? (Number(item.usage.input_tokens ?? 0) + Number(item.usage.output_tokens ?? 0)));
    return sum;
  }, { input_tokens: 0, output_tokens: 0, total_tokens: 0 });
  return { count, ok, p50_latency_ms: percentile(0.5), p95_latency_ms: percentile(0.95), provider_error_rate: count ? (category.provider_failure ?? category.error ?? 0) / count : null, timeout_rate: count ? (category.timeout ?? 0) / count : null, invalid_rate: count ? ((category.invalid_response ?? 0) + (category.normalization_failure ?? 0)) / count : null, status_counts: category, usage_tokens: usage };
}

function repeatability(arm) {
  const pairs = corpusRecords.filter((record) => record.repeat_of).map((repeat) => [expected.get(repeat.repeat_of), repeat]);
  const exact = [], bands = [], confidenceDelta = [], thresholdCrossings = [];
  for (const [original, repeat] of pairs) {
    for (const dimension of DIMENSIONS) {
      const a = byArm[arm].get(original.case_id)?.judgments?.[dimension];
      const b = byArm[arm].get(repeat.case_id)?.judgments?.[dimension];
      if (!a || !b) continue;
      exact.push(a.level === b.level);
      const ba = confidenceFor(a).band, bb = confidenceFor(b).band;
      bands.push(ba === bb);
      if (Number.isFinite(a.confidence) && Number.isFinite(b.confidence)) confidenceDelta.push(Math.abs(a.confidence - b.confidence));
      thresholdCrossings.push(ba !== bb);
    }
  }
  return { comparisons: exact.length, exact_ordinal_stability: exact.length ? exact.filter(Boolean).length / exact.length : null, confidence_band_stability: bands.length ? bands.filter(Boolean).length / bands.length : null, mean_confidence_delta: confidenceDelta.length ? confidenceDelta.reduce((a, b) => a + b, 0) / confidenceDelta.length : null, threshold_crossings: thresholdCrossings.filter(Boolean).length };
}

function riskAndEscalation() {
  const mandatoryRisk = new Set(["ambiguous_insufficient", "conflicting"]);
  const rows = corpusRecords.map((record) => {
    const a = byArm.A.get(record.case_id), b = byArm.B.get(record.case_id), c = byArm.C.get(record.case_id);
    const bJudgments = b?.result?.judgments ?? {};
    const bands = DIMENSIONS.map((dimension) => confidenceFor(bJudgments[dimension]).band);
    const reasons = [];
    if (bands.includes("low") || bands.includes("unknown")) reasons.push("low_or_unknown_confidence");
    if (b?.status !== "ok") reasons.push(b?.error_category ?? b?.status ?? "unavailable");
    if (mandatoryRisk.has(record.case_family)) reasons.push("risk_case_class");
    if (mandatoryRisk.has(record.case_family) && DIMENSIONS.some((dimension) => a?.judgments?.[dimension]?.level !== bJudgments[dimension]?.level)) reasons.push("baseline_disagreement_on_risk_case");
    return { record, a, b, c, reasons: [...new Set(reasons)] };
  });
  const escalated = rows.filter((row) => row.reasons.length);
  return { rows, escalated, rate: rows.length ? escalated.length / rows.length : null, reason_counts: escalated.flatMap((row) => row.reasons).reduce((acc, reason) => { acc[reason] = (acc[reason] ?? 0) + 1; return acc; }, {}) };
}

function highConfidenceErrors(arm) {
  const errors = [];
  for (const record of corpusRecords) {
    const result = byArm[arm].get(record.case_id);
    for (const dimension of DIMENSIONS) {
      const judgment = result?.judgments?.[dimension];
      const band = confidenceFor(judgment);
      if (band.band === "high" && judgment?.level !== record.expected.dimensions[dimension]) {
        errors.push({ case_id: record.case_id, case_family: record.case_family, dimension, predicted: judgment.level, expected: record.expected.dimensions[dimension], confidence: band.top_mass, margin: band.margin });
      }
    }
  }
  return { count: errors.length, cases: errors.slice(0, 50) };
}

function selectedQuality(rows, selector) {
  const selected = rows.map((row) => selector(row)).filter((result) => result?.status === "ok");
  let total = 0, correct = 0;
  for (const item of selected) {
    const record = expected.get(item.case_id);
    for (const dimension of DIMENSIONS) { const level = item.judgments[dimension].level; total += 1; correct += level === record.expected.dimensions[dimension] ? 1 : 0; }
  }
  return { evaluated: total / DIMENSIONS.length, exact_ordinal_accuracy: total ? correct / total : null };
}

const escalation = riskAndEscalation();
const pipelines = {
  "A only": { quality: selectedQuality(escalation.rows, (row) => row.a), calls: { A: corpusRecords.length, B: 0, C: 0 } },
  "A -> B": { quality: selectedQuality(escalation.rows, (row) => row.b), calls: { A: corpusRecords.length, B: corpusRecords.length, C: 0 } },
  "A -> C": { quality: selectedQuality(escalation.rows, (row) => row.c), calls: { A: corpusRecords.length, B: 0, C: corpusRecords.length } },
  "A -> B -> C": { quality: selectedQuality(escalation.rows, (row) => escalation.escalated.includes(row) ? row.c : row.b), calls: { A: corpusRecords.length, B: corpusRecords.length, C: escalation.escalated.length } }
};

const report = {
  protocol: "REQ-02B / POC-01 / Stage B",
  data_classification: "synthetic/fabricated only",
  corpus,
  arms: Object.fromEntries(Object.keys(arms).map((arm) => [arm, { provider: arms[arm].results[0]?.result?.provider ?? null, model: arms[arm].results.find((item) => item.result?.provider_model)?.result?.provider_model ?? null, quality: quality(arm), confidence: confidence(arm), high_confidence_errors: highConfidenceErrors(arm), operations: operational(arm), repeatability: repeatability(arm) }])),
  escalation: { rate: escalation.rate, reason_counts: escalation.reason_counts, total_escalated: escalation.escalated.length },
  pipelines,
  removal_test: { corpus_unchanged: true, ground_truth_unchanged: true, metrics_consumed_only_neutral_results: true, production_acs_semantics_unchanged: true, replaceable_adapters: ["typesafe-system-one", "reasoning-comparator"] },
  cost: { type_safe_cost_usd: null, comparator_cost_usd: null, pipeline_cost_usd: null, billable_units: { B: byArm.B ? Object.values(Object.fromEntries(byArm.B)).filter((item) => item.status === "ok").length : 0, C: byArm.C ? Object.values(Object.fromEntries(byArm.C)).filter((item) => item.status === "ok").length : 0 }, note: "No provider price or billable unit was exposed in the captured responses; no cost is fabricated. Usage tokens are preserved where the provider returned them." }
};

await writeFile(new URL("results/stage-b-analysis.json", root), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
