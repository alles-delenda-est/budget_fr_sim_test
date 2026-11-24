// Barème de l'IR par tranche (docs/review-day0-parameters.md §9) : données communes au θ de l'IR et à son effet d'offre σ.
//
// Revenu imposable par tranche (non publié par la DGFiP) estimé par inversion du barème : dans la tranche de taux τ_i,
// l'impôt par part vaut τ_i × q − k_i, d'où Z_i = (T_i + k_i × foyers_i × parts_i) / τ_i (T_45 net de l'impôt hors barème et de la CEHR).
// Coin marginal complet : w_i = CSG + CRDS + τ_i × (1 − CSG déductible) (+ CEHR en tranche 45 %).
// Le levier IR du moteur est proportionnel (« +1 % du produit ») : chaque taux est multiplié par 1,01, donc Δτ_i = 0,01 × τ_i.

import { PARAM_BY_ID } from './params.js'

export const IR_TRANCHES = [11, 30, 41, 45]
const SEUILS = ['offre.ir.bareme.seuil1', 'offre.ir.bareme.seuil2', 'offre.ir.bareme.seuil3', 'offre.ir.bareme.seuil4']
const finite = (v) => Number.isFinite(v)
/** Valeur d'un paramètre dans un cas : `value` suit les remplacements, low et high le catalogue (à défaut, la valeur courante). */
const pc = (P, id, c) => (c === 'value' ? P[id] : (PARAM_BY_ID[id]?.[c] ?? P[id]))

/** Constante k_i (€ par part) telle que l'impôt par part dans la tranche i vaut τ_i × q − k_i. */
function constantesBareme(P) {
  const s = SEUILS.map((id) => P[id])
  const k = []
  let impotAuSeuil = 0
  IR_TRANCHES.forEach((t, i) => {
    if (i > 0) impotAuSeuil += (IR_TRANCHES[i - 1] / 100) * (s[i] - s[i - 1])
    k.push((t / 100) * s[i] - impotAuSeuil)
  })
  return k
}

/** Coin marginal complet w_i (fraction) de la tranche de taux t (%), pour un cas de CEHR. */
export function coinMarginal(P, t, c = 'value') {
  const csg = P['comp.tau0.csg'] / 100
  const deductible = csg * P['offre.csg.part_deductible']
  const cehr = t === 45 ? pc(P, 'offre.ir.coin.cehr', c) / 100 : 0
  return csg + P['offre.ir.coin.crds'] / 100 + (t / 100) * (1 - deductible) + cehr
}

/**
 * Tranches estimées : [{ taux, revenu Z_i (Md€), parts (M), impot (Md€), coin w_i }], plus revenu à 0 %, total, assiette B d'une hausse
 * de 1 point (revenu au-delà du premier seuil) et impôt total. Renvoie null si une entrée n'est pas finie ou si un revenu est ≤ 0.
 */
export function irTranches(P, c = 'value') {
  const k = constantesBareme(P)
  const tranches = IR_TRANCHES.map((t, i) => {
    const parts = (P[`offre.ir.tranche.${t}.foyers`] * P[`offre.ir.tranche.${t}.parts`]) / 1e6 // millions de parts
    const impot = P[`offre.ir.tranche.${t}.impot`] - (t === 45 ? P['offre.ir.tranche.45.hors_bareme'] : 0)
    const revenu = (impot + (k[i] * parts) / 1e3) / (t / 100) // Md€ (k en €, parts en millions → k × parts / 1e3 Md€)
    return { taux: t, revenu, parts, impot, coin: coinMarginal(P, t, c) }
  })
  const revenu0 = P['offre.ir.tranche.0.revenu']
  const total = revenu0 + tranches.reduce((a, r) => a + r.revenu, 0)
  const assiettePoint = tranches.reduce((a, r) => a + r.revenu - (P[SEUILS[0]] * r.parts) / 1e3, 0)
  const impot = tranches.reduce((a, r) => a + r.impot, 0)
  const ok = [revenu0, total, assiettePoint, impot].every(finite) && revenu0 >= 0 && assiettePoint > 0 && impot > 0
    && tranches.every((r) => finite(r.revenu) && r.revenu > 0 && finite(r.coin) && r.coin < 1)
  return ok ? { tranches, revenu0, total, assiettePoint, impot } : null
}

/**
 * Δ ln(1 − T) moyen pour +1 % du produit de l'IR (levier proportionnel), pondéré par les revenus de toutes les tranches (0 % compris) :
 * Σ_i (Z_i / Z_total) × 0,01 × τ_i × (1 − CSG déductible) / (1 − w_i). Les poids somment à 1 : σ est une part du PIB.
 */
export function irDeltaLnNet(P) {
  const d = irTranches(P)
  if (!d) return 0
  const deductible = (P['comp.tau0.csg'] / 100) * P['offre.csg.part_deductible']
  return d.tranches.reduce((a, r) => a + (r.revenu / d.total) * (0.01 * (r.taux / 100) * (1 - deductible)) / (1 - r.coin), 0)
}

/**
 * θ de l'IR par tranche (dérivation documentée, docs/review-day0-parameters.md §9 ; comp.theta.ir reste fixé par le propriétaire) :
 *   +1 point sur tous les taux : θ = Σ_i (Z_i / B) × e_i × w_i / (1 − w_i)
 *   hausse proportionnelle (levier du moteur) : θ = Σ_i (τ_i × Z_i / T) × e_i × w_i / (1 − w_i)
 * @param {'point'|'proportionnel'} mode
 * @param {'low'|'value'|'high'} c  cas des élasticités et de la CEHR
 */
export function thetaIrTranches(P, mode = 'point', c = 'value') {
  const d = irTranches(P, c)
  if (!d) return 0
  return d.tranches.reduce((a, r) => {
    const poids = mode === 'proportionnel' ? ((r.taux / 100) * r.revenu) / d.impot : r.revenu / d.assiettePoint
    return a + poids * pc(P, `offre.ir.tranche.${r.taux}.eti`, c) * (r.coin / (1 - r.coin))
  }, 0)
}
