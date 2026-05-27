import { inspectProductAccess } from "../../inspection.js";
import { OPERATIONAL_STATES, type OperationalState } from "../../operational-state.js";
import { evaluateReadinessChecklist } from "../../readiness.js";

export function getMockReadiness(walletAddress: string) {
  const licensed = walletAddress.toLowerCase() === "0xlicensed";

  return evaluateReadinessChecklist({
    walletConnected: Boolean(walletAddress),
    academyCompleted: licensed,
    quizzesCompleted: licensed,
    proofOfKnowledgeValidated: licensed,
    neuronsEarned: licensed,
    licenseAttached: licensed,
    riskAcknowledged: licensed,
    apiConfigured: licensed,
    apiWithdrawalsDisabled: licensed,
    apiConnectionValidated: licensed,
  });
}

export function getMockOperationalState(walletAddress: string): {
  readonly walletAddress: string;
  readonly state: OperationalState;
  readonly availableStates: readonly OperationalState[];
  readonly mode: "mock" | "sandbox";
} {
  const readiness = getMockReadiness(walletAddress);

  return {
    walletAddress,
    state: readiness.completed ? "READY" : readiness.nextState,
    availableStates: OPERATIONAL_STATES,
    mode: "mock",
  };
}

export function getMockOperationalStatus(walletAddress: string) {
  const readiness = getMockReadiness(walletAddress);
  const operationalState = getMockOperationalState(walletAddress);
  const productAccess = inspectProductAccess({
    walletAddress,
    productId: "product.trading-ignition",
  });

  return {
    walletAddress,
    consumptionLevels: ["core", "service", "product"],
    environment: "sandbox",
    integrationMode: "mock",
    automation: "manual_approval",
    operationalState,
    readiness,
    productAccess,
    notices: [
      "ACS is authoritative for capability, policy, readiness, and access decisions.",
      "Real trading execution and CEX integrations remain blocked in this phase.",
    ],
  };
}

