import { describe, it, expect } from 'vitest'
import { projectScenario, HORIZONS } from '../../engine/project.js'
import { LEVERS, STRUCTURAL_LEVERS } from '../../engine/levers.js'
import { PARAM_BY_ID } from '../../engine/params.js'
import {
  fmt, num, buildSeries, snapshotAt, decomposeAtYear, visibleLines, blocksAt, paramIdsFor, groupedLevers,
  extremeLevers, hasSupplyEffect, deltaTone, isFlagged, paramRange, leverGroup,
} from './helpers.js'

const EPS = PARAM_BY_ID['fisc.eps'].value
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
        const d = decomposeAtYear(r, ref, t, EPS)
        expect(d.lines.reduce((s, l) => s + l.montant, 0)).toBeCloseTo(d.ecart, 6)
      }
    }
  })
  it('masque l\'éducation σ au cas central ; une coupe la montre au cas bas, une hausse au cas haut', () => {
    const lv = { dep_enseignement: -20 }
    const c = run(lv, 'central', 'trenteAns')
    const central = decomposeAtYear(c.r, c.ref, 25, EPS)
    expect(visibleLines(central.lines).some((l) => l.kind === 'offre')).toBe(false)
    const b = run(lv, 'bas', 'trenteAns')
    const offre = visibleLines(decomposeAtYear(b.r, b.ref, 25, EPS).lines).filter((l) => l.kind === 'offre')
    expect(offre.length).toBe(1)
    expect(offre[0].label).toBe('Effet d\'offre (cas bas) : Dépenses d\'enseignement')
    expect(offre[0].montant).toBeLessThan(0)
    const h = run({ dep_enseignement: 20 }, 'haut', 'trenteAns')
    const up = visibleLines(decomposeAtYear(h.r, h.ref, 25, EPS).lines).filter((l) => l.kind === 'offre')
    expect(up.length).toBe(1)
    expect(up[0].montant).toBeGreaterThan(0)
  })
  it('étiquette l\'effet d\'offre de la TVA : gain d\'une baisse, au cas haut comme au cas bas (σ non nul dans les trois cas)', () => {
    const haut = run({ tva_normal: -3 }, 'haut')
    const offre = visibleLines(decomposeAtYear(haut.r, haut.ref, 8, EPS).lines).filter((l) => l.kind === 'offre')
    expect(offre.length).toBe(1)
    expect(offre[0].label).toBe('Effet d\'offre (cas haut) : TVA, taux normal')
    expect(offre[0].montant).toBeGreaterThan(0)
  })
  it('une hausse de TVA montre sa perte d\'offre au cas bas', () => {
    const { r, ref } = run({ tva_normal: 3 }, 'bas')
    const offre = visibleLines(decomposeAtYear(r, ref, 8, EPS).lines).filter((l) => l.kind === 'offre')
    expect(offre.length).toBe(1)
    expect(offre[0].montant).toBeLessThan(0)
  })
  it('IR : l\'effet d\'offre est étiqueté « non validé — avis demandé » dans la décomposition', () => {
    const { r, ref } = run({ ir: 10 }, 'central', 'trenteAns')
    const offre = decomposeAtYear(r, ref, 25, EPS).lines.filter((l) => l.kind === 'offre')
    expect(offre.length).toBe(1)
    expect(offre[0].label).toBe('Effet d\'offre de l\'IR (cas central) : non validé — avis demandé')
    expect(r.supply.lignes[0].statut).toBe('non validé')
  })
  it('sans levier : aucune ligne visible', () => {
    const { r, ref } = run({})
    expect(visibleLines(decomposeAtYear(r, ref, 5, EPS).lines)).toEqual([])
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
          const d = decomposeAtYear(r, ref, t, EPS)
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
      const d = decomposeAtYear(r, ref, t, EPS)
      expect(d.lines.reduce((s, l) => s + l.montant, 0)).toBeCloseTo(r.total[t].balance - ref.total[t].balance, 6)
    }
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
  })
})
