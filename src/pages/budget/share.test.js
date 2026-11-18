import { describe, it, expect } from 'vitest'
import { LEVERS } from '../../engine/levers.js'
import { encodeScenario, decodeScenario, queryFromHash, scenarioHash, scenarioUrl } from './share.js'

describe('liens de scénario', () => {
  it('encode horizon, cas et leviers non nuls', () => {
    const q = encodeScenario({ values: { tva_normal: 3, ir: -10, csg: 0 }, horizon: 'dixAns', ysCase: 'central' })
    expect(q).toBe('h=dixAns&cas=central&tva_normal=3&ir=-10')
  })
  it('décode ce qui a été encodé (aller-retour)', () => {
    const s = { values: { tva_normal: 2.5, ir: -10, is: 4 }, horizon: 'trenteAns', ysCase: 'haut' }
    expect(decodeScenario(encodeScenario(s))).toEqual(s)
  })
  it('aller-retour sur tous les leviers au maximum', () => {
    const values = Object.fromEntries(LEVERS.map((l) => [l.id, l.max]))
    const s = { values, horizon: 'jusqua2040', ysCase: 'bas' }
    expect(decodeScenario(encodeScenario(s))).toEqual(s)
  })
  it('valeurs par défaut si la requête est vide ou absente', () => {
    const d = { values: {}, horizon: 'dixAns', ysCase: 'central' }
    expect(decodeScenario('')).toEqual(d)
    expect(decodeScenario(undefined)).toEqual(d)
    expect(decodeScenario(null)).toEqual(d)
  })
  it('ignore les clés inconnues, y compris celles du prototype', () => {
    const r = decodeScenario('foo=3&__proto__=1&constructor=2&toString=4&tva_normal=1')
    expect(r.values).toEqual({ tva_normal: 1 })
    expect(Object.keys(r)).toEqual(['values', 'horizon', 'ysCase'])
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
})
