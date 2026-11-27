// Fonctions pures de la page « Simulateur budgétaire » (moteur v2) : formats, séries de graphiques,
// décomposition par cause, filtrage des lignes nulles, paramètres à expliquer. Testées dans helpers.test.js.

import { LEVERS, LEVER_BY_ID, BLOCKS } from '../../engine/levers.js'
import { PARAM_BY_ID } from '../../engine/params.js'
import { SUPPLY_BY_LEVER, impliedJobs, roundJobs, supplyForCase } from '../../engine/supply.js'
import { LVT_SCENARIO_BY_CODE } from '../../engine/lvt-snapshot.js'
import { MACRO_VARIANT_BY_ID, matchesScenario, NEUTRAL_SCENARIOS } from './presets.js'

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

export const DEMAND_REGIME_OPTIONS = [
  { id: 'normal', label: 'Normal (expansion — défaut)' },
  { id: 'recession', label: 'Récession (multiplicateurs accrus)' },
  { id: 'elb', label: 'Taux plancher / ELB (majoration maximale)' },
  { id: 'endogene', label: 'Endogène (transition logistique sur chômage)' },
]

export const PHASING_OPTIONS = [
  { id: 1, label: 'Immédiate dès 2027 (1 an — défaut)' },
  { id: 3, label: 'Progressive sur 3 ans (2027–2029)' },
  { id: 5, label: 'Progressive sur 5 ans (2027–2031, type PSMT)' },
]

/** Repères budgétaires européens lus directement dans PARAMS (aucune constante économique dupliquée dans l'UI). */
export const FISCAL_BENCHMARKS = Object.freeze({
  maastrichtDeficitPct: PARAM_BY_ID['cmp.ue.solde_seuil'].value,
  maastrichtDebtPct: PARAM_BY_ID['cmp.ue.dette_seuil'].value,
  netExpCeilingsPct: Object.freeze({
    2026: PARAM_BY_ID['cmp.ue.dpn_plafond.2026_2028'].value,
    2027: PARAM_BY_ID['cmp.ue.dpn_plafond.2026_2028'].value,
    2028: PARAM_BY_ID['cmp.ue.dpn_plafond.2026_2028'].value,
    2029: PARAM_BY_ID['cmp.ue.dpn_plafond.2029'].value,
  }),
})

const TARGET_EPS = 1e-9

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

/** Vrai si au moins un levier actif ou le module LVT OCDE peut ouvrir une fourchette d'offre bas ≠ haut. */
export function mayHaveSupplySpread(values, lvtSetting = null) {
  const hasSupplyLever = Object.entries(values ?? {}).some(
    ([id, v]) => typeof v === 'number' && Number.isFinite(v) && v !== 0 && Boolean(SUPPLY_BY_LEVER[id]),
  )
  const hasLvtSupply = Boolean(lvtSetting && lvtSetting.scenario >= 2 && lvtSetting.ocde === 1)
  return hasSupplyLever || hasLvtSupply
}

