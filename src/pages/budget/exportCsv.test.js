import { describe, it, expect } from 'vitest'
import { projectScenario } from '../../engine/project.js'
import { PARAM_BY_ID } from '../../engine/params.js'
import { csvNumber, csvText, buildExportRows, buildCsv, COLUMNS } from './exportCsv.js'
import { overridesForMacro, MACRO_VARIANT_BY_ID } from './presets.js'

const EPS = PARAM_BY_ID['fisc.eps'].value
const EPS_OFFRE = PARAM_BY_ID['fisc.eps_offre'].value
const levers = { tva_normal: 3, ir: -10 }
const scen = (l, ysCase = 'central') => ({
  r: projectScenario({ levers: l, horizon: 'dixAns', ysCase }), ref: projectScenario({ levers: {}, horizon: 'dixAns', ysCase }),
})

describe('formats CSV', () => {
  it('virgule décimale, pas de séparateur de milliers, vide si non fini', () => {
    expect(csvNumber(1234.5678, 2)).toBe('1234,57')
    expect(csvNumber(-0.5)).toBe('-0,5')
    expect(csvNumber(-0.0000001, 3)).toBe('0')
    expect(csvNumber(NaN)).toBe('')
    expect(csvNumber(Infinity)).toBe('')
    expect(csvNumber(undefined)).toBe('')
  })
  it('protège les textes contenant « ; », guillemets ou sauts de ligne', () => {
    expect(csvText('a;b')).toBe('"a;b"')
    expect(csvText('dit "oui"')).toBe('"dit ""oui"""')
    expect(csvText('simple')).toBe('simple')
  })
})

describe('buildCsv', () => {
  const { r, ref } = scen(levers)
  const rows = buildExportRows(r, ref, EPS, EPS_OFFRE)
  const csv = buildCsv({ stamp: 'v0.0.0 · abc1234 · 2026-12-01', url: 'https://x.test/#/budget?h=dixAns&cas=central&tva_normal=3&ir=-10', horizonLabel: '10 ans', ysCase: 'central', values: levers, rows })
  const lines = csv.slice(1).split('\r\n')

  it('commence par le BOM UTF-8 et finit par un saut de ligne', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.endsWith('\r\n')).toBe(true)
  })
  it('contient version, lien, horizon, cas et leviers actifs', () => {
    expect(lines).toContain('Version;v0.0.0 · abc1234 · 2026-12-01')
    expect(lines.some((l) => l.startsWith('Lien du scénario;https://x.test/#/budget?h=dixAns'))).toBe(true)
    expect(lines).toContain('Horizon;10 ans')
    expect(lines).toContain('Cas des effets d\'offre;central')
    expect(lines).toContain('TVA, taux normal;3;points de taux')
    expect(lines.some((l) => l.startsWith('Impôt sur le revenu;-10;'))).toBe(true)
  })
  it('un tableau, une ligne par année, même nombre de colonnes que l\'en-tête', () => {
    const head = lines.indexOf(COLUMNS.join(';'))
    expect(head).toBeGreaterThan(0)
    expect(lines[head - 1]).toBe('')
    const body = lines.slice(head + 1).filter(Boolean)
    expect(body.length).toBe(r.years.length)
    expect(body[0].startsWith('2026;')).toBe(true)
    for (const l of body) {
      expect(l.split(';').length).toBe(COLUMNS.length)
      expect(l).not.toMatch(/NaN|Infinity|undefined/)
    }
  })
  it('les causes somment à l\'écart de solde, ligne par ligne', () => {
    for (const row of rows) {
      const causes = row.slice(12).reduce((s, v) => s + v, 0)
      expect(causes).toBeCloseTo(row[11], 6)
    }
  })
  it('sans levier : mention explicite et écarts nuls', () => {
    const { r: r0, ref: ref0 } = scen({})
    const out = buildCsv({ stamp: 's', url: 'u', horizonLabel: 'h', ysCase: 'central', values: {}, rows: buildExportRows(r0, ref0, EPS, EPS_OFFRE) })
    expect(out).toContain('Aucun levier actif')
    for (const row of buildExportRows(r0, ref0, EPS, EPS_OFFRE)) expect(Math.abs(row[11])).toBeLessThan(1e-9)
  })
  it('tient sur des leviers extrêmes et les trois cas sans NaN', () => {
    for (const ysCase of ['bas', 'central', 'haut']) {
      const { r: a, ref: b } = scen({ tva_normal: 5, ir: -30, dep_enseignement: -50 }, ysCase)
      const out = buildCsv({ stamp: 's', url: 'u', horizonLabel: 'h', ysCase, values: {}, rows: buildExportRows(a, b, EPS, EPS_OFFRE) })
      expect(out).not.toMatch(/NaN|Infinity/)
    }
  })
  it('inclut le comparateur macroéconomique dans l\'en-tête et conserve l\'identité exacte des causes', () => {
    const ref0 = projectScenario({ levers: {}, horizon: 'dixAns', ysCase: 'central' })
    const rGov = projectScenario({ levers: {}, overrides: overridesForMacro('gouv_resf_2027'), horizon: 'dixAns', ysCase: 'central' })
    const govRows = buildExportRows(rGov, ref0, EPS, EPS_OFFRE)
    for (const row of govRows) {
      const causes = row.slice(12).reduce((s, v) => s + v, 0)
      expect(causes).toBeCloseTo(row[11], 6)
    }
    const label = MACRO_VARIANT_BY_ID.gouv_resf_2027.label
    const out = buildCsv({ stamp: 's', url: 'u', horizonLabel: '10 ans', ysCase: 'central', macroLabel: label, values: {}, rows: govRows })
    expect(out).toContain(`Hypothèses macroéconomiques;${label}`)
    expect(out).toContain('Aucun levier actif (comparateur macroéconomique seul)')
    expect(out).not.toMatch(/NaN|Infinity|undefined/)
  })
})
