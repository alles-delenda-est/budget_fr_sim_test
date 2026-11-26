import { describe, it, expect } from 'vitest'
import { PARAMS, PARAM_BY_ID, STATUSES, resolveParams } from '../params.js'
import { LEVERS, LEVER_BY_ID, STRUCTURAL_LEVERS, QUALITATIVE_NOTES, staticYield, thetaElasticity, thetaAtRate, leverTheta, BLOCKS } from '../levers.js'
import { projectScenario, HORIZONS, issuanceRate, deepFreeze, effectiveMultiplier, DEMAND_REGIMES, DECOMPOSITION_LABELS } from '../project.js'
import { TEST_MODULE, validateModuleDefinition, runModule } from '../modules.js'
import { NDC_MODULE } from '../ndc-module.js'
import { LVT_MODULE } from '../lvt-module.js'
import { irTranches, irDeltaLnNet, thetaIrTranches, thetaReelIr, facteurCsgDeductible, coinMarginal } from '../ir-tranches.js'
import { deriveBAutres, deriveMPrestations } from '../internal-derivations.js'
import { supplyPhase, sigmaFiscal, sigmaFiscalCase, partReelle, supplyForCase, coutUsageParPoint, impliedJobs, roundJobs, SUPPLY_BY_LEVER } from '../supply.js'

const P = resolveParams()
const Y0 = P['base.pib.2025']
// σ explicitement nul pour tous les leviers fiscaux : isole les tests de trajectoire (excédent, etc.) de l'effet d'offre calculé.
const SANS_OFFRE = Object.fromEntries(['tva_normal', 'tva_tous_taux', 'csg', 'ir', 'is', 'cotis_patronales'].map((id) => [id, { sigma: 0, L: 5 }]))

// Étalons de la note (§3.1). Les lignes IS et cotisations sont des valeurs provisoires : on teste la cohérence avec la table.
const YARDSTICKS = {
  tva_normal: { x: 1, md: 7.5 },
  tva_tous_taux: { x: 1, md: 11.4 },
  csg: { x: 1, md: 17 },
  ir: { x: 1, md: 1.0 },
  is: { x: 1, md: P['rend.is'] },
  cotis_patronales: { x: 1, md: P['rend.cotis'] },
  dep_enseignement: { x: -1, md: 1.49 },
  dep_defense: { x: -1, md: 0.54 },
  dep_ordre_securite: { x: -1, md: 0.52 },
  dep_affaires_eco: { x: -1, md: 1.66 },
  ondam: { x: -1, md: 2.61 },
  indexation_pensions: { x: -1, md: 4.217 },
  travail_assurance_chomage: { x: -1, md: 0.372 },
  age_legal: { x: 1, md: 4.95, t: 8 },
}

describe('paramètres', () => {
  it('chaque paramètre a les champs requis et un statut valide', () => {
    for (const q of PARAMS) {
      for (const k of ['id', 'value', 'low', 'high', 'unit', 'source', 'status', 'explanation']) expect(q).toHaveProperty(k)
      expect(STATUSES).toContain(q.status)
      expect(q.explanation.length).toBeGreaterThan(5)
    }
  })
  it('les valeurs provisoires sont étiquetées comme telles', () => {
    for (const q of PARAMS.filter((x) => x.status === 'à collecter')) expect(q.explanation).toMatch(/provisoire|placeholder/i)
  })
  it('rejette un identifiant inconnu ou une valeur non finie', () => {
    expect(() => resolveParams({ nope: 1 })).toThrow()
    expect(() => resolveParams({ 'dem.lambda': NaN })).toThrow()
  })
})

describe('étalons statiques (§5)', () => {
  for (const [id, { x, md, t = 1 }] of Object.entries(YARDSTICKS)) {
    it(`${id} restitue son étalon à 0,1 Md€ près`, () => {
      const r = projectScenario({ levers: { [id]: x }, overrides: { 'fisc.eps': 0, 'fisc.eps_offre': 0 } })
      const at = BLOCKS.reduce((s, b) => s + r.blocks[b][t].leversExAnte, 0) / r.total[t].gdpBase * Y0
      expect(at).toBeCloseTo(md, 0)
      expect(Math.abs(at - md)).toBeLessThan(0.1)
      expect(staticYield(LEVER_BY_ID[id], x, P) * Math.sign(md)).toBeCloseTo(Math.abs(md), 1)
    })
  }
})

describe('référence', () => {
  it('à leviers nuls, le scénario égale la référence', () => {
    const base = projectScenario({})
    const zero = projectScenario({ levers: Object.fromEntries(LEVERS.map((l) => [l.id, 0])) })
    expect(zero.total).toEqual(base.total)
    for (const row of base.total) { expect(row.gdpEffect).toBe(0); expect(row.gdp).toBe(row.gdpBase) }
  })
  it('2026 reste proche des repères officiels (intérêts, solde)', () => {
    const r = projectScenario({}).total[0]
    expect(r.interest).toBeGreaterThan(75)
    expect(r.interest).toBeLessThan(85)
    expect(r.balanceRatio * 100).toBeCloseTo(-5.4, 0)
  })
})

describe('dérive de référence mesurée depuis 2025', () => {
  it('dA et dB partent de 2025 : les trajectoires santé et « autres dépenses » comptent t + 1 années', () => {
    const r = projectScenario({ overrides: { 'ref.derive.a_sante': 0.1, 'ref.derive.b_autres': 0.05 } })
    expect(r.total[0].driftA).toBeCloseTo(0.001, 10) // (14,1 − 14,1) + 0,1 pt × 1 an depuis 2025
    expect(r.total[0].driftB).toBeCloseTo(0.0005, 10)
    expect(r.total[4].driftA).toBeCloseTo(0.005, 10)
    expect(r.total[4].driftB).toBeCloseTo(0.0025, 10)
  })
  it('le solde de 2026 reste ancré (pas de double compte), et se dégrade ensuite de d(t) − d(0)', () => {
    const base = projectScenario({})
    const r = projectScenario({ overrides: { 'ref.derive.a_sante': 0.1 } })
    expect(r.blocks.securiteSociale[0].referencePrimary).toBeCloseTo(base.blocks.securiteSociale[0].referencePrimary, 8)
    const Yb = base.total[3].gdpBase
    expect(r.blocks.securiteSociale[3].referencePrimary - base.blocks.securiteSociale[3].referencePrimary).toBeCloseTo(-((0.1 - P['ref.derive.a_sante']) / 100) * 3 * Yb, 6) // l'écart de dérive est mesuré par rapport à la valeur centrale (non plus 0)
  })
})

describe('solde primaire de référence : comparateurs seulement', () => {
  it('la référence n\'est pas forcée sur la trajectoire du Gouvernement (−2,1 % en 2027)', () => {
    const r = projectScenario({}).total
    expect(r[1].primaryBalanceRatio * 100).toBeCloseTo(-2.86, 1)
    const gouv = P['cmp.gouv.solde.2027'] + P['cmp.gouv.interets.2027'] // −2,1
    expect(gouv).toBeCloseTo(-2.1, 10)
    expect(r[1].primaryBalanceRatio * 100 - gouv).toBeLessThan(-0.5) // écart rapporté, non comblé
    const ce = P['cmp.ce.solde.2027'] + P['cmp.ce.interets.2027'] // −2,6 (Commission, automne 2026)
    expect(Math.abs(r[1].primaryBalanceRatio * 100 - ce)).toBeLessThan(0.3)
  })
})

describe('multiplicateurs (E4)', () => {
  for (const l of LEVERS) {
    it(`${l.id} : multiplicateur cumulé sur 10 ans < m, égal à m(1−λ^T)/((1−λ)T)`, () => {
      const m = P[`dem.m.${l.categorie}`]
      const lambda = P['dem.lambda']
      // a = 1 % du PIB, injecté via un module qui porte la catégorie d'instrument (les bornes des leviers natifs sont plus étroites)
      const mod = { ...TEST_MODULE, leviers: [{ ...TEST_MODULE.leviers[0], bornes: [-1, 1] }, TEST_MODULE.leviers[1]],
        calculer: (v, c) => ({ annees: Array.from({ length: c.nYears + 1 }, (_, t) => ({ a: { centrales: t >= 1 ? 0.01 : 0, securiteSociale: 0, locales: 0 }, theta: 0, categorie: l.categorie })) }) }
      const r = projectScenario({ modules: [{ module: mod, levers: {} }], overrides: { 'fisc.eps': 0, 'fisc.eps_offre': 0 } })
      const cum = r.total.slice(1, 11).reduce((s, row) => s - row.yD / 0.01, 0) / 10
      expect(cum).toBeLessThan(m)
      expect(cum).toBeCloseTo((m * (1 - lambda ** 10)) / ((1 - lambda) * 10), 6)
      expect(-r.total[1].yD / 0.01).toBeCloseTo(m, 6) // le pic vaut m
    })
  }
  it('exemple de la note : m = 0,8, λ = 0,7, T = 10 donne 0,26', () => {
    expect((0.8 * (1 - 0.7 ** 10)) / (0.3 * 10)).toBeCloseTo(0.26, 2)
  })
})

describe('taux et prime', () => {
  it('un excédent ne déclenche aucune prime', () => {
    const r = projectScenario({
      levers: { tva_tous_taux: 5, csg: 3, ir: 30, is: 10, cotis_patronales: 5, dep_enseignement: -30, dep_affaires_eco: -30 },
      horizon: 'trenteAns', sigma: SANS_OFFRE,
    })
    expect(Math.min(...r.total.map((x) => x.balance))).toBeLessThan(Infinity)
    expect(r.total[r.total.length - 1].balance).toBeGreaterThan(0)
    // E9 est linéaire en dette/PIB : la prime est négative ou nulle dès que le ratio de la veille est sous celui de 2026.
    const ref = r.total[0].debtRatio
    for (let t = 1; t < r.total.length; t++) {
      if (r.total[t - 1].debtRatio <= ref) {
        expect(r.total[t].riskPremium).toBeLessThanOrEqual(1e-12)
        expect(r.total[t].newRate).toBeLessThanOrEqual(issuanceRate(P) + 1e-12)
      }
    }
    const last = r.total[r.total.length - 1]
    expect(last.riskPremium).toBeLessThan(0)
    expect(r.total[0].riskPremium).toBe(0)
  })
})

describe('E9 : pente de la dette et taux à l\'émission pondéré', () => {
  const yRows = (extra) => projectScenario({ horizon: 'trenteAns', ...extra }).total
  it('β = 3 pb par point de dette : +10 points de ratio => +0,30 point de pourcentage sur le taux à l\'émission', () => {
    const r = projectScenario({})
    const ref = r.total[0].debtRatio
    for (let t = 1; t < r.total.length; t++) {
      const points = (r.total[t - 1].debtRatio - ref) * 100
      const rate = r.total[t].newRate - issuanceRate(P)
      expect(rate).toBeCloseTo(points * 0.0003, 10)
    }
    // Magnitude : le ratio de la veille dépasse celui de 2026 de plus de 10 points à un moment, et l'écart de taux vaut alors 0,03 pp par point.
    const row = r.total.find((x, t) => t > 0 && (r.total[t - 1].debtRatio - ref) * 100 >= 10)
    expect(row).toBeDefined()
    const pts = (r.total[row.t - 1].debtRatio - ref) * 100
    expect((row.newRate - issuanceRate(P)) * 100).toBeCloseTo(0.03 * pts, 8) // en points de pourcentage
    // Surcharge de β : 6 pb double la prime
    const d = projectScenario({ overrides: { 'dette.beta': 6 } })
    // (en t = 2 : la prime dépend du ratio de 2027, lui-même indépendant de β car la prime de 2027 est nulle)
    expect(d.total[2].riskPremium).toBeCloseTo(2 * r.total[2].riskPremium, 10)
    expect(r.total[2].riskPremium).not.toBe(0)
  })
  it('+10 points exactement => +0,30 pp (cas contrôlé par yS externe sur le PIB)', () => {
    // Un PIB plus bas de ~8,3 % relève le ratio ; on vérifie la proportionnalité plutôt qu'un niveau exact.
    const lo = projectScenario({ yS: Array(11).fill(-0.05) }).total
    const ref = lo[0].debtRatio
    const t = 3
    const points = (lo[t - 1].debtRatio - ref) * 100
    expect(points).toBeGreaterThan(0)
    expect((lo[t].newRate - issuanceRate(P)) * 100).toBeCloseTo(0.03 * points, 8)
  })
  it('un excédent (ratio en baisse) abaisse le taux sans prime de stress du déficit', () => {
    const rows = yRows({ levers: { tva_tous_taux: 5, csg: 3, ir: 30, is: 10, cotis_patronales: 5, dep_enseignement: -30, dep_affaires_eco: -30 }, sigma: SANS_OFFRE })
    const ref = rows[0].debtRatio
    const t = rows.findIndex((x, i) => i > 0 && rows[i - 1].debtRatio < ref - 0.05 && x.balance > 0)
    expect(t).toBeGreaterThan(0)
    const points = (rows[t - 1].debtRatio - ref) * 100
    expect(points).toBeLessThan(-5)
    expect(rows[t].newRate).toBeLessThan(issuanceRate(P))
    expect(rows[t].newRate - issuanceRate(P)).toBeCloseTo(points * 0.0003, 10)
  })
  it('le taux à l\'émission est la moyenne pondérée BTF / OAT moyens / OAT longs', () => {
    expect(P['dette.part_btf'] + P['dette.part_moyen'] + P['dette.part_long']).toBeCloseTo(1, 10)
    const w = P['dette.part_btf'] * P['dette.y_btf'] + P['dette.part_moyen'] * P['dette.y_moyen'] + P['dette.part_long'] * P['dette.y_long']
    expect(issuanceRate(P) * 100).toBeCloseTo(w, 10)
    expect(issuanceRate(P) * 100).toBeLessThan(P['dette.y_long'])
    expect(issuanceRate(P) * 100).toBeGreaterThan(P['dette.y_btf'])
    expect(projectScenario({}).total[0].newRate).toBeCloseTo(issuanceRate(P), 12) // pas de prime en 2026
  })
  it('la part des BTF et les rendements sont modifiables par surcharge', () => {
    const a = issuanceRate(resolveParams({ 'dette.y_btf': 0.5 }))
    expect(a).toBeLessThan(issuanceRate(P))
  })
})

