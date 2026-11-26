import { describe, it, expect } from 'vitest'
import { LVT_MODULE, LVT_SCENARIO_CODES, LVT_START_T, LVT_START_YEAR, LVT_PARAM_IDS, lvtComponents, impotsNationauxSupprimes } from '../lvt-module.js'
import { LVT_SCENARIOS, LVT_SCENARIO_BY_CODE, LVT_PRELEVEMENTS_SOCIAUX, LVT_LIGNES, LVT_SNAPSHOT_META, LVT_IMPOTS_NATIONAUX_SUPPRIMES } from '../lvt-snapshot.js'
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
const NET = [2, 3, 4, 5] // scénarios avec capitalisation (S2, S2 avec IFI, S3, S3 avec IFI)
/** Plein effet dès 2027 (D12, décision du 24 nov. 2026) : 0 en 2026, 1 ensuite. */
const on = (t) => (t >= LVT_START_T ? 1 : 0)

describe('rendements LVTShift (yields.json importé, commit 322190e, 12 nov. 2026) : gardes de non-régression', () => {
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
    // Montants lus dans yields.json (reference_meur ou values_meur du millésime cité par la revue), en Md€, sans arrondi.
    const byId = Object.fromEntries(LVT_LIGNES.map((l) => [l.id, l.montant]))
    const attendu = { tfpb: 42.776, tfpnb: 0.266, annexes_tf: 0.9, thrs: 2.974, dmto_dep: 13.484, dmto_com: 3.155, frais_gestion: 1.779, pv_ir_ps: 2.8321, ifi: 2.332, loyers_ir_ps: 7.69 }
    expect(Object.keys(byId)).toEqual(Object.keys(attendu))
    for (const [id, v] of Object.entries(attendu)) expect(byId[id]).toBeCloseTo(v, 9)
    for (const l of LVT_LIGNES) {
      expect(l.url).toMatch(/^https:\/\//)
      expect(['relu', 'relu (secondaire)', 'LVTShift']).toContain(l.statut)
      expect(l.statutLVTShift.split(', ').every((x) => ['verified', 'derived', 'reported'].includes(x))).toBe(true)
      expect(BLOCKS).toContain(l.bloc)
    }
    expect(LVT_LIGNES.find((l) => l.id === 'ifi').scenarios).toEqual([3, 5])
    expect(LVT_LIGNES.find((l) => l.id === 'loyers_ir_ps').scenarios).toEqual([4, 5])
    expect(LVT_LIGNES.find((l) => l.id === 'tfpb').scenarios).toEqual([1, 2, 3, 4, 5])
  })
  it('impôts nationaux supprimés (capitalisation inverse, D12) : montants de yields.json, source et statut', () => {
    const byId = Object.fromEntries(LVT_IMPOTS_NATIONAUX_SUPPRIMES.map((l) => [l.id, l]))
    expect(Object.keys(byId)).toEqual(['pv_ir_ps', 'loyers_ir_ps', 'ifi'])
    expect(byId.pv_ir_ps.montant).toBe((1374 + 2613) / 1000)
    expect(byId.loyers_ir_ps.montant).toBe((4533 + 2590 + 1180) / 1000)
    expect(byId.ifi.montant).toBe(2332 / 1000)
    expect([byId.pv_ir_ps.drapeau, byId.loyers_ir_ps.drapeau, byId.ifi.drapeau]).toEqual(['plusValues', 'revenusLocatifs', 'ifi'])
    for (const l of LVT_IMPOTS_NATIONAUX_SUPPRIMES) {
      expect(l.source).toMatch(/322190e/)
      expect(l.source).toMatch(/https:\/\//)
      expect(['relu', 'LVTShift']).toContain(l.statut)
    }
    // Leur somme forme la part nationale additionnelle de chaque scénario, à l'arrondi de yields.json près (0,05 Md€).
    for (const c of ACTIVE) {
      const s = LVT_SCENARIO_BY_CODE[c]
      const somme = impotsNationauxSupprimes(s).reduce((a, l) => a + l.montant, 0)
      expect(Math.abs(somme - (s.national - LVT_SCENARIO_BY_CODE[1].national))).toBeLessThan(0.05)
    }
    expect(impotsNationauxSupprimes(LVT_SCENARIO_BY_CODE[1])).toEqual([])
    expect(impotsNationauxSupprimes(LVT_SCENARIO_BY_CODE[5]).map((l) => l.id)).toEqual(['pv_ir_ps', 'loyers_ir_ps', 'ifi'])
  })
})

