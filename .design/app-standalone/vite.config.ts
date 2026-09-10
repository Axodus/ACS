import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const DEFAULT_LOCAL_API_BASE_URL = "http://127.0.0.1:8788/api/v1";
const DEFAULT_DEVELOPMENT_API_BASE_URL = "https://acs-axodus.up.railway.app/api/v1";

function apiTarget(baseUrl: string): string {
  return baseUrl.replace(/\/+api\/v1\/?$/, "").replace(/\/$/, "");
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const environment = env.VITE_ACS_ENVIRONMENT?.trim() || (mode === "development" ? "development" : "local");
  const configuredBaseUrl = env.VITE_ACS_API_BASE_URL?.trim();
  const baseUrl = configuredBaseUrl || (
    environment === "local" ? DEFAULT_LOCAL_API_BASE_URL : DEFAULT_DEVELOPMENT_API_BASE_URL
  );

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 3000,
      proxy: {
        "/api/v1": {
          target: apiTarget(baseUrl),
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
