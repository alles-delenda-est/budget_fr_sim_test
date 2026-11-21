// Tests de comparaison à hypothèses homogènes (« like-for-like ») face aux quatre repères officiels.
// Règle impérative (docs/model-note.md §5) : « comparateurs, jamais cibles ».
// Aucun taux n'est rétro-ajusté pour coller à une cible : chaque hypothèse est soit sourcée
// (avec mention du mode de lecture), soit explicitement signalée « non trouvé » et testée en fourchette.

import { describe, it, expect } from 'vitest'
import { resolveParams } from '../params.js'
import { projectScenario, issuanceRate } from '../project.js'

const P = resolveParams()

const rowOf = (res, year) => res.total.find((r) => r.year === year)
const pct = (x) => x * 100

/**
 * Module neutre (m = 0, θ = 0, yS = 0) injectant un écart de solde primaire exogène à partir de 2027.
 * Sert uniquement à isoler l'effort budgétaire (ou la dérive) propre à un comparateur sans modifier le moteur.
 */
function primaryShiftModule(shiftPctOfGdp) {
  return {
    id: 'comparaison_solde_primaire',
    titre: 'Ajustement primaire exogène (comparaison homogène)',
    sources: ['Test de comparaison homogène — isole la trajectoire de solde primaire d\'un comparateur'],
    statut: 'non validé',
    leviers: [],
    calculer: (_v, ctx) => ({
      annees: ctx.years.map((_, t) => ({
        a: { centrales: t >= 1 ? shiftPctOfGdp / 100 : 0, securiteSociale: 0, locales: 0 },
        theta: 0,
        m: 0,
      })),
    }),
    explications: ['Ajustement exogène neutre pour les tests de comparaison à hypothèses homogènes.'],
  }
}

/** Raccourci pour imposer un taux à l'émission uniforme i* (en %) lorsque la courbe complète n'est pas publiée. */
const flatYields = (iPct) => ({
  'dette.y_btf': iPct,
  'dette.y_moyen': iPct,
  'dette.y_long': iPct,
})

const FLAT_COR = { 2025: 14.1, 2030: 14.1, 2045: 14.1, 2070: 14.1 }

describe('règle « comparateurs, jamais cibles » (model-note.md §5)', () => {
  it('la référence par défaut du moteur (nov. 2026 : i* ≈ 4,38 %, β = 3) n\'est forcée sur aucun comparateur', () => {
    const def = projectScenario({ horizon: 'dixAns' })
    const r2026 = rowOf(def, 2026)
    const r2027 = rowOf(def, 2027)
    const r2029 = rowOf(def, 2029)
    const r2036 = rowOf(def, 2036)

    expect(pct(issuanceRate(P))).toBeCloseTo(4.38, 2)
    expect(P['dette.beta']).toBe(3)

    // Valeurs de référence documentées dans docs/baseline-data.md
    expect(pct(r2026.debtRatio)).toBeCloseTo(117.8, 1)
    expect(pct(r2027.debtRatio)).toBeCloseTo(120.5, 1)
    expect(pct(r2029.debtRatio)).toBeCloseTo(126.7, 1)
    expect(pct(r2036.debtRatio)).toBeCloseTo(158.5, 1)

    // Écarts délibérés (non gommés) par rapport aux comparateurs officiels
    expect(pct(r2026.debtRatio)).toBeLessThan(P['cmp.gouv.dette.2026'] - 1.0)
    expect(pct(r2027.balanceRatio)).toBeLessThan(P['cmp.gouv.solde.2027'] - 0.7)
    expect(pct(r2029.debtRatio)).toBeGreaterThan(P['cmp.cour.dette.2029_derive'] + 2.0)
    expect(pct(r2036.debtRatio)).toBeGreaterThan(P['cmp.dsm.dette.2036'] + 14.0)
  })
})

