import { buildJudgmentRequest, normalizeJudgments, sanitizeProviderResult } from "./contract.mjs";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 1;

function required(name, value) {
  if (!value) throw new Error(`${name}_NOT_CONFIGURED`);
  return value;
}

function retryable(status) {
  return status === 408 || status === 429 || status >= 500;
}

export class SystemOneConfigurationError extends Error {
  constructor(code) {
    super(code);
    this.name = "SystemOneConfigurationError";
    this.code = code;
  }
}

export class SystemOneAdapter {
  constructor(env = process.env, fetchImpl = fetch) {
    this.apiKey = env.TYPESAFE_API_KEY ?? env.TYPESAFE_API ?? "";
    this.apiUrl = env.TYPESAFE_API_URL ?? "https://api.typesafe.ai/v1/systemone";
    this.model = env.TYPESAFE_MODEL ?? "jev-latest";
    this.timeoutMs = Number(env.TYPESAFE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
    this.maxRetries = Number(env.TYPESAFE_MAX_RETRIES ?? DEFAULT_MAX_RETRIES);
    this.fetchImpl = fetchImpl;
  }

  preflight() {
    if (!this.apiKey) throw new SystemOneConfigurationError("AUTHENTICATION_NOT_CONFIGURED");
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) throw new SystemOneConfigurationError("INVALID_TIMEOUT");
    return { ready: true, model: this.model, timeout_ms: this.timeoutMs, max_retries: this.maxRetries };
  }

  async judge(record) {
    this.preflight();
    const request = buildJudgmentRequest(record);
    const wireRequest = {
      state: request.input,
      model: this.model,
      questions: Object.fromEntries(request.questions.map((question) => [question.id, {
        type: "score",
        instructions: question.prompt,
        criteria: question.criteria
      }]))
    };
    const started = performance.now();
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(this.apiUrl, {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            "content-type": "application/json"
          },
          body: JSON.stringify(wireRequest),
          signal: controller.signal
        });
        if (!response.ok) {
          const error = new Error(`PROVIDER_HTTP_${response.status}`);
          error.status = response.status;
          throw error;
        }
        const raw = await response.json();
        const result = {
          provider: "typesafe-system-one",
          provider_model: raw.model ?? this.model,
          case_id: record.case_id,
          status: "ok",
          latency_ms: Math.round(performance.now() - started),
          result: normalizeJudgments(raw),
          usage: raw.usage ?? null,
          attempts: attempt + 1,
          error_category: null
        };
        return sanitizeProviderResult(result);
      } catch (error) {
        lastError = error.name === "AbortError" ? new Error("TIMEOUT") : error;
        if (attempt >= this.maxRetries || (lastError.status && !retryable(lastError.status))) break;
      } finally {
        clearTimeout(timer);
      }
    }

    return sanitizeProviderResult({
      provider: "typesafe-system-one",
      provider_model: this.model,
      case_id: record.case_id,
      status: lastError?.message === "TIMEOUT" ? "timeout" : "error",
      latency_ms: Math.round(performance.now() - started),
      attempts: Math.min(this.maxRetries + 1, (this.maxRetries ?? 0) + 1),
      error_category: lastError?.message === "TIMEOUT" ? "timeout" : "provider_failure",
      error_code: lastError?.message ?? "PROVIDER_ERROR"
    });
  }
}
