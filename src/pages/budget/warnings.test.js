import { describe, it, expect } from 'vitest'
import { WARNING_THRESHOLDS as W } from '../../config.js'
import { projectScenario } from '../../engine/project.js'
import { LEVERS } from '../../engine/levers.js'
import { fmt } from './helpers.js'
import { evaluateWarnings, interestShareOfRevenue, tier1Text, tier2Text, TIER2_EXPLANATION, splitSeriesAtYear, visibleDomain } from './warnings.js'

/** Trajectoire synthétique : une ligne par année avec dette (en fraction du PIB), intérêts et recettes en Md€. */
const row = (year, debtPct, { interest = 100, revenue = 1000, interestPct = 5, balancePct = -5 } = {}) =>
  ({ year, debtRatio: debtPct / 100, interest, revenue, interestRatio: interestPct / 100, balanceRatio: balancePct / 100 })
const path = (debts, extra) => ({ total: debts.map((d, i) => row(2026 + i, d, typeof extra === 'function' ? extra(i) : extra)) })

describe('config', () => {
  it('seuils : 260 / 500 / 50 / 500 et repère du Japon 258 % en 2020', () => {
    expect(W.tier1DebtPct).toBe(260)
    expect(W.tier2DebtPct).toBe(500)
    expect(W.tier2InterestShareRevenuePct).toBe(50)
    expect(W.tier2GdpFigurePct).toBe(500)
    expect([W.tier1ReferencePct, W.tier1ReferenceYear]).toEqual([258, 2020])
  })
})

describe('evaluateWarnings', () => {
  it('aucun palier sous 260 %', () => {
    expect(evaluateWarnings(path([120, 150, 260]))).toEqual({ tier1: null, tier2: null })
  })
  it('palier 1 : première année strictement au-dessus de 260 %', () => {
    const w = evaluateWarnings(path([120, 259.9, 260.1, 300, 261]))
    expect(w.tier1).toMatchObject({ year: 2028, t: 2 })
    expect(w.tier1.debtPct).toBeCloseTo(260.1, 9)
    expect(w.tier2).toBeNull()
  })
  it('palier 2 par la dette : première année strictement au-dessus de 500 %', () => {
    const w = evaluateWarnings(path([200, 300, 500, 500.1, 900]))
    expect(w.tier1.year).toBe(2027)
    expect(w.tier2).toMatchObject({ year: 2029, reasons: ['dette'] })
  })
  it('palier 2 par les intérêts : plus de 50 % des recettes, même si la dette est modeste', () => {
    const w = evaluateWarnings(path([100, 110, 120], (i) => ({ interest: i === 2 ? 501 : 500, revenue: 1000 })))
    expect(w.tier2).toMatchObject({ year: 2028, reasons: ['intérêts'] })
    expect(w.tier2.interestSharePct).toBeCloseTo(50.1, 9)
    expect(w.tier1).toBeNull()
  })
  it('règle générale : une grandeur en % du PIB au-dessus de 500 % déclenche le palier 2 (intérêts, solde en valeur absolue)', () => {
    expect(evaluateWarnings(path([100, 100], (i) => ({ interestPct: i ? 500.5 : 5, interest: 1 }))).tier2).toMatchObject({ year: 2027, reasons: ['grandeur en % du PIB'] })
    expect(evaluateWarnings(path([100, 100], (i) => ({ balancePct: i ? -501 : -5, interest: 1 }))).tier2?.year).toBe(2027)
    expect(evaluateWarnings(path([100, 100], { balancePct: 500, interest: 1 })).tier2).toBeNull()
  })
  it('valeurs non finies : pas de palier faux (NaN), recettes absentes ignorées pour les intérêts', () => {
    expect(evaluateWarnings({ total: [{ year: 2026, debtRatio: NaN, interest: NaN, revenue: NaN, interestRatio: NaN, balanceRatio: NaN }] })).toEqual({ tier1: null, tier2: null })
    expect(interestShareOfRevenue({ interest: 10, revenue: 0 })).toBeNull()
    expect(interestShareOfRevenue({ interest: 10, revenue: 40 })).toBe(25)
  })
})

describe('textes', () => {
  it('palier 1 : phrase demandée, limitée aux économies avancées, avec la première année', () => {
    const t = tier1Text({ year: 2041, debtPct: 261.7 })
    expect(t).toContain('Au-delà du plus haut niveau jamais atteint par une économie avancée (Japon : 258 % du PIB en 2020, FMI).')
    expect(t).toContain('2041')
    expect(t).not.toMatch(/aucun pays/i)
  })
  it('palier 2 : X vient du moteur ; « plus que l\'ensemble des recettes » seulement si X ≥ 100 %', () => {
    const a = tier2Text({ year: 2044, debtPct: 521, interestSharePct: 53.3 })
    expect(a).toContain('en 2044, les intérêts absorberaient 53 % des recettes publiques')
    expect(a).toContain('un défaut, une forte inflation ou une restructuration de la dette interviendraient')
    expect(a).not.toMatch(/totalité/)
    expect(tier2Text({ year: 2047, debtPct: 755, interestSharePct: 102 })).toBe('Trajectoire hors de toute expérience historique : en 2047, les intérêts dépasseraient la totalité des recettes publiques (102 %). Bien avant ce point, un défaut, une forte inflation ou une restructuration de la dette interviendraient ; le modèle ne décrit plus une situation réaliste.')
    expect(tier2Text({ year: 2047, debtPct: 755, interestSharePct: 99.6 })).toContain('absorberaient 100 %')
    expect(tier2Text({ year: 2047, debtPct: 755, interestSharePct: 99.6 })).not.toMatch(/dépasseraient/)
    expect(TIER2_EXPLANATION).toContain('3 points de base par point de dette')
    expect(TIER2_EXPLANATION).toContain('plafonnée à 25 %')
    expect(tier2Text({ year: 2047, debtPct: 755, interestSharePct: null })).not.toMatch(/absorberaient/)
  })
})

