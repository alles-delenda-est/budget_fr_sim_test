// Dérivations internes documentées des paramètres estimés du moteur v2 (statut « calculé (estimation) »)
// et vérification de provenance LVTShift (lvt.capi.part).
// Source unique de vérité partagée entre la validation moteur (engine.test.js) et la vue avancée
// de la page Hypothèses (HypothesesPage.jsx) : aucune constante dupliquée dans l'interface.
//
// Références primaires lues directement (docs/review-day0-parameters.md §§4–5, §8) :
//   1. ref.derive.b_autres : API officielle Eurostat 1995–2024 (gov_10a_exp TOTAL/GF07/GF1002,
//      gov_10a_main D41PAY, nama_10_gdp B1GQ CP_MEUR / CLV20_MEUR / PD20_EUR, France S13, 24 nov. 2026).
//   2. dem.m.prestations : Banque de France WP 750 (Aldama & Ouvrard, janv. 2020, FR-BDF, Tableau 11 p. 28)
//      + Insee / DG Trésor Mésange G2017/04 (mai 2017, §§4.1.1–4.1.2, §§4.1.6–4.1.7).
//   3. lvt.capi.part : dépôt alles-delenda-est/LVTShift (yields.json + lvtshift-fr/docs/research/dynamic-effects.md §5.4).

/** Part 2024 de la dépense primaire hors vieillissement (TOTAL − D41PAY − GF07 − GF1002) dans le PIB (Eurostat, 2024). */
export const EUROSTAT_NON_AGEING_SHARE_2024 = 0.326567

/**
 * Fenêtres structurelles Eurostat 1995–2024 (France S13, dépense primaire hors intérêts D41PAY, santé GF07
 * et vieillesse GF1002, déflatée par le déflateur du PIB PD20_EUR ; hors point Covid aux bornes).
 * Valeurs calculées directement sur les séries JSON Eurostat téléchargées le 24 nov. 2026.
 */
export const EUROSTAT_NON_AGEING_WINDOWS = [
  { id: '1995-2024', label: '1995–2024 (29 ans, série complète)', years: 29, gDepPct: 1.3366, gGdpPct: 1.5522, obsDriftPp: -0.0714, olsExCovidPp: 0.0069 },
  { id: '2000-2024', label: '2000–2024 (24 ans, zone euro)', years: 24, gDepPct: 1.3190, gGdpPct: 1.2571, obsDriftPp: 0.0199, olsExCovidPp: 0.0537 },
  { id: '2007-2024', label: '2007–2024 (17 ans, post-crise 2008)', years: 17, gDepPct: 1.1523, gGdpPct: 0.9571, obsDriftPp: 0.0619, olsExCovidPp: 0.0121 },
  { id: '2011-2024', label: '2011–2024 (13 ans, cycle récent)', years: 13, gDepPct: 1.0052, gGdpPct: 1.1052, obsDriftPp: -0.0326, olsExCovidPp: -0.0688 },
  { id: '2011-2019', label: '2011–2019 (8 ans, pré-Covid)', years: 8, gDepPct: 0.9140, gGdpPct: 1.2044, obsDriftPp: -0.0938, olsExCovidPp: -0.1182 },
]

/** Profil annuel (% de PIB) d'un choc permanent de +1 pt de PIB sur les prestations sociales hors chômage (FR-BDF, WP 750, Tableau 11 p. 28). */
export const FR_BDF_PRESTATIONS_PROFILE = [0.09, 0.26, 0.37, 0.43]

/** Décomposition du choc composite de dépense publique (Mésange G2017/04, §4.1.2 pp. 105–106) et repères associés (§4.1.1, §§4.1.6–4.1.7). */
export const MESANGE_PRESTATIONS_BENCHMARKS = {
  compositeY1: 0.78,
  investWeight: 0.08,
  investY1: 1.31,
  remWeight: 0.25,
  achatsWeight: 0.21, // 12 % consommations intermédiaires + 9 % prestations en nature
  prestWeight: 0.46,
  irCsgY1: 0.41, // variantes IR (§4.1.7) et CSG (§4.1.6) an 1
  coenenGeneralTransfersY1: 0.42, // Coenen et al. (2012, secondaire, non relu dans le PDF primaire)
}

/** Arrondi standard à `decimals` décimales (évite −0). */
const roundTo = (v, decimals = 2) => {
  const f = 10 ** decimals
  const r = Math.round(v * f) / f
  return Object.is(r, -0) ? 0 : r
}

