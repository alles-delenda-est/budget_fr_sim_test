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
//
// Leviers fiscaux (docs/sigma-fiscal.md, décisions de Patrick du 18 nov. 2026) : σ est CALCULÉ à partir des paramètres, jamais écrit en dur.
//   Travail (cotisations patronales, CSG, TVA, IR) : σ = −100 × e_L × |Δ ln(1 − T)| par unité du levier (% du PIB), un relèvement baisse le PIB.
//   IR : Δ ln(1 − T) moyenné tranche par tranche (revenus DGFiP 2024 estimés, coin complet IR + CSG/CRDS + CEHR ; ir-tranches.js).
//   IS : σ = −100 × α × ε_K × Δc/c, Δc/c = 0,01 × (1/(1 − τ) − z/(1 − τz)), plafonné à offre.is.plafond en valeur absolue.
// Cas bas / central / haut : e_L bas / central / haut (IS : α × ε_K bas / central / haut).
// Pas de double compte avec θ : levers.js ne garde dans θ que la part non réelle (voir `partReelle` ci-dessous).

import { PARAM_BY_ID } from './params.js'
import { irDeltaLnNet, thetaReelIr, IR_TRANCHES } from './ir-tranches.js'

// Paramètres de l'effet d'offre de l'IR (barème par tranche, docs/review-day0-parameters.md §9).
const IR_SIGMA_PARAMS = [
  ...IR_TRANCHES.flatMap((t) => [`offre.ir.tranche.${t}.foyers`, `offre.ir.tranche.${t}.impot`, `offre.ir.tranche.${t}.parts`]),
  'offre.ir.tranche.45.hors_bareme', 'offre.ir.tranche.0.revenu', 'offre.ir.coin.crds', 'offre.ir.coin.cehr',
  'offre.ir.bareme.seuil1', 'offre.ir.bareme.seuil2', 'offre.ir.bareme.seuil3', 'offre.ir.bareme.seuil4',
  'comp.tau0.csg', 'offre.csg.part_deductible', 'offre.ir_csg.part_actifs',
]

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
 * `emplois` : id facultatif du nombre d'emplois par point de PIB (affichage seulement, voir `impliedJobs`), avec ses libellés
 * `emploisParUnite` (« par année d'âge légal ») et `emploisUnite` ([singulier, pluriel]) ;
 * `emploisComparateur` : ids facultatifs { bas, haut, libelle } d'une fourchette externe d'emplois à afficher en regard.
 */
export const SUPPLY_EFFECTS = [
  { lever: 'dep_enseignement', libelle: 'Enseignement : capital humain à long terme',
    sigma: 'offre.sigma.enseignement', L: 'offre.lag.enseignement', t0: 'offre.t0.enseignement' },
  { lever: 'tva_normal', libelle: 'TVA (taux normal) : effet d\'offre (offre de travail)',
    sigmaParams: ['offre.e_L', 'rend.tva_normal', 'base.conso_menages', 'comp.coin.part_nette'], L: 'offre.lag.tva', t0: 'offre.t0.tva',
    sigmaFn: 'tva_normal', propre: (P) => P['base.tva.2025'] },
  { lever: 'tva_tous_taux', libelle: 'TVA (tous taux) : effet d\'offre (offre de travail)',
    sigmaParams: ['offre.e_L', 'rend.tva_tous_taux', 'base.conso_menages', 'comp.coin.part_nette'], L: 'offre.lag.tva', t0: 'offre.t0.tva',
    sigmaFn: 'tva_tous_taux', propre: (P) => P['base.tva.2025'] },
  { lever: 'travail_assurance_chomage', libelle: 'Assurance chômage : retour à l\'emploi',
    sigma: 'offre.sigma.assurance_chomage', L: 'offre.lag.assurance_chomage', t0: 'offre.t0.assurance_chomage' },
  { lever: 'age_legal', libelle: 'Âge légal de départ en retraite : emploi des seniors',
    sigma: 'offre.sigma.age_legal', L: 'offre.lag.age_legal', t0: 'offre.t0.age_legal',
    emplois: 'offre.emplois_par_pt_pib.age_legal',
    emploisParUnite: 'par année d\'âge légal', emploisUnite: ['an', 'ans'],
    emploisComparateur: { bas: 'cmp.cor.emplois.age_legal_10ans.bas', haut: 'cmp.cor.emplois.age_legal_10ans.haut', libelle: 'fourchette des modèles du COR à 10 ans' } },
  { lever: 'ir', libelle: 'Impôt sur le revenu : effet d\'offre',
    nomCourt: 'Effet d\'offre de l\'IR', statut: 'non validé',
    sigmaParams: ['offre.e_L', ...IR_SIGMA_PARAMS], L: 'offre.lag.ir', t0: 'offre.t0.ir',
    sigmaFn: 'ir', partReelle: (sigma, P) => thetaReelIr(P, sigma) },
  { lever: 'is', libelle: 'Impôt sur les sociétés : effet d\'offre (coût d\'usage du capital)',
    sigmaParams: ['offre.is.alpha', 'offre.is.eps_k', 'offre.is.z', 'offre.is.tau_effectif', 'offre.is.plafond'], L: 'offre.lag.is', t0: 'offre.t0.is',
    sigmaFn: 'is', propre: (P) => P['base.is.produit_etat_2026'] },
  { lever: 'cotis_patronales', libelle: 'Cotisations patronales : effet d\'offre',
    sigmaParams: ['offre.e_L', 'comp.tau0.cotis'], L: 'offre.lag.cotis', t0: 'offre.t0.cotis',
    sigmaFn: 'cotis_patronales', propre: (P) => (P['comp.tau0.cotis'] * P['rend.cotis']) },
  { lever: 'csg', libelle: 'CSG : effet d\'offre',
    sigmaParams: ['offre.e_L', 'offre.ir_csg.part_actifs', 'offre.csg.assiette', 'offre.csg.part_deductible', 'offre.csg.tmi_salarie', 'comp.coin.part_nette'], L: 'offre.lag.csg', t0: 'offre.t0.csg',
    sigmaFn: 'csg', propre: (P) => P['comp.tau0.csg'] * P['rend.csg'] },
]
export const SUPPLY_BY_LEVER = Object.fromEntries(SUPPLY_EFFECTS.map((e) => [e.lever, e]))

// ---------- σ des leviers fiscaux, calculé ----------
const CASES = ['low', 'value', 'high']
/** Valeur d'un paramètre dans un cas : `value` suit les remplacements éventuels, low et high le catalogue (à défaut, la valeur courante). */
const pc = (P, id, c) => (c === 'value' ? P[id] : (PARAM_BY_ID[id][c] ?? P[id]))

// Δ ln(1 − T) par unité du levier (fraction), pour les impôts sur le travail ; coin fiscal du salarié moyen : part_nette (dénominateur).
const DLN = {
  // cotisations patronales : 1 point de plus augmente le coût du travail de 0,01 / (1 + τ_patronal)
  cotis_patronales: (P) => 0.01 / (1 + P['comp.tau0.cotis'] / 100),
  // CSG : assiette 98,25 % ; part déductible (6,8 / 9,2) imposée au taux marginal d'IR du salarié moyen ; pondéré par la part active (D-P3)
  csg: (P) => ((P['offre.ir_csg.part_actifs'] ?? 1) * 0.01 * P['offre.csg.assiette'] * (P['offre.csg.part_deductible'] * (1 - P['offre.csg.tmi_salarie'] / 100) + (1 - P['offre.csg.part_deductible']))) / P['comp.coin.part_nette'],
  // TVA : 1 point de taux = rendement du point / consommation des ménages, en baisse du pouvoir d'achat
  tva_normal: (P) => P['rend.tva_normal'] / P['base.conso_menages'],
  tva_tous_taux: (P) => P['rend.tva_tous_taux'] / P['base.conso_menages'],
  // IR : +1 % du produit multiplie chaque taux du barème par 1,01 ; moyenne par tranche, pondérée par les revenus (0 % compris),
  // de 0,01 × τ_i × (1 − CSG déductible) / (1 − w_i), w_i coin marginal complet (IR, CSG/CRDS, CEHR) : voir ir-tranches.js
  ir: (P) => irDeltaLnNet(P),
}

/** Variation relative du coût d'usage du capital pour 1 point d'IS : Δc/c = 0,01 × (1/(1 − τ) − z/(1 − τz)). */
export const coutUsageParPoint = (P) => {
  const tau = P['offre.is.tau_effectif'] / 100
  const z = P['offre.is.z']
  return 0.01 * (1 / (1 - tau) - z / (1 - tau * z))
}

/**
 * σ d'un levier fiscal pour 1 unité de levier, en % du PIB (négatif : relever l'impôt baisse le PIB), pour un cas.
 * Travail : −100 × e_L × Δ ln(1 − T). IS : −100 × α × ε_K × Δc/c, plafonné en valeur absolue.
 * @param {'low'|'value'|'high'} c  cas : paramètres bas / centraux (avec remplacements) / hauts
 */
export function sigmaFiscalCase(leverId, P, c = 'value') {
  if (leverId === 'is') {
    const s = 100 * pc(P, 'offre.is.alpha', c) * pc(P, 'offre.is.eps_k', c) * coutUsageParPoint(P)
    return -Math.min(P['offre.is.plafond'], s)
  }
  const dln = DLN[leverId]
  return dln ? -100 * pc(P, 'offre.e_L', c) * dln(P) : 0
}

/** Triplet { low, value, high } de σ (signé) d'un levier fiscal, calculé depuis les paramètres. */
export const sigmaFiscal = (leverId, P) => ({
  low: sigmaFiscalCase(leverId, P, 'low'), value: sigmaFiscalCase(leverId, P, 'value'), high: sigmaFiscalCase(leverId, P, 'high'),
})

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
  const meta = { libelle: reg.libelle, statut: reg.statut, nomCourt: reg.nomCourt, L: P[reg.L], t0: P[reg.t0] ?? 0, scale: 1 }
  if (reg.sigmaFn) {
    const sg = sigmaFiscal(reg.sigmaFn, P) // σ calculé, symétrique hausse / baisse
    return { ...meta, hausse: sg, baisse: sg }
  }
  return { ...meta, hausse: triple(P, reg.sigma), baisse: reg.sigmaBaisse ? triple(P, reg.sigmaBaisse) : triple(P, reg.sigma) }
}