describe('1. Gouvernement — RESF 2027 (octobre 2026) et PLF 2027', () => {
  // Hypothèses propres au RESF 2027 :
  // - Macro : g = 0,5 % (2026), 1,0 % (2027), 1,2 % (potentielle) ; IPC π = 2,1 % (2026), 1,8 % (2027).
  // - Taux publiés (résumés Sénat / Covéa / PLF 2027, lecture secondaire) : BTF 3 mois ≈ 3,0 %, OAT 10 ans 4,2 %–4,3 % (4,3 % moy. 2027), β = 0.
  // - OAT 2–8 ans : non publié séparément dans les résumés consultés → fourchette transparente 3,7 %–3,9 % (centre 3,8 %).
  const RESF_MACRO = {
    'macro.g.2026': P['cmp.gouv.croissance.2026'],
    'macro.g.2027': P['cmp.gouv.croissance.2027'],
    'macro.g.potentielle': P['cmp.gouv.croissance.potentielle'],
    'macro.pi.2026': 2.1,
    'macro.pi.2027': 1.8,
    'macro.pi.long': 1.8,
    'dette.beta': 0,
  }
  const resfRates = (yMoyen = 3.8, yLong = 4.3) => ({
    ...RESF_MACRO,
    'dette.y_btf': 3.0,
    'dette.y_moyen': yMoyen,
    'dette.y_long': yLong,
  })

  it('2026 (année t = 0) : l\'écart de −1,2 pt de dette/PIB s\'explique entièrement par le déflateur E1 (−0,67 pt), le SFA nul en E11 (−0,48 pt) et l\'écart résiduel d\'intérêts', () => {
    const r = projectScenario({ overrides: resfRates(3.8, 4.3) })
    const r26 = rowOf(r, 2026)

    // E1 utilise l'IPC (2,1 %) comme déflateur du PIB : 2 991 × 1,026 = 3 068,77 Md€ vs 3 051 Md€ dans le RESF (+0,58 %)
    expect(r26.gdpBase).toBeCloseTo(2991 * 1.026, 2)
    const gdpOvershootPct = (r26.gdpBase / P['cmp.gouv.pib.2026'] - 1) * 100
    expect(gdpOvershootPct).toBeCloseTo(0.58, 2)

    // Déflateur implicite du PIB dans le RESF 2026 : (3 051 / 2 991 − 1) − 0,5 % ≈ 1,51 %
    const impliedDeflator2026 = (P['cmp.gouv.pib.2026'] / P['base.pib.2025'] - 1) * 100 - P['cmp.gouv.croissance.2026']
    expect(impliedDeflator2026).toBeCloseTo(1.51, 2)

    // Part de l'écart dette/PIB 2026 expliquée par le déflateur (E1) : ≈ −0,67 pt
    const withDeflator = projectScenario({ overrides: { ...resfRates(3.8, 4.3), 'macro.pi.2026': impliedDeflator2026 } })
    const r26Defl = rowOf(withDeflator, 2026)
    expect(r26Defl.gdpBase).toBeCloseTo(P['cmp.gouv.pib.2026'], 2)
    const deflatorGapPp = pct(r26.debtRatio - r26Defl.debtRatio)
    expect(deflatorGapPp).toBeCloseTo(-0.67, 2)

    // Part expliquée par l'ajustement stock-flux implicite du RESF (E11 suppose SFA = 0) :
    // Dette 2026 à SFA nul selon les agrégats RESF = (3 460,5 + 5,4 % × 3 051) / 3 051 = 118,82 % vs 119,3 % publié → SFA ≈ +0,48 pt
    const resfZeroSfaDebt2026 = (P['base.dette.2025'] + (-P['cmp.gouv.solde.2026'] / 100) * P['cmp.gouv.pib.2026']) / P['cmp.gouv.pib.2026'] * 100
    const resfImpliedSfa2026 = P['cmp.gouv.dette.2026'] - resfZeroSfaDebt2026
    expect(resfZeroSfaDebt2026).toBeCloseTo(118.82, 2)
    expect(resfImpliedSfa2026).toBeCloseTo(0.48, 2)

    // Intérêts et solde 2026 à taux RESF : très proches des comparateurs (2,53 % vs 2,6 %, −5,33 % vs −5,4 %)
    expect(pct(r26.interestRatio)).toBeCloseTo(2.53, 2)
    expect(pct(r26.balanceRatio)).toBeCloseTo(-5.33, 2)
    const interestGapPp = pct(r26Defl.interestRatio) - P['cmp.gouv.interets.2026']

    // Bouclage complet de l'écart 2026 (118,09 % vs 119,30 % = −1,21 pt)
    const totalGap2026 = pct(r26.debtRatio) - P['cmp.gouv.dette.2026']
    expect(totalGap2026).toBeCloseTo(-1.21, 2)
    expect(deflatorGapPp - resfImpliedSfa2026 + interestGapPp).toBeCloseTo(totalGap2026, 2)
  })

  it('2027 sans effort (+0 pt) vs avec effort primaire RESF (+0,7 pt) : intérêts et solde concordent à 0,03 pt près', () => {
    const spb2026Resf = P['cmp.gouv.solde.2026'] + P['cmp.gouv.interets.2026'] // −2,8
    const spb2027Resf = P['cmp.gouv.solde.2027'] + P['cmp.gouv.interets.2027'] // −2,1
    const effort2027 = spb2027Resf - spb2026Resf
    expect(effort2027).toBeCloseTo(0.7, 10)

    // 1. Politique inchangée aux taux et macro RESF : les intérêts 2027 atteignent 2,90 % (91,5 Md€), mais le solde reste à −5,71 %
    const noEffort = rowOf(projectScenario({ overrides: resfRates(3.8, 4.3) }), 2027)
    expect(pct(noEffort.interestRatio)).toBeCloseTo(P['cmp.gouv.interets.2027'], 1) // 2,90 % vs 2,9 %
    expect(noEffort.interest).toBeGreaterThan(90.5)
    expect(noEffort.interest).toBeLessThan(92.5)
    expect(pct(noEffort.balanceRatio) - P['cmp.gouv.solde.2027']).toBeCloseTo(-0.71, 2)

    // 2. Avec effort primaire neutre +0,7 pt en 2027 : solde et intérêts concordent sur toute la fourchette OAT 2–8 ans [3,7 % ; 3,9 %]
    for (const yMid of [3.7, 3.8, 3.9]) {
      const r27 = rowOf(projectScenario({
        overrides: resfRates(yMid, 4.3),
        modules: [{ module: primaryShiftModule(effort2027), levers: {} }],
      }), 2027)
      expect(Math.abs(pct(r27.interestRatio) - P['cmp.gouv.interets.2027'])).toBeLessThan(0.03)
      expect(Math.abs(pct(r27.balanceRatio) - P['cmp.gouv.solde.2027'])).toBeLessThan(0.03)
      expect(r27.interest).toBeGreaterThan(90.5)
      expect(r27.interest).toBeLessThan(92.5)
    }

    // Sensibilité avec OAT 10 ans à 4,2 % (borne basse publiée) et 2–8 ans à 3,7 %
    const r27Low = rowOf(projectScenario({
      overrides: resfRates(3.7, 4.2),
      modules: [{ module: primaryShiftModule(effort2027), levers: {} }],
    }), 2027)
    expect(Math.abs(pct(r27Low.interestRatio) - P['cmp.gouv.interets.2027'])).toBeLessThan(0.05)
    expect(Math.abs(pct(r27Low.balanceRatio) - P['cmp.gouv.solde.2027'])).toBeLessThan(0.05)
  })

  it('2027 dette/PIB : l\'écart résiduel (−1,82 pt) provient du report du déflateur 2026–2027 (−0,72 pt) et des SFA 2026–2027 (−1,06 pt)', () => {
    const withEffort = rowOf(projectScenario({
      overrides: resfRates(3.8, 4.3),
      modules: [{ module: primaryShiftModule(0.7), levers: {} }],
    }), 2027)
    const gap2027 = pct(withEffort.debtRatio) - P['cmp.gouv.dette.2027']
    expect(gap2027).toBeCloseTo(-1.82, 2)

    // Remplacement par les déflateurs implicites du PIB du RESF (PIB exacts 3 051 et 3 135 Md€)
    const pi26Defl = (P['cmp.gouv.pib.2026'] / P['base.pib.2025'] - 1) * 100 - P['cmp.gouv.croissance.2026']
    const pi27Defl = (P['cmp.gouv.pib.2027'] / P['cmp.gouv.pib.2026'] - 1) * 100 - P['cmp.gouv.croissance.2027']
    const withDeflator = rowOf(projectScenario({
      overrides: { ...resfRates(3.8, 4.3), 'macro.pi.2026': pi26Defl, 'macro.pi.2027': pi27Defl },
      modules: [{ module: primaryShiftModule(0.7), levers: {} }],
    }), 2027)
    expect(withDeflator.gdpBase).toBeCloseTo(P['cmp.gouv.pib.2027'], 2)

    const deflatorShare2027 = pct(withEffort.debtRatio - withDeflator.debtRatio)
    expect(deflatorShare2027).toBeCloseTo(-0.72, 2)

    // SFA implicites du RESF en 2026 (+0,48 pt) reporté sur le PIB 2027 + SFA propre 2027 (+0,60 pt)
    const y26 = P['cmp.gouv.pib.2026']
    const y27 = P['cmp.gouv.pib.2027']
    const sfa26Md = (P['cmp.gouv.dette.2026'] / 100) * y26 - (P['base.dette.2025'] + (-P['cmp.gouv.solde.2026'] / 100) * y26)
    const sfa27Md = (P['cmp.gouv.dette.2027'] / 100) * y27 - ((P['cmp.gouv.dette.2026'] / 100) * y26 + (-P['cmp.gouv.solde.2027'] / 100) * y27)
    const carriedAndNewSfaPp = ((sfa26Md + sfa27Md) / y27) * 100
    expect(carriedAndNewSfaPp).toBeCloseTo(1.06, 2)

    // Ensemble, déflateur + SFA expliquent la quasi-totalité de l'écart 2027 (à moins de 0,05 pt près)
    expect(Math.abs(gap2027 - (deflatorShare2027 - carriedAndNewSfaPp))).toBeLessThan(0.05)
  })
})

