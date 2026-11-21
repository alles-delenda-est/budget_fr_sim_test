// Liens de scénario partageables : leviers, horizon et cas des effets d'offre dans la chaîne de requête.
// Le routage est par « hash » (#/budget) : la requête suit la route dans le hash, p. ex.
//   https://…/#/budget?h=dixAns&cas=central&tva_normal=3&ir=-10
// Fonctions pures, testées dans share.test.js.

import { LEVERS, LEVER_BY_ID } from '../../engine/levers.js'
import { HORIZONS } from '../../engine/project.js'
import { MACRO_VARIANT_BY_ID } from './presets.js'

export const DEFAULT_HORIZON = 'dixAns'
export const DEFAULT_CASE = 'central'
const CASES = ['bas', 'central', 'haut']
const RESERVED = new Set(['h', 'cas', 'm'])

/** Chaîne de requête (sans « ? ») d'un scénario. Seuls les leviers non nuls (et une éventuelle variante macroéconomique valide) sont écrits. */
export function encodeScenario({ values = {}, horizon = DEFAULT_HORIZON, ysCase = DEFAULT_CASE, macroId = null } = {}) {
  const q = new URLSearchParams()
  q.set('h', horizon)
  q.set('cas', ysCase)
  if (macroId && Object.hasOwn(MACRO_VARIANT_BY_ID, macroId)) q.set('m', macroId)
  for (const l of LEVERS) {
    const v = values[l.id]
    if (typeof v === 'number' && Number.isFinite(v) && v !== 0) q.set(l.id, String(v))
  }
  return q.toString()
}

/**
 * Lit une chaîne de requête et renvoie un scénario valide. Clés inconnues ignorées ; horizon, cas et variante macroéconomique
 * inconnus remplacés par les valeurs par défaut ; valeurs non numériques ou non finies ignorées ; valeurs bornées au min / max du levier.
 * Ne lève jamais d'exception.
 */
export function decodeScenario(query) {
  const out = { values: {}, horizon: DEFAULT_HORIZON, ysCase: DEFAULT_CASE, macroId: null }
  let q
  try {
    q = new URLSearchParams(typeof query === 'string' ? query.replace(/^\?/, '') : '')
  } catch {
    return out
  }
  const h = q.get('h')
  if (h && Object.hasOwn(HORIZONS, h)) out.horizon = h
  const cas = q.get('cas')
  if (cas && CASES.includes(cas)) out.ysCase = cas
  const m = q.get('m')
  if (m && Object.hasOwn(MACRO_VARIANT_BY_ID, m)) out.macroId = m
  for (const [key, raw] of q.entries()) {
    if (RESERVED.has(key) || !Object.hasOwn(LEVER_BY_ID, key) || raw.trim() === '') continue
    const x = Number(raw)
    if (!Number.isFinite(x)) continue
    const lever = LEVER_BY_ID[key]
    const clamped = Math.min(lever.max, Math.max(lever.min, x))
    if (clamped !== 0) out.values[key] = clamped
  }
  return out
}

/** Partie requête d'un hash « #/budget?a=1 » (sans « ? »), ou chaîne vide. */
export function queryFromHash(hash) {
  const i = typeof hash === 'string' ? hash.indexOf('?') : -1
  return i === -1 ? '' : hash.slice(i + 1)
}

/** Hash de la page budget pour un scénario : « #/budget?… ». */
export const scenarioHash = (scenario) => `#/budget?${encodeScenario(scenario)}`

/** URL absolue du scénario ; l'éventuelle requête classique (avant le hash) est conservée telle quelle. */
export function scenarioUrl(loc, scenario) {
  return `${loc.origin}${loc.pathname}${loc.search ?? ''}${scenarioHash(scenario)}`
}
