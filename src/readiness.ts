import type { OperationalState } from "./operational-state.js";

export type ReadinessCheckId =
  | "wallet.connected"
  | "academy.completed"
  | "quizzes.completed"
  | "proof.validated"
  | "neurons.earned"
  | "license.attached"
  | "risk.acknowledged"
  | "api.configured"
  | "api.withdrawals.disabled"
  | "api.connection.validated";

export interface ReadinessChecklistInput {
  readonly walletConnected: boolean;
  readonly academyCompleted: boolean;
  readonly quizzesCompleted: boolean;
  readonly proofOfKnowledgeValidated: boolean;
  readonly neuronsEarned: boolean;
  readonly licenseAttached: boolean;
  readonly riskAcknowledged: boolean;
  readonly apiConfigured: boolean;
  readonly apiWithdrawalsDisabled: boolean;
  readonly apiConnectionValidated: boolean;
}

export interface ReadinessCheck {
  readonly id: ReadinessCheckId;
  readonly label: string;
  readonly completed: boolean;
  readonly requiredForState: OperationalState;
}

export interface ReadinessChecklistResult {
  readonly checks: readonly ReadinessCheck[];
  readonly completed: boolean;
  readonly nextState: OperationalState;
  readonly blockedBy: readonly ReadinessCheckId[];
}

export function evaluateReadinessChecklist(input: ReadinessChecklistInput): ReadinessChecklistResult {
  const checks: readonly ReadinessCheck[] = [
    {
      id: "wallet.connected",
      label: "Wallet connected",
      completed: input.walletConnected,
      requiredForState: "LEARNING",
    },
    {
      id: "academy.completed",
      label: "Academy course completed",
      completed: input.academyCompleted,
      requiredForState: "CERTIFIED",
    },
    {
      id: "quizzes.completed",
      label: "Required quizzes completed",
      completed: input.quizzesCompleted,
      requiredForState: "CERTIFIED",
    },
    {
      id: "proof.validated",
      label: "Proof of Knowledge validated",
      completed: input.proofOfKnowledgeValidated,
      requiredForState: "CERTIFIED",
    },
    {
      id: "neurons.earned",
      label: "Required Neurons earned",
      completed: input.neuronsEarned,
      requiredForState: "LICENSED",
    },
    {
      id: "license.attached",
      label: "NFT license attached",
      completed: input.licenseAttached,
      requiredForState: "LICENSED",
    },
    {
      id: "risk.acknowledged",
      label: "Risk acknowledgement completed",
      completed: input.riskAcknowledged,
      requiredForState: "API_PENDING",
    },
    {
      id: "api.configured",
      label: "Exchange API configured",
      completed: input.apiConfigured,
      requiredForState: "API_PENDING",
    },
    {
      id: "api.withdrawals.disabled",
      label: "Exchange API withdrawals disabled",
      completed: input.apiWithdrawalsDisabled,
      requiredForState: "API_VALIDATED",
    },
    {
      id: "api.connection.validated",
      label: "Exchange API connection validated",
      completed: input.apiConnectionValidated,
      requiredForState: "API_VALIDATED",
    },
  ];
  const blockedBy = checks.filter((check) => !check.completed).map((check) => check.id);

  return {
    checks,
    completed: blockedBy.length === 0,
    nextState: inferNextState(checks),
    blockedBy,
  };
}

function inferNextState(checks: readonly ReadinessCheck[]): OperationalState {
  const incomplete = checks.find((check) => !check.completed);
  if (!incomplete) {
    return "READY";
  }

  return incomplete.requiredForState;
}