describe('θ symétrique évalué au taux après réforme (§3.2)', () => {
  it('θ(50 %) = 1,0·e et θ(40 %) = 0,67·e', () => {
    expect(thetaElasticity(0.3, 0.5) / 0.3).toBeCloseTo(1.0, 6)
    expect(thetaElasticity(0.3, 0.4) / 0.3).toBeCloseTo(2 / 3, 6)
  })
  for (const id of ['ir', 'csg', 'tva_normal', 'is', 'cotis_patronales']) {
    it(`${id} : une hausse rapporte moins qu'une baisse égale ne coûte`, () => {
      const lever = LEVER_BY_ID[id]
      const x = Math.min(lever.max, 3)
      const up = (1 - leverTheta(lever, x, P)) * staticYield(lever, x, P)
      const down = (1 - leverTheta(lever, -x, P)) * staticYield(lever, -x, P)
      expect(up).toBeGreaterThan(0)
      expect(down).toBeLessThan(0)
      expect(Math.abs(down)).toBeGreaterThan(up)
      expect(leverTheta(lever, x, P)).toBeGreaterThan(leverTheta(lever, -x, P))
    })
  }
  it('θ = 0 pour une dépense, sauf décalage sur les prestations (0,20 par défaut, surchargeable)', () => {
    expect(leverTheta(LEVER_BY_ID.dep_defense, -5, P)).toBe(0)
    expect(leverTheta(LEVER_BY_ID.indexation_pensions, -1, P)).toBe(0.20)
    expect(leverTheta(LEVER_BY_ID.indexation_pensions, -1, resolveParams({ 'comp.offset.prestations': 0 }))).toBe(0)
    expect(leverTheta(LEVER_BY_ID.indexation_pensions, -1, resolveParams({ 'comp.offset.prestations': 0.25 }))).toBe(0.25)
  })
})

describe('robustesse', () => {
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const finiteDeep = (o) => Object.values(o).every((v) => (typeof v === 'number' ? Number.isFinite(v) : typeof v === 'object' && v ? finiteDeep(v) : true))
  it('aucun NaN ni Infinity sur un balayage aléatoire, pour les trois horizons', () => {
    const rand = rng(42)
    for (const horizon of Object.keys(HORIZONS)) {
      for (let k = 0; k < 120; k++) {
        const levers = Object.fromEntries(LEVERS.map((l) => [l.id, k < 4 ? (k % 2 ? l.max : l.min) : l.min + rand() * (l.max - l.min)]))
        const r = projectScenario({ levers, horizon, modules: [{ module: TEST_MODULE, levers: { taille: rand() * 2 - 1, effet_offre: rand() * 4 - 2 } }] })
        expect(r.total.length).toBe(HORIZONS[horizon].endYear - 2026 + 1)
        expect(finiteDeep(r.total)).toBe(true)
        expect(finiteDeep(r.blocks)).toBe(true)
        expect(finiteDeep(r.decomposition.filter(Boolean))).toBe(true)
      }
    }
  })
  it('entrées non finies : traitées comme zéro', () => {
    const r = projectScenario({ levers: { ir: NaN, tva_normal: undefined, csg: Infinity } })
    expect(r.total.every((x) => Number.isFinite(x.debt))).toBe(true)
  })
})

describe('cohérence par bloc', () => {
  it('les trois blocs somment aux totaux', () => {
    const r = projectScenario({ levers: { tva_normal: 2, dep_enseignement: -10, indexation_pensions: -1, is: -2 }, horizon: 'jusqua2040',
      modules: [{ module: TEST_MODULE, levers: { taille: 0.3 } }] })
    r.total.forEach((row, t) => {
      const sum = (k) => BLOCKS.reduce((s, b) => s + r.blocks[b][t][k], 0)
      expect(sum('primaryBalance')).toBeCloseTo(row.primaryBalance, 8)
      expect(sum('interest')).toBeCloseTo(row.interest, 8)
      expect(sum('balance')).toBeCloseTo(row.balance, 8)
    })
  })
  it('la décomposition somme à la variation du solde', () => {
    const r = projectScenario({ levers: { tva_normal: 2, is: -2, dep_defense: -10 } })
    for (let t = 1; t < r.total.length; t++) {
      const d = r.decomposition[t]
      const s = d.refGrowth + d.refDrift + d.leviers + d.comportement + d.stabilisateurs + d.offre.reduce((a, o) => a + o.montant, 0) + d.interetsTaux + d.interetsStock
      expect(s).toBeCloseTo(d.total, 8)
      expect(d.total).toBeCloseTo(r.total[t].balance - r.total[t - 1].balance, 8)
    }
  })
})

describe('modules', () => {
  it('le module de test est conforme au contrat', () => {
    expect(validateModuleDefinition(TEST_MODULE)).toEqual([])
  })
  it('ses sorties atterrissent dans le bon bloc', () => {
    const o = { 'fisc.eps': 0, 'fisc.eps_offre': 0 }
    const base = projectScenario({ overrides: o })
    const r = projectScenario({ overrides: o, modules: [{ module: TEST_MODULE, levers: { taille: 0.4 } }] })
    const Yb = base.total[1].gdpBase
    const diff = (b) => r.blocks[b][1].primaryBalance - base.blocks[b][1].primaryBalance
    expect(diff('centrales')).toBeCloseTo(0.004 * Yb, 6)
    expect(diff('securiteSociale')).toBeCloseTo(-0.002 * Yb, 6)
    expect(diff('locales')).toBeCloseTo(0, 6)
    expect(r.blocks.centrales[0].primaryBalance).toBeCloseTo(base.blocks.centrales[0].primaryBalance, 6) // rien en 2026
  })
  it('le flux est affiché mais n\'entre pas dans le solde', () => {
    const base = projectScenario({})
    const r = projectScenario({ modules: [{ module: { ...TEST_MODULE, calculer: (v, c) => {
      const o = TEST_MODULE.calculer({ taille: 0, effet_offre: 0 }, c); o.flux = [{ libelle: 'brut', bloc: 'locales', montant: 0.05 }]; return o } }, levers: {} }] })
    expect(r.modules[0].flux).toHaveLength(1)
    const strip = (rows) => rows.map(({ byInstrument, ...rest }) => rest) // eslint-disable-line no-unused-vars
    expect(strip(r.total)).toEqual(strip(base.total))
  })
  it('yS (bas/central/haut) alimente PIB, solde et chômage ; le cas est sélectionnable', () => {
    const base = projectScenario({})
    const run = (ysCase) => projectScenario({ ysCase, modules: [{ module: TEST_MODULE, levers: { effet_offre: 1 } }] })
    expect(run('central').total[3].gdp / base.total[3].gdp - 1).toBeCloseTo(0.01, 8)
    expect(run('bas').total[3].yS).toBeCloseTo(0.005, 8)
    expect(run('haut').total[3].yS).toBeCloseTo(0.02, 8)
    expect(run('central').total[3].unemployment).toBeCloseTo(base.total[3].unemployment - 0.4, 8)
    expect(run('central').total[3].balance).toBeGreaterThan(base.total[3].balance)
  })
  it('chemin yS externe accepté', () => {
    const base = projectScenario({})
    const r = projectScenario({ yS: Array(11).fill(0.02) })
    expect(r.total[5].gdp / base.total[5].gdp - 1).toBeCloseTo(0.02, 8)
  })
  it('un module ne peut pas écrire dans la dette ni dans les intérêts', () => {
    const bad = { ...TEST_MODULE, calculer: (v, c) => ({ ...TEST_MODULE.calculer(v, c), dette: [1] }) }
    expect(() => projectScenario({ modules: [{ module: bad, levers: {} }] })).toThrow(/dette/)
    const bad2 = { ...TEST_MODULE, calculer: (v, c) => { const o = TEST_MODULE.calculer(v, c); o.annees[1].interets = 5; return o } }
    expect(() => projectScenario({ modules: [{ module: bad2, levers: {} }] })).toThrow(/interets/)
  })
  it('le contexte transmis est gelé : un module ne peut pas modifier les paramètres', () => {
    const base = projectScenario({})
    let threw = false
    const evil = { ...TEST_MODULE, calculer: (v, c) => {
      expect(Object.isFrozen(c.params)).toBe(true)
      try { c.params['dette.y_long'] = 0.1 } catch { threw = true }
      try { c.years.push(9999) } catch { threw = threw && true }
      return TEST_MODULE.calculer(v, c)
    } }
    const r = projectScenario({ modules: [{ module: evil, levers: {} }] })
    expect(threw).toBe(true)
    expect(r.total).toEqual(base.total.map((row, i) => ({ ...row, byInstrument: r.total[i].byInstrument })))
    expect(resolveParams()['dette.y_long']).toBe(P['dette.y_long'])
    expect(r.years).toEqual(base.years)
  })
  it('deepFreeze gèle les objets imbriqués', () => {
    const o = deepFreeze({ a: { b: [1, { c: 2 }] } })
    expect(Object.isFrozen(o.a.b[1])).toBe(true)
  })
  it('flux[] est exposé par bloc en affichage seulement', () => {
    const base = projectScenario({})
    const r = projectScenario({ modules: [{ module: TEST_MODULE, levers: { taille: 0.4 } }] })
    expect(r.blocks.locales[0].moduleFlux).toEqual([])
    const f = r.blocks.locales[2].moduleFlux
    expect(f).toHaveLength(1)
    expect(f[0].moduleId).toBe('module_test')
    expect(f[0].montantPibPct).toBeCloseTo(0.004, 10)
    expect(f[0].montant).toBeCloseTo(0.004 * r.total[2].gdp, 6)
    expect(r.blocks.centrales[2].moduleFlux).toEqual([])
    expect(base.blocks.locales[2].moduleFlux).toEqual([])
    // Le flux n'entre pas dans le solde local
    const noFlux = projectScenario({ modules: [{ module: { ...TEST_MODULE, calculer: (v, c) => ({ ...TEST_MODULE.calculer(v, c), flux: [] }) }, levers: { taille: 0.4 } }] })
    expect(r.blocks.locales[2].balance).toBeCloseTo(noFlux.blocks.locales[2].balance, 8)
  })
  it('σ du cœur : nul pour une dépense sans effet d\'offre, calculé pour un levier fiscal, remplaçable par l\'option sigma', () => {
    expect(projectScenario({ levers: { dep_defense: -10 } }).total[5].yS).toBe(0)
    const base = projectScenario({ levers: { is: -2 } })
    expect(base.total[5].yS).toBeGreaterThan(0) // baisse d'IS : le PIB monte
    const r = projectScenario({ levers: { is: -2 }, sigma: { is: { sigma: -1, L: 10 } } })
    expect(r.total[5].yS).not.toBe(base.total[5].yS)
  })
  it('un module non conforme est refusé', () => {
    expect(validateModuleDefinition({ id: 'x' }).length).toBeGreaterThan(0)
  })
})

