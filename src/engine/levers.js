// Leviers du Day 0 (note D5), étalons statiques (§3.1) et correction comportementale θ (§3.2).
// Un levier est exprimé par son effet ex ante sur le solde, en fraction du PIB (E2) :
//   a(j,t) = signe × rendement(j) × x(j) × rampe(j,t) / Y(base)
// x est la variation signée de l'instrument (+1 pt de TVA, −10 % d'une ligne de dépense...).
// signe = +1 quand une hausse de x améliore le solde (recettes, âge légal de retraite), −1 quand elle le dégrade (dépenses).
// Convention : a > 0 améliore le solde. Les blocs sont : centrales, securiteSociale, locales.

import { supplyForCase, supplyPhase, partReelle, thetaNonReel } from './supply.js'

export const BLOCKS = ['centrales', 'securiteSociale', 'locales']
export const ZERO_BLOCKS = () => ({ centrales: 0, securiteSociale: 0, locales: 0 })

/** θ = e·τ/(1−τ) : élasticité e de l'assiette au taux net, au taux τ (§3.2). */
export const thetaElasticity = (e, tau) => (e * tau) / (1 - tau)
/** θ = η·τ pour l'IS : semi-élasticité η de l'assiette au taux (§3.2). */
export const thetaIS = (eta, tau) => eta * tau

const TAU_MAX = 0.95
const clampTau = (t) => Math.min(TAU_MAX, Math.max(0, t))

/**
 * θ évalué au taux APRÈS réforme τ1 (symétrique en paramètres). Le θ central de la table (4) est lu au taux
 * avant réforme τ0 ; on en déduit e (ou η pour l'IS) puis on réévalue à τ1.
 * @param {'elasticite'|'is'} form
 */
export function thetaAtRate(theta0, tau0, tau1, form = 'elasticite') {
  const t0 = clampTau(tau0)
  const t1 = clampTau(tau1)
  if (form === 'is') return thetaIS(theta0 / t0, t1)
  return thetaElasticity((theta0 * (1 - t0)) / t0, t1)
}

const ALL_CENTRAL = { centrales: 1, securiteSociale: 0, locales: 0 }
const ALL_SECU = { centrales: 0, securiteSociale: 1, locales: 0 }

// Répartition de fonctions de dépense entre État/ODAC (S1311) et collectivités locales (S1313) : Eurostat COFOG 2024 (gov_10a_exp).
const cofogBlocks = (slug) => (P) => ({
  centrales: P[`bloc.cofog.${slug}.centrales`], securiteSociale: 0, locales: P[`bloc.cofog.${slug}.locales`],
})

/**
 * Catalogue. `rendement(P)` = Md€ par unité de x. `tauMode` : 'point' (τ1 = τ0 + x/100) ou 'proportionnel'
 * (τ1 = τ0·(1 + x/100), pour l'IR en % du produit).
 */
