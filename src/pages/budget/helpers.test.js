import { describe, it, expect } from 'vitest'
import { projectScenario, HORIZONS } from '../../engine/project.js'
import { LEVERS, STRUCTURAL_LEVERS } from '../../engine/levers.js'
import { PARAM_BY_ID } from '../../engine/params.js'
import { NDC_MODULE } from '../../engine/ndc-module.js'
import { LVT_MODULE } from '../../engine/lvt-module.js'
import {
  fmt, num, buildSeries, snapshotAt, decomposeAtYear, visibleLines, blocksAt, paramIdsFor, groupedLevers,
  extremeLevers, hasSupplyEffect, mayHaveSupplySpread, moduleBlockRows, deltaTone, isFlagged, paramRange, leverGroup, sliderStep, debtMovesAgainstBalance, niceAxis, YEAR1_PARADOX_TEXT,
  fmtJobs, jobsNote, FISCAL_BENCHMARKS, debtStabilizingAt, evaluateFiscalTargets, defaultScenarioLabel, scenariosEqual,
} from './helpers.js'
import { resolveParams } from '../../engine/params.js'
import { NEUTRAL_SCENARIOS, overridesForMacro } from './presets.js'

const EPS = PARAM_BY_ID['fisc.eps'].value
const EPS_OFFRE = PARAM_BY_ID['fisc.eps_offre'].value
const run = (levers, ysCase = 'central', horizon = 'dixAns') => ({
  r: projectScenario({ levers, horizon, ysCase }), ref: projectScenario({ levers: {}, horizon, ysCase }),
})

describe('formats', () => {
  it('formate en français et ne montre jamais NaN', () => {
    expect(fmt(1234.56, 1)).toMatch(/^1\s?234,6$/)
    expect(fmt(NaN)).toBe('—')
    expect(fmt(Infinity)).toBe('—')
    expect(fmt(undefined)).toBe('—')
    expect(fmt(2, 1, { signed: true })).toBe('+2,0')
    expect(fmt(-0.00001, 1)).toBe('0,0')
    expect(num(NaN)).toBeNull()
  })
  it('classe l\'écart en mieux / moins bien', () => {
    expect(deltaTone(-1, true)).toBe('mieux')
    expect(deltaTone(-1, false)).toBe('moins-bien')
    expect(deltaTone(0.01, true)).toBe('neutre')
    expect(deltaTone(NaN, true)).toBe('neutre')
  })
  it('signale les statuts non sourcés', () => {
    expect(['de mémoire', 'à collecter', 'non validé'].every(isFlagged)).toBe(true)
    expect(isFlagged('sourcé')).toBe(false)
    expect(paramRange(PARAM_BY_ID['fisc.eps'])).not.toMatch(/NaN/)
  })
})

describe('leviers', () => {
  it('répartit tous les leviers en trois groupes', () => {
    const groups = groupedLevers()
    expect(groups.map((g) => g.id)).toEqual(['recettes', 'depenses', 'prestations'])
    expect(groups.flatMap((g) => g.leviers).length).toBe(LEVERS.length)
    groups.forEach((g) => expect(g.leviers.length).toBeGreaterThan(0))
    expect(leverGroup(LEVERS.find((l) => l.id === 'ondam'))).toBe('prestations')
    const age = LEVERS.find((l) => l.id === 'age_legal')
    expect(leverGroup(age)).toBe('prestations')
    expect(sliderStep(age)).toBe(0.5)
  })
  it('les leviers structurels restent inactifs', () => {
    STRUCTURAL_LEVERS.forEach((l) => expect(l.actif).toBe(false))
  })
})

describe('séries et fiches', () => {
  it('les séries couvrent l\'horizon et ne contiennent aucun NaN', () => {
    for (const h of Object.keys(HORIZONS)) {
      for (const which of ['min', 'max']) {
        const { r, ref } = run(extremeLevers(which), 'haut', h)
        const s = buildSeries(r, ref)
        expect(s.length).toBe(r.years.length)
        for (const row of s) for (const v of Object.values(row)) expect(Number.isFinite(v)).toBe(true)
        const snap = snapshotAt(r, ref, r.years.length - 1)
        for (const v of Object.values(snap)) expect(Number.isFinite(v)).toBe(true)
      }
    }
  })
  it('à leviers nuls, scénario = référence', () => {
    const { r, ref } = run({})
    const snap = snapshotAt(r, ref, 5)
    expect(snap.debtDelta).toBeCloseTo(0, 9)
    expect(snap.interestDelta).toBeCloseTo(0, 9)
  })
})