/**
 * σ retenu (signé, par unité de levier, % du PIB), délais L et t0 d'un levier pour le cas `ysCase`, ou null s'il n'a pas d'effet d'offre.
 * Même règle d'ordre que `coreSupplyLines` : « bas » = σ qui donne le PIB le plus bas, « haut » le plus haut, « central » = σ central.
 */
export function supplyForCase(leverId, x, P, explicit, ysCase = 'central') {
  if (!finite(x) || x === 0) return null
  const spec = specFor(leverId, P, explicit)
  if (!spec || !finite(spec.scale)) return null
  const branch = x > 0 ? spec.hausse : spec.baisse
  const sig = [branch.low, branch.value, branch.high].map((v) => (finite(v) ? v * spec.scale : 0))
  const pick = ysCase === 'central' ? sig[1] : (ysCase === 'bas' ? (x > 0 ? Math.min : Math.max) : (x > 0 ? Math.max : Math.min))(...sig)
  return { sigma: pick, L: spec.L, t0: spec.t0 }
}

/**
 * Part « réelle » de θ : perte de recette propre due à la variation du PIB, en part du rendement statique (docs/sigma-fiscal.md, décision 3).
 *   θ_réel = max(0, −σ × recette propre / (100 × rendement par unité)), avec σ en % du PIB par unité, recette propre et rendement en Md€.
 * La recette propre varie comme le PIB (le moteur la perd déjà par le canal des stabilisateurs E7) : on la retire de θ pour ne pas la compter deux fois.
 * IR (décision de Patrick du 25 nov. 2026) : θ_réel est calculé avec les mêmes poids, coins et facteur de CSG déductible que θ
 * (`thetaReelIr`, ir-tranches.js), l'élasticité réelle e_L remplaçant les élasticités par tranche.
 * Vaut 0 si σ = 0, si σ n'est pas fini ou s'il n'y a ni recette propre ni règle propre déclarée : θ reste alors inchangé.
 */
