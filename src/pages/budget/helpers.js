// Fonctions pures de la page « Simulateur budgétaire » (moteur v2) : formats, séries de graphiques,
// décomposition par cause, filtrage des lignes nulles, paramètres à expliquer. Testées dans helpers.test.js.

import { LEVERS, LEVER_BY_ID, BLOCKS } from '../../engine/levers.js'
import { PARAM_BY_ID } from '../../engine/params.js'
import { SUPPLY_BY_LEVER } from '../../engine/supply.js'
import { MACRO_VARIANT_BY_ID } from './presets.js'

const NF = (d) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })
const FORMATS = { 0: NF(0), 1: NF(1), 2: NF(2), 3: NF(3) }

/** Seuil à partir duquel `fmt` abrège (en valeur absolue arrondie) : « 12,3 k » au-delà de 10 000, notation « 1,23e12 » au-delà de 1 million. */
export const FMT_COMPACT_FROM = 1e4

/**
 * Nombre au format français ; « — » si la valeur n'est pas un nombre fini (jamais de NaN affiché).
 * Les très grandes valeurs sont abrégées pour tenir dans une carte de 375 px (12 caractères au plus, signe compris) :
 * de 10 000 à 1 million, « 12,3 k » (milliers, une décimale) ; au-delà, « 1,23e12 ». L'unité (Md€, %) est ajoutée par l'appelant.
 */
export function fmt(v, decimals = 1, { signed = false } = {}) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—'
  const rounded = Number(v.toFixed(decimals))
  const abs = Math.abs(rounded)
  const plus = signed && rounded > 0 ? '+' : ''
  if (abs >= 1e6) return `${plus}${rounded.toExponential(2).replace('.', ',').replace('e+', 'e')}`
  if (abs >= FMT_COMPACT_FROM) return `${plus}${FORMATS[1].format(rounded / 1e3)} k`
  const s = FORMATS[decimals].format(abs < 1e-9 ? 0 : rounded)
  return `${plus}${s}`
}

/** Valeur numérique finie ou null (les graphiques laissent un trou plutôt que d'afficher NaN). */
export const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const pct = (v) => (num(v) === null ? null : v * 100)

/** Seuil en deçà duquel une ligne s'affiche « 0,0 » : elle est masquée. */
export const HIDE_BELOW = 0.05

export const BLOCK_LABELS = {
  centrales: 'État et ODAC (administrations centrales)',
  securiteSociale: 'Sécurité sociale',
  locales: 'Collectivités locales',
}

export const SUPPLY_CASES = [
  { id: 'bas', label: 'Bas' },
  { id: 'central', label: 'Central' },
  { id: 'haut', label: 'Haut' },
]

/** Pas du curseur d'un levier : 0,5 si l'amplitude est faible, 1 sinon. */
export const sliderStep = (lever) => (lever.max - lever.min <= 10 ? 0.5 : 1)

/** Groupe d'affichage d'un levier : recettes, dépenses ou prestations (retraites, santé, chômage). */
export function leverGroup(lever) {
  if (lever.type === 'recette') return 'recettes'
  return lever.categorie === 'prestations' ? 'prestations' : 'depenses'
}

export const GROUPS = [
  { id: 'recettes', titre: 'Recettes', aide: 'Impôts et cotisations : relever un taux améliore le solde avant réaction des contribuables.' },
  { id: 'depenses', titre: 'Dépenses', aide: 'Fonctions de dépense publique : une baisse améliore le solde avant effets sur l\'activité.' },
  { id: 'prestations', titre: 'Prestations', aide: 'Retraites, santé, assurance chômage : lignes de prestations sociales (sécurité sociale).' },
]

export function groupedLevers() {
  return GROUPS.map((g) => ({ ...g, leviers: LEVERS.filter((l) => leverGroup(l) === g.id) }))
}

/** Valeurs de tous les leviers au minimum ou au maximum (test de robustesse). */
export const extremeLevers = (which) => Object.fromEntries(LEVERS.map((l) => [l.id, which === 'min' ? l.min : l.max]))

/** Séries des graphiques : scénario et référence, en % (ratios) ou en Md€. */
export function buildSeries(result, reference) {
  return result.total.map((r, t) => {
    const b = reference.total[t]
    return {
      year: r.year,
      debt: pct(r.debtRatio), debtRef: pct(b.debtRatio),
      balance: pct(r.balanceRatio), balanceRef: pct(b.balanceRatio),
      interest: pct(r.interestRatio), interestRef: pct(b.interestRatio),
      interestMd: num(r.interest), interestMdRef: num(b.interest),
      gdpGap: pct(r.gdpEffect), gdpGapRef: pct(b.gdpEffect),
      unemployment: num(r.unemployment), unemploymentRef: num(b.unemployment),
    }
  })
}

