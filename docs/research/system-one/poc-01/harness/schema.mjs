export const DIMENSIONS = Object.freeze([
  "relevance",
  "evidence_quality",
  "instruction_adherence",
  "output_completeness"
]);

export const LEVELS = Object.freeze([0, 1, 2, 3]);

export const LEVEL_LABELS = Object.freeze({
  0: "fail",
  1: "weak",
  2: "partial",
  3: "strong"
});

export const QUESTION_DEFINITIONS = Object.freeze({
  relevance: {
    id: "relevance",
    prompt: "How directly does the supplied evidence address the requested task?",
    scale: "0=unrelated, 1=tangential, 2=partially relevant, 3=directly relevant",
    criteria: ["Unrelated", "Tangential", "Partially relevant", "Directly relevant"]
  },
  evidence_quality: {
    id: "evidence_quality",
    prompt: "How sufficient, verifiable, and internally consistent is the supplied evidence?",
    scale: "0=unverifiable or conflicting, 1=incomplete, 2=usable with limitations, 3=well-supported",
    criteria: ["Unverifiable or conflicting", "Incomplete", "Usable with limitations", "Well-supported"]
  },
  instruction_adherence: {
    id: "instruction_adherence",
    prompt: "How well does the candidate output follow the explicit task instructions?",
    scale: "0=violates instructions, 1=mostly misses them, 2=minor omissions, 3=fully follows",
    criteria: ["Violates instructions", "Mostly misses instructions", "Minor omissions", "Fully follows instructions"]
  },
  output_completeness: {
    id: "output_completeness",
    prompt: "How completely does the candidate output address the requested requirements?",
    scale: "0=empty or non-responsive, 1=largely incomplete, 2=mostly complete, 3=complete",
    criteria: ["Empty or non-responsive", "Largely incomplete", "Mostly complete", "Complete"]
  }
});

const FORBIDDEN_KEYS = new Set([
  "expected",
  "ground_truth",
  "rationale",
  "secret",
  "credential",
  "api_key",
  "production",
  "tenant",
  "genome"
]);

export function createQuestions() {
  return DIMENSIONS.map((dimension) => ({ ...QUESTION_DEFINITIONS[dimension] }));
}

export function createProviderRequest(record) {
  if (!record?.input || !record.case_id?.startsWith("syn-")) {
    throw new Error("Only synthetic corpus records may enter the provider boundary");
  }

  const request = {
    case_id: record.case_id,
    questions: createQuestions(),
    input: structuredClone(record.input)
  };
  assertSyntheticPayload(request);
  return request;
}

export function assertSyntheticPayload(value, path = "payload") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSyntheticPayload(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error(`Forbidden field in synthetic provider payload: ${path}.${key}`);
    }
    assertSyntheticPayload(child, `${path}.${key}`);
  }
}

export function validateCorpus(records) {
  if (records.length !== 240) throw new Error(`Expected 240 evaluations, received ${records.length}`);
  const unique = new Set(records.map((record) => record.unique_case_id));
  if (unique.size !== 216) throw new Error(`Expected 216 unique cases, received ${unique.size}`);
  const repeats = records.filter((record) => record.repeat_of);
  if (repeats.length !== 24) throw new Error(`Expected 24 repeat cases, received ${repeats.length}`);

  for (const record of records) {
    if (!record.case_id.startsWith("syn-")) throw new Error(`Non-synthetic case id: ${record.case_id}`);
    if (!record.input || !record.expected?.dimensions) throw new Error(`Malformed case: ${record.case_id}`);
    for (const dimension of DIMENSIONS) {
      const level = record.expected.dimensions[dimension];
      if (!LEVELS.includes(level)) throw new Error(`Invalid ${dimension} level in ${record.case_id}`);
    }
  }
  return { total: records.length, unique: unique.size, repeats: repeats.length };
}

export function normalizeJudgments(raw) {
  const source = raw?.judgments ?? raw?.answers ?? raw?.results ?? raw?.data ?? raw;
  const values = Array.isArray(source)
    ? Object.fromEntries(source.map((item) => [item.id ?? item.dimension, item]))
    : source;

  const judgments = {};
  for (const dimension of DIMENSIONS) {
    const item = values?.[dimension];
    const isScoreAnswer = item?.type === "score" && Number.isFinite(Number(item.score));
    const level = isScoreAnswer ? Math.max(0, Math.min(3, Math.round(Number(item.score)))) : item?.level;
    if (!item || !Number.isInteger(level) || !LEVELS.includes(level)) {
      throw new Error(`Provider response missing valid level for ${dimension}`);
    }
    const probabilityMap = item.probabilities && !Array.isArray(item.probabilities) ? item.probabilities : null;
    const probabilities = Array.isArray(item.probabilities)
      ? item.probabilities.map(Number)
      : probabilityMap ? LEVELS.map((levelIndex) => Number(probabilityMap[String(levelIndex)] ?? 0)) : null;
    if (probabilities && (probabilities.length !== LEVELS.length || probabilities.some((p) => !Number.isFinite(p) || p < 0))) {
      throw new Error(`Provider response has invalid probability distribution for ${dimension}`);
    }
    judgments[dimension] = {
      level,
      label: LEVEL_LABELS[level],
      confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : null,
      probabilities
    };
  }
  return { judgments };
}