describe('paramètres du module : gardes de non-régression', () => {
  it('valeurs, fourchettes et statuts', () => {
    const q = (id) => PARAM_BY_ID[id]
    expect(q('lvt.base_fonciere.2025').value).toBe(6122)
    expect([q('lvt.capi.part').value, q('lvt.capi.part').low, q('lvt.capi.part').high]).toEqual([0.80, 0.60, 1.00])
    expect(q('lvt.capi.part').status).toBe('sourcé (fourchette), centre choisi')
    expect(q('lvt.capi.part').source).toMatch(/retenu par Patrick le 24 nov. 2026/)
    expect(q('lvt.capi.part').explanation).toMatch(/retenu par Patrick/)
    expect([q('lvt.capi.taux_actualisation').value, q('lvt.capi.taux_actualisation').low, q('lvt.capi.taux_actualisation').high]).toEqual([3.5, 3, 4])
    expect(q('lvt.capi.taux_actualisation').source).toMatch(/calcul, non relu/)
    expect(q('lvt.ps.cle_etat').value).toBeCloseTo(7.5 / 17.2, 6)
    expect(q('lvt.ps.cle_etat').status).toBe('sourcé')
    expect(q('lvt.base_fonciere.2025').status).toBe('sourcé (calcul)')
    expect([q('lvt.ys.ocde_par_point').value, q('lvt.ys.ocde_par_point').low, q('lvt.ys.ocde_par_point').high]).toEqual([1.0, 0.25, 1.0])
    expect(q('lvt.ys.ocde_par_point').status).toBe('non validé')
    expect(LVT_START_T).toBe(1)
    expect(LVT_START_YEAR).toBe(2027)
  })
  it('part du sol dans la valeur des biens (capitalisation inverse) : valeurs, fourchette, statut, source', () => {
    const q = PARAM_BY_ID['lvt.capi.part_sol']
    expect(q.value).toBe(4190 / (4190 + 4812 + 235))
    expect(q.low).toBe(3829 / (3829 + 4847 + 233))
    expect(q.high).toBe(0.60)
    expect(q.value).toBeCloseTo(0.454, 3)
    expect(q.low).toBeCloseTo(0.430, 3)
    expect(q.unit).toBe('part')
    expect(q.status).toBe('sourcé (calcul)')
    expect(q.source).toMatch(/Insee Première n° 2135/)
    expect(q.source).toMatch(/Insee Première n° 2028/)
    expect(q.source).toMatch(/15 et 85 %/)
    expect(q.source).toMatch(/choix de l'implémentation/)
    expect(P['lvt.capi.part_sol']).toBe(q.value)
    expect(LVT_PARAM_IDS).toContain('lvt.capi.part_sol')
    expect(PARAM_BY_ID['lvt.capi.part'].source).toMatch(/symétrie, décision du 24 nov. 2026/)
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
      full.aBlocks.centrales.forEach((_, t) => expect(consolidated(full, t)).toBeCloseTo(k.capitalisation / PIB * on(t), 12))
      // Capitalisation par niveau, au prorata du produit : locales = (local + départemental) / total, centrales = national / total.
      const s = LVT_SCENARIO_BY_CODE[c]
      const tot = s.local + s.departemental + s.national
      full.aBlocks.locales.forEach((v, t) => expect(v).toBeCloseTo(k.capitalisation * (s.local + s.departemental) / tot / PIB * on(t), 12))
      expect(k.capiLocales + k.capiCentrales).toBeCloseTo(k.capitalisation, 12)
      if (c >= 2) expect(full.aBlocks.locales[5]).toBeLessThan(0)
      else expect(full.aBlocks.locales.every((v) => v === 0)).toBe(true)
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

describe('D12 : capitalisation nette (décision du 24 nov. 2026)', () => {
  const CASES = [['bas', 0.60], ['central', 0.80], ['haut', 1.00]]
  it('S1 : aucun effet (ni brut, ni inverse) ; S2, S3 : perte brute croissante avec la part nationale', () => {
    const k1 = lvtComponents(1, P)
    expect([k1.capiBrute, k1.capiInverse, k1.capitalisation, k1.impotsSupprimes]).toEqual([0, 0, 0, 0])
    const caps = NET.map((c) => lvtComponents(c, P).capiBrute)
    caps.forEach((v) => expect(v).toBeLessThan(0))
    for (let i = 1; i < caps.length; i++) expect(caps[i]).toBeLessThan(caps[i - 1])
  })
  for (const c of NET) {
    it(`${LVT_SCENARIO_BY_CODE[c].id} : perte nette = brute − inverse, ≥ 0, cas bas / central / haut`, () => {
      const s = LVT_SCENARIO_BY_CODE[c]
      const tot = s.local + s.departemental + s.national
      const sol = P['lvt.capi.part_sol']
      const r = P['lvt.capi.taux_actualisation'] / 100
      const base = P['lvt.base_fonciere.2025']
      const supp = impotsNationauxSupprimes(s).reduce((a, l) => a + l.montant, 0)
      for (const [, part] of CASES) {
        const k = lvtComponents(c, P, { capiPart: part })
        // Formule de la décision : part × [nouvelle taxe / r − part du sol × impôts supprimés / r] / assiette × produit total.
        const attendu = part * ((s.national - LVT_SCENARIO_BY_CODE[1].national) / r - sol * supp / r) / base * tot
        expect(k.capiBrute).toBeCloseTo(-part * (s.national - LVT_SCENARIO_BY_CODE[1].national) / r / base * tot, 9)
        expect(k.capiInverse).toBeCloseTo(part * sol * supp / r / base * tot, 9)
        expect(k.capiInverse).toBeGreaterThan(0)
        expect(-k.capitalisation).toBeCloseTo(attendu, 9)
        expect(k.capitalisation).toBeCloseTo(k.capiBrute + k.capiInverse, 9)
        expect(k.capitalisation).toBeLessThan(0) // perte nette > 0 : le plancher ne joue pas
        expect(k.plancher).toBe(false)
        expect(k.capitalisation).toBeGreaterThan(k.capiBrute)
        // Les deux parts (locales, État) somment à la perte nette, au prorata du produit.
        expect(k.capiLocales + k.capiCentrales).toBeCloseTo(k.capitalisation, 12)
        expect(k.capiLocales).toBeCloseTo(k.capitalisation * (s.local + s.departemental) / tot, 12)
      }
      // Fourchette de la part du sol (0,43 à 0,60) : le plancher ne joue dans aucun cas.
      const q = PARAM_BY_ID['lvt.capi.part_sol']
      for (const partSol of [q.low, q.value, q.high]) {
        for (const [, part] of CASES) expect(lvtComponents(c, P, { capiPart: part, partSol }).plancher).toBe(false)
      }
    })
  }
  it('valeurs centrales (part 0,80, taux 3,5 %, part du sol 0,45) : brut, inverse, net en % du PIB', () => {
    const pct = (c, k) => lvtComponents(c, P)[k] / PIB * 100
    expect([2, 3, 4, 5].map((c) => pct(c, 'capiBrute'))).toEqual([2, 3, 4, 5].map((c) => expect.closeTo([-0.036, -0.058, -0.122, -0.149][c - 2], 3)))
    expect(pct(2, 'capitalisation')).toBeCloseTo(-0.019, 3)
    expect(pct(3, 'capitalisation')).toBeCloseTo(-0.032, 3)
    expect(pct(4, 'capitalisation')).toBeCloseTo(-0.067, 3)
    expect(pct(5, 'capitalisation')).toBeCloseTo(-0.081, 3)
    // Les impôts supprimés égalent la taxe nationale additionnelle à l'arrondi près : net / brut ≈ 1 − part du sol.
    for (const c of NET) {
      const k = lvtComponents(c, P)
      expect(k.capitalisation / k.capiBrute).toBeCloseTo(1 - P['lvt.capi.part_sol'], 2)
    }
  })
  it('S3 : borne haute brute (capitalisation 100 %, taux 3 à 4 %) de −0,13 à −0,22 % du PIB, comme la revue (§4.4) ; nette plus faible', () => {
    for (const c of [4, 5]) {
      for (const tauxPct of [3, 4]) {
        const k = lvtComponents(c, P, { capiPart: 1, tauxPct })
        expect(k.capiBrute / PIB * 100).toBeLessThan(-0.13)
        expect(k.capiBrute / PIB * 100).toBeGreaterThan(-0.22)
        expect(k.capitalisation).toBeGreaterThan(k.capiBrute)
      }
    }
    expect(lvtComponents(5, P, { capiPart: 1, tauxPct: 3 }).capiBrute).toBeCloseTo(-14.6 / 0.03 / 6122 * 81.8, 9)
  })
  it('plancher : si la capitalisation inverse l\'emporte, perte nette nulle, aucun gain inscrit', () => {
    // Part du sol de 1 : S2 avec IFI, impôts supprimés (6,319) > taxe additionnelle (6,3) -> plancher.
    const k = lvtComponents(3, P, { partSol: 1 })
    expect(k.capiInverse).toBeGreaterThan(-k.capiBrute)
    expect(k.plancher).toBe(true)
    expect(k.capitalisation).toBe(0)
    expect(k.capiLocales).toBe(0)
    expect(k.capiCentrales).toBe(0)
    expect(k.partAssiettePerdue).toBe(0)
    const Pfloor = resolveParams({ 'lvt.capi.part_sol': 1 })
    const inst = run(3, 0, Pfloor)
    expect(inst.aBlocks.locales.every((v) => v === 0)).toBe(true)
    inst.aBlocks.centrales.forEach((_, t) => expect(consolidated(inst, t)).toBeCloseTo(0, 15))
    // Part du sol hors bornes : ramenée dans [0, 1].
    expect(lvtComponents(3, P, { partSol: 5 }).capitalisation).toBe(0)
    expect(lvtComponents(3, P, { partSol: -1 }).capitalisation).toBeCloseTo(lvtComponents(3, P, { partSol: 0 }).capiBrute, 12)
    // Part du sol nulle : perte nette = perte brute.
    for (const c of NET) expect(lvtComponents(c, P, { partSol: 0 }).capitalisation).toBe(lvtComponents(c, P).capiBrute)
  })
  it('plein effet dès 2027, sans montée en charge ; rien en 2026', () => {
    for (const c of NET) {
      const inst = run(c, 0, P)
      const k = lvtComponents(c, P)
      expect(consolidated(inst, 0)).toBe(0)
      for (const t of [1, 2, 3, 10, 30]) expect(consolidated(inst, t) * PIB).toBeCloseTo(k.capitalisation, 9)
      expect(inst.aBlocks.locales[1]).toBeCloseTo(inst.aBlocks.locales[5], 15)
      expect(inst.aBlocks.centrales[1]).toBeCloseTo(inst.aBlocks.centrales[5], 15)
    }
    const text = run(4).explications.join(' ')
    expect(text).toMatch(new RegExp(`dès ${LVT_START_YEAR}`))
    expect(LVT_MODULE.explications.join(' ')).toMatch(/anticipent/)
    expect(LVT_MODULE.explications.join(' ')).toMatch(/Høj et al\. 2018/)
    expect(LVT_MODULE.explications.join(' ')).toMatch(/Palmon et Smith 1998/)
    expect(LVT_MODULE.explications.join(' ')).not.toMatch(/montée en charge sur/)
  })
  it('explications : capitalisation nette, symétrie, part du sol, plancher et impôts locaux non modélisés', () => {
    const text = LVT_MODULE.explications.join(' ')
    expect(text).toMatch(/capitalisation nette/)
    expect(text).toMatch(/même part dans les deux sens/)
    expect(text).toMatch(/aucun gain n'est inscrit/)
    expect(text).toMatch(/impôts locaux supprimés \(taxe foncière sur le bâti, DMTO\) n'est pas modélisée/)
    expect(text).not.toMatch(/ce qui n'est pas modélisé/)
    expect(run(5).explications.join(' ')).toMatch(/plus-values immobilières, revenus locatifs, IFI/)
  })
  it('aucun multiplicateur de demande, même avec capitalisation (effet de richesse non modélisé)', () => {
    for (const c of ACTIVE) expect(run(c).mByYear.every((m) => m === 0)).toBe(true)
    expect(LVT_MODULE.explications.join(' ')).toMatch(/effet de richesse/)
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
  it('fisc.eps_offre = 0 : ysHaut retombe à 0 sans Infinity ni NaN', () => {
    const k = lvtComponents(5, resolveParams({ 'fisc.eps_offre': 0 }))
    expect(k.ysHaut).toBe(0)
    expect(Number.isFinite(k.ysHaut)).toBe(true)
  })
})
