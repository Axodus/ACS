import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { evaluateWithBaseline } from "./baseline.mjs";
import { validateCorpus } from "./schema.mjs";
import { SystemOneAdapter } from "../provider/typesafe-adapter.mjs";
import { ReasoningComparatorAdapter } from "../provider/reasoning-comparator-adapter.mjs";

const root = new URL("../", import.meta.url);
const corpusUrl = new URL("corpus/phase-0.jsonl", root);
const resultsUrl = new URL("results/", root);
const armBProgressUrl = new URL("results/arm-b-progress.jsonl", root);
const armCProgressUrl = new URL("results/arm-c-progress.jsonl", root);

const records = (await readFile(corpusUrl, "utf8")).trim().split("\n").map(JSON.parse);
const corpus = validateCorpus(records);
await mkdir(resultsUrl, { recursive: true });

function loadProgress(text) {
  const byCase = new Map();
  for (const line of text.trim() ? text.trim().split("\n") : []) {
    const item = JSON.parse(line);
    byCase.set(item.case_id, item);
  }
  return byCase;
}

async function readProgress(url) {
  try { return loadProgress(await readFile(url, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return new Map(); throw error; }
}

function safeError(error) {
  return error instanceof Error ? error.message.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]") : String(error);
}

function buildBaseline() {
  return records.map((record) => ({ case_id: record.case_id, result: evaluateWithBaseline(record) }));
}

const armB = await readProgress(armBProgressUrl);
const armC = await readProgress(armCProgressUrl);
const baseline = buildBaseline();
const systemOne = new SystemOneAdapter();
const comparator = new ReasoningComparatorAdapter();
systemOne.preflight();
comparator.preflight();

console.log(JSON.stringify({ stage: "B", status: "STARTED", corpus, arms: ["A", "B", "C"] }));

async function executeArm(name, adapter, progress, url) {
  for (const [index, record] of records.entries()) {
    if (progress.has(record.case_id)) {
      console.log(JSON.stringify({ stage: "B", arm: name, case_id: record.case_id, status: "RESUMED_SKIP", completed: index + 1, total: records.length }));
      continue;
    }
    let result;
    try {
      result = await adapter.judge(record);
    } catch (error) {
      result = {
        provider: name,
        case_id: record.case_id,
        status: "error",
        latency_ms: null,
        attempts: 0,
        error_category: "harness_failure",
        error_code: safeError(error),
        result: undefined
      };
    }
    const item = { case_id: record.case_id, result };
    await appendFile(url, JSON.stringify(item) + "\n");
    progress.set(record.case_id, item);
    console.log(JSON.stringify({ stage: "B", arm: name, case_id: record.case_id, status: result.status, error_category: result.error_category ?? null, completed: index + 1, total: records.length }));
  }
}

await executeArm("B", systemOne, armB, armBProgressUrl);
await executeArm("C", comparator, armC, armCProgressUrl);

const armBResults = records.map((record) => armB.get(record.case_id) ?? { case_id: record.case_id, result: { status: "missing", provider: "typesafe-system-one" } });
const armCResults = records.map((record) => armC.get(record.case_id) ?? { case_id: record.case_id, result: { status: "missing", provider: "reasoning-comparator" } });

await writeFile(new URL("results/arm-a-baseline.json", root), JSON.stringify({
  protocol: "REQ-02B / POC-01 / Stage B",
  arm: "A",
  status: "LOCAL_ONLY",
  data_classification: "synthetic/fabricated only",
  corpus,
  results: baseline
}, null, 2) + "\n");
await writeFile(new URL("results/arm-b-system-one.json", root), JSON.stringify({
  protocol: "REQ-02B / POC-01 / Stage B",
  arm: "B",
  status: "EXTERNAL_EXPERIMENTAL_CALLS",
  data_classification: "synthetic/fabricated only",
  corpus,
  results: armBResults
}, null, 2) + "\n");
await writeFile(new URL("results/arm-c-reasoning.json", root), JSON.stringify({
  protocol: "REQ-02B / POC-01 / Stage B",
  arm: "C",
  status: "EXTERNAL_EXPERIMENTAL_CALLS",
  data_classification: "synthetic/fabricated only",
  results: armCResults
}, null, 2) + "\n");

console.log(JSON.stringify({ stage: "B", status: "COMPLETE", completed: { A: baseline.length, B: armBResults.length, C: armCResults.length } }));
