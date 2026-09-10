import {
  ACS_NATIVE_SCHEMA_VERSION,
  assertNoSecretMaterial,
  assertValid,
  EntityRef,
  freezeNative,
  NativeContractValidationError,
  RevisionRef,
  serializeNative,
  validateEntityRef,
  validateRevisionRef,
  ValidationIssue,
  requireSafeInteger,
  requireString,
} from "./primitives.js";

export type UsageMeasurementSource = "provider" | "executor" | "ACS" | "estimated" | "unavailable";
export type CostStatus = "measured" | "estimated" | "pending" | "disputed" | "voided";

export interface UsageMeasuredV2 {
  readonly input_tokens?: string;
  readonly output_tokens?: string;
  readonly compute_seconds?: string;
  readonly tool_calls?: number;
  readonly external_api_calls?: number;
  readonly storage_bytes?: number;
  readonly wall_time_ms?: number;
}

export interface UsageRecordV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly usage_id: string;
  readonly run_id: string;
  readonly task_id?: string;
  readonly product_domain: string;
  readonly agent_revision_ref?: RevisionRef;
  readonly workforce_revision_ref?: RevisionRef;
  readonly provider_id?: string;
  readonly model_id?: string;
  readonly executor_id?: string;
  readonly measured: UsageMeasuredV2;
  readonly measurement_source: UsageMeasurementSource;
  readonly observed_at: number;
  readonly evidence_ref: EntityRef;
}

export interface CostCenterPathV2 {
  readonly axodus: string;
  readonly product: string;
  readonly workforce?: string;
  readonly workflow?: string;
  readonly agent?: string;
  readonly task?: string;
  readonly provider?: string;
  readonly executor?: string;
}

export interface CostComponentsV2 {
  readonly provider_cost?: string;
  readonly executor_cost?: string;
  readonly infrastructure_cost?: string;
  readonly storage_cost?: string;
  readonly tool_cost?: string;
  readonly allocation_cost?: string;
}

export interface CostRecordV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly cost_id: string;
  readonly usage_ref: EntityRef;
  readonly cost_center_path: CostCenterPathV2;
  readonly components: CostComponentsV2;
  readonly currency: string;
  readonly calculation_policy_ref: RevisionRef;
  readonly status: CostStatus;
  readonly created_at: number;
}

const DECIMAL_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;

function invalidObject(name: string): never {
  throw new NativeContractValidationError(`invalid ${name}`, [{ path: "$", code: "INVALID_OBJECT", message: `${name} must be an object` }]);
}

function decimal(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string" || !DECIMAL_PATTERN.test(value)) issues.push({ path, code: "INVALID_DECIMAL", message: "A non-negative decimal string is required" });
}

function validateMeasured(value: unknown): UsageMeasuredV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("UsageMeasured");
  const measured = value as UsageMeasuredV2;
  const issues: ValidationIssue[] = [];
  for (const key of ["input_tokens", "output_tokens", "compute_seconds"] as const) if (measured[key] !== undefined) decimal(measured[key], key, issues);
  for (const key of ["tool_calls", "external_api_calls", "storage_bytes", "wall_time_ms"] as const) if (measured[key] !== undefined) requireSafeInteger(measured[key], key, issues, 0);
  if (!Object.values(measured).some((entry) => entry !== undefined)) issues.push({ path: "measured", code: "EMPTY_MEASUREMENT", message: "At least one measurement is required" });
  return assertValid(measured, issues);
}

export function validateUsageRecordV2(value: unknown): UsageRecordV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("UsageRecord");
  const usage = value as Partial<UsageRecordV2>;
  const issues: ValidationIssue[] = [];
  if (usage.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const key of ["usage_id", "run_id", "product_domain"] as const) requireString(usage[key], key, issues);
  if (usage.task_id !== undefined) requireString(usage.task_id, "task_id", issues);
  for (const key of ["provider_id", "model_id", "executor_id"] as const) if (usage[key] !== undefined) requireString(usage[key], key, issues);
  if (!["provider", "executor", "ACS", "estimated", "unavailable"].includes(usage.measurement_source ?? "")) issues.push({ path: "measurement_source", code: "INVALID_ENUM", message: "Invalid measurement source" });
  try { validateMeasured(usage.measured); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (usage.agent_revision_ref) try { validateRevisionRef(usage.agent_revision_ref, "agent_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (usage.workforce_revision_ref) try { validateRevisionRef(usage.workforce_revision_ref, "workforce_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { validateEntityRef(usage.evidence_ref, "evidence_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  requireSafeInteger(usage.observed_at, "observed_at", issues, 0);
  assertNoSecretMaterial(value);
  return assertValid(usage as UsageRecordV2, issues);
}

export function createUsageRecordV2(input: Omit<UsageRecordV2, "schema_version">): UsageRecordV2 {
  return validateUsageRecordV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function validateCostRecordV2(value: unknown): CostRecordV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("CostRecord");
  const cost = value as Partial<CostRecordV2>;
  const issues: ValidationIssue[] = [];
  if (cost.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  requireString(cost.cost_id, "cost_id", issues);
  try { validateEntityRef(cost.usage_ref, "usage_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  requireString(cost.currency, "currency", issues);
  if (!["measured", "estimated", "pending", "disputed", "voided"].includes(cost.status ?? "")) issues.push({ path: "status", code: "INVALID_ENUM", message: "Invalid cost status" });
  try { validateRevisionRef(cost.calculation_policy_ref, "calculation_policy_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  requireSafeInteger(cost.created_at, "created_at", issues, 0);
  if (!cost.cost_center_path || typeof cost.cost_center_path !== "object") issues.push({ path: "cost_center_path", code: "REQUIRED_OBJECT", message: "cost_center_path is required" });
  else {
    for (const key of ["axodus", "product"] as const) requireString(cost.cost_center_path[key], `cost_center_path.${key}`, issues);
    for (const key of ["workforce", "workflow", "agent", "task", "provider", "executor"] as const) if (cost.cost_center_path[key] !== undefined) requireString(cost.cost_center_path[key], `cost_center_path.${key}`, issues);
  }
  if (!cost.components || typeof cost.components !== "object") issues.push({ path: "components", code: "REQUIRED_OBJECT", message: "components is required" });
  else {
    const componentKeys = ["provider_cost", "executor_cost", "infrastructure_cost", "storage_cost", "tool_cost", "allocation_cost"] as const;
    if (!componentKeys.some((key) => cost.components?.[key] !== undefined)) issues.push({ path: "components", code: "EMPTY_COMPONENTS", message: "At least one cost component is required" });
    for (const key of componentKeys) if (cost.components[key] !== undefined) decimal(cost.components[key], `components.${key}`, issues);
  }
  assertNoSecretMaterial(value);
  return assertValid(cost as CostRecordV2, issues);
}

export function createCostRecordV2(input: Omit<CostRecordV2, "schema_version">): CostRecordV2 {
  return validateCostRecordV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function serializeAccountingRecord(value: unknown): string {
  return serializeNative(value);
}
