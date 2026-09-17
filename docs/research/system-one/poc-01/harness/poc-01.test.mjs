import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluateWithBaseline } from "./baseline.mjs";
import { assertSyntheticPayload, createProviderRequest, DIMENSIONS, normalizeJudgments, validateCorpus } from "./schema.mjs";
import { SystemOneAdapter } from "../provider/typesafe-adapter.mjs";
import { ReasoningComparatorAdapter } from "../provider/reasoning-comparator-adapter.mjs";

const corpus = (await readFile(new URL("../corpus/phase-0.jsonl", import.meta.url), "utf8"))
  .trim().split("\n").map(JSON.parse);

test("phase 0 corpus is frozen at 240 evaluations and 216 unique cases", () => {
  assert.deepEqual(validateCorpus(corpus), { total: 240, unique: 216, repeats: 24 });
});

test("provider requests exclude hidden adjudication fields for every case", () => {
  for (const record of corpus) {
    const request = createProviderRequest(record);
    assert.deepEqual(Object.keys(request), ["case_id", "questions", "input"]);
    assert.equal("expected" in request, false);
    assert.doesNotThrow(() => assertSyntheticPayload(request));
  }
});

test("baseline returns every frozen judgment dimension", () => {
  const result = evaluateWithBaseline(corpus[0]);
  assert.deepEqual(Object.keys(result.judgments), DIMENSIONS);
  for (const judgment of Object.values(result.judgments)) {
    assert.ok(Number.isInteger(judgment.level));
    assert.equal(judgment.probabilities, null);
  }
});

test("adapter fails closed without credentials", () => {
  const adapter = new SystemOneAdapter({});
  assert.throws(() => adapter.preflight(), /AUTHENTICATION_NOT_CONFIGURED/);
});

test("score answers normalize to ordinal level and preserve probability data", () => {
  const normalized = normalizeJudgments({
    answers: Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, {
      type: "score",
      score: 2.4,
      probabilities: { "0": 0.05, "1": 0.1, "2": 0.7, "3": 0.15 },
      confidence: 0.7
    }]))
  });
  assert.equal(normalized.judgments.relevance.level, 2);
  assert.deepEqual(normalized.judgments.relevance.probabilities, [0.05, 0.1, 0.7, 0.15]);
  assert.equal(normalized.judgments.relevance.confidence, 0.7);
});

test("neutral normalization accepts comparator JSON levels", () => {
  const normalized = normalizeJudgments(Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, 3])));
  assert.deepEqual(Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, normalized.judgments[dimension].level])), {
    relevance: 3,
    evidence_quality: 3,
    instruction_adherence: 3,
    output_completeness: 3
  });
});

test("adapter serializes the documented System One wire shape", async () => {
  let captured;
  const adapter = new SystemOneAdapter({
    TYPESAFE_API_KEY: "synthetic-test-key",
    TYPESAFE_API_URL: "https://example.invalid/v1/systemone"
  }, async (_url, options) => {
    captured = { url: _url, options };
    const answers = Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, {
      type: "score",
      score: 2,
      probabilities: { "0": 0.05, "1": 0.1, "2": 0.75, "3": 0.1 },
      confidence: 0.75
    }]));
    return new Response(JSON.stringify({ model: "jev-latest", answers, usage: { input_tokens: 1, output_tokens: 1 } }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  });
  const result = await adapter.judge(corpus[0]);
  const body = JSON.parse(captured.options.body);
  assert.equal(captured.url, "https://example.invalid/v1/systemone");
  assert.equal(body.model, "jev-latest");
  assert.equal(typeof body.state, "object");
  assert.equal(body.questions.relevance.type, "score");
  assert.equal(captured.options.headers.authorization, "Bearer synthetic-test-key");
  assert.equal(result.status, "ok");
  assert.equal(result.result.judgments.relevance.level, 2);
});

test("reasoning comparator keeps provider-specific response parsing behind its adapter", async () => {
  let captured;
  const adapter = new ReasoningComparatorAdapter({
    COMPARATOR_API_TOKEN: "synthetic-comparator-key",
    COMPARATOR_MODEL: "synthetic-reasoning-model"
  }, async (_url, options) => {
    captured = { url: _url, options };
    return new Response(JSON.stringify({
      model: "synthetic-reasoning-model",
      output_text: JSON.stringify({ relevance: 1, evidence_quality: 2, instruction_adherence: 3, output_completeness: 0 }),
      usage: { input_tokens: 2, output_tokens: 3 }
    }), { status: 200, headers: { "content-type": "application/json" } });
  });
  const result = await adapter.judge(corpus[0]);
  const body = JSON.parse(captured.options.body);
  assert.equal(body.model, "synthetic-reasoning-model");
  assert.equal(body.reasoning.effort, "low");
  assert.equal(typeof body.input, "string");
  assert.equal(body.input.includes("ground_truth"), false);
  assert.equal(body.input.includes("expected"), false);
  assert.equal(result.status, "ok");
  assert.equal(result.result.judgments.relevance.level, 1);
  assert.deepEqual(result.usage, { input_tokens: 2, output_tokens: 3 });
});

test("reasoning comparator classifies malformed provider output", async () => {
  const adapter = new ReasoningComparatorAdapter({ COMPARATOR_API_TOKEN: "synthetic-comparator-key" }, async () => new Response(JSON.stringify({ output_text: "not json" }), { status: 200 }));
  const result = await adapter.judge(corpus[0]);
  assert.equal(result.status, "error");
  assert.equal(result.error_category, "invalid_response");
});