/** Séries des graphiques : scénario actif B, fourchette optionnelle d'offre (bas–haut), scénario épinglé optionnel A et référence. */
export function buildSeries(result, reference, { envelope = null, resultA = null } = {}) {
  const bandTuple = (getVal) => {
    if (!envelope) return null
    const vb = getVal(envelope.bas)
    const vc = getVal(envelope.central)
    const vh = getVal(envelope.haut)
    if (!Number.isFinite(vb) || !Number.isFinite(vc) || !Number.isFinite(vh)) return null
    return {
      band: [Math.min(vb, vc, vh), Math.max(vb, vc, vh)],
      bas: vb,
      haut: vh,
    }
  }
  return result.total.map((r, t) => {
    const b = reference.total[t]
    const a = resultA?.total?.[t] ?? null
    const debtB = bandTuple((e) => pct(e.total[t].debtRatio))
    const balB = bandTuple((e) => pct(e.total[t].balanceRatio))
    const intB = bandTuple((e) => pct(e.total[t].interestRatio))
    const gdpB = bandTuple((e) => pct(e.total[t].gdpEffect))
    const unempB = bandTuple((e) => num(e.total[t].unemployment))
    return {
      year: r.year,
      debt: pct(r.debtRatio), debtRef: pct(b.debtRatio),
      ...(a ? { debtPin: pct(a.debtRatio) } : {}),
      ...(debtB ? { debtBand: debtB.band, debtBas: debtB.bas, debtHaut: debtB.haut } : {}),
      balance: pct(r.balanceRatio), balanceRef: pct(b.balanceRatio),
      ...(a ? { balancePin: pct(a.balanceRatio) } : {}),
      ...(balB ? { balanceBand: balB.band, balanceBas: balB.bas, balanceHaut: balB.haut } : {}),
      interest: pct(r.interestRatio), interestRef: pct(b.interestRatio),
      ...(a ? { interestPin: pct(a.interestRatio), interestMdPin: num(a.interest) } : {}),
      ...(intB ? { interestBand: intB.band, interestBas: intB.bas, interestHaut: intB.haut } : {}),
      interestMd: num(r.interest), interestMdRef: num(b.interest),
      gdpGap: pct(r.gdpEffect), gdpGapRef: pct(b.gdpEffect),
      ...(a ? { gdpGapPin: pct(a.gdpEffect) } : {}),
      ...(gdpB ? { gdpGapBand: gdpB.band, gdpGapBas: gdpB.bas, gdpGapHaut: gdpB.haut } : {}),
      unemployment: num(r.unemployment), unemploymentRef: num(b.unemployment),
      ...(a ? { unemploymentPin: num(a.unemployment) } : {}),
      ...(unempB ? { unemploymentBand: unempB.band, unemploymentBas: unempB.bas, unemploymentHaut: unempB.haut } : {}),
    }
  })
}

