import { describe, it, expect } from 'vitest'
import { projectScenario, HORIZONS } from '../../engine/project.js'
import { LEVERS, STRUCTURAL_LEVERS } from '../../engine/levers.js'
import { PARAM_BY_ID } from '../../engine/params.js'
import { NDC_MODULE } from '../../engine/ndc-module.js'
import {
  fmt, num, buildSeries, snapshotAt, decomposeAtYear, visibleLines, blocksAt, paramIdsFor, groupedLevers,
  extremeLevers, hasSupplyEffect, deltaTone, isFlagged, paramRange, leverGroup, sliderStep, debtMovesAgainstBalance, niceAxis, YEAR1_PARADOX_TEXT,
  fmtJobs, jobsNote,
} from './helpers.js'
import { overridesForMacro } from './presets.js'

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
