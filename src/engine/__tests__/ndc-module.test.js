import { describe, it, expect } from 'vitest'
import { NDC_MODULE, NDC_START_T, NDC_RAMP_YEARS } from '../ndc-module.js'
import { validateModuleDefinition, runModule } from '../modules.js'
import { resolveParams, PARAM_BY_ID, interpolateSeries } from '../params.js'
import { projectScenario, HORIZONS, START_YEAR } from '../project.js'
import { decomposeAtYear } from '../../pages/budget/helpers.js'
import { COR_VARIANTS, buildPensionOverrides } from '../../pages/retraites/helpers.js'

const EPS = PARAM_BY_ID['fisc.eps'].value
const EPS_OFFRE = PARAM_BY_ID['fisc.eps_offre'].value

function makeContext(P, nYears = 30) {
  const years = Array.from({ length: nYears + 1 }, (_, t) => START_YEAR + t)
  return {
    startYear: START_YEAR,
    endYear: START_YEAR + nYears,
    nYears,
    years,
    gdpBase2025: P['base.pib.2025'],
    params: P,
  }
}

describe('NDC_MODULE : contrat de module (src/engine/modules.js)', () => {
  it('respecte intégralement validateModuleDefinition et le statut non validé', () => {
    expect(validateModuleDefinition(NDC_MODULE)).toEqual([])
    expect(NDC_MODULE.id).toBe('comptes_notionnels_ndc')
    expect(NDC_MODULE.statut).toBe('non validé')
    expect(NDC_START_T).toBe(2)
    expect(NDC_RAMP_YEARS).toBe(15)
    expect(NDC_MODULE.sources.length).toBeGreaterThanOrEqual(4)
    expect(NDC_MODULE.sources.some((s) => /COR/i.test(s))).toBe(true)
    expect(NDC_MODULE.sources.some((s) => /Pensionsmyndigheten|Orange Report/i.test(s))).toBe(true)
    expect(NDC_MODULE.sources.some((s) => /Holzmann/i.test(s))).toBe(true)
    // Aucune source primaire ne présente le simulateur partisan comme source primaire
    expect(NDC_MODULE.sources.some((s) => /Parti libéral/i.test(s))).toBe(false)
    // Avertissement externe explicite dans explications
    const expText = NDC_MODULE.explications.join(' ')
    expect(expText).toMatch(/Parti libéral français/i)
    expect(expText).toMatch(/−53 %/)
  })

  it('runModule réussit sans erreur, n\'écrit jamais dans la dette ni les intérêts, flux vide', () => {
    const P = resolveParams()
    const inst = runModule(NDC_MODULE, { actif: 1 }, makeContext(P, 30))
    expect(inst.id).toBe(NDC_MODULE.id)
    expect(inst.titre).toBe(NDC_MODULE.titre)
    expect(inst.statut).toBe('non validé')
    expect(inst.flux).toEqual([])
    // Bloc ASSO uniquement
    expect(inst.aBlocks.centrales.every((v) => v === 0)).toBe(true)
    expect(inst.aBlocks.locales.every((v) => v === 0)).toBe(true)
    // Aucun effet d'offre propre (D2)
    for (const c of ['bas', 'central', 'haut']) {
      expect(inst.yS[c].every((v) => v === 0)).toBe(true)
    }
  })
})

