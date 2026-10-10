/**
 * Tipos de las variables de entorno que Vite expone en import.meta.env.
 * Solo las variables que empiezan por VITE_ llegan al navegador.
 */
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