/** Fiche d'une année (t = 0 pour 2026) : valeurs du scénario, de la référence et écarts. */
export function snapshotAt(result, reference, t) {
  const r = result.total[t]
  const b = reference.total[t]
  const d = (x, y) => (num(x) === null || num(y) === null ? null : x - y)
  return {
    year: r.year,
    debtRatio: pct(r.debtRatio), debtRatioRef: pct(b.debtRatio), debtDelta: pct(d(r.debtRatio, b.debtRatio)),
    balanceRatio: pct(r.balanceRatio), balanceRatioRef: pct(b.balanceRatio), balanceDelta: pct(d(r.balanceRatio, b.balanceRatio)),
    interest: num(r.interest), interestRef: num(b.interest), interestDelta: d(r.interest, b.interest),
    interestRatio: pct(r.interestRatio),
  }
}

/** Seuil (en points de PIB) sous lequel un écart de la fiche est traité comme nul pour le test du paradoxe de la première année. */
const PARADOX_EPS = 0.01

/**
 * Paradoxe de la première année (E11) : la dette de l'année inclut le déficit de l'année, mais le PIB (dénominateur) réagit aussi dans la même
 * année. Une relance forte peut donc creuser le solde (écart < 0) tout en baissant la dette rapportée au PIB (écart < 0), ou l'inverse
 * pour une austérité. Vrai quand la dette ne bouge PAS en sens inverse du solde (un solde plus bas devrait relever la dette) :
 * écarts de même signe numérique, tous deux non négligeables.
 */
export function debtMovesAgainstBalance(snap) {
  const d = snap?.debtDelta
  const b = snap?.balanceDelta
  if (!Number.isFinite(d) || !Number.isFinite(b)) return false
  if (Math.abs(d) < PARADOX_EPS || Math.abs(b) < PARADOX_EPS) return false
  return Math.sign(d) === Math.sign(b)
}

/** Explication affichée sur la fiche de l'année 1 quand `debtMovesAgainstBalance` est vrai. */
export const YEAR1_PARADOX_TEXT = 'La dette rapportée au PIB peut évoluer à l\'inverse du solde la première année : la mesure modifie aussi le PIB (dénominateur), dans le même sens que la dette. L\'effet s\'inverse ensuite.'

/**
 * Bornes et graduations « rondes » d'un axe vertical : pas de 1, 2 ou 5 × 10^n (au moins `minStep`), au plus `maxTicks` graduations ;
 * le domaine arrondit les bornes aux multiples du pas. `null` si les bornes ne sont pas finies.
 * @returns {{ domain: [number, number], ticks: number[], step: number } | null}
 */
export function niceAxis(lo, hi, { maxTicks = 6, minStep = 1 } = {}) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null
  const raw = Math.max((hi - lo) / Math.max(maxTicks - 1, 1), minStep)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * mag).find((c) => c >= raw)
  const a = Math.floor(lo / step) * step
  let b = Math.ceil(hi / step) * step
  if (b === a) b = a + step
  const ticks = []
  for (let v = a; v <= b + step / 1e6; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return { domain: [a, b], ticks, step }
}

/** Sens d'un écart : « mieux » si le solde monte ou si la dette / les intérêts baissent. */
export function deltaTone(delta, lowerIsBetter) {
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.05) return 'neutre'
  return (delta < 0) === lowerIsBetter ? 'mieux' : 'moins-bien'
}

/**
 * Décomposition, en Md€, de l'écart de solde (scénario − référence) l'année t. Exacte : la somme des lignes
 * (avant masquage) égale `ecart`. Niveaux, non variations annuelles : mesure ex ante, réaction des contribuables,
 * demande (stabilisateurs), effets d'offre (un par mesure et par cas), intérêts (taux et dette supplémentaire).
 * @param {number} eps  paramètre fisc.eps : passage au solde de l'écart de PIB dû à la demande (E7)
 * @param {number} epsOffre  paramètre fisc.eps_offre (taux de prélèvements obligatoires, D13) : passage au solde de chaque effet d'offre ;
 *   doit être le même que dans le moteur pour que la décomposition reste exacte
 */
