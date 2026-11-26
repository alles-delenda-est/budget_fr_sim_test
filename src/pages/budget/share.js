// Liens de scénario partageables : leviers, horizon et cas des effets d'offre dans la chaîne de requête.
// Le routage est par « hash » (#/budget) : la requête suit la route dans le hash, p. ex.
//   https://…/#/budget?h=dixAns&cas=central&tva_normal=3&ir=-10
// Fonctions pures, testées dans share.test.js.

import { LEVERS, LEVER_BY_ID } from '../../engine/levers.js'
import { HORIZONS, DEMAND_REGIMES } from '../../engine/project.js'
import { LVT_SCENARIO_CODES } from '../../engine/lvt-module.js'
import { MACRO_VARIANT_BY_ID } from './presets.js'

export const DEFAULT_HORIZON = 'dixAns'
export const DEFAULT_CASE = 'central'
export const DEFAULT_REGIME = 'normal'
const CASES = ['bas', 'central', 'haut']
const RESERVED = new Set(['h', 'cas', 'm', 'lvt', 'lvt_ocde', 'reg', 'inf'])
/** Module « taxe sur la valeur du sol » inactif (défaut) : scénario 0, borne OCDE non incluse. */
export const DEFAULT_LVT = Object.freeze({ scenario: 0, ocde: 0 })
const lvtActive = (lvt) => Number.isInteger(lvt?.scenario) && lvt.scenario > 0 && LVT_SCENARIO_CODES.includes(lvt.scenario)

/**
 * Chaîne de requête (sans « ? ») d'un scénario. Seuls les leviers non nuls, une éventuelle variante macroéconomique valide,
 * les dynamiques avancées opt-in (reg, inf=1) et le module « taxe sur la valeur du sol » s'il est actif sont écrits.
 */
export function encodeScenario({ values = {}, horizon = DEFAULT_HORIZON, ysCase = DEFAULT_CASE, macroId = null, lvt = null, demandRegime = DEFAULT_REGIME, endogenousInflation = false } = {}) {
  const q = new URLSearchParams()
  q.set('h', horizon)
  q.set('cas', ysCase)
  if (macroId && Object.hasOwn(MACRO_VARIANT_BY_ID, macroId)) q.set('m', macroId)
  if (demandRegime && demandRegime !== DEFAULT_REGIME && DEMAND_REGIMES.includes(demandRegime)) q.set('reg', demandRegime)
  if (endogenousInflation === true) q.set('inf', '1')
  for (const l of LEVERS) {
    const v = values[l.id]
    if (typeof v === 'number' && Number.isFinite(v) && v !== 0) q.set(l.id, String(v))
  }
  if (lvtActive(lvt)) {
    q.set('lvt', String(lvt.scenario))
    if (lvt.ocde === 1) q.set('lvt_ocde', '1')
  }
  return q.toString()
}

/**
 * Lit une chaîne de requête et renvoie un scénario valide. Clés inconnues ignorées ; horizon, cas et variante macroéconomique
 * inconnus remplacés par les valeurs par défaut ; valeurs non numériques ou non finies ignorées ; valeurs bornées au min / max du levier.
 * Les clés `lvt`, `demandRegime` et `endogenousInflation` ne sont présentes que si elles sont actives (rétrocompatibilité des liens).
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
  const reg = q.get('reg')
  if (reg && reg !== DEFAULT_REGIME && DEMAND_REGIMES.includes(reg)) out.demandRegime = reg
  if (q.get('inf') === '1') out.endogenousInflation = true
  for (const [key, raw] of q.entries()) {
    if (RESERVED.has(key) || !Object.hasOwn(LEVER_BY_ID, key) || raw.trim() === '') continue
    const x = Number(raw)
    if (!Number.isFinite(x)) continue
    const lever = LEVER_BY_ID[key]
    const clamped = Math.min(lever.max, Math.max(lever.min, x))
    if (clamped !== 0) out.values[key] = clamped
  }
  const lvt = { scenario: Number(q.get('lvt')), ocde: q.get('lvt_ocde') === '1' ? 1 : 0 }
  if (lvtActive(lvt)) out.lvt = lvt
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