describe('séries de graphique', () => {
  const data = [{ year: 2026, debt: 1, debtRef: 1 }, { year: 2027, debt: 2, debtRef: 1 }, { year: 2028, debt: 3000, debtRef: 1 }, { year: 2029, debt: 4000, debtRef: 1 }]
  it('trait raccordé à l\'année du palier 2 ; valeurs conservées dans debtBeyond ; référence intacte', () => {
    const s = splitSeriesAtYear(data, 2027)
    expect(s.map((r) => r.debt)).toEqual([1, 2, null, null])
    expect(s.map((r) => r.debtBeyond)).toEqual([undefined, 2, 3000, 4000])
    expect(s.map((r) => r.debtRef)).toEqual([1, 1, 1, 1])
    expect(data[2].debt).toBe(3000) // entrée non modifiée
    expect(splitSeriesAtYear(data, null)).toBe(data)
  })
  it('axe vertical : ignore la partie au-delà du palier 2', () => {
    const [lo, hi] = visibleDomain(data, 'debt', 'debtRef', 2027)
    expect(lo).toBeLessThanOrEqual(1)
    expect(hi).toBeLessThan(10)
    expect(visibleDomain(data, 'debt', 'debtRef', undefined)).toBeNull()
  })
})

describe('moteur : recettes et paliers de bout en bout', () => {
  it('recettes 2026 de référence ≈ part de recettes APU de 2025 × PIB ; intérêts / recettes ≈ 5 % en 2026', () => {
    const r = projectScenario({})
    expect(r.total[0].revenue).toBeCloseTo((1561.7 / 2991) * r.total[0].gdp, 6)
    expect(interestShareOfRevenue(r.total[0])).toBeGreaterThan(4)
    expect(interestShareOfRevenue(r.total[0])).toBeLessThan(6)
  })
  it('un levier de recette augmente les recettes de son effet ex post ; une dépense ne les touche pas', () => {
    const ref = projectScenario({}).total[3].revenue
    const tva = projectScenario({ levers: { tva_normal: 2 } }).total[3]
    expect(tva.revenue - ref).toBeGreaterThan(10) // 2 pts ≈ 15 Md€ moins la baisse du PIB
    const dep = projectScenario({ levers: { dep_defense: 10 } }).total[3]
    const gdpEffect = (dep.gdp - projectScenario({}).total[3].gdp) * (1561.7 / 2991)
    expect(dep.revenue - ref).toBeCloseTo(gdpEffect, 6)
  })
  it('référence 10 ans : aucun avertissement ; scénario extrême 30 ans : palier 1 puis palier 2 ; la dette en 2056 reste dans le résultat', () => {
    expect(evaluateWarnings(projectScenario({ horizon: 'dixAns' }))).toEqual({ tier1: null, tier2: null })
    const worst = Object.fromEntries(LEVERS.map((l) => [l.id, l.type === 'recette' ? l.min : l.max]))
    const r = projectScenario({ horizon: 'trenteAns', levers: worst })
    const w = evaluateWarnings(r)
    expect(w.tier1.year).toBeLessThan(w.tier2.year)
    expect(w.tier2.year).toBeLessThan(2056)
    expect(r.total.at(-1).debtRatio * 100).toBeGreaterThan(1000)
    for (const row2 of r.total) expect(Number.isFinite(row2.revenue)).toBe(true)
  })
  it('30 ans, dette > 500 % : X calculé par le moteur et formulation adaptée à X', () => {
    const worst = Object.fromEntries(LEVERS.map((l) => [l.id, l.type === 'recette' ? l.min : l.max]))
    const r = projectScenario({ horizon: 'trenteAns', levers: worst })
    const w = evaluateWarnings(r)
    const row2 = r.total[w.tier2.t]
    expect(w.tier2.interestSharePct).toBeCloseTo((100 * row2.interest) / row2.revenue, 9)
    const x = w.tier2.interestSharePct
    const texte = tier2Text(w.tier2)
    if (x >= 100) expect(texte).toContain(`les intérêts dépasseraient la totalité des recettes publiques (${fmt(x, 0)} %)`)
    else expect(texte).toContain(`les intérêts absorberaient ${fmt(x, 0)} % des recettes publiques`)
    // dette au-dessus de 500 % sur l'horizon : le palier 2 est atteint au plus tard l'année où elle franchit 500 %
    const an500 = r.total.find((q) => q.debtRatio > 5)
    expect(an500).toBeDefined()
    expect(w.tier2.year).toBeLessThanOrEqual(an500.year)
    expect(texte).toContain(`en ${w.tier2.year},`)
  })
})
