import { readFile, writeFile } from "node:fs/promises";
import { evaluateWithBaseline } from "./baseline.mjs";
import { summarizeAgainstGroundTruth } from "./metrics.mjs";
import { validateCorpus } from "./schema.mjs";

const records = (await readFile(new URL("../corpus/phase-0.jsonl", import.meta.url), "utf8"))
  .trim().split("\n").map(JSON.parse);
const corpus = validateCorpus(records);
const results = records.map((record) => ({ case_id: record.case_id, result: evaluateWithBaseline(record) }));
const summary = summarizeAgainstGroundTruth(records, results, "acs-deterministic-baseline");
const artifact = {
  protocol: "REQ-02B / POC-01",
  arm: "A",
  status: "LOCAL_ONLY",
  data_classification: "synthetic/fabricated only",
  corpus,
  summary,
  results
};
await writeFile(new URL("../results/arm-a-baseline.json", import.meta.url), JSON.stringify(artifact, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
