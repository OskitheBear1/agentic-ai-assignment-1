/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Neon Managed Better Auth endpoint. Public. */
  readonly VITE_NEON_AUTH_URL: string;
  /** Neon Data API endpoint. Public; protected by Row Level Security. */
  readonly VITE_NEON_DATA_API_URL: string;
  /** Base URL of our Node backend. */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
