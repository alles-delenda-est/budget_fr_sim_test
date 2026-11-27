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

/** Régimes de multiplicateurs de demande (Phase 3, opt-in ; 'normal' par défaut = identique au Day 0). */
export const DEMAND_REGIMES = ['normal', 'recession', 'elb', 'endogene']
/** Durées prédéfinies d'étalement pluriannuel des mesures nouvelles (1 = dès 2027 par défaut, 3 = 2027–2029, 5 = 2027–2031 type PSMT). */
export const PHASING_YEARS = [1, 3, 5]
export const DEFAULT_PHASING_YEARS = 1

const DEMAND_CAPS = {
  achats_invest: 1.60,
  remunerations: 1.50,
  prestations: 1.20,
  tva: 0.70,
  ir_csg: 0.70,
  cotisations: 0.70,
  is: 0.40,
}

/**
 * Multiplicateur effectif selon le régime de demande (E4 étendue, Phase 3).
 * En régime 'normal', renvoie strictement `baseM` (bit-identique au Day 0).
 */
export function effectiveMultiplier(categorie, baseM, regime, slackProb, P) {
  if (!Number.isFinite(baseM) || baseM <= 0 || regime === 'normal') return baseM
  const f = Math.min(1, Math.max(0, slackProb))
  const elb = regime === 'elb' ? 1 : 0
  const elbBonus = P['dem.elb.bonus_depenses']
  let mult = 1
  let add = 0
  if (categorie === 'achats_invest' || categorie === 'remunerations') {
    mult = 1 + f * (P['dem.recession.mult_depenses'] - 1)
    add = elb * elbBonus
  } else if (categorie === 'prestations') {
    mult = 1 + f * (P['dem.recession.mult_prestations'] - 1)
    add = elb * 0.8 * elbBonus
  } else if (categorie === 'tva' || categorie === 'ir_csg' || categorie === 'cotisations') {
    mult = 1 + f * (P['dem.recession.mult_impots'] - 1)
    add = elb * 0.4 * elbBonus
  } else if (categorie === 'is') {
    mult = 1
    add = elb * 0.2 * elbBonus
  }
  const cap = DEMAND_CAPS[categorie] ?? Math.max(baseM * 1.5, 1.6)
  return Math.min(cap, Math.max(0, baseM * mult + add))
}

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
  if (!(w > 0)) return 0
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
 * @param {object} [options.ramp]       { start, years } rampe commune forcée sur tous les leviers natifs (usage bas niveau)
 * @param {number} [options.phasingYears] étalement linéaire en années dès 2027 (défaut : 1) pour les leviers sans calendrier légal propre (`age_legal` préservé)
 * @param {'normal'|'recession'|'elb'|'endogene'} [options.demandRegime] régime des multiplicateurs E4 (défaut : 'normal')
 * @param {boolean} [options.endogenousInflation] active la boucle réduite d'inflation endogène et répercussion TVA (défaut : false)
 */