/** Médiane d'un tableau de nombres finis. */
function median(values) {
  if (!values.length) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Dérivation interne de `ref.derive.b_autres` (règle D7, points de PIB par an).
 * Pour chaque fenêtre Eurostat : dérive implicite = s_2024 × (g_dép − g_pot), plancher D7 à 0.
 * Valeur interne retenue : médiane des 5 fenêtres structurelles (égale à la fenêtre 2007–2024,
 * seule fenêtre dont la croissance réelle observée du PIB, +0,96 %/an, coïncide avec g_pot = 1,0 %), arrondie à 2 décimales.
 * Renvoie null si `macro.g.potentielle` n'est pas fini (même garde défensive que irTranches).
 */
export function deriveBAutres(P) {
  const gPotPct = P?.['macro.g.potentielle']
  if (!Number.isFinite(gPotPct)) return null
  const share = EUROSTAT_NON_AGEING_SHARE_2024
  const windows = EUROSTAT_NON_AGEING_WINDOWS.map((w) => {
    const impliedRaw = share * (w.gDepPct - gPotPct)
    const impliedD7 = Math.max(0, impliedRaw)
    return { ...w, impliedRaw, impliedD7 }
  })
  const rawMedian = median(windows.map((w) => w.impliedD7))
  const window2007 = windows.find((w) => w.id === '2007-2024')
  const ols2000ExCovid = windows.find((w) => w.id === '2000-2024').olsExCovidPp
  return {
    share2024Pct: share * 100,
    gPotPct,
    windows,
    rawMedian,
    window2007,
    window2007Implied: window2007.impliedD7,
    ols2000ExCovid,
    rounded: roundTo(rawMedian, 2),
  }
}

/**
 * Dérivation interne de `dem.m.prestations` (équation E4).
 * Méthode principale : équivalence cumulée sur 4 ans dans E4 (décroissance géométrique λ ∈ [0 ; 1]) du profil direct
 * FR-BDF (Banque de France WP 750, Tableau 11) : m_eq = Σ y_FR-BDF(1..4) / Σ_{k=0..3} λ^k.
 * Recoupements : proxy 2 ans FR-BDF (borne basse), proxy revenu disponible Mésange (IR/CSG an 1 = 0,41),
 * et décomposition résiduelle du choc composite Mésange §4.1.2 (à m_direct = 1,0 et aux centres du moteur).
 * Renvoie null si λ ∉ [0 ; 1] ou si un paramètre d'entrée n'est pas fini.
 */
export function deriveMPrestations(P) {
  const lambda = P?.['dem.lambda']
  const mRem = P?.['dem.m.remunerations']
  const mAchats = P?.['dem.m.achats_invest']
  if (!Number.isFinite(lambda) || lambda < 0 || lambda > 1 || !Number.isFinite(mRem) || !Number.isFinite(mAchats)) {
    return null
  }
  const factorAt = (n) => {
    let s = 0
    for (let k = 0; k < n; k++) s += lambda ** k
    return s
  }
  const cum4 = FR_BDF_PRESTATIONS_PROFILE.reduce((a, b) => a + b, 0)
  const cum2 = FR_BDF_PRESTATIONS_PROFILE[0] + FR_BDF_PRESTATIONS_PROFILE[1]
  const e4Factor4 = factorAt(4)
  const e4Factor2 = factorAt(2)
  const frBdfEq4 = cum4 / e4Factor4
  const frBdfEq2 = cum2 / e4Factor2

  const M = MESANGE_PRESTATIONS_BENCHMARKS
  const residual = (rem, achats) =>
    (M.compositeY1 - M.investWeight * M.investY1 - M.remWeight * rem - M.achatsWeight * achats) / M.prestWeight

  const mesangeResidualUnit = residual(1.0, 1.0)
  const mesangeResidualEngine = residual(mRem, mAchats)

  return {
    lambda,
    profile: FR_BDF_PRESTATIONS_PROFILE,
    mesange: M,
    cum4,
    cum2,
    e4Factor4,
    e4Factor2,
    frBdfEq4,
    frBdfEq2,
    mesangeIrCsgY1: M.irCsgY1,
    mesangeResidualUnit,
    mesangeResidualEngine,
    coenenSecondary: M.coenenGeneralTransfersY1,
    rounded: roundTo(frBdfEq4, 2),
  }
}
