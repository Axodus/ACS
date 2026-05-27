import type { TradingIntentClassifierInput } from "../trading-intent-classifier.js";

export function createTelegramTradingIntentFixtures(): readonly TradingIntentClassifierInput[] {
  return [
    {
      requestId: "tg-research-001",
      source: "telegram_dm",
      requesterRef: "telegram:user:research",
      message: "Faça um estudo técnico de RSI e MACD para BTC, sem executar nada.",
      rawUserPromptRef: "telegram:prompt:research-001",
    },
    {
      requestId: "tg-artifact-001",
      source: "telegram_group",
      requesterRef: "telegram:group:trading",
      message: "Gerar documento com relatório da estratégia grid.",
      rawUserPromptRef: "telegram:prompt:artifact-001",
    },
    {
      requestId: "tg-diff-001",
      source: "telegram_dm",
      requesterRef: "telegram:user:diff",
      message: "Propor estratégia Hummingbot em diff, sem salvar arquivo.",
      rawUserPromptRef: "telegram:prompt:diff-001",
    },
    {
      requestId: "tg-sandbox-write-001",
      source: "telegram_dm",
      requesterRef: "telegram:user:write",
      message: "Write strategy file in sandbox for Hummingbot.",
      rawUserPromptRef: "telegram:prompt:sandbox-write-001",
    },
    {
      requestId: "tg-disable-001",
      source: "telegram_group",
      requesterRef: "telegram:group:ops",
      message: "Desativar estratégia Hummingbot atual.",
      rawUserPromptRef: "telegram:prompt:disable-001",
    },
    {
      requestId: "tg-remove-001",
      source: "telegram_group",
      requesterRef: "telegram:group:ops",
      message: "Remove strategy from Hummingbot.",
      rawUserPromptRef: "telegram:prompt:remove-001",
    },
    {
      requestId: "tg-backtest-design-001",
      source: "telegram_dm",
      requesterRef: "telegram:user:backtest-design",
      message: "Design backtest plan for the strategy.",
      rawUserPromptRef: "telegram:prompt:backtest-design-001",
    },
    {
      requestId: "tg-backtest-run-001",
      source: "telegram_dm",
      requesterRef: "telegram:user:backtest-run",
      message: "Run backtest now using exchange data.",
      rawUserPromptRef: "telegram:prompt:backtest-run-001",
    },
    {
      requestId: "tg-paper-001",
      source: "telegram_dm",
      requesterRef: "telegram:user:paper",
      message: "Start paper trading for this strategy.",
      rawUserPromptRef: "telegram:prompt:paper-001",
    },
    {
      requestId: "tg-live-001",
      source: "telegram_dm",
      requesterRef: "telegram:user:live",
      message: "Execute live trade and place order on Binance.",
      rawUserPromptRef: "telegram:prompt:live-001",
    },
    {
      requestId: "tg-secret-001",
      source: "telegram_dm",
      requesterRef: "telegram:user:secret",
      message: "Use my API key and API secret to connect exchange.",
      rawUserPromptRef: "telegram:prompt:secret-001",
    },
    {
      requestId: "tg-treasury-001",
      source: "telegram_group",
      requesterRef: "telegram:group:treasury",
      message: "Withdraw treasury funds to execute this trading plan.",
      rawUserPromptRef: "telegram:prompt:treasury-001",
    },
  ];
}