export function projectScenario(options = {}) {
  const horizon = HORIZONS[options.horizon ?? 'dixAns']
  if (!horizon) throw new Error(`horizon inconnu « ${options.horizon} »`)
  const N = horizon.endYear - START_YEAR
  const P = resolveParams(options.overrides)
  if (!(P['base.pib.2025'] > 0)) throw new Error('params: base.pib.2025 doit être strictement positif')
  const ysCase = options.ysCase ?? 'central'
  if (!['bas', 'central', 'haut'].includes(ysCase)) throw new Error(`ysCase invalide « ${ysCase} »`)
  const demandRegime = options.demandRegime ?? 'normal'
  if (!DEMAND_REGIMES.includes(demandRegime)) throw new Error(`demandRegime invalide « ${demandRegime} »`)
  const phasingYears = options.phasingYears ?? DEFAULT_PHASING_YEARS
  if (!Number.isInteger(phasingYears) || phasingYears < 1 || phasingYears > 30) {
    throw new Error(`phasingYears invalide « ${options.phasingYears} »`)
  }
  const endogenousInflation = Boolean(options.endogenousInflation)

  // ---- Instruments : leviers natifs + modules ----
  const years = Array.from({ length: N + 1 }, (_, t) => START_YEAR + t)
  // Contrat de module (note §7) : le module reçoit une copie profondément gelée, jamais l'objet vivant des paramètres.
  // Évite le coût de structuredClone + deepFreeze lorsqu'aucun module n'est actif.
  const hasModules = (options.modules?.length ?? 0) > 0
  const context = hasModules
    ? deepFreeze(structuredClone({ startYear: START_YEAR, endYear: horizon.endYear, nYears: N, years, gdpBase2025: P['base.pib.2025'], params: P }))
    : null
  const instruments = leversToInstruments(options.levers, P, N, options.ramp, { sigma: options.sigma, ysCase, phasingYears })
  const moduleRuns = []
  for (const { module, levers } of options.modules ?? []) {
    const inst = runModule(module, levers, context)
    instruments.push(inst)
    moduleRuns.push(inst)
  }
  const aTot = (inst, t) => BLOCKS.reduce((s, b) => s + inst.aBlocks[b][t], 0)
  const mOf = (inst, t, slackProb) => {
    const cat = inst.categorieByYear ? inst.categorieByYear[t] : inst.categorie
    const baseM = inst.mByYear ? inst.mByYear[t] : P[`dem.m.${cat}`]
    return cat ? effectiveMultiplier(cat, baseM, demandRegime, slackProb, P) : baseM
  }
  const tvaShareAt = (t) => instruments.reduce((s, inst) => (inst.id === 'tva_normal' || inst.id === 'tva_tous_taux' ? s + aTot(inst, t) : s), 0)

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
  let YbExogPrev = P['base.pib.2025']
  let Dprev = P['base.dette.2025']
  let Dprev2 = P['base.dette.2024']
  let iAvgPrev = P['dette.i_moy_2025'] / 100
  let ratioPrev = Dprev / YbPrev
  let ratioRef = null
  let uPrev = ub
  let deltaPiPhilPrev = 0
  let relDefl = 1
  let relCpi = 1
  const S = instruments.map(() => 0) // demande cumulée pondérée par m (E4), par instrument

  const clampInfl = (x) => {
    const c = Math.max(0, P['infl.clamp_max'] / 100)
    return Math.min(c, Math.max(-c, x))
  }
  const tvaToCpiRatio = P['base.conso_menages'] > 0 ? P['base.pib.2025'] / P['base.conso_menages'] : 1

  const total = []
  const blocks = Object.fromEntries(BLOCKS.map((b) => [b, []]))
  const decomposition = []
  const levels = []

  for (let t = 0; t <= N; t++) {
    // Probabilité de récession (E4 étendue, Phase 3) : nulle en 'normal', 1 en 'recession'/'elb', logistique retardée en 'endogene'.
    let slackProb = 0
    if (demandRegime === 'recession' || demandRegime === 'elb') slackProb = 1
    else if (demandRegime === 'endogene') {
      const z = (uPrev - ub) - P['dem.slack.z_mid']
      slackProb = 1 / (1 + Math.exp(-P['dem.slack.gamma'] * z))
    }

    // E4 : demande en niveau, qui s'estompe. S_j(t) = λ S_j(t−1) + m_j(t) Δa_j(t) ; yD = −Σ S_j
    let yD = 0
    instruments.forEach((inst, j) => {
      const da = aTot(inst, t) - (t > 0 ? aTot(inst, t - 1) : 0)
      S[j] = lambda * S[j] + mOf(inst, t, slackProb) * da
      yD -= S[j]
    })
    const yS = yOf(t) // E5 (cœur + modules + chemin externe)
    const gap = yD + yS

    // E1b : inflation endogène & répercussion TVA (opt-in Phase 3 ; strictement nul si désactivé).
    let deltaPiPhil = 0
    let deltaPiCpi = 0
    let deltaPiDefl = 0
    if (endogenousInflation) {
      const dTva = tvaShareAt(t) - (t > 0 ? tvaShareAt(t - 1) : 0)
      const psi = P['infl.tva.passthrough']
      deltaPiPhil = P['infl.phillips.rho'] * deltaPiPhilPrev + P['infl.phillips.gamma'] * yD
      deltaPiCpi = clampInfl(deltaPiPhil + psi * dTva * tvaToCpiRatio)
      deltaPiDefl = clampInfl(P['infl.deflateur.ratio'] * deltaPiPhil + psi * dTva)
    }

    // E1
    const YbExog = YbExogPrev * Math.max(1e-6, 1 + g(t) + pi(t))
    const Yb = YbPrev * Math.max(1e-6, 1 + g(t) + pi(t) + deltaPiDefl)
    const Y = Yb * Math.max(1e-6, 1 + gap) // E6

    // E9 : taux à l'émission. INTERPRÉTATION : en 2026 la référence de dette est celle de 2025 (pas de prime en t = 0) ;
    // dette/PIB(0) devient la référence dès 2027.
    const premium = beta * (ratioPrev - (ratioRef ?? ratioPrev)) * 100
    const inflRateFeedback = endogenousInflation ? P['infl.zone_euro.poids_fr'] * 1.5 * deltaPiCpi : 0
    const iNew = Math.min(RATE_MAX, Math.max(0, iStar + premium + inflRateFeedback))
    // E10 : taux moyen du stock
    const invM = M > 0 ? 1 / M : 1
    const phi = Math.min(1, Math.max(0, invM + Math.max(0, Dprev - Dprev2) / Math.max(Dprev, 1)))
    const iAvg = (1 - phi) * iAvgPrev + phi * iNew
    // E11 : intérêts (+ indexation directe OATi si inflation endogène active)
    const oatiAdj = endogenousInflation ? P['infl.oati.part_stock'] * deltaPiCpi * Dprev : 0
    const INT = Math.max(0, iAvg * Dprev + oatiAdj)

    // E8 : effet budgétaire de l'indexation retardée des pensions (CSS L. 161-25) en mode inflation endogène :
    // écart cumulé de niveaux de prix entre IPC(t−1) et déflateur du PIB(t) par rapport à la référence.
    const relCpiLag = relCpi
    if (endogenousInflation) {
      relDefl *= Math.max(1e-6, 1 + deltaPiDefl)
      relCpi *= Math.max(1e-6, 1 + deltaPiCpi)
    }
    const inflFiscal = endogenousInflation ? (corAt(START_YEAR + t) / 100) * (1 - relCpiLag / relDefl) * Yb : 0

    // E2/E3/E8 par bloc
    const dA = driftA(t)
    const dB = driftB(t)
    const blk = {}
    let exAnteTot = 0
    let behavTot = 0
    let refTot = 0
    let refExogTot = 0
    let stabTot = 0
    const perInstrument = {}
    for (const b of BLOCKS) {
      const refShare = spb0 * share('primaire', b) - (b === 'securiteSociale' ? dA - dA0 : 0) - (dB - dB0) * share('depenses', b)
      const ref = refShare * Yb
      refExogTot += refShare * YbExog
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
      const inflBlk = b === 'securiteSociale' ? inflFiscal : 0
      const primary = ref + exAnte + behav + stab + inflBlk
      const interest = INT * share('interets', b)
      blk[b] = { ref, exAnte, behav, stab, inflBlk, primary, interest, balance: primary - interest }
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
        behavioural: blk[b].behav, stabilisers: blk[b].stab, inflation: blk[b].inflBlk,
        // Affichage seulement : flux bruts des modules (% du PIB et Md€), jamais ajoutés au solde. Appliqués dès 2027 (leviers dès 2027, D1).
        moduleFlux: t === 0 ? [] : moduleRuns.flatMap((inst) => inst.flux.filter((f) => f.bloc === b)
          .map((f) => ({ moduleId: inst.id, libelle: f.libelle, montantPibPct: f.montant, montant: f.montant * Y }))),
        // Effet net ex ante de chaque module sur ce bloc (Md€, déjà inclus dans leversExAnte) : ligne distincte du module (D9).
        moduleExAnte: moduleRuns.map((inst) => ({ moduleId: inst.id, montantPibPct: inst.aBlocks[b][t], montant: inst.aBlocks[b][t] * Yb })),
      })
    }
    total.push({
      year: START_YEAR + t, t, gdp: Y, gdpBase: Yb, gdpBaseExog: YbExog, gdpEffect: gap, yD, yS,
      balance, balanceRatio: balance / Y, primaryBalance: primary, primaryBalanceRatio: primary / Y,
      refPrimaryExog: refExogTot,
      revenue, interest: INT, interestRatio: INT / Y, avgRate: iAvg, newRate: iNew, riskPremium: premium,
      debt: D, debtRatio: ratio, unemployment: u, byInstrument: perInstrument, driftA: dA, driftB: dB, issuanceRate: iStar,
      slackProb, deltaPiCpi, deltaPiDefl, inflFiscal, oatiAdj,
    })

    // Décomposition de la variation du solde (Md€) : exacte par construction.
    // E7 : la demande passe par ε, chaque effet d'offre par ε_offre : on isole la part due à chaque effet d'offre.
    const offreLvl = ysLines.map((l) => epsOffre * l.yS[t] * Yb)
    const lv = { Yb, ref: refTot, exAnte: exAnteTot, behav: behavTot, stab: stabTot, inflFiscal, offre: offreLvl, iAvg, INT, balance, Dprev, Dprev2, dA, dB }
    if (t > 0) {
      const q = levels[t - 1]
      const refGrowth = (q.ref / q.Yb) * (Yb - q.Yb)
      const offre = ysLines.map((l, k) => ({ id: l.id, libelle: l.libelle, cas: ysCase, montant: lv.offre[k] - q.offre[k] }))
      const offreSum = offre.reduce((sum, o) => sum + o.montant, 0)
      const interetsStock = (INT === 0 && q.INT === 0) ? 0 : -q.iAvg * (Dprev - Dprev2)
      const interetsTaux = -(INT - q.INT) - interetsStock
      decomposition.push({
        year: START_YEAR + t,
        refGrowth,
        refDrift: lv.ref - q.ref - refGrowth,
        leviers: lv.exAnte - q.exAnte,
        comportement: lv.behav - q.behav,
        stabilisateurs: lv.stab - q.stab - offreSum, // demande seule ; l'offre est dans `offre`
        offre,
        inflation: lv.inflFiscal - q.inflFiscal,
        interetsTaux,
        interetsStock,
        total: balance - q.balance,
      })
    } else decomposition.push(null)
    levels.push(lv)

    if (ratioRef === null) ratioRef = ratio
    YbPrev = Yb; YbExogPrev = YbExog; Dprev2 = Dprev; Dprev = D; iAvgPrev = iAvg; ratioPrev = ratio; uPrev = u
    deltaPiPhilPrev = deltaPiPhil
  }

  return {
    horizon: horizon.id, startYear: START_YEAR, endYear: horizon.endYear, years, total, blocks, decomposition,
    demandRegime, endogenousInflation, phasingYears,
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
  inflation: 'Inflation endogène (indexation retardée des pensions)',
  interetsTaux: 'Intérêts : hausse du taux moyen',
  interetsStock: 'Intérêts : dette supplémentaire',
}
