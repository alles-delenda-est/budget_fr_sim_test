import { describe, it, expect } from 'vitest'
import { LEVER_BY_ID, staticYield } from '../../engine/levers.js'
import { PARAM_BY_ID, resolveParams } from '../../engine/params.js'
import { projectScenario, HORIZONS } from '../../engine/project.js'
import { decomposeAtYear, sliderStep, paramIdsFor } from './helpers.js'
import { NEUTRAL_SCENARIOS, SCENARIO_BY_ID, MACRO_VARIANTS, MACRO_VARIANT_BY_ID, overridesForMacro, matchesScenario } from './presets.js'
import { encodeScenario, decodeScenario } from './share.js'

const P = resolveParams()
const EPS = PARAM_BY_ID['fisc.eps'].value
const EPS_OFFRE = PARAM_BY_ID['fisc.eps_offre'].value

function firstNonFinite(o, path = 'root', seen = new Set()) {
  if (typeof o === 'number') return Number.isFinite(o) ? null : `${path}=${o}`
  if (o && typeof o === 'object') {
    if (seen.has(o)) return null
    seen.add(o)
    for (const [k, v] of Object.entries(o)) {
      const r = firstNonFinite(v, `${path}.${k}`, seen)
      if (r) return r
    }
  }
  return null
}

