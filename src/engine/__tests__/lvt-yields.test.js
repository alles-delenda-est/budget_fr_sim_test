import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { validateLvtYields, assertLvtYields, LVT_YIELDS_REQUIRED_KEYS } from '../lvt-yields-schema.js'
import { LVT_YIELDS, LVT_PROVENANCE, LVT_SCENARIOS, LVT_PRELEVEMENTS_SOCIAUX, LVT_IMPOTS_NATIONAUX_SUPPRIMES, LVT_BASE_FONCIERE, LVT_ARRONDIS } from '../lvt-snapshot.js'
import { LVT_MODULE, lvtComponents } from '../lvt-module.js'
import { runModule } from '../modules.js'
import { resolveParams, PARAM_BY_ID } from '../params.js'
import { START_YEAR } from '../project.js'
import DAY0 from './fixtures/lvt-day0-outputs.json' with { type: 'json' }

const read = (rel) => readFileSync(new URL(rel, import.meta.url))
const RAW = read('../data/lvt-yields.json')
const SOURCE = JSON.parse(read('../data/lvt-yields.source.json').toString('utf8'))
const fresh = () => JSON.parse(RAW.toString('utf8'))
const tax = (y, key) => y.taxes.find((t) => t.key === key)

describe('yields.json importé : structure (src/engine/lvt-yields-schema.js)', () => {
  it('le fichier vendu est conforme', () => {
    expect(validateLvtYields(fresh())).toEqual([])
    expect(() => assertLvtYields(fresh())).not.toThrow()
  })
  const BROKEN = [
    ['racine non objet', () => [], /racine/],
    ['as_of absent', (y) => { delete y.as_of }, /as_of/],
    ['price_basis absent', (y) => { delete y.price_basis }, /price_basis/],
    ['statut inconnu', (y) => { y.taxes[0].status = 'estimated' }, /status : « estimated » inattendu/],
    ['niveau inconnu', (y) => { y.taxes[0].tier = 'regional' }, /tier : « regional » inattendu/],
    ['scénario inconnu', (y) => { y.taxes[0].scenario = 'S4' }, /scenario : « S4 » inattendu/],
    ['reference_meur non numérique', (y) => { y.taxes[0].reference_meur = '42776' }, /reference_meur/],
    ['URL non https', (y) => { y.taxes[0].url = 'http://example.org' }, /url : URL https attendue/],
    ['source vide', (y) => { y.taxes[0].source = '' }, /source/],
    ['clé en double', (y) => { y.taxes.push({ ...y.taxes[0] }) }, /clé en double/],
    ['ligne lue par le module absente', (y) => { y.taxes = y.taxes.filter((t) => t.key !== 'gains_ps'); for (const v of y.variants) v.lines = v.lines.filter((k) => k !== 'gains_ps') }, /« gains_ps » absente/],
    ['land_base sans assiette', (y) => { delete y.land_base.taxable_meur }, /land_base.taxable_meur/],
    ['variante absente', (y) => { y.variants = y.variants.filter((v) => !(v.scenario === 'S3' && v.include_ifi)) }, /S3 avec IFI/],
    ['variante en double', (y) => { y.variants.push(y.variants[0]) }, /2 variante\(s\) S1 sans IFI/],
    ['ligne inconnue dans une variante', (y) => { y.variants[0].lines.push('taxe_inconnue') }, /lignes inconnues taxe_inconnue/],
    ['niveau incohérent avec ses lignes', (y) => { y.variants[0].tiers_meur.local += 100 }, /tiers_meur.local/],
    ['total incohérent avec les niveaux', (y) => { y.variants[1].total_meur += 50 }, /total_meur/],
    ['niveau inattendu', (y) => { y.variants[0].tiers_meur.regional = 0 }, /niveaux inattendus regional/],
  ]
  for (const [nom, mutate, re] of BROKEN) {
    it(`structure inattendue détectée : ${nom}`, () => {
      let y = fresh()
      const r = mutate(y)
      if (r !== undefined) y = r
      const errs = validateLvtYields(y)
      expect(errs.length).toBeGreaterThan(0)
      expect(errs.join('\n')).toMatch(re)
      expect(() => assertLvtYields(y, 'test')).toThrow(/structure inattendue/)
    })
  }
  it('lignes requises : toutes celles dont le module lit les montants', () => {
    expect(LVT_YIELDS_REQUIRED_KEYS.length).toBe(15)
    for (const k of LVT_YIELDS_REQUIRED_KEYS) expect(tax(LVT_YIELDS, k)).toBeTruthy()
  })
})

