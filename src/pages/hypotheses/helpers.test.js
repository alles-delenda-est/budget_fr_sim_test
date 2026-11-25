import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { PARAMS, PARAM_BY_ID, resolveParams } from '../../engine/params.js'
import { projectScenario, RATE_MAX } from '../../engine/project.js'
import { sigmaFiscalCase } from '../../engine/supply.js'
import { LEVERS } from '../../engine/levers.js'
import { isFlagged, fmt } from '../budget/helpers.js'
import {
  buildApu2025Accounts,
  buildCofogRows,
  buildEquations,
  buildLeverCatalog,
  lvtSupplyInfo,
  formatParamValue,
  groupParams,
  paramStatusCounts,
  buildReviewerQuestions,
  irPrimaryGap30,
  irBreakEvenEL,
  macroGrowthSourceLabel,
} from './helpers.js'

const P = resolveParams()

describe('Hypothèses : comptes 2025, COFOG et équations', () => {
  it('reconstitue les 3 blocs APU 2025 et les transferts inter-blocs de 105,6 Md€', () => {
    const apu = buildApu2025Accounts(P)
    expect(apu.rows.map((r) => r.id)).toEqual(['centrales', 'locales', 'secu', 'apu'])
    expect(apu.interBlockTransfers).toBeCloseTo(105.6, 1)
    apu.rows.forEach((r) => {
      expect(Number.isFinite(r.depenses)).toBe(true)
      expect(Number.isFinite(r.recettes)).toBe(true)
      expect(Number.isFinite(r.solde)).toBe(true)
      expect(Number.isFinite(r.soldeRatio)).toBe(true)
    })
  })

  it('liste les 10 fonctions COFOG 2024 triées par montant décroissant', () => {
    const cofog = buildCofogRows(P)
    expect(cofog.length).toBe(10)
    expect(cofog[0].id).toBe('base.cofog.protection_sociale')
    for (let i = 1; i < cofog.length; i++) {
      expect(cofog[i - 1].value).toBeGreaterThanOrEqual(cofog[i].value)
    }
  })

  it('couvre exactement E1 à E12 (valeurs dérivées de P) et les 4 questions aux relecteurs', () => {
    const eqs = buildEquations(P)
    expect(eqs.map((e) => e.id)).toEqual([
      'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12',
    ])
    eqs.forEach((e) => expect(e.detail).not.toMatch(/NaN|undefined/))
    const alt = buildEquations(resolveParams({ 'dette.beta': 5, 'dem.lambda': 0.8 }))
    expect(alt.find((e) => e.id === 'E9').detail).toContain('β = 5 pb/pt')
    expect(alt.find((e) => e.id === 'E4').detail).toContain('λ = 0,8')
    const qs = buildReviewerQuestions()
    expect(qs.length).toBe(4)
    qs.forEach((q) => expect(`${q.titre} ${q.resume}`).not.toMatch(/NaN|undefined/))
    expect(qs[3].resume).toContain('≈ 0,23') // ETI uniforme équivalente à θ_IR (0,35 / 1,496)
    expect(qs[3].resume).toContain('θ_réel ≈ 0,60')
    expect(eqs.find((e) => e.id === 'E9').formule).toContain(`${fmt(RATE_MAX * 100, 0)} %)`)
    expect(eqs.find((e) => e.id === 'E1').detail).toContain(macroGrowthSourceLabel())
  })
})

describe('Hypothèses : questions aux relecteurs construites depuis PARAMS et le moteur', () => {
  const [q1, q2, q3] = buildReviewerQuestions()
  const q = (id) => PARAM_BY_ID[id]
  const pctTxt = (v) => `${fmt(v * 100, 1)} %`

  it('question 1 : e_L, taux marginal de l\'IR, σ calculé, ε_offre et seuil de rentabilité', () => {
    const eL = q('offre.e_L')
    const tau = q('comp.tau0.ir')
    expect(q1.resume).toContain(`e_L = ${fmt(eL.value, 2)}`)
    expect(q1.resume).toContain(`${fmt(tau.value, 0)} % (fourchette ${fmt(tau.low, 0)}–${fmt(tau.high, 0)} %)`)
    expect(q1.resume).toContain('tranche par tranche')
    expect(q1.resume).toContain('taux marginal moyen implicite 20,6 %')
    const sigma = sigmaFiscalCase('ir', P, 'value')
    expect(q1.resume).toContain(`σ = ${fmt(sigma, 3).replace('-', '−')} % du PIB`)
    expect(q1.resume).toContain(`ε_offre = ${pctTxt(q('fisc.eps_offre').value)}`)
    expect(q1.resume).toContain(`(e_L = ${fmt(eL.low, 2)})`)
    expect(q1.resume).toContain(`au haut (${fmt(eL.high, 2)})`)
    const be = irBreakEvenEL()
    expect(Math.abs(irPrimaryGap30(be))).toBeLessThan(1e-3)
    expect(q1.resume).toContain(`e_L ≈ ${fmt(be, 2)}`)
    // θ_réel de l'IR cohérent avec θ (25 nov. 2026) : seuil de rentabilité dans (0,20 ; 0,30), sous e_L central (la hausse coûte au centre)
    expect(be).toBeGreaterThan(0.20)
    expect(be).toBeLessThan(0.30)
    expect(be).toBeCloseTo(0.251, 2)
    expect(irPrimaryGap30(q('offre.e_L').value)).toBeLessThan(0)
    expect(irPrimaryGap30(q('offre.e_L').low)).toBeGreaterThan(0)
    expect(q1.resume).toContain('dépasse')
  })

  it('question 2 : ε_offre (central et haut) et ε lus dans PARAMS', () => {
    const e = q('fisc.eps_offre')
    expect(q2.titre).toContain(`ε_offre = ${pctTxt(e.value)}`)
    expect(q2.resume).toContain(`haut ${pctTxt(e.high)}`)
    expect(q2.resume).toContain(`ε = ${fmt(q('fisc.eps').value, 1)}`)
  })

  it('question 3 : β et dette à 30 ans recalculée par le moteur pour β bas / central / haut / 0', () => {
    const b = q('dette.beta')
    expect(q3.titre).toContain(`β = ${fmt(b.value, 0)} pb/pt (fourchette ${fmt(b.low, 0)}–${fmt(b.high, 0)})`)
    for (const beta of [b.low, b.value, b.high, 0]) {
      const r = projectScenario({ horizon: 'trenteAns', overrides: { 'dette.beta': beta } })
      const d = r.total[r.total.length - 1].debtRatio * 100
      expect(q3.resume).toContain(`${fmt(d, 0)} % à β = ${fmt(beta, 0)}`)
    }
    expect(q3.statut).toContain(b.status)
  })

  it('aucun NaN ni « undefined » dans les textes', () => {
    for (const x of [q1, q2, q3]) expect(`${x.titre} ${x.resume} ${x.statut}`).not.toMatch(/NaN|undefined|= —|— %/)
  })
})

