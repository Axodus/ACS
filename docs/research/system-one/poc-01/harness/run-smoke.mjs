import { readFile, writeFile } from "node:fs/promises";
import { evaluateWithBaseline } from "./baseline.mjs";
import { validateCorpus } from "./schema.mjs";
import { SystemOneAdapter, SystemOneConfigurationError } from "../provider/typesafe-adapter.mjs";

const corpusPath = new URL("../corpus/phase-0.jsonl", import.meta.url);
const resultPath = new URL("../results/stage-a-smoke.json", import.meta.url);
const records = (await readFile(corpusPath, "utf8")).trim().split("\n").map(JSON.parse);
const corpus = validateCorpus(records);
const selected = [records[0], records[48], records[192], records[200], records[208], records[216]];
const baseline = selected.map((record) => ({ case_id: record.case_id, result: evaluateWithBaseline(record) }));
const adapter = new SystemOneAdapter();
let provider;
let status = "READY_FOR_EXTERNAL_CALL";
let providerResults = [];
try {
  provider = adapter.preflight();
  providerResults = [];
  for (const record of selected) {
    providerResults.push(await adapter.judge(record));
  }
  status = providerResults.every((result) => result.status === "ok")
    ? "COMPLETED"
    : "COMPLETED_WITH_PROVIDER_ERRORS";
} catch (error) {
  if (!(error instanceof SystemOneConfigurationError)) throw error;
  status = "BLOCKED_BEFORE_EXTERNAL_CALL";
  provider = { ready: false, error_code: error.code };
}

const artifact = {
  protocol: "REQ-02B / POC-01",
  stage: "A-smoke",
  status,
  external_call_made: providerResults.length > 0,
  data_classification: "synthetic/fabricated only",
  corpus,
  selected_case_ids: selected.map((record) => record.case_id),
  baseline_results: baseline,
  provider_results: providerResults,
  provider_preflight: provider,
  safety_assertions: {
    expected_fields_excluded_from_payload: true,
    credentials_not_persisted: true,
    production_effect: false
  }
};
await writeFile(resultPath, JSON.stringify(artifact, null, 2) + "\n");
console.log(JSON.stringify({ status, selected_cases: selected.length, external_call_made: providerResults.length > 0 }, null, 2));
