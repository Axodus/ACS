"""
ACS sandbox-only Hummingbot strategy artifact.

This file is not mounted into live Hummingbot, does not import Hummingbot
runtime modules, does not access connectors, and does not contain secrets.
It exists only to prove the ACS sandbox create/edit workflow.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class SandboxRsiConfig:
    strategy_id: str = "acs_rsi_sandbox_pilot"
    market: str = "BTC-USDT"
    candle_interval: str = "1m"
    rsi_period: int = 14
    oversold_threshold: int = 28
    overbought_threshold: int = 72
    max_position_notional_usd: int = 0
    live_execution_enabled: bool = False
    paper_trading_enabled: bool = False


def describe_strategy() -> dict[str, object]:
    config = SandboxRsiConfig()
    return {
        "strategyId": config.strategy_id,
        "mode": "acs_sandbox_only",
        "market": config.market,
        "candleInterval": config.candle_interval,
        "rsiPeriod": config.rsi_period,
        "oversoldThreshold": config.oversold_threshold,
        "overboughtThreshold": config.overbought_threshold,
        "maxPositionNotionalUsd": config.max_position_notional_usd,
        "liveExecutionEnabled": config.live_execution_enabled,
        "paperTradingEnabled": config.paper_trading_enabled,
        "blockedActions": [
            "hummingbot_runtime",
            "connector_config",
            "api_keys",
            "network",
            "mcp",
            "backtest",
            "paper_trade",
            "live_trade",
        ],
    }
