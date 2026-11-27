import { describe, it, expect } from 'vitest'
import { projectScenario, HORIZONS, START_YEAR } from '../../engine/project.js'
import { resolveParams, PARAM_BY_ID } from '../../engine/params.js'
import { LVT_MODULE } from '../../engine/lvt-module.js'
import { NEUTRAL_SCENARIOS } from './presets.js'
import { decomposeAtYear } from './helpers.js'
import { STRESS_TESTS, STRESS_TEST_BY_ID, resolveStressConfig } from './stressTests.js'

const P = resolveParams()
const EPS = P['fisc.eps']
const EPS_OFFRE = P['fisc.eps_offre']

describe('stress-tests macroéconomiques (Item 6)', () => {
  it('catalogue gelé, IDs uniques, formulation neutre, paramètres tous valides dans PARAM_BY_ID', () => {
    expect(Object.isFrozen(STRESS_TESTS)).toBe(true)
    expect(Object.isFrozen(STRESS_TEST_BY_ID)).toBe(true)
    expect(STRESS_TESTS).toHaveLength(4)
    const ids = STRESS_TESTS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of STRESS_TESTS) {
      expect(s.titre).not.toMatch(/LFI|RN|NFP|Macron|Barnier|Bayrou|Attal/i)
      for (const pid of s.paramIds) expect(PARAM_BY_ID[pid]).toBeDefined()
      const cfg = resolveStressConfig(s.id, 10, P)
      expect(cfg).not.toBeNull()
      for (const oid of Object.keys(cfg.overrides)) expect(PARAM_BY_ID[oid]).toBeDefined()
    }
    expect(resolveStressConfig(null, 10, P)).toBeNull()
    expect(resolveStressConfig('__proto__', 10, P)).toBeNull()
    expect(resolveStressConfig('constructor', 10, P)).toBeNull()
  })

  it('zéro NaN/Infinity et identité exacte de decomposeAtYear (< 1e-6) sur 216 combinaisons (3 horizons × 3 cas × 6 scénarios × 4 chocs)', () => {
    for (const horizon of Object.keys(HORIZONS)) {
      const N = HORIZONS[horizon].endYear - START_YEAR
      for (const ysCase of ['bas', 'central', 'haut']) {
        for (const sc of NEUTRAL_SCENARIOS) {
          for (const st of STRESS_TESTS) {
            const cfg = resolveStressConfig(st.id, N, P)
            const regime = cfg.demandRegime ?? 'normal'
            const ref = projectScenario({
              levers: {}, overrides: cfg.overrides, horizon, ysCase, demandRegime: regime, yDExog: cfg.yDExog,
            })
            const res = projectScenario({
              levers: sc.levers, overrides: cfg.overrides, horizon, ysCase, demandRegime: regime, yDExog: cfg.yDExog,
            })
            for (let t = 0; t <= N; t++) {
              expect(Number.isFinite(res.total[t].debtRatio)).toBe(true)
              expect(Number.isFinite(res.total[t].balanceRatio)).toBe(true)
              expect(Number.isFinite(res.total[t].unemployment)).toBe(true)
              const dec = decomposeAtYear(res, ref, t, EPS, EPS_OFFRE)
              const sumLines = dec.lines.reduce((acc, l) => acc + l.montant, 0)
              expect(Math.abs(sumLines - dec.ecart)).toBeLessThan(1e-6)
            }
          }
        }
      }
    }
  })

  it('préserve l\'exactitude algébrique (< 1e-6 Md€) avec LVT_MODULE et inflation endogène actifs sous choc', () => {
    for (const st of STRESS_TESTS) {
      const cfg = resolveStressConfig(st.id, 10, P)
      const regime = cfg.demandRegime ?? 'normal'
      const ref = projectScenario({
        levers: {}, overrides: cfg.overrides, horizon: 'dixAns', ysCase: 'haut',
        demandRegime: regime, endogenousInflation: true, yDExog: cfg.yDExog,
      })
      const res = projectScenario({
        levers: { tva_normal: 2, dep_affaires_eco: -5 }, overrides: cfg.overrides,
        horizon: 'dixAns', ysCase: 'haut', modules: [{ module: LVT_MODULE, levers: { scenario: 4, offre_ocde: 1 } }],
        demandRegime: regime, endogenousInflation: true, yDExog: cfg.yDExog,
      })
      for (let t = 0; t < res.total.length; t++) {
        const dec = decomposeAtYear(res, ref, t, EPS, EPS_OFFRE)
        const sumLines = dec.lines.reduce((acc, l) => acc + l.montant, 0)
        expect(Math.abs(sumLines - dec.ecart)).toBeLessThan(1e-6)
      }
    }
  })

  it('vérifie le sens économique des 4 chocs (dette 2036 en hausse, i* +1 pt, récession 2027 avec Okun et stabilisateurs)', () => {
    const centralRef = projectScenario({ levers: {}, horizon: 'dixAns' })
    for (const st of STRESS_TESTS) {
      const cfg = resolveStressConfig(st.id, 10, P)
      const refShock = projectScenario({
        levers: {}, overrides: cfg.overrides, horizon: 'dixAns',
        demandRegime: cfg.demandRegime ?? 'normal', yDExog: cfg.yDExog,
      })
      expect(refShock.total[10].debtRatio).toBeGreaterThan(centralRef.total[10].debtRatio)
    }

    // taux_100pb : taux à l'émission des leviers (+1,00 pt exact)
    const rTaux = projectScenario({ levers: {}, overrides: resolveStressConfig('taux_100pb', 10, P).overrides, horizon: 'dixAns' })
    expect(rTaux.total[10].interest).toBeGreaterThan(centralRef.total[10].interest + 70)

    // recession_2027 : hausse du chômage 2027 et dégradation du solde 2027 (stabilisateurs automatiques actifs)
    const cfgRec = resolveStressConfig('recession_2027', 10, P)
    const rRec = projectScenario({
      levers: {}, overrides: cfgRec.overrides, horizon: 'dixAns',
      demandRegime: cfgRec.demandRegime, yDExog: cfgRec.yDExog,
    })
    expect(rRec.total[1].unemployment).toBeGreaterThan(centralRef.total[1].unemployment + 0.4)
    expect(rRec.total[1].balanceRatio).toBeLessThan(centralRef.total[1].balanceRatio - 0.005)
  })
})
