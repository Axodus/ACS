import { randomBytes, randomUUID } from "node:crypto";

export type TelemetryLevel = "debug" | "info" | "warn" | "error";
export type TelemetryHealthState = "disabled" | "ready" | "degraded";

export interface TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags: "00" | "01";
}

export interface TelemetryContext {
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly tenantId?: string;
  readonly principalId?: string;
  readonly jobId?: string;
  readonly assignmentId?: string;
  readonly workerId?: string;
}

export interface StructuredLogRecord extends TelemetryContext {
  readonly timestamp: number;
  readonly level: TelemetryLevel;
  readonly service: string;
  readonly instanceId: string;
  readonly component: string;
  readonly event: string;
  readonly message: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface MetricRecord {
  readonly timestamp: number;
  readonly service: string;
  readonly name: string;
  readonly kind: "counter" | "gauge" | "histogram";
  readonly value: number;
  readonly unit?: string;
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
}

export interface SpanRecord extends TelemetryContext {
  readonly service: string;
  readonly instanceId: string;
  readonly name: string;
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly status: "unset" | "ok" | "error";
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface TelemetryBatch {
  readonly logs: readonly StructuredLogRecord[];
  readonly metrics: readonly MetricRecord[];
  readonly spans: readonly SpanRecord[];
}

export interface TelemetryExporterHealth {
  readonly configured: boolean;
  readonly reachable: boolean;
  readonly productionGrade: boolean;
  readonly state: TelemetryHealthState;
  readonly adapter: string;
  readonly external: boolean;
  readonly lastSuccessAt?: number;
  readonly lastFailureAt?: number;
  readonly lastFailureCode?: string;
}

export interface TelemetryExporter {
  readonly descriptor: {
    readonly adapter: string;
    readonly external: boolean;
    readonly productionGrade: boolean;
  };
  export(batch: TelemetryBatch): Promise<void>;
  health(): Promise<TelemetryExporterHealth>;
  close?(): Promise<void> | void;
}

export interface TelemetrySpan {
  readonly context: TraceContext;
  setAttribute(name: string, value: unknown): void;
  end(status?: "ok" | "error", attributes?: Readonly<Record<string, unknown>>): void;
}

export interface OperationalTelemetrySnapshot {
  readonly health: TelemetryExporterHealth;
  readonly queue: {
    readonly logs: number;
    readonly metrics: number;
    readonly spans: number;
    readonly capacity: number;
    readonly dropped: number;
  };
  readonly recentLogs: readonly StructuredLogRecord[];
  readonly recentMetrics: readonly MetricRecord[];
  readonly recentSpans: readonly SpanRecord[];
}

export interface OperationalTelemetryOptions {
  readonly exporter: TelemetryExporter;
  readonly serviceName: string;
  readonly instanceId?: string;
  readonly queueCapacity?: number;
  readonly recentCapacity?: number;
  readonly exportIntervalMs?: number;
  readonly batchSize?: number;
  readonly exportTimeoutMs?: number;
}

export class TelemetryConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelemetryConfigurationError";
  }
}

const SENSITIVE_KEY = /(authorization|cookie|credential|password|private.?key|secret|token)/i;
const SENSITIVE_VALUE = /(Bearer\s+[A-Za-z0-9._~+/=-]+|-----BEGIN [A-Z ]*PRIVATE KEY-----)/gi;
const HIGH_CARDINALITY_METRIC_KEY = /^(jobId|assignmentId|traceId|spanId|requestId|correlationId|principalId|tenantId|workerId)$/i;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const TRACEPARENT_PATTERN = /^00-([0-9a-f]{32})-([0-9a-f]{16})-(0[01])$/;

export class DisabledTelemetryExporter implements TelemetryExporter {
  readonly descriptor = { adapter: "disabled", external: false, productionGrade: false } as const;
  async export(): Promise<void> {}
  async health(): Promise<TelemetryExporterHealth> {
    return {
      configured: false,
      reachable: false,
      productionGrade: false,
      state: "disabled",
      adapter: this.descriptor.adapter,
      external: false,
      lastFailureCode: "TELEMETRY_EXPORTER_DISABLED",
    };
  }
}

export class InMemoryTelemetryExporter implements TelemetryExporter {
  readonly descriptor = { adapter: "in-memory-telemetry", external: false, productionGrade: false } as const;
  readonly batches: TelemetryBatch[] = [];
  async export(batch: TelemetryBatch): Promise<void> { this.batches.push(structuredClone(batch)); }
  async health(): Promise<TelemetryExporterHealth> {
    return {
      configured: true,
      reachable: true,
      productionGrade: false,
      state: "ready",
      adapter: this.descriptor.adapter,
      external: false,
    };
  }
}

