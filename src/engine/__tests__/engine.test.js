import { describe, it, expect } from 'vitest'
import { PARAMS, PARAM_BY_ID, STATUSES, resolveParams } from '../params.js'
import { LEVERS, LEVER_BY_ID, STRUCTURAL_LEVERS, staticYield, thetaElasticity, leverTheta, BLOCKS } from '../levers.js'
import { projectScenario, HORIZONS, issuanceRate, deepFreeze } from '../project.js'
import { TEST_MODULE, validateModuleDefinition } from '../modules.js'
import { supplyPhase } from '../supply.js'

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
  travail_assurance_chomage: { x: -1, md: 0.372 },
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
    expect(r[1].primaryBalanceRatio * 100).toBeCloseTo(-2.8, 1)
    const gouv = P['cmp.gouv.solde.2027'] + P['cmp.gouv.interets.2027'] // −2,1
    expect(gouv).toBeCloseTo(-2.1, 10)
    expect(r[1].primaryBalanceRatio * 100 - gouv).toBeLessThan(-0.5) // écart rapporté, non comblé
    const ce = P['cmp.ce.solde.2027'] + P['cmp.ce.interets.2027'] // −2,9 (Commission, printemps 2026)
    expect(Math.abs(r[1].primaryBalanceRatio * 100 - ce)).toBeLessThan(0.2)
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
    const rows = yRows({ levers: { tva_tous_taux: 5, csg: 3, ir: 30, is: 10, cotis_patronales: 5, dep_enseignement: -30, dep_affaires_eco: -30 } })
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

