// Avertissements « au-delà de l'expérience historique » : fonctions pures (testées dans warnings.test.js).
// Deux paliers, déclenchés par la trajectoire du scénario choisi (n'importe quelle année de l'horizon). Seuils : src/config.js.

import { WARNING_THRESHOLDS as W } from '../../config.js'
import { fmt } from './helpers.js'
import { PARAM_BY_ID } from '../../engine/params.js'

const above = (v, threshold) => Number.isFinite(v) && v > threshold

/** Part des intérêts dans les recettes publiques (%), ou null si les recettes ne sont pas un nombre positif. Recettes : voir `revenue` dans project.js. */
export const interestShareOfRevenue = (row) =>
  Number.isFinite(row.interest) && Number.isFinite(row.revenue) && row.revenue > 0 ? (100 * row.interest) / row.revenue : null

/** Autres grandeurs affichées en % du PIB pour une année (en %, valeur absolue) : intérêts et solde. La dette a son propre test (même seuil). */
const gdpFigures = (row) => [row.interestRatio, Math.abs(row.balanceRatio)].map((v) => 100 * v)

/**
 * Évalue les deux paliers sur la trajectoire du scénario (`result.total`).
 * Palier 1 : première année où la dette dépasse `tier1DebtPct` % du PIB.
 * Palier 2 : première année où la dette dépasse `tier2DebtPct` %, OU où les intérêts dépassent `tier2InterestShareRevenuePct` % des recettes,
 * OU où une grandeur affichée en % du PIB dépasse `tier2GdpFigurePct` % (règle générale).
 * @returns {{ tier1: null | { year: number, t: number, debtPct: number }, tier2: null | { year: number, t: number, debtPct: number, interestSharePct: number | null, reasons: string[] } }}
 */
export function evaluateWarnings(result) {
  let tier1 = null
  let tier2 = null
  for (let t = 0; t < result.total.length; t++) {
    const row = result.total[t]
    const debtPct = 100 * row.debtRatio
    if (!tier1 && above(debtPct, W.tier1DebtPct)) tier1 = { year: row.year, t, debtPct }
    if (!tier2) {
      const share = interestShareOfRevenue(row)
      const reasons = []
      if (above(debtPct, W.tier2DebtPct)) reasons.push('dette')
      if (above(share, W.tier2InterestShareRevenuePct)) reasons.push('intérêts')
      if (gdpFigures(row).some((v) => above(v, W.tier2GdpFigurePct))) reasons.push('grandeur en % du PIB')
      if (reasons.length) tier2 = { year: row.year, t, debtPct, interestSharePct: share, reasons }
    }
    if (tier1 && tier2) break
  }
  return { tier1, tier2 }
}

/** Texte du palier 1 : le repère concerne les économies avancées seulement. */
export const tier1Text = (w) =>
  `Au-delà du plus haut niveau jamais atteint par une économie avancée (Japon : ${W.tier1ReferencePct} % du PIB en ${W.tier1ReferenceYear}, FMI). `
  + `Seuil franchi en ${w.year} : dette à ${fmt(w.debtPct, 0)} % du PIB.`

const TIER2_SUITE = 'Bien avant ce point, un défaut, une forte inflation ou une restructuration de la dette interviendraient ; le modèle ne décrit plus une situation réaliste.'

/**
 * Explication du palier 2 : pourquoi les intérêts dépassent les recettes à ces niveaux de dette (E9 : pente `dette.beta`, plafond du taux 25 %).
 * Présentée comme une hypothèse du modèle, jamais comme un fait ; β vient des paramètres (pb par point de dette), pas d'un littéral.
 * @param {number} [betaPb] pente β en points de base par point de dette (défaut : paramètre `dette.beta`)
 */
export function tier2Explanation(betaPb = PARAM_BY_ID['dette.beta'].value) {
  const b = Number.isFinite(betaPb) ? fmt(betaPb, Number.isInteger(betaPb) ? 0 : 1) : '—'
  return `Hypothèse du modèle : le taux d'intérêt monte de ${b} point${betaPb > 1 ? 's' : ''} de base par point de dette au-delà de la référence (plafonné à 25 %). `
    + 'Cette pente est une hypothèse, non un fait (voir « Hypothèses utilisées », paramètre dette.beta) : c\'est elle qui fait dépasser les recettes par les intérêts à ces niveaux.'
}

/**
 * Texte du palier 2. Les intérêts ne sont dits supérieurs à la totalité des recettes que si X ≥ 100 % ; sinon, ils « absorbent X % ».
 * Le palier se déclenche sur la valeur non arrondie (> 50 %) : si l'arrondi retombe sur le seuil, on écrit « plus de 50 % » (jamais « absorberaient 50 % »).
 * Si les recettes ne sont pas calculables, la phrase sur les intérêts est omise plutôt qu'inventée.
 */
export function tier2Text(w) {
  const x = w.interestSharePct
  const debut = 'Trajectoire hors de toute expérience historique : '
  if (x === null || !Number.isFinite(x)) return `${debut}en ${w.year}, la dette atteindrait ${fmt(w.debtPct, 0)} % du PIB. ${TIER2_SUITE}`
  if (x >= 100) return `${debut}en ${w.year}, les intérêts dépasseraient la totalité des recettes publiques (${fmt(x, 0)} %). ${TIER2_SUITE}`
  const seuil = W.tier2InterestShareRevenuePct
  if (x > seuil && Number(fmt(x, 0)) === seuil) return `${debut}en ${w.year}, les intérêts absorberaient plus de ${seuil} % des recettes publiques. ${TIER2_SUITE}`
  return `${debut}en ${w.year}, les intérêts absorberaient ${fmt(x, 0)} % des recettes publiques. ${TIER2_SUITE}`
}

/**
 * Découpe les séries au palier 2 : pour chaque série `k` du scénario, `kBeyond` porte la partie à partir de l'année du palier (comprise,
 * pour que le trait se raccorde), et `k` n'est conservée que jusqu'à cette année. Les séries de référence (suffixe « Ref ») et `year`
 * ne changent pas. Sans palier 2, les données sont rendues telles quelles. Les valeurs ne sont jamais modifiées : l'export CSV reste complet.
 */
export function splitSeriesAtYear(data, year) {
  if (!Number.isFinite(year)) return data
  return data.map((row) => {
    const out = { ...row }
    for (const k of Object.keys(row)) {
      if (k === 'year' || k.endsWith('Ref')) continue
      if (row.year >= year) out[`${k}Beyond`] = row[k]
      if (row.year > year) out[k] = null
    }
    return out
  })
}

/**
 * Bornes de l'axe vertical qui ignorent la partie au-delà du palier 2 : minimum et maximum du scénario jusqu'à l'année du palier et de la
 * référence entière, plus une marge. `null` sans palier 2 (axe automatique) ou sans valeur finie.
 */
export function visibleDomain(data, key, refKey, tier2Year) {
  if (!Number.isFinite(tier2Year)) return null
  const vals = []
  for (const r of data) {
    if (r.year <= tier2Year && Number.isFinite(r[key])) vals.push(r[key])
    if (Number.isFinite(r[refKey])) vals.push(r[refKey])
  }
  if (vals.length === 0) return null
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pad = Math.max((hi - lo) * 0.1, 0.5)
  return [Math.floor(lo - pad), Math.ceil(hi + pad)]
}
