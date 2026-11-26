// Fonctions pures de la page « Simulateur Retraites » (moteur v2) :
// variantes COR 2026 et santé Commission 2024, correspondance âge légal, séries graphiques et fiches clés.

import { PARAM_BY_ID, interpolateSeries } from '../../engine/params.js'
import { START_YEAR } from '../../engine/project.js'
import { LEVER_BY_ID, LEGAL_AGE_BASE } from '../../engine/levers.js'
import { NDC_START_T, NDC_RAMP_YEARS } from '../../engine/ndc-module.js'
import { num, fmt } from '../budget/helpers.js'

export { LEGAL_AGE_BASE }

/**
 * Sources citées sur la page Retraites, avec leur adresse (docs/model-note.md §9). Les balises [Sxx] des textes
 * sont rendues en liens par la page.
 */
export const SOURCE_LINKS = {
  S15: { label: 'Vie-publique, LFSS 2026', url: 'https://www.vie-publique.fr/loi/300445-loi-de-financement-de-la-securite-sociale-2026-retraites-lfss' },
  S16: { label: 'OFCE, 30 janvier 2026', url: 'https://www.ofce.sciences-po.fr/blog2024/fr/2026/20260129_MD/' },
  S23: { label: 'COR, rapport annuel de juin 2026 (synthèse)', url: 'https://www.cor-retraites.fr/sites/default/files/2026-06/Synth%C3%A8se_RA_2026.pdf' },
  S24: { label: 'Parti libéral français, simulateur « Retraite à comptes notionnels »', url: 'https://g-pliberal.github.io/retraitecomptenotionelle/' },
  S27: { label: 'Cour des comptes, 20 février 2025 (PDF primaire)', url: 'https://www.vie-publique.fr/files/rapport/pdf/297428.pdf' },
}

/** Découpe un texte en morceaux { text } et { ref } (balises [S15], [S16], [S23], [S24] connues de SOURCE_LINKS). */
export function splitCitations(text) {
  const parts = []
  const re = /\[(S\d+)\]/g
  let last = 0
  let m
  while ((m = re.exec(text ?? '')) !== null) {
    if (!SOURCE_LINKS[m[1]]) continue
    if (m.index > last) parts.push({ text: text.slice(last, m.index) })
    parts.push({ ref: m[1] })
    last = m.index + m[0].length
  }
  if (last < (text ?? '').length) parts.push({ text: text.slice(last) })
  return parts
}

/** Statuts distincts des paramètres `ids` (lus dans PARAM_BY_ID), pour les pastilles des leviers. */
export const paramStatuses = (ids) => [...new Set(ids.map((id) => PARAM_BY_ID[id]?.status).filter(Boolean))]

/** Paramètres dont le statut s'affiche sur chaque levier retraites. */
export const LEVER_STATUS_PARAMS = {
  age_legal: ['rend.age_legal.hausse', 'rend.age_legal.baisse', 'comp.offset.age_legal', 'offre.sigma.age_legal'],
  indexation_pensions: ['ref.derive.a_retraites'],
  sous_indexation_ciblee: ['rend.sous_indexation_ciblee', 'comp.offset.pensions_hautes'],
}

const COR = PARAM_BY_ID['ref.derive.a_retraites']
const corYears = Object.keys(COR.value).map(Number).sort((a, b) => a - b)
const COR_LAST_YEAR = corYears.at(-1)
const pct1 = (v) => `${fmt(v, 1)} %`
/** « 14,1 % du PIB en 2025, 14,1 % en 2030, … » pour une série COR. */
const corPath = (series) => corYears.map((y, i) => `${pct1(series[y])}${i === 0 ? ' du PIB' : ''} en ${y}`).join(', ')

/** Part des dépenses de retraites dans le PIB en 2025 (COR [S23]), niveau auquel le module NDC ramène la dépense. */
export const COR_SHARE_2025 = interpolateSeries(COR.value, 2025)

// Taux de productivité des variantes du COR : pas de paramètre dans le moteur (seules les trajectoires de dépense le sont).
// Source : COR, rapport annuel de juin 2026 [S23].
const COR_PRODUCTIVITY = { central: 0.7, haute: 1.0, basse: 0.4 }

