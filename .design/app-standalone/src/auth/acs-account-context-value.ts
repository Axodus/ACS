import { createContext, useContext } from "react";
import type { AcsAccountProjection } from "../api/product-api";

export type AcsAccountState =
  | { readonly status: "DISCONNECTED"; readonly projection: null; readonly reasonCode: "NO_ACS_SESSION" }
  | { readonly status: "AUTHENTICATING"; readonly projection: null; readonly reasonCode: "SESSION_VALIDATION_PENDING" }
  | { readonly status: "AUTHENTICATED"; readonly projection: AcsAccountProjection; readonly reasonCode: "ACTIVE_TENANT_MEMBERSHIP" }
  | { readonly status: "NO_TENANT_MEMBERSHIP"; readonly projection: AcsAccountProjection; readonly reasonCode: "NO_TENANT_MEMBERSHIP" }
  | { readonly status: "SUSPENDED"; readonly projection: null; readonly reasonCode: "ACCOUNT_SUSPENDED" | "ACCOUNT_DISABLED" }
  | { readonly status: "UNAVAILABLE"; readonly projection: null; readonly reasonCode: string };

export type AcsAccountContextValue = AcsAccountState & {
  readonly refresh: () => Promise<void>;
  readonly signOut: () => Promise<void>;
};

export const AcsAccountContext = createContext<AcsAccountContextValue | null>(null);

export function useAcsAccount(): AcsAccountContextValue {
  const value = useContext(AcsAccountContext);
  if (!value) throw new Error("useAcsAccount must be used within AcsAccountProvider");
  return value;
}
