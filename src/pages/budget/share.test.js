import { describe, it, expect } from 'vitest'
import { LEVERS } from '../../engine/levers.js'
import { encodeScenario, decodeScenario, queryFromHash, scenarioHash, scenarioUrl } from './share.js'

describe('liens de scénario', () => {
  it('encode horizon, cas et leviers non nuls', () => {
    const q = encodeScenario({ values: { tva_normal: 3, ir: -10, csg: 0 }, horizon: 'dixAns', ysCase: 'central' })
    expect(q).toBe('h=dixAns&cas=central&tva_normal=3&ir=-10')
  })
  it('décode ce qui a été encodé (aller-retour)', () => {
    const s = { values: { tva_normal: 2.5, ir: -10, is: 4 }, horizon: 'trenteAns', ysCase: 'haut', macroId: null }
    expect(decodeScenario(encodeScenario(s))).toEqual(s)
  })
  it('aller-retour sur tous les leviers actifs aux bornes non nulles', () => {
    const values = Object.fromEntries(LEVERS.map((l) => [l.id, l.max !== 0 ? l.max : l.min]))
    const s = { values, horizon: 'jusqua2040', ysCase: 'bas', macroId: null }
    expect(decodeScenario(encodeScenario(s))).toEqual(s)
  })
  it('valeurs par défaut si la requête est vide ou absente', () => {
    const d = { values: {}, horizon: 'dixAns', ysCase: 'central', macroId: null }
    expect(decodeScenario('')).toEqual(d)
    expect(decodeScenario(undefined)).toEqual(d)
    expect(decodeScenario(null)).toEqual(d)
  })
  it('ignore les clés inconnues, y compris celles du prototype', () => {
    const r = decodeScenario('foo=3&__proto__=1&constructor=2&toString=4&tva_normal=1')
    expect(r.values).toEqual({ tva_normal: 1 })
    expect(Object.keys(r)).toEqual(['values', 'horizon', 'ysCase', 'macroId'])
  })
  it('encode et décode la variante macroéconomique (m) et rejette les valeurs invalides', () => {
    const q = encodeScenario({ values: {}, horizon: 'dixAns', ysCase: 'central', macroId: 'gouv_resf_2027' })
    expect(q).toBe('h=dixAns&cas=central&m=gouv_resf_2027')
    expect(decodeScenario(q)).toEqual({ values: {}, horizon: 'dixAns', ysCase: 'central', macroId: 'gouv_resf_2027' })
    const combined = { values: { tva_normal: 1.5 }, horizon: 'jusqua2040', ysCase: 'bas', macroId: 'gouv_resf_2027' }
    expect(decodeScenario(encodeScenario(combined))).toEqual(combined)
    // m est omis quand macroId est null ou inconnu (rétrocompatibilité des liens)
    expect(encodeScenario({ values: { ir: 5 }, macroId: null })).toBe('h=dixAns&cas=central&ir=5')
    expect(encodeScenario({ values: { ir: 5 }, macroId: 'inconnu' })).toBe('h=dixAns&cas=central&ir=5')
    expect(decodeScenario('m=inconnu&m=__proto__&tva_normal=1').macroId).toBeNull()
    expect(decodeScenario('m=constructor').macroId).toBeNull()
    expect(decodeScenario('m=toString').macroId).toBeNull()
  })
  it('rejette horizon et cas inconnus', () => {
    const r = decodeScenario('h=constructor&cas=extreme')
    expect(r.horizon).toBe('dixAns')
    expect(r.ysCase).toBe('central')
    expect(decodeScenario('h=xx&cas=<script>').horizon).toBe('dixAns')
  })
  it('rejette les nombres non finis ou vides', () => {
    expect(decodeScenario('tva_normal=abc&ir=&csg=Infinity&is=NaN&cotis_patronales=%20').values).toEqual({})
    expect(decodeScenario('tva_normal=1e999').values).toEqual({})
  })
  it('borne les valeurs au min / max du levier', () => {
    expect(decodeScenario('tva_normal=99&ir=-999').values).toEqual({ tva_normal: 5, ir: -30 })
  })
  it('n\'encode pas les valeurs non finies', () => {
    expect(encodeScenario({ values: { tva_normal: NaN, ir: Infinity, csg: 1 } })).toBe('h=dixAns&cas=central&csg=1')
  })
  it('extrait la requête du hash', () => {
    expect(queryFromHash('#/budget?h=dixAns&ir=2')).toBe('h=dixAns&ir=2')
    expect(queryFromHash('#/budget')).toBe('')
    expect(queryFromHash('')).toBe('')
  })
  it('construit le hash et l\'URL absolue', () => {
    const s = { values: { ir: -10 }, horizon: 'dixAns', ysCase: 'central' }
    expect(scenarioHash(s)).toBe('#/budget?h=dixAns&cas=central&ir=-10')
    expect(scenarioUrl({ origin: 'https://x.test', pathname: '/', search: '' }, s)).toBe('https://x.test/#/budget?h=dixAns&cas=central&ir=-10')
  })
  it('module taxe sur la valeur du sol : encodé seulement s\'il est actif, aller-retour, valeurs invalides ignorées', () => {
    expect(encodeScenario({ values: {}, lvt: { scenario: 0, ocde: 1 } })).toBe('h=dixAns&cas=central')
    expect(encodeScenario({ values: {}, lvt: { scenario: 4, ocde: 0 } })).toBe('h=dixAns&cas=central&lvt=4')
    const s = { values: { ir: 5 }, horizon: 'dixAns', ysCase: 'haut', macroId: null, lvt: { scenario: 5, ocde: 1 } }
    expect(encodeScenario(s)).toBe('h=dixAns&cas=haut&ir=5&lvt=5&lvt_ocde=1')
    expect(decodeScenario(encodeScenario(s))).toEqual(s)
    for (const bad of ['lvt=0', 'lvt=6', 'lvt=2.5', 'lvt=abc', 'lvt=-1', 'lvt=', 'lvt_ocde=1']) expect(decodeScenario(bad)).not.toHaveProperty('lvt')
    expect(decodeScenario('lvt=2&lvt_ocde=yes').lvt).toEqual({ scenario: 2, ocde: 0 })
    expect(decodeScenario('lvt=3').values).toEqual({})
  })
  it('dynamiques avancées Phase 3 (reg, inf) : encodées seulement si actives, aller-retour, valeurs invalides ignorées', () => {
    expect(encodeScenario({ values: {}, demandRegime: 'normal', endogenousInflation: false })).toBe('h=dixAns&cas=central')
    const s = { values: { tva_normal: 2 }, horizon: 'trenteAns', ysCase: 'central', macroId: null, demandRegime: 'recession', endogenousInflation: true }
    expect(encodeScenario(s)).toBe('h=trenteAns&cas=central&reg=recession&inf=1&tva_normal=2')
    expect(decodeScenario(encodeScenario(s))).toEqual(s)
    expect(decodeScenario('reg=bad&inf=yes')).not.toHaveProperty('demandRegime')
    expect(decodeScenario('reg=bad&inf=yes')).not.toHaveProperty('endogenousInflation')
    expect(decodeScenario('reg=normal&inf=0')).not.toHaveProperty('demandRegime')
  })
  it('étalement pluriannuel (rampe=3|5) : omis à 1 an, aller-retour, valeurs invalides ignorées', () => {
    expect(encodeScenario({ values: { tva_normal: 2 }, phasingYears: 1 })).toBe('h=dixAns&cas=central&tva_normal=2')
    for (const ry of [3, 5]) {
      const s = { values: { tva_normal: 2 }, horizon: 'dixAns', ysCase: 'central', macroId: null, phasingYears: ry }
      expect(encodeScenario(s)).toBe(`h=dixAns&cas=central&rampe=${ry}&tva_normal=2`)
      expect(decodeScenario(encodeScenario(s))).toEqual(s)
    }
    for (const bad of ['rampe=1', 'rampe=2', 'rampe=4', 'rampe=0', 'rampe=-3', 'rampe=3.5', 'rampe=abc', 'rampe=']) {
      expect(decodeScenario(bad)).not.toHaveProperty('phasingYears')
      expect(decodeScenario(bad).values).toEqual({})
    }
  })
  it('scénario épinglé A (a=1&a.*) : encodé seulement si épinglé, aller-retour complet, caractères de contrôle et prototype neutralisés', () => {
    expect(encodeScenario({ values: { ir: 5 }, pinned: null })).toBe('h=dixAns&cas=central&ir=5')
    const pinned = {
      label: 'Recettes 2027 (test)',
      ysCase: 'haut',
      values: { tva_normal: 2, ir: 10 },
      macroId: 'gouv_resf_2027',
      phasingYears: 3,
      demandRegime: 'recession',
      endogenousInflation: true,
      lvt: { scenario: 3, ocde: 1 },
    }
    const s = { values: { dep_defense: -10 }, horizon: 'trenteAns', ysCase: 'bas', macroId: null, pinned }
    const back = decodeScenario(encodeScenario(s))
    expect(back).toEqual(s)
    expect(decodeScenario('a=0&a.tva_normal=2')).not.toHaveProperty('pinned')
    const dirty = decodeScenario('a=1&a.lbl=%00ABC%07&a.__proto__=1&a.tva_normal=99&a.constructor=2')
    expect(dirty.pinned.label).toBe('ABC')
    expect(dirty.pinned.values).toEqual({ tva_normal: 5 })
  })
})
