export type LicenseStatus = "valid" | "expired" | "missing" | "revoked";

export interface MockLicenseValidationInput {
  readonly walletAddress?: string;
  readonly licenseType?: string;
  readonly requiredLicenseType: string;
  readonly expiresAt?: string;
  readonly revoked?: boolean;
  readonly strategyAccess?: readonly string[];
  readonly requiredStrategy?: string;
}

export interface LicenseValidationResult {
  readonly valid: boolean;
  readonly status: LicenseStatus;
  readonly reasons: readonly string[];
  readonly licenseType?: string;
  readonly walletAddress?: string;
  readonly strategyAccess: readonly string[];
}

export function validateMockLicense(input: MockLicenseValidationInput): LicenseValidationResult {
  const reasons: string[] = [];

  if (!input.walletAddress) {
    reasons.push("wallet address is required");
  }

  if (!input.licenseType) {
    reasons.push("license is missing");
  } else if (input.licenseType !== input.requiredLicenseType) {
    reasons.push(`license type ${input.licenseType} does not match required ${input.requiredLicenseType}`);
  }

  if (input.revoked === true) {
    reasons.push("license is revoked");
  }

  if (input.expiresAt && Date.parse(input.expiresAt) <= Date.now()) {
    reasons.push("license is expired");
  }

  const strategyAccess = input.strategyAccess ?? [];
  if (input.requiredStrategy && !strategyAccess.includes(input.requiredStrategy)) {
    reasons.push(`license does not allow strategy ${input.requiredStrategy}`);
  }

  return {
    valid: reasons.length === 0,
    status: inferLicenseStatus(input, reasons),
    reasons,
    ...(input.licenseType ? { licenseType: input.licenseType } : {}),
    ...(input.walletAddress ? { walletAddress: input.walletAddress } : {}),
    strategyAccess,
  };
}

function inferLicenseStatus(input: MockLicenseValidationInput, reasons: readonly string[]): LicenseStatus {
  if (input.revoked === true) {
    return "revoked";
  }

  if (input.expiresAt && Date.parse(input.expiresAt) <= Date.now()) {
    return "expired";
  }

  if (!input.licenseType || reasons.includes("license is missing")) {
    return "missing";
  }

  return reasons.length === 0 ? "valid" : "missing";
}

