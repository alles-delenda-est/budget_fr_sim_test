import { describe, it, expect } from 'vitest'
import { projectScenario, HORIZONS } from '../../engine/project.js'
import { resolveParams, PARAM_BY_ID } from '../../engine/params.js'
import { NDC_MODULE } from '../../engine/ndc-module.js'
import { decomposeAtYear } from '../budget/helpers.js'
import { evaluateWarnings } from '../budget/warnings.js'
import {
  LEGAL_AGE_BASE,
  COR_VARIANTS,
  HEALTH_VARIANTS,
  NDC_PRESET,
  UNVALIDATED_PENSION_ITEMS,
  matchesNdcPreset,
  buildPensionOverrides,
  legalAgeFromDelta,
  buildPensionSeries,
  buildPensionSnapshots,
} from './helpers.js'

const EPS = PARAM_BY_ID['fisc.eps'].value
const EPS_OFFRE = PARAM_BY_ID['fisc.eps_offre'].value

describe('Simulateur Retraites : variantes COR 2026 & santé Commission 2024', () => {
  it('produit des projections finies (zéro NaN/Infinity) pour tous horizons, variantes et cas d\'offre', () => {
    for (const cor of COR_VARIANTS) {
      for (const health of HEALTH_VARIANTS) {
        const overrides = buildPensionOverrides({ corVariant: cor.id, healthVariant: health.id })
        const P = resolveParams(overrides)
        for (const h of Object.keys(HORIZONS)) {
          for (const ysCase of ['bas', 'central', 'haut']) {
            const ref = projectScenario({ levers: {}, horizon: h, ysCase, overrides })
            const res = projectScenario({
              levers: { age_legal: 1, indexation_pensions: -1 },
              horizon: h,
              ysCase,
              overrides,
            })
            const series = buildPensionSeries(res, ref, P)
            expect(series.length).toBe(res.years.length)
            for (const row of series) {
              for (const v of Object.values(row)) expect(Number.isFinite(v)).toBe(true)
            }
            const snaps = buildPensionSnapshots(res, ref, P)
            expect(snaps.length).toBeGreaterThanOrEqual(2)
            for (const s of snaps) {
              for (const [k, v] of Object.entries(s)) {
                if (k !== 'titre') expect(Number.isFinite(v)).toBe(true)
              }
            }
          }
        }
      }
    }
  })

  it('une productivité COR basse ou la dérive dépendance aggrave la dette à 30 ans', () => {
    const central = projectScenario({ horizon: 'trenteAns', overrides: buildPensionOverrides() })
    const corBasse = projectScenario({ horizon: 'trenteAns', overrides: buildPensionOverrides({ corVariant: 'basse' }) })
    const corHaute = projectScenario({ horizon: 'trenteAns', overrides: buildPensionOverrides({ corVariant: 'haute' }) })
    const dependance = projectScenario({ horizon: 'trenteAns', overrides: buildPensionOverrides({ healthVariant: 'longueDuree' }) })

    const lastDebt = (r) => r.total[r.total.length - 1].debtRatio
    expect(lastDebt(corBasse)).toBeGreaterThan(lastDebt(central))
    expect(lastDebt(corHaute)).toBeLessThan(lastDebt(central))
    expect(lastDebt(dependance)).toBeGreaterThan(lastDebt(central))
    expect(evaluateWarnings(central).tier1).not.toBeNull()
  })
})

