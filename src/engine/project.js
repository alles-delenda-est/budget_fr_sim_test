// Moteur de projection v2 — équations E1 à E12 de la note de modèle v0.3 (§2), par bloc.
// Montants en Md€ courants ; ratios en fraction (0,01 = 1 %) dans le code, sauf mention ; t = 0 pour 2026.
// Interprétations (la note est silencieuse) : voir les commentaires « INTERPRÉTATION ».

import { resolveParams, interpolateSeries } from './params.js'
import { BLOCKS, LEVER_BY_ID, leversToInstruments } from './levers.js'
import { runModule } from './modules.js'
import { coreSupplyLines } from './supply.js'

export const START_YEAR = 2026
/** Trois horizons prédéfinis (D10). */
export const HORIZONS = {
  dixAns: { id: 'dixAns', label: '10 ans', endYear: 2036 },
  jusqua2040: { id: 'jusqua2040', label: 'Jusqu\'en 2040', endYear: 2040 },
  trenteAns: { id: 'trenteAns', label: '30 ans', endYear: 2056 },
}

const SECU = { centrales: 'centrales', securiteSociale: 'secu', locales: 'locales' } // clé de bloc -> suffixe de paramètre
/** Plafond du taux à l'émission i_new (fraction) dans E9 : s'applique au taux total (i* + prime β), non à la seule prime. */
export const RATE_MAX = 0.25

/** Gèle récursivement un objet (tableaux et objets imbriqués compris). */
export function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    Object.values(o).forEach(deepFreeze)
  }
  return o
}

/** Taux à l'émission de référence i* (fraction) : moyenne pondérée BTF / OAT 2–8 ans / OAT 10 ans et plus. */
export function issuanceRate(P) {
  const w = P['dette.part_btf'] + P['dette.part_moyen'] + P['dette.part_long']
  return (P['dette.part_btf'] * P['dette.y_btf'] + P['dette.part_moyen'] * P['dette.y_moyen'] + P['dette.part_long'] * P['dette.y_long']) / w / 100
}

