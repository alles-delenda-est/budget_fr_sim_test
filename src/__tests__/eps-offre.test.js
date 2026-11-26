// D13 : l'offre passe au solde par fisc.eps_offre (taux de prélèvements obligatoires), la demande par fisc.eps.
// Plus : abréviation de fmt et σ de la CSG.

import { describe, it, expect } from 'vitest'
import { LEVERS } from '../engine/levers.js'
import { PARAM_BY_ID, resolveParams } from '../engine/params.js'
import { projectScenario, HORIZONS } from '../engine/project.js'
import { sigmaFiscal } from '../engine/supply.js'
import { fmt, decomposeAtYear, FMT_COMPACT_FROM } from '../pages/budget/helpers.js'

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const uniform = (rng, lo, hi) => lo + (hi - lo) * rng()

describe('fisc.eps_offre (D13)', () => {
  it('valeurs du catalogue : 0,436 (Insee 2025), bas 0,436, haut 0,522 ; fisc.eps inchangé à 0,6', () => {
    const q = PARAM_BY_ID['fisc.eps_offre']
    expect([q.value, q.low, q.high, q.status]).toEqual([0.436, 0.436, 0.522, 'sourcé'])
    expect(PARAM_BY_ID['fisc.eps'].value).toBe(0.6)
  })

  it('le solde primaire suit ε × yD + ε_offre × yS : yS seul (module externe) passe par ε_offre, jamais par ε', () => {
    const yS = Array.from({ length: 11 }, (_, t) => -0.01 * Math.min(1, t / 5))
    const base = projectScenario({})
    for (const [eps, epsO] of [[0.6, 0.436], [0, 0.436], [0.6, 0], [0.5, 0.522]]) {
      const o = { 'fisc.eps': eps, 'fisc.eps_offre': epsO }
      const ref = projectScenario({ overrides: o })
      const r = projectScenario({ overrides: o, yS })
      for (let t = 1; t <= 10; t++) {
        const d = r.total[t].primaryBalance - ref.total[t].primaryBalance
        expect(d / r.total[t].gdpBase).toBeCloseTo(epsO * yS[t], 9)
      }
    }
    expect(base.total[10].yS).toBe(0)
  })

  it('la demande passe par ε : un levier sans effet d\'offre ne dépend pas de ε_offre', () => {
    const levers = { dep_defense: -20 }
    const a = projectScenario({ levers, overrides: { 'fisc.eps_offre': 0 } })
    const b = projectScenario({ levers, overrides: { 'fisc.eps_offre': 0.9 } })
    expect(b.total[10].primaryBalance).toBeCloseTo(a.total[10].primaryBalance, 9)
    const c = projectScenario({ levers, overrides: { 'fisc.eps': 0 } })
    expect(c.total[10].primaryBalance).not.toBeCloseTo(a.total[10].primaryBalance, 3)
  })

  it('le moteur et decomposeAtYear concordent à 1e-6 sur des scénarios aléatoires (ε et ε_offre tirés au hasard)', () => {
    const rng = mulberry32(20261118)
    for (let i = 0; i < 80; i++) {
      const levers = Object.fromEntries(LEVERS.filter(() => rng() < 0.5).map((l) => [l.id, uniform(rng, l.min, l.max)]))
      const overrides = { 'fisc.eps': uniform(rng, 0.3, 0.9), 'fisc.eps_offre': uniform(rng, 0.3, 0.6) }
      const horizon = Object.keys(HORIZONS)[i % 3]
      const ysCase = ['bas', 'central', 'haut'][i % 3]
      const P = resolveParams(overrides)
      const r = projectScenario({ levers, overrides, horizon, ysCase })
      const ref = projectScenario({ levers: {}, overrides, horizon, ysCase })
      const t = 1 + Math.floor(rng() * (r.years.length - 1))
      const d = decomposeAtYear(r, ref, t, P['fisc.eps'], P['fisc.eps_offre'])
      expect(Math.abs(d.lines.reduce((s, l) => s + l.montant, 0) - d.ecart), `cas ${i}`).toBeLessThan(1e-6)
      const demande = d.lines.find((l) => l.kind === 'demande').montant
      expect(demande).toBeCloseTo(P['fisc.eps'] * r.total[t].yD * r.total[t].gdpBase, 6)
      for (const l of d.lines.filter((x) => x.kind === 'offre')) {
        const src = r.supply.lignes.find((s) => s.id === l.leverId)
        expect(l.montant).toBeCloseTo(P['fisc.eps_offre'] * src.yS[t] * r.total[t].gdpBase, 6)
      }
    }
  })
})

describe('fmt : abréviation des très grandes valeurs', () => {
  it('inchangé sous 10 000 ; « k » de 10 000 à 1 million ; notation en e au-delà ; 12 caractères au plus', () => {
    expect(FMT_COMPACT_FROM).toBe(1e4)
    expect(fmt(9999.94, 1)).toBe('9 999,9')
    expect(fmt(12345, 1)).toBe('12,3 k')
    expect(fmt(-12345, 1)).toBe('-12,3 k')
    expect(fmt(12345, 1, { signed: true })).toBe('+12,3 k')
    expect(fmt(2.5e6, 1)).toBe('2,50e6')
    expect(fmt(-796410640701.652, 3)).toBe('-7,96e11')
    expect(fmt(1e308, 0).length).toBeLessThanOrEqual(12)
    for (const v of [0, 1e4 - 0.01, 1e4, 999999, 1e6, 1e12, 1.7976931348623157e308, -1.7976931348623157e308]) {
      for (const dec of [0, 1, 2, 3]) for (const signed of [false, true]) expect(fmt(v, dec, { signed }).length).toBeLessThanOrEqual(12)
    }
    expect(fmt(NaN)).toBe('—')
  })
})

describe('σ de la CSG et offre.csg.tmi_salarie', () => {
  const P = resolveParams()
  const sigmaLitteral = (e) => {
    const dln = (P['offre.ir_csg.part_actifs'] * 0.01 * 0.9825 * (6.8 / 9.2 * (1 - 0.30) + (1 - 6.8 / 9.2))) / P['comp.coin.part_nette']
    return -100 * e * dln
  }
  it('à tmi_salarie = 30 % et part_actifs = 74 % (D-P3), σ_CSG suit la formule littérale (centre −0,40, bas −0,20, haut −0,55 % du PIB par point)', () => {
    expect(P['offre.csg.tmi_salarie']).toBe(30)
    expect(P['offre.ir_csg.part_actifs']).toBe(0.74)
    const s = sigmaFiscal('csg', P)
    expect(s.value).toBeCloseTo(sigmaLitteral(0.40), 9)
    expect(s.low).toBeCloseTo(sigmaLitteral(0.20), 9)
    expect(s.high).toBeCloseTo(sigmaLitteral(0.55), 9)
    expect(s.value).toBeCloseTo(-0.40, 2)
  })
  it('σ_CSG lit le paramètre : un taux marginal plus élevé réduit |σ| (la part déductible coûte moins)', () => {
    const hi = sigmaFiscal('csg', resolveParams({ 'offre.csg.tmi_salarie': 41 }))
    expect(Math.abs(hi.value)).toBeLessThan(Math.abs(sigmaFiscal('csg', P).value))
  })
})
