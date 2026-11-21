// Fonctions pures de la page « Simulateur Retraites » (moteur v2) :
// variantes COR 2026 et santé Commission 2024, correspondance âge légal, séries graphiques et fiches clés.

import { PARAM_BY_ID, interpolateSeries } from '../../engine/params.js'
import { num } from '../budget/helpers.js'

/** Âge légal de droit en vigueur (reprise progressive vers 64 ans après le gel LFSS 2026 jusqu'en janv. 2028). */
export const LEGAL_AGE_BASE = 64

/** Variantes de productivité du COR (rapport annuel de juin 2026, dépenses de retraites en 2070). */
export const COR_VARIANTS = [
  {
    id: 'central',
    label: 'Référence COR (15,3 % en 2070)',
    shortLabel: 'Référence COR',
    description: 'Productivité centrale (0,7 %) : dépenses de retraites à 14,1 % du PIB en 2025 et 2030, 14,2 % en 2045, 15,3 % en 2070.',
    series: PARAM_BY_ID['ref.derive.a_retraites'].value,
  },
  {
    id: 'haute',
    label: 'Productivité haute 1,0 % (14,5 % en 2070)',
    shortLabel: 'Productivité haute (1,0 %)',
    description: 'Variante favorable du COR : dépenses de retraites à 14,5 % du PIB en 2070 (borne basse de la dérive).',
    series: PARAM_BY_ID['ref.derive.a_retraites'].low,
  },
  {
    id: 'basse',
    label: 'Productivité basse 0,4 % (16,1 % en 2070)',
    shortLabel: 'Productivité basse (0,4 %)',
    description: 'Variante défavorable du COR : dépenses de retraites à 16,1 % du PIB en 2070 (borne haute de la dérive).',
    series: PARAM_BY_ID['ref.derive.a_retraites'].high,
  },
]

/** Variantes de dérive santé / dépendance (Commission européenne, 2024 Ageing Report). */
export const HEALTH_VARIANTS = [
  {
    id: 'central',
    label: 'Santé seule (+0,3 pt / 48 ans)',
    description: 'Scénario de référence de la Commission européenne (2024 Ageing Report), hors soins de longue durée.',
    value: PARAM_BY_ID['ref.derive.a_sante'].value,
  },
  {
    id: 'longueDuree',
    label: 'Santé + dépendance (+1,0 pt / 48 ans)',
    description: 'Borne haute : ajoute la dérive des soins de longue durée (+0,7 pt d\'ici 2070) à la dépense de santé (+0,3 pt).',
    value: PARAM_BY_ID['ref.derive.a_sante'].high,
  },
  {
    id: 'aucune',
    label: 'Sans dérive santé (0 pt / an)',
    description: 'Borne basse conventionnelle : dérive santé neutralisée pour isoler la seule trajectoire retraites du COR.',
    value: PARAM_BY_ID['ref.derive.a_sante'].low,
  },
]

/** Mesures et préréglages affichés en transparence mais désactivés (« non validé — avis demandé »). */
export const UNVALIDATED_PENSION_ITEMS = [
  {
    id: 'plafonnement_pensions',
    titre: 'Plafonnement des hautes pensions',
    statut: 'non validé',
    badge: 'Non validé — avis demandé',
    detail: 'Désactivé dans le moteur v2 (note de modèle §6) : aucun rendement net ni effet de report validé sur sources primaires à ce stade.',
  },
  {
    id: 'comptes_notionnels_ndc',
    titre: 'Préréglage « Comptes notionnels (NDC) »',
    statut: 'non validé',
    badge: 'Non validé — avis demandé',
    detail: 'Décision D8 : retenu sur le principe pour une réforme à compter de janvier 2028 avec âge légal à 65 ans, en attente de validation d\'une forme réduite sourcée sur le COR et la littérature suédoise NDC. Ni l\'ancien −6 % ni le −53 % du simulateur du Parti libéral français (marge du système, non économie) ne sont repris.',
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
  const rawTargets = N >= 25
    ? [{ t: 4, titre: 'Court terme' }, { t: 14, titre: 'Horizon 2040' }, { t: N, titre: 'Fin d\'horizon' }]
    : N >= 14
      ? [{ t: 4, titre: 'Court terme' }, { t: 10, titre: 'À 10 ans' }, { t: N, titre: 'Fin d\'horizon' }]
      : [{ t: 4, titre: 'Court terme' }, { t: 7, titre: 'Plein effet âge légal' }, { t: N, titre: 'Fin d\'horizon' }]

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
