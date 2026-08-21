export declare function resolveStandaloneApiBaseUrl(environment?: {
  readonly VITE_ACS_ENVIRONMENT?: string;
  readonly VITE_ACS_API_BASE_URL?: string;
}, windowLocation?: {
  readonly hostname?: string;
} | undefined): string;