/** Fiche d'une année (t = 0 pour 2026) : valeurs du scénario, de la référence et écarts (inclut vs A si `resultA` est fourni). */
export function snapshotAt(result, reference, t, resultA = null) {
  const r = result.total[t]
  const b = reference.total[t]
  const a = resultA?.total?.[t] ?? null
  const d = (x, y) => (num(x) === null || num(y) === null ? null : x - y)
  return {
    year: r.year,
    debtRatio: pct(r.debtRatio), debtRatioRef: pct(b.debtRatio), debtDelta: pct(d(r.debtRatio, b.debtRatio)),
    ...(a ? { debtDeltaVsA: pct(d(r.debtRatio, a.debtRatio)) } : {}),
    balanceRatio: pct(r.balanceRatio), balanceRatioRef: pct(b.balanceRatio), balanceDelta: pct(d(r.balanceRatio, b.balanceRatio)),
    ...(a ? { balanceDeltaVsA: pct(d(r.balanceRatio, a.balanceRatio)) } : {}),
    interest: num(r.interest), interestRef: num(b.interest), interestDelta: d(r.interest, b.interest),
    ...(a ? { interestDeltaVsA: d(r.interest, a.interest) } : {}),
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
 * Décomposition, en Md€, de l'écart de solde (scénario − référence / scénario de comparaison) l'année t. Exacte :
 * la somme des lignes (avant masquage) égale `ecart` pour toute paire de scénarios issus de `projectScenario`.
 * @param {number} eps  paramètre fisc.eps : passage au solde de l'écart de PIB dû à la demande (E7)
 * @param {number} epsOffre  paramètre fisc.eps_offre (taux de prélèvements obligatoires, D13) : passage au solde de chaque effet d'offre
 */
export function decomposeAtYear(result, reference, t, eps, epsOffre) {
  const tot = result.total[t]
  const refTot = reference.total[t]
  const lines = []
  const refPrimaryDelta = BLOCKS.reduce((s, b) => s + (result.blocks[b][t].referencePrimary - reference.blocks[b][t].referencePrimary), 0)
  const hasExog = Number.isFinite(tot.refPrimaryExog) && Number.isFinite(refTot.refPrimaryExog)
  const macroRefDelta = hasExog ? tot.refPrimaryExog - refTot.refPrimaryExog : refPrimaryDelta
  const inflRefDelta = refPrimaryDelta - macroRefDelta
  if (Math.abs(macroRefDelta) > 1e-12) {
    lines.push({
      key: 'macro',
      kind: 'macro',
      label: 'Hypothèses macroéconomiques (écart de référence)',
      detail: 'Écart de solde primaire de référence dû aux hypothèses de croissance et d\'inflation (comparateur).',
      montant: macroRefDelta,
    })
  }
  const modById = Object.fromEntries([...(reference.modules ?? []), ...(result.modules ?? [])].map((m) => [m.id, m]))
  const bInst = tot.byInstrument ?? {}
  const aInst = refTot.byInstrument ?? {}
  const instIds = [
    ...LEVERS.map((l) => l.id).filter((id) => Object.hasOwn(bInst, id) || Object.hasOwn(aInst, id)),
    ...Object.keys({ ...bInst, ...aInst }).filter((id) => !Object.hasOwn(LEVER_BY_ID, id)),
  ]
  for (const id of instIds) {
    const vB = bInst[id] ?? { exAnte: 0, exPost: 0 }
    const vA = aInst[id] ?? { exAnte: 0, exPost: 0 }
    const lever = LEVER_BY_ID[id]
    const titre = lever?.titre ?? modById[id]?.titre ?? id
    let behavSuffix = 'réaction des contribuables'
    if (lever?.offsetParam === 'comp.offset.pensions_hautes') behavSuffix = 'retour fiscal hautes pensions (IR/CSG)'
    else if (lever?.offsetParam === 'comp.offset.age_legal') behavSuffix = 'effets de report (autres prestations)'
    else if (lever?.offsetGroup === 'prestations' || id === 'comptes_notionnels' || id === 'comptes_notionnels_ndc') behavSuffix = 'retour fiscal et aides (IR/CSG/ASPA/APL)'
    else if (lever?.type === 'depense') behavSuffix = 'effets de report (autres prestations)'
    lines.push({ key: `static:${id}`, kind: 'statique', leverId: id, label: `${titre} : effet statique`, montant: vB.exAnte - vA.exAnte })
    lines.push({ key: `behav:${id}`, kind: 'comportement', leverId: id, label: `${titre} : ${behavSuffix}`, montant: (vB.exPost - vB.exAnte) - (vA.exPost - vA.exAnte) })
  }
  const bSupplyById = Object.fromEntries((result.supply?.lignes ?? []).map((l) => [l.id, l]))
  const aSupplyById = Object.fromEntries((reference.supply?.lignes ?? []).map((l) => [l.id, l]))
  const supplyIds = [
    ...LEVERS.map((l) => l.id).filter((id) => Object.hasOwn(bSupplyById, id) || Object.hasOwn(aSupplyById, id)),
    ...Object.keys({ ...bSupplyById, ...aSupplyById }).filter((id) => !Object.hasOwn(LEVER_BY_ID, id)),
  ]
  let offreTotalB = 0
  let offreTotalA = 0
  const offreLines = supplyIds.map((sid) => {
    const lB = bSupplyById[sid]
    const lA = aSupplyById[sid]
    const meta = lB ?? lA
    const mB = lB ? epsOffre * lB.yS[t] * tot.gdpBase : 0
    const mA = lA ? epsOffre * lA.yS[t] * refTot.gdpBase : 0
    offreTotalB += mB
    offreTotalA += mA
    const ySDelta = (lB ? lB.yS[t] : 0) - (lA ? lA.yS[t] : 0)
    const casText = lB && lA && lB.cas !== lA.cas ? `cas ${lB.cas} vs ${lA.cas}` : `cas ${meta.cas}`
    const titre = LEVER_BY_ID[meta.id]?.titre ?? meta.libelle
    // Effet d'offre non validé (IR) : le libellé le dit, pour que le relecteur le voie dans la décomposition.
    const label = meta.statut === 'non validé' ? `${meta.nomCourt ?? 'Effet d\'offre'} (${casText}) : non validé — avis demandé` : `Effet d'offre (${casText}) : ${titre}`
    return { key: `offre:${meta.id}`, kind: 'offre', leverId: meta.id, label, detail: meta.libelle, gdpPct: ySDelta * 100, montant: mB - mA }
  })
  const stabB = BLOCKS.reduce((s, b) => s + result.blocks[b][t].stabilisers, 0)
  const stabA = BLOCKS.reduce((s, b) => s + reference.blocks[b][t].stabilisers, 0)
  lines.push({
    key: 'demande',
    kind: 'demande',
    label: 'Effet de demande (stabilisateurs automatiques)',
    detail: 'Part de l\'écart de PIB due à la demande, avant effets d\'offre.',
    gdpPct: (tot.yD - refTot.yD) * 100,
    montant: (stabB - offreTotalB) - (stabA - offreTotalA),
  })
  lines.push(...offreLines)
  const inflDelta = (tot.inflFiscal ?? 0) - (refTot.inflFiscal ?? 0) + inflRefDelta
  if (Math.abs(inflDelta) > 1e-12) {
    lines.push({
      key: 'inflation',
      kind: 'inflation',
      label: 'Inflation endogène (indexation retardée des pensions et déflateur)',
      detail: 'Effet cumulé de l\'écart entre IPC(t−1) et déflateur du PIB(t) sur les pensions (CSS L. 161-25) et revalorisation nominale du solde primaire de référence.',
      montant: inflDelta,
    })
  }
  lines.push({ key: 'interets', kind: 'interets', label: 'Intérêts (taux et dette supplémentaire, boule de neige)', detail: 'Variation de la charge d\'intérêts par rapport à la référence ; une charge plus basse améliore le solde.', montant: -(tot.interest - refTot.interest) })
  const ecart = tot.balance - refTot.balance
  return { year: tot.year, ecart, lines }
}

/**
 * Solde primaire stabilisant le ratio dette/PIB en temps discret exact (E11) à l'année `t` (0 = 2026) :
 *   SP*(t) = INT(t) − g_nom(t) × D(t−1),  sp*(t) = SP*(t) / Y(t).
 * Par identité comptable exacte : Δ(D/Y)_t ≡ d_t − d_{t−1} = sp*(t) − sp(t) = effortGapMd / Y(t).
 * Calcule aussi la cible tendancielle `spStarStruct` évaluée sur la croissance nominale de référence `g_t + π_t` (`gdpBaseExog`),
 * insensible aux sauts ponctuels d'écart de PIB (paradoxe du dénominateur en Année 1).
 */
export function debtStabilizingAt(result, P, t) {
  const row = result?.total?.[t]
  if (!row || !P) return null
  const prevGdp = t === 0 ? P['base.pib.2025'] : result.total[t - 1]?.gdp
  const prevGdpExog = t === 0 ? P['base.pib.2025'] : (result.total[t - 1]?.gdpBaseExog ?? result.total[t - 1]?.gdpBase)
  const prevDebt = t === 0 ? P['base.dette.2025'] : result.total[t - 1]?.debt
  const curGdpExog = row.gdpBaseExog ?? row.gdpBase
  if (!(prevGdp > 0) || !(row.gdp > 0) || !(prevGdpExog > 0) || !(curGdpExog > 0) || !Number.isFinite(prevDebt)) return null

  const debtRatioPrev = prevDebt / prevGdp
  const gNom = row.gdp / prevGdp - 1
  const gNomExog = curGdpExog / prevGdpExog - 1
  const iEff = prevDebt > 0 ? row.interest / prevDebt : 0
  const spStarMd = row.interest - gNom * prevDebt
  const spStarRatio = spStarMd / row.gdp
  const spActualMd = row.primaryBalance
  const spActualRatio = row.primaryBalanceRatio
  const effortGapMd = spStarMd - spActualMd
  const effortGapRatio = spStarRatio - spActualRatio

  const spStarStructRatio = prevDebt > 0 && 1 + gNomExog > 0
    ? ((iEff - gNomExog) / (1 + gNomExog)) * debtRatioPrev
    : 0
  const spStarStructMd = spStarStructRatio * row.gdp
  const effortGapStructRatio = spStarStructRatio - spActualRatio
  const effortGapStructMd = effortGapStructRatio * row.gdp

  return {
    year: row.year,
    debtRatioPrevPct: pct(debtRatioPrev),
    gNomPct: pct(gNom),
    gNomExogPct: pct(gNomExog),
    iEffPct: pct(iEff),
    spActualMd: num(spActualMd),
    spActualPct: pct(spActualRatio),
    spStarMd: num(spStarMd),
    spStarPct: pct(spStarRatio),
    effortGapMd: num(effortGapMd),
    effortGapPct: pct(effortGapRatio),
    spStarStructMd: num(spStarStructMd),
    spStarStructPct: pct(spStarStructRatio),
    effortGapStructMd: num(effortGapStructMd),
    effortGapStructPct: pct(effortGapStructRatio),
  }
}

/**
 * Classe une condition booléenne sur `t = 1..N` en 3 états mutuellement exclusifs :
 * - `'sustained'` : condition vérifiée en fin d'horizon `N`, continûment depuis `year` ;
 * - `'transient'` : vérifiée au moins une année `t < N`, mais reperdue en fin d'horizon (`firstYear`..`lastYear`) ;
 * - `'unreached'` : jamais vérifiée sur `1..N`.
 */
export function classifyTrajectoryMilestone(flagsByT, years) {
  const N = years.length - 1
  if (N < 1) return { status: 'unreached' }
  if (flagsByT[N]) {
    let tStart = N
    while (tStart > 1 && flagsByT[tStart - 1]) tStart -= 1
    return { status: 'sustained', year: years[tStart] }
  }
  let firstIdx = -1
  let lastIdx = -1
  for (let t = 1; t < N; t++) {
    if (flagsByT[t]) {
      if (firstIdx === -1) firstIdx = t
      lastIdx = t
    }
  }
  if (firstIdx !== -1) {
    return { status: 'transient', firstYear: years[firstIdx], lastYear: years[lastIdx] }
  }
  return { status: 'unreached' }
}

/**
 * Évalue les repères budgétaires français et européens sur une trajectoire projetée :
 * 1. Solde primaire stabilisant la dette en fin d'horizon (`endYearTarget`) ;
 * 2. Jalon de stabilisation du ratio dette/PIB (`debtStabilization`, protégé contre le paradoxe de relance de 2027) ;
 * 3. Jalon de retour du solde public consolidé au-dessus de −3,0 % du PIB (`deficit3Pct`, Protocole n° 12) ;
 * 4. Proxy reconstitué de la règle européenne en dépense primaire nette sur la fenêtre du PSMT 2026–2029 (`euNetExpenditure`, statut `calculé (estimation)`).
 */
export function evaluateFiscalTargets(result, P) {
  if (!result?.total?.length || !P) return null
  const N = result.total.length - 1
  const endYearTarget = debtStabilizingAt(result, P, N)

  const d0 = result.total[0].debtRatio
  const sp0 = result.total[0].primaryBalanceRatio
  const row1 = result.total[1]
  const paradox2027 = Boolean(
    row1
    && Number.isFinite(row1.debtRatio)
    && row1.debtRatio - d0 <= TARGET_EPS
    && row1.primaryBalanceRatio < sp0 - TARGET_EPS
    && row1.yD > TARGET_EPS,
  )

  const stabFlags = result.total.map((row, t) => {
    if (t === 0) return false
    const prev = result.total[t - 1]
    if (!Number.isFinite(row.debtRatio) || !Number.isFinite(prev.debtRatio)) return false
    if (t === 1 && paradox2027) return false
    return row.debtRatio - prev.debtRatio <= TARGET_EPS
  })
  const stabClass = classifyTrajectoryMilestone(stabFlags, result.years)
  const endDeltaPp = N >= 1 ? pct(result.total[N].debtRatio - result.total[N - 1].debtRatio) : null

  const thresholdRatio = FISCAL_BENCHMARKS.maastrichtDeficitPct / 100
  const def3Flags = result.total.map((row, t) => t > 0 && Number.isFinite(row.balanceRatio) && row.balanceRatio >= thresholdRatio - TARGET_EPS)
  const def3Class = classifyTrajectoryMilestone(def3Flags, result.years)

  let euNetExpenditure = null
  if (N >= 3 && P['base.pib.2025'] > 0 && Number.isFinite(P['base.recettes.apu']) && Number.isFinite(P['ref.spb_2026'])) {
    const gPrim0 = P['base.recettes.apu'] / P['base.pib.2025'] - P['ref.spb_2026'] / 100
    const dA0 = result.total[0].driftA
    const dB0 = result.total[0].driftB
    const ne = [0, 1, 2, 3].map((t) => {
      const row = result.total[t]
      const refPrimSpend = (gPrim0 + (row.driftA - dA0) + (row.driftB - dB0)) * row.gdpBase
      const discEffort = Object.entries(row.byInstrument ?? {}).reduce((sum, [id, v]) => {
        if (id === 'taxe_valeur_sol') return sum
        if (id === 'age_legal') return sum + v.exPost
        return sum + v.exAnte
      }, 0)
      return Math.max(1e-6, refPrimSpend - discEffort)
    })
    const c27 = FISCAL_BENCHMARKS.netExpCeilingsPct[2027] / 100
    const c28 = FISCAL_BENCHMARKS.netExpCeilingsPct[2028] / 100
    const c29 = FISCAL_BENCHMARKS.netExpCeilingsPct[2029] / 100
    const cumCeiling = (1 + c27) * (1 + c28) * (1 + c29) - 1
    const avgCeiling = (1 + cumCeiling) ** (1 / 3) - 1
    const cumGrowth = ne[3] / ne[0] - 1
    const avgGrowth = (ne[3] / ne[0]) ** (1 / 3) - 1
    euNetExpenditure = {
      baseYear: result.years[0],
      endYear: result.years[3],
      annualGrowthPct: {
        2027: pct(ne[1] / ne[0] - 1),
        2028: pct(ne[2] / ne[1] - 1),
        2029: pct(ne[3] / ne[2] - 1),
      },
      cumGrowthPct: pct(cumGrowth),
      cumCeilingPct: pct(cumCeiling),
      avgGrowthPct: pct(avgGrowth),
      avgCeilingPct: pct(avgCeiling),
      withinCeiling: cumGrowth <= cumCeiling + TARGET_EPS,
      status: 'calculé (estimation)',
    }
  }

  return {
    endYear: result.years[N],
    endYearTarget,
    debtStabilization: { ...stabClass, endDeltaPp, paradox2027 },
    deficit3Pct: {
      ...def3Class,
      endBalancePct: pct(result.total[N].balanceRatio),
      thresholdPct: FISCAL_BENCHMARKS.maastrichtDeficitPct,
    },
    euNetExpenditure,
  }
}

/** Vrai si au moins une ligne d'offre du résultat a un effet non nul dans le cas choisi (sinon bas / central / haut sont sans effet). */
export const hasSupplyEffect = (result) => result.supply.lignes.some((l) => l.yS.some((v) => Number.isFinite(v) && v !== 0))

/** Retire les lignes nulles (affichées « 0,0 ») : un σ nul dans le cas choisi n'apparaît pas. */
export const visibleLines = (lines, threshold = HIDE_BELOW) =>
  lines.filter((l) => Number.isFinite(l.montant) && Math.abs(l.montant) >= threshold)

/** Répartition par bloc l'année t : solde, ratio, écart à la référence et (si `resultA` est fourni) écart à A. */
export function blocksAt(result, reference, t, resultA = null) {
  return BLOCKS.map((b) => {
    const r = result.blocks[b][t]
    const q = reference.blocks[b][t]
    const a = resultA?.blocks?.[b]?.[t] ?? null
    return {
      id: b, label: BLOCK_LABELS[b], balance: num(r.balance), balanceRatio: pct(r.balanceRatio),
      refBalance: num(q.balance), refRatio: pct(q.balanceRatio), delta: num(r.balance - q.balance),
      ...(a ? { pinBalance: num(a.balance), pinRatio: pct(a.balanceRatio), deltaVsA: num(r.balance - a.balance) } : {}),
    }
  })
}

const SHORT_LEVER_NAMES = {
  tva_normal: 'TVA', tva_tous_taux: 'TVA tous taux', csg: 'CSG', ir: 'IR', is: 'IS', cotis_patronales: 'Cotis.',
  dep_enseignement: 'Éduc.', dep_defense: 'Déf.', dep_ordre_securite: 'Sécu.', dep_affaires_eco: 'Aff. éco.',
  ondam: 'ONDAM', travail_assurance_chomage: 'Chômage', indexation_pensions: 'Pensions', sous_indexation_ciblee: 'Pensions >2k',
  age_legal: 'Âge légal',
}

/** Génère automatiquement un libellé court (≤ 40 car.) pour un scénario épinglé A. */
export function defaultScenarioLabel({ values = {}, macroId = null, lvt = null } = {}) {
  const lvtActive = Boolean(lvt && lvt.scenario > 0)
  const matched = NEUTRAL_SCENARIOS.find((sc) => matchesScenario(sc, values, macroId, lvtActive))
  if (matched) {
    const t = matched.titre.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
    return t.length <= 40 ? t : `${t.slice(0, 39)}…`
  }
  const parts = []
  if (macroId && MACRO_VARIANT_BY_ID[macroId]) parts.push('RESF 2027')
  for (const l of LEVERS) {
    const v = values?.[l.id]
    if (typeof v === 'number' && Number.isFinite(v) && v !== 0) {
      parts.push(`${SHORT_LEVER_NAMES[l.id] ?? l.titre} ${fmt(v, 1, { signed: true })}`)
    }
  }
  if (lvtActive && LVT_SCENARIO_BY_CODE[lvt.scenario]) parts.push(`LVT ${LVT_SCENARIO_BY_CODE[lvt.scenario].id}`)
  if (parts.length === 0) return 'Scénario A'
  const head = parts.slice(0, 2).join(', ') + (parts.length > 2 ? ` (+${parts.length - 2})` : '')
  return head.length <= 40 ? head : `${head.slice(0, 39)}…`
}

/** Vrai si deux configurations de scénarios (leviers, cas, macro, LVT, régime, inflation, étalement) coïncident. */
export function scenariosEqual(a, b) {
  if (!a || !b) return false
  if ((a.ysCase ?? 'central') !== (b.ysCase ?? 'central')) return false
  if ((a.macroId ?? null) !== (b.macroId ?? null)) return false
  if ((a.demandRegime ?? 'normal') !== (b.demandRegime ?? 'normal')) return false
  if (Boolean(a.endogenousInflation) !== Boolean(b.endogenousInflation)) return false
  if ((a.phasingYears ?? 1) !== (b.phasingYears ?? 1)) return false
  const lvtA = a.lvt?.scenario > 0 ? `${a.lvt.scenario}:${a.lvt.ocde ? 1 : 0}` : '0'
  const lvtB = b.lvt?.scenario > 0 ? `${b.lvt.scenario}:${b.lvt.ocde ? 1 : 0}` : '0'
  if (lvtA !== lvtB) return false
  return LEVERS.every((l) => Math.abs((a.values?.[l.id] ?? 0) - (b.values?.[l.id] ?? 0)) < 1e-9)
}

/**
 * Lignes d'un module par bloc l'année t (D9 : chaque bloc, y compris le bloc local, reçoit les sorties du module) :
 * flux bruts (affichage seulement, n'entrent pas dans le solde) et effet net sur le solde du bloc (a), en Md€ et en % du PIB.
 */
export function moduleBlockRows(result, t, moduleId) {
  return BLOCKS.map((b) => {
    const row = result.blocks[b][t]
    const flux = (row.moduleFlux ?? []).filter((f) => f.moduleId === moduleId)
      .map((f) => ({ libelle: f.libelle, montant: num(f.montant), pct: pct(f.montantPibPct) }))
    const net = (row.moduleExAnte ?? []).find((m) => m.moduleId === moduleId)
    return { id: b, label: BLOCK_LABELS[b], flux, net: num(net?.montant ?? 0), netPct: pct(net?.montantPibPct ?? 0) }
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
    if (l.offsetGroup === 'prestations') ids.push('comp.offset.prestations')
    if (l.categorie) ids.push(`dem.m.${l.categorie}`)
    const reg = SUPPLY_BY_LEVER[l.id]
    if (reg) ids.push(...(reg.sigma ? [reg.sigma] : reg.sigmaParams), reg.L, reg.t0)
    if (reg?.emplois) ids.push(reg.emplois)
  }
  for (const line of result?.supply?.lignes ?? []) {
    const reg = SUPPLY_BY_LEVER[line.id]
    if (reg) ids.push(...(reg.sigma ? [reg.sigma] : reg.sigmaParams), reg.L, reg.t0)
  }
  if (result?.demandRegime && result.demandRegime !== 'normal') {
    ids.push('dem.recession.mult_depenses', 'dem.recession.mult_prestations', 'dem.recession.mult_impots')
    if (result.demandRegime === 'elb') ids.push('dem.elb.bonus_depenses')
    if (result.demandRegime === 'endogene') ids.push('dem.slack.z_mid', 'dem.slack.gamma')
  }
  if (result?.endogenousInflation) {
    ids.push('infl.phillips.gamma', 'infl.phillips.rho', 'infl.tva.passthrough', 'infl.deflateur.ratio', 'infl.zone_euro.poids_fr', 'infl.oati.part_stock', 'infl.clamp_max')
  }
  return [...new Set(ids)].filter((id) => PARAM_BY_ID[id])
}

/** Nombre d'emplois arrondi, au format français avec séparateur de milliers (« 160 000 », « -90 000 », même signe que `fmt`) ; « — » si non fini. */
const NF_JOBS = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
export function fmtJobs(v, { signed = false } = {}) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—'
  const s = NF_JOBS.format(v === 0 ? 0 : v)
  return signed && v > 0 ? `+${s}` : s
}

/**
 * Données de la note « emplois implicites » d'un levier doté d'une conversion emplois (registre `emplois`, ex. âge légal), ou null.
 * Tout est lu dans les paramètres : σ retenu par le moteur pour le cas `ysCase` dans le sens de `x` (hausse si x ≥ 0, baisse sinon :
 * « bas » = PIB le plus bas), emplois par unité (en valeur absolue) et pour la valeur choisie `x`, arrondis à 10 000, fourchette
 * externe éventuelle (comparateur).
 */
export function jobsNote(leverId, x, P, ysCase = 'central') {
  const reg = SUPPLY_BY_LEVER[leverId]
  if (!reg?.emplois) return null
  const dir = Number.isFinite(x) && x < 0 ? -1 : 1
  const unit = supplyForCase(leverId, dir, P, undefined, ysCase)
  const jobsDir = impliedJobs(leverId, dir, P, ysCase)
  const perUnit = jobsDir === null ? null : Math.abs(jobsDir)
  if (!unit || perUnit === null) return null
  const forX = Number.isFinite(x) ? impliedJobs(leverId, x, P, ysCase) : null
  const cmp = reg.emploisComparateur
  return {
    caseLabel: SUPPLY_CASES.find((c) => c.id === ysCase)?.label.toLowerCase() ?? ysCase,
    sigma: unit.sigma,
    jobsPerUnit: roundJobs(perUnit),
    jobsForX: forX === null ? null : roundJobs(forX),
    range: cmp ? { low: P[cmp.bas], high: P[cmp.haut], libelle: cmp.libelle } : null,
  }
}

/** Statuts qui signalent une valeur non sourcée : mis en évidence pour les relecteurs. */
export const FLAGGED_STATUSES = ['de mémoire', 'à collecter', 'non validé', 'calculé (estimation)', 'à valider']
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