describe('décomposition par cause', () => {
  it('la somme des lignes égale l\'écart de solde, pour tous les cas', () => {
    for (const ysCase of ['bas', 'central', 'haut']) {
      const { r, ref } = run({ tva_normal: -5, dep_enseignement: -30, csg: 2, travail_assurance_chomage: 10 }, ysCase)
      for (const t of [1, 5, 10]) {
        const d = decomposeAtYear(r, ref, t, EPS, EPS_OFFRE)
        expect(d.lines.reduce((s, l) => s + l.montant, 0)).toBeCloseTo(d.ecart, 6)
      }
    }
  })
  it('masque l\'éducation σ au cas central ; une coupe la montre au cas bas, une hausse au cas haut', () => {
    const lv = { dep_enseignement: -20 }
    const c = run(lv, 'central', 'trenteAns')
    const central = decomposeAtYear(c.r, c.ref, 25, EPS, EPS_OFFRE)
    expect(visibleLines(central.lines).some((l) => l.kind === 'offre')).toBe(false)
    const b = run(lv, 'bas', 'trenteAns')
    const offre = visibleLines(decomposeAtYear(b.r, b.ref, 25, EPS, EPS_OFFRE).lines).filter((l) => l.kind === 'offre')
    expect(offre.length).toBe(1)
    expect(offre[0].label).toBe('Effet d\'offre (cas bas) : Dépenses d\'enseignement')
    expect(offre[0].montant).toBeLessThan(0)
    const h = run({ dep_enseignement: 20 }, 'haut', 'trenteAns')
    const up = visibleLines(decomposeAtYear(h.r, h.ref, 25, EPS, EPS_OFFRE).lines).filter((l) => l.kind === 'offre')
    expect(up.length).toBe(1)
    expect(up[0].montant).toBeGreaterThan(0)
  })
  it('étiquette l\'effet d\'offre de la TVA : gain d\'une baisse, au cas haut comme au cas bas (σ non nul dans les trois cas)', () => {
    const haut = run({ tva_normal: -3 }, 'haut')
    const offre = visibleLines(decomposeAtYear(haut.r, haut.ref, 8, EPS, EPS_OFFRE).lines).filter((l) => l.kind === 'offre')
    expect(offre.length).toBe(1)
    expect(offre[0].label).toBe('Effet d\'offre (cas haut) : TVA, taux normal')
    expect(offre[0].montant).toBeGreaterThan(0)
  })
  it('une hausse de TVA montre sa perte d\'offre au cas bas', () => {
    const { r, ref } = run({ tva_normal: 3 }, 'bas')
    const offre = visibleLines(decomposeAtYear(r, ref, 8, EPS, EPS_OFFRE).lines).filter((l) => l.kind === 'offre')
    expect(offre.length).toBe(1)
    expect(offre[0].montant).toBeLessThan(0)
  })
  it('IR : l\'effet d\'offre est étiqueté « non validé — avis demandé » dans la décomposition', () => {
    const { r, ref } = run({ ir: 10 }, 'central', 'trenteAns')
    const offre = decomposeAtYear(r, ref, 25, EPS, EPS_OFFRE).lines.filter((l) => l.kind === 'offre')
    expect(offre.length).toBe(1)
    expect(offre[0].label).toBe('Effet d\'offre de l\'IR (cas central) : non validé — avis demandé')
    expect(r.supply.lignes[0].statut).toBe('non validé')
  })
  it('sans levier : aucune ligne visible', () => {
    const { r, ref } = run({})
    expect(visibleLines(decomposeAtYear(r, ref, 5, EPS, EPS_OFFRE).lines)).toEqual([])
  })
  it('filtre les lignes nulles et non finies', () => {
    const lines = [{ montant: 0 }, { montant: 0.01 }, { montant: -2 }, { montant: NaN }, { montant: 0.05 }]
    expect(visibleLines(lines).map((l) => l.montant)).toEqual([-2, 0.05])
  })
})

