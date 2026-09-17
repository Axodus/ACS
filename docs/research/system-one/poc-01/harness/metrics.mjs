import { DIMENSIONS } from "./schema.mjs";

export function summarizeAgainstGroundTruth(records, results, provider) {
  const byCase = new Map(results.map((item) => [item.case_id, item.result]));
  const dimensions = {};
  for (const dimension of DIMENSIONS) {
    let correct = 0;
    let evaluated = 0;
    for (const record of records) {
      const result = byCase.get(record.case_id);
      const level = result?.judgments?.[dimension]?.level;
      if (!Number.isInteger(level)) continue;
      evaluated += 1;
      if (level === record.expected.dimensions[dimension]) correct += 1;
    }
    dimensions[dimension] = {
      evaluated,
      correct,
      accuracy: evaluated ? correct / evaluated : null
    };
  }
  const totalEvaluated = Object.values(dimensions).reduce((sum, value) => sum + value.evaluated, 0);
  const totalCorrect = Object.values(dimensions).reduce((sum, value) => sum + value.correct, 0);
  return {
    provider,
    total_judgments: totalEvaluated,
    total_correct: totalCorrect,
    exact_ordinal_accuracy: totalEvaluated ? totalCorrect / totalEvaluated : null,
    dimensions
  };
}