export function decomposeAtYear(result, reference, t, eps, epsOffre) {
  const tot = result.total[t]
  const lines = []
  const refPrimaryDelta = BLOCKS.reduce((s, b) => s + (result.blocks[b][t].referencePrimary - reference.blocks[b][t].referencePrimary), 0)
  if (Math.abs(refPrimaryDelta) > 1e-12) {
    lines.push({
      key: 'macro',
      kind: 'macro',
      label: 'Hypothèses macroéconomiques (écart de référence)',
      detail: 'Écart de solde primaire de référence dû aux hypothèses de croissance et d\'inflation (comparateur).',
      montant: refPrimaryDelta,
    })
  }
  const modById = Object.fromEntries((result.modules ?? []).map((m) => [m.id, m]))
  for (const [id, v] of Object.entries(tot.byInstrument)) {
    const lever = LEVER_BY_ID[id]
    const titre = lever?.titre ?? modById[id]?.titre ?? id
    const behavSuffix = lever?.type === 'depense' ? 'effets de report (autres prestations)' : 'réaction des contribuables'
    lines.push({ key: `static:${id}`, kind: 'statique', leverId: id, label: `${titre} : effet statique`, montant: v.exAnte })
    lines.push({ key: `behav:${id}`, kind: 'comportement', leverId: id, label: `${titre} : ${behavSuffix}`, montant: v.exPost - v.exAnte })
  }
  let offreTotal = 0
  const offreLines = result.supply.lignes.map((l) => {
    const montant = epsOffre * l.yS[t] * tot.gdpBase
    offreTotal += montant
    const titre = LEVER_BY_ID[l.id]?.titre ?? l.libelle
    // Effet d'offre non validé (IR) : le libellé le dit, pour que le relecteur le voie dans la décomposition.
    const label = l.statut === 'non validé' ? `${l.nomCourt ?? 'Effet d\'offre'} (cas ${l.cas}) : non validé — avis demandé` : `Effet d'offre (cas ${l.cas}) : ${titre}`
    return { key: `offre:${l.id}`, kind: 'offre', leverId: l.id, label, detail: l.libelle, gdpPct: l.yS[t] * 100, montant }
  })
  const stab = BLOCKS.reduce((s, b) => s + result.blocks[b][t].stabilisers, 0)
  lines.push({ key: 'demande', kind: 'demande', label: 'Effet de demande (stabilisateurs automatiques)', detail: 'Part de l\'écart de PIB due à la demande, avant effets d\'offre.', gdpPct: tot.yD * 100, montant: stab - offreTotal })
  lines.push(...offreLines)
  lines.push({ key: 'interets', kind: 'interets', label: 'Intérêts (taux et dette supplémentaire, boule de neige)', detail: 'Variation de la charge d\'intérêts par rapport à la référence ; une charge plus basse améliore le solde.', montant: -(tot.interest - reference.total[t].interest) })
  const ecart = tot.balance - reference.total[t].balance
  return { year: tot.year, ecart, lines }
}

/** Vrai si au moins une ligne d'offre du résultat a un effet non nul dans le cas choisi (sinon bas / central / haut sont sans effet). */
export const hasSupplyEffect = (result) => result.supply.lignes.some((l) => l.yS.some((v) => Number.isFinite(v) && v !== 0))

/** Retire les lignes nulles (affichées « 0,0 ») : un σ nul dans le cas choisi n'apparaît pas. */
export const visibleLines = (lines, threshold = HIDE_BELOW) =>
  lines.filter((l) => Number.isFinite(l.montant) && Math.abs(l.montant) >= threshold)

/** Répartition par bloc l'année t : solde, ratio, écart à la référence. */
export function blocksAt(result, reference, t) {
  return BLOCKS.map((b) => {
    const r = result.blocks[b][t]
    const q = reference.blocks[b][t]
    return {
      id: b, label: BLOCK_LABELS[b], balance: num(r.balance), balanceRatio: pct(r.balanceRatio),
      refBalance: num(q.balance), refRatio: pct(q.balanceRatio), delta: num(r.balance - q.balance),
    }
  })
}

/** Identifiants de paramètres à expliquer pour les leviers actifs, les effets d'offre et un éventuel comparateur macroéconomique. */
export function paramIdsFor(values, result, macroId = null) {
  const ids = ['dem.lambda', 'fisc.eps', 'fisc.eps_offre', 'emploi.kappa', 'dette.M', 'dette.beta']
  if (macroId && Object.hasOwn(MACRO_VARIANT_BY_ID, macroId)) ids.push(...MACRO_VARIANT_BY_ID[macroId].paramIds)
  for (const l of LEVERS) {
    if (!values?.[l.id]) continue
    if (l.rendParams) ids.push(...l.rendParams)
    else if (PARAM_BY_ID[`rend.${l.id}`]) ids.push(`rend.${l.id}`)
    if (l.theta) ids.push(l.theta.id, l.theta.tau0)
    if (l.offsetParam) ids.push(l.offsetParam)
    if (l.categorie) ids.push(`dem.m.${l.categorie}`)
    const reg = SUPPLY_BY_LEVER[l.id]
    if (reg) ids.push(...(reg.sigma ? [reg.sigma] : reg.sigmaParams), reg.L, reg.t0)
  }
  for (const line of result?.supply?.lignes ?? []) {
    const reg = SUPPLY_BY_LEVER[line.id]
    if (reg) ids.push(...(reg.sigma ? [reg.sigma] : reg.sigmaParams), reg.L, reg.t0)
  }
  return [...new Set(ids)].filter((id) => PARAM_BY_ID[id])
}

/** Statuts qui signalent une valeur non sourcée : mis en évidence pour les relecteurs. */
export const FLAGGED_STATUSES = ['de mémoire', 'à collecter', 'non validé', 'calculé (estimation)']
export const isFlagged = (status) => FLAGGED_STATUSES.includes(status)

/** Valeur centrale et fourchette d'un paramètre, avec son unité. */
export function paramRange(q) {
  const v = (x) => (typeof x === 'number' ? fmt(x, Math.abs(x) < 1 ? 3 : 2) : null)
  const central = v(q.value)
  if (central === null) return ''
  const lo = v(q.low)
  const hi = v(q.high)
  const range = lo !== null && hi !== null && (q.low !== q.value || q.high !== q.value) ? ` (bas ${lo} / haut ${hi})` : ''
  return `${central} ${q.unit ?? ''}${range}`.trim()
}

