const projectId = import.meta.env.VITE_REOWN_PROJECT_ID?.trim() ?? "";
const requested = import.meta.env.VITE_REOWN_ENABLED === "true";
const environment = import.meta.env.VITE_ACS_ENVIRONMENT ?? "local";

export type ReownAppKitState =
  | { readonly status: "READY"; readonly reasonCode: "CONFIGURED" }
  | { readonly status: "NOT_CONFIGURED"; readonly reasonCode: "REOWN_DISABLED" | "REOWN_PROJECT_ID_MISSING" }
  | { readonly status: "UNSUPPORTED"; readonly reasonCode: "PRODUCTION_NOT_ELIGIBLE" };

export const reownAppKitState: ReownAppKitState = environment === "production"
  ? { status: "UNSUPPORTED", reasonCode: "PRODUCTION_NOT_ELIGIBLE" }
  : !requested
    ? { status: "NOT_CONFIGURED", reasonCode: "REOWN_DISABLED" }
    : !projectId
      ? { status: "NOT_CONFIGURED", reasonCode: "REOWN_PROJECT_ID_MISSING" }
      : { status: "READY", reasonCode: "CONFIGURED" };

export const reownProjectId = projectId;