export function partReelle(leverId, sigma, rendementUnitaire, P) {
  const reg = SUPPLY_BY_LEVER[leverId]
  if (!finite(sigma) || sigma === 0) return 0
  if (reg?.partReelle) return reg.partReelle(sigma, P)
  if (!reg?.propre || !(rendementUnitaire > 0)) return 0
  const r = (-sigma * reg.propre(P)) / (100 * rendementUnitaire)
  return finite(r) ? Math.max(0, r) : 0
}

/** θ_non réel = max(0, θ − θ_réel). */
export const thetaNonReel = (theta, thetaReel) => Math.max(0, theta - thetaReel)

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
    lines.push({ id: inst.id, libelle: spec.libelle, statut: spec.statut, nomCourt: spec.nomCourt, sigma: { hausse: spec.hausse, baisse: spec.baisse }, L: spec.L, t0: spec.t0, cas })
  }
  return lines
}

/**
 * Emplois implicites de l'effet d'offre retenu (affichage seulement, n'entre pas dans le solde) :
 *   emplois = σ(cas) × x × emplois par point de PIB,
 * avec σ choisi par `supplyForCase` (même règle bas / central / haut que le moteur, signe compris).
 * Renvoie 0 si x = 0, null si le levier n'a pas de conversion emplois (`emplois` du registre) ou si une entrée n'est pas finie.
 */
export function impliedJobs(leverId, x, P, ysCase = 'central') {
  const reg = SUPPLY_BY_LEVER[leverId]
  if (!reg?.emplois || !finite(x)) return null
  const conv = P[reg.emplois]
  if (!finite(conv)) return null
  if (x === 0) return 0
  const s = supplyForCase(leverId, x, P, undefined, ysCase)
  if (!s || !finite(s.sigma)) return null
  const v = s.sigma * x * conv
  return finite(v) ? v : null
}

/** Arrondi d'un nombre d'emplois au multiple de `step` le plus proche (défaut 10 000), sans « −0 » ; null si non fini. */
export function roundJobs(v, step = 10000) {
  if (!finite(v) || !(step > 0)) return null
  const r = Math.round(Math.abs(v) / step) * step
  return r === 0 ? 0 : Math.sign(v) * r
}