describe('NDC_MODULE : rampe 15 ans dès 2028 et ancrage exact sur COR 2026', () => {
  it('effet nul en 2026-2027 (t < 2) et nul quand actif = 0', () => {
    const P = resolveParams()
    const ctx = makeContext(P, 30)
    const off = runModule(NDC_MODULE, { actif: 0 }, ctx)
    expect(off.aBlocks.securiteSociale.every((v) => v === 0)).toBe(true)

    const on = runModule(NDC_MODULE, { actif: 1 }, ctx)
    expect(on.aBlocks.securiteSociale[0]).toBe(0) // 2026
    expect(on.aBlocks.securiteSociale[1]).toBe(0) // 2027
  })

  it('suit exactement phase * max(0, COR(y) - COR(2025)) / 100 pour les 3 variantes COR', () => {
    for (const cor of COR_VARIANTS) {
      const P = resolveParams({ 'ref.derive.a_retraites': cor.series })
      const ctx = makeContext(P, 30)
      const inst = runModule(NDC_MODULE, { actif: 1 }, ctx)
      const cor2025 = interpolateSeries(cor.series, 2025)

      for (let t = 0; t <= 30; t++) {
        const year = START_YEAR + t
        const phase = t < NDC_START_T ? 0 : Math.min(1, (t - 1) / NDC_RAMP_YEARS)
        const driftPct = Math.max(0, interpolateSeries(cor.series, year) - cor2025)
        const expected = phase * (driftPct / 100)
        expect(inst.aBlocks.securiteSociale[t]).toBeCloseTo(expected, 12)
      }
      // Plein effet atteint dès 2042 (t = 16) : phase = 1
      const y2056 = interpolateSeries(cor.series, 2056)
      expect(inst.aBlocks.securiteSociale[30]).toBeCloseTo((y2056 - cor2025) / 100, 12)
    }
  })

  it('produit une économie plus forte en variante COR productivité basse qu\'en productivité haute', () => {
    const a56 = (corVariant) => {
      const P = resolveParams(buildPensionOverrides({ corVariant }))
      return runModule(NDC_MODULE, { actif: 1 }, makeContext(P, 30)).aBlocks.securiteSociale[30]
    }
    expect(a56('basse')).toBeGreaterThan(a56('central'))
    expect(a56('central')).toBeGreaterThan(a56('haute'))
    expect(a56('haute')).toBeGreaterThan(0)
  })

  it('respecte comp.offset.prestations (0,20 par défaut, surchargeable dans theta)', () => {
    const Pdef = resolveParams()
    const idef = runModule(NDC_MODULE, { actif: 1 }, makeContext(Pdef, 10))
    expect(idef.theta.every((v) => v === 0.20)).toBe(true)

    const P0 = resolveParams({ 'comp.offset.prestations': 0 })
    const i0 = runModule(NDC_MODULE, { actif: 1 }, makeContext(P0, 10))
    expect(i0.theta.every((v) => v === 0)).toBe(true)

    const P25 = resolveParams({ 'comp.offset.prestations': 0.25 })
    const i25 = runModule(NDC_MODULE, { actif: 1 }, makeContext(P25, 10))
    expect(i25.theta.every((v) => v === 0.25)).toBe(true)
  })
})

describe('Préréglage Comptes notionnels complet (age_legal: 1 + NDC_MODULE)', () => {
  it('tourne proprement sur tous horizons × ysCase × variantes COR (zéro NaN, décomposition exacte, titre module)', () => {
    for (const cor of COR_VARIANTS) {
      const overrides = buildPensionOverrides({ corVariant: cor.id })
      for (const h of Object.keys(HORIZONS)) {
        for (const ysCase of ['bas', 'central', 'haut']) {
          const ref = projectScenario({ levers: {}, horizon: h, ysCase, overrides })
          const res = projectScenario({
            levers: { age_legal: 1 },
            modules: [{ module: NDC_MODULE, levers: { actif: 1 } }],
            horizon: h,
            ysCase,
            overrides,
          })

          // Aucun NaN ni Infinity dans les séries totales et par bloc
          for (const row of res.total) {
            expect(Number.isFinite(row.debtRatio)).toBe(true)
            expect(Number.isFinite(row.balanceRatio)).toBe(true)
            expect(Number.isFinite(row.gdpEffect)).toBe(true)
            expect(Number.isFinite(row.yS)).toBe(true)
          }

          // L'effet d'offre vient uniquement de age_legal (pas du module NDC)
          expect(res.supply.lignes.map((l) => l.id)).toEqual(['age_legal'])

          // Décomposition exacte (< 1e-6) et libellé propre du module NDC
          const lastT = res.years.length - 1
          for (const t of [1, Math.min(5, lastT), lastT]) {
            const d = decomposeAtYear(res, ref, t, EPS, EPS_OFFRE)
            expect(d.lines.reduce((s, l) => s + l.montant, 0)).toBeCloseTo(d.ecart, 6)
          }
          const dLast = decomposeAtYear(res, ref, lastT, EPS, EPS_OFFRE)
          const ndcLine = dLast.lines.find((l) => l.key === `static:${NDC_MODULE.id}`)
          expect(ndcLine).toBeDefined()
          expect(ndcLine.label).toBe(`${NDC_MODULE.titre} : effet statique`)
          expect(ndcLine.montant).toBeGreaterThan(0)
        }
      }
    }
  })

  it('améliore la dette 2056 davantage avec NDC_MODULE + age_legal qu\'avec age_legal seul', () => {
    const ageOnly = projectScenario({ levers: { age_legal: 1 }, horizon: 'trenteAns' })
    const preset = projectScenario({
      levers: { age_legal: 1 },
      modules: [{ module: NDC_MODULE, levers: { actif: 1 } }],
      horizon: 'trenteAns',
    })
    const n = preset.total.length - 1
    expect(preset.total[n].debtRatio).toBeLessThan(ageOnly.total[n].debtRatio)
    expect(preset.blocks.securiteSociale[n].leversExAnte).toBeGreaterThan(ageOnly.blocks.securiteSociale[n].leversExAnte)
  })
})