describe('provenance de l\'import (src/engine/data/lvt-yields.source.json)', () => {
  it('commit épinglé, dates, empreinte du fichier vendu', () => {
    expect(SOURCE.repo).toBe('alles-delenda-est/LVTShift')
    expect(SOURCE.path).toBe('lvtshift-fr/site/public/data/yields.json')
    expect(SOURCE.commit).toBe('322190ec92f59e234e8e2d06d4acab1c479b7c94')
    expect(SOURCE.commitDate).toBe('2026-11-12')
    expect(SOURCE.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // Le fichier vendu est bien celui que la provenance décrit (copie verbatim, aucune retouche à la main).
    expect(createHash('sha256').update(RAW).digest('hex')).toBe(SOURCE.sha256)
  })
  it('LVT_PROVENANCE : texte et lien affichés dans la carte du module et ses explications', () => {
    expect(LVT_PROVENANCE.commit).toBe('322190e')
    expect(LVT_PROVENANCE.asOf).toBe(LVT_YIELDS.as_of)
    expect(LVT_PROVENANCE.importeLe).toBe(SOURCE.fetchedAt)
    expect(LVT_PROVENANCE.url).toBe('https://github.com/alles-delenda-est/LVTShift/blob/322190ec92f59e234e8e2d06d4acab1c479b7c94/lvtshift-fr/site/public/data/yields.json')
    expect(LVT_PROVENANCE.texte).toBe(`Données LVTShift, commit 322190e (as_of 29/10/2026), importées le ${SOURCE.fetchedAt.split('-').reverse().join('/')}`)
    expect(LVT_MODULE.explications[0]).toContain(LVT_PROVENANCE.texte)
    expect(LVT_MODULE.sources[0]).toContain(LVT_PROVENANCE.url)
    expect(PARAM_BY_ID['lvt.base_fonciere.2025'].source).toMatch(/commit 322190e/)
  })
})

describe('rendements lus dans yields.json : gardes toBe (un import qui change les chiffres doit échouer ici et être relu)', () => {
  it('as_of et base de prix', () => {
    expect(LVT_YIELDS.as_of).toBe('2026-10-29')
    expect(LVT_YIELDS.price_basis.year).toBe(2025)
  })
  it('impôts remplacés (reference_meur, M€ 2025)', () => {
    const ref = Object.fromEntries(LVT_YIELDS.taxes.map((t) => [t.key, t.reference_meur]))
    expect(ref).toEqual({
      tfpb: 42776, tfpnb: 266, tf_annexes: 900, tf_etat: 1338, thrs: 2974, thrs_etat: 89,
      dmto_communes: 3591, dmto_departements: 14866, dmto_etat: 352,
      gains_ir: 1374, gains_ps: 2613, ifi: 2332, rents_ir: 4533, rents_ps: 2590, rents_csg: 1180,
    })
  })
  it('millésimes des prélèvements sociaux (values_meur nominal) et assiette foncière', () => {
    expect(tax(LVT_YIELDS, 'gains_ps').values_meur['2024']).toBe(1924.5)
    expect(tax(LVT_YIELDS, 'rents_ps').values_meur['2022']).toBe(2399)
    expect(tax(LVT_YIELDS, 'rents_csg').values_meur['2022']).toBe(1093)
    expect(LVT_YIELDS.land_base.taxable_meur).toBe(6122450)
    expect(LVT_BASE_FONCIERE.montant).toBe(6122)
    expect(PARAM_BY_ID['lvt.base_fonciere.2025'].value).toBe(LVT_BASE_FONCIERE.montant)
  })
  it('variantes : total et niveaux (M€ 2025)', () => {
    const v = LVT_YIELDS.variants.map((x) => [x.scenario, x.include_ifi, x.total_meur, x.tiers_meur.local, x.tiers_meur.departmental, x.tiers_meur.national, x.rate_pct])
    expect(v).toEqual([
      ['S1', false, 67152, 50507, 14866, 1779, 1.1],
      ['S2', false, 71139, 50507, 14866, 5766, 1.16],
      ['S2', true, 73471, 50507, 14866, 8098, 1.2],
      ['S3', false, 79443, 50507, 14866, 14070, 1.3],
      ['S3', true, 81775, 50507, 14866, 16402, 1.34],
    ])
  })
  it('valeurs dérivées par le simulateur : arrondis du Day 0 et montants sans arrondi', () => {
    expect(LVT_ARRONDIS).toEqual({ niveauxMd: 1, psPlusValuesMd: 2, psLoyersMd: 1, baseFonciereMd: 0 })
    expect(LVT_SCENARIOS.map((s) => [s.id, s.total, s.local, s.departemental, s.national, s.tauxIndicatif])).toEqual([
      ['S1', 67.2, 50.5, 14.9, 1.8, 1.1], ['S2', 71.1, 50.5, 14.9, 5.8, 1.16], ['S2_IFI', 73.5, 50.5, 14.9, 8.1, 1.2],
      ['S3', 79.4, 50.5, 14.9, 14.1, 1.3], ['S3_IFI', 81.8, 50.5, 14.9, 16.4, 1.34],
    ])
    expect(LVT_SCENARIOS.map((s) => [s.plusValues, s.revenusLocatifs, s.ifi])).toEqual([
      [false, false, false], [true, false, false], [true, false, true], [true, true, false], [true, true, true],
    ])
    expect([LVT_PRELEVEMENTS_SOCIAUX.plusValues.montant, LVT_PRELEVEMENTS_SOCIAUX.revenusLocatifs.montant]).toEqual([1.92, 3.5])
    expect(LVT_IMPOTS_NATIONAUX_SUPPRIMES.map((l) => [l.id, l.cles, l.montant])).toEqual([
      ['pv_ir_ps', ['gains_ir', 'gains_ps'], 3.987], ['loyers_ir_ps', ['rents_ir', 'rents_ps', 'rents_csg'], 8.303], ['ifi', ['ifi'], 2.332],
    ])
    // La somme des impôts nationaux supprimés égale la part nationale additionnelle de chaque variante, à l'arrondi au M€ près.
    for (const v of LVT_YIELDS.variants) {
      const s = LVT_SCENARIOS.find((x) => x.id === (v.include_ifi ? `${v.scenario}_IFI` : v.scenario))
      const supp = LVT_IMPOTS_NATIONAUX_SUPPRIMES.filter((l) => s[l.drapeau]).reduce((a, l) => a + l.montant * 1000, 0)
      expect(Math.abs(supp - (v.tiers_meur.national - LVT_YIELDS.variants[0].tiers_meur.national))).toBeLessThanOrEqual(1 + 1e-9)
    }
  })
  it('aucun rendement recopié à la main dans lvt-snapshot.js ni dans params.js', () => {
    const code = (rel) => read(rel).toString('utf8').replace(/https?:\/\/\S+/g, '')
    const snap = code('../lvt-snapshot.js')
    const params = code('../params.js')
    for (const n of ['42776', '42 776', '14866', '14 866', '1374', '2613', '2332', '4533', '2590', '1180', '1924', '2399', '1093', '6122', '6 122', '67152', '81775', '50507', '1779']) {
      expect(snap).not.toContain(n)
      expect(params).not.toContain(n)
    }
    for (const n of ['67.2', '81.8', '50.5', '14.9', '16.4', '1.92', '42.8', '0.27', '13.5']) expect(snap).not.toContain(n)
  })
})

describe('non-régression : sorties identiques au moteur du Day 0 (fixtures/lvt-day0-outputs.json, à 1e-9)', () => {
  const nYears = 30
  const ctx = (P) => ({ startYear: START_YEAR, endYear: START_YEAR + nYears, nYears, years: Array.from({ length: nYears + 1 }, (_, t) => START_YEAR + t), gdpBase2025: P['base.pib.2025'], params: P })
  const close = (a, b) => expect(Math.abs(a - b)).toBeLessThanOrEqual(1e-9)
  for (const [cid, overrides] of Object.entries(DAY0.cases)) {
    it(`cas ${cid} : a par bloc, yS haut, composantes et flux, scénarios 0 à 5`, () => {
      const P = resolveParams(overrides)
      for (const scenario of [0, 1, 2, 3, 4, 5]) {
        const ref = DAY0.runs[`${cid}|${scenario}`]
        const inst = runModule(LVT_MODULE, { scenario, offre_ocde: 1 }, ctx(P))
        DAY0.years.forEach((t, i) => {
          close(inst.aBlocks.centrales[t], ref.centrales[i])
          close(inst.aBlocks.securiteSociale[t], ref.securiteSociale[i])
          close(inst.aBlocks.locales[t], ref.locales[i])
          close(inst.yS.haut[t], ref.ysHaut[i])
        })
        const k = lvtComponents(scenario, P)
        if (ref.totalNouvelle === undefined) expect(k).toBeNull()
        else for (const key of ['totalNouvelle', 'secuPerte', 'capiBrute', 'capiInverse', 'capitalisation']) close(k[key], ref[key])
        if (ref.flux) {
          expect(inst.flux.map((f) => f.bloc)).toEqual(ref.flux.map(([b]) => b))
          inst.flux.forEach((f, i) => close(f.montant, ref.flux[i][1]))
        }
      }
    })
  }
})
