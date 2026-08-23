import { lazy, Suspense, type ReactNode } from "react";
import { reownAppKitState } from "./reown-appkit-config";

const ConfiguredReownAppKitProvider = lazy(async () => {
  const runtime = await import("./reown-appkit-runtime");
  return { default: runtime.ConfiguredReownAppKitProvider };
});

export function ReownAppKitProvider({ children }: { readonly children: ReactNode }) {
  if (reownAppKitState.status !== "READY") return children;
  return (
    <Suspense fallback={null}>
      <ConfiguredReownAppKitProvider>{children}</ConfiguredReownAppKitProvider>
    </Suspense>
  );
}