describe('Simulateur Retraites : âge légal, indexation et décomposition exacte', () => {
  it('mappe correctement l\'écart d\'âge légal autour de 64 ans', () => {
    expect(LEGAL_AGE_BASE).toBe(64)
    expect(legalAgeFromDelta(-2)).toBe(62)
    expect(legalAgeFromDelta(0)).toBe(64)
    expect(legalAgeFromDelta(1.5)).toBe(65.5)
    expect(legalAgeFromDelta(3)).toBe(67)
    expect(legalAgeFromDelta(NaN)).toBe(64)
  })

  it('la décomposition par cause reste exacte sous toutes variantes COR/santé', () => {
    const overrides = buildPensionOverrides({ corVariant: 'basse', healthVariant: 'longueDuree' })
    for (const ysCase of ['bas', 'central', 'haut']) {
      const ref = projectScenario({ levers: {}, horizon: 'trenteAns', ysCase, overrides })
      const res = projectScenario({
        levers: { age_legal: 2, indexation_pensions: -1.5 },
        horizon: 'trenteAns',
        ysCase,
        overrides,
      })
      for (const t of [1, 5, 10, 20, res.years.length - 1]) {
        const d = decomposeAtYear(res, ref, t, EPS, EPS_OFFRE)
        expect(d.lines.reduce((s, l) => s + l.montant, 0)).toBeCloseTo(d.ecart, 6)
      }
      // En 2033 (t = 7), l'âge légal porte à la fois l'effet statique et l'effet d'offre emploi seniors (> 0)
      const d2033 = decomposeAtYear(res, ref, 7, EPS, EPS_OFFRE)
      expect(d2033.lines.some((l) => l.key === 'offre:age_legal' && l.montant > 0)).toBe(true)
    }
  })

  it('expose le préréglage Comptes notionnels (D8) en « non validé » et garde le plafonnement désactivé', () => {
    expect(NDC_PRESET.ageDelta).toBe(1)
    expect(NDC_PRESET.indexDelta).toBe(0)
    expect(NDC_PRESET.ndcActive).toBe(true)
    expect(NDC_PRESET.statut).toBe('non validé')
    expect(NDC_PRESET.description).toMatch(/Parti libéral français/i)
    expect(NDC_PRESET.description).toMatch(/−53 %/)

    expect(matchesNdcPreset({ ageDelta: 1, indexDelta: 0, ndcActive: true })).toBe(true)
    expect(matchesNdcPreset({ ageDelta: 0, indexDelta: 0, ndcActive: true })).toBe(false)
    expect(matchesNdcPreset({ ageDelta: 1, indexDelta: -1, ndcActive: true })).toBe(false)
    expect(matchesNdcPreset({ ageDelta: 1, indexDelta: 0, ndcActive: false })).toBe(false)

    expect(UNVALIDATED_PENSION_ITEMS.map((x) => x.id)).toEqual(['plafonnement_pensions'])
    UNVALIDATED_PENSION_ITEMS.forEach((x) => expect(x.statut).toBe('non validé'))
  })

  it('intègre NDC_MODULE dans les séries ASSO (pensionLeversPct) et la décomposition exacte', () => {
    const overrides = buildPensionOverrides({ corVariant: 'central', healthVariant: 'central' })
    const P = resolveParams(overrides)
    const ref = projectScenario({ levers: {}, horizon: 'trenteAns', overrides })
    const ageOnly = projectScenario({ levers: { age_legal: 1 }, horizon: 'trenteAns', overrides })
    const ndcPreset = projectScenario({
      levers: { age_legal: NDC_PRESET.ageDelta },
      modules: [{ module: NDC_MODULE, levers: { actif: 1 } }],
      horizon: 'trenteAns',
      overrides,
    })

    const sAge = buildPensionSeries(ageOnly, ref, P)
    const sNdc = buildPensionSeries(ndcPreset, ref, P)
    const last = sNdc.length - 1
    expect(sNdc[last].pensionLeversPct).toBeGreaterThan(sAge[last].pensionLeversPct)
    // Effet d'offre identique (le module NDC n'ajoute pas d'effet d'offre propre)
    expect(sNdc[last].supplyGdpPct).toBeCloseTo(sAge[last].supplyGdpPct, 9)

    const d = decomposeAtYear(ndcPreset, ref, last, EPS, EPS_OFFRE)
    expect(d.lines.reduce((s, l) => s + l.montant, 0)).toBeCloseTo(d.ecart, 6)
    expect(d.lines.some((l) => l.key === `static:${NDC_MODULE.id}` && l.label === `${NDC_MODULE.titre} : effet statique`)).toBe(true)
  })
})
