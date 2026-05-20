export type AcsPerformanceMode = "mock" | "sandbox" | "internal-validation" | "restricted-real";

export interface AcsPerformanceRecord {
  readonly recordId: string;
  readonly tenantId?: string;
  readonly wallet?: string;
  readonly capabilityId: string;
  readonly strategyId?: string;
  readonly exchange?: string;
  readonly mode: AcsPerformanceMode;
  readonly capitalUsed?: number;
  readonly realizedPnl?: number;
  readonly unrealizedPnl?: number;
  readonly drawdown?: number;
  readonly winRate?: number;
  readonly lossRate?: number;
  readonly tradeCount?: number;
  readonly feesPaid?: number;
  readonly fundingFees?: number;
  readonly liquidationRiskEvents?: number;
  readonly emergencyStops?: number;
  readonly strategyVersion?: string;
  readonly botVersion?: string;
  readonly preset?: string;
  readonly warnings: readonly string[];
  readonly createdAt: string;
}

export type CreateAcsPerformanceRecordInput = Omit<AcsPerformanceRecord, "recordId" | "createdAt" | "warnings"> & {
  readonly recordId?: string;
  readonly warnings?: readonly string[];
  readonly createdAt?: string;
};

export function createAcsPerformanceRecord(input: CreateAcsPerformanceRecordInput): AcsPerformanceRecord {
  return {
    recordId: input.recordId ?? `perf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    ...(input.wallet ? { wallet: input.wallet } : {}),
    capabilityId: input.capabilityId,
    ...(input.strategyId ? { strategyId: input.strategyId } : {}),
    ...(input.exchange ? { exchange: input.exchange } : {}),
    mode: input.mode,
    ...(input.capitalUsed !== undefined ? { capitalUsed: input.capitalUsed } : {}),
    ...(input.realizedPnl !== undefined ? { realizedPnl: input.realizedPnl } : {}),
    ...(input.unrealizedPnl !== undefined ? { unrealizedPnl: input.unrealizedPnl } : {}),
    ...(input.drawdown !== undefined ? { drawdown: input.drawdown } : {}),
    ...(input.winRate !== undefined ? { winRate: input.winRate } : {}),
    ...(input.lossRate !== undefined ? { lossRate: input.lossRate } : {}),
    ...(input.tradeCount !== undefined ? { tradeCount: input.tradeCount } : {}),
    ...(input.feesPaid !== undefined ? { feesPaid: input.feesPaid } : {}),
    ...(input.fundingFees !== undefined ? { fundingFees: input.fundingFees } : {}),
    ...(input.liquidationRiskEvents !== undefined ? { liquidationRiskEvents: input.liquidationRiskEvents } : {}),
    ...(input.emergencyStops !== undefined ? { emergencyStops: input.emergencyStops } : {}),
    ...(input.strategyVersion ? { strategyVersion: input.strategyVersion } : {}),
    ...(input.botVersion ? { botVersion: input.botVersion } : {}),
    ...(input.preset ? { preset: input.preset } : {}),
    warnings: input.warnings ?? [],
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function getMockTradingIgnitionPerformanceRecords(): readonly AcsPerformanceRecord[] {
  return [
    createAcsPerformanceRecord({
      recordId: "perf_mock_trading_ignition_001",
      wallet: "0xlicensed",
      tenantId: "dao-alpha",
      capabilityId: "product.trading-ignition",
      strategyId: "mock-grid-risk-check",
      exchange: "mock-exchange",
      mode: "internal-validation",
      capitalUsed: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      drawdown: 0,
      winRate: 0,
      lossRate: 0,
      tradeCount: 0,
      feesPaid: 0,
      fundingFees: 0,
      liquidationRiskEvents: 0,
      emergencyStops: 0,
      strategyVersion: "mock-0.1.0",
      botVersion: "acs-mock-0.1.0",
      preset: "conservative",
      warnings: [
        "mock record for UI validation only",
        "no real trading execution or return claim is represented",
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
  ];
}
