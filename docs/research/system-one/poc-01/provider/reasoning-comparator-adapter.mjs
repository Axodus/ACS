import { assertSyntheticPayload, DIMENSIONS, QUESTION_DEFINITIONS, normalizeJudgments } from "../harness/schema.mjs";
import { buildJudgmentRequest, sanitizeProviderResult } from "./contract.mjs";

const DEFAULT_URL = "http://127.0.0.1:10100/v1/responses";
const DEFAULT_MODEL = "claude-opus-4-6-thinking";
const DEFAULT_TIMEOUT_MS = 15_000;

function parseJsonText(value) {
  const text = String(value ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("INVALID_RESPONSE_JSON");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("INVALID_RESPONSE_JSON");
  }
}

function extractOutputText(raw) {
  if (typeof raw?.output_text === "string") return raw.output_text;
  const parts = (raw?.output ?? []).flatMap((item) => item?.content ?? []);
  const text = parts.filter((part) => typeof part?.text === "string").map((part) => part.text).join("\n");
  if (!text) throw new Error("INVALID_RESPONSE_TEXT");
  return text;
}

function errorCategory(error) {
  if (error?.name === "AbortError" || error?.message === "TIMEOUT") return "timeout";
  if (error?.message === "INVALID_RESPONSE_JSON" || error?.message === "INVALID_RESPONSE_TEXT") return "invalid_response";
  if (error?.message === "NORMALIZATION_FAILURE") return "normalization_failure";
  if (error?.category === "harness_failure") return "harness_failure";
  return "provider_failure";
}

export class ComparatorConfigurationError extends Error {
  constructor(code) {
    super(code);
    this.name = "ComparatorConfigurationError";
    this.code = code;
  }
}

export class ReasoningComparatorAdapter {
  constructor(env = process.env, fetchImpl = fetch) {
    this.apiKey = env.COMPARATOR_API_TOKEN ?? env.OPENCODEX_API_AUTH_TOKEN ?? "";
    this.apiUrl = env.COMPARATOR_API_URL ?? DEFAULT_URL;
    this.model = env.COMPARATOR_MODEL ?? DEFAULT_MODEL;
    this.reasoningEffort = env.COMPARATOR_REASONING_EFFORT ?? "low";
    this.timeoutMs = Number(env.COMPARATOR_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
    this.maxOutputTokens = Number(env.COMPARATOR_MAX_OUTPUT_TOKENS ?? 512);
    this.fetchImpl = fetchImpl;
  }

  preflight() {
    if (!this.apiKey) throw new ComparatorConfigurationError("AUTHENTICATION_NOT_CONFIGURED");
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) throw new ComparatorConfigurationError("INVALID_TIMEOUT");
    if (!Number.isFinite(this.maxOutputTokens) || this.maxOutputTokens < 64) throw new ComparatorConfigurationError("INVALID_OUTPUT_BUDGET");
    return { ready: true, model: this.model, timeout_ms: this.timeoutMs, max_output_tokens: this.maxOutputTokens };
  }

  buildPrompt(record) {
    const request = buildJudgmentRequest(record);
    assertSyntheticPayload(request);
    const rubric = DIMENSIONS.map((dimension) => {
      const question = QUESTION_DEFINITIONS[dimension];
      return `${dimension}: ${question.prompt} Scale: ${question.scale}.`;
    }).join("\n");
    return [
      "Evaluate the synthetic candidate using the supplied task, request, evidence, and candidate output.",
      "Return only one JSON object with integer values from 0 to 3 for these keys: relevance, evidence_quality, instruction_adherence, output_completeness.",
      "Do not include markdown, rationale, confidence, or any other keys.",
      `Rubric:\n${rubric}`,
      `Case input:\n${JSON.stringify(request.input)}`
    ].join("\n\n");
  }

  async judge(record) {
    this.preflight();
    const prompt = this.buildPrompt(record);
    const started = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(this.apiUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          input: prompt,
          reasoning: { effort: this.reasoningEffort },
          max_output_tokens: this.maxOutputTokens
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        const error = new Error(`PROVIDER_HTTP_${response.status}`);
        error.status = response.status;
        throw error;
      }
      const raw = await response.json();
      let normalized;
      try {
        normalized = normalizeJudgments(parseJsonText(extractOutputText(raw)));
      } catch (error) {
        error.message = error.message === "INVALID_RESPONSE_JSON" || error.message === "INVALID_RESPONSE_TEXT"
          ? error.message
          : "NORMALIZATION_FAILURE";
        throw error;
      }
      return sanitizeProviderResult({
        provider: "reasoning-comparator",
        provider_model: raw.model ?? this.model,
        case_id: record.case_id,
        status: "ok",
        latency_ms: Math.round(performance.now() - started),
        attempts: 1,
        usage: raw.usage ?? null,
        cost_usd: null,
        result: normalized
      });
    } catch (error) {
      const category = errorCategory(error);
      return sanitizeProviderResult({
        provider: "reasoning-comparator",
        provider_model: this.model,
        case_id: record.case_id,
        status: category === "timeout" ? "timeout" : "error",
        latency_ms: Math.round(performance.now() - started),
        attempts: 1,
        error_category: category,
        error_code: error?.message ?? "PROVIDER_ERROR"
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
