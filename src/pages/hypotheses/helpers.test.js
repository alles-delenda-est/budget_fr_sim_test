import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { PARAMS, resolveParams } from '../../engine/params.js'
import { LEVERS } from '../../engine/levers.js'
import { isFlagged } from '../budget/helpers.js'
import {
  buildApu2025Accounts,
  buildCofogRows,
  EQUATIONS,
  buildLeverCatalog,
  lvtSupplyInfo,
  formatParamValue,
  groupParams,
  paramStatusCounts,
  REVIEWER_QUESTIONS,
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

  it('couvre exactement E1 à E12 et les 3 questions aux relecteurs', () => {
    expect(EQUATIONS.map((e) => e.id)).toEqual([
      'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12',
    ])
    expect(REVIEWER_QUESTIONS.length).toBe(3)
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
    expect(byId.age_legal.supply.central).toBeCloseTo(0.30, 6)
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