describe('E5 : forme fonctionnelle de l\'effet d\'offre (σ, σ_hausse / σ_baisse, L, t0)', () => {
  const yS = (r) => r.total.map((x) => x.yS)
  it('σ = 0 : résultat identique à l\'absence d\'effet d\'offre', () => {
    const levers = { tva_normal: 2, is: -2, dep_defense: -10 }
    const base = projectScenario({ levers, overrides: { 'offre.e_L': 0, 'offre.is.eps_k': 0 } }) // σ calculé nul
    const zero = projectScenario({ levers, sigma: { tva_normal: { sigma: 0, L: 5 }, is: { sigma: 0, L: 0, t0: 3 } } })
    expect(zero.total).toEqual(base.total)
    expect(zero.supply.lignes).toEqual([])
  })
  it('σ_hausse et σ_baisse : chaque signe du levier prend sa branche', () => {
    const sigma = { is: { sigmaHausse: 0.5, sigmaBaisse: 0.1, L: 4 } }
    const up = projectScenario({ levers: { is: 2 }, sigma })
    const down = projectScenario({ levers: { is: -2 }, sigma })
    expect(yS(up)[8]).toBeCloseTo((0.5 * 2) / 100, 8)
    expect(yS(down)[8]).toBeCloseTo((0.1 * -2) / 100, 8)
  })
  it('σ seul vaut pour les deux branches', () => {
    const sigma = { is: { sigma: 0.3, L: 4 } }
    expect(yS(projectScenario({ levers: { is: 1 }, sigma }))[8]).toBeCloseTo(0.003, 8)
    expect(yS(projectScenario({ levers: { is: -1 }, sigma }))[8]).toBeCloseTo(-0.003, 8)
  })
  it('t0 retarde l\'effet ; la rampe atteint σ × a à τ = L', () => {
    // mesure en vigueur en 2027 (t = 1) : τ = t − 1
    const r = projectScenario({ levers: { tva_normal: 1 }, sigma: { tva_normal: { sigma: 1, L: 6, t0: 3 } } })
    const y = yS(r)
    expect(y[0]).toBe(0)
    expect(y[1]).toBe(0)
    expect(y[4]).toBe(0) // τ = 3 = t0
    expect(y[5]).toBeCloseTo(0.01 / 3, 8) // τ = 4
    expect(y[6]).toBeCloseTo((0.01 * 2) / 3, 8)
    expect(y[7]).toBeCloseTo(0.01, 8) // τ = 6 = L
    expect(y[10]).toBeCloseTo(0.01, 8) // plateau
    const r0 = projectScenario({ levers: { tva_normal: 1 }, sigma: { tva_normal: { sigma: 1, L: 5 } } })
    expect(yS(r0)[5]).toBeCloseTo(0.01 * 0.8, 8) // τ = 4
    expect(yS(r0)[6]).toBeCloseTo(0.01, 8) // τ = L = 5
  })
  it('supplyPhase : bornes, échelon si L ≤ t0, entrées non finies', () => {
    expect(supplyPhase(-1, 5, 0)).toBe(0)
    expect(supplyPhase(2.5, 5, 0)).toBe(0.5)
    expect(supplyPhase(5, 5, 0)).toBe(1)
    expect(supplyPhase(50, 5, 0)).toBe(1)
    expect(supplyPhase(8, 35, 8)).toBe(0)
    expect(supplyPhase(3, 3, 3)).toBe(1) // L = t0 : échelon en t0
    expect(supplyPhase(2, 3, 3)).toBe(0)
    expect(supplyPhase(4, 2, 3)).toBe(1) // L < t0 : échelon en t0
    expect(supplyPhase(0, 0, 0)).toBe(1)
    expect(supplyPhase(3, 5, -2)).toBeCloseTo(0.6, 10) // t0 négatif ramené à 0
    for (const bad of [NaN, Infinity, -Infinity, undefined]) {
      expect(supplyPhase(bad, 5, 0)).toBe(0)
      expect(supplyPhase(3, bad, 0)).toBe(0)
      expect(supplyPhase(3, 5, bad === undefined ? 0 : bad)).toBe(bad === undefined ? 0.6 : 0)
    }
  })
  it('L ≤ t0 dans le moteur : échelon en t0, sans NaN', () => {
    const r = projectScenario({ levers: { tva_normal: 1 }, sigma: { tva_normal: { sigma: 1, L: 0, t0: 2 } } })
    expect(yS(r).slice(0, 4)).toEqual([0, 0, 0, 0.01])
    expect(r.total.every((x) => Number.isFinite(x.debt) && Number.isFinite(x.unemployment))).toBe(true)
  })
  it('entrées non finies : l\'effet est ignoré', () => {
    const base = projectScenario({ levers: { tva_normal: 1 }, overrides: { 'offre.e_L': 0 } })
    for (const bad of [{ sigma: NaN, L: 5 }, { sigma: 1, L: NaN }, { sigma: 1, L: Infinity }, { sigma: 1, L: 5, t0: NaN }]) {
      const r = projectScenario({ levers: { tva_normal: 1 }, sigma: { tva_normal: bad } })
      expect(r.total.every((x) => Number.isFinite(x.gdp))).toBe(true)
      expect(yS(r).every(Number.isFinite)).toBe(true)
    }
    expect(projectScenario({ levers: { tva_normal: 1 }, sigma: { tva_normal: { sigma: NaN, L: 5 } } }).total).toEqual(base.total)
  })
  it('chaque effet non nul est une ligne distincte, étiquetée, avec son cas ; la décomposition reste exacte', () => {
    const levers = { tva_normal: 2, is: -2 }
    const sigma = { tva_normal: { sigma: -0.1, L: 5 }, is: { sigma: -0.5, L: 7, t0: 1 } }
    for (const ysCase of ['bas', 'central', 'haut']) {
      const r = projectScenario({ levers, sigma, ysCase })
      expect(r.supply.cas).toBe(ysCase)
      expect(r.supply.lignes.map((l) => l.id).sort()).toEqual(['is', 'tva_normal'])
      for (const l of r.supply.lignes) { expect(l.cas).toBe(ysCase); expect(l.libelle.length).toBeGreaterThan(3) }
      for (let t = 1; t < r.total.length; t++) {
        const d = r.decomposition[t]
        expect(d.offre.map((o) => o.id).sort()).toEqual(['is', 'tva_normal'])
        const s = d.refGrowth + d.refDrift + d.leviers + d.comportement + d.stabilisateurs + d.offre.reduce((a, o) => a + o.montant, 0) + d.interetsTaux + d.interetsStock
        expect(s).toBeCloseTo(d.total, 8)
      }
      const sum = (t) => r.supply.lignes.reduce((a, l) => a + l.yS[t], 0)
      expect(sum(8)).toBeCloseTo(r.total[8].yS, 12)
    }
  })
  it('sans effet d\'offre, la décomposition n\'a pas de ligne d\'offre', () => {
    const r = projectScenario({ levers: { dep_defense: -2 } })
    expect(r.decomposition[3].offre).toEqual([])
  })
  it('aucun NaN : tous les leviers au minimum et au maximum, trois cas, deux horizons, σ extrêmes', () => {
    const lo = Object.fromEntries(LEVERS.map((l) => [l.id, l.min]))
    const hi = Object.fromEntries(LEVERS.map((l) => [l.id, l.max]))
    const wild = Object.fromEntries(LEVERS.map((l) => [l.id, { sigmaHausse: 3, sigmaBaisse: -3, L: 1, t0: 40 }]))
    const finiteAll = (o) => JSON.stringify(o, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? '__NF__' : v)).indexOf('__NF__') === -1
    for (const horizon of ['dixAns', 'trenteAns']) for (const ysCase of ['bas', 'central', 'haut']) for (const levers of [lo, hi]) for (const sigma of [undefined, wild]) {
      const r = projectScenario({ levers, horizon, ysCase, sigma })
      expect(finiteAll(r.total)).toBe(true)
      expect(finiteAll(r.decomposition.filter(Boolean))).toBe(true)
      expect(finiteAll(r.supply)).toBe(true)
    }
  })
})

describe('paramètres d\'offre décidés le 17 novembre (offre.sigma.*, offre.lag.*, offre.t0.*)', () => {
  const yS = (r) => r.total.map((x) => x.yS)
  const triple = (id) => [PARAM_BY_ID[id].low, PARAM_BY_ID[id].value, PARAM_BY_ID[id].high]
  it('valeurs bas / central / haut, délais L et t0', () => {
    const edHaut = (0.8 * LEVER_BY_ID.dep_enseignement.rendement(P)) / (P['base.pib.2025'] / 100) // 0,8 % du PIB par point de PIB -> par % de la ligne
    expect(triple('offre.sigma.enseignement')).toEqual([0, 0, edHaut])
    expect(edHaut).toBeCloseTo(0.03985, 4)
    expect([P['offre.lag.enseignement'], P['offre.t0.enseignement']]).toEqual([35, 8])
    expect(P['offre.lag.tva']).toBe(5)
    expect(triple('offre.sigma.age_legal')).toEqual([0.30, 0.50, 0.70]) // décision du 23 nov. 2026 (DG Trésor mars 2026, COR juin 2026 Tableau 2.10)
    expect([P['offre.lag.age_legal'], P['offre.t0.age_legal']]).toEqual([6, 0])
    expect(triple('offre.sigma.lvt')).toEqual([0.10, 0.20, 0.45])
    expect([P['offre.lag.lvt'], P['offre.t0.lvt']]).toEqual([12, 1])
    // une seule source de vérité : plus de σ saisi pour les leviers fiscaux, ils sont calculés
    for (const id of ['tva', 'ir', 'is', 'cotis', 'csg']) expect(PARAM_BY_ID[`offre.sigma.${id}`]).toBeUndefined()
    expect([P['offre.lag.is'], P['offre.t0.is'], P['offre.lag.cotis'], P['offre.t0.cotis'], P['offre.lag.ir'], P['offre.lag.csg']]).toEqual([7, 1, 5, 0, 5, 5])
  })
  it('éducation : centre et bas nuls, haut non nul ; effet retardé de t0 = 8 ans puis lent', () => {
    const run = (ysCase, levers = { dep_enseignement: 10 }) => projectScenario({ levers, horizon: 'trenteAns', ysCase })
    expect(run('central').supply.lignes).toEqual([])
    expect(run('bas').supply.lignes).toEqual([])
    const h = run('haut')
    expect(h.supply.lignes.map((l) => l.id)).toEqual(['dep_enseignement'])
    const sig = PARAM_BY_ID['offre.sigma.enseignement'].high
    expect(yS(h)[9]).toBe(0) // τ = 8 = t0
    expect(yS(h)[10]).toBeCloseTo((sig * 10 / 100) * (1 / 27), 10)
    expect(yS(h)[30]).toBeCloseTo((sig * 10 / 100) * (21 / 27), 10)
    // hausse de la dépense : PIB plus haut ; baisse : PIB plus bas (symétrique)
    expect(yS(h)[30]).toBeGreaterThan(0)
    // pour une baisse, le cas « bas » (PIB le plus bas) est celui qui porte la perte
    expect(yS(run('bas', { dep_enseignement: -10 }))[30]).toBeCloseTo(-(sig * 10 / 100) * (21 / 27), 10)
    expect(yS(run('haut', { dep_enseignement: -10 }))[30]).toBe(0)
  })
  it('TVA : σ calculé (−0,19 par point au centre), symétrique ; « tous taux » à l\'échelle de son rendement ; plus de cas nul', () => {
    const run = (levers, ysCase) => projectScenario({ levers, ysCase })
    const sg = sigmaFiscal('tva_normal', P)
    expect([sg.low, sg.value, sg.high].map((v) => Number(v.toFixed(3)))).toEqual([-0.097, -0.194, -0.267])
    // 1 point relevé, L = 5 : plein effet à τ = 5 (t = 6) ; τ = 2 : 40 %
    expect(yS(run({ tva_normal: 1 }, 'central'))[6]).toBeCloseTo(sg.value / 100, 10)
    expect(yS(run({ tva_normal: 1 }, 'central'))[3]).toBeCloseTo((sg.value / 100) * 0.4, 10)
    expect(yS(run({ tva_normal: 1 }, 'bas'))[6]).toBeCloseTo(sg.high / 100, 10) // « bas » = PIB le plus bas = σ haut en valeur absolue
    expect(yS(run({ tva_normal: 1 }, 'haut'))[6]).toBeCloseTo(sg.low / 100, 10)
    expect(yS(run({ tva_tous_taux: 1 }, 'central'))[6]).toBeCloseTo(sg.value / 100 * (P['rend.tva_tous_taux'] / P['rend.tva_normal']), 10)
    // baisse du taux : gain symétrique
    expect(yS(run({ tva_normal: -1 }, 'central'))[6]).toBeCloseTo(-sg.value / 100, 10)
    expect(yS(run({ tva_normal: -1 }, 'haut'))[6]).toBeCloseTo(-sg.high / 100, 10)
  })
  it('leviers fiscaux : une ligne d\'offre par levier, remplaçable par l\'option sigma ; e_L remplacé suit', () => {
    for (const [id, x] of [['ir', 5], ['is', -2], ['cotis_patronales', 1], ['csg', 1]]) {
      expect(projectScenario({ levers: { [id]: x } }).supply.lignes.map((l) => l.id)).toEqual([id])
    }
    const r = projectScenario({ levers: { is: -2 }, sigma: { is: { sigma: -0.15, L: 7, t0: 1 } } })
    expect(yS(r)[8]).toBeCloseTo((-0.15 * -2) / 100, 10) // L = 7, t0 = 1 : τ = 7 -> plein effet
    expect(yS(r)[2]).toBe(0) // τ = 1 = t0
    const r2 = projectScenario({ levers: { cotis_patronales: 1 }, overrides: { 'offre.e_L': 0.2 } })
    expect(yS(r2)[6]).toBeCloseTo(-0.2 / 1.364 / 100, 6)
  })
  it('chaque effet d\'offre du registre est une ligne étiquetée avec cas et source', () => {
    for (const id of Object.keys(P).filter((k) => k.startsWith('offre.') && !k.startsWith('offre.lag.') && !k.startsWith('offre.t0.') && k !== 'offre.sigma.defaut')) {
      const q = PARAM_BY_ID[id]
      expect(q.unit.length).toBeGreaterThan(0)
      expect(q.source.length).toBeGreaterThan(10)
      expect(q.explanation.length).toBeGreaterThan(20)
    }
  })
})

