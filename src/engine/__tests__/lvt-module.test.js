import { describe, it, expect } from 'vitest'
import { LVT_MODULE, LVT_SCENARIO_CODES, LVT_CAPI_RAMP_YEARS, LVT_START_T, lvtComponents, capiRamp } from '../lvt-module.js'
import { LVT_SCENARIOS, LVT_SCENARIO_BY_CODE, LVT_PRELEVEMENTS_SOCIAUX, LVT_LIGNES, LVT_SNAPSHOT_META } from '../lvt-snapshot.js'
import { validateModuleDefinition, runModule } from '../modules.js'
import { resolveParams, PARAM_BY_ID } from '../params.js'
import { projectScenario, HORIZONS, START_YEAR } from '../project.js'
import { BLOCKS } from '../levers.js'

const P = resolveParams()
const PIB = P['base.pib.2025']

function makeContext(params = P, nYears = 30) {
  const years = Array.from({ length: nYears + 1 }, (_, t) => START_YEAR + t)
  return { startYear: START_YEAR, endYear: START_YEAR + nYears, nYears, years, gdpBase2025: params['base.pib.2025'], params }
}
const run = (scenario, offre_ocde = 0, params = P, nYears = 30) => runModule(LVT_MODULE, { scenario, offre_ocde }, makeContext(params, nYears))
const consolidated = (inst, t) => BLOCKS.reduce((s, b) => s + inst.aBlocks[b][t], 0)
const ACTIVE = [1, 2, 3, 4, 5]

