import { lazy, Suspense } from "react";
import { reownAppKitState } from "./reown-appkit-config";

const ConfiguredAccountControl = lazy(async () => {
  const runtime = await import("./ConfiguredAccountControl");
  return { default: runtime.ConfiguredAccountControl };
});

export function AccountControl({ dark }: { readonly dark: boolean }) {
  if (reownAppKitState.status !== "READY") {
    return (
      <button
        className="account-control unavailable"
        type="button"
        disabled
        title={reownAppKitState.reasonCode}
      >
        <span className="account-control-state">{reownAppKitState.status}</span>
        <b>Accounts</b>
      </button>
    );
  }
  return (
    <Suspense fallback={<AccountControlLoading />}>
      <ConfiguredAccountControl dark={dark} />
    </Suspense>
  );
}

function AccountControlLoading() {
  return (
    <button className="account-control" type="button" disabled>
      <span className="account-control-state">INITIALIZING</span>
      <b>Accounts</b>
    </button>
  );
}
