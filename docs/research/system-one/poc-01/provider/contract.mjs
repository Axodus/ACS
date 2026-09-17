import { createProviderRequest, DIMENSIONS, LEVELS, LEVEL_LABELS, normalizeJudgments } from "../harness/schema.mjs";

export { DIMENSIONS, LEVELS, LEVEL_LABELS, normalizeJudgments };

export function buildJudgmentRequest(record) {
  return createProviderRequest(record);
}
export function sanitizeProviderResult(result) {
  return {
    provider: result.provider,
    case_id: result.case_id,
    status: result.status,
    latency_ms: result.latency_ms,
    result: result.result ? normalizeJudgments(result.result) : undefined,
    error_code: result.error_code ?? null
  };
}