describe('décomposition : somme égale écart de solde (scénario − référence)', () => {
  const LEVER_SETS = {
    aucun: {},
    tva: { tva_normal: 3 },
    mixte: { tva_normal: -5, dep_enseignement: -30, csg: 2, travail_assurance_chomage: 10, ir: -10 },
    minimum: extremeLevers('min'),
    maximum: extremeLevers('max'),
  }
  for (const [nom, levers] of Object.entries(LEVER_SETS)) {
    for (const ysCase of ['bas', 'central', 'haut']) {
      it(`${nom}, cas ${ysCase} : toutes les années`, () => {
        const { r, ref } = run(levers, ysCase)
        for (let t = 1; t < r.years.length; t++) {
          const d = decomposeAtYear(r, ref, t, EPS, EPS_OFFRE)
          const ecartAttendu = r.total[t].balance - ref.total[t].balance
          expect(d.ecart).toBeCloseTo(ecartAttendu, 6)
          expect(d.lines.reduce((s, l) => s + l.montant, 0)).toBeCloseTo(ecartAttendu, 6)
        }
      })
    }
  }
  it('tient aussi sur l\'horizon de trente ans', () => {
    const { r, ref } = run(LEVER_SETS.mixte, 'haut', 'trenteAns')
    for (const t of [1, 10, 20, r.years.length - 1]) {
      const d = decomposeAtYear(r, ref, t, EPS, EPS_OFFRE)
      expect(d.lines.reduce((s, l) => s + l.montant, 0)).toBeCloseTo(r.total[t].balance - ref.total[t].balance, 6)
    }
  })
  it('reste exacte quand un comparateur macroéconomique est actif (seul ou avec leviers)', () => {
    const overrides = overridesForMacro('gouv_resf_2027')
    for (const levers of [{}, { tva_normal: 2, ondam: -2, age_legal: 1 }]) {
      const ref = projectScenario({ levers: {}, horizon: 'trenteAns', ysCase: 'central' })
      const r = projectScenario({ levers, overrides, horizon: 'trenteAns', ysCase: 'central' })
      for (const t of [0, 1, 5, 10, 20, 30]) {
        const d = decomposeAtYear(r, ref, t, EPS, EPS_OFFRE)
        expect(d.lines.some((l) => l.kind === 'macro')).toBe(true)
        expect(d.lines.reduce((s, l) => s + l.montant, 0)).toBeCloseTo(d.ecart, 6)
      }
    }
  })
  it('affiche le titre français d\'un module actif (NDC_MODULE) et conserve une somme exacte', () => {
    const ref = projectScenario({ levers: {}, horizon: 'trenteAns', ysCase: 'central' })
    const r = projectScenario({
      levers: { age_legal: 1 },
      modules: [{ module: NDC_MODULE, levers: { actif: 1 } }],
      horizon: 'trenteAns',
      ysCase: 'central',
    })
    for (const t of [1, 10, 20, 30]) {
      const d = decomposeAtYear(r, ref, t, EPS, EPS_OFFRE)
      expect(d.lines.reduce((s, l) => s + l.montant, 0)).toBeCloseTo(d.ecart, 6)
    }
    const d30 = decomposeAtYear(r, ref, 30, EPS, EPS_OFFRE)
    const staticNdc = d30.lines.find((l) => l.key === `static:${NDC_MODULE.id}`)
    expect(staticNdc?.label).toBe(`${NDC_MODULE.titre} : effet statique`)
    expect(staticNdc?.montant).toBeGreaterThan(0)
  })
})

describe('indication « sans effet d\'offre »', () => {
  it('sans levier ou avec un σ nul dans le cas choisi : pas d\'effet d\'offre', () => {
    expect(hasSupplyEffect(run({}).r)).toBe(false)
    expect(hasSupplyEffect(run({ dep_defense: 3 }, 'central').r)).toBe(false)
    expect(hasSupplyEffect(run({ dep_enseignement: 10 }, 'central').r)).toBe(false)
    expect(hasSupplyEffect(run({ tva_normal: 3 }, 'central').r)).toBe(true)
  })
  it('un σ non nul dans le cas choisi donne un effet d\'offre', () => {
    expect(hasSupplyEffect(run({ tva_normal: 3 }, 'bas').r)).toBe(true)
    expect(hasSupplyEffect(run({ dep_enseignement: 20 }, 'haut').r)).toBe(true)
  })
})