describe('2. Cour des comptes — La situation et les perspectives des finances publiques (juin 2026)', () => {
  // Millésime de printemps 2026 (antérieur au RESF d'octobre) :
  // - OAT 10 ans autour de 3,9 % fin 2026, β = 0.
  // - Courbe complète BTF / OAT 2–8 ans / OAT 10 ans+ 2026–2029 : non trouvée dans le texte lu.
  //   Test en fourchette transparente à taux long fixé à 3,9 % : BTF ∈ [2,3 % ; 2,7 %], OAT 2–8 ans ∈ [3,2 % ; 3,6 %] (i* ∈ [3,48 % ; 3,68 %]),
  //   plus borne haute uniforme 3,9 %.
  const SPRING_BAND = [
    { label: 'bas', yBtf: 2.3, yMid: 3.2, yLong: 3.9 },
    { label: 'centre', yBtf: 2.5, yMid: 3.4, yLong: 3.9 },
    { label: 'haut', yBtf: 2.7, yMid: 3.6, yLong: 3.9 },
  ]

  it('aux taux par défaut de novembre 2026 (i* = 4,38 %, β = 3), les intérêts 2029 atteignent 129,2 Md€ et la dette 126,7 %', () => {
    const def = projectScenario({})
    const r29 = rowOf(def, 2029)
    expect(r29.interest).toBeCloseTo(129.2, 1)
    expect(pct(r29.debtRatio)).toBeCloseTo(126.7, 1)
    expect(pct(r29.debtRatio) - P['cmp.cour.dette.2029_derive']).toBeCloseTo(2.4, 1)
  })

  it('aux taux de millésime printemps 2026 (OAT 10 ans 3,9 %, β = 0), les intérêts 2029 redescendent vers 108–112 Md€ (> 100 Md€) et la dette se rapproche du scénario « dérive » (124,3 %)', () => {
    const def29 = rowOf(projectScenario({}), 2029)

    for (const band of SPRING_BAND) {
      const ov = {
        'dette.beta': 0,
        'dette.y_btf': band.yBtf,
        'dette.y_moyen': band.yMid,
        'dette.y_long': band.yLong,
      }
      const iStarPct = pct(issuanceRate(resolveParams(ov)))
      expect(iStarPct).toBeGreaterThan(3.45)
      expect(iStarPct).toBeLessThan(3.70)

      const res = projectScenario({ overrides: ov })
      const r26 = rowOf(res, 2026)
      const r29 = rowOf(res, 2029)

      // 2026 : intérêts entre 74,7 et 75,8 Md€ (proches de 77,4 Md€ ; 77,0 Md€ à 3,9 % uniforme)
      expect(r26.interest).toBeGreaterThan(74)
      expect(r26.interest).toBeLessThan(78)

      // 2029 : intérêts entre 107 et 113 Md€ (cohérent avec « plus de 100 Md€ »), soit −17 à −21 Md€ vs nov. 2026
      expect(r29.interest).toBeGreaterThan(P['cmp.cour.interets.2029'])
      expect(r29.interest).toBeGreaterThan(105)
      expect(r29.interest).toBeLessThan(113)
      expect(def29.interest - r29.interest).toBeGreaterThan(16)

      // 2029 : dette entre 125,1 % et 125,5 %, à ~1 pt du scénario « dérive » (124,3 %)
      expect(pct(r29.debtRatio)).toBeGreaterThan(P['cmp.cour.dette.2029_plafonds'])
      expect(Math.abs(pct(r29.debtRatio) - P['cmp.cour.dette.2029_derive'])).toBeLessThan(1.3)
    }

    // Borne haute uniforme 3,9 % (β = 0) : 2026 ≈ 77,0 Md€ (2,50 % vs 77,4 Md€ / 2,5 % Cour), 2029 ≈ 117,0 Md€
    const rUnif = projectScenario({ overrides: { 'dette.beta': 0, ...flatYields(3.9) } })
    expect(rowOf(rUnif, 2026).interest).toBeCloseTo(77.0, 0)
    expect(pct(rowOf(rUnif, 2026).interestRatio)).toBeCloseTo(2.5, 1)
    expect(rowOf(rUnif, 2029).interest).toBeGreaterThan(P['cmp.cour.interets.2029'])
  })

  it('en ajoutant le solde primaire de printemps 2026 (−2,5 % = −5,0 % + 2,5 %, avant révision RESF −2,8 %), la dette 2029 rejoint « dérive » (124,1 % vs 124,3 %)', () => {
    // Dans le rapport de juin 2026, le déficit cible 2026 de printemps était −5,0 % et les intérêts 2,5 % (baseline-data.md item 6a)
    const res = projectScenario({
      overrides: {
        'dette.beta': 0,
        'dette.y_btf': 2.5,
        'dette.y_moyen': 3.4,
        'dette.y_long': 3.9,
        'ref.spb_2026': -2.5,
      },
    })
    const r29 = rowOf(res, 2029)
    expect(Math.abs(pct(r29.debtRatio) - P['cmp.cour.dette.2029_derive'])).toBeLessThan(0.5)
    expect(r29.interest).toBeGreaterThan(P['cmp.cour.interets.2029'])
    expect(r29.interest).toBeLessThan(112)
  })
})

