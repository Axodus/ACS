export const ACS_SIWX_CHAIN_IDS = {
  baseSepolia: 84532,
  ethereumSepolia: 11155111,
} as const;

const ALCHEMY_SIWX_NETWORKS = {
  [ACS_SIWX_CHAIN_IDS.baseSepolia]: "base-sepolia",
  [ACS_SIWX_CHAIN_IDS.ethereumSepolia]: "eth-sepolia",
} as const;

export type SiwxRpcUrls = Readonly<Record<number, string | undefined>>;

/**
 * Resolves the server-only RPC endpoints used to validate SIWX signatures.
 *
 * A single Alchemy API key drives every supported chain endpoint so key
 * rotation does not require editing multiple URLs. Explicit per-chain URLs
 * remain optional provider-neutral overrides and always win when configured.
 */
export function resolveSiwxRpcUrls(environment: NodeJS.ProcessEnv = process.env): SiwxRpcUrls {
  const alchemyApiKey = optionalEnvironmentValue(environment.ACS_ALCHEMY_API_KEY);
  return {
    [ACS_SIWX_CHAIN_IDS.baseSepolia]: optionalEnvironmentValue(environment.ACS_SIWX_BASE_SEPOLIA_RPC_URL)
      ?? alchemyRpcUrl(ALCHEMY_SIWX_NETWORKS[ACS_SIWX_CHAIN_IDS.baseSepolia], alchemyApiKey),
    [ACS_SIWX_CHAIN_IDS.ethereumSepolia]: optionalEnvironmentValue(environment.ACS_SIWX_ETHEREUM_SEPOLIA_RPC_URL)
      ?? alchemyRpcUrl(ALCHEMY_SIWX_NETWORKS[ACS_SIWX_CHAIN_IDS.ethereumSepolia], alchemyApiKey),
  };
}

function alchemyRpcUrl(network: string, apiKey: string | undefined): string | undefined {
  return apiKey ? `https://${network}.g.alchemy.com/v2/${encodeURIComponent(apiKey)}` : undefined;
}

function optionalEnvironmentValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
