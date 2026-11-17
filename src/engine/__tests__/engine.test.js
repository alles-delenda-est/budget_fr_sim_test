import { describe, it, expect } from 'vitest'
import { PARAMS, STATUSES, resolveParams } from '../params.js'
import { LEVERS, LEVER_BY_ID, staticYield, thetaElasticity, leverTheta, BLOCKS } from '../levers.js'
import { projectScenario, HORIZONS } from '../project.js'
import { TEST_MODULE, validateModuleDefinition } from '../modules.js'

const P = resolveParams()
const Y0 = P['base.pib.2025']

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
  for (const [id, { x, md }] of Object.entries(YARDSTICKS)) {
    it(`${id} restitue son étalon à 0,1 Md€ près`, () => {
      const r = projectScenario({ levers: { [id]: x }, overrides: { 'fisc.eps': 0 } })
      const a1 = BLOCKS.reduce((s, b) => s + r.blocks[b][1].leversExAnte, 0) / r.total[1].gdpBase * Y0
      expect(a1).toBeCloseTo(md, 0)
      expect(Math.abs(a1 - md)).toBeLessThan(0.1)
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

describe('multiplicateurs (E4)', () => {
  for (const l of LEVERS) {
    it(`${l.id} : multiplicateur cumulé sur 10 ans < m, égal à m(1−λ^T)/((1−λ)T)`, () => {
      const m = P[`dem.m.${l.categorie}`]
      const lambda = P['dem.lambda']
      // a = 1 % du PIB, injecté via un module qui porte la catégorie d'instrument (les bornes des leviers natifs sont plus étroites)
      const mod = { ...TEST_MODULE, leviers: [{ ...TEST_MODULE.leviers[0], bornes: [-1, 1] }, TEST_MODULE.leviers[1]],
        calculer: (v, c) => ({ annees: Array.from({ length: c.nYears + 1 }, (_, t) => ({ a: { centrales: t >= 1 ? 0.01 : 0, securiteSociale: 0, locales: 0 }, theta: 0, categorie: l.categorie })) }) }
      const r = projectScenario({ modules: [{ module: mod, levers: {} }], overrides: { 'fisc.eps': 0 } })
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
      horizon: 'trenteAns',
    })
    expect(Math.min(...r.total.map((x) => x.balance))).toBeLessThan(Infinity)
    expect(r.total[r.total.length - 1].balance).toBeGreaterThan(0)
    // E9 est linéaire en dette/PIB : la prime est négative ou nulle dès que le ratio de la veille est sous celui de 2026.
    const ref = r.total[0].debtRatio
    for (let t = 1; t < r.total.length; t++) {
      if (r.total[t - 1].debtRatio <= ref) {
        expect(r.total[t].riskPremium).toBeLessThanOrEqual(1e-12)
        expect(r.total[t].newRate).toBeLessThanOrEqual(P['dette.i_star'] / 100 + 1e-12)
      }
    }
    const last = r.total[r.total.length - 1]
    expect(last.riskPremium).toBeLessThan(0)
    expect(r.total[0].riskPremium).toBe(0)
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
  it('θ = 0 pour une dépense, sauf décalage optionnel sur les prestations', () => {
    expect(leverTheta(LEVER_BY_ID.dep_defense, -5, P)).toBe(0)
    expect(leverTheta(LEVER_BY_ID.indexation_pensions, -1, P)).toBe(0)
    expect(leverTheta(LEVER_BY_ID.indexation_pensions, -1, resolveParams({ 'comp.offset.prestations': 0.2 }))).toBe(0.2)
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
      const s = d.refGrowth + d.refDrift + d.leviers + d.comportement + d.stabilisateurs + d.interetsTaux + d.interetsStock
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
    const o = { 'fisc.eps': 0 }
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
  it('σ du cœur : nul par défaut, appliqué quand il est fourni', () => {
    const base = projectScenario({ levers: { is: -2 } })
    expect(base.total[5].yS).toBe(0)
    const r = projectScenario({ levers: { is: -2 }, sigma: { is: { sigma: -1, L: 10 } } })
    expect(r.total[5].yS).not.toBe(0)
  })
  it('un module non conforme est refusé', () => {
    expect(validateModuleDefinition({ id: 'x' }).length).toBeGreaterThan(0)
  })
})