/** Variantes de productivité du COR (rapport annuel de juin 2026, dépenses de retraites en 2070). */
export const COR_VARIANTS = [
  {
    id: 'central',
    label: `Référence COR (${pct1(COR.value[COR_LAST_YEAR])} en ${COR_LAST_YEAR})`,
    shortLabel: 'Référence COR',
    description: `Productivité centrale (${pct1(COR_PRODUCTIVITY.central)} [S23]) : dépenses de retraites à ${corPath(COR.value)}.`,
    series: COR.value,
  },
  {
    id: 'haute',
    label: `Productivité haute ${pct1(COR_PRODUCTIVITY.haute)} [S23] (${pct1(COR.low[COR_LAST_YEAR])} en ${COR_LAST_YEAR})`,
    shortLabel: `Productivité haute (${pct1(COR_PRODUCTIVITY.haute)})`,
    description: `Productivité haute du COR [S23] : dépenses de retraites à ${pct1(COR.low[COR_LAST_YEAR])} du PIB en ${COR_LAST_YEAR} (borne basse de la dérive).`,
    series: COR.low,
  },
  {
    id: 'basse',
    label: `Productivité basse ${pct1(COR_PRODUCTIVITY.basse)} [S23] (${pct1(COR.high[COR_LAST_YEAR])} en ${COR_LAST_YEAR})`,
    shortLabel: `Productivité basse (${pct1(COR_PRODUCTIVITY.basse)})`,
    description: `Productivité basse du COR [S23] : dépenses de retraites à ${pct1(COR.high[COR_LAST_YEAR])} du PIB en ${COR_LAST_YEAR} (borne haute de la dérive).`,
    series: COR.high,
  },
]

const SANTE = PARAM_BY_ID['ref.derive.a_sante']
/**
 * Période de la projection de la Commission européenne (2024 Ageing Report : rebasée 2025 → 2070, décision D-P2) sur laquelle
 * la dérive annuelle ref.derive.a_sante est répartie (source citée dans le paramètre ; pas de paramètre propre).
 */
export const AGEING_REPORT_YEARS = { from: 2025, to: 2070 }
const AR_SPAN = AGEING_REPORT_YEARS.to - AGEING_REPORT_YEARS.from
/** Hausse cumulée (points de PIB) sur la période de l'Ageing Report pour une dérive annuelle donnée. */
export const healthRiseOverSpan = (perYear) => perYear * AR_SPAN
const healthPts = (perYear) => fmt(healthRiseOverSpan(perYear), 1, { signed: true })

/** Variantes de dérive santé / dépendance (Commission européenne, 2024 Ageing Report). */
export const HEALTH_VARIANTS = [
  {
    id: 'central',
    label: `Santé seule (${healthPts(SANTE.value)} pt d'ici ${AGEING_REPORT_YEARS.to})`,
    description: 'Scénario de référence de la Commission européenne (2024 Ageing Report), hors soins de longue durée.',
    value: SANTE.value,
  },
  {
    id: 'longueDuree',
    label: `Santé + dépendance (${healthPts(SANTE.high)} pt d'ici ${AGEING_REPORT_YEARS.to})`,
    description: `Borne haute : ajoute la dérive des soins de longue durée (${healthPts(SANTE.high - SANTE.value)} pt d'ici ${AGEING_REPORT_YEARS.to}) à la dépense de santé (${healthPts(SANTE.value)} pt).`,
    value: SANTE.high,
  },
  {
    id: 'aucune',
    label: `Sans dérive santé (${fmt(SANTE.low, 0)} pt / an)`,
    description: 'Borne basse conventionnelle : dérive santé neutralisée pour isoler la seule trajectoire retraites du COR.',
    value: SANTE.low,
  },
]

const AGE_LEVER = LEVER_BY_ID['age_legal']
const NDC_AGE_DELTA = 1
const ageStart = START_YEAR + AGE_LEVER.defaultRamp.start
const ndcStart = START_YEAR + NDC_START_T