describe('blocs et paramètres', () => {
  it('la somme des soldes de bloc est cohérente et finie', () => {
    const { r, ref } = run({ ir: 10, dep_defense: 10 })
    const b = blocksAt(r, ref, 5)
    expect(b.map((x) => x.id)).toEqual(['centrales', 'securiteSociale', 'locales'])
    b.forEach((x) => expect(Number.isFinite(x.balance)).toBe(true))
  })
  it('les paramètres à expliquer existent tous et portent source et statut', () => {
    const { r } = run({ tva_normal: 1, csg: 1, ir: 5, dep_enseignement: -5 }, 'haut')
    const ids = paramIdsFor({ tva_normal: 1, csg: 1, ir: 5, dep_enseignement: -5 }, r)
    expect(ids).toContain('comp.theta.tva')
    expect(ids).toContain('offre.e_L')
    expect(ids).toContain('base.conso_menages')
    for (const id of ids) {
      expect(PARAM_BY_ID[id].status).toBeTruthy()
      expect(PARAM_BY_ID[id].explanation).toBeTruthy()
    }
    const { r: rAge, ref: refAge } = run({ age_legal: 1 }, 'central')
    const ageIds = paramIdsFor({ age_legal: 1 }, rAge)
    expect(ageIds).toContain('rend.age_legal.hausse')
    expect(ageIds).toContain('rend.age_legal.baisse')
    expect(ageIds).toContain('comp.offset.age_legal')
    expect(ageIds).toContain('offre.sigma.age_legal')
    expect(ageIds).toContain('offre.lag.age_legal')
    const dAge = decomposeAtYear(rAge, refAge, 8, EPS, EPS_OFFRE)
    expect(dAge.lines.reduce((s, l) => s + l.montant, 0)).toBeCloseTo(dAge.ecart, 6)
    expect(visibleLines(dAge.lines).some((l) => l.key === 'offre:age_legal' && l.montant > 0)).toBe(true)
    const behavAge = dAge.lines.find((l) => l.key === 'behav:age_legal')
    expect(behavAge?.label).toBe('Âge légal de départ en retraite : effets de report (autres prestations)')
    expect(behavAge?.montant).toBeLessThan(0)
    // M-06 & M-09 : indexation_pensions expose comp.offset.prestations et des libellés comportementaux distincts
    const { r: rPen, ref: refPen } = run({ indexation_pensions: -1, sous_indexation_ciblee: -1 }, 'central')
    expect(paramIdsFor({ indexation_pensions: -1 }, rPen)).toContain('comp.offset.prestations')
    const dPen = decomposeAtYear(rPen, refPen, 5, EPS, EPS_OFFRE)
    expect(dPen.lines.find((l) => l.key === 'behav:indexation_pensions')?.label).toContain('retour fiscal et aides (IR/CSG/ASPA/APL)')
    expect(dPen.lines.find((l) => l.key === 'behav:sous_indexation_ciblee')?.label).toContain('retour fiscal hautes pensions (IR/CSG)')
    // M-02 : inflation endogène sans comparateur macro ne crée aucune fausse ligne « macro »
    const refInf = projectScenario({ levers: {}, horizon: 'dixAns', endogenousInflation: true })
    const rInf = projectScenario({ levers: { tva_normal: 2 }, horizon: 'dixAns', endogenousInflation: true })
    const dInf = decomposeAtYear(rInf, refInf, 5, EPS, EPS_OFFRE)
    expect(dInf.lines.some((l) => l.kind === 'macro')).toBe(false)
    expect(dInf.lines.some((l) => l.kind === 'inflation')).toBe(true)
    expect(dInf.lines.reduce((s, l) => s + l.montant, 0)).toBeCloseTo(dInf.ecart, 6)
  })
})

describe('paradoxe de la première année (relance : dette/PIB en baisse malgré un solde dégradé)', () => {
  const STIMULUS = { dep_enseignement: 30, dep_defense: 30, dep_ordre_securite: 30, dep_affaires_eco: 30 }
  it('relance forte : solde dégradé, dette/PIB sous la référence en 2027, puis l\'effet s\'inverse', () => {
    const { r, ref } = run(STIMULUS)
    const y1 = snapshotAt(r, ref, 1)
    expect(y1.balanceDelta).toBeLessThan(-0.01)
    expect(y1.debtDelta).toBeLessThan(-0.01)
    expect(debtMovesAgainstBalance(y1)).toBe(true)
    const y5 = snapshotAt(r, ref, 5)
    expect(y5.debtDelta).toBeGreaterThan(0)
    expect(debtMovesAgainstBalance(y5)).toBe(false)
  })
  it('hausse de TVA ordinaire : dette et solde évoluent en sens inverse, pas de ligne d\'explication', () => {
    const { r, ref } = run({ tva_normal: 5 })
    expect(debtMovesAgainstBalance(snapshotAt(r, ref, 1))).toBe(false)
  })
  it('condition : mêmes signes non négligeables seulement ; écarts nuls, négligeables ou non finis exclus', () => {
    expect(debtMovesAgainstBalance({ debtDelta: -0.5, balanceDelta: -0.7 })).toBe(true)
    // cas symétrique (austérité) : solde meilleur, ratio de dette plus haut car le PIB baisse
    expect(debtMovesAgainstBalance({ debtDelta: 0.4, balanceDelta: 0.6 })).toBe(true)
    expect(debtMovesAgainstBalance({ debtDelta: 0.5, balanceDelta: 0.7 })).toBe(true)
    expect(debtMovesAgainstBalance({ debtDelta: 0.5, balanceDelta: -0.7 })).toBe(false)
    expect(debtMovesAgainstBalance({ debtDelta: -0.5, balanceDelta: 0.7 })).toBe(false)
    expect(debtMovesAgainstBalance({ debtDelta: 0, balanceDelta: -0.7 })).toBe(false)
    expect(debtMovesAgainstBalance({ debtDelta: -0.005, balanceDelta: -0.7 })).toBe(false)
    expect(debtMovesAgainstBalance({ debtDelta: NaN, balanceDelta: -0.7 })).toBe(false)
    expect(debtMovesAgainstBalance({ debtDelta: null, balanceDelta: -0.7 })).toBe(false)
    expect(debtMovesAgainstBalance(null)).toBe(false)
  })
  it('texte demandé', () => {
    expect(YEAR1_PARADOX_TEXT).toBe('La dette rapportée au PIB peut évoluer à l\'inverse du solde la première année : la mesure modifie aussi le PIB (dénominateur), dans le même sens que la dette. L\'effet s\'inverse ensuite.')
  })
})

