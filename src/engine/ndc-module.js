// Module « Comptes notionnels (NDC) » — forme réduite, non validé (note de modèle §6, décision D8).
// Contrat de module (src/engine/modules.js) : n'écrit jamais dans la dette ni dans les intérêts.
//
// Mécanisme (zéro chiffre inventé) :
//   - Entrée en vigueur : janvier 2028 (t = 2, aligné sur la reprise après le gel LFSS 2026, D8).
//   - Montée en charge linéaire sur L = 15 cohortes (1/15 en 2028, ..., 15/15 = 1 à partir de 2042).
//   - Ancrage strict sur `ref.derive.a_retraites` (COR juin 2026 [S23]) : à terme, le diviseur
//     d'espérance de vie par cohorte et le mécanisme d'équilibrage automatique (ABM) du modèle
//     suédois de comptes notionnels stabilisent la dépense de retraites en part de PIB à son niveau
//     de 2025 (14,1 %). L'effet ex ante suit donc automatiquement la variante de productivité COR
//     sélectionnée (1,0 % / 0,7 % / 0,4 %).
//   - Effet d'offre propre nul (yS = 0, D2) : l'effet emploi des seniors provient exclusivement du
//     levier `age_legal`, retenu pour la version 0.9 (65 ans dans le préréglage D8).
//   - Respecte `comp.offset.prestations` (0,20 par défaut, Note IPP n° 129).

import { interpolateSeries } from './params.js'

/** Année de démarrage (indice t) : t = 2 correspond à janvier 2028 (START_YEAR = 2026). */
export const NDC_START_T = 2

/** Durée de montée en charge par cohorte (années) : 1/15 en 2028, plein effet (1) en 2042. */
export const NDC_RAMP_YEARS = 15

export const NDC_MODULE = {
  id: 'comptes_notionnels_ndc',
  titre: 'Comptes notionnels (forme réduite, non validé)',
  statut: 'non validé',
  sources: [
    'COR, rapport annuel de juin 2026 [S23] : dépenses de retraites à droit en vigueur (14,1 % du PIB en 2025 et 2030, 14,2 % en 2045, 15,3 % en 2070 ; variantes productivité 1,0 % = 14,5 % et 0,4 % = 16,1 %)',
    'Pensionsmyndigheten, Orange Report 2020 (chap. 4) : diviseur d\'espérance de vie par cohorte et mécanisme d\'équilibrage automatique (ABM) des comptes notionnels suédois',
    'Ministère suédois des Finances, « The Swedish pension system in brief » (nov. 2025) : pilotage NDC à taux de cotisation constant',
    'Holzmann, Palmer et Robalino, Banque mondiale (2013), Nonfinancial Defined Contribution Pension Schemes in a Changing Pension World : principes de stabilisation démographique en NDC',
  ],
  leviers: [
    {
      id: 'actif',
      unite: 'booléen (0 ou 1)',
      bornes: [0, 1],
      defaut: 0,
      aide: 'Active (1) ou désactive (0) la stabilisation démographique des comptes notionnels à partir de janvier 2028 (montée en charge sur 15 ans).',
    },
  ],
  calculer({ actif }, contexte) {
    const corSeries = contexte.params['ref.derive.a_retraites']
    const cor2025 = interpolateSeries(corSeries, 2025)
    const theta = Math.min(1, Math.max(0, contexte.params['comp.offset.prestations'] ?? 0))
    const enabled = actif >= 0.5
    const n = contexte.nYears + 1

    const annees = Array.from({ length: n }, (_, t) => {
      const year = contexte.years?.[t] ?? (contexte.startYear + t)
      const phase = t < NDC_START_T ? 0 : Math.min(1, (t - (NDC_START_T - 1)) / NDC_RAMP_YEARS)
      const driftPct = Math.max(0, interpolateSeries(corSeries, year) - cor2025)
      const aSecu = enabled ? phase * (driftPct / 100) : 0
      return {
        a: { centrales: 0, securiteSociale: aSecu, locales: 0 },
        theta,
        categorie: 'prestations',
        yS: { bas: 0, central: 0, haut: 0 },
      }
    })

    return {
      annees,
      flux: [],
      explications: [
        enabled
          ? `Stabilisation démographique NDC active à compter de janvier ${contexte.startYear + NDC_START_T} (montée en charge sur ${NDC_RAMP_YEARS} ans, plein effet en ${contexte.startYear + NDC_START_T + NDC_RAMP_YEARS - 1}), ancrée sur la dérive COR post-2025 (${cor2025.toFixed(1)} % du PIB).`
          : 'Module comptes notionnels inactif (actif = 0).',
      ],
    }
  },
  explications: [
    'Forme réduite, statut « non validé » (confiance basse, décision D8) : modélise la stabilisation progressive sur 15 cohortes (2028–2042) de la dérive démographique des dépenses de retraites du COR au-delà de leur niveau 2025 (14,1 % du PIB), d\'après le diviseur d\'espérance de vie et le mécanisme d\'équilibrage automatique (ABM) du système suédois.',
    'Aucun effet d\'offre propre (yS = 0, décision D2) : l\'effet d\'offre sur le PIB via l\'emploi des seniors provient exclusivement du levier « Âge légal de départ en retraite », retenu pour la version 0.9 (65 ans dans le préréglage).',
    'Comparaison externe [S24] : le modèle publié par le Parti libéral français (éditeur déclaré : Parti libéral français ; jamais présenté comme « le » modèle des comptes notionnels) n\'est repris ni pour son chiffre de −53 % de dépense en 2070 (marge du système à coefficient d\'équilibre > 1, non une économie budgétaire selon la revue [S25]) ni pour ses éléments de programme (taux unique de 18 %, capitalisation, garantie vieillesse, taxe sur le terrain).',
  ],
}