/** Préréglage « Comptes notionnels (NDC, dès 2028) » (décision D8, forme réduite non validée). */
export const NDC_PRESET = {
  id: 'comptes_notionnels_ndc',
  titre: `Comptes notionnels (NDC, dès ${ndcStart})`,
  ageDelta: NDC_AGE_DELTA,
  indexDelta: 0,
  ndcActive: true,
  statut: 'non validé',
  resume: `Âge légal ${LEGAL_AGE_BASE + NDC_AGE_DELTA} ans (dès ${ageStart}) + stabilisation démographique COR sur ${NDC_RAMP_YEARS} ans · indexation inchangée · sans plafonnement`,
  /** Hypothèse et risque de double compte, en bref (repris sous le préréglage). */
  hypothese: `Économie fixée par hypothèse, non modélisée : la dépense de retraites est ramenée à sa part de PIB de 2025 (${pct1(COR_SHARE_2025)}, COR [S23]). L'associer à l'âge légal +${NDC_AGE_DELTA} peut compter deux fois le même effet : en comptes notionnels, le diviseur de rente réagit déjà à l'âge de départ.`,
  description: `Décision D8 : associe le levier « âge légal à ${LEGAL_AGE_BASE + NDC_AGE_DELTA} ans », retenu pour la version 0.9 (dès janv. ${ageStart}, montée en charge ${AGE_LEVER.defaultRamp.years} ans, effet d'offre emploi seniors), au module « Comptes notionnels » (forme réduite non validée, confiance basse). Ce module stabilise progressivement sur ${NDC_RAMP_YEARS} cohortes (${ndcStart}–${ndcStart + NDC_RAMP_YEARS - 1}) la dérive démographique post-2025 des dépenses de retraites du COR (juin 2026) [S23], d'après le diviseur d'espérance de vie et le mécanisme d'équilibrage automatique (ABM) suédois (Pensionsmyndigheten, Orange Report 2020 ; Ministère suédois des Finances, 2025 ; Holzmann, Palmer et Robalino, Banque mondiale, 2013), avec effet d'offre propre nul (yS = 0). L'économie est fixée par hypothèse et non modélisée : la dépense de retraites est tenue à sa part de PIB de 2025 (${pct1(COR_SHARE_2025)}). La combiner avec l'âge légal +${NDC_AGE_DELTA} peut compter deux fois le même effet, car dans un système de comptes notionnels le diviseur de rente réagit déjà à l'âge de départ. En comparaison externe, le modèle publié par le Parti libéral français [S24] (éditeur déclaré : Parti libéral français ; jamais présenté comme « le » modèle NDC) est explicitement écarté tant pour son −53 % en 2070 (marge du système à coefficient d'équilibre > 1, non une économie) que pour ses mesures de programme (taux unique de 18 %, capitalisation, garantie vieillesse, taxe sur le terrain).`,
}

/** Vrai si les réglages courants correspondent exactement au préréglage Comptes notionnels (D8). */
export function matchesNdcPreset({ ageDelta = 0, indexDelta = 0, targetedIndexDelta = 0, ndcActive = false } = {}) {
  return ageDelta === NDC_PRESET.ageDelta && indexDelta === NDC_PRESET.indexDelta && targetedIndexDelta === 0 && Boolean(ndcActive) === NDC_PRESET.ndcActive
}

/** Mesures affichées en transparence mais désactivées (« non validé — avis demandé »). */
export const UNVALIDATED_PENSION_ITEMS = [
  {
    id: 'plafonnement_pensions',
    titre: 'Plafonnement rétroactif des hautes pensions',
    statut: 'non validé',
    badge: 'Non validé — avis demandé',
    detail: 'Désactivé (décision D-P6) : un plafond dur à 3 000 €/mois représente ~15,2 Md€ bruts / ~8,4–9,9 Md€ nets (DREES 2024–2025, retour fiscal 35–45 %, loin des 40–50 Md€ parfois avancés) et se heurte à des obstacles constitutionnels, CEDH (art. 1 P1) et de périmètre Agirc-Arrco. Utiliser plutôt le levier actif « Sous-indexation ciblée (> 2 000 €/mois) » ci-dessus.',
  },
]

/** Construit les `overrides` du moteur v2 pour les variantes COR et santé choisies. */
export function buildPensionOverrides({ corVariant = 'central', healthVariant = 'central' } = {}) {
  const cor = COR_VARIANTS.find((v) => v.id === corVariant) ?? COR_VARIANTS[0]
  const health = HEALTH_VARIANTS.find((v) => v.id === healthVariant) ?? HEALTH_VARIANTS[0]
  return {
    'ref.derive.a_retraites': cor.series,
    'ref.derive.a_sante': health.value,
  }
}

