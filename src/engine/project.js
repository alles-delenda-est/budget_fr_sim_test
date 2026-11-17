// Moteur de projection v2 — équations E1 à E12 de la note de modèle v0.3 (§2), par bloc.
// Montants en Md€ courants ; ratios en fraction (0,01 = 1 %) dans le code, sauf mention ; t = 0 pour 2026.
// Interprétations (la note est silencieuse) : voir les commentaires « INTERPRÉTATION ».

import { resolveParams, interpolateSeries } from './params.js'
import { BLOCKS, leversToInstruments } from './levers.js'
import { runModule } from './modules.js'

export const START_YEAR = 2026
/** Trois horizons prédéfinis (D10). */
export const HORIZONS = {
  dixAns: { id: 'dixAns', label: '10 ans', endYear: 2036 },
  jusqua2040: { id: 'jusqua2040', label: 'Jusqu\'en 2040', endYear: 2040 },
  trenteAns: { id: 'trenteAns', label: '30 ans', endYear: 2056 },
}

const SECU = { centrales: 'centrales', securiteSociale: 'secu', locales: 'locales' } // clé de bloc -> suffixe de paramètre
const RATE_MAX = 0.25

/**
 * @param {object} [options]
 * @param {object} [options.levers]     { idLevier: x } valeurs signées (voir levers.js)
 * @param {string} [options.horizon]    'dixAns' | 'jusqua2040' | 'trenteAns'
 * @param {object} [options.overrides]  remplacements de paramètres { id: valeur }
 * @param {Array}  [options.modules]    [{ module, levers }]
 * @param {'bas'|'central'|'haut'} [options.ysCase] cas retenu pour yS des modules (défaut : central)
 * @param {number[]} [options.yS]       chemin yS externe supplémentaire (fraction du PIB), t = 0..N
 * @param {object} [options.sigma]      { idLevier: { sigma, L } } effets d'offre du cœur (E5) ; σ = 0 par défaut
 * @param {object} [options.ramp]       { start, years } rampe commune des leviers natifs
 */
