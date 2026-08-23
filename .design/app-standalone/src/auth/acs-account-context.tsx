import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { productApi } from "../api/product-api";
import {
  clearAcsSession,
  getAcsSessionSnapshot,
  subscribeAcsSession,
} from "./acs-session-store";
import { AcsAccountContext, type AcsAccountContextValue, type AcsAccountState } from "./acs-account-context-value";

export function AcsAccountProvider({ children }: { readonly children: ReactNode }) {
  const session = useSyncExternalStore(subscribeAcsSession, getAcsSessionSnapshot, () => null);
  const [state, setState] = useState<AcsAccountState>(() => session
    ? { status: "AUTHENTICATING", projection: null, reasonCode: "SESSION_VALIDATION_PENDING" }
    : { status: "DISCONNECTED", projection: null, reasonCode: "NO_ACS_SESSION" });

  const refresh = useCallback(async () => {
    if (!getAcsSessionSnapshot()) {
      setState({ status: "DISCONNECTED", projection: null, reasonCode: "NO_ACS_SESSION" });
      return;
    }
    setState({ status: "AUTHENTICATING", projection: null, reasonCode: "SESSION_VALIDATION_PENDING" });
    try {
      const projection = await productApi.getMyAccount();
      setState(projection.membershipState === "NO_TENANT_MEMBERSHIP"
        ? { status: "NO_TENANT_MEMBERSHIP", projection, reasonCode: "NO_TENANT_MEMBERSHIP" }
        : { status: "AUTHENTICATED", projection, reasonCode: "ACTIVE_TENANT_MEMBERSHIP" });
    } catch (error) {
      const reason = readApiReason(error);
      if (reason === "account_suspended" || reason === "ACS_ACCOUNT_SUSPENDED") {
        clearAcsSession();
        setState({ status: "SUSPENDED", projection: null, reasonCode: "ACCOUNT_SUSPENDED" });
        return;
      }
      if (reason === "account_disabled" || reason === "ACS_ACCOUNT_DISABLED") {
        clearAcsSession();
        setState({ status: "SUSPENDED", projection: null, reasonCode: "ACCOUNT_DISABLED" });
        return;
      }
      if (readApiStatus(error) === 401) clearAcsSession();
      setState({ status: "UNAVAILABLE", projection: null, reasonCode: reason ?? "ACCOUNT_PROJECTION_UNAVAILABLE" });
    }
  }, []);

  const signOut = useCallback(async () => {
    if (getAcsSessionSnapshot()) await productApi.revokeAuthSession().catch(() => undefined);
    clearAcsSession();
    setState({ status: "DISCONNECTED", projection: null, reasonCode: "NO_ACS_SESSION" });
  }, []);

  useEffect(() => {
    void refresh();
  }, [session?.accessToken, refresh]);

  const value = useMemo<AcsAccountContextValue>(() => ({ ...state, refresh, signOut }), [state, refresh, signOut]);
  return <AcsAccountContext.Provider value={value}>{children}</AcsAccountContext.Provider>;
}

function readApiReason(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { readonly reason?: unknown; readonly code?: unknown };
  return typeof candidate.reason === "string"
    ? candidate.reason
    : typeof candidate.code === "string" ? candidate.code : undefined;
}

function readApiStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { readonly status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}
