import type { Plugin } from "vite";

/** Local fallback when the hosted Sites plugin is not injected. */
export function sites(): Plugin {
  return { name: "sites-local-fallback" };
}