describe('axe vertical « rond » (niceAxis)', () => {
  it('l\'exemple relevé en revue (82 → 503) donne des multiples de 100', () => {
    const a = niceAxis(82, 503, { minStep: 10 })
    expect(a.ticks).toEqual([0, 100, 200, 300, 400, 500, 600])
    expect(a.domain).toEqual([0, 600])
  })
  it('petite plage : pas de 10 au moins ; plage nulle : une graduation d\'écart', () => {
    expect(niceAxis(112, 128, { minStep: 10 }).ticks).toEqual([110, 120, 130])
    expect(niceAxis(100, 100, { minStep: 10 }).domain).toEqual([100, 110])
  })
  it('bornes non finies : null ; toutes les graduations contiennent les bornes', () => {
    expect(niceAxis(NaN, 5)).toBeNull()
    for (const [lo, hi] of [[115, 467], [60, 260], [90, 1240], [119.3, 121.7]]) {
      const a = niceAxis(lo, hi, { minStep: 10 })
      expect(a.domain[0]).toBeLessThanOrEqual(lo)
      expect(a.domain[1]).toBeGreaterThanOrEqual(hi)
      expect(a.ticks.length).toBeLessThanOrEqual(8)
      expect(a.ticks.every((t) => t % a.step === 0)).toBe(true)
    }
  })
})

describe('sorties d\'un module par bloc (D9)', () => {
  it('flux bruts et effet net par bloc, bloc local compris ; effet net = écart de leversExAnte', () => {
    const r = projectScenario({ modules: [{ module: LVT_MODULE, levers: { scenario: 4 } }] })
    const ref = projectScenario({})
    const rows = moduleBlockRows(r, 5, LVT_MODULE.id)
    expect(rows.map((b) => b.id)).toEqual(['centrales', 'securiteSociale', 'locales'])
    const loc = rows.find((b) => b.id === 'locales')
    expect(loc.flux.length).toBe(4)
    expect(loc.net).toBeLessThan(0) // part locale de la capitalisation (D12, au prorata du produit)
    for (const b of rows) {
      expect(b.net).toBeCloseTo(r.blocks[b.id][5].leversExAnte - ref.blocks[b.id][5].leversExAnte, 9)
      for (const f of b.flux) expect(Number.isFinite(f.montant) && Number.isFinite(f.pct)).toBe(true)
    }
    expect(rows.find((b) => b.id === 'securiteSociale').net).toBeLessThan(0)
    // 2026 : aucun flux (effet dès 2027) ; module absent : lignes vides et nettes nulles
    expect(moduleBlockRows(r, 0, LVT_MODULE.id).every((b) => b.flux.length === 0)).toBe(true)
    expect(moduleBlockRows(ref, 5, LVT_MODULE.id).every((b) => b.flux.length === 0 && b.net === 0)).toBe(true)
  })
})

describe('note « emplois implicites » du levier âge légal', () => {
  const P = Object.fromEntries(Object.values(PARAM_BY_ID).map((q) => [q.id, q.value]))
  it('formate les emplois en français, signe facultatif, jamais NaN', () => {
    expect(fmtJobs(160000)).toMatch(/^160\s000$/)
    expect(fmtJobs(-90000)).toMatch(/^[-−]90\s000$/)
    expect(fmtJobs(320000, { signed: true })).toMatch(/^\+320\s000$/)
    expect(fmtJobs(0, { signed: true })).toBe('0')
    expect(fmtJobs(NaN)).toBe('—')
  })
  it('lit σ, les emplois arrondis et la fourchette du COR dans les paramètres, selon le cas', () => {
    const c = jobsNote('age_legal', 0, P, 'central')
    expect(c).toMatchObject({ caseLabel: 'central', sigma: 0.5, jobsPerUnit: 160000, jobsForX: 0 })
    expect(c.range).toMatchObject({ low: 160000, high: 250000 })
    expect(jobsNote('age_legal', 1, P, 'bas')).toMatchObject({ caseLabel: 'bas', sigma: 0.3, jobsPerUnit: 90000 })
    expect(jobsNote('age_legal', 1, P, 'haut')).toMatchObject({ caseLabel: 'haut', sigma: 0.7, jobsPerUnit: 220000 })
    expect(jobsNote('age_legal', 2, P).jobsForX).toBe(320000)
    expect(jobsNote('age_legal', -2, P).jobsForX).toBe(-320000)
    // baisse : σ appliqué par le moteur dans ce sens (« haut » = PIB le plus haut = σ bas pour une baisse)
    expect(jobsNote('age_legal', -2, P, 'haut')).toMatchObject({ sigma: 0.3, jobsPerUnit: 90000, jobsForX: -190000 })
    expect(jobsNote('age_legal', -1, P, 'bas')).toMatchObject({ sigma: 0.7, jobsPerUnit: 220000, jobsForX: -220000 })
    expect(jobsNote('tva_normal', 1, P)).toBeNull()
  })
})