export const LEVERS = [
  { id: 'tva_normal', titre: 'TVA, taux normal', unite: 'points de taux', min: -5, max: 5, type: 'recette', signe: 1,
    rendement: (P) => P['rend.tva_normal'], categorie: 'tva', theta: { id: 'comp.theta.tva', tau0: 'comp.tau0.tva', mode: 'point', form: 'elasticite' },
    blocs: () => ALL_CENTRAL, statut: 'sourcé', aide: 'Un point de TVA au taux normal : environ 7,5 Md€ (DG Trésor).' },
  { id: 'tva_tous_taux', titre: 'TVA, tous les taux', unite: 'points de taux', min: -5, max: 5, type: 'recette', signe: 1,
    rendement: (P) => P['rend.tva_tous_taux'], categorie: 'tva', theta: { id: 'comp.theta.tva', tau0: 'comp.tau0.tva', mode: 'point', form: 'elasticite' },
    blocs: () => ALL_CENTRAL, statut: 'sourcé', aide: 'Un point sur tous les taux : environ 11,4 Md€ nets. Ne pas cumuler avec le levier « taux normal ».' },
  { id: 'csg', titre: 'CSG, toutes assiettes', unite: 'points de taux', min: -3, max: 3, type: 'recette', signe: 1,
    rendement: (P) => P['rend.csg'], categorie: 'ir_csg', theta: { id: 'comp.theta.csg', tau0: 'comp.tau0.csg', mode: 'point', form: 'elasticite' },
    blocs: () => ALL_SECU, statut: 'sourcé', aide: 'Un point de CSG : environ 17 Md€ (FIPECO, 2024).' },
  { id: 'ir', titre: 'Impôt sur le revenu', unite: '% du produit', min: -30, max: 30, type: 'recette', signe: 1,
    rendement: (P) => P['rend.ir'], categorie: 'ir_csg', theta: { id: 'comp.theta.ir', tau0: 'comp.tau0.ir', mode: 'proportionnel', form: 'elasticite' },
    blocs: () => ALL_CENTRAL, statut: 'sourcé', aide: 'Variation proportionnelle du barème : 1 % du produit vaut environ 1 Md€ (FIPECO).' },
  { id: 'is', titre: 'Impôt sur les sociétés', unite: 'points de taux', min: -10, max: 10, type: 'recette', signe: 1,
    rendement: (P) => P['rend.is'], categorie: 'is', theta: { id: 'comp.theta.is', tau0: 'comp.tau0.is', mode: 'point', form: 'is' },
    blocs: () => ALL_CENTRAL, statut: 'calculé (estimation)', aide: 'Rendement par point estimé à 2,3 Md€ (IS net 58,2 / 25 % ; brut DGFiP jusqu\'à ≈ 2,6–2,8 Md€/pt, sans étalon officiel DG Trésor).' },
  { id: 'cotis_patronales', titre: 'Cotisations patronales', unite: 'points de taux', min: -5, max: 5, type: 'recette', signe: 1,
    rendement: (P) => P['rend.cotis'], categorie: 'cotisations', theta: { id: 'comp.theta.cotis', tau0: 'comp.tau0.cotis', mode: 'point', form: 'elasticite' },
    blocs: () => ALL_SECU, statut: 'sourcé (fourchette), centre choisi', aide: 'Un point de cotisations employeurs : environ 7,4 Md€ sur la masse salariale privée consolidée APU (fourchette 6,2–10 Md€).' },
  { id: 'dep_enseignement', titre: 'Dépenses d\'enseignement', unite: '% de la ligne', min: -30, max: 30, type: 'depense', signe: -1,
    rendement: (P) => P['base.cofog.enseignement'] / 100, categorie: 'remunerations', blocs: cofogBlocks('enseignement'),
    statut: 'sourcé', aide: '1 % de la fonction « enseignement » (COFOG 2024) : environ 1,5 Md€ (69,8 % État / 30,2 % collectivités, Eurostat 2024).' },
  { id: 'dep_defense', titre: 'Dépenses de défense', unite: '% de la ligne', min: -30, max: 30, type: 'depense', signe: -1,
    rendement: (P) => P['base.cofog.defense'] / 100, categorie: 'achats_invest', blocs: () => ALL_CENTRAL,
    statut: 'sourcé', aide: '1 % de la fonction « défense » (COFOG 2024).' },
  { id: 'dep_ordre_securite', titre: 'Ordre et sécurité publics', unite: '% de la ligne', min: -30, max: 30, type: 'depense', signe: -1,
    rendement: (P) => P['base.cofog.ordre_securite'] / 100, categorie: 'remunerations', blocs: cofogBlocks('ordre_securite'),
    statut: 'sourcé', aide: '1 % de la fonction « ordre et sécurité publics » (COFOG 2024 : 80,3 % État / 19,7 % collectivités, Eurostat 2024).' },
  { id: 'dep_affaires_eco', titre: 'Affaires économiques', unite: '% de la ligne', min: -30, max: 30, type: 'depense', signe: -1,
    rendement: (P) => P['base.cofog.affaires_economiques'] / 100, categorie: 'achats_invest', blocs: cofogBlocks('affaires_economiques'),
    statut: 'sourcé', aide: '1 % de la fonction « affaires économiques » (COFOG 2024 : 68,7 % État / 31,3 % collectivités, Eurostat 2024).' },
  { id: 'ondam', titre: 'ONDAM (dépenses de santé)', unite: '% de la ligne', min: -10, max: 10, type: 'depense', signe: -1,
    rendement: (P) => P['base.cofog.sante'] / 100, categorie: 'prestations', blocs: () => ALL_SECU,
    statut: 'sourcé', aide: '1 % de la fonction « santé » (COFOG 2024, proxy de l\'ONDAM).' },
  { id: 'travail_assurance_chomage', titre: 'Assurance chômage (allocations)', unite: '% de la ligne', min: -30, max: 30, type: 'depense', signe: -1,
    rendement: (P) => P['base.unedic.allocations'] / 100, categorie: 'prestations', blocs: () => ALL_SECU,
    statut: 'sourcé', aide: '1 % des allocations de l\'Unédic (37,2 Md€ en 2025) : environ 0,37 Md€. Positif = plus généreux (plus de dépense) ; négatif = resserrement. L\'Unédic est classée en sécurité sociale (ASSO).' },
  { id: 'indexation_pensions', titre: 'Indexation des pensions', unite: 'points par rapport à l\'inflation', min: -3, max: 3, type: 'depense', signe: -1,
    rendement: (P) => (P['ref.derive.a_retraites'][2025] / 100) * P['base.pib.2025'] / 100, categorie: 'prestations', blocs: () => ALL_SECU,
    offsetGroup: 'prestations', statut: 'sourcé',
    aide: '−1 = 1 point sous l\'inflation (+4,2 Md€/an sur le solde) ; +1 = 1 point au-dessus (−4,2 Md€). Effet de niveau permanent (1 % des dépenses de retraites du COR, 14,1 % du PIB 2025).' },
  { id: 'age_legal', titre: 'Âge légal de départ en retraite', unite: 'années par rapport au droit en vigueur', min: -2, max: 3, type: 'depense', signe: 1,
    asymmetric: true, rendParams: ['rend.age_legal.hausse', 'rend.age_legal.baisse'],
    rendement: (P, x = 1) => (x < 0 ? P['rend.age_legal.baisse'] : P['rend.age_legal.hausse']),
    categorie: 'prestations', blocs: () => ALL_SECU,
    offsetParam: 'comp.offset.age_legal',
    // Profils mensuels de chevauchement de cohortes sous calendrier LFSS 2026 (docs/review-age-legal.md) :
    // - Hausse (+6 mois/gén. accéléré dès janv. 2028, gén. 1965 T2–1969) : 2028–2034 (7 ans, plein effet en 2034).
    // - Baisse (plafond 63 ans dès gén. 1966, car gén. 1965 T2–T4 est déjà à 63 ans 0 mois) : 2029–2033 (5 ans, plein effet en 2033).
    defaultRamp: { start: 2, years: 7, profile: [0.156, 0.281, 0.375, 0.625, 0.719, 0.781, 1] },
    defaultRampDown: { start: 3, years: 5, profile: [0.219, 0.406, 0.594, 0.781, 1] },
    rampInSupplyLag: true,
    statut: 'sourcé (fourchette), centre choisi',
    aide: 'Variation par rapport au droit en vigueur (64 ans, atteint pour la gén. 1969 en 2033 après gel LFSS 2026), avec translation symétrique des bornes carrières longues. Pensions brutes seules (hors cotisations retraites déjà comptées dans E7) : +4,95 Md€/an en hausse (dès 2028 accéléré, plein effet 2034) et −3,90 Md€/an en baisse (dès 2029, plein effet 2033), corrigées de 20 % d\'effets de report sociaux (Unédic, IJ maladie, minima — DREES/DARES) et couplées à l\'effet d\'offre emploi seniors (+0,50 % PIB par année d\'âge, L = 6 ans).' },
]