describe('E5 : forme fonctionnelle de l\'effet d\'offre (σ, σ_hausse / σ_baisse, L, t0)', () => {
  const yS = (r) => r.total.map((x) => x.yS)
  it('σ = 0 : résultat identique à l\'absence d\'effet d\'offre', () => {
    const levers = { tva_normal: 2, is: -2, dep_defense: -10 }
    const base = projectScenario({ levers })
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
    const base = projectScenario({ levers: { tva_normal: 1 } })
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
    const r = projectScenario({ levers: { is: -2 } })
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
    expect(triple('offre.sigma.tva')).toEqual([-0.10, 0, 0])
    expect(P['offre.lag.tva']).toBe(5)
    expect(triple('offre.sigma.age_legal')).toEqual([0.15, 0.30, 0.50])
    expect([P['offre.lag.age_legal'], P['offre.t0.age_legal']]).toEqual([6, 0])
    expect(triple('offre.sigma.lvt')).toEqual([0.10, 0.20, 0.45])
    expect([P['offre.lag.lvt'], P['offre.t0.lvt']]).toEqual([12, 1])
    for (const id of ['ir', 'is', 'cotis', 'csg']) expect(triple(`offre.sigma.${id}`)).toEqual([0, 0, 0])
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
  it('TVA : centre nul ; bas négatif pour un relèvement ; « tous taux » mis à l\'échelle des rendements', () => {
    const run = (levers, ysCase) => projectScenario({ levers, ysCase })
    expect(run({ tva_normal: 1 }, 'central').supply.lignes).toEqual([])
    expect(yS(run({ tva_normal: 1 }, 'bas'))[6]).toBeCloseTo(-0.001, 10) // τ = 5 = L
    expect(yS(run({ tva_normal: 1 }, 'bas'))[3]).toBeCloseTo(-0.001 * 0.4, 10) // τ = 2
    expect(yS(run({ tva_tous_taux: 1 }, 'bas'))[6]).toBeCloseTo(-0.001 * (P['rend.tva_tous_taux'] / P['rend.tva_normal']), 10)
    expect(yS(run({ tva_normal: 1 }, 'haut'))[6]).toBe(0)
    // baisse du taux : le cas « bas » reste le PIB le plus bas (aucun gain), « haut » porte le gain symétrique
    expect(yS(run({ tva_normal: -1 }, 'bas'))[6]).toBe(0)
    expect(yS(run({ tva_normal: -1 }, 'haut'))[6]).toBeCloseTo(0.001, 10)
  })
  it('leviers fiscaux : σ = 0 par défaut, mais la forme E5 porte une valeur si on la fournit', () => {
    for (const [id, x] of [['ir', 5], ['is', -2], ['cotis_patronales', 1], ['csg', 1]]) {
      expect(projectScenario({ levers: { [id]: x } }).supply.lignes).toEqual([])
    }
    const r = projectScenario({ levers: { is: -2 }, overrides: { 'offre.sigma.is': 0.15 } })
    expect(r.supply.lignes.map((l) => l.id)).toEqual(['is'])
    expect(yS(r)[8]).toBeCloseTo((0.15 * -2) / 100, 10) // L = 7, t0 = 1 : τ = 7 -> plein effet
    expect(yS(r)[2]).toBe(0) // τ = 1 = t0
  })
  it('chaque effet d\'offre du registre est une ligne étiquetée avec cas et source', () => {
    for (const id of Object.keys(P).filter((k) => k.startsWith('offre.sigma.') && k !== 'offre.sigma.defaut')) {
      const q = PARAM_BY_ID[id]
      expect(q.unit).toMatch(/PIB/)
      expect(q.source.length).toBeGreaterThan(10)
      expect(q.explanation.length).toBeGreaterThan(20)
    }
  })
})

describe('assurance chômage : levier de dépense actif', () => {
  const yS = (r) => r.total.map((x) => x.yS)
  it('n\'est plus un levier structurel inactif ; les trois autres restent inactifs avec σ = 0', () => {
    expect(STRUCTURAL_LEVERS.map((l) => l.id)).toEqual(['logement_offre', 'logement_loyers', 'travail_licenciement'])
    expect(STRUCTURAL_LEVERS.every((l) => l.actif === false)).toBe(true)
    const l = LEVER_BY_ID.travail_assurance_chomage
    expect([l.unite, l.min, l.max, l.type, l.signe, l.categorie]).toEqual(['% de la ligne', -30, 30, 'depense', -1, 'prestations'])
    expect(P['base.unedic.allocations']).toBe(37.2)
  })
  it('plus de générosité = plus de dépense, dans le seul bloc sécurité sociale ; resserrement = économie', () => {
    const base = projectScenario({})
    const more = projectScenario({ levers: { travail_assurance_chomage: 10 }, overrides: { 'fisc.eps': 0 } })
    const less = projectScenario({ levers: { travail_assurance_chomage: -10 }, overrides: { 'fisc.eps': 0 } })
    const Yb = more.total[2].gdpBase
    expect(more.blocks.securiteSociale[2].leversExAnte / Yb * Y0).toBeCloseTo(-3.72, 6)
    expect(less.blocks.securiteSociale[2].leversExAnte / Yb * Y0).toBeCloseTo(3.72, 6)
    for (const r of [more, less]) for (const b of ['centrales', 'locales']) expect(r.blocks[b][2].leversExAnte).toBe(0)
    expect(more.total[3].balance).toBeLessThan(projectScenario({ overrides: { 'fisc.eps': 0 } }).total[3].balance)
    expect(less.total[3].balance).toBeGreaterThan(projectScenario({ overrides: { 'fisc.eps': 0 } }).total[3].balance)
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
    expect(q.high).toBeCloseTo(1.0 / 48, 10)
    expect(q.explanation).toMatch(/double comptage/)
    expect(P['ref.derive.b_autres']).toBe(0) // aucune autre composante de dérive ne porte la longue durée
    const hi = projectScenario({ overrides: { 'ref.derive.a_sante': q.high } })
    const base = projectScenario({})
    // la dérive supplémentaire est portée par la seule sécurité sociale
    for (const b of ['centrales', 'locales']) expect(hi.blocks[b][5].referencePrimary).toBeCloseTo(base.blocks[b][5].referencePrimary, 8)
    expect(hi.blocks.securiteSociale[5].referencePrimary).toBeLessThan(base.blocks.securiteSociale[5].referencePrimary)
  })
})
