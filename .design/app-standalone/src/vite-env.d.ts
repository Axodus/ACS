/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ACS_API_BASE_URL?: string;
  readonly VITE_ACS_ENVIRONMENT?: string;
  readonly VITE_ACS_TENANT_ADMIN_URL?: string;
  readonly VITE_ACS_TENANT_ID?: string;
  readonly VITE_REOWN_ENABLED?: string;
  readonly VITE_REOWN_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
