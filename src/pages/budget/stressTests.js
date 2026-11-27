// Stress-tests macroéconomiques orthogonaux aux scénarios de leviers (Item 6).
// Aucune constante économique codée en dur : tous les étalons et bornes sont lus dans PARAM_BY_ID / resolveParams().

import { PARAM_BY_ID, resolveParams } from '../../engine/params.js'

const round2 = (x) => Math.round(x * 100) / 100

/**
 * Catalogue des 4 stress-tests macroéconomiques (adverses, orthogonaux aux bouquets de leviers) :
 * couvrent les 4 moteurs de l'équation de dette (niveau r, prime de risque β, croissance potentielle g + dérive D7, cycle yD + multiplicateurs E4).
 */
export const STRESS_TESTS = Object.freeze([
  Object.freeze({
    id: 'taux_100pb',
    shortLabel: 'Taux +100 pb',
    titre: 'Choc de taux (+100 pb)',
    badge: '+100 pb BTF & OAT · i* = 5,39 %',
    description: 'Choc permanent de +1,00 pt sur toute la courbe des taux souverains dès 2026 (BTF, OAT 5 ans, OAT 10 ans+), aligné sur le choc de sensibilité du Debt Sustainability Monitor 2025 (CE IP 332) et AFT/RESF.',
    paramIds: Object.freeze(['dette.y_btf', 'dette.y_moyen', 'dette.y_long', 'dette.beta']),
  }),
  Object.freeze({
    id: 'spread_oat',
    shortLabel: 'Tension OAT',
    titre: 'Tension souveraine (spread OAT & β = 5)',
    badge: 'OAT +75/+100 pb · β haut (5 pb/pt)',
    description: 'Pentification spécifique du spread français à taux BCE BTF inchangé (+0,75 pt sur 5 ans, +1,00 pt sur 10 ans+) et sensibilité marché β portée à sa borne haute empirique (5 pb/pt de dette, EC DP 141 / Laubach).',
    paramIds: Object.freeze(['dette.y_btf', 'dette.y_moyen', 'dette.y_long', 'dette.beta']),
  }),
  Object.freeze({
    id: 'croissance_basse',
    shortLabel: 'Croiss. 0,80 %',
    titre: 'Croissance potentielle basse (0,80 %/an)',
    badge: 'g_pot 0,80 % · dérive D7 & COR hautes',
    description: 'Croissance potentielle abaissée à 0,80 %/an (sous le plancher FMI oct. 2026) avec répercussion cohérente sur l\'inertie des dépenses primaires (borne haute D7 à 0,09 pt/an) et la variante basse productivité COR retraites.',
    paramIds: Object.freeze(['macro.g.potentielle', 'ref.derive.b_autres', 'ref.derive.a_retraites']),
  }),
  Object.freeze({
    id: 'recession_2027',
    shortLabel: 'Récession 2027',
    titre: 'Récession 2027 (−1,0 % PIB & régime E4)',
    badge: 'PIB 2027 −1,0 % · stabilisateurs & E4 récession',
    description: 'Choc conjoncturel portant la croissance réelle 2027 à −1,0 % (dont −0,30 pt d\'hystérèse et choc de demande s\'estompant au rythme λ), déclenchant les stabilisateurs automatiques (ε), Okun (κ) et les multiplicateurs de récession E4.',
    paramIds: Object.freeze([
      'macro.g.2027', 'dem.lambda', 'fisc.eps', 'emploi.kappa',
      'dem.recession.mult_depenses', 'dem.recession.mult_prestations', 'dem.recession.mult_impots',
    ]),
  }),
])

export const STRESS_TEST_BY_ID = Object.freeze(Object.fromEntries(STRESS_TESTS.map((s) => [s.id, s])))

/**
 * Résout les surcharges moteur (`overrides`), l'éventuel régime E4 imposé (`demandRegime`) et le choc conjoncturel (`yDExog`)
 * pour un `stressId` donné et `nYears` années après 2026 (`N = endYear - 2026`). Renvoie `null` si inactif ou inconnu.
 */
export function resolveStressConfig(stressId, nYears = 10, P = resolveParams()) {
  if (!stressId || !Object.hasOwn(STRESS_TEST_BY_ID, stressId)) return null
  const stress = STRESS_TEST_BY_ID[stressId]

  if (stressId === 'taux_100pb') {
    return {
      stress,
      overrides: {
        'dette.y_btf': round2(P['dette.y_btf'] + 1.0),
        'dette.y_moyen': round2(P['dette.y_moyen'] + 1.0),
        'dette.y_long': round2(P['dette.y_long'] + 1.0),
      },
      demandRegime: null,
      yDExog: null,
      paramIds: stress.paramIds,
    }
  }

  if (stressId === 'spread_oat') {
    return {
      stress,
      overrides: {
        'dette.y_moyen': round2(P['dette.y_moyen'] + 0.75),
        'dette.y_long': round2(P['dette.y_long'] + 1.0),
        'dette.beta': PARAM_BY_ID['dette.beta'].high,
      },
      demandRegime: null,
      yDExog: null,
      paramIds: stress.paramIds,
    }
  }

  if (stressId === 'croissance_basse') {
    return {
      stress,
      overrides: {
        'macro.g.potentielle': 0.80,
        'ref.derive.b_autres': PARAM_BY_ID['ref.derive.b_autres'].high,
        'ref.derive.a_retraites': PARAM_BY_ID['ref.derive.a_retraites'].high,
      },
      demandRegime: null,
      yDExog: null,
      paramIds: stress.paramIds,
    }
  }

  if (stressId === 'recession_2027') {
    // −1,0 % de croissance réelle totale en 2027 = −0,30 pt d'hystérèse sur macro.g.2027 + écart conjoncturel transitoire yDExog (dem.lambda).
    const g2027Override = round2(P['macro.g.2027'] - 0.30)
    const cyclicalShock = (-1.0 - g2027Override) / 100
    const lambda = P['dem.lambda']
    const yDExog = Array.from({ length: nYears + 1 }, (_, t) => (t === 0 ? 0 : cyclicalShock * (lambda ** (t - 1))))
    return {
      stress,
      overrides: { 'macro.g.2027': g2027Override },
      demandRegime: 'recession',
      yDExog,
      paramIds: stress.paramIds,
    }
  }

  return null
}