describe('3. Commission européenne — Spring 2026 Economic Forecast (21 mai 2026)', () => {
  // Hypothèses propres à la page pays France (docs/baseline-data.md, Collecte du 17 nov., Point 1) :
  // - Macro : g = 0,8 % (2026), 1,1 % (2027) ; inflation « headline » π = 2,4 % (2026), 1,8 % (2027).
  // - Solde primaire : −2,5 % en 2026 (−5,1 + 2,6), puis −2,9 % en 2027 (−5,7 + 2,8), soit −0,4 pt de dégradation en 2027.
  // - Courbe technique de taux : non trouvée sur la page pays → sensibilité sur i* ∈ [3,3 % ; 3,8 %] (millésime mai 2026), β = 0.
  const EC_DEBT_2026 = 118.1 // baseline-data.md ligne 147 (non présent dans cmp.* de params.js)
  const EC_DEBT_2027 = 120.2 // baseline-data.md ligne 147
  const EC_BASE = {
    'macro.g.2026': 0.8,
    'macro.g.2027': 1.1,
    'macro.pi.2026': 2.4,
    'macro.pi.2027': 1.8,
    'ref.spb_2026': P['cmp.ce.solde.2026'] + P['cmp.ce.interets.2026'], // −2,5 %
    'dette.beta': 0,
  }

  it('2026–2027 : sensibilité aux taux de printemps [3,3 % ; 3,8 %] et isolation de la dégradation de −0,4 pt du solde primaire en 2027', () => {
    const spb2026 = P['cmp.ce.solde.2026'] + P['cmp.ce.interets.2026'] // −2,5
    const spb2027 = P['cmp.ce.solde.2027'] + P['cmp.ce.interets.2027'] // −2,9
    const shift2027 = spb2027 - spb2026
    expect(shift2027).toBeCloseTo(-0.4, 10)

    const results = [3.3, 3.5, 3.8].map((iStar) => ({
      iStar,
      constSpb: projectScenario({ overrides: { ...EC_BASE, ...flatYields(iStar) } }),
      withShift: projectScenario({
        overrides: { ...EC_BASE, ...flatYields(iStar) },
        modules: [{ module: primaryShiftModule(shift2027), levers: {} }],
      }),
    }))

    // À i* = 3,3 %–3,8 %, la charge d'intérêts 2026 (2,39 %–2,48 %) et 2027 (2,63 %–2,81 %) encadre ou approche 2,6 % / 2,8 %
    for (const { constSpb, withShift } of results) {
      const r26 = rowOf(constSpb, 2026)
      const r27Const = rowOf(constSpb, 2027)
      const r27Shift = rowOf(withShift, 2027)

      expect(Math.abs(pct(r26.interestRatio) - P['cmp.ce.interets.2026'])).toBeLessThan(0.25)
      expect(Math.abs(pct(r27Shift.interestRatio) - P['cmp.ce.interets.2027'])).toBeLessThan(0.2)

      // Sans la dégradation de −0,4 pt en 2027, le solde 2027 est trop favorable de ~0,4–0,56 pt
      expect(pct(r27Const.balanceRatio) - P['cmp.ce.solde.2027']).toBeGreaterThan(0.35)
      // Avec la dégradation de −0,4 pt, le solde 2027 converge sur −5,7 % (à 0,16 pt près sur toute la fourchette)
      expect(Math.abs(pct(r27Shift.balanceRatio) - P['cmp.ce.solde.2027'])).toBeLessThan(0.17)
      expect(pct(r27Shift.balanceRatio) - pct(r27Const.balanceRatio)).toBeCloseTo(-0.4, 2)
    }

    // À i* = 3,8 % (haut de la fourchette printemps), intérêts 2027 = 2,81 % vs 2,8 % et solde 2027 = −5,71 % vs −5,7 %
    const hi27 = rowOf(results[2].withShift, 2027)
    expect(pct(hi27.interestRatio)).toBeCloseTo(P['cmp.ce.interets.2027'], 1)
    expect(pct(hi27.balanceRatio)).toBeCloseTo(P['cmp.ce.solde.2027'], 1)
  })

  it('dette 2026–2027 : l\'écart de −1,0 pt en 2026 tient au déflateur/SFA (E1/E11), tandis que la hausse 2026→2027 (+2,3 à +2,4 pt) suit celle de la Commission (+2,1 pt)', () => {
    const r = projectScenario({
      overrides: { ...EC_BASE, ...flatYields(3.5) },
      modules: [{ module: primaryShiftModule(-0.4), levers: {} }],
    })
    const r26 = rowOf(r, 2026)
    const r27 = rowOf(r, 2027)

    // Sous E1 (g + π = 3,2 % nominal avec IPCH 2,4 %) et SFA nul, même les chiffres exacts CE (115,6 % en 2025, −5,1 % en 2026) donnent 117,12 % vs 118,1 %
    const ecZeroSfaUnderE1 = 115.6 / 1.032 + 5.1
    expect(ecZeroSfaUnderE1).toBeCloseTo(117.12, 2)
    expect(EC_DEBT_2026 - ecZeroSfaUnderE1).toBeCloseTo(0.98, 2)

    // Le moteur à i* = 3,5 % donne 117,03 % en 2026 (écart −1,07 pt dominé par ce même 0,98 pt déflateur/SFA)
    expect(pct(r26.debtRatio) - EC_DEBT_2026).toBeCloseTo(-1.07, 1)

    // En 2027, l'écart de niveau reste < 1 pt (−0,86 pt) et la variation 2026→2027 suit de près +2,1 pt
    expect(Math.abs(pct(r27.debtRatio) - EC_DEBT_2027)).toBeLessThan(1.0)
    const engineDelta2627 = pct(r27.debtRatio - r26.debtRatio)
    const ecDelta2627 = EC_DEBT_2027 - EC_DEBT_2026
    expect(Math.abs(engineDelta2627 - ecDelta2627)).toBeLessThan(0.35)
  })
})

