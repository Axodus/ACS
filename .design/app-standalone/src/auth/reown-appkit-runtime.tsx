import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { baseSepolia, sepolia } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  DefaultSIWX,
  InformalMessenger,
  LocalStorage,
  SIWXVerifier,
  type SIWXSession,
  type SIWXStorage,
} from "@reown/appkit-siwx";
import type { CaipNetworkId } from "@reown/appkit/react";
import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { productApi } from "../api/product-api";
import {
  clearAcsSession,
  getAcsSessionSnapshot,
  setAcsSession,
} from "./acs-session-store";
import { reownProjectId } from "./reown-appkit-config";

const networks = [baseSepolia, sepolia] as const;

class AcsSiwxVerifier extends SIWXVerifier {
  readonly chainNamespace = "eip155" as const;

  async verify(session: SIWXSession): Promise<boolean> {
    const existing = getAcsSessionSnapshot();
    if (existing) {
      try {
        const account = await productApi.getMyAccount();
        if (matchesServerIdentity(session, account.externalIdentity.caip10)) return true;
      } catch {
        clearAcsSession();
      }
    }

    const exchanged = await productApi.exchangeSiwxArtifact({
      message: session.message,
      signature: session.signature,
    });
    if (!matchesServerIdentity(session, exchanged.externalIdentity.caip10)) {
      setAcsSession({ accessToken: exchanged.accessToken, expiresAt: exchanged.session.expiresAt });
      await productApi.revokeAuthSession().catch(() => undefined);
      clearAcsSession();
      return false;
    }
    setAcsSession({ accessToken: exchanged.accessToken, expiresAt: exchanged.session.expiresAt });
    return true;
  }
}

class AcsSiwxStorage implements SIWXStorage {
  readonly #storage = new LocalStorage({ key: "acs.reown.siwx.sessions.v1" });

  add(session: SIWXSession): Promise<void> {
    return this.#storage.add(session);
  }

  set(sessions: SIWXSession[]): Promise<void> {
    return this.#storage.set(sessions);
  }

  get(chainId: CaipNetworkId, address: string): Promise<SIWXSession[]> {
    return this.#storage.get(chainId, address);
  }

  async delete(chainId: CaipNetworkId, address: string): Promise<void> {
    if (getAcsSessionSnapshot()) {
      await productApi.revokeAuthSession().catch(() => undefined);
    }
    clearAcsSession();
    await this.#storage.delete(chainId, address);
  }
}

const queryClient = new QueryClient();
const appOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
const appUrl = new URL(appOrigin);
const wagmiAdapter = new WagmiAdapter({ networks: [...networks], projectId: reownProjectId });
const siwx = new DefaultSIWX({
  messenger: new InformalMessenger({
    domain: appUrl.host,
    uri: appUrl.origin,
    statement: "Authenticate this wallet as an ACS identity. Tenant and financial authority remain separate.",
    expiration: 15 * 60 * 1000,
    clearChainIdNamespace: true,
    getNonce: async () => (await productApi.createSiwxNonce()).nonce,
  }),
  verifiers: [new AcsSiwxVerifier()],
  storage: new AcsSiwxStorage(),
  required: true,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: [...networks],
  projectId: reownProjectId,
  siwx,
  metadata: {
    name: "ACS Control Plane",
    description: "Axodus ACS operator identity",
    url: appUrl.origin,
    icons: [new URL("/assets/Axodus_logo.svg", appUrl.origin).toString()],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
    swaps: false,
    onramp: false,
  },
});

export function ConfiguredReownAppKitProvider({ children }: { readonly children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

function matchesServerIdentity(session: SIWXSession, caip10: string): boolean {
  return caip10.toLowerCase() === `${session.data.chainId}:${session.data.accountAddress}`.toLowerCase();
}