// Leviers de réforme du logement et du marché du travail (D5) : visibles, désactivés, sans effet budgétaire (σ = 0).
// L'assurance chômage n'en fait plus partie : c'est un levier de dépense actif (voir LEVERS).
export const STRUCTURAL_LEVERS = [
  ['logement_offre', 'Offre de logement'], ['logement_loyers', 'Encadrement des loyers'],
  ['travail_licenciement', 'Règles de licenciement'],
].map(([id, titre]) => ({ id, titre, unite: 'intensité (0 à 1)', min: 0, max: 1, defaut: 0, actif: false, statut: 'non validé',
  aide: 'Non validé — avis demandé. σ = 0 en attendant la revue de preuves (docs/brief-supply-effects.md) : aucun effet.' }))

export const LEVER_BY_ID = Object.fromEntries(LEVERS.map((l) => [l.id, l]))

const sane = (x, lo, hi) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : 0)

/** Rampe par défaut d'un levier selon le signe de `x` (supporte `defaultRampDown` si asymétrique en calendrier). */
export function defaultRampFor(lever, x = 1) {
  if (x < 0 && lever?.defaultRampDown) return lever.defaultRampDown
  return lever?.defaultRamp
}

/**
 * Rampe : part de l'effet en vigueur l'année t (t = 0 pour 2026). Défaut : plein effet dès t = 1 (2027).
 * Accepte soit une rampe linéaire `{ start, years }`, soit un profil annuel explicite `{ start, profile }`
 * (ex. chevauchement mensuel de cohortes pour l'âge légal ; plateau sur la dernière valeur au-delà).
 */