describe('scénarios types neutres', () => {
  it('contient exactement les 6 scénarios neutres attendus avec des identifiants uniques', () => {
    expect(NEUTRAL_SCENARIOS.map((s) => s.id)).toEqual([
      'reference', 'previsions_gouv', 'equilibre', 'depenses', 'recettes', 'tva_sociale',
    ])
    expect(Object.keys(SCENARIO_BY_ID)).toHaveLength(6)
  })

  it('ne contient aucun nom partisan ni de préréglage « comptes notionnels »', () => {
    const forbidden = /\b(barnier|knafo|nfp|nouveau front populaire|g[ée]n[ée]ration libre|rn|lfi|macron|le pen|reconqu[êe]te|parti lib[ée]ral|comptes?\s+notionnels?)\b/i
    for (const sc of NEUTRAL_SCENARIOS) {
      for (const txt of [sc.id, sc.titre, sc.resume, sc.description]) {
        expect(txt).not.toMatch(forbidden)
      }
    }
    for (const mv of MACRO_VARIANTS) {
      for (const txt of [mv.id, mv.label, mv.description]) {
        expect(txt).not.toMatch(forbidden)
      }
    }
  })

  it('chaque scénario n\'utilise que des leviers valides dans [min, max], alignés sur le pas du curseur, et des paramètres macro valides', () => {
    for (const sc of NEUTRAL_SCENARIOS) {
      for (const [id, x] of Object.entries(sc.levers)) {
        expect(Object.hasOwn(LEVER_BY_ID, id), `${sc.id}.${id}`).toBe(true)
        const l = LEVER_BY_ID[id]
        expect(Number.isFinite(x), `${sc.id}.${id}`).toBe(true)
        expect(x).toBeGreaterThanOrEqual(l.min)
        expect(x).toBeLessThanOrEqual(l.max)
        const step = sliderStep(l)
        expect(Math.abs(Math.round(x / step) * step - x), `${sc.id}.${id} multiple de ${step}`).toBeLessThan(1e-9)
      }
      if (sc.macroId !== null) {
        expect(Object.hasOwn(MACRO_VARIANT_BY_ID, sc.macroId)).toBe(true)
        const ov = overridesForMacro(sc.macroId)
        expect(() => resolveParams(ov)).not.toThrow()
        for (const pid of MACRO_VARIANT_BY_ID[sc.macroId].paramIds) {
          expect(Object.hasOwn(PARAM_BY_ID, pid), `param ${pid}`).toBe(true)
        }
      }
    }
  })

  it('le comparateur Prévisions du Gouvernement (RESF 2027) reprend les valeurs de la note §1.2 et précise qu\'il n\'est jamais une cible', () => {
    const sc = SCENARIO_BY_ID.previsions_gouv
    expect(sc.levers).toEqual({})
    expect(sc.macroId).toBe('gouv_resf_2027')
    expect(sc.description).toContain('jamais une cible')
    expect(sc.description).toContain('RESF 2027')
    const ov = overridesForMacro('gouv_resf_2027')
    expect(ov['macro.g.2026']).toBe(PARAM_BY_ID['cmp.gouv.croissance.2026'].value)
    expect(ov['macro.g.2027']).toBe(PARAM_BY_ID['cmp.gouv.croissance.2027'].value)
    expect(ov['macro.g.potentielle']).toBe(PARAM_BY_ID['cmp.gouv.croissance.potentielle'].value)
    expect(ov['macro.pi.2026']).toBe(2.1)
    expect(ov['macro.pi.2027']).toBe(1.8)
    expect(ov['macro.pi.long']).toBe(1.8)
    expect(overridesForMacro('inconnu')).toBeUndefined()
    expect(overridesForMacro('__proto__')).toBeUndefined()
    expect(paramIdsFor({}, null, 'gouv_resf_2027')).toContain('cmp.gouv.croissance.2027')
  })

  it('ajustement équilibré : partage statique proche de 50/50 entre recettes et dépenses/prestations', () => {
    const sc = SCENARIO_BY_ID.equilibre
    let rec = 0
    let dep = 0
    for (const [id, x] of Object.entries(sc.levers)) {
      const l = LEVER_BY_ID[id]
      const y = staticYield(l, x, P)
      if (l.type === 'recette') rec += y
      else dep += y
    }
    const shareRec = rec / (rec + dep)
    expect(shareRec).toBeGreaterThanOrEqual(0.45)
    expect(shareRec).toBeLessThanOrEqual(0.55)
  })

  it('bascule TVA sociale : quasi neutre ex ante (< 0,5 Md€), transfert ASSO → Centrales, gain d\'offre net positif au cas central', () => {
    const sc = SCENARIO_BY_ID.tva_sociale
    const totalStatic = Object.entries(sc.levers).reduce((s, [id, x]) => s + staticYield(LEVER_BY_ID[id], x, P), 0)
    expect(Math.abs(totalStatic)).toBeLessThan(0.5)

    const ref = projectScenario({ levers: {}, horizon: 'dixAns', ysCase: 'central' })
    const r = projectScenario({ levers: sc.levers, horizon: 'dixAns', ysCase: 'central' })
    const t = 10
    expect(r.blocks.centrales[t].balance - ref.blocks.centrales[t].balance).toBeGreaterThan(10)
    expect(r.blocks.securiteSociale[t].balance - ref.blocks.securiteSociale[t].balance).toBeLessThan(-10)
    expect(r.total[t].yS).toBeGreaterThan(0)
  })

  it('chaque scénario tourne sans NaN/Infinity sur les 3 horizons × 3 cas d\'offre et garde une décomposition algébriquement exacte', () => {
    for (const horizon of Object.keys(HORIZONS)) {
      for (const ysCase of ['bas', 'central', 'haut']) {
        const ref = projectScenario({ levers: {}, horizon, ysCase })
        for (const sc of NEUTRAL_SCENARIOS) {
          const r = projectScenario({ levers: sc.levers, overrides: overridesForMacro(sc.macroId), horizon, ysCase })
          expect(firstNonFinite(r), `${sc.id} ${horizon} ${ysCase}`).toBeNull()
          const checkYears = [1, Math.min(5, r.years.length - 1), r.years.length - 1]
          for (const t of checkYears) {
            const d = decomposeAtYear(r, ref, t, EPS, EPS_OFFRE)
            const sum = d.lines.reduce((s, l) => s + l.montant, 0)
            expect(Math.abs(sum - d.ecart), `${sc.id} ${horizon} ${ysCase} t=${t}`).toBeLessThan(1e-6)
          }
        }
      }
    }
  })

  it('décomposition algébriquement exacte quand Prévisions du Gouvernement est combiné avec des leviers', () => {
    const ref = projectScenario({ levers: {}, horizon: 'dixAns', ysCase: 'central' })
    const r = projectScenario({
      levers: SCENARIO_BY_ID.equilibre.levers,
      overrides: overridesForMacro('gouv_resf_2027'),
      horizon: 'dixAns',
      ysCase: 'central',
    })
    for (let t = 0; t < r.years.length; t++) {
      const d = decomposeAtYear(r, ref, t, EPS, EPS_OFFRE)
      const sum = d.lines.reduce((s, l) => s + l.montant, 0)
      expect(Math.abs(sum - d.ecart), `t=${t}`).toBeLessThan(1e-6)
    }
  })

  it('matchesScenario détecte l\'état exact, tolère les 0 explicites et s\'efface dès qu\'un curseur change', () => {
    expect(matchesScenario(SCENARIO_BY_ID.reference, {}, null)).toBe(true)
    expect(matchesScenario(SCENARIO_BY_ID.reference, { tva_normal: 0 }, null)).toBe(true)
    expect(matchesScenario(SCENARIO_BY_ID.reference, {}, 'gouv_resf_2027')).toBe(false)
    expect(matchesScenario(SCENARIO_BY_ID.previsions_gouv, {}, 'gouv_resf_2027')).toBe(true)
    expect(matchesScenario(SCENARIO_BY_ID.previsions_gouv, { tva_normal: 1 }, 'gouv_resf_2027')).toBe(false)
    expect(matchesScenario(SCENARIO_BY_ID.tva_sociale, { tva_tous_taux: 1.5, cotis_patronales: -2 }, null)).toBe(true)
    expect(matchesScenario(SCENARIO_BY_ID.tva_sociale, { tva_tous_taux: 1.5, cotis_patronales: -1.5 }, null)).toBe(false)
    expect(matchesScenario(null, {}, null)).toBe(false)
  })

  it('aller-retour URL complet pour chaque scénario type neutre', () => {
    for (const sc of NEUTRAL_SCENARIOS) {
      const encoded = encodeScenario({ values: sc.levers, horizon: 'dixAns', ysCase: 'central', macroId: sc.macroId })
      const decoded = decodeScenario(encoded)
      expect(matchesScenario(sc, decoded.values, decoded.macroId), sc.id).toBe(true)
    }
  })
})