describe('instantané LVTShift (yields.json, commit 322190e, 12 nov. 2026) : gardes de non-régression', () => {
  it('métadonnées datées', () => {
    expect(LVT_SNAPSHOT_META.commit).toBe('322190e')
    expect(LVT_SNAPSHOT_META.date).toBe('2026-11-12')
    expect(LVT_SNAPSHOT_META.anneeReference).toBe(2025)
  })
  const EXPECTED = {
    S1: [67.2, 50.5, 14.9, 1.8, 1.10],
    S2: [71.1, 50.5, 14.9, 5.8, 1.16],
    S2_IFI: [73.5, 50.5, 14.9, 8.1, 1.20],
    S3: [79.4, 50.5, 14.9, 14.1, 1.30],
    S3_IFI: [81.8, 50.5, 14.9, 16.4, 1.34],
  }
  for (const s of LVT_SCENARIOS) {
    it(`${s.id} : total, local, départemental, national, taux indicatif`, () => {
      const [total, local, dep, nat, taux] = EXPECTED[s.id]
      expect(s.total).toBe(total)
      expect(s.local).toBe(local)
      expect(s.departemental).toBe(dep)
      expect(s.national).toBe(nat)
      expect(s.tauxIndicatif).toBe(taux)
      // yields.json arrondit au dixième : la somme des niveaux reste à 0,1 Md€ du total publié.
      expect(Math.abs(s.local + s.departemental + s.national - s.total)).toBeLessThanOrEqual(0.1 + 1e-9)
    })
  }
  it('codes 1 à 5 dans l\'ordre du levier', () => {
    expect(LVT_SCENARIOS.map((s) => [s.code, s.id])).toEqual([[1, 'S1'], [2, 'S2'], [3, 'S2_IFI'], [4, 'S3'], [5, 'S3_IFI']])
    expect(LVT_SCENARIO_CODES).toEqual([0, 1, 2, 3, 4, 5])
  })
  it('prélèvements sociaux remplacés (D11) et lignes d\'impôts avec source et statut', () => {
    expect(LVT_PRELEVEMENTS_SOCIAUX.plusValues.montant).toBe(1.92)
    expect(LVT_PRELEVEMENTS_SOCIAUX.plusValues.annee).toBe(2024)
    expect(LVT_PRELEVEMENTS_SOCIAUX.revenusLocatifs.montant).toBe(3.5)
    expect(LVT_PRELEVEMENTS_SOCIAUX.revenusLocatifs.annee).toBe(2022)
    const byId = Object.fromEntries(LVT_LIGNES.map((l) => [l.id, l.montant]))
    expect(byId).toEqual({ tfpb: 42.8, tfpnb: 0.27, annexes_tf: 0.92, thrs: 2.97, dmto_dep: 13.5, dmto_com: 3.2, frais_gestion: 1.8, pv_ir_ps: 2.8, ifi: 2.3, loyers_ir_ps: 7.7 })
    for (const l of LVT_LIGNES) {
      expect(l.url).toMatch(/^https:\/\//)
      expect(['relu', 'relu (secondaire)', 'LVTShift']).toContain(l.statut)
      expect(BLOCKS).toContain(l.bloc)
    }
  })
})

describe('paramètres du module : gardes de non-régression', () => {
  it('valeurs, fourchettes et statuts', () => {
    const q = (id) => PARAM_BY_ID[id]
    expect(q('lvt.base_fonciere.2025').value).toBe(6122)
    expect([q('lvt.capi.part').value, q('lvt.capi.part').low, q('lvt.capi.part').high]).toEqual([0.80, 0.60, 1.00])
    expect(q('lvt.capi.part').status).toBe('à valider')
    expect(q('lvt.capi.part').source).toMatch(/NON fixée par le propriétaire/)
    expect(q('lvt.capi.part').explanation).toMatch(/à valider/)
    expect([q('lvt.capi.taux_actualisation').value, q('lvt.capi.taux_actualisation').low, q('lvt.capi.taux_actualisation').high]).toEqual([3.5, 3, 4])
    expect(q('lvt.capi.taux_actualisation').source).toMatch(/calcul, non relu/)
    expect(q('lvt.ps.cle_etat').value).toBeCloseTo(7.5 / 17.2, 6)
    expect(q('lvt.ps.cle_etat').status).toBe('non validé')
    expect([q('lvt.ys.ocde_par_point').value, q('lvt.ys.ocde_par_point').low, q('lvt.ys.ocde_par_point').high]).toEqual([1.0, 0.25, 1.0])
    expect(q('lvt.ys.ocde_par_point').status).toBe('non validé')
    expect(LVT_CAPI_RAMP_YEARS).toBe(3)
    expect(LVT_START_T).toBe(1)
  })
})

describe('LVT_MODULE : contrat de module', () => {
  it('valide validateModuleDefinition, statut non validé, inactif par défaut', () => {
    expect(validateModuleDefinition(LVT_MODULE)).toEqual([])
    expect(LVT_MODULE.statut).toBe('non validé')
    expect(LVT_MODULE.leviers.map((l) => [l.id, l.defaut])).toEqual([['scenario', 0], ['offre_ocde', 0]])
    const text = LVT_MODULE.explications.join(' ')
    expect(text).toMatch(/répartition/)
    expect(text).toMatch(/Aucune estimation de l'effet sur le PIB français/)
    expect(text).toMatch(/D11/)
    expect(text).toMatch(/D12/)
  })
  it('code 0 (et valeurs non valides) : aucun effet, aucun flux', () => {
    for (const v of [0, NaN, -3, 0.4, undefined]) {
      const inst = runModule(LVT_MODULE, { scenario: v }, makeContext())
      for (const b of BLOCKS) expect(inst.aBlocks[b].every((x) => x === 0)).toBe(true)
      expect(inst.flux).toEqual([])
      expect(inst.mByYear.every((m) => m === 0)).toBe(true)
    }
    // Hors bornes : ramené dans [0, 5] par moduleLeverValues (99 -> 5 = S3 avec IFI) ; non entier : arrondi.
    expect(run(99).flux).toEqual(run(5).flux)
    expect(run(3.6).flux).toEqual(run(4).flux)
  })
  it('theta nul, rien en 2026, effet dès 2027', () => {
    for (const c of ACTIVE) {
      const inst = run(c)
      expect(inst.theta.every((x) => x === 0)).toBe(true)
      for (const b of BLOCKS) expect(inst.aBlocks[b][0]).toBe(0)
    }
    expect(run(4).aBlocks.securiteSociale[1]).toBeLessThan(0)
  })
})

describe('D11 et rendement égal : a par bloc', () => {
  const P0 = resolveParams({ 'lvt.capi.part': 0 }) // capitalisation neutralisée
  for (const c of ACTIVE) {
    it(`${LVT_SCENARIO_BY_CODE[c].id} : somme consolidée des a hors capitalisation nulle chaque année ; a(locales) = 0`, () => {
      const inst = run(c, 0, P0)
      inst.aBlocks.centrales.forEach((_, t) => expect(Math.abs(consolidated(inst, t))).toBeLessThan(1e-15))
      expect(inst.aBlocks.locales.every((x) => x === 0)).toBe(true)
      // Avec la capitalisation centrale : l'écart au consolidé est exactement la capitalisation.
      const full = run(c)
      const k = lvtComponents(c, P)
      full.aBlocks.centrales.forEach((_, t) => expect(consolidated(full, t)).toBeCloseTo(k.capitalisation / PIB * capiRamp(t), 12))
    })
  }
  it('signe et ampleur du transfert sécurité sociale → État', () => {
    expect(run(1).aBlocks.securiteSociale.every((x) => x === 0)).toBe(true)
    const secu = (c) => -run(c, 0, P0).aBlocks.securiteSociale[5] * PIB
    const cle = 1 - 7.5 / 17.2
    expect(secu(2)).toBeCloseTo(1.92 * cle, 6) // ≈ 1,1 Md€
    expect(secu(3)).toBeCloseTo(1.92 * cle, 6)
    expect(secu(4)).toBeCloseTo((1.92 + 3.5) * cle, 6) // ≈ 3,1 Md€
    expect(secu(5)).toBeCloseTo((1.92 + 3.5) * cle, 6)
    expect(secu(4)).toBeGreaterThan(3.0)
    expect(secu(4)).toBeLessThan(3.2)
    expect(secu(2)).toBeGreaterThan(1.0)
    expect(secu(2)).toBeLessThan(1.2)
    // Dans la fourchette 1,1–3,4 Md€ de la revue (§2.4)
    for (const c of [2, 3, 4, 5]) {
      expect(secu(c)).toBeGreaterThanOrEqual(1.0)
      expect(secu(c)).toBeLessThanOrEqual(3.4)
      expect(run(c, 0, P0).aBlocks.centrales[5]).toBeCloseTo(-run(c, 0, P0).aBlocks.securiteSociale[5], 15)
    }
  })
})

describe('flux bruts (affichage seulement)', () => {
  for (const c of ACTIVE) {
    it(`${LVT_SCENARIO_BY_CODE[c].id} : la taxe créée égale les impôts supprimés et le total du scénario`, () => {
      const s = LVT_SCENARIO_BY_CODE[c]
      const { flux } = run(c)
      const cree = flux.filter((f) => f.montant > 0).reduce((a, f) => a + f.montant, 0)
      const supprime = flux.filter((f) => f.montant < 0).reduce((a, f) => a + f.montant, 0)
      expect(cree * PIB).toBeCloseTo(s.local + s.departemental + s.national, 9)
      expect(Math.abs(cree * PIB - s.total)).toBeLessThanOrEqual(0.1 + 1e-9) // total publié (arrondi au dixième)
      expect(cree + supprime).toBeCloseTo(0, 12)
      // Somme nette des flux par bloc = a hors capitalisation du bloc (D11)
      const inst = run(c, 0, resolveParams({ 'lvt.capi.part': 0 }))
      for (const b of BLOCKS) {
        const net = flux.filter((f) => f.bloc === b).reduce((a, f) => a + f.montant, 0)
        expect(net).toBeCloseTo(inst.aBlocks[b][5], 12)
      }
      // Le bloc local reçoit des flux (D9)
      expect(flux.filter((f) => f.bloc === 'locales').length).toBe(4)
    })
  }
})

describe('D12 : capitalisation', () => {
  it('S1 : aucun effet ; S2, S3 : a(centrales) négatif, croissant avec la part nationale', () => {
    expect(lvtComponents(1, P).capitalisation).toBe(0)
    const caps = [2, 3, 4, 5].map((c) => lvtComponents(c, P).capitalisation)
    caps.forEach((v) => expect(v).toBeLessThan(0))
    for (let i = 1; i < caps.length; i++) expect(caps[i]).toBeLessThan(caps[i - 1])
  })
  it('S3 : borne haute (capitalisation 100 %, taux 3 à 4 %) de l\'ordre de −0,13 à −0,22 % du PIB, comme la revue (§4.4)', () => {
    for (const c of [4, 5]) {
      for (const tauxPct of [3, 4]) {
        const pct = lvtComponents(c, P, { capiPart: 1, tauxPct }).capitalisation / PIB * 100
        expect(pct).toBeLessThan(-0.13)
        expect(pct).toBeGreaterThan(-0.22)
      }
    }
    // S3 avec IFI, taux 3 % : ≈ −6,5 Md€ ; taux 4 % : ≈ −4,9 Md€ (revue : 4,5 à 6 Md€)
    expect(lvtComponents(5, P, { capiPart: 1, tauxPct: 3 }).capitalisation).toBeCloseTo(-14.6 / 0.03 / 6122 * 81.8, 9)
  })
  it('valeurs centrales (part 0,80, taux 3,5 %) et rampe sur trois ans', () => {
    const pct = (c) => lvtComponents(c, P).capitalisation / PIB * 100
    expect(pct(2)).toBeCloseTo(-0.036, 3)
    expect(pct(3)).toBeCloseTo(-0.058, 3)
    expect(pct(4)).toBeCloseTo(-0.122, 3)
    expect(pct(5)).toBeCloseTo(-0.149, 3)
    expect([0, 1, 2, 3, 4, 10].map(capiRamp)).toEqual([0, 1 / 3, 2 / 3, 1, 1, 1])
    const inst = run(4, 0, P)
    const k = lvtComponents(4, P)
    const capiAt = (t) => consolidated(inst, t) * PIB
    expect(capiAt(1)).toBeCloseTo(k.capitalisation / 3, 9)
    expect(capiAt(3)).toBeCloseTo(k.capitalisation, 9)
  })
  it('catégorie de multiplicateur ir_csg seulement quand le consolidé est non nul', () => {
    expect(run(1).mByYear.every((m) => m === 0)).toBe(true)
    expect(run(4).mByYear.every((m) => m === P['dem.m.ir_csg'])).toBe(true)
  })
})

describe('yS : bas ≤ central ≤ haut, central nul (D2), haut désactivé par défaut', () => {
  it('sans l\'option : yS nul partout ; avec : haut = borne OCDE pour S2 et S3, 0 pour S1', () => {
    for (const c of ACTIVE) {
      const off = run(c, 0)
      for (const k of ['bas', 'central', 'haut']) expect(off.yS[k].every((v) => v === 0)).toBe(true)
      const on = run(c, 1)
      on.yS.bas.forEach((b, t) => {
        expect(b).toBe(0)
        expect(on.yS.central[t]).toBe(0)
        expect(b).toBeLessThanOrEqual(on.yS.central[t])
        expect(on.yS.central[t]).toBeLessThanOrEqual(on.yS.haut[t])
      })
    }
    expect(run(1, 1).yS.haut.every((v) => v === 0)).toBe(true)
    // Revue §4.3 : S2 sans IFI +0,31 %, S3 avec IFI +1,1 % (prélèvements ≈ 1 290 Md€ ; ici fisc.eps_offre × PIB ≈ 1 304 Md€)
    expect(run(2, 1).yS.haut.at(-1) * 100).toBeCloseTo(0.31, 1)
    expect(run(5, 1).yS.haut.at(-1) * 100).toBeCloseTo(1.12, 2)
    // Montée en charge offre.lag.lvt (12 ans) / offre.t0.lvt (1 an) : rien avant 2028
    expect(run(5, 1).yS.haut[1]).toBe(0)
    expect(run(5, 1).yS.haut[2]).toBe(0)
    expect(run(5, 1).yS.haut[3]).toBeGreaterThan(0)
  })
})

describe('intégration au moteur : projectScenario', () => {
  it('chaque scénario, chaque horizon, chaque cas, avec et sans option OCDE : aucune valeur non finie', () => {
    for (const horizon of Object.keys(HORIZONS)) {
      for (const scenario of LVT_SCENARIO_CODES) {
        for (const ysCase of ['bas', 'central', 'haut']) {
          for (const offre_ocde of [0, 1]) {
            const r = projectScenario({ horizon, ysCase, modules: [{ module: LVT_MODULE, levers: { scenario, offre_ocde } }] })
            for (const row of r.total) {
              for (const k of ['gdp', 'balance', 'debt', 'debtRatio', 'interest', 'unemployment', 'primaryBalance']) expect(Number.isFinite(row[k])).toBe(true)
            }
            for (const b of BLOCKS) for (const row of r.blocks[b]) {
              expect(Number.isFinite(row.balance)).toBe(true)
              for (const f of row.moduleFlux) expect(Number.isFinite(f.montant)).toBe(true)
            }
          }
        }
      }
    }
  })
  it('inactif par défaut : la référence est inchangée', () => {
    for (const horizon of Object.keys(HORIZONS)) {
      const ref = projectScenario({ horizon })
      const off = projectScenario({ horizon, modules: [{ module: LVT_MODULE, levers: {} }] })
      expect(off.total.map((r) => r.balance)).toEqual(ref.total.map((r) => r.balance))
      expect(off.total.map((r) => r.debt)).toEqual(ref.total.map((r) => r.debt))
      for (const b of BLOCKS) expect(off.blocks[b].map((r) => r.balance)).toEqual(ref.blocks[b].map((r) => r.balance))
    }
  })
  it('S3 : solde de la sécurité sociale dégradé, État amélioré du même montant hors capitalisation ; flux locaux affichés', () => {
    const overrides = { 'lvt.capi.part': 0 }
    const ref = projectScenario({ overrides })
    const r = projectScenario({ overrides, modules: [{ module: LVT_MODULE, levers: { scenario: 4 } }] })
    const t = 5
    const dSecu = r.blocks.securiteSociale[t].leversExAnte - ref.blocks.securiteSociale[t].leversExAnte
    const dEtat = r.blocks.centrales[t].leversExAnte - ref.blocks.centrales[t].leversExAnte
    expect(dSecu).toBeLessThan(0)
    expect(dEtat).toBeCloseTo(-dSecu, 9)
    expect(r.total[t].balance).toBeCloseTo(ref.total[t].balance, 6)
    expect(r.blocks.locales[t].moduleFlux.length).toBe(4)
    expect(r.blocks.locales[0].moduleFlux.length).toBe(0)
  })
})