describe('4. Commission européenne — Debt Sustainability Monitor 2025 (IP 332, février 2026)', () => {
  // Spécification DSM 2025 (docs/baseline-data.md item 6b) :
  // - Horizon 10 ans : 2025 → 2036 (dette de base 144,0 % du PIB).
  // - Solde primaire structurel constant à partir de 2026, HORS coût du vieillissement (a_sante = 0, retraites plates à 14,1 %).
  // - Pas de prime endogène β (dette.beta = 0).
  // - Recalage de la dette 2025 : 116,3 % (prévision CE automne 2025) vs 115,7 % Insee (+0,6 pt, baseline-data.md ligne 116).
  // - Courbe annuelle des rendements de la fiche pays DSM : non trouvée → sensibilité sur i* ∈ [3,3 % ; 3,8 %] (millésime automne 2025).
  const DSM_DEBT_2025_MD = P['base.pib.2025'] * (P['cmp.dsm.dette.2025'] / 100)

  it('décomposition pas à pas de l\'écart de +14,5 pt en 2036 (158,5 % moteur vs 144,0 % DSM)', () => {
    const s0Default = rowOf(projectScenario({ horizon: 'dixAns' }), 2036)
    const s1NoBeta = rowOf(projectScenario({ horizon: 'dixAns', overrides: { 'dette.beta': 0 } }), 2036)
    const s2NoAgeing = rowOf(projectScenario({
      horizon: 'dixAns',
      overrides: { 'dette.beta': 0, 'ref.derive.a_sante': 0, 'ref.derive.a_retraites': FLAT_COR },
    }), 2036)
    const s3Recal2025 = rowOf(projectScenario({
      horizon: 'dixAns',
      overrides: {
        'dette.beta': 0,
        'ref.derive.a_sante': 0,
        'ref.derive.a_retraites': FLAT_COR,
        'base.dette.2025': DSM_DEBT_2025_MD,
      },
    }), 2036)

    // Étape 0 : écart initial +14,49 pt
    expect(pct(s0Default.debtRatio) - P['cmp.dsm.dette.2036']).toBeCloseTo(14.49, 1)

    // Étape 1 : suppression de la prime endogène β = 3 → 0 (−3,00 pt)
    const dBeta = pct(s1NoBeta.debtRatio - s0Default.debtRatio)
    expect(dBeta).toBeCloseTo(-3.0, 1)

    // Étape 2 : suppression du vieillissement (−0,50 pt ; cumul β + vieillissement : 158,5 % → 155,0 %)
    const dAgeing = pct(s2NoAgeing.debtRatio - s1NoBeta.debtRatio)
    expect(dAgeing).toBeCloseTo(-0.5, 1)
    expect(pct(s2NoAgeing.debtRatio)).toBeCloseTo(155.0, 1)

    // Étape 3 : recalage de la dette 2025 de 115,7 % à 116,3 % (+0,72 pt composé sur 11 ans)
    const dRecal = pct(s3Recal2025.debtRatio - s2NoAgeing.debtRatio)
    expect(dRecal).toBeGreaterThan(0.6)
    expect(dRecal).toBeLessThan(0.85)

    // Étape 4 : remplacement du millésime de taux nov. 2026 (4,38 %) par la fourchette automne 2025 [3,3 % ; 3,8 %]
    const s4Lo = rowOf(projectScenario({
      horizon: 'dixAns',
      overrides: {
        'dette.beta': 0, 'ref.derive.a_sante': 0, 'ref.derive.a_retraites': FLAT_COR,
        'base.dette.2025': DSM_DEBT_2025_MD, ...flatYields(3.3),
      },
    }), 2036)
    const s4Mid = rowOf(projectScenario({
      horizon: 'dixAns',
      overrides: {
        'dette.beta': 0, 'ref.derive.a_sante': 0, 'ref.derive.a_retraites': FLAT_COR,
        'base.dette.2025': DSM_DEBT_2025_MD, ...flatYields(3.5),
      },
    }), 2036)
    const s4Hi = rowOf(projectScenario({
      horizon: 'dixAns',
      overrides: {
        'dette.beta': 0, 'ref.derive.a_sante': 0, 'ref.derive.a_retraites': FLAT_COR,
        'base.dette.2025': DSM_DEBT_2025_MD, ...flatYields(3.8),
      },
    }), 2036)

    // Effet du seul changement de millésime de taux : −5,3 à −9,7 pt
    const dRatesLo = pct(s4Lo.debtRatio - s3Recal2025.debtRatio)
    const dRatesHi = pct(s4Hi.debtRatio - s3Recal2025.debtRatio)
    expect(dRatesLo).toBeCloseTo(-9.72, 1)
    expect(dRatesHi).toBeCloseTo(-5.31, 1)

    // À SPB moteur (−2,8 %) et macro moteur, la dette 2036 atterrit entre 146,0 % et 150,4 % et les intérêts entre 4,3 % et 5,1 % du PIB
    expect(pct(s4Lo.debtRatio)).toBeCloseTo(146.0, 1)
    expect(pct(s4Mid.debtRatio)).toBeCloseTo(147.7, 1)
    expect(pct(s4Hi.debtRatio)).toBeCloseTo(150.4, 1)
    expect(pct(s4Lo.interestRatio)).toBeGreaterThan(4.2)
    expect(pct(s4Hi.interestRatio)).toBeLessThan(5.3)
  })

  it('l\'écart résiduel (+2 à +6 pt au-delà de 144,0 %) est expliqué par le millésime de SPB 2026 (−2,5 % CE vs −2,8 % RESF) ou la croissance nominale de long terme', () => {
    const dsmBaseOv = {
      'dette.beta': 0,
      'ref.derive.a_sante': 0,
      'ref.derive.a_retraites': FLAT_COR,
      'base.dette.2025': DSM_DEBT_2025_MD,
      ...flatYields(3.5),
    }
    const atMoteurSpb = rowOf(projectScenario({ horizon: 'dixAns', overrides: dsmBaseOv }), 2036)
    const atEcSpb = rowOf(projectScenario({ horizon: 'dixAns', overrides: { ...dsmBaseOv, 'ref.spb_2026': -2.5 } }), 2036)
    const atEcMacro = rowOf(projectScenario({
      horizon: 'dixAns',
      overrides: {
        ...dsmBaseOv,
        'macro.g.2026': 0.8, 'macro.g.2027': 1.1, 'macro.g.potentielle': 1.1,
        'macro.pi.2026': 2.4, 'macro.pi.2027': 1.8, 'macro.pi.long': 2.0,
      },
    }), 2036)

    // Passer au SPB 2026 de la Commission (−2,5 %) retranche 3,41 pt et amène à 144,3 % vs 144,0 % DSM
    expect(pct(atEcSpb.debtRatio - atMoteurSpb.debtRatio)).toBeCloseTo(-3.41, 1)
    expect(Math.abs(pct(atEcSpb.debtRatio) - P['cmp.dsm.dette.2036'])).toBeLessThan(0.5)

    // De même, passer à une croissance nominale long terme proche du DSM (g = 1,1 %, π = 2,0 %) retranche 3,38 pt et amène à 144,4 %
    expect(pct(atEcMacro.debtRatio - atMoteurSpb.debtRatio)).toBeCloseTo(-3.38, 1)
    expect(Math.abs(pct(atEcMacro.debtRatio) - P['cmp.dsm.dette.2036'])).toBeLessThan(0.5)
  })
})