/**
 * @param {object} [options]
 * @param {object} [options.levers]     { idLevier: x } valeurs signées (voir levers.js)
 * @param {string} [options.horizon]    'dixAns' | 'jusqua2040' | 'trenteAns'
 * @param {object} [options.overrides]  remplacements de paramètres { id: valeur }
 * @param {Array}  [options.modules]    [{ module, levers }]
 * @param {'bas'|'central'|'haut'} [options.ysCase] cas retenu pour yS des modules (défaut : central)
 * @param {number[]} [options.yS]       chemin yS externe supplémentaire (fraction du PIB), t = 0..N
 * @param {object} [options.sigma]      { idLevier: { sigma | sigmaHausse, sigmaBaisse, L, t0 } } remplace les paramètres offre.* d'un levier (E5) ;
 *                                      σ en % du PIB par unité du levier, t0 = 0 par défaut (voir supply.js)
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
  // Contrat de module (note §7) : le module reçoit une copie profondément gelée, jamais l'objet vivant des paramètres.
  const context = deepFreeze(structuredClone({ startYear: START_YEAR, endYear: horizon.endYear, nYears: N, years, gdpBase2025: P['base.pib.2025'], params: P }))
  const instruments = leversToInstruments(options.levers, P, N, options.ramp, { sigma: options.sigma, ysCase })
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
  const eps = P['fisc.eps'] // demande (stabilisateurs cycliques)
  const epsOffre = P['fisc.eps_offre'] // offre : taux de prélèvements obligatoires (D13), sans dépense cyclique
  const kappa = P['emploi.kappa']
  const M = P['dette.M']
  const iStar = issuanceRate(P)
  const beta = P['dette.beta'] / 10000 // pb par point de PIB de dette -> fraction de taux par point (3 pb = 0,0003)
  const spb0 = P['ref.spb_2026'] / 100
  const ub = P['base.chomage_ref']
  const corAt = (y) => interpolateSeries(P['ref.derive.a_retraites'], y)
  const share = (kind, b) => P[`bloc.part_${kind}.${SECU[b]}`]
  // Dérive d(t) = dA + dB mesurée depuis l'année de base 2025 (note, D7) ; (a) retraites (écart COR à 2025) + santé -> sécurité sociale ;
  // (b) autres dépenses -> au prorata des dépenses des blocs ; les trajectoires santé et (b) sont des placeholders à 0.
  // INTERPRÉTATION : le solde primaire de référence est ancré en 2026 (ref.spb_2026), qui contient déjà la dérive 2025 -> 2026 ;
  // on ne retranche donc que l'écart d(t) − d(0) pour ne pas la compter deux fois. d(t) lui-même est publié depuis 2025.
  const BASE_YEAR = START_YEAR - 1
  const driftA = (t) => (corAt(START_YEAR + t) - corAt(BASE_YEAR)) / 100 + P['ref.derive.a_sante'] / 100 * (t + 1)
  const driftB = (t) => (P['ref.derive.b_autres'] / 100) * (t + 1)
  const dA0 = driftA(0)
  const dB0 = driftB(0)

  const g = (t) => (t === 0 ? P['macro.g.2026'] : t === 1 ? P['macro.g.2027'] : P['macro.g.potentielle']) / 100
  const pi = (t) => (t === 0 ? P['macro.pi.2026'] : t === 1 ? P['macro.pi.2027'] : P['macro.pi.long']) / 100

  // ---- Effets d'offre (E5) : une ligne distincte et étiquetée par mesure, avec son cas (bas / central / haut) ----
  // Mesures du cœur (paramètres offre.*), modules (yS fourni par le module) et chemin externe : trois sources, mêmes lignes.
  const ysLines = [
    ...coreSupplyLines(instruments, P, N, options.sigma).map((l) => ({ id: l.id, libelle: l.libelle, origine: 'levier', statut: l.statut, nomCourt: l.nomCourt, sigma: l.sigma, L: l.L, t0: l.t0, yS: l.cas[ysCase] })),
    ...moduleRuns.filter((inst) => inst.yS).map((inst) => ({ id: inst.id, libelle: inst.titre, origine: 'module', yS: inst.yS[ysCase] })),
    { id: 'externe', libelle: 'Chemin yS externe', origine: 'externe', yS: years.map((_, t) => (Number.isFinite(options.yS?.[t]) ? options.yS[t] : 0)) },
  ].filter((l) => l.yS.some((v) => v !== 0))
  const yOf = (t) => ysLines.reduce((sum, l) => sum + l.yS[t], 0)

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
    const yS = yOf(t) // E5 (cœur + modules + chemin externe)
    const gap = yD + yS
    const Y = Yb * (1 + gap) // E6

    // E9 : taux à l'émission. INTERPRÉTATION : en 2026 la référence de dette est celle de 2025 (pas de prime en t = 0) ;
    // dette/PIB(0) devient la référence dès 2027.
    // premium : fraction de taux (0,0003 = 3 pb = 0,03 point de pourcentage) par point de ratio dette/PIB.
    const premium = beta * (ratioPrev - (ratioRef ?? ratioPrev)) * 100
    const iNew = Math.min(RATE_MAX, Math.max(0, iStar + premium))
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
      const ref = (spb0 * share('primaire', b) - (b === 'securiteSociale' ? dA - dA0 : 0) - (dB - dB0) * share('depenses', b)) * Yb
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
      // E7 : la demande passe au solde par ε (stabilisateurs), l'offre par le taux de prélèvements obligatoires (D13).
      const stab = (eps * yD + epsOffre * yS) * share('recettes', b) * Yb
      const primary = ref + exAnte + behav + stab
      const interest = INT * share('interets', b)
      blk[b] = { ref, exAnte, behav, stab, primary, interest, balance: primary - interest }
      exAnteTot += exAnte; behavTot += behav; refTot += ref; stabTot += stab
    }
    const primary = BLOCKS.reduce((s, b) => s + blk[b].primary, 0)
    // Recettes publiques (Md€), grandeur d'AFFICHAGE : le moteur n'a pas de série de recettes (il raisonne en solde primaire).
    // Dérivée ainsi : recettes de référence (part de recettes APU dans le PIB de 2025 × PIB, élasticité unitaire, comme la référence)
    // + effet ex post (après θ) des seuls leviers de recette. Les leviers de dépense et les modules n'y figurent pas.
    // Cohérence : cette série d'affichage prend la part de TOUTES les recettes APU dans le PIB (base.recettes.apu / base.pib.2025 ≈ 0,522, élasticité
    // unitaire) alors que le solde passe l'écart de PIB par ε (0,6, demande) et ε_offre (0,436, offre). L'écart sur X (intérêts / recettes) est ≤ 2 %
    // en valeur relative ; il est assumé, la série n'entre ni dans le solde ni dans la dette.
    // Elle sert au seul indicateur « intérêts / recettes » des avertissements ; elle n'entre jamais dans le solde ni dans la dette.
    const revenue = (P['base.recettes.apu'] / P['base.pib.2025']) * Y
      + Object.entries(perInstrument).reduce((sum, [id, v]) => sum + (LEVER_BY_ID[id]?.type === 'recette' ? v.exPost : 0), 0)
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
        // Affichage seulement : flux bruts des modules (% du PIB et Md€), jamais ajoutés au solde. Appliqués dès 2027 (leviers dès 2027, D1).
        moduleFlux: t === 0 ? [] : moduleRuns.flatMap((inst) => inst.flux.filter((f) => f.bloc === b)
          .map((f) => ({ moduleId: inst.id, libelle: f.libelle, montantPibPct: f.montant, montant: f.montant * Y }))),
        // Effet net ex ante de chaque module sur ce bloc (Md€, déjà inclus dans leversExAnte) : ligne distincte du module (D9).
        moduleExAnte: moduleRuns.map((inst) => ({ moduleId: inst.id, montantPibPct: inst.aBlocks[b][t], montant: inst.aBlocks[b][t] * Yb })),
      })
    }
    total.push({
      year: START_YEAR + t, t, gdp: Y, gdpBase: Yb, gdpEffect: gap, yD, yS,
      balance, balanceRatio: balance / Y, primaryBalance: primary, primaryBalanceRatio: primary / Y,
      revenue, interest: INT, interestRatio: INT / Y, avgRate: iAvg, newRate: iNew, riskPremium: premium,
      debt: D, debtRatio: ratio, unemployment: u, byInstrument: perInstrument, driftA: dA, driftB: dB, issuanceRate: iStar,
    })

    // Décomposition de la variation du solde (Md€) : exacte par construction.
    // E7 : la demande passe par ε, chaque effet d'offre par ε_offre : on isole la part due à chaque effet d'offre.
    const offreLvl = ysLines.map((l) => epsOffre * l.yS[t] * Yb)
    const lv = { Yb, ref: refTot, exAnte: exAnteTot, behav: behavTot, stab: stabTot, offre: offreLvl, iAvg, INT, balance, Dprev, Dprev2, dA, dB }
    if (t > 0) {
      const q = levels[t - 1]
      const refGrowth = (q.ref / q.Yb) * (Yb - q.Yb)
      const offre = ysLines.map((l, k) => ({ id: l.id, libelle: l.libelle, cas: ysCase, montant: lv.offre[k] - q.offre[k] }))
      const offreSum = offre.reduce((sum, o) => sum + o.montant, 0)
      decomposition.push({
        year: START_YEAR + t,
        refGrowth,
        refDrift: lv.ref - q.ref - refGrowth,
        leviers: lv.exAnte - q.exAnte,
        comportement: lv.behav - q.behav,
        stabilisateurs: lv.stab - q.stab - offreSum, // demande seule ; l'offre est dans `offre`
        offre,
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
    supply: { cas: ysCase, lignes: ysLines.map(({ id, libelle, origine, statut, nomCourt, sigma, L, t0, yS }) => ({ id, libelle, origine, statut, nomCourt, cas: ysCase, sigma, L, t0, yS })) },
    modules: moduleRuns.map(({ id, titre, statut, flux, explications }) => ({ id, titre, statut, flux, explications })),
    instruments: instruments.map(({ id, source }) => ({ id, source })),
  }
}

export const DECOMPOSITION_LABELS = {
  refGrowth: 'Croissance de l\'économie sur le solde de référence',
  refDrift: 'Dérive de référence (vieillissement, autres dépenses)',
  leviers: 'Mesures (effet ex ante)',
  comportement: 'Réaction des contribuables (θ)',
  stabilisateurs: 'Stabilisateurs automatiques (écart de PIB dû à la demande)',
  offre: 'Effets d\'offre (E5), une ligne par mesure',
  interetsTaux: 'Intérêts : hausse du taux moyen',
  interetsStock: 'Intérêts : dette supplémentaire',
}
