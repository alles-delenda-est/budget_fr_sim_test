// Effets d'offre du cœur (équation E5, docs/model-note.md) : forme fonctionnelle et registre des mesures concernées.
//
//   yS_j(t) = σ_j × a_j(t) × clamp((τ − t0_j) / (L_j − t0_j), 0, 1)
//
// - a_j(t) : taille signée de la mesure dans l'unité du levier (x × rampe de la mesure), et non l'effet sur le solde de E2.
//   Exemple : +2 points de TVA => a = 2 ; −10 % de la ligne « enseignement » => a = −10.
// - σ_j : effet de long terme sur le niveau du PIB, en % du PIB par unité du levier. σ_hausse s'applique si le levier est
//   augmenté (x > 0), σ_baisse s'il est diminué (x < 0) ; par défaut les deux valent σ.
// - τ : années écoulées depuis l'entrée en vigueur de la mesure (t − année de début de la rampe).
// - t0 : délai de grâce (défaut 0) ; L : horizon d'ajustement complet. Si L ≤ t0, l'effet est un échelon en t0.
// Chaque σ non nul donne une ligne distincte et étiquetée (avec son cas bas / central / haut) dans le résultat du moteur.

import { PARAM_BY_ID } from './params.js'

const finite = (v) => Number.isFinite(v)

/** Part de l'effet d'offre atteinte à τ années : clamp((τ − t0) / (L − t0), 0, 1) ; échelon en t0 si L ≤ t0 ; 0 si une entrée n'est pas finie. */
export function supplyPhase(tau, L, t0 = 0) {
  if (!finite(tau) || !finite(L) || !finite(t0)) return 0
  const g = Math.max(0, t0)
  if (L <= g) return tau >= g ? 1 : 0
  return Math.min(1, Math.max(0, (tau - g) / (L - g)))
}

/**
 * Registre : mesure du cœur => paramètres de l'effet d'offre.
 * `sigma` : id du paramètre (bas / central / haut) en % du PIB par unité du levier ; `sigmaBaisse` : id facultatif pour une baisse
 * du levier (sinon σ_baisse = σ) ; `scale(P)` : facteur de conversion appliqué à σ (défaut 1).
 */
export const SUPPLY_EFFECTS = [
  { lever: 'dep_enseignement', libelle: 'Enseignement : capital humain à long terme',
    sigma: 'offre.sigma.enseignement', L: 'offre.lag.enseignement', t0: 'offre.t0.enseignement' },
  { lever: 'tva_normal', libelle: 'TVA (taux normal) : effet d\'offre du seul relèvement',
    sigma: 'offre.sigma.tva', L: 'offre.lag.tva', t0: 'offre.t0.tva' },
  { lever: 'tva_tous_taux', libelle: 'TVA (tous taux) : effet d\'offre du seul relèvement',
    sigma: 'offre.sigma.tva', L: 'offre.lag.tva', t0: 'offre.t0.tva',
    scale: (P) => P['rend.tva_tous_taux'] / P['rend.tva_normal'] },
  { lever: 'travail_assurance_chomage', libelle: 'Assurance chômage : retour à l\'emploi',
    sigma: 'offre.sigma.assurance_chomage', L: 'offre.lag.assurance_chomage', t0: 'offre.t0.assurance_chomage' },
  { lever: 'ir', libelle: 'Impôt sur le revenu : effet d\'offre',
    sigma: 'offre.sigma.ir', L: 'offre.lag.ir', t0: 'offre.t0.ir' },
  { lever: 'is', libelle: 'Impôt sur les sociétés : effet d\'offre',
    sigma: 'offre.sigma.is', L: 'offre.lag.is', t0: 'offre.t0.is' },
  { lever: 'cotis_patronales', libelle: 'Cotisations patronales : effet d\'offre',
    sigma: 'offre.sigma.cotis', L: 'offre.lag.cotis', t0: 'offre.t0.cotis' },
  { lever: 'csg', libelle: 'CSG : effet d\'offre',
    sigma: 'offre.sigma.csg', L: 'offre.lag.csg', t0: 'offre.t0.csg' },
]
export const SUPPLY_BY_LEVER = Object.fromEntries(SUPPLY_EFFECTS.map((e) => [e.lever, e]))

// Triplet { low, value, high } d'un paramètre : value suit les remplacements éventuels, low et high le catalogue.
const triple = (P, id) => {
  const q = PARAM_BY_ID[id]
  return { low: q.low ?? P[id], value: P[id], high: q.high ?? P[id] }
}
const flat = (v) => ({ low: v, value: v, high: v })

/** Caractéristiques de l'effet d'offre d'une mesure : { libelle, hausse, baisse, L, t0, scale } ou null. Une entrée `explicit` remplace le registre. */
function specFor(leverId, P, explicit) {
  const e = explicit?.[leverId]
  const reg = SUPPLY_BY_LEVER[leverId]
  if (e && typeof e === 'object') {
    const s = finite(e.sigma) ? e.sigma : 0
    const hausse = finite(e.sigmaHausse) ? e.sigmaHausse : s
    const baisse = finite(e.sigmaBaisse) ? e.sigmaBaisse : s
    return { libelle: reg?.libelle ?? `Effet d'offre : ${leverId}`, hausse: flat(hausse), baisse: flat(baisse), L: e.L, t0: e.t0 ?? 0, scale: 1 }
  }
  if (!reg) return null
  return {
    libelle: reg.libelle,
    hausse: triple(P, reg.sigma),
    baisse: reg.sigmaBaisse ? triple(P, reg.sigmaBaisse) : triple(P, reg.sigma),
    L: P[reg.L], t0: P[reg.t0] ?? 0, scale: reg.scale ? reg.scale(P) : 1,
  }
}

/**
 * Lignes d'effet d'offre des mesures natives. Chaque ligne : { id, libelle, sigma, L, t0, cas: { bas, central, haut } (séries de fraction de PIB, t = 0..N) }.
 * Les cas sont ordonnés par le résultat : « bas » = le PIB le plus bas des trois valeurs de σ, « haut » = le plus haut, « central » = σ central.
 * Les lignes dont les trois cas sont nuls sont omises.
 */
export function coreSupplyLines(instruments, P, nYears, explicit) {
  const lines = []
  for (const inst of instruments) {
    if (inst.source !== 'levier' || !finite(inst.x) || inst.x === 0) continue
    const spec = specFor(inst.id, P, explicit)
    if (!spec || !finite(spec.scale)) continue
    const branch = inst.x > 0 ? spec.hausse : spec.baisse
    const sig = [branch.low, branch.value, branch.high]
    const cas = { bas: [], central: [], haut: [] }
    for (let t = 0; t <= nYears; t++) {
      const tau = t - inst.start
      const ph = supplyPhase(tau, spec.L, spec.t0)
      const v = sig.map((s) => (finite(s) ? (s * spec.scale * inst.sizeByYear[t] * ph) / 100 : 0))
      cas.bas.push(Math.min(...v)); cas.central.push(v[1]); cas.haut.push(Math.max(...v))
    }
    if (['bas', 'central', 'haut'].every((c) => cas[c].every((v) => v === 0))) continue
    lines.push({ id: inst.id, libelle: spec.libelle, sigma: { hausse: spec.hausse, baisse: spec.baisse }, L: spec.L, t0: spec.t0, cas })
  }
  return lines
}