describe('assurance chômage : levier de dépense actif', () => {
  const yS = (r) => r.total.map((x) => x.yS)
  it('n\'est plus un levier structurel inactif ; logement_offre et travail_licenciement restent inactifs et logement_loyers est reclassé en note qualitative (D-P5)', () => {
    expect(STRUCTURAL_LEVERS.map((l) => l.id)).toEqual(['logement_offre', 'travail_licenciement'])
    expect(STRUCTURAL_LEVERS.every((l) => l.actif === false)).toBe(true)
    expect(QUALITATIVE_NOTES.map((n) => n.id)).toEqual(['logement_loyers'])
    const l = LEVER_BY_ID.travail_assurance_chomage
    expect([l.unite, l.min, l.max, l.type, l.signe, l.categorie]).toEqual(['% de la ligne', -30, 30, 'depense', -1, 'prestations'])
    expect(P['base.unedic.allocations']).toBe(37.2)
  })
  it('plus de générosité = plus de dépense, dans le seul bloc sécurité sociale ; resserrement = économie', () => {
    const base = projectScenario({})
    const more = projectScenario({ levers: { travail_assurance_chomage: 10 }, overrides: { 'fisc.eps': 0, 'fisc.eps_offre': 0 } })
    const less = projectScenario({ levers: { travail_assurance_chomage: -10 }, overrides: { 'fisc.eps': 0, 'fisc.eps_offre': 0 } })
    const Yb = more.total[2].gdpBase
    expect(more.blocks.securiteSociale[2].leversExAnte / Yb * Y0).toBeCloseTo(-3.72, 6)
    expect(less.blocks.securiteSociale[2].leversExAnte / Yb * Y0).toBeCloseTo(3.72, 6)
    for (const r of [more, less]) for (const b of ['centrales', 'locales']) expect(r.blocks[b][2].leversExAnte).toBe(0)
    expect(more.total[3].balance).toBeLessThan(projectScenario({ overrides: { 'fisc.eps': 0, 'fisc.eps_offre': 0 } }).total[3].balance)
    expect(less.total[3].balance).toBeGreaterThan(projectScenario({ overrides: { 'fisc.eps': 0, 'fisc.eps_offre': 0 } }).total[3].balance)
    expect(base.supply.lignes).toEqual([])
  })
  it('effet d\'offre : un resserrement de 10 % donne +0,05 / +0,12 / +0,22 % du PIB après 3 ans ; plus de générosité, l\'inverse', () => {
    const run = (x, ysCase) => projectScenario({ levers: { travail_assurance_chomage: x }, ysCase })
    // en vigueur en 2027 (t = 1), L = 3 : plein effet à t = 4
    expect(yS(run(-10, 'bas'))[4]).toBeCloseTo(0.0005, 10)
    expect(yS(run(-10, 'central'))[4]).toBeCloseTo(0.0012, 10)
    expect(yS(run(-10, 'haut'))[4]).toBeCloseTo(0.0022, 10)
    expect(yS(run(-10, 'central'))[2]).toBeCloseTo(0.0012 / 3, 10) // τ = 1
    expect(yS(run(-10, 'central'))[1]).toBe(0)
    expect(yS(run(10, 'central'))[4]).toBeCloseTo(-0.0012, 10)
    expect(yS(run(10, 'bas'))[4]).toBeCloseTo(-0.0022, 10) // « bas » = PIB le plus bas
    expect(yS(run(10, 'haut'))[4]).toBeCloseTo(-0.0005, 10)
    const r = run(-10, 'central')
    expect(r.supply.lignes.map((l) => l.id)).toEqual(['travail_assurance_chomage'])
    expect(r.supply.lignes[0].cas).toBe('central')
    expect(r.total[6].gdp).toBeGreaterThan(r.total[6].gdpBase * (1 + r.total[6].yD))
  })
})

describe('remarques de la revue de la PR n° 6', () => {
  it('comp.tau0.cotis : statut « sourcé (calcul) » et formule dans l\'explication ; le calcul est exact', () => {
    const q = PARAM_BY_ID['comp.tau0.cotis']
    expect(STATUSES).toContain('sourcé (calcul)')
    expect(q.status).toBe('sourcé (calcul)')
    expect(q.explanation).toContain('1 + e = (1 − 0,430) / (1 − 0,582)')
    expect((1 - 0.430) / (1 - 0.582) - 1).toBeCloseTo(q.value / 100, 3)
  })
  it('ref.derive.a_sante : le haut (longue durée comprise) est documenté et seule cette composante porte la longue durée', () => {
    const q = PARAM_BY_ID['ref.derive.a_sante']
    expect(q.high).toBeCloseTo(1.37 / 45, 10)
    expect(q.explanation).toMatch(/double comptage/)
    // b_autres est estimé hors GF07 (santé) et GF1002 (vieillesse) : aucun double comptage avec la longue durée
    expect(PARAM_BY_ID['ref.derive.b_autres'].explanation).toMatch(/GF07.*GF1002/)
    const hi = projectScenario({ overrides: { 'ref.derive.a_sante': q.high } })
    const base = projectScenario({})
    // la dérive supplémentaire est portée par la seule sécurité sociale
    for (const b of ['centrales', 'locales']) expect(hi.blocks[b][5].referencePrimary).toBeCloseTo(base.blocks[b][5].referencePrimary, 8)
    expect(hi.blocks.securiteSociale[5].referencePrimary).toBeLessThan(base.blocks.securiteSociale[5].referencePrimary)
  })
})

describe('σ des leviers fiscaux : calculé depuis les paramètres (docs/sigma-fiscal.md, décisions du 18 nov.)', () => {
  const yS = (r) => r.total.map((x) => x.yS)
  const Pm = (id) => P[id]
  const eL = (c) => ({ low: 0.20, value: 0.40, high: 0.55 }[c])
  it('nouveaux paramètres : valeurs, fourchettes, statuts', () => {
    const t = (id) => [PARAM_BY_ID[id].low, PARAM_BY_ID[id].value, PARAM_BY_ID[id].high]
    expect(t('offre.e_L')).toEqual([0.20, 0.40, 0.55])
    expect(PARAM_BY_ID['offre.e_L'].status).toBe('sourcé (fourchette), centre choisi')
    expect(P['comp.coin.part_nette']).toBe(0.57)
    expect(P['offre.is.z']).toBe(0.742)
    expect(t('offre.is.alpha')).toEqual([0.16, 0.18, 0.21])
    expect(['dette.beta'].map((id) => [PARAM_BY_ID[id].low, PARAM_BY_ID[id].value, PARAM_BY_ID[id].high])).toEqual([[1, 3, 5]]) // β : fourchette lue (Banque de France WP 494), centre choisi
    expect(PARAM_BY_ID['dette.beta'].status).toBe('sourcé (fourchette), centre choisi')
    expect(t('offre.is.eps_k')).toEqual([0.25, 0.5, 1.0])
    expect(PARAM_BY_ID['offre.is.eps_k'].status).toBe('sourcé (fourchette), centre choisi')
    expect(P['offre.is.tau_effectif']).toBe(25.8)
    expect(P['comp.tau0.is']).toBe(25) // le taux normal reste dans comp.tau0.is
    expect(t('comp.tau0.ir')).toEqual([18, 21, 23])
    expect(PARAM_BY_ID['comp.tau0.ir'].status).toBe('calculé (estimation)')
    expect(PARAM_BY_ID['comp.tau0.ir'].unit).toBe('%')
    expect(P['offre.ir.conv_brut']).toBeUndefined() // remplacé par le barème par tranche (ir-tranches.js)
    expect(P['base.conso_menages']).toBe(1545.9)
    expect(PARAM_BY_ID['base.conso_menages'].status).toBe('sourcé')
    expect(t('base.tva.2025')).toEqual([200, 208.8, 215])
    expect(PARAM_BY_ID['base.tva.2025'].status).toBe('sourcé')
    expect(P['base.ir.2025']).toBe(92.6)
  })
  it('σ par levier : formules et valeurs centrales (± 0,01), cas bas et haut', () => {
    // cotisations patronales : e_L × 0,01 / (1 + τ_patronal), en % du PIB par point
    for (const c of ['low', 'value', 'high']) expect(sigmaFiscalCase('cotis_patronales', P, c)).toBeCloseTo(-eL(c) / (1 + Pm('comp.tau0.cotis') / 100), 10)
    expect(sigmaFiscal('cotis_patronales', P).value).toBeCloseTo(-0.29, 2)
    expect(sigmaFiscal('cotis_patronales', P).low).toBeCloseTo(-0.15, 2)
    expect(sigmaFiscal('cotis_patronales', P).high).toBeCloseTo(-0.40, 2)
    // CSG : assiette 0,9825 ; part déductible 6,8 / 9,2 imposée à 30 % ; pondéré par la part active 74 % (D-P3) ; divisé par la part nette 0,57
    const dlnCsg = (P['offre.ir_csg.part_actifs'] * 0.01 * 0.9825 * ((6.8 / 9.2) * 0.7 + (1 - 6.8 / 9.2))) / 0.57
    expect(sigmaFiscalCase('csg', P)).toBeCloseTo(-100 * 0.4 * dlnCsg, 10)
    expect(sigmaFiscal('csg', P).value).toBeCloseTo(-0.40, 2)
    expect(sigmaFiscal('csg', P).low).toBeCloseTo(-0.20, 2)
    expect(sigmaFiscal('csg', P).high).toBeCloseTo(-0.55, 2)
    // TVA : e_L × rendement du point / consommation des ménages
    expect(sigmaFiscalCase('tva_normal', P)).toBeCloseTo(-100 * 0.4 * (7.5 / 1545.9), 10)
    expect(sigmaFiscalCase('tva_tous_taux', P)).toBeCloseTo(-100 * 0.4 * (11.4 / 1545.9), 10)
    expect(sigmaFiscal('tva_normal', P).value).toBeCloseTo(-0.19, 2)
    expect(sigmaFiscal('tva_normal', P).low).toBeCloseTo(-0.10, 2)
    expect(sigmaFiscal('tva_normal', P).high).toBeCloseTo(-0.27, 2)
    // IS : α × ε_K × Δc/c, Δc/c = 0,01 × (1/(1 − τ) − z/(1 − τz)), τ = 25,8 %, z = 0,742
    const tau = 0.258
    const dc = 0.01 * (1 / (1 - tau) - 0.742 / (1 - tau * 0.742))
    expect(coutUsageParPoint(P)).toBeCloseTo(dc, 12)
    expect(dc).toBeCloseTo(0.0043, 4)
    expect(sigmaFiscal('is', P).value).toBeCloseTo(-100 * 0.18 * 0.5 * dc, 10)
    expect(sigmaFiscal('is', P).value).toBeCloseTo(-0.04, 2)
    expect(sigmaFiscal('is', P).low).toBeCloseTo(-100 * 0.16 * 0.25 * dc, 10)
    expect(sigmaFiscal('is', P).high).toBeCloseTo(-100 * 0.21 * 1.0 * dc, 10)
    expect(sigmaFiscal('is', P).high).toBeCloseTo(-0.09, 2)
    // IR : e_L × Σ_i (Z_i / Z) × 0,01 × τ_i × (1 − 6,8 %) / (1 − w_i), par 1 % du produit (barème par tranche, ir-tranches.js)
    expect(sigmaFiscalCase('ir', P)).toBeCloseTo(-100 * 0.4 * irDeltaLnNet(P), 10)
    expect(sigmaFiscal('ir', P).value).toBeCloseTo(-0.090, 3)
    expect(sigmaFiscal('ir', P).low).toBeCloseTo(-0.045, 3)
    expect(sigmaFiscal('ir', P).high).toBeCloseTo(-0.124, 3)
  })
  it('plafond de l\'IS (Gemini n° 4) : 0,15 par point en valeur absolue, sans effet au centre ; pas de plafond pour le travail', () => {
    expect(Math.abs(sigmaFiscal('is', P).high)).toBeLessThan(P['offre.is.plafond'])
    const grand = resolveParams({ 'offre.is.alpha': 0.9, 'offre.is.eps_k': 9 })
    expect(sigmaFiscalCase('is', grand)).toBe(-0.15)
    expect(sigmaFiscalCase('cotis_patronales', resolveParams({ 'offre.e_L': 5 }))).toBeLessThan(-0.15)
  })
  it('le moteur applique le σ calculé : hausse = baisse du PIB, baisse = gain symétrique, L = 5 (IS : L = 7, t0 = 1)', () => {
    const up = projectScenario({ levers: { cotis_patronales: 1 } })
    const down = projectScenario({ levers: { cotis_patronales: -1 } })
    expect(yS(up)[6]).toBeCloseTo(sigmaFiscal('cotis_patronales', P).value / 100, 10)
    expect(yS(up)[6]).toBeLessThan(0)
    expect(yS(down)[6]).toBeCloseTo(-yS(up)[6], 12)
    expect(yS(up)[1]).toBe(0)
    const is = projectScenario({ levers: { is: 1 } })
    expect(yS(is)[2]).toBe(0) // τ = 1 = t0
    expect(yS(is)[8]).toBeCloseTo(sigmaFiscal('is', P).value / 100, 10) // τ = 7 = L
  })
  it('θ non réel : ≥ 0, valeurs centrales attendues, jamais supérieur à θ', () => {
    const attendu = { cotis_patronales: 0.05, csg: 0, tva_normal: 0, ir: 0, is: 0.25 }
    for (const [id, th] of Object.entries(attendu)) {
      const lever = LEVER_BY_ID[id]
      const theta = leverTheta(lever, 1, P)
      const sg = sigmaFiscal(id, P)
      for (const c of ['low', 'value', 'high']) {
        const reel = partReelle(id, sg[c], lever.rendement(P), P)
        expect(reel).toBeGreaterThanOrEqual(0)
        expect(Math.max(0, theta - reel)).toBeGreaterThanOrEqual(0)
        expect(Math.max(0, theta - reel)).toBeLessThanOrEqual(theta)
      }
      const nonReel = Math.max(0, theta - partReelle(id, sg.value, lever.rendement(P), P))
      expect(nonReel).toBeCloseTo(th, 1)
    }
    // plus σ est grand, plus la part réelle est grande (θ_réel dépend du cas)
    const l = LEVER_BY_ID.csg
    expect(partReelle('csg', sigmaFiscal('csg', P).high, l.rendement(P), P)).toBeGreaterThan(partReelle('csg', sigmaFiscal('csg', P).low, l.rendement(P), P))
  })
  it('θ est inchangé quand σ est remplacé par 0 (ou absent) ; réduit quand σ ≠ 0, au rythme de l\'effet d\'offre', () => {
    const run = (sigma) => projectScenario({ levers: { cotis_patronales: 1 }, horizon: 'trenteAns', sigma })
    const theta0 = leverTheta(LEVER_BY_ID.cotis_patronales, 1, P)
    const zero = run({ cotis_patronales: { sigma: 0, L: 5 } })
    const ex = (r, t) => r.total[t].byInstrument.cotis_patronales
    expect(1 - ex(zero, 30).exPost / ex(zero, 30).exAnte).toBeCloseTo(theta0, 10)
    expect(zero.supply.lignes).toEqual([])
    const calc = run(undefined)
    expect(1 - ex(calc, 30).exPost / ex(calc, 30).exAnte).toBeLessThan(theta0)
    expect(1 - ex(calc, 30).exPost / ex(calc, 30).exAnte).toBeCloseTo(0.05, 1)
    // l'année de l'entrée en vigueur, aucun effet d'offre n'a encore joué : θ est entier
    expect(1 - ex(calc, 1).exPost / ex(calc, 1).exAnte).toBeCloseTo(theta0, 10)
    // un σ explicite positif (sens contraire) ne réduit pas θ
    const pos = run({ cotis_patronales: { sigma: 0.3, L: 5 } })
    expect(1 - ex(pos, 30).exPost / ex(pos, 30).exAnte).toBeCloseTo(theta0, 10)
    // sans levier de recette : supplyForCase nul
    expect(supplyForCase('dep_defense', -10, P)).toBeNull()
  })
  it('pas de double compte : perte de recette propre à long terme = θ × statique (θ_non_réel + perte due au PIB), pas θ + θ_réel', () => {
    const r = projectScenario({ levers: { cotis_patronales: 1 }, horizon: 'trenteAns' })
    const t = 30
    const row = r.total[t]
    const a = row.byInstrument.cotis_patronales.exAnte
    const theta = leverTheta(LEVER_BY_ID.cotis_patronales, 1, P)
    const reel = partReelle('cotis_patronales', sigmaFiscal('cotis_patronales', P).value, LEVER_BY_ID.cotis_patronales.rendement(P), P)
    const ownRev = (P['comp.tau0.cotis'] * P['rend.cotis'] / Y0) * row.gdpBase // cotisations patronales propres, Md€, qui suivent le PIB
    const perteTheta = a - row.byInstrument.cotis_patronales.exPost // θ non réel × statique
    const perteGdp = -row.yS * ownRev // perte de la recette propre due au PIB d'offre (σ)
    expect(perteTheta + perteGdp).toBeCloseTo(theta * a, 6) // total = θ, une seule fois
    expect(Math.abs(perteTheta + perteGdp - (theta + reel) * a)).toBeGreaterThan(0.5) // et pas θ + θ_réel
    expect(perteGdp / a).toBeCloseTo(reel, 6)
  })
  it('IR +1 % du produit, cas central, trente ans : effet d\'offre négatif ; recette nette à long terme finie ; avec e_L = 0,20 le gain net de la seule recette propre reste positif', () => {
    const ref = projectScenario({ horizon: 'trenteAns' })
    const r = projectScenario({ levers: { ir: 1 }, horizon: 'trenteAns' })
    const t = 30
    const row = r.total[t]
    const dPrimary = row.primaryBalance - ref.total[t].primaryBalance // recette nette de long terme, Md€ par an, année 2056
    expect(Number.isFinite(dPrimary)).toBe(true)
    expect(row.yS).toBeLessThan(0)
    // e_L = 0,20 : θ + perte du PIB sur la seule recette propre de l'IR (92,6 Md€) laissent un gain positif
    const r2 = projectScenario({ levers: { ir: 1 }, horizon: 'trenteAns', overrides: { 'offre.e_L': 0.2 } })
    const row2 = r2.total[t]
    const ownLoss = -row2.yS * (P['base.ir.2025'] / Y0) * row2.gdpBase
    const netOwn = row2.byInstrument.ir.exPost - ownLoss
    expect(row2.yS).toBeLessThan(0)
    expect(netOwn).toBeGreaterThan(0)
    // Avec TOUTES les recettes qui suivent le PIB (effet d'offre passé au solde par ε_offre = taux de prélèvements obligatoires, E7, D13),
    // le seuil de rentabilité de l'IR se déplace (voir le rapport de la PR) ; on vérifie seulement qu'elle est finie et au-dessus de celle de e_L = 0,40.
    const dPrimary2 = row2.primaryBalance - ref.total[t].primaryBalance
    expect(Number.isFinite(dPrimary2)).toBe(true)
    expect(dPrimary2).toBeGreaterThan(dPrimary)
  })
  it('aucun NaN : tous les leviers au minimum et au maximum, trois cas, trois horizons', () => {
    const lo = Object.fromEntries(LEVERS.map((l) => [l.id, l.min]))
    const hi = Object.fromEntries(LEVERS.map((l) => [l.id, l.max]))
    const finiteAll = (o) => JSON.stringify(o, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? '__NF__' : v)).indexOf('__NF__') === -1
    for (const horizon of Object.keys(HORIZONS)) for (const ysCase of ['bas', 'central', 'haut']) for (const levers of [lo, hi]) {
      const r = projectScenario({ levers, horizon, ysCase })
      expect(finiteAll(r.total)).toBe(true)
      expect(finiteAll(r.decomposition.filter(Boolean))).toBe(true)
      expect(finiteAll(r.supply)).toBe(true)
    }
    // un levier à la fois, y compris les leviers fiscaux seuls
    for (const l of LEVERS) for (const x of [l.min, l.max]) for (const ysCase of ['bas', 'central', 'haut']) {
      expect(finiteAll(projectScenario({ levers: { [l.id]: x }, horizon: 'trenteAns', ysCase }).total)).toBe(true)
    }
  })
})

