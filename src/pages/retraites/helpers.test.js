import { describe, it, expect } from 'vitest'
import { projectScenario, HORIZONS } from '../../engine/project.js'
import { resolveParams, PARAM_BY_ID } from '../../engine/params.js'
import { NDC_MODULE } from '../../engine/ndc-module.js'
import { decomposeAtYear } from '../budget/helpers.js'
import { evaluateWarnings } from '../budget/warnings.js'
import {
  LEGAL_AGE_BASE,
  SOURCE_LINKS,
  splitCitations,
  paramStatuses,
  LEVER_STATUS_PARAMS,
  COR_SHARE_2025,
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

    const ageBas = projectScenario({ levers: { age_legal: 1 }, horizon: 'trenteAns', ysCase: 'bas', overrides })
    const ageHaut = projectScenario({ levers: { age_legal: 1 }, horizon: 'trenteAns', ysCase: 'haut', overrides })
    const sBand = buildPensionSeries(ageOnly, ref, P, { bas: ageBas, central: ageOnly, haut: ageHaut })
    for (const r of sBand) {
      expect(r.debtBand[0]).toBeLessThanOrEqual(r.debt + 1e-12)
      expect(r.debt).toBeLessThanOrEqual(r.debtBand[1] + 1e-12)
      expect(r.balanceBand[0]).toBeLessThanOrEqual(r.balance + 1e-12)
      expect(r.balance).toBeLessThanOrEqual(r.balanceBand[1] + 1e-12)
    }

    const d = decomposeAtYear(ndcPreset, ref, last, EPS, EPS_OFFRE)
    expect(d.lines.reduce((s, l) => s + l.montant, 0)).toBeCloseTo(d.ecart, 6)
    expect(d.lines.some((l) => l.key === `static:${NDC_MODULE.id}` && l.label === `${NDC_MODULE.titre} : effet statique`)).toBe(true)
  })
})

describe('Simulateur Retraites : textes lus dans les paramètres et sources liées', () => {
  const COR = PARAM_BY_ID['ref.derive.a_retraites']

  it('les libellés COR et santé reprennent les valeurs des paramètres (aucun « favorable / défavorable »)', () => {
    expect(COR_VARIANTS[0].label).toContain(`${COR.value[2070].toFixed(1).replace('.', ',')} % en 2070`)
    expect(COR_VARIANTS[1].label).toContain(`${COR.low[2070].toFixed(1).replace('.', ',')} % en 2070`)
    expect(COR_VARIANTS[2].label).toContain(`${COR.high[2070].toFixed(1).replace('.', ',')} % en 2070`)
    for (const v of COR_VARIANTS) expect(v.description).not.toMatch(/favorable/)
    expect(HEALTH_VARIANTS.every((v) => !/NaN|undefined/.test(v.label + v.description))).toBe(true)
  })

  it('préréglage NDC : économie posée par hypothèse (part 2025 lue dans les paramètres) et risque de double compte', () => {
    expect(COR_SHARE_2025).toBe(COR.value[2025])
    const share = `${COR_SHARE_2025.toFixed(1).replace('.', ',')} %`
    for (const txt of [NDC_PRESET.description, NDC_PRESET.hypothese]) {
      expect(txt).toContain(share)
      expect(txt).toMatch(/par hypothèse/)
      expect(txt).toMatch(/deux fois/)
      expect(txt).toMatch(/diviseur de rente/)
    }
    expect(NDC_PRESET.description).not.toMatch(/levier validé/)
    expect(NDC_PRESET.description).toContain('éditeur déclaré : Parti libéral français')
  })

  it('les balises [S23], [S24] et [S27] deviennent des liens (adresses de docs/model-note.md §9)', () => {
    expect(SOURCE_LINKS.S23.url).toMatch(/^https:\/\/www\.cor-retraites\.fr\//)
    expect(SOURCE_LINKS.S24.url).toBe('https://g-pliberal.github.io/retraitecomptenotionelle/')
    expect(SOURCE_LINKS.S27.url).toBe('https://www.vie-publique.fr/files/rapport/pdf/297428.pdf')
    const refs = splitCitations(NDC_PRESET.description).filter((p) => p.ref).map((p) => p.ref)
    expect(refs).toEqual(['S23', 'S24'])
    expect(splitCitations('a [S99] b')).toEqual([{ text: 'a [S99] b' }])
    expect(splitCitations('[S15][S16][S27]')).toEqual([{ ref: 'S15' }, { ref: 'S16' }, { ref: 'S27' }])
  })

  it('les pastilles des leviers affichent le statut réel des paramètres', () => {
    expect(paramStatuses(LEVER_STATUS_PARAMS.age_legal)).toEqual([
      PARAM_BY_ID['rend.age_legal.hausse'].status,
      PARAM_BY_ID['comp.offset.age_legal'].status,
    ])
    expect(paramStatuses(LEVER_STATUS_PARAMS.indexation_pensions)).toEqual([COR.status])
  })
})
