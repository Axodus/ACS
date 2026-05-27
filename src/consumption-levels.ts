export type AcsConsumptionLevel = "core" | "service" | "product";

export type AcsAutomationLevel =
  | "blocked"
  | "manual_approval"
  | "assisted"
  | "supervised"
  | "autonomous";

export const ACS_CONSUMPTION_LEVELS: readonly AcsConsumptionLevel[] = [
  "core",
  "service",
  "product",
];

export const ACS_AUTOMATION_LEVELS: readonly AcsAutomationLevel[] = [
  "blocked",
  "manual_approval",
  "assisted",
  "supervised",
  "autonomous",
];

export function isConsumptionLevel(value: string): value is AcsConsumptionLevel {
  return (ACS_CONSUMPTION_LEVELS as readonly string[]).includes(value);
}