/** Âge légal cible correspondant à l'écart `delta` (en années par rapport au droit en vigueur de 64 ans). */
export const legalAgeFromDelta = (delta) => (Number.isFinite(delta) ? LEGAL_AGE_BASE + delta : LEGAL_AGE_BASE)

const pct = (v) => (num(v) === null ? null : v * 100)

/** Séries annuelles pour les graphiques de la page Retraites (scénario et référence, aucun NaN). */
export function buildPensionSeries(result, reference, P) {
  const corSeries = P['ref.derive.a_retraites']
  return result.total.map((r, t) => {
    const b = reference.total[t]
    const asso = result.blocks.securiteSociale[t]
    const assoRef = reference.blocks.securiteSociale[t]
    const leversExAntePct = r.gdpBase > 0 ? (asso.leversExAnte / r.gdpBase) * 100 : null
    return {
      year: r.year,
      corSpendingPct: num(interpolateSeries(corSeries, r.year)),
      ageingDriftPct: pct(r.driftA),
      ageingDriftMd: num(r.driftA * r.gdpBase),
      pensionLeversPct: num(leversExAntePct),
      pensionLeversMd: num(asso.leversExAnte),
      supplyGdpPct: pct(r.yS),
      gdpGap: pct(r.gdpEffect),
      assoBalance: pct(asso.balanceRatio),
      assoBalanceRef: pct(assoRef.balanceRatio),
      assoBalanceMd: num(asso.balance),
      assoBalanceMdRef: num(assoRef.balance),
      debt: pct(r.debtRatio),
      debtRef: pct(b.debtRatio),
      balance: pct(r.balanceRatio),
      balanceRef: pct(b.balanceRatio),
      interest: pct(r.interestRatio),
      interestRef: pct(b.interestRatio),
    }
  })
}

/** Calcule les trois fiches d'années clés (bornées proprement à l'horizon actif). */
export function buildPensionSnapshots(result, reference, P) {
  const N = result.years.length - 1
  const corSeries = P['ref.derive.a_retraites']
  const ageFullT = AGE_LEVER.defaultRamp.start + AGE_LEVER.defaultRamp.years - 1
  const rawTargets = N >= 25
    ? [{ t: 4, titre: 'Court terme' }, { t: 14, titre: 'Horizon 2040' }, { t: N, titre: 'Fin d\'horizon' }]
    : N >= 14
      ? [{ t: 4, titre: 'Court terme' }, { t: 10, titre: 'À 10 ans' }, { t: N, titre: 'Fin d\'horizon' }]
      : [{ t: 4, titre: 'Court terme' }, { t: ageFullT, titre: 'Plein effet âge légal' }, { t: N, titre: 'Fin d\'horizon' }]

  const seen = new Set()
  const chosen = []
  for (const item of rawTargets) {
    const idx = Math.min(Math.max(item.t, 1), N)
    if (seen.has(idx)) continue
    seen.add(idx)
    chosen.push({ t: idx, titre: item.titre })
  }

  return chosen.map(({ t, titre }) => {
    const r = result.total[t]
    const b = reference.total[t]
    const asso = result.blocks.securiteSociale[t]
    const assoRef = reference.blocks.securiteSociale[t]
    return {
      titre,
      year: r.year,
      debtRatio: pct(r.debtRatio),
      debtDelta: pct(r.debtRatio - b.debtRatio),
      balanceRatio: pct(r.balanceRatio),
      balanceDelta: pct(r.balanceRatio - b.balanceRatio),
      assoBalance: num(asso.balance),
      assoBalanceRatio: pct(asso.balanceRatio),
      assoDelta: num(asso.balance - assoRef.balance),
      corSpendingPct: num(interpolateSeries(corSeries, r.year)),
      gdpGap: pct(r.gdpEffect),
      supplyGdpPct: pct(r.yS),
      interest: num(r.interest),
      interestRatio: pct(r.interestRatio),
      interestDelta: num(r.interest - b.interest),
    }
  })
}
