import { useEffect } from "react";
import { useAppKit, useAppKitAccount, useAppKitTheme } from "@reown/appkit/react";
import { useAcsAccount } from "./acs-account-context-value";

export function ConfiguredAccountControl({ dark }: { readonly dark: boolean }) {
  const { open } = useAppKit();
  const wallet = useAppKitAccount({ namespace: "eip155" });
  const { setThemeMode } = useAppKitTheme();
  const account = useAcsAccount();

  useEffect(() => {
    setThemeMode(dark ? "dark" : "light");
  }, [dark, setThemeMode]);

  const label = account.status === "NO_TENANT_MEMBERSHIP"
    ? "No tenant membership"
    : account.status === "AUTHENTICATED"
      ? shortAddress(account.projection.externalIdentity.normalizedAddress)
      : account.status === "AUTHENTICATING"
        ? "Authenticating"
        : account.status === "SUSPENDED"
          ? "Account suspended"
          : wallet.isConnected
            ? "Wallet connected"
            : "Connect wallet";
  const state = account.status === "AUTHENTICATED"
    ? "ACS AUTHENTICATED"
    : account.status === "NO_TENANT_MEMBERSHIP"
      ? "NO_TENANT_MEMBERSHIP"
      : wallet.isConnected ? "WALLET ONLY" : "DISCONNECTED";

  return (
    <button
      className={`account-control ${account.status.toLowerCase()}`}
      type="button"
      onClick={() => void open({ view: wallet.isConnected ? "Account" : "Connect" })}
      aria-label={`${label}. ${state}. Open wallet account controls.`}
    >
      <span className="account-control-state">{state}</span>
      <b>{label}</b>
    </button>
  );
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
