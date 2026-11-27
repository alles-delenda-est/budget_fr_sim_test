// Liens de scénario partageables : leviers, horizon et cas des effets d'offre dans la chaîne de requête.
// Le routage est par « hash » (#/budget) : la requête suit la route dans le hash, p. ex.
//   https://…/#/budget?h=dixAns&cas=central&tva_normal=3&ir=-10
// Fonctions pures, testées dans share.test.js.

import { LEVERS, LEVER_BY_ID } from '../../engine/levers.js'
import { HORIZONS, DEMAND_REGIMES, PHASING_YEARS, DEFAULT_PHASING_YEARS } from '../../engine/project.js'
import { LVT_SCENARIO_CODES } from '../../engine/lvt-module.js'
import { MACRO_VARIANT_BY_ID } from './presets.js'
import { STRESS_TEST_BY_ID } from './stressTests.js'

export const DEFAULT_HORIZON = 'dixAns'
export const DEFAULT_CASE = 'central'
export const DEFAULT_REGIME = 'normal'
export const DEFAULT_PHASING = DEFAULT_PHASING_YEARS
const CASES = ['bas', 'central', 'haut']
const RESERVED = new Set(['h', 'cas', 'm', 'choc', 'lvt', 'lvt_ocde', 'reg', 'inf', 'rampe', 'a'])
/** Module « taxe sur la valeur du sol » inactif (défaut) : scénario 0, borne OCDE non incluse. */
export const DEFAULT_LVT = Object.freeze({ scenario: 0, ocde: 0 })
const lvtActive = (lvt) => Number.isInteger(lvt?.scenario) && lvt.scenario > 0 && LVT_SCENARIO_CODES.includes(lvt.scenario)

const MAX_PIN_LABEL_LEN = 40
// eslint-disable-next-line no-control-regex
const sanitizePinLabel = (raw) => String(raw ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, MAX_PIN_LABEL_LEN)

function encodeCoreFields(q, { values = {}, macroId = null, stressId = null, lvt = null, demandRegime = DEFAULT_REGIME, endogenousInflation = false, phasingYears = DEFAULT_PHASING }, prefix = '') {
  const validStress = stressId && Object.hasOwn(STRESS_TEST_BY_ID, stressId)
  if (validStress) q.set(`${prefix}choc`, stressId)
  else if (macroId && Object.hasOwn(MACRO_VARIANT_BY_ID, macroId)) q.set(`${prefix}m`, macroId)
  if (PHASING_YEARS.includes(phasingYears) && phasingYears !== DEFAULT_PHASING) q.set(`${prefix}rampe`, String(phasingYears))
  if (demandRegime && demandRegime !== DEFAULT_REGIME && DEMAND_REGIMES.includes(demandRegime)) q.set(`${prefix}reg`, demandRegime)
  if (endogenousInflation === true) q.set(`${prefix}inf`, '1')
  for (const l of LEVERS) {
    const v = values[l.id]
    if (typeof v === 'number' && Number.isFinite(v) && v !== 0) q.set(`${prefix}${l.id}`, String(v))
  }
  if (lvtActive(lvt)) {
    q.set(`${prefix}lvt`, String(lvt.scenario))
    if (lvt.ocde === 1) q.set(`${prefix}lvt_ocde`, '1')
  }
}

function decodeCoreFields(q, prefix = '') {
  const out = { values: {}, macroId: null }
  const choc = q.get(`${prefix}choc`)
  const m = q.get(`${prefix}m`)
  if (choc && Object.hasOwn(STRESS_TEST_BY_ID, choc)) {
    out.stressId = choc
    out.macroId = null
  } else if (m && Object.hasOwn(MACRO_VARIANT_BY_ID, m)) {
    out.macroId = m
  }
  const reg = q.get(`${prefix}reg`)
  if (reg && reg !== DEFAULT_REGIME && DEMAND_REGIMES.includes(reg)) out.demandRegime = reg
  if (q.get(`${prefix}inf`) === '1') out.endogenousInflation = true
  const rampeRaw = q.get(`${prefix}rampe`)
  if (rampeRaw && /^\d+$/.test(rampeRaw.trim())) {
    const ry = Number(rampeRaw.trim())
    if (PHASING_YEARS.includes(ry) && ry !== DEFAULT_PHASING) out.phasingYears = ry
  }
  for (const [key, raw] of q.entries()) {
    if (prefix) {
      if (!key.startsWith(prefix)) continue
    } else if (RESERVED.has(key) || key.startsWith('a.')) continue
    const id = prefix ? key.slice(prefix.length) : key
    if (!Object.hasOwn(LEVER_BY_ID, id) || raw.trim() === '') continue
    const x = Number(raw)
    if (!Number.isFinite(x)) continue
    const lever = LEVER_BY_ID[id]
    const clamped = Math.min(lever.max, Math.max(lever.min, x))
    if (clamped !== 0) out.values[id] = clamped
  }
  const lvt = { scenario: Number(q.get(`${prefix}lvt`)), ocde: q.get(`${prefix}lvt_ocde`) === '1' ? 1 : 0 }
  if (lvtActive(lvt)) out.lvt = lvt
  return out
}

/**
 * Chaîne de requête (sans « ? ») d'un scénario. Seuls les leviers non nuls, une éventuelle variante macroéconomique valide,
 * l'étalement pluriannuel non immédiat (`rampe=3|5`), les dynamiques avancées opt-in (`reg`, `inf=1`), le module LVT actif
 * et l'éventuel scénario épinglé A (`a=1&a.*`) sont écrits.
 */
export function encodeScenario({ values = {}, horizon = DEFAULT_HORIZON, ysCase = DEFAULT_CASE, macroId = null, stressId = null, lvt = null, demandRegime = DEFAULT_REGIME, endogenousInflation = false, phasingYears = DEFAULT_PHASING, pinned = null } = {}) {
  const q = new URLSearchParams()
  q.set('h', horizon)
  q.set('cas', ysCase)
  encodeCoreFields(q, { values, macroId, stressId, lvt, demandRegime, endogenousInflation, phasingYears }, '')
  if (pinned && typeof pinned === 'object') {
    q.set('a', '1')
    const lbl = sanitizePinLabel(pinned.label)
    if (lbl) q.set('a.lbl', lbl)
    if (pinned.ysCase && CASES.includes(pinned.ysCase) && pinned.ysCase !== DEFAULT_CASE) q.set('a.cas', pinned.ysCase)
    encodeCoreFields(q, pinned, 'a.')
  }
  return q.toString()
}

/**
 * Lit une chaîne de requête et renvoie un scénario valide. Clés inconnues ignorées ; horizon, cas et variante macroéconomique
 * inconnus remplacés par les valeurs par défaut ; valeurs non numériques ou non finies ignorées ; valeurs bornées au min / max du levier.
 * Les clés `lvt`, `demandRegime`, `endogenousInflation`, `phasingYears` et `pinned` ne sont présentes que si elles sont actives (rétrocompatibilité des liens).
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
  const coreB = decodeCoreFields(q, '')
  Object.assign(out, coreB)
  if (q.get('a') === '1') {
    const coreA = decodeCoreFields(q, 'a.')
    const aCas = q.get('a.cas')
    const lbl = sanitizePinLabel(q.get('a.lbl'))
    out.pinned = {
      label: lbl || 'Scénario A',
      ysCase: aCas && CASES.includes(aCas) ? aCas : DEFAULT_CASE,
      ...coreA,
    }
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