describe('repères budgétaires français et européens (sp*, Maastricht −3 %, règle UE DPN 2026–2029)', () => {
  const P0 = resolveParams()

  it('vérifie l\'identité exacte en temps discret Δ(D/Y)_t ≡ sp*(t) − sp(t) sur tous les horizons, régimes, modules et inflations', () => {
    expect(FISCAL_BENCHMARKS.maastrichtDeficitPct).toBe(-3)
    expect(FISCAL_BENCHMARKS.maastrichtDebtPct).toBe(60)
    expect(FISCAL_BENCHMARKS.netExpCeilingsPct).toEqual({ 2026: 1.2, 2027: 1.2, 2028: 1.2, 2029: 1.1 })

    const configs = [
      { levers: {}, horizon: 'dixAns' },
      { levers: extremeLevers('min'), horizon: 'dixAns', ysCase: 'bas' },
      { levers: extremeLevers('max'), horizon: 'trenteAns', ysCase: 'haut' },
      { levers: { tva_tous_taux: 3, dep_affaires_eco: -20 }, horizon: 'jusqua2040', demandRegime: 'recession', endogenousInflation: true, phasingYears: 3 },
      { levers: { age_legal: 1 }, modules: [{ module: NDC_MODULE, levers: { actif: 1 } }, { module: LVT_MODULE, levers: { scenario: 4 } }], horizon: 'trenteAns' },
    ]
    for (const cfg of configs) {
      const r = projectScenario(cfg)
      const baseRatio2025 = P0['base.dette.2025'] / P0['base.pib.2025']
      for (let t = 0; t < r.total.length; t++) {
        const sp = debtStabilizingAt(r, P0, t)
        const prevRatio = t === 0 ? baseRatio2025 : r.total[t - 1].debtRatio
        const actualDeltaPp = (r.total[t].debtRatio - prevRatio) * 100
        expect(sp.effortGapPct).toBeCloseTo(actualDeltaPp, 11)
        expect((sp.effortGapMd / r.total[t].gdp) * 100).toBeCloseTo(sp.effortGapPct, 11)
      }
    }
    // Sur la référence sans levier ni inflation endogène : sp* ex post et sp* tendanciel coïncident exactement
    const ref = projectScenario({ horizon: 'dixAns' })
    for (let t = 0; t < ref.total.length; t++) {
      const sp = debtStabilizingAt(ref, P0, t)
      expect(sp.spStarPct).toBeCloseTo(sp.spStarStructPct, 11)
      expect(sp.effortGapMd).toBeCloseTo(sp.effortGapStructMd, 11)
    }
    const sp2026 = debtStabilizingAt(ref, P0, 0)
    const sp2036 = debtStabilizingAt(ref, P0, 10)
    expect(sp2026.spStarPct).toBeCloseTo(-0.52, 2)
    expect(sp2026.effortGapMd).toBeCloseTo(70.0, 1)
    expect(sp2036.spStarPct).toBeCloseTo(2.65, 2)
    expect(sp2036.effortGapMd).toBeCloseTo(242.5, 1)
  })

  it('distingue sp* réalisé et sp* tendanciel lors d\'un choc d\'Année 1 et filtre les fausses stabilisations de relance en récession/ELB', () => {
    const stimRec = projectScenario({
      levers: { dep_enseignement: 30, dep_defense: 30, dep_ordre_securite: 30, dep_affaires_eco: 30 },
      demandRegime: 'elb',
      horizon: 'dixAns',
    })
    // En 2027 sous relance ELB, le ratio dette/PIB baisse ponctuellement (effortGapPct < 0), mais la cible tendancielle démasque le déficit
    const y1 = debtStabilizingAt(stimRec, P0, 1)
    expect(y1.effortGapPct).toBeLessThan(0)
    expect(y1.effortGapStructPct).toBeGreaterThan(2.5)
    expect(y1.effortGapStructPct - y1.effortGapPct).toBeGreaterThan(5)
    const evalStim = evaluateFiscalTargets(stimRec, P0)
    expect(evalStim.debtStabilization.paradox2027).toBe(true)
    expect(evalStim.debtStabilization.status).toBe('unreached')
    expect(evalStim.deficit3Pct.status).toBe('unreached')
  })

  it('classe les jalons en unreached, transient (rechute post-2030) et sustained (consolidation durable)', () => {
    // 1. Référence et scénarios neutres : non atteints à 10 ans
    for (const sc of NEUTRAL_SCENARIOS) {
      const overrides = overridesForMacro(sc.macroId)
      const pSc = resolveParams(overrides)
      const r = projectScenario({ levers: sc.levers, overrides, horizon: 'dixAns' })
      const ev = evaluateFiscalTargets(r, pSc)
      expect(ev.debtStabilization.status).toBe('unreached')
      expect(ev.deficit3Pct.status).toBe('unreached')
    }
    // 2. Stabilisation temporaire 2028–2029 suivie d'une rechute par renouvellement du stock et vieillissement
    const rTrans = projectScenario({
      levers: { tva_normal: 5, csg: 2.5, dep_affaires_eco: -14, ondam: -5, indexation_pensions: -2, age_legal: 1 },
      horizon: 'trenteAns',
    })
    const evTrans = evaluateFiscalTargets(rTrans, P0)
    expect(evTrans.debtStabilization).toMatchObject({ status: 'transient', firstYear: 2028, lastYear: 2029 })
    // 3. Consolidation forte : hausse transitoire du ratio en 2027 (contraction PIB) puis baisse continue dès 2028 et solde ≥ −3 %
    const rSust = projectScenario({
      levers: { dep_enseignement: -30, dep_defense: -30, dep_ordre_securite: -30, dep_affaires_eco: -30, ondam: -10 },
      horizon: 'dixAns',
    })
    const evSust = evaluateFiscalTargets(rSust, P0)
    expect(evSust.debtStabilization).toMatchObject({ status: 'sustained', year: 2028 })
    expect(evSust.deficit3Pct).toMatchObject({ status: 'sustained', year: 2028 })
  })

  it('reconstitue le proxy de dépense primaire nette UE 2026–2029 avec symétrie recettes/dépenses, lissage 3 ans et exclusion LVT', () => {
    const refEv = evaluateFiscalTargets(projectScenario({ horizon: 'dixAns' }), P0)
    expect(refEv.euNetExpenditure.status).toBe('calculé (estimation)')
    expect(refEv.euNetExpenditure.avgCeilingPct).toBeCloseTo(1.17, 2)
    expect(refEv.euNetExpenditure.cumCeilingPct).toBeCloseTo(3.54, 2)
    expect(refEv.euNetExpenditure.avgGrowthPct).toBeCloseTo(2.96, 2)
    expect(refEv.euNetExpenditure.withinCeiling).toBe(false)

    // Symétrie Règlement UE 2024/1263 art. 2(2) : +15 Md€ de TVA ex ante (+2 pts) et +15 Md€ de baisse COFOG réduisent identiquement la DPN
    const rTax = projectScenario({ levers: { tva_normal: 2 } }) // +15,0 Md€ ex ante
    const rExp = projectScenario({ levers: { dep_defense: -15 / 0.54 } }) // +15,0 Md€ ex ante
    expect(evaluateFiscalTargets(rTax, P0).euNetExpenditure.cumGrowthPct).toBeCloseTo(
      evaluateFiscalTargets(rExp, P0).euNetExpenditure.cumGrowthPct,
      8,
    )
    // LVT seul (échange d'impôts) ne déplace pas la DPN reconstituée
    const rLvt = projectScenario({ modules: [{ module: LVT_MODULE, levers: { scenario: 4 } }] })
    expect(evaluateFiscalTargets(rLvt, P0).euNetExpenditure.cumGrowthPct).toBeCloseTo(refEv.euNetExpenditure.cumGrowthPct, 10)
    // Avec étalement 3 ans (2027–2029), le profil annuel est lissé sur les 3 années mais rejoint le même cumul 2029
    const rImm = projectScenario({ levers: { tva_normal: 3, dep_affaires_eco: -15 }, phasingYears: 1 })
    const rPh3 = projectScenario({ levers: { tva_normal: 3, dep_affaires_eco: -15 }, phasingYears: 3 })
    const dpnImm = evaluateFiscalTargets(rImm, P0).euNetExpenditure
    const dpnPh3 = evaluateFiscalTargets(rPh3, P0).euNetExpenditure
    expect(dpnPh3.annualGrowthPct[2027]).toBeGreaterThan(dpnImm.annualGrowthPct[2027])
    expect(dpnPh3.annualGrowthPct[2028]).toBeLessThan(dpnImm.annualGrowthPct[2028])
    expect(dpnPh3.annualGrowthPct[2029]).toBeLessThan(dpnImm.annualGrowthPct[2029])
    expect(dpnPh3.cumGrowthPct).toBeCloseTo(dpnImm.cumGrowthPct, 8)
  })

  it('decomposeAtYear reste exact à 1e-9 Md€ entre deux scénarios quelconques avec leviers et modules différents', () => {
    const scenA = projectScenario({
      levers: { tva_normal: 2, dep_enseignement: -10, age_legal: 1 },
      modules: [{ module: LVT_MODULE, levers: { scenario: 2 } }],
      horizon: 'trenteAns',
      ysCase: 'haut',
    })
    const scenB = projectScenario({
      levers: { csg: 1.5, ir: 10, ondam: -4, indexation_pensions: -1 },
      modules: [{ module: NDC_MODULE, levers: { actif: 1 } }],
      horizon: 'trenteAns',
      ysCase: 'haut',
      phasingYears: 3,
    })
    for (const t of [0, 1, 2, 5, 10, 20, 30]) {
      const d = decomposeAtYear(scenB, scenA, t, EPS, EPS_OFFRE)
      expect(d.ecart).toBeCloseTo(scenB.total[t].balance - scenA.total[t].balance, 9)
      expect(d.lines.reduce((s, l) => s + l.montant, 0)).toBeCloseTo(d.ecart, 9)
    }
  })

  it('comparaison A/B et faisceau bas–haut : détecte dep_enseignement/LVT OCDE, borne sans inversion [lo, mid, hi] et étend snapshotAt/blocksAt', () => {
    expect(mayHaveSupplySpread({ dep_defense: -10 }, null)).toBe(false)
    expect(mayHaveSupplySpread({ dep_enseignement: 20 }, null)).toBe(true)
    expect(mayHaveSupplySpread({}, { scenario: 2, ocde: 0 })).toBe(false)
    expect(mayHaveSupplySpread({}, { scenario: 2, ocde: 1 })).toBe(true)

    const bas = projectScenario({ levers: { tva_normal: 2, age_legal: 1 }, ysCase: 'bas', horizon: 'trenteAns' })
    const central = projectScenario({ levers: { tva_normal: 2, age_legal: 1 }, ysCase: 'central', horizon: 'trenteAns' })
    const haut = projectScenario({ levers: { tva_normal: 2, age_legal: 1 }, ysCase: 'haut', horizon: 'trenteAns' })
    const ref = projectScenario({ levers: {}, ysCase: 'central', horizon: 'trenteAns' })
    const resA = projectScenario({ levers: { dep_affaires_eco: -8 }, ysCase: 'central', horizon: 'trenteAns' })
    const series = buildSeries(central, ref, { envelope: { bas, central, haut }, resultA: resA })
    for (const r of series) {
      for (const [k, bKey] of [['debt', 'debtBand'], ['balance', 'balanceBand'], ['interest', 'interestBand'], ['gdpGap', 'gdpGapBand'], ['unemployment', 'unemploymentBand']]) {
        expect(r[bKey][0]).toBeLessThanOrEqual(r[k] + 1e-12)
        expect(r[k]).toBeLessThanOrEqual(r[bKey][1] + 1e-12)
      }
      expect(r.debtPin).toBeTypeOf('number')
    }
    const last = series.at(-1)
    expect(last.debtBand[1]).toBeCloseTo(last.debtBas, 9)
    expect(last.debtBand[0]).toBeCloseTo(last.debtHaut, 9)
    expect(last.balanceBand[0]).toBeCloseTo(last.balanceBas, 9)
    expect(last.balanceBand[1]).toBeCloseTo(last.balanceHaut, 9)

    const snap = snapshotAt(central, ref, 10, resA)
    expect(snap.debtDeltaVsA).toBeCloseTo((central.total[10].debtRatio - resA.total[10].debtRatio) * 100, 9)
    const blk = blocksAt(central, ref, 10, resA)
    expect(blk.reduce((s, b) => s + b.deltaVsA, 0)).toBeCloseTo(central.total[10].balance - resA.total[10].balance, 9)

    expect(defaultScenarioLabel({ values: NEUTRAL_SCENARIOS[4].levers })).toContain('Ajustement par les recettes')
    expect(scenariosEqual({ values: { ir: 5 }, ysCase: 'central' }, { values: { ir: 5 }, ysCase: 'central' })).toBe(true)
    expect(scenariosEqual({ values: { ir: 5 }, ysCase: 'central' }, { values: { ir: 6 }, ysCase: 'central' })).toBe(false)
  })
})