describe('5. Synthèse : tout écart aux repères est expliqué par une hypothèse nommée (model-note.md §5)', () => {
  it('à hypothèses homogènes, chaque comparateur est rejoint à l\'ordre de grandeur attendu et la somme des facteurs nommés boucle', () => {
    const def = projectScenario({ horizon: 'dixAns' })

    // 1) RESF 2027 (intérêts et solde 2027) : écart défaut −0,84 pt sur le solde réduit à < 0,03 pt
    const resfLike = projectScenario({
      overrides: {
        'macro.g.2026': 0.5, 'macro.g.2027': 1.0, 'macro.g.potentielle': 1.2,
        'macro.pi.2026': 2.1, 'macro.pi.2027': 1.8, 'macro.pi.long': 1.8,
        'dette.beta': 0, 'dette.y_btf': 3.0, 'dette.y_moyen': 3.8, 'dette.y_long': 4.3,
      },
      modules: [{ module: primaryShiftModule(0.7), levers: {} }],
    })
    expect(Math.abs(pct(rowOf(resfLike, 2027).balanceRatio) - P['cmp.gouv.solde.2027']))
      .toBeLessThan(Math.abs(pct(rowOf(def, 2027).balanceRatio) - P['cmp.gouv.solde.2027']) / 20)

    // 2) Cour des comptes 2029 : écart défaut +2,4 pt sur la dette « dérive » réduit à < 0,3 pt
    const courLike = projectScenario({
      overrides: { 'dette.beta': 0, 'dette.y_btf': 2.5, 'dette.y_moyen': 3.4, 'dette.y_long': 3.9, 'ref.spb_2026': -2.5 },
    })
    expect(Math.abs(pct(rowOf(courLike, 2029).debtRatio) - P['cmp.cour.dette.2029_derive']))
      .toBeLessThan(Math.abs(pct(rowOf(def, 2029).debtRatio) - P['cmp.cour.dette.2029_derive']) / 5)

    // 3) CE printemps 2026 (solde 2027) : l'écart sur le solde 2027 passe sous 0,1 pt à i* = 3,5 %–3,8 %
    const ceLike = projectScenario({
      overrides: {
        'macro.g.2026': 0.8, 'macro.g.2027': 1.1, 'macro.pi.2026': 2.4, 'macro.pi.2027': 1.8,
        'ref.spb_2026': -2.5, 'dette.beta': 0, ...flatYields(3.8),
      },
      modules: [{ module: primaryShiftModule(-0.4), levers: {} }],
    })
    expect(Math.abs(pct(rowOf(ceLike, 2027).balanceRatio) - P['cmp.ce.solde.2027'])).toBeLessThan(0.05)

    // 4) CE DSM 2025 (dette 2036) : écart défaut +14,5 pt réduit à < 0,5 pt à hypothèses homogènes
    const dsmLike = projectScenario({
      horizon: 'dixAns',
      overrides: {
        'dette.beta': 0, 'ref.derive.a_sante': 0, 'ref.derive.a_retraites': FLAT_COR,
        'base.dette.2025': P['base.pib.2025'] * (P['cmp.dsm.dette.2025'] / 100),
        'ref.spb_2026': -2.5, ...flatYields(3.5),
      },
    })
    expect(Math.abs(pct(rowOf(dsmLike, 2036).debtRatio) - P['cmp.dsm.dette.2036']))
      .toBeLessThan(Math.abs(pct(rowOf(def, 2036).debtRatio) - P['cmp.dsm.dette.2036']) / 20)
  })
})