export function ramp(t, { start = 1, years = 1, profile = null } = {}) {
  if (!Number.isFinite(t) || t < start) return 0
  if (Array.isArray(profile) && profile.length > 0) {
    const idx = t - start
    return idx < profile.length ? profile[idx] : profile[profile.length - 1]
  }
  return Math.min(1, (t - start + 1) / Math.max(1, years))
}

/** Taux après réforme τ1 (décimal) pour un levier de recette. */
export function postReformRate(lever, x, P) {
  const tau0 = P[lever.theta.tau0] / 100
  return clampTau(lever.theta.mode === 'proportionnel' ? tau0 * (1 + x / 100) : tau0 + x / 100)
}

/** θ d'un levier au taux après réforme (recettes), ou décalage / reports sociaux o (prestations) ; 0 sinon. */
export function leverTheta(lever, x, P) {
  if (lever.type === 'recette') {
    const t = lever.theta
    return thetaAtRate(P[t.id], P[t.tau0] / 100, postReformRate(lever, x, P), t.form)
  }
  if (lever.offsetParam) return P[lever.offsetParam]
  return lever.offsetGroup === 'prestations' ? P['comp.offset.prestations'] : 0
}

/** Étalon statique en Md€ (ex ante) pour x unités : signe × rendement(P, x) × x. */
export const staticYield = (lever, x, P) => lever.signe * lever.rendement(P, x) * x

/**
 * Convertit des valeurs de leviers { id: x } en instruments du moteur.
 * Instrument : { id, source, categorie, aBlocks: {bloc: number[]}, theta: number[] } sur t = 0..nYears (fractions du PIB).
 */
export function leversToInstruments(values, P, nYears, rampOpts, supply = {}) {
  const out = []
  for (const lever of LEVERS) {
    const x = sane(values?.[lever.id], lever.min, lever.max)
    if (x === 0) continue
    const shares = lever.blocs(P)
    const total = staticYield(lever, x, P) / P['base.pib.2025']
    const theta = leverTheta(lever, x, P)
    // θ ne garde que sa part non réelle quand le levier porte un effet d'offre σ ≠ 0 (pas de double compte avec E5 + E7), au rythme
    // de montée en charge de l'effet d'offre : θ_non_réel(t) = max(0, θ − θ_réel × phase(t)). Sans σ, θ est inchangé.
    const sup = lever.type === 'recette' ? supplyForCase(lever.id, x, P, supply.sigma, supply.ysCase) : null
    const thReel = sup ? partReelle(lever.id, sup.sigma, lever.rendement(P, x), P) : 0
    const leverRamp = rampOpts ?? defaultRampFor(lever, x)
    const start = leverRamp?.start ?? 1
    const thetaByYear = Array.from({ length: nYears + 1 }, (_, t) => (thReel > 0 ? thetaNonReel(theta, thReel * supplyPhase(t - start, sup.L, sup.t0)) : theta))
    const aBlocks = { centrales: [], securiteSociale: [], locales: [] }
    for (let t = 0; t <= nYears; t++) for (const b of BLOCKS) aBlocks[b].push(total * shares[b] * ramp(t, leverRamp))
    // x : valeur signée du levier ; start : année (t) d'entrée en vigueur ; sizeByYear : taille de la mesure
    // dans l'unité du levier (sert à l'effet d'offre E5, voir supply.js). Quand `rampInSupplyLag` est vrai et qu'aucun
    // `rampOpts` explicite ne remplace `defaultRamp`, offre.lag.* porte déjà la montée en charge des cohortes :
    // sizeByYear passe à x dès `start` pour ne pas compter la rampe deux fois. Un `rampOpts` explicite reste honoré.
    const useSupplyLagOnly = Boolean(lever.rampInSupplyLag && !rampOpts)
    const sizeByYear = Array.from({ length: nYears + 1 }, (_, t) => (useSupplyLagOnly ? (t >= start ? x : 0) : x * ramp(t, leverRamp)))
    out.push({ id: lever.id, source: 'levier', categorie: lever.categorie, aBlocks, theta: thetaByYear,
      x, start, sizeByYear })
  }
  return out
}