describe('vérification primaire Day 0 : ventilation COFOG Eurostat 2024 et paramètres vérifiés (docs/review-day0-parameters.md)', () => {
  it('ventilation COFOG par sous-secteur (Eurostat 2024) : somme à 1, ordre et sécurité à ≈ 80,3 % État', () => {
    expect(PARAM_BY_ID['bloc.part_hors_secu.centrales']).toBeUndefined()
    expect(PARAM_BY_ID['bloc.part_hors_secu.locales']).toBeUndefined()
    for (const [slug, expectedCentral] of [
      ['enseignement', 0.698],
      ['ordre_securite', 0.803],
      ['affaires_economiques', 0.687],
    ]) {
      const c = P[`bloc.cofog.${slug}.centrales`]
      const l = P[`bloc.cofog.${slug}.locales`]
      expect(c + l).toBeCloseTo(1, 10)
      expect(c).toBeCloseTo(expectedCentral, 2)
      expect(PARAM_BY_ID[`bloc.cofog.${slug}.centrales`].status).toBe('sourcé (calcul)')
    }
    const r = projectScenario({ levers: { dep_ordre_securite: -10 }, overrides: { 'fisc.eps': 0, 'fisc.eps_offre': 0 } })
    const c1 = r.blocks.centrales[1].leversExAnte
    const l1 = r.blocks.locales[1].leversExAnte
    expect(c1 / (c1 + l1)).toBeCloseTo(P['bloc.cofog.ordre_securite.centrales'], 8)
  })
  it('fisc.eps, taux légaux (TVA, CSG, TMI 30 %) et ref.derive.b_autres : statuts et fourchettes mis à jour', () => {
    expect(PARAM_BY_ID['fisc.eps'].status).toBe('sourcé (fourchette), centre choisi')
    expect(PARAM_BY_ID['fisc.eps'].source).toMatch(/Discussion Paper 098.*0,630/)
    expect(PARAM_BY_ID['comp.tau0.tva'].status).toBe('sourcé')
    expect(PARAM_BY_ID['comp.tau0.csg'].status).toBe('sourcé')
    expect(PARAM_BY_ID['offre.csg.tmi_salarie'].status).toBe('sourcé')
    expect(PARAM_BY_ID['ref.derive.b_autres'].status).toBe('calculé (estimation)')
    expect([PARAM_BY_ID['ref.derive.b_autres'].low, PARAM_BY_ID['ref.derive.b_autres'].value, PARAM_BY_ID['ref.derive.b_autres'].high]).toEqual([0, 0.03, 0.09])
  })
  it('plus aucun paramètre « de mémoire », « à valider » ni « à collecter » (Phase 1)', () => {
    expect(PARAMS.filter((q) => q.status === 'de mémoire')).toEqual([])
    expect(PARAMS.filter((q) => q.status === 'à collecter')).toEqual([])
    expect(PARAMS.filter((q) => q.status === 'à valider')).toEqual([])
    expect(PARAMS.filter((q) => q.status === 'sourcé (secondaire)').map((q) => q.id)).toEqual(['dem.m.is'])
    expect(PARAM_BY_ID['dem.m.ir_csg'].source).toMatch(/Mésange.*0,41/)
    expect(PARAM_BY_ID['comp.theta.cotis'].source).toMatch(/Bozio, Breda et Grenet/)
    expect([PARAM_BY_ID['comp.offset.prestations'].value, PARAM_BY_ID['comp.offset.prestations'].status]).toEqual([0.20, 'sourcé (fourchette), centre choisi'])
    expect([PARAM_BY_ID['comp.theta.csg'].value, PARAM_BY_ID['comp.theta.csg'].status]).toEqual([0.03, 'sourcé (fourchette), centre choisi'])
    expect([PARAM_BY_ID['dette.y_long'].value, PARAM_BY_ID['dette.y_long'].status]).toEqual([4.89, 'sourcé'])
    expect([PARAM_BY_ID['cmp.aft.taux_emission.2026'].value, PARAM_BY_ID['cmp.aft.taux_emission.2026'].status]).toEqual([3.50, 'sourcé (calcul)'])
    expect(PARAM_BY_ID['ref.derive.a_sante'].value).toBeCloseTo(0.66 / 45, 8)
    expect(PARAM_BY_ID['ref.derive.a_sante'].high).toBeCloseTo(1.37 / 45, 8)
    expect(PARAM_BY_ID['ref.derive.a_sante'].status).toBe('sourcé (fourchette), centre choisi')
    expect(PARAM_BY_ID['rend.is'].status).toBe('calculé (estimation)')
    expect(PARAM_BY_ID['macro.pi.long'].status).toBe('sourcé (fourchette), centre choisi')
  })
})