describe('Hypothèses : catalogue des leviers et σ', () => {
  it('couvre 100 % des leviers actifs et distingue σ calculé et σ décidé', () => {
    const catalog = buildLeverCatalog(P)
    expect(catalog.length).toBe(LEVERS.length)
    const byId = Object.fromEntries(catalog.map((c) => [c.id, c]))
    expect(byId.tva_normal.supply.mode).toBe('calculé')
    expect(byId.ir.supply.mode).toBe('calculé')
    expect(byId.ir.supply.statut).toBe('non validé')
    expect(byId.is.supply.mode).toBe('calculé')
    expect(byId.age_legal.supply.mode).toBe('décidé')
    expect(byId.age_legal.supply.central).toBeCloseTo(0.50, 6)
    expect(byId.age_legal.unitYield).toBeCloseTo(4.95, 6)
    expect(byId.age_legal.unitYieldDown).toBeCloseTo(-3.90, 6)
    expect(byId.age_legal.rampText).toContain('2028')
    expect(byId.age_legal.rampText).toContain('2029')
    expect(byId.travail_assurance_chomage.supply.mode).toBe('décidé')
    expect(byId.dep_enseignement.supply.mode).toBe('décidé')
    expect(byId.dep_defense.supply).toBeNull()

    const lvt = lvtSupplyInfo(P)
    expect(lvt.central).toBeCloseTo(0.20, 6)
  })
})

describe('Hypothèses : regroupement complet et filtrage des paramètres (PARAMS)', () => {
  it('assigne 100 % de PARAMS à exactement un groupe sans omission ni doublon', () => {
    const groups = groupParams(PARAMS)
    const ids = groups.flatMap((g) => g.items.map((q) => q.id))
    expect(ids.length).toBe(PARAMS.length)
    expect(new Set(ids).size).toBe(PARAMS.length)
    expect(groups.some((g) => g.id === 'autres')).toBe(false)
  })

  it('filtre correctement les statuts à vérifier (FLAGGED_STATUSES)', () => {
    const counts = paramStatusCounts(PARAMS)
    expect(counts.total).toBe(PARAMS.length)
    expect(counts.flagged).toBeGreaterThan(0)
    expect(counts.sourced + counts.flagged).toBe(counts.total)

    const flaggedGroups = groupParams(PARAMS, { flaggedOnly: true })
    const flaggedItems = flaggedGroups.flatMap((g) => g.items)
    expect(flaggedItems.length).toBe(counts.flagged)
    flaggedItems.forEach((q) => expect(isFlagged(q.status)).toBe(true))
  })

  it('formate chaque paramètre (nombre ou série COR) sans jamais produire NaN ni chaîne vide', () => {
    for (const q of PARAMS) {
      const formatted = formatParamValue(q)
      expect(formatted).toBeTruthy()
      expect(formatted).not.toMatch(/NaN|Infinity|undefined/)
    }
  })
})

describe('Audit d\'isolation v2 : aucun import v1.8 dans les pages UI', () => {
  const UI_FILES = [
    '../../App.jsx',
    '../IntroPage.jsx',
    '../HypothesesPage.jsx',
    '../SimulateurRetraitesPage.jsx',
    '../SimulateurBudgetPage.jsx',
  ]
  const LEGACY_RE = /(projection-engine-v1\.8|policy-impact|data\/assumptions)/

  for (const rel of UI_FILES) {
    it(`${rel} n'importe aucun fichier v1.8`, () => {
      const src = readFileSync(new URL(rel, import.meta.url), 'utf8')
      expect(src).not.toMatch(LEGACY_RE)
    })
  }
})