export class OtlpHttpTelemetryExporter implements TelemetryExporter {
  readonly descriptor = { adapter: "otlp-http-json", external: true, productionGrade: true } as const;
  readonly #endpoint: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;
  readonly #headers: Readonly<Record<string, string>>;
  readonly #serviceName: string;
  #lastSuccessAt: number | undefined;
  #lastFailureAt: number | undefined;
  #lastFailureCode: string | undefined;

  constructor(options: {
    readonly endpoint: string;
    readonly serviceName: string;
    readonly fetchImpl?: typeof fetch;
    readonly timeoutMs?: number;
    readonly headers?: Readonly<Record<string, string>>;
  }) {
    const endpoint = options.endpoint.trim().replace(/\/+$/, "");
    if (!endpoint || !/^https?:\/\//.test(endpoint)) throw new Error("OTLP HTTP endpoint must use http or https");
    this.#endpoint = endpoint;
    this.#serviceName = options.serviceName;
    this.#fetch = options.fetchImpl ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? 5_000;
    this.#headers = options.headers ?? {};
  }

  async export(batch: TelemetryBatch): Promise<void> {
    try {
      const requests: Promise<void>[] = [];
      if (batch.logs.length) requests.push(this.#send("/v1/logs", toOtlpLogs(batch.logs, this.#serviceName)));
      if (batch.metrics.length) requests.push(this.#send("/v1/metrics", toOtlpMetrics(batch.metrics, this.#serviceName)));
      if (batch.spans.length) requests.push(this.#send("/v1/traces", toOtlpTraces(batch.spans, this.#serviceName)));
      await Promise.all(requests);
      this.#lastSuccessAt = Date.now();
      this.#lastFailureCode = undefined;
    } catch (error) {
      this.#lastFailureAt = Date.now();
      this.#lastFailureCode = error instanceof Error ? error.name : "TelemetryExportError";
      throw error;
    }
  }

  async health(): Promise<TelemetryExporterHealth> {
    const degraded = this.#lastSuccessAt === undefined
      || (this.#lastFailureAt !== undefined && this.#lastFailureAt > this.#lastSuccessAt);
    return {
      configured: true,
      reachable: !degraded,
      productionGrade: true,
      state: degraded ? "degraded" : "ready",
      adapter: this.descriptor.adapter,
      external: true,
      ...(this.#lastSuccessAt !== undefined ? { lastSuccessAt: this.#lastSuccessAt } : {}),
      ...(this.#lastFailureAt !== undefined ? { lastFailureAt: this.#lastFailureAt } : {}),
      ...(this.#lastFailureCode ? { lastFailureCode: this.#lastFailureCode } : {}),
    };
  }

  async #send(path: string, body: unknown): Promise<void> {
    const response = await this.#fetch(this.#endpoint + path, {
      method: "POST",
      headers: { "content-type": "application/json", ...this.#headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.#timeoutMs),
    });
    if (!response.ok) throw new Error(`OTLP export failed with status ${response.status}`);
  }
}

export class OperationalTelemetryProvider {
  readonly #exporter: TelemetryExporter;
  readonly #serviceName: string;
  readonly #instanceId: string;
  readonly #queueCapacity: number;
  readonly #recentCapacity: number;
  readonly #batchSize: number;
  readonly #exportTimeoutMs: number;
  readonly #logs: StructuredLogRecord[] = [];
  readonly #metrics: MetricRecord[] = [];
  readonly #spans: SpanRecord[] = [];
  readonly #recentLogs: StructuredLogRecord[] = [];
  readonly #recentMetrics: MetricRecord[] = [];
  readonly #recentSpans: SpanRecord[] = [];
  readonly #timer: ReturnType<typeof setInterval>;
  #dropped = 0;
  #flushing: Promise<void> | undefined;

  constructor(options: OperationalTelemetryOptions) {
    this.#exporter = options.exporter;
    this.#serviceName = options.serviceName;
    this.#instanceId = options.instanceId ?? `${process.pid}-${randomUUID()}`;
    this.#queueCapacity = options.queueCapacity ?? 2_048;
    this.#recentCapacity = options.recentCapacity ?? 256;
    this.#batchSize = options.batchSize ?? 256;
    this.#exportTimeoutMs = options.exportTimeoutMs ?? 5_000;
    const interval = options.exportIntervalMs ?? 1_000;
    this.#timer = setInterval(() => { void this.flush(); }, interval);
    this.#timer.unref?.();
  }

  get serviceName(): string { return this.#serviceName; }
  get instanceId(): string { return this.#instanceId; }
  get descriptor(): TelemetryExporter["descriptor"] { return this.#exporter.descriptor; }

  log(input: {
    readonly level?: TelemetryLevel;
    readonly component: string;
    readonly event: string;
    readonly message: string;
    readonly context?: TelemetryContext;
    readonly attributes?: Readonly<Record<string, unknown>>;
  }): void {
    const record: StructuredLogRecord = {
      timestamp: Date.now(),
      level: input.level ?? "info",
      service: this.#serviceName,
      instanceId: this.#instanceId,
      component: input.component,
      event: input.event,
      message: redactString(input.message),
      ...(input.context ?? {}),
      attributes: redactRecord(input.attributes ?? {}),
    };
    this.#enqueue(this.#logs, record);
    this.#remember(this.#recentLogs, record);
  }

  metric(input: {
    readonly name: string;
    readonly kind: MetricRecord["kind"];
    readonly value: number;
    readonly unit?: string;
    readonly attributes?: Readonly<Record<string, string | number | boolean>>;
  }): void {
    if (!Number.isFinite(input.value)) return;
    const record: MetricRecord = {
      timestamp: Date.now(),
      service: this.#serviceName,
      name: input.name,
      kind: input.kind,
      value: input.value,
      ...(input.unit ? { unit: input.unit } : {}),
      attributes: sanitizeMetricAttributes(input.attributes ?? {}),
    };
    this.#enqueue(this.#metrics, record);
    this.#remember(this.#recentMetrics, record);
  }

  startSpan(name: string, options: {
    readonly parent?: TraceContext;
    readonly context?: TelemetryContext;
    readonly attributes?: Readonly<Record<string, unknown>>;
  } = {}): TelemetrySpan {
    const traceId = options.parent?.traceId ?? randomHex(16);
    const spanId = randomHex(8);
    const startedAt = Date.now();
    const attributes: Record<string, unknown> = { ...redactRecord(options.attributes ?? {}) };
    let ended = false;
    return {
      context: { traceId, spanId, traceFlags: options.parent?.traceFlags ?? "01" },
      setAttribute: (key, value) => { if (!ended) attributes[key] = redactValue(key, value); },
      end: (status = "ok", finalAttributes = {}) => {
        if (ended) return;
        ended = true;
        Object.assign(attributes, redactRecord(finalAttributes));
        const record: SpanRecord = {
          service: this.#serviceName,
          instanceId: this.#instanceId,
          name,
          traceId,
          spanId,
          ...(options.parent ? { parentSpanId: options.parent.spanId } : {}),
          ...(options.context ?? {}),
          startedAt,
          endedAt: Date.now(),
          status,
          attributes,
        };
        this.#enqueue(this.#spans, record);
        this.#remember(this.#recentSpans, record);
      },
    };
  }

  async health(): Promise<TelemetryExporterHealth> { return this.#exporter.health(); }

  async snapshot(): Promise<OperationalTelemetrySnapshot> {
    return {
      health: await this.health(),
      queue: {
        logs: this.#logs.length,
        metrics: this.#metrics.length,
        spans: this.#spans.length,
        capacity: this.#queueCapacity,
        dropped: this.#dropped,
      },
      recentLogs: structuredClone(this.#recentLogs),
      recentMetrics: structuredClone(this.#recentMetrics),
      recentSpans: structuredClone(this.#recentSpans),
    };
  }

  async flush(): Promise<void> {
    if (this.#flushing) return this.#flushing;
    this.#flushing = this.#flushBatch().finally(() => { this.#flushing = undefined; });
    return this.#flushing;
  }

  async close(): Promise<void> {
    clearInterval(this.#timer);
    await withTimeout(this.flush(), this.#exportTimeoutMs).catch(() => undefined);
    await this.#exporter.close?.();
  }

  async #flushBatch(): Promise<void> {
    const batch: TelemetryBatch = {
      logs: this.#logs.slice(0, this.#batchSize),
      metrics: this.#metrics.slice(0, this.#batchSize),
      spans: this.#spans.slice(0, this.#batchSize),
    };
    if (!batch.logs.length && !batch.metrics.length && !batch.spans.length) return;
    try {
      await withTimeout(this.#exporter.export(batch), this.#exportTimeoutMs);
      this.#logs.splice(0, batch.logs.length);
      this.#metrics.splice(0, batch.metrics.length);
      this.#spans.splice(0, batch.spans.length);
    } catch {
      // Telemetry is a bounded operational side channel. Export failure never
      // changes authoritative domain state, and queued evidence stays bounded.
    }
  }

  #enqueue<T>(queue: T[], item: T): void {
    if (queue.length >= this.#queueCapacity) {
      queue.shift();
      this.#dropped += 1;
    }
    queue.push(item);
  }

  #remember<T>(queue: T[], item: T): void {
    if (queue.length >= this.#recentCapacity) queue.shift();
    queue.push(item);
  }
}

export function createOperationalTelemetryFromEnvironment(options: {
  readonly environment?: NodeJS.ProcessEnv;
  readonly serviceName?: string;
  readonly instanceId?: string;
  readonly fetchImpl?: typeof fetch;
} = {}): OperationalTelemetryProvider {
  const environment = options.environment ?? process.env;
  const mode = environment.ACS_TELEMETRY_MODE ?? "memory";
  const serviceName = options.serviceName ?? environment.ACS_OTEL_SERVICE_NAME ?? "acs-control-plane";
  let exporter: TelemetryExporter;
  if (mode === "disabled") exporter = new DisabledTelemetryExporter();
  else if (mode === "memory") exporter = new InMemoryTelemetryExporter();
  else if (mode === "otlp-http") {
    exporter = new OtlpHttpTelemetryExporter({
      endpoint: environment.ACS_OTEL_EXPORTER_OTLP_ENDPOINT ?? "",
      serviceName,
      fetchImpl: options.fetchImpl,
      timeoutMs: optionalPositiveInteger(environment.ACS_OTEL_EXPORT_TIMEOUT_MS),
    });
  } else throw new Error("ACS_TELEMETRY_MODE must be disabled, memory or otlp-http");
  return new OperationalTelemetryProvider({
    exporter,
    serviceName,
    instanceId: options.instanceId,
    queueCapacity: optionalPositiveInteger(environment.ACS_TELEMETRY_QUEUE_CAPACITY),
    batchSize: optionalPositiveInteger(environment.ACS_TELEMETRY_BATCH_SIZE),
    exportIntervalMs: optionalPositiveInteger(environment.ACS_TELEMETRY_EXPORT_INTERVAL_MS),
    exportTimeoutMs: optionalPositiveInteger(environment.ACS_OTEL_EXPORT_TIMEOUT_MS),
  });
}

export function assertProductionTelemetryConfiguration(
  profile: "development" | "production",
  telemetry: OperationalTelemetryProvider,
): void {
  if (profile === "production" && (!telemetry.descriptor.external || !telemetry.descriptor.productionGrade)) {
    throw new TelemetryConfigurationError(
      "production mode requires an external production-oriented telemetry exporter; disabled/memory fallback is prohibited",
    );
  }
}

export function parseTraceparent(value: string | undefined): TraceContext | undefined {
  if (!value) return undefined;
  const match = TRACEPARENT_PATTERN.exec(value.trim().toLowerCase());
  if (!match || match[1] === "0".repeat(32) || match[2] === "0".repeat(16)) return undefined;
  const traceId = match[1];
  const spanId = match[2];
  if (!traceId || !spanId) return undefined;
  return { traceId, spanId, traceFlags: match[3] as "00" | "01" };
}

export function formatTraceparent(context: TraceContext): string {
  return `00-${context.traceId}-${context.spanId}-${context.traceFlags}`;
}

export function normalizeClientCorrelationId(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  return candidate && CORRELATION_ID_PATTERN.test(candidate) ? candidate : undefined;
}

export function createServerRequestIdentity(input: {
  readonly clientCorrelationId?: string;
  readonly traceparent?: string;
} = {}): { readonly requestId: string; readonly correlationId: string; readonly parentTrace?: TraceContext } {
  const requestId = `req_${randomUUID()}`;
  const parentTrace = parseTraceparent(input.traceparent);
  return {
    requestId,
    correlationId: normalizeClientCorrelationId(input.clientCorrelationId) ?? requestId,
    ...(parentTrace ? { parentTrace } : {}),
  };
}

export function redactRecord(record: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return Object.fromEntries(Object.entries(record).flatMap(([key, value]) => SENSITIVE_KEY.test(key) ? [] : [[key, redactValue(key, value)]]));
}

export function containsSensitiveTelemetry(value: unknown): boolean {
  const serialized = JSON.stringify(value);
  return /Bearer\s+|Authorization|Vault token|private key|secret plaintext/i.test(serialized);
}

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(key, item));
  if (value && typeof value === "object") return redactRecord(value as Readonly<Record<string, unknown>>);
  return value;
}

function redactString(value: string): string { return value.replace(SENSITIVE_VALUE, "[REDACTED]"); }

function sanitizeMetricAttributes(input: Readonly<Record<string, string | number | boolean>>): Readonly<Record<string, string | number | boolean>> {
  return Object.fromEntries(Object.entries(input).filter(([key]) => !HIGH_CARDINALITY_METRIC_KEY.test(key)));
}

function optionalPositiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error("telemetry numeric configuration must be a positive integer");
  return parsed;
}

function randomHex(bytes: number): string { return randomBytes(bytes).toString("hex"); }
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolveResult, rejectResult) => {
    const timer = setTimeout(() => rejectResult(new Error("telemetry export timed out")), timeoutMs);
    timer.unref?.();
    promise.then(
      (value) => { clearTimeout(timer); resolveResult(value); },
      (error) => { clearTimeout(timer); rejectResult(error); },
    );
  });
}
function nanos(milliseconds: number): string { return String(BigInt(milliseconds) * 1_000_000n); }
function otlpBytes(hex: string): string { return Buffer.from(hex, "hex").toString("base64"); }

function otlpAttributes(attributes: Readonly<Record<string, unknown>>): readonly unknown[] {
  const result: unknown[] = [];
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "boolean") result.push({ key, value: { boolValue: value } });
    else if (typeof value === "number") result.push({ key, value: Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value } });
    else result.push({ key, value: { stringValue: typeof value === "string" ? value : JSON.stringify(value) } });
  }
  return result;
}

function resource(serviceName: string, instanceId?: string): unknown {
  return { attributes: otlpAttributes({ "service.name": serviceName, ...(instanceId ? { "service.instance.id": instanceId } : {}) }) };
}

function toOtlpLogs(records: readonly StructuredLogRecord[], serviceName: string): unknown {
  return { resourceLogs: [{ resource: resource(serviceName, records[0]?.instanceId), scopeLogs: [{ scope: { name: "acs.operational.telemetry" }, logRecords: records.map((record) => ({
    timeUnixNano: nanos(record.timestamp),
    severityText: record.level.toUpperCase(),
    body: { stringValue: record.message },
    ...(record.traceId ? { traceId: otlpBytes(record.traceId) } : {}),
    ...(record.spanId ? { spanId: otlpBytes(record.spanId) } : {}),
    attributes: otlpAttributes({ ...record, attributes: record.attributes }),
  })) }] }] };
}

function toOtlpMetrics(records: readonly MetricRecord[], serviceName: string): unknown {
  return { resourceMetrics: [{ resource: resource(serviceName), scopeMetrics: [{ scope: { name: "acs.operational.telemetry" }, metrics: records.map((record) => {
    const point = { timeUnixNano: nanos(record.timestamp), asDouble: record.value, attributes: otlpAttributes(record.attributes) };
    if (record.kind === "gauge") return { name: record.name, ...(record.unit ? { unit: record.unit } : {}), gauge: { dataPoints: [point] } };
    if (record.kind === "histogram") return {
      name: record.name,
      ...(record.unit ? { unit: record.unit } : {}),
      histogram: {
        aggregationTemporality: 1,
        dataPoints: [{ timeUnixNano: nanos(record.timestamp), count: "1", sum: record.value, bucketCounts: ["1"], explicitBounds: [], attributes: otlpAttributes(record.attributes) }],
      },
    };
    return { name: record.name, ...(record.unit ? { unit: record.unit } : {}), sum: { aggregationTemporality: 1, isMonotonic: true, dataPoints: [point] } };
  }) }] }] };
}

function toOtlpTraces(records: readonly SpanRecord[], serviceName: string): unknown {
  return { resourceSpans: [{ resource: resource(serviceName, records[0]?.instanceId), scopeSpans: [{ scope: { name: "acs.operational.telemetry" }, spans: records.map((record) => ({
    traceId: otlpBytes(record.traceId),
    spanId: otlpBytes(record.spanId),
    ...(record.parentSpanId ? { parentSpanId: otlpBytes(record.parentSpanId) } : {}),
    name: record.name,
    kind: 1,
    startTimeUnixNano: nanos(record.startedAt),
    endTimeUnixNano: nanos(record.endedAt),
    status: { code: record.status === "error" ? 2 : record.status === "ok" ? 1 : 0 },
    attributes: otlpAttributes({ ...record, attributes: record.attributes }),
  })) }] }] };
}
