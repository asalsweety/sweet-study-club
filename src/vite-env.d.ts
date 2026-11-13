/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_APP_URL?: string
  /** Optional API origin for non-same-origin clients; the web app uses same-origin /api. */
  readonly VITE_API_BASE_URL?: string
  readonly VITE_TITLE_FONT_LICENSED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