export function projectScenario(options = {}) {
  const horizon = HORIZONS[options.horizon ?? 'dixAns']
  if (!horizon) throw new Error(`horizon inconnu « ${options.horizon} »`)
  const N = horizon.endYear - START_YEAR
  const P = resolveParams(options.overrides)
  const ysCase = options.ysCase ?? 'central'
  if (!['bas', 'central', 'haut'].includes(ysCase)) throw new Error(`ysCase invalide « ${ysCase} »`)

  // ---- Instruments : leviers natifs + modules ----
  const years = Array.from({ length: N + 1 }, (_, t) => START_YEAR + t)
  const context = { startYear: START_YEAR, endYear: horizon.endYear, nYears: N, years, gdpBase2025: P['base.pib.2025'], params: P }
  const instruments = leversToInstruments(options.levers, P, N, options.ramp)
  const moduleRuns = []
  for (const { module, levers } of options.modules ?? []) {
    const inst = runModule(module, levers, context)
    instruments.push(inst)
    moduleRuns.push(inst)
  }
  const aTot = (inst, t) => BLOCKS.reduce((s, b) => s + inst.aBlocks[b][t], 0)
  const mOf = (inst, t) => inst.mByYear ? inst.mByYear[t] : P[`dem.m.${inst.categorie}`]

  // ---- Paramètres convertis ----
  const lambda = P['dem.lambda']
  const eps = P['fisc.eps']
  const kappa = P['emploi.kappa']
  const M = P['dette.M']
  const iStar = P['dette.i_star'] / 100
  const beta = (P['dette.beta'] / 10000) / 100 // pb par point de PIB -> par unité de ratio décimal
  const spb0 = P['ref.spb_2026'] / 100
  const ub = P['base.chomage_ref']
  const corAt = (y) => interpolateSeries(P['ref.derive.a_retraites'], y)
  const share = (kind, b) => P[`bloc.part_${kind}.${SECU[b]}`]
  // INTERPRÉTATION : dérive d(t) relative à 2026 (d(0) = 0) ; (a) retraites (écart COR) + santé -> sécurité sociale ;
  // (b) autres dépenses -> au prorata des dépenses des blocs ; les trajectoires santé et (b) sont des placeholders à 0.
  const driftA = (t) => (corAt(START_YEAR + t) - corAt(START_YEAR)) / 100 + P['ref.derive.a_sante'] / 100 * t
  const driftB = (t) => (P['ref.derive.b_autres'] / 100) * t

  const g = (t) => (t === 0 ? P['macro.g.2026'] : t === 1 ? P['macro.g.2027'] : P['macro.g.potentielle']) / 100
  const pi = (t) => (t === 0 ? P['macro.pi.2026'] : t === 1 ? P['macro.pi.2027'] : P['macro.pi.long']) / 100

  // ---- Effets d'offre du cœur (E5) : σ = 0 par défaut ----
  const sigmaOpts = options.sigma ?? {}
  const yScore = (t) => Object.entries(sigmaOpts).reduce((s, [id, { sigma, L }]) => {
    const inst = instruments.find((i) => i.id === id)
    if (!inst || !Number.isFinite(sigma) || !(L > 0)) return s
    return s + sigma * aTot(inst, t) * Math.min(t / L, 1)
  }, 0)
  const yModules = (t) => moduleRuns.reduce((s, inst) => s + (inst.yS ? inst.yS[ysCase][t] : 0), 0)
  const yExt = (t) => (Number.isFinite(options.yS?.[t]) ? options.yS[t] : 0)

  // ---- État initial : 2025 observé ----
  let YbPrev = P['base.pib.2025']
  let Dprev = P['base.dette.2025']
  let Dprev2 = P['base.dette.2024']
  let iAvgPrev = P['dette.i_moy_2025'] / 100
  let ratioPrev = Dprev / YbPrev
  let ratioRef = null
  const S = instruments.map(() => 0) // demande cumulée pondérée par m (E4), par instrument

  const total = []
  const blocks = Object.fromEntries(BLOCKS.map((b) => [b, []]))
  const decomposition = []
  const levels = []

  for (let t = 0; t <= N; t++) {
    // E1
    const Yb = YbPrev * (1 + g(t) + pi(t))

    // E4 : demande en niveau, qui s'estompe. S_j(t) = λ S_j(t−1) + m_j Δa_j(t) ; yD = −Σ S_j
    let yD = 0
    instruments.forEach((inst, j) => {
      const da = aTot(inst, t) - (t > 0 ? aTot(inst, t - 1) : 0)
      S[j] = lambda * S[j] + mOf(inst, t) * da
      yD -= S[j]
    })
    const yS = yScore(t) + yModules(t) + yExt(t) // E5 (+ modules, + chemin externe)
    const gap = yD + yS
    const Y = Yb * (1 + gap) // E6

    // E9 : taux à l'émission. INTERPRÉTATION : en 2026 la référence de dette est celle de 2025 (pas de prime en t = 0) ;
    // dette/PIB(0) devient la référence dès 2027.
    const premium = beta * ((ratioPrev - (ratioRef ?? ratioPrev)) * 100) * 100
    const iNew = Math.min(RATE_MAX, Math.max(0, iStar + premium / 100))
    // E10 : taux moyen du stock
    const phi = Math.min(1, 1 / M + Math.max(0, Dprev - Dprev2) / Math.max(Dprev, 1))
    const iAvg = (1 - phi) * iAvgPrev + phi * iNew
    // E11 : intérêts
    const INT = iAvg * Dprev

    // E2/E3/E8 par bloc
    const dA = driftA(t)
    const dB = driftB(t)
    const blk = {}
    let exAnteTot = 0
    let behavTot = 0
    let refTot = 0
    let stabTot = 0
    const perInstrument = {}
    for (const b of BLOCKS) {
      const ref = (spb0 * share('primaire', b) - (b === 'securiteSociale' ? dA : 0) - dB * share('depenses', b)) * Yb
      let exAnte = 0
      let behav = 0
      instruments.forEach((inst) => {
        const a = inst.aBlocks[b][t] * Yb
        const th = inst.theta[t]
        exAnte += a
        behav -= th * a
        perInstrument[inst.id] ??= { exAnte: 0, exPost: 0 }
        perInstrument[inst.id].exAnte += a
        perInstrument[inst.id].exPost += (1 - th) * a
      })
      const stab = eps * gap * share('recettes', b) * Yb
      const primary = ref + exAnte + behav + stab
      const interest = INT * share('interets', b)
      blk[b] = { ref, exAnte, behav, stab, primary, interest, balance: primary - interest }
      exAnteTot += exAnte; behavTot += behav; refTot += ref; stabTot += stab
    }
    const primary = BLOCKS.reduce((s, b) => s + blk[b].primary, 0)
    const balance = primary - INT
    // E11 : dette
    const D = Dprev + INT - primary
    const ratio = D / Y

    // E12 : Okun, en points
    const u = ub - kappa * 100 * gap

    for (const b of BLOCKS) {
      blocks[b].push({
        year: START_YEAR + t, primaryBalance: blk[b].primary, interest: blk[b].interest, balance: blk[b].balance,
        balanceRatio: blk[b].balance / Y, referencePrimary: blk[b].ref, leversExAnte: blk[b].exAnte,
        behavioural: blk[b].behav, stabilisers: blk[b].stab,
      })
    }
    total.push({
      year: START_YEAR + t, t, gdp: Y, gdpBase: Yb, gdpEffect: gap, yD, yS,
      balance, balanceRatio: balance / Y, primaryBalance: primary, primaryBalanceRatio: primary / Y,
      interest: INT, interestRatio: INT / Y, avgRate: iAvg, newRate: iNew, riskPremium: premium / 100,
      debt: D, debtRatio: ratio, unemployment: u, byInstrument: perInstrument,
    })

    // Décomposition de la variation du solde (Md€) : exacte par construction.
    const lv = { Yb, ref: refTot, exAnte: exAnteTot, behav: behavTot, stab: stabTot, iAvg, INT, balance, Dprev, Dprev2, dA, dB }
    if (t > 0) {
      const q = levels[t - 1]
      const refGrowth = (q.ref / q.Yb) * (Yb - q.Yb)
      decomposition.push({
        year: START_YEAR + t,
        refGrowth,
        refDrift: lv.ref - q.ref - refGrowth,
        leviers: lv.exAnte - q.exAnte,
        comportement: lv.behav - q.behav,
        stabilisateurs: lv.stab - q.stab,
        interetsTaux: -(iAvg - q.iAvg) * Dprev,
        interetsStock: -q.iAvg * (Dprev - Dprev2),
        total: balance - q.balance,
      })
    } else decomposition.push(null)
    levels.push(lv)

    if (ratioRef === null) ratioRef = ratio
    YbPrev = Yb; Dprev2 = Dprev; Dprev = D; iAvgPrev = iAvg; ratioPrev = ratio
  }

  return {
    horizon: horizon.id, startYear: START_YEAR, endYear: horizon.endYear, years, total, blocks, decomposition,
    modules: moduleRuns.map(({ id, titre, statut, flux, explications }) => ({ id, titre, statut, flux, explications })),
    instruments: instruments.map(({ id, source }) => ({ id, source })),
  }
}

export const DECOMPOSITION_LABELS = {
  refGrowth: 'Croissance de l\'économie sur le solde de référence',
  refDrift: 'Dérive de référence (vieillissement, autres dépenses)',
  leviers: 'Mesures (effet ex ante)',
  comportement: 'Réaction des contribuables (θ)',
  stabilisateurs: 'Stabilisateurs automatiques (écart de PIB)',
  interetsTaux: 'Intérêts : hausse du taux moyen',
  interetsStock: 'Intérêts : dette supplémentaire',
}
