import { describe, it, expect } from 'vitest'
import { projectScenario, HORIZONS } from '../../engine/project.js'
import { resolveParams, PARAM_BY_ID } from '../../engine/params.js'
import { LEVERS } from '../../engine/levers.js'
import { LVT_MODULE } from '../../engine/lvt-module.js'
import { LVT_SCENARIO_BY_CODE, LVT_BASE_FONCIERE } from '../../engine/lvt-snapshot.js'
import { NDC_MODULE } from '../../engine/ndc-module.js'
import { NEUTRAL_SCENARIOS } from './presets.js'
import { extremeLevers } from './helpers.js'
import { PAYER_GROUPS, EFFORT_PILLARS, payerSharesForInstrument, computeIncidenceAtYear } from './incidence.js'

const P = resolveParams()

describe('incidence statutaire et grandes masses (« Qui paie ? », Stage A)', () => {
  it('les clés d\'allocation somment exactement à 1,0 pour chaque levier et module, et les paramètres sont tous sourcés', () => {
    for (const id of [
      'incid.ir.part_pensions', 'incid.ir.part_patrimoine',
      'incid.csg.part_remplacement', 'incid.csg.part_capital_jeux',
      'demog.menages.2025', 'demog.foyers_fiscaux.2025', 'demog.foyers_imposes_ir.2025',
      'demog.emploi.2025', 'demog.retraites_droit_direct.2023',
    ]) {
      expect(PARAM_BY_ID[id]).toBeTruthy()
    }
    expect(P['offre.ir.part_actifs'] + P['incid.ir.part_pensions'] + P['incid.ir.part_patrimoine']).toBeCloseTo(1, 12)
    expect(P['offre.csg.part_actifs'] + P['incid.csg.part_remplacement'] + P['incid.csg.part_capital_jeux']).toBeCloseTo(1, 12)

    const allIds = [...LEVERS.map((l) => l.id), LVT_MODULE.id, NDC_MODULE.id]
    for (const id of allIds) {
      const sh = payerSharesForInstrument(id, P)
      const sum = PAYER_GROUPS.reduce((s, g) => s + (sh[g.id] ?? 0), 0)
      expect(sum, `somme des parts ${id}`).toBeCloseTo(1, 12)
    }
  })

  it('conservation exacte : Σ piliers === Σ payeurs G1–G5 === Σ byInstrument sur tous les scénarios types, modules et extrêmes', () => {
    const runs = [
      ...NEUTRAL_SCENARIOS.map((sc) => projectScenario({ levers: sc.levers, horizon: 'dixAns' })),
      projectScenario({ levers: extremeLevers('min'), horizon: 'trenteAns', ysCase: 'bas' }),
      projectScenario({ levers: extremeLevers('max'), horizon: 'trenteAns', ysCase: 'haut' }),
      projectScenario({ levers: { age_legal: 1, indexation_pensions: -1 }, modules: [{ module: NDC_MODULE, levers: { actif: 1 } }], horizon: 'trenteAns' }),
      projectScenario({ modules: [{ module: LVT_MODULE, levers: { scenario: 5, offre_ocde: 1 } }], horizon: 'dixAns' }),
    ]
    for (const r of runs) {
      const lvtSc = r.modules.some((m) => m.id === LVT_MODULE.id) ? LVT_SCENARIO_BY_CODE[5] : null
      for (let t = 0; t < r.years.length; t++) {
        const inc = computeIncidenceAtYear(r, t, P, { lvtScenario: lvtSc })
        const sumByInstEA = Object.values(r.total[t].byInstrument ?? {}).reduce((s, v) => s + v.exAnte, 0)
        const sumByInstEP = Object.values(r.total[t].byInstrument ?? {}).reduce((s, v) => s + v.exPost, 0)
        const sumPilEA = inc.pillars.reduce((s, p) => s + p.exAnte, 0)
        const sumPilEP = inc.pillars.reduce((s, p) => s + p.exPost, 0)
        const sumPayEA = inc.payers.reduce((s, p) => s + p.exAnte, 0)
        const sumPayEP = inc.payers.reduce((s, p) => s + p.exPost, 0)
        expect(sumPilEA).toBeCloseTo(sumByInstEA, 9)
        expect(sumPayEA).toBeCloseTo(sumByInstEA, 9)
        expect(sumPilEP).toBeCloseTo(sumByInstEP, 9)
        expect(sumPayEP).toBeCloseTo(sumByInstEP, 9)
        expect(inc.totalExAnte).toBeCloseTo(sumByInstEA, 9)
        expect(inc.totalExPost).toBeCloseTo(sumByInstEP, 9)
        expect(JSON.stringify(inc)).not.toMatch(/NaN|Infinity/)
      }
    }
  })

  it('bascule TVA sociale (paquet mixte) : détecte isMixedSign sans division par un net quasi nul', () => {
    const tvaSoc = NEUTRAL_SCENARIOS.find((s) => s.id === 'tva_sociale')
    const r = projectScenario({ levers: tvaSoc.levers, horizon: 'dixAns' })
    const inc = computeIncidenceAtYear(r, 1, P)
    expect(inc.isMixedSign).toBe(true)
    expect(inc.grossPos).toBeGreaterThan(10)
    expect(inc.grossNeg).toBeLessThan(-10)
    expect(inc.pillars.every((p) => p.sharePct === null)).toBe(true)
    expect(inc.payers.every((g) => g.sharePct === null)).toBe(true)
    expect(inc.payers.find((g) => g.id === 'G3').exAnte).toBeGreaterThan(10) // TVA 100 % consommation
    expect(inc.payers.find((g) => g.id === 'G4').exAnte).toBeLessThan(-10) // baisse cotis employeurs
  })

  it('classe ONDAM en prestations_sante (Vue A1) mais en G5 Services/soins (Vue A2), et expose la bascule LVT', () => {
    const r = projectScenario({ levers: { ondam: -5 }, modules: [{ module: LVT_MODULE, levers: { scenario: 5 } }] })
    const inc = computeIncidenceAtYear(r, 5, P, { lvtScenario: LVT_SCENARIO_BY_CODE[5] })
    const pilPre = inc.pillars.find((p) => p.id === EFFORT_PILLARS[2].id)
    expect(pilPre.santeExAnte).toBeGreaterThan(10)
    expect(inc.payers.find((g) => g.id === 'G5').exAnte).toBeCloseTo(pilPre.santeExAnte, 9)
    expect(inc.payers.find((g) => g.id === 'G2').exAnte).toBe(0)
    expect(inc.lvtShift.companiesSharePct).toBe(LVT_BASE_FONCIERE.companiesSharePct)
    expect(inc.lvtShift.companyShiftMd).toBeCloseTo(4.564, 3)
  })

  it('zéro valeur non finie sur 200 combinaisons aléatoires à graine fixe sur les 3 horizons', () => {
    let seed = 20261127
    const rand = () => {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    const horizons = Object.keys(HORIZONS)
    for (let k = 0; k < 200; k++) {
      const levers = Object.fromEntries(LEVERS.filter(() => rand() < 0.4).map((l) => [l.id, l.min + rand() * (l.max - l.min)]))
      const h = horizons[Math.floor(rand() * horizons.length)]
      const r = projectScenario({ levers, horizon: h })
      const t = Math.floor(rand() * r.years.length)
      const inc = computeIncidenceAtYear(r, t, P)
      const sumPayEA = inc.payers.reduce((s, g) => s + g.exAnte, 0)
      expect(sumPayEA).toBeCloseTo(inc.totalExAnte, 8)
      for (const p of inc.pillars) expect(Number.isFinite(p.exAnte) && Number.isFinite(p.exPost) && Number.isFinite(p.barPct)).toBe(true)
    }
  })
})
