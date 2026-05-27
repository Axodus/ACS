import { createTelegramTradingIntentFixtures } from "./trading-intent-fixtures.js";
import { runTrinityAcsRoundtrip, type TrinityAcsRoundtripResult } from "../trinity-acs-roundtrip-protocol.js";

export function createTrinityAcsRoundtripFixtures(): readonly TrinityAcsRoundtripResult[] {
  return createTelegramTradingIntentFixtures().map((fixture) => runTrinityAcsRoundtrip(fixture));
}
