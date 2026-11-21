// Scénarios types neutres et variantes macroéconomiques du simulateur budgétaire v2.
// Aucun programme partisan ; les comparateurs macroéconomiques (RESF 2027) ne sont jamais des cibles (note de modèle §1.2).

import { LEVERS } from '../../engine/levers.js'
import { PARAM_BY_ID } from '../../engine/params.js'

/**
 * Variantes macroéconomiques (comparateurs, jamais des cibles).
 * Les paramètres de croissance du Gouvernement sont lus dans PARAM_BY_ID (HCFP, avis n° 2026-5) ;
 * l'inflation RESF 2027 (tableaux 2 et 10, docs/model-note.md §1.2) vaut 2,1 % en 2026 et 1,8 % en 2027 (maintenue au-delà).
 */
export const MACRO_VARIANTS = [
  {
    id: 'gouv_resf_2027',
    label: 'Prévisions du Gouvernement (RESF 2027)',
    description: 'Comparateur macroéconomique (RESF 2027 / HCFP avis n° 2026-5) : croissance 0,5 % en 2026, 1,0 % en 2027, potentielle 1,2 % ; inflation 2,1 % en 2026, 1,8 % dès 2027. Jamais une cible : isole l\'écart dû aux hypothèses macroéconomiques par rapport à la référence des prévisionnistes indépendants.',
    overrides: {
      'macro.g.2026': PARAM_BY_ID['cmp.gouv.croissance.2026'].value,
      'macro.g.2027': PARAM_BY_ID['cmp.gouv.croissance.2027'].value,
      'macro.g.potentielle': PARAM_BY_ID['cmp.gouv.croissance.potentielle'].value,
      'macro.pi.2026': 2.1,
      'macro.pi.2027': 1.8,
      'macro.pi.long': 1.8,
    },
    paramIds: [
      'cmp.gouv.croissance.2026', 'cmp.gouv.croissance.2027', 'cmp.gouv.croissance.potentielle',
      'macro.g.2026', 'macro.g.2027', 'macro.g.potentielle',
      'macro.pi.2026', 'macro.pi.2027', 'macro.pi.long',
    ],
  },
]

export const MACRO_VARIANT_BY_ID = Object.fromEntries(MACRO_VARIANTS.map((v) => [v.id, v]))

/** Renvoie les remplacements de paramètres d'une variante macroéconomique valide, ou undefined. */
export function overridesForMacro(macroId) {
  return macroId && Object.hasOwn(MACRO_VARIANT_BY_ID, macroId) ? MACRO_VARIANT_BY_ID[macroId].overrides : undefined
}

/** Catalogue des 6 scénarios types neutres (non partisans). */
export const NEUTRAL_SCENARIOS = [
  {
    id: 'reference',
    titre: 'Référence (politique inchangée)',
    resume: 'Aucun levier · prévisionnistes indépendants',
    description: 'Trajectoire de référence sans mesure nouvelle, ancrée sur la médiane des prévisionnistes indépendants. Réinitialise tous les curseurs et retire tout comparateur macroéconomique.',
    levers: {},
    macroId: null,
  },
  {
    id: 'previsions_gouv',
    titre: 'Prévisions du Gouvernement (RESF 2027)',
    resume: 'Comparateur macro · sans levier',
    description: 'Comparateur macroéconomique (RESF 2027), sans mesure budgétaire nouvelle — jamais une cible ; compare les trajectoires avec les hypothèses de croissance et d\'inflation du Gouvernement.',
    levers: {},
    macroId: 'gouv_resf_2027',
  },
  {
    id: 'equilibre',
    titre: 'Ajustement équilibré (recettes / dépenses)',
    resume: '≈ +48 Md€ ex ante · 49 % recettes / 51 % dépenses',
    description: 'Consolidation répartie à parts presque égales entre prélèvements larges (TVA +2 pts, CSG +0,5 pt) et maîtrise des dépenses et prestations (affaires économiques −4 %, ONDAM −2 %, pensions −1 pt, âge légal +1 an dès 2028).',
    levers: {
      tva_normal: 2,
      csg: 0.5,
      dep_affaires_eco: -4,
      ondam: -2,
      indexation_pensions: -1,
      age_legal: 1,
    },
    macroId: null,
  },
  {
    id: 'depenses',
    titre: 'Ajustement par les dépenses',
    resume: '≈ +48 Md€ ex ante · 100 % dépenses et prestations',
    description: 'Consolidation uniquement par la dépense (affaires économiques −8 %, enseignement −4 %, ordre et sécurité −4 %, ONDAM −3 %, pensions −1,5 pt, assurance chômage −10 %, âge légal +1 an). Illustre des multiplicateurs de demande plus élevés à court terme mais un effet d\'offre de long terme plus favorable.',
    levers: {
      dep_affaires_eco: -8,
      dep_enseignement: -4,
      dep_ordre_securite: -4,
      ondam: -3,
      indexation_pensions: -1.5,
      travail_assurance_chomage: -10,
      age_legal: 1,
    },
    macroId: null,
  },
  {
    id: 'recettes',
    titre: 'Ajustement par les recettes',
    resume: '≈ +47 Md€ ex ante · 100 % recettes fiscales',
    description: 'Consolidation uniquement par la fiscalité (TVA normale +2 pts, CSG +1 pt, IR +10 %, IS +2 pts). Illustre l\'érosion comportementale (θ non réel) et le frein d\'offre de long terme (σ ; l\'effet d\'offre de l\'IR est signalé « non validé — avis demandé »).',
    levers: {
      tva_normal: 2,
      csg: 1,
      ir: 10,
      is: 2,
    },
    macroId: null,
  },
  {
    id: 'tva_sociale',
    titre: 'Bascule TVA sociale (neutre ex ante)',
    resume: '≈ +0,1 Md€ ex ante · transfert entre blocs',
    description: 'Hausse de 1,5 point de TVA sur tous les taux (+17,1 Md€ pour l\'État) compensée par une baisse de 2 points de cotisations patronales (−17,0 Md€ pour la sécurité sociale). Illustre le transfert entre blocs et le léger gain d\'offre net sur le PIB au cas central.',
    levers: {
      tva_tous_taux: 1.5,
      cotis_patronales: -2,
    },
    macroId: null,
  },
]

export const SCENARIO_BY_ID = Object.fromEntries(NEUTRAL_SCENARIOS.map((s) => [s.id, s]))

const numOrZero = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/** Vrai si l'état courant (valeurs de leviers + variante macroéconomique) correspond exactement au scénario type. */
export function matchesScenario(scenario, values, macroId = null) {
  if (!scenario) return false
  if ((scenario.macroId ?? null) !== (macroId ?? null)) return false
  return LEVERS.every((l) => Math.abs(numOrZero(scenario.levers?.[l.id]) - numOrZero(values?.[l.id])) < 1e-9)
}
