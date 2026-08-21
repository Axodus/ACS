const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1)$/i;
const PRIVATE_RAILWAY_HOST_PATTERN = /\.railway\.internal$/i;

function normalizeEnvironment(raw) {
  const value = (raw ?? "").trim();
  switch (value) {
    case "local":
    case "development":
    case "production":
      return value;
    default:
      throw new Error("VITE_ACS_ENVIRONMENT must be local, development, or production");
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function isPrivateRailwayOrigin(value) {
  try {
    return PRIVATE_RAILWAY_HOST_PATTERN.test(new URL(value).hostname);
  } catch {
    return false;
  }
}

function isLocalOrigin(value) {
  try {
    return LOCAL_HOST_PATTERN.test(new URL(value).hostname);
  } catch {
    return false;
  }
}

export function resolveStandaloneApiBaseUrl(environment = import.meta.env, windowLocation = typeof window !== "undefined" ? window.location : undefined) {
  const mode = normalizeEnvironment(environment.VITE_ACS_ENVIRONMENT);
  const explicit = typeof environment.VITE_ACS_API_BASE_URL === "string" ? environment.VITE_ACS_API_BASE_URL.trim() : "";
  const localDefault = "http://127.0.0.1:8788/api/v1";

  if (mode === "local") {
    if (!explicit) {
      return localDefault;
    }
    const normalized = trimTrailingSlash(explicit);
    if (isLocalOrigin(normalized) || normalized.startsWith("/")) {
      return normalized;
    }
    throw new Error("LOCAL standalone UI must use a localhost API origin");
  }

  if (!explicit) {
    throw new Error("VITE_ACS_API_BASE_URL is required in development and production");
  }

  const normalized = trimTrailingSlash(explicit);
  if (normalized.startsWith("/")) {
    throw new Error("development and production standalone UI must use a public API origin");
  }

  const parsed = new URL(normalized);
  if (parsed.protocol !== "https:") {
    throw new Error("development and production standalone UI must use https API origins");
  }
  if (LOCAL_HOST_PATTERN.test(parsed.hostname) || isPrivateRailwayOrigin(normalized)) {
    throw new Error("development and production standalone UI must not use localhost or private Railway API origins");
  }
  if (mode === "production" && windowLocation && LOCAL_HOST_PATTERN.test(windowLocation.hostname)) {
    throw new Error("production standalone UI must not run from a localhost browser origin");
  }
  return normalized;
}
