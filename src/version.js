// Empreinte de version : numéro de package.json, commit court et date de construction,
// injectés par Vite (`define`, voir vite.config.js). Valeur « dev » hors construction.

const safe = (v) => (typeof v === 'string' && v ? v : 'dev')

export const APP_VERSION = safe(typeof __APP_VERSION__ === 'undefined' ? undefined : __APP_VERSION__)
export const GIT_COMMIT = safe(typeof __GIT_COMMIT__ === 'undefined' ? undefined : __GIT_COMMIT__)
export const BUILD_DATE = safe(typeof __BUILD_DATE__ === 'undefined' ? undefined : __BUILD_DATE__)

/** Libellé court : « v0.0.0 · a1b2c3d · 2026-11-18 » (ou « v0.0.0 · dev »). */
export const versionStamp = (v = APP_VERSION, c = GIT_COMMIT, d = BUILD_DATE) =>
  c === 'dev' ? `v${v} · dev` : `v${v} · ${c} · ${d}`