describe('suivi de l\'audit Day 0 (PR #30/#32) : corrections de sources et fourchettes', () => {
  const range = (id) => [PARAM_BY_ID[id].low, PARAM_BY_ID[id].value, PARAM_BY_ID[id].high, PARAM_BY_ID[id].status]
  it('fourchettes approuvées : θ CSG 0,01–0,05, θ IR 0,14–0,62 (levier proportionnel, dérivation par tranche avec CSG déductible ; centre 0,35 depuis le 25 nov. 2026), rend.cotis 7,0–10, prestations 0,45', () => {
    expect(range('comp.theta.csg')).toEqual([0.01, 0.03, 0.05, 'sourcé (fourchette), centre choisi'])
    expect(range('comp.theta.ir')).toEqual([0.14, 0.35, 0.62, 'sourcé (fourchette), centre choisi'])
    expect(range('rend.cotis')).toEqual([7.0, 7.4, 10, 'sourcé (fourchette), centre choisi'])
    expect(range('rend.is')).toEqual([2.0, 2.3, 3.0, 'calculé (estimation)'])
    expect(range('comp.theta.cotis')).toEqual([0.05, 0.15, 0.30, 'sourcé (fourchette), centre choisi'])
    expect(range('dem.m.prestations')).toEqual([0.2, 0.45, 0.8, 'calculé (estimation)'])
    expect(range('dem.m.cotisations')).toEqual([0.2, 0.4, 0.7, 'sourcé (fourchette), centre choisi'])
  })
  it('sources corrigées : IS (DGFiP n° 51 : 257 Md€ à 25 %, 83,7/70,7 = IS + IR), cotisations (REPSS 7,3 / 6,9 ; 71,5 = total exonérations), prestations (FR-BDF 0,09–0,43)', () => {
    expect(PARAM_BY_ID['rend.is'].source).toMatch(/257 Md€/)
    expect(PARAM_BY_ID['rend.is'].source).toMatch(/83,7 Md€.*IS et IR/)
    expect(PARAM_BY_ID['rend.is'].source).not.toMatch(/70,5 \/ 25/)
    expect(PARAM_BY_ID['rend.cotis'].source).toMatch(/7,3 Md€ \(dont secteur privé 6,9 Md€/)
    expect(PARAM_BY_ID['rend.cotis'].source).toMatch(/71,5 Md€ = coût total 2026 des exonérations/)
    expect(PARAM_BY_ID['rend.cotis'].source).not.toMatch(/≈ 750/)
    expect(PARAM_BY_ID['dem.m.prestations'].source).toMatch(/FR-BDF.*\+0,09 \/ \+0,26 \/ \+0,37 \/ \+0,43/)
    expect(PARAM_BY_ID['dem.m.cotisations'].source).toMatch(/entre l'an 1 et l'an 2/)
    expect(PARAM_BY_ID['comp.theta.cotis'].source).toMatch(/Source indirecte.*11 estimations/)
    expect(PARAM_BY_ID['comp.theta.ir'].source).toMatch(/Cabannes, Houdré et Landais.*0,31/)
  })
  it('CSG : avec σ actif et part active 74 % (D-P3), θ_réel (0,037 au cas central) dépasse θ (0,034) et la part non réelle est bloquée à 0', () => {
    const l = LEVER_BY_ID.csg
    const th = leverTheta(l, 1, P)
    expect(th).toBeCloseTo(0.0336, 4)
    const s = supplyForCase('csg', 1, P, undefined, 'central')
    const reel = partReelle('csg', s.sigma, l.rendement(P, 1), P)
    expect(reel).toBeCloseTo(0.0367, 3)
    expect(Math.max(0, th - reel)).toBe(0)
    const haut = supplyForCase('csg', 1, P, undefined, 'haut')
    expect(Math.max(0, th - partReelle('csg', haut.sigma, l.rendement(P, 1), P))).toBeCloseTo(0.0153, 3)
  })
  it('COFOG : parts nettes des transferts entre sous-secteurs affichées (GF04 66,9 % contre 68,7 % retenu), valeurs moteur inchangées', () => {
    expect(P['bloc.cofog.affaires_economiques.centrales']).toBeCloseTo(123826.5 / (123826.5 + 56428.3), 10)
    expect(PARAM_BY_ID['bloc.cofog.affaires_economiques.centrales'].source).toMatch(/14,7 Md€ de transferts.*66,9 % contre 68,7 %/)
  })
})

describe('indexation des pensions : unité et signe cohérents', () => {
  it('unité « points par rapport à l\'inflation » et signe conservé (−1 améliore le solde de +4,217 Md€)', () => {
    const l = LEVER_BY_ID.indexation_pensions
    expect(l.unite).toBe('points par rapport à l\'inflation')
    expect(l.signe).toBe(-1)
    expect(staticYield(l, -1, P)).toBeCloseTo(4.217, 2)
    expect(staticYield(l, 1, P)).toBeCloseTo(-4.217, 2)
  })
})

describe('âge légal de départ en retraite (recalibré sur sources primaires le 23 nov. 2026)', () => {
  const yS = (r) => r.total.map((x) => x.yS)
  it('paramètres asymétriques rend.age_legal.hausse / baisse, comp.offset.age_legal et définition du levier', () => {
    expect(PARAM_BY_ID['rend.age_legal']).toBeUndefined()
    const up = PARAM_BY_ID['rend.age_legal.hausse']
    const dn = PARAM_BY_ID['rend.age_legal.baisse']
    const off = PARAM_BY_ID['comp.offset.age_legal']
    expect([up.low, up.value, up.high]).toEqual([4.20, 4.95, 6.10])
    expect([dn.low, dn.value, dn.high]).toEqual([2.60, 3.90, 4.95])
    expect([off.low, off.value, off.high]).toEqual([0.15, 0.20, 0.33])
    expect(up.status).toBe('sourcé (fourchette), centre choisi')
    expect(dn.status).toBe('sourcé (fourchette), centre choisi')
    expect(off.status).toBe('sourcé')
    expect(up.source).toMatch(/Cour des comptes.*2025/)
    expect(dn.source).toMatch(/Cour des comptes.*2025/)
    expect(off.source).toMatch(/DREES.*DARES/)
    expect(off.source).toMatch(/COR.*juin 2026.*près d'un tiers/)
    expect(dn.source).toMatch(/Tableau n° 6/)
    // Asymétrie résiduelle hausse / baisse (contrainte des 172 trimestres) : 4,95 / 3,90 ≈ 1,27 ; baisse < hausse
    expect(dn.value).toBeLessThan(up.value)
    expect(up.value / dn.value).toBeCloseTo(1.27, 2)
    expect(dn.high).toBe(up.value) // haut = symétrie complète avec la hausse
    expect(PARAM_BY_ID['offre.sigma.age_legal'].source).toMatch(/COR.*juin 2026/)
    const l = LEVER_BY_ID.age_legal
    expect([l.unite, l.min, l.max, l.type, l.signe, l.categorie, l.offsetParam, l.asymmetric, l.statut]).toEqual([
      'années par rapport au droit en vigueur', -2, 3, 'depense', 1, 'prestations', 'comp.offset.age_legal', true, 'sourcé (fourchette), centre choisi',
    ])
    expect(l.rendParams).toEqual(['rend.age_legal.hausse', 'rend.age_legal.baisse'])
    expect(l.defaultRamp).toEqual({ start: 2, years: 7, profile: [0.156, 0.281, 0.375, 0.625, 0.719, 0.781, 1] })
    expect(l.defaultRampDown).toEqual({ start: 3, years: 5, profile: [0.219, 0.406, 0.594, 0.781, 1] })
  })
  it('trajectoire budgétaire asymétrique : profils de cohortes LFSS 2026 (2028–2034 hausse, 2029–2033 baisse), bloc ASSO seul, reports 20 %', () => {
    const o = { 'fisc.eps': 0, 'fisc.eps_offre': 0 }
    // Hausse (+1 an, 64 → 65 ans) : profil accéléré +6m/gén. dès janv. 2028 (2028–2034)
    const rUp = projectScenario({ levers: { age_legal: 1 }, overrides: o })
    const exAnteUp25 = (t) => rUp.blocks.securiteSociale[t].leversExAnte / rUp.total[t].gdpBase * Y0
    expect(exAnteUp25(0)).toBe(0) // 2026
    expect(exAnteUp25(1)).toBe(0) // 2027 (gel LFSS 2026)
    const upProf = [0.156, 0.281, 0.375, 0.625, 0.719, 0.781, 1]
    upProf.forEach((share, i) => {
      expect(exAnteUp25(2 + i)).toBeCloseTo(4.95 * share, 8)
    })
    expect(exAnteUp25(10)).toBeCloseTo(4.95, 8) // plateau 2036
    for (let t = 0; t <= 10; t++) {
      expect(rUp.blocks.centrales[t].leversExAnte).toBe(0)
      expect(rUp.blocks.locales[t].leversExAnte).toBe(0)
    }
    // Baisse (−1 an, 64 → 63 ans) : gén. 1965 T2–T4 déjà à 63 ans 0 mois => nul en 2028, profil 2029–2033
    const rDn = projectScenario({ levers: { age_legal: -1 }, overrides: o })
    const exAnteDn25 = (t) => rDn.blocks.securiteSociale[t].leversExAnte / rDn.total[t].gdpBase * Y0
    expect(exAnteDn25(0)).toBe(0) // 2026
    expect(exAnteDn25(1)).toBe(0) // 2027
    expect(exAnteDn25(2)).toBe(0) // 2028
    const dnProf = [0.219, 0.406, 0.594, 0.781, 1]
    dnProf.forEach((share, i) => {
      expect(exAnteDn25(3 + i)).toBeCloseTo(-3.90 * share, 8)
    })
    expect(exAnteDn25(10)).toBeCloseTo(-3.90, 8) // plateau 2036
    // Effets de report sociaux DREES/DARES : comp.offset.age_legal = 0,20 par défaut (indépendant de comp.offset.prestations)
    expect(leverTheta(LEVER_BY_ID.age_legal, 1, P)).toBe(0.20)
    expect(leverTheta(LEVER_BY_ID.age_legal, -1, P)).toBe(0.20)
    expect(rUp.total[8].byInstrument.age_legal.exPost / rUp.total[8].byInstrument.age_legal.exAnte).toBeCloseTo(0.8, 10)
    expect(rDn.total[7].byInstrument.age_legal.exPost / rDn.total[7].byInstrument.age_legal.exAnte).toBeCloseTo(0.8, 10)
    const rZeroOff = projectScenario({ levers: { age_legal: 1 }, overrides: { ...o, 'comp.offset.age_legal': 0 } })
    expect(rZeroOff.total[8].byInstrument.age_legal.exPost / rZeroOff.total[8].byInstrument.age_legal.exAnte).toBeCloseTo(1, 10)
    // Une option ramp explicite remplace defaultRamp (y compris pour sizeByYear)
    const rCustom = projectScenario({ levers: { age_legal: 1 }, overrides: o, ramp: { start: 1, years: 1 } })
    expect(rCustom.blocks.securiteSociale[1].leversExAnte / rCustom.total[1].gdpBase * Y0).toBeCloseTo(4.95, 8)
    const rCustomMulti = projectScenario({ levers: { age_legal: 1 }, ramp: { start: 1, years: 4 } })
    expect(rCustomMulti.total[2].yS).toBeCloseTo(0.005 * (2 / 4) * (1 / 6), 10) // t=2: ramp=2/4, tau=1 -> 1/6
    // Demande E4 : nulle en 2026–2027 (gel LFSS 2026), puis négative pendant la montée en charge 2028–2034
    const rFull = projectScenario({ levers: { age_legal: 1 } })
    const refFull = projectScenario({})
    expect(rFull.total[0].yD).toBe(0)
    expect(rFull.total[1].yD).toBe(0)
    for (let t = 2; t <= 8; t++) expect(rFull.total[t].yD).toBeLessThan(0)
    // Recettes d'affichage : excluent age_legal.exPost (levier de dépense), ne varient qu'avec le PIB
    const revShare = P['base.recettes.apu'] / Y0
    for (const t of [2, 5, 8]) {
      expect(rFull.total[t].revenue - refFull.total[t].revenue).toBeCloseTo(revShare * (rFull.total[t].gdp - refFull.total[t].gdp), 8)
    }
  })
  it('effet d\'offre yS : +0,30 / +0,50 / +0,70 % PIB par année, L = 6 sans double comptage (dès 2028 hausse, 2029 baisse), sans double compte des cotisations', () => {
    const run = (x, ysCase, horizon = 'dixAns') => projectScenario({ levers: { age_legal: x }, ysCase, horizon })
    const c = run(1, 'central')
    const b = run(1, 'bas')
    const h = run(1, 'haut')
    // Hausse : nul avant 2028 (t = 0, 1) et à l'entrée en vigueur τ = 0 (t = 2), rampe linéaire L = 6 (t = 2..8)
    expect(yS(c).slice(0, 3)).toEqual([0, 0, 0])
    for (let tau = 1; tau <= 6; tau++) {
      expect(yS(c)[2 + tau]).toBeCloseTo((0.005 * tau) / 6, 10)
    }
    expect(yS(b)[8]).toBeCloseTo(0.0030, 10)
    expect(yS(c)[8]).toBeCloseTo(0.0050, 10)
    expect(yS(h)[8]).toBeCloseTo(0.0070, 10)
    expect(yS(c)[10]).toBeCloseTo(0.0050, 10) // plateau
    expect(c.supply.lignes.map((l) => l.id)).toEqual(['age_legal'])
    expect(c.supply.lignes[0].cas).toBe('central')
    // Décomposition exacte à chaque année pour les trois cas
    for (const r of [b, c, h]) {
      for (let t = 1; t < r.total.length; t++) {
        const d = r.decomposition[t]
        const s = d.refGrowth + d.refDrift + d.leviers + d.comportement + d.stabilisateurs + d.offre.reduce((a, o) => a + o.montant, 0) + d.interetsTaux + d.interetsStock
        expect(s).toBeCloseTo(d.total, 8)
      }
    }
    // Baisse (x = -1, 64 → 63 ans) : démarre en 2029 (t = 3), plein effet L = 6 en 2035 (t = 9)
    const ref = projectScenario({})
    const downC = run(-1, 'central')
    const downB = run(-1, 'bas')
    const downH = run(-1, 'haut')
    expect(yS(downC).slice(0, 4)).toEqual([0, 0, 0, 0]) // nul en 2026..2029 (τ = 0 en 2029)
    expect(yS(downC)[9]).toBeCloseTo(-0.0050, 10)
    expect(yS(downB)[9]).toBeCloseTo(-0.0070, 10) // « bas » = PIB le plus bas
    expect(yS(downH)[9]).toBeCloseTo(-0.0030, 10)
    expect(downC.total[9].balance).toBeLessThan(ref.total[9].balance)
    expect(c.total[8].balance).toBeGreaterThan(ref.total[8].balance)
    // Contrôle anti-double-compte (docs/review-age-legal.md) :
    // Hausse : 4,95 × (1 − 0,20) = 3,96 Md€ direct net + 0,436 × 0,50 % × 2 991 = 6,52 Md€ offre => +10,48 Md€ (+0,350 % PIB) au centre, +13,09 Md€ (+0,438 % PIB) au cas haut
    const totalApuUp25 = (c.total[8].byInstrument.age_legal.exPost + P['fisc.eps_offre'] * c.total[8].yS * c.total[8].gdpBase) / c.total[8].gdpBase * Y0
    expect(totalApuUp25).toBeCloseTo(4.95 * 0.8 + P['fisc.eps_offre'] * 0.005 * Y0, 6)
    expect(totalApuUp25 / Y0 * 100).toBeCloseTo(0.350, 2)
    const totalApuUpHigh25 = (h.total[8].byInstrument.age_legal.exPost + P['fisc.eps_offre'] * h.total[8].yS * h.total[8].gdpBase) / h.total[8].gdpBase * Y0
    expect(totalApuUpHigh25 / Y0 * 100).toBeCloseTo(0.438, 2)
    // Baisse : −3,90 × 0,80 − 0,436 × 0,50 % × 2 991 ≈ −9,64 Md€ (−0,322 % PIB) — asymétrie hausse > |baisse| (contrainte 172 trimestres)
    const totalApuDn25 = (downC.total[9].byInstrument.age_legal.exPost + P['fisc.eps_offre'] * downC.total[9].yS * downC.total[9].gdpBase) / downC.total[9].gdpBase * Y0
    expect(totalApuDn25).toBeCloseTo(-3.90 * 0.8 - P['fisc.eps_offre'] * 0.005 * Y0, 6)
    expect(totalApuUp25).toBeGreaterThan(Math.abs(totalApuDn25))
  })
})

describe('emplois implicites de l\'effet d\'offre de l\'âge légal (affichage seulement)', () => {
  const PC = resolveParams()
  it('paramètres : conversion DG Trésor (Tableau 4) et fourchette du COR (Tableau 2.10)', () => {
    const q = PARAM_BY_ID['offre.emplois_par_pt_pib.age_legal']
    expect(q.value).toBe(315000)
    expect(q.low).toBe(300000)
    expect(q.high).toBe(330000)
    expect(q.status).toBe('sourcé (calcul)')
    expect(q.source).toMatch(/Tableau 4/)
    expect(q.source).toMatch(/élasticité unitaire/)
    // bornes = ratios emplois / PIB de la DG Trésor à 20 et 10 ans
    expect(210000 / 0.7).toBeCloseTo(q.low, 6)
    expect(198000 / 0.6).toBeCloseTo(q.high, 6)
    expect(PARAM_BY_ID['cmp.cor.emplois.age_legal_10ans.bas'].value).toBe(160000)
    expect(PARAM_BY_ID['cmp.cor.emplois.age_legal_10ans.haut'].value).toBe(250000)
    expect(SUPPLY_BY_LEVER.age_legal.emplois).toBe('offre.emplois_par_pt_pib.age_legal')
  })
  it('σ(cas) × années × conversion : central, bas, haut pour +1 an', () => {
    expect(impliedJobs('age_legal', 1, PC, 'central')).toBeCloseTo(0.50 * 315000, 0) // 157 500
    expect(impliedJobs('age_legal', 1, PC, 'bas')).toBeCloseTo(0.30 * 315000, 0) // 94 500
    expect(impliedJobs('age_legal', 1, PC, 'haut')).toBeCloseTo(0.70 * 315000, 0) // 220 500
    expect(impliedJobs('age_legal', 2, PC)).toBeCloseTo(2 * 157500, 0)
  })
  it('0 pour x = 0, négatif pour x < 0 (même règle de cas que le moteur), null hors registre ou si non fini', () => {
    expect(impliedJobs('age_legal', 0, PC)).toBe(0)
    expect(impliedJobs('age_legal', -1, PC)).toBeCloseTo(-157500, 0)
    expect(impliedJobs('age_legal', -1, PC, 'bas')).toBeCloseTo(-220500, 0) // « bas » = PIB le plus bas
    expect(impliedJobs('age_legal', -1, PC, 'haut')).toBeCloseTo(-94500, 0)
    expect(impliedJobs('tva_normal', 1, PC)).toBeNull()
    expect(impliedJobs('age_legal', NaN, PC)).toBeNull()
  })
  it('suit les remplacements de paramètres', () => {
    const PO = resolveParams({ 'offre.emplois_par_pt_pib.age_legal': 300000, 'offre.sigma.age_legal': 0.6 })
    expect(impliedJobs('age_legal', 1, PO)).toBeCloseTo(180000, 0)
  })
  it('arrondi au multiple de 10 000 le plus proche, symétrique, sans −0', () => {
    expect(roundJobs(157500)).toBe(160000)
    expect(roundJobs(94500)).toBe(90000)
    expect(roundJobs(220500)).toBe(220000)
    expect(roundJobs(-157500)).toBe(-160000)
    expect(roundJobs(4000)).toBe(0)
    expect(Object.is(roundJobs(-4000), 0)).toBe(true)
    expect(roundJobs(Infinity)).toBeNull()
  })
})

describe('barème de l\'IR par tranche : données communes au θ (documenté) et à σ (docs/review-day0-parameters.md §9)', () => {
  const d = irTranches(P)
  it('données DGFiP (revenus 2024) et barème lus ; revenus estimés et quotients moyens dans leurs tranches', () => {
    expect([11, 30, 41, 45].map((t) => P[`offre.ir.tranche.${t}.foyers`])).toEqual([20930797, 6868031, 434112, 61476])
    expect([1, 2, 3, 4].map((n) => P[`offre.ir.bareme.seuil${n}`])).toEqual([11497, 29315, 83823, 180294])
    for (const t of [11, 30, 41, 45]) {
      expect(PARAM_BY_ID[`offre.ir.tranche.${t}.foyers`].status).toBe('sourcé')
      expect(PARAM_BY_ID[`offre.ir.tranche.${t}.parts`].status).toBe('calculé (estimation)')
    }
    expect(PARAM_BY_ID['offre.ir.tranche.0.revenu'].status).toBe('calculé (estimation)')
    expect(d.tranches.map((r) => Math.round(r.revenu * 10) / 10)).toEqual([476.0, 475.8, 74.0, 22.5])
    expect(d.total).toBeCloseTo(1144.3, 1)
    expect(d.assiettePoint).toBeCloseTo(519.2, 1)
    const seuils = [11497, 29315, 83823, 180294, Infinity]
    d.tranches.forEach((r, i) => {
      const q = (r.revenu * 1e3) / r.parts
      expect(q).toBeGreaterThan(seuils[i])
      expect(q).toBeLessThan(seuils[i + 1])
    })
    // taux marginal moyen pondéré par les revenus ≈ comp.tau0.ir (21 %, 18–23 %)
    const moyen = d.tranches.reduce((a, r) => a + (r.taux / 100) * r.revenu, 0) / d.total
    expect(moyen * 100).toBeGreaterThan(PARAM_BY_ID['comp.tau0.ir'].low)
    expect(moyen * 100).toBeLessThan(PARAM_BY_ID['comp.tau0.ir'].high)
  })
  it('coins marginaux complets : 19,95 / 37,66 / 47,91 / 54,64 % (CEHR 3 %) ; 55,64 % au cas haut', () => {
    expect([11, 30, 41, 45].map((t) => coinMarginal(P, t))).toEqual([11, 30, 41, 45].map((t) => expect.closeTo(0.097 + (t / 100) * 0.932 + (t === 45 ? 0.03 : 0), 10)))
    expect(coinMarginal(P, 45, 'high')).toBeCloseTo(0.5564, 4)
  })
  it('θ par tranche reproduit la dérivation documentée (facteur CSG déductible 0,932) : +1 pt 0,20 (0,07–0,36), proportionnel 0,35 (0,14–0,62) ; comp.theta.ir = 0,35 (décision du 25 nov. 2026)', () => {
    expect(facteurCsgDeductible(P)).toBeCloseTo(0.932, 6)
    expect(thetaIrTranches(P, 'point')).toBeCloseTo(0.1987, 4)
    expect(thetaIrTranches(P, 'point', 'low')).toBeCloseTo(0.0690, 4)
    expect(thetaIrTranches(P, 'point', 'high')).toBeCloseTo(0.3646, 4)
    expect(thetaIrTranches(P, 'proportionnel')).toBeCloseTo(0.3465, 4)
    expect(thetaIrTranches(P, 'proportionnel', 'low')).toBeCloseTo(0.1400, 4)
    expect(thetaIrTranches(P, 'proportionnel', 'high')).toBeCloseTo(0.6183, 4)
    expect(P['comp.theta.ir']).toBe(0.35)
    // centre et fourchette = valeurs calculées, arrondies à 2 décimales
    for (const [c, k] of [['value', 'value'], ['low', 'low'], ['high', 'high']]) {
      expect(PARAM_BY_ID['comp.theta.ir'][k]).toBe(Math.round(thetaIrTranches(P, 'proportionnel', c) * 100) / 100)
    }
    expect(LEVER_BY_ID.ir.aide).toContain('θ = 0,35 (0,14–0,62)')
    expect(LEVER_BY_ID.ir.aide).toContain('0,20 pour +1 point sur chaque taux')
    expect(LEVER_BY_ID.ir.aide).toContain('Centre retenu 0,35')
    expect(LEVER_BY_ID.ir.aide).not.toMatch(/favorable au rendement/)
    expect(PARAM_BY_ID['comp.theta.ir'].source).not.toMatch(/Centre 0,15 choisi par Patrick/)
    expect(LEVER_BY_ID.cotis_patronales.aide).toContain(`fourchette ${String(PARAM_BY_ID['rend.cotis'].low)}–${String(PARAM_BY_ID['rend.cotis'].high)} Md€`)
    expect(LEVER_BY_ID.is.aide).not.toMatch(/2,6–2,8/)
  })
  it('θ_réel de l\'IR cohérent avec θ et pondéré par la part active 74 % (D-P3)', () => {
    const l = LEVER_BY_ID.ir
    const sigma = sigmaFiscalCase('ir', P)
    const eL = P['offre.e_L']
    const partActifs = P['offre.ir_csg.part_actifs']
    const uniforme = resolveParams(Object.fromEntries([11, 30, 41, 45].map((t) => [`offre.ir.tranche.${t}.eti`, eL * partActifs])))
    expect(partReelle('ir', sigma, l.rendement(P, 1), P)).toBeCloseTo(thetaIrTranches(uniforme, 'proportionnel'), 10)
    expect(thetaReelIr(P, sigma)).toBeCloseTo(1.4956 * eL * partActifs, 4)
    // linéaire en e_L (via σ), nul si σ = 0 ou non fini, jamais négatif
    expect(thetaReelIr(P, sigma / 2)).toBeCloseTo(thetaReelIr(P, sigma) / 2, 10)
    expect(thetaReelIr(P, 0)).toBe(0)
    expect(thetaReelIr(P, Number.NaN)).toBe(0)
    expect(thetaReelIr(P, 0.1)).toBe(0)
    // ne dépend plus de la recette propre base.ir.2025
    expect(partReelle('ir', sigma, l.rendement(P, 1), resolveParams({ 'base.ir.2025': 1 }))).toBeCloseTo(partReelle('ir', sigma, l.rendement(P, 1), P), 12)
  })
  it('σ de l\'IR et θ_non_réel (avec part active 74 %, D-P3) : part réelle 0,443 au centre, 0,609 au bas, 0,221 au haut', () => {
    const l = LEVER_BY_ID.ir
    const th = leverTheta(l, 1, P)
    const reel = (c) => partReelle('ir', supplyForCase('ir', 1, P, undefined, c).sigma, l.rendement(P, 1), P)
    const nonReel = (c) => Math.max(0, th - reel(c))
    expect(th).toBeCloseTo(0.3544, 4)
    expect(reel('central')).toBeCloseTo(0.4427, 4)
    expect(reel('bas')).toBeCloseTo(0.6087, 4)
    expect(reel('haut')).toBeCloseTo(0.2214, 4)
    expect(nonReel('central')).toBe(0)
    expect(nonReel('bas')).toBe(0)
    expect(nonReel('haut')).toBeCloseTo(0.1331, 4)
  })
  it('sous_indexation_ciblee (D-P6) : +1,65 Md€ brut/pt, retour fiscal 38 % hautes pensions, bloc ASSO seul', () => {
    const l = LEVER_BY_ID.sous_indexation_ciblee
    expect([l.min, l.max, l.type, l.signe]).toEqual([-3, 0, 'depense', -1])
    expect(staticYield(l, -1, P)).toBeCloseTo(1.65, 6)
    expect(leverTheta(l, -1, P)).toBeCloseTo(0.38, 6)
    const r = projectScenario({ levers: { sous_indexation_ciblee: -1 }, overrides: { 'fisc.eps': 0, 'fisc.eps_offre': 0 } })
    const inst = r.total[1].byInstrument.sous_indexation_ciblee
    expect(inst.exPost / inst.exAnte).toBeCloseTo(1 - 0.38, 8)
    expect(r.blocks.centrales[1].leversExAnte).toBe(0)
    expect(r.blocks.locales[1].leversExAnte).toBe(0)
    expect(r.blocks.securiteSociale[1].leversExAnte).toBeGreaterThan(0)
  })
  it('θ_non_réel de l\'IR reste dans [0, θ] chaque année, pour toute taille de levier et tout cas d\'offre', () => {
    for (const ysCase of ['bas', 'central', 'haut']) {
      for (const x of [-30, -10, -1, 1, 10, 30]) {
        const r = projectScenario({ levers: { ir: x }, horizon: 'trenteAns', ysCase })
        const th = leverTheta(LEVER_BY_ID.ir, x, P)
        for (const row of r.total) {
          const v = row.byInstrument.ir
          if (!v || v.exAnte === 0) continue
          const thetaEff = 1 - v.exPost / v.exAnte
          expect(thetaEff).toBeGreaterThanOrEqual(-1e-12)
          expect(thetaEff).toBeLessThanOrEqual(th + 1e-12)
        }
      }
    }
  })
  it('jamais de NaN : données incohérentes => irTranches null, σ et θ nuls', () => {
    const bad = resolveParams({ 'offre.ir.tranche.30.impot': -500 }) // revenu estimé négatif
    expect(irTranches(bad)).toBeNull()
    expect(sigmaFiscalCase('ir', bad)).toBe(-0)
    expect(thetaIrTranches(bad)).toBe(0)
  })
})

describe('dérivations internes documentées (src/engine/internal-derivations.js)', () => {
  it('ref.derive.b_autres correspond exactement à la médiane Eurostat D7 arrondie (0,03 pt/an à g_pot = 1,05 %)', () => {
    const b = deriveBAutres(P)
    expect(b.windows.length).toBe(5)
    expect(b.rawMedian).toBeCloseTo(b.window2007Implied, 10)
    expect(b.rawMedian).toBeCloseTo(0.0334, 3)
    expect(b.rounded).toBe(0.03)
    expect(PARAM_BY_ID['ref.derive.b_autres'].value).toBe(b.rounded)
    // Sensibilité à macro.g.potentielle : une croissance potentielle plus haute abaisse la dérive implicite
    const hiG = deriveBAutres(resolveParams({ 'macro.g.potentielle': 1.2 }))
    expect(hiG.rawMedian).toBeLessThan(b.rawMedian)
  })
  it('dem.m.prestations correspond exactement à l\'équivalent cumulé 4 ans FR-BDF dans E4 (0,45)', () => {
    const m = deriveMPrestations(P)
    expect(m.cum4).toBeCloseTo(1.15, 10)
    expect(m.e4Factor4).toBeCloseTo(2.533, 6)
    expect(m.frBdfEq4).toBeCloseTo(1.15 / 2.533, 10)
    expect(m.rounded).toBe(0.45)
    expect(PARAM_BY_ID['dem.m.prestations'].value).toBe(m.rounded)
    // Borne basse cohérente avec l'équivalent 2 ans (0,206)
    expect(m.frBdfEq2).toBeCloseTo(0.2059, 3)
    // Recoupements Mésange encadrant 0,45
    expect(m.mesangeIrCsgY1).toBe(0.41)
    expect(m.mesangeResidualUnit).toBeCloseTo(0.4678, 3)
    expect(m.mesangeResidualEngine).toBeCloseTo(0.6222, 3)
  })
  it('lvt.capi.part documente la non-héritabilité depuis LVTShift yields.json et conserve 0,80 [0,60 ; 1,00]', () => {
    const q = PARAM_BY_ID['lvt.capi.part']
    expect([q.low, q.value, q.high]).toEqual([0.60, 0.80, 1.00])
    expect(q.status).toBe('sourcé (fourchette), centre choisi')
    expect(q.source).toMatch(/yields\.json n'exporte aucun paramètre de capitalisation/)
    expect(q.source).toMatch(/dynamic-effects\.md §5\.4/)
  })
  it('jamais de NaN ni de sortie aberrante sur entrées invalides (g_pot non fini, λ hors [0 ; 1])', () => {
    expect(deriveBAutres({ 'macro.g.potentielle': Number.NaN })).toBeNull()
    expect(deriveBAutres({ 'macro.g.potentielle': Infinity })).toBeNull()
    expect(deriveMPrestations({ ...P, 'dem.lambda': Number.NaN })).toBeNull()
    expect(deriveMPrestations({ ...P, 'dem.lambda': -0.5 })).toBeNull()
    expect(deriveMPrestations({ ...P, 'dem.lambda': 1.2 })).toBeNull()
    expect(deriveMPrestations({ ...P, 'dem.m.remunerations': Number.NaN })).toBeNull()
    expect(deriveMPrestations({ ...P, 'dem.lambda': 0 }).frBdfEq4).toBeCloseTo(1.15, 10)
  })
})

describe('durcissement sécurité et robustesse (Gemini 4 Neon)', () => {
  it('resolveParams rejette les clés du prototype et les séries mal formées', () => {
    expect(() => resolveParams({ toString: 1 })).toThrow(/identifiant inconnu/)
    expect(() => resolveParams({ constructor: 1 })).toThrow(/identifiant inconnu/)
    expect(() => resolveParams(JSON.parse('{"__proto__": 1}'))).toThrow(/identifiant inconnu/)
    for (const bad of [null, [], {}, { 2025: NaN }, { foo: 13.7 }, { '': 13.7 }, { 2025: '13.7' }]) {
      expect(() => resolveParams({ 'ref.derive.a_retraites': bad })).toThrow(/valeur invalide/)
    }
  })
  it('divisions par zéro et dénominateurs non positifs neutralisés sans NaN ni Infinity', () => {
    expect(issuanceRate({ ...P, 'dette.part_btf': 0, 'dette.part_moyen': 0, 'dette.part_long': 0 })).toBe(0)
    expect(thetaAtRate(0.2, 0, 0.25, 'elasticite')).toBe(0)
    expect(thetaAtRate(0.2, 0, 0.25, 'is')).toBe(0)
    expect(() => projectScenario({ overrides: { 'base.pib.2025': 0 } })).toThrow(/base\.pib\.2025/)
    expect(() => projectScenario({ overrides: { 'base.pib.2025': -10 } })).toThrow(/base\.pib\.2025/)
    const rNegM = projectScenario({ overrides: { 'dette.M': -2 } })
    const rYS = projectScenario({ yS: Array(11).fill(-1.5) })
    const rCrash = projectScenario({ overrides: { 'macro.g.2026': -150, 'macro.pi.2026': 0 } })
    for (const r of [rNegM, rYS, rCrash]) {
      for (const row of r.total) {
        for (const k of ['gdp', 'gdpBase', 'balance', 'balanceRatio', 'debt', 'debtRatio', 'avgRate', 'interest']) {
          expect(Number.isFinite(row[k]), `${row.year}.${k}=${row[k]}`).toBe(true)
        }
        expect(row.gdp).toBeGreaterThan(0)
        expect(row.avgRate).toBeGreaterThanOrEqual(0)
      }
    }
  })
  it('modules : rejette les bornes inversées/non finies et les sorties nulles ou non objets', () => {
    const badBornes = { ...TEST_MODULE, leviers: [{ ...TEST_MODULE.leviers[0], bornes: [2, 1] }] }
    expect(validateModuleDefinition(badBornes).length).toBeGreaterThan(0)
    const nanBornes = { ...TEST_MODULE, leviers: [{ ...TEST_MODULE.leviers[0], bornes: [NaN, 1] }] }
    expect(validateModuleDefinition(nanBornes).length).toBeGreaterThan(0)
    const ctx = { startYear: 2026, endYear: 2036, nYears: 10, years: Array.from({ length: 11 }, (_, t) => 2026 + t), gdpBase2025: Y0, params: P }
    expect(() => runModule({ ...TEST_MODULE, calculer: () => null }, {}, ctx)).toThrow(/objet de sortie attendu/)
    expect(() => runModule({ ...TEST_MODULE, calculer: () => ({ annees: Array(11).fill(null) }) }, {}, ctx)).toThrow(/objet attendu/)
    expect(() => runModule({ ...TEST_MODULE, calculer: (v, c) => { const o = TEST_MODULE.calculer(v, c); o.annees[0].yS = null; return o } }, {}, ctx)).toThrow(/yS doit être un objet/)
    expect(() => runModule({ ...TEST_MODULE, calculer: (v, c) => ({ ...TEST_MODULE.calculer(v, c), flux: 'oops' }) }, {}, ctx)).toThrow(/flux doit être un tableau/)
  })
})

describe('Phase 3 (opt-in) : multiplicateurs de récession et inflation endogène', () => {
  it('par défaut (normal, endogenousInflation = false), le moteur reste strictement identique aux options omises', () => {
    const a = projectScenario({ levers: { tva_normal: 2, dep_defense: -10 }, horizon: 'trenteAns' })
    const b = projectScenario({ levers: { tva_normal: 2, dep_defense: -10 }, horizon: 'trenteAns', demandRegime: 'normal', endogenousInflation: false })
    expect(b.total).toEqual(a.total)
    expect(b.blocks).toEqual(a.blocks)
    expect(() => projectScenario({ demandRegime: 'inconnu' })).toThrow(/demandRegime/)
  })
  it('régimes récession / ELB / endogène : amplifient les dépenses plus que les impôts et respectent les plafonds', () => {
    expect(effectiveMultiplier('achats_invest', 0.9, 'recession', 1, P)).toBeCloseTo(0.9 * 1.35, 6)
    expect(effectiveMultiplier('achats_invest', 0.9, 'elb', 1, P)).toBeCloseTo(0.9 * 1.35 + 0.25, 6)
    expect(effectiveMultiplier('achats_invest', 5.0, 'elb', 1, P)).toBe(1.60)
    expect(effectiveMultiplier('is', 0.2, 'recession', 1, P)).toBeCloseTo(0.2, 6)
    expect(effectiveMultiplier('tva', 0.4, 'recession', 1, P)).toBeCloseTo(0.4 * 1.05, 6)

    const norm = projectScenario({ levers: { dep_affaires_eco: -10 }, demandRegime: 'normal' })
    const rec = projectScenario({ levers: { dep_affaires_eco: -10 }, demandRegime: 'recession' })
    const elb = projectScenario({ levers: { dep_affaires_eco: -10 }, demandRegime: 'elb' })
    expect(rec.total[1].yD).toBeLessThan(norm.total[1].yD)
    expect(elb.total[1].yD).toBeLessThan(rec.total[1].yD)
    // En régime endogène, un fort choc d'austérité élève u_{t-1} et active la transition logistique F_t > 0
    const endo = projectScenario({ levers: { dep_affaires_eco: -30, dep_enseignement: -30, dep_defense: -30 }, demandRegime: 'endogene' })
    expect(endo.total[2].slackProb).toBeGreaterThan(endo.total[0].slackProb)
  })
  it('inflation endogène : hausse de TVA provoque une poussée IPC (~80 % pass-through), une hausse OATi et un décalage pensions t−1 ; identités de blocs et décomposition exactes', () => {
    const base = projectScenario({ levers: { tva_tous_taux: 3 }, endogenousInflation: false })
    const infl = projectScenario({ levers: { tva_tous_taux: 3 }, endogenousInflation: true })
    // En t = 1 (2027), +3 pts de TVA tous taux (~34,2 Md€ ≈ 1,14 % PIB ≈ 2,21 % conso) -> Δπ IPC > Δπ PIB > 0
    expect(infl.total[1].deltaPiCpi).toBeGreaterThan(0.01)
    expect(infl.total[1].deltaPiCpi).toBeGreaterThan(infl.total[1].deltaPiDefl)
    expect(infl.total[1].deltaPiDefl).toBeGreaterThan(0)
    // OATi accroît les intérêts en t = 1
    expect(infl.total[1].oatiAdj).toBeGreaterThan(0)
    expect(infl.total[1].interest).toBeGreaterThan(base.total[1].interest)
    // Année 1 : gain temporaire sur pensions (déflateur monte avant l'indexation) ; année 2 : rattrapage négatif (CSS L. 161-25)
    expect(infl.total[1].inflFiscal).toBeGreaterThan(0)
    expect(infl.total[2].inflFiscal).toBeLessThan(0)
    // Clamp ±3 pts respecté même sous chocs extrêmes ; identité blocs et décomposition exactes à 1e-6
    for (const regime of DEMAND_REGIMES) {
      const r = projectScenario({ levers: { tva_tous_taux: 5, dep_affaires_eco: -30, dep_defense: -30 }, horizon: 'trenteAns', demandRegime: regime, endogenousInflation: true })
      for (let t = 0; t < r.total.length; t++) {
        const row = r.total[t]
        expect(Math.abs(row.deltaPiCpi)).toBeLessThanOrEqual(P['infl.clamp_max'] / 100 + 1e-12)
        expect(Math.abs(row.deltaPiDefl)).toBeLessThanOrEqual(P['infl.clamp_max'] / 100 + 1e-12)
        const sumBal = BLOCKS.reduce((s, b) => s + r.blocks[b][t].balance, 0)
        expect(Math.abs(sumBal - row.balance)).toBeLessThan(1e-6)
        for (const b of BLOCKS) {
          const br = r.blocks[b][t]
          expect(br.referencePrimary + br.leversExAnte + br.behavioural + br.stabilisers + br.inflation).toBeCloseTo(br.primaryBalance, 6)
        }
        if (t > 0) {
          const d = r.decomposition[t]
          const s = d.refGrowth + d.refDrift + d.leviers + d.comportement + d.stabilisateurs + d.offre.reduce((a, o) => a + o.montant, 0) + d.inflation + d.interetsTaux + d.interetsStock
          expect(s).toBeCloseTo(d.total, 6)
        }
      }
    }
  })
  it('M-01..M-05 (durcissement QA) : coin cumulé IPC/déflateur persistant sur TVA, modules sensibles au régime E4, DECOMPOSITION_LABELS.inflation et garde INT=0', () => {
    // M-01 : hausse de +2 pts TVA normale -> l'écart de niveau de prix IPC/déflateur reste négatif sur les années 2 à 10 (ne disparaît pas en t = 3)
    const tvaInfl = projectScenario({ levers: { tva_normal: 2 }, horizon: 'dixAns', endogenousInflation: true })
    expect(tvaInfl.total[1].inflFiscal).toBeGreaterThan(0)
    for (let t = 2; t <= 10; t++) expect(tvaInfl.total[t].inflFiscal).toBeLessThan(-0.5)
    // M-03 : NDC_MODULE (categorie: 'prestations') suit demandRegime, contrairement à LVT_MODULE (m: 0 explicite)
    const ndcNorm = projectScenario({ modules: [{ module: NDC_MODULE, levers: { actif: 1 } }], horizon: 'dixAns', demandRegime: 'normal' })
    const ndcRec = projectScenario({ modules: [{ module: NDC_MODULE, levers: { actif: 1 } }], horizon: 'dixAns', demandRegime: 'recession' })
    expect(Math.abs(ndcRec.total[5].yD)).toBeGreaterThan(Math.abs(ndcNorm.total[5].yD) * 1.1)
    const lvtRec = projectScenario({ modules: [{ module: LVT_MODULE, levers: { scenario: 2 } }], horizon: 'dixAns', demandRegime: 'recession' })
    expect(lvtRec.total[5].yD).toBe(0)
    // M-05 : DECOMPOSITION_LABELS contient inflation ; INT=0 neutralise interetsStock
    expect(DECOMPOSITION_LABELS.inflation).toBeTruthy()
    const zeroInt = projectScenario({ overrides: { 'dette.i_moy_2025': 0, 'dette.y_btf': 0, 'dette.y_moyen': 0, 'dette.y_long': 0, 'dette.beta': 0 } })
    expect(zeroInt.total[2].interest).toBe(0)
    expect(zeroInt.decomposition[2].interetsStock).toBe(0)
  })
})



