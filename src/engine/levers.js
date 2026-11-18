// Leviers du Day 0 (note D5), étalons statiques (§3.1) et correction comportementale θ (§3.2).
// Un levier est exprimé par son effet ex ante sur le solde, en fraction du PIB (E2) :
//   a(j,t) = signe × rendement(j) × x(j) × rampe(j,t) / Y(base)
// x est la variation signée de l'instrument (+1 pt de TVA, −10 % d'une ligne de dépense...).
// signe = +1 pour une recette (hausse => solde en hausse), −1 pour une dépense (hausse => solde en baisse).
// Convention : a > 0 améliore le solde. Les blocs sont : centrales, securiteSociale, locales.

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

// Répartition de fonctions de dépense entre État et collectivités : proxy (paramètres bloc.part_hors_secu.*, à collecter).
const stateLocal = (P) => ({
  centrales: P['bloc.part_hors_secu.centrales'], securiteSociale: 0, locales: P['bloc.part_hors_secu.locales'],
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
    blocs: () => ALL_CENTRAL, statut: 'à collecter', aide: 'Rendement par point : valeur provisoire (aucun chiffre officiel trouvé).' },
  { id: 'cotis_patronales', titre: 'Cotisations patronales', unite: 'points de taux', min: -5, max: 5, type: 'recette', signe: 1,
    rendement: (P) => P['rend.cotis'], categorie: 'cotisations', theta: { id: 'comp.theta.cotis', tau0: 'comp.tau0.cotis', mode: 'point', form: 'elasticite' },
    blocs: () => ALL_SECU, statut: 'à collecter', aide: 'Un point de cotisations : de 7 à 10 Md€ selon les sources secondaires (valeur provisoire).' },
  { id: 'dep_enseignement', titre: 'Dépenses d\'enseignement', unite: '% de la ligne', min: -30, max: 30, type: 'depense', signe: -1,
    rendement: (P) => P['base.cofog.enseignement'] / 100, categorie: 'remunerations', blocs: stateLocal,
    statut: 'sourcé', aide: '1 % de la fonction « enseignement » (COFOG 2024) : environ 1,5 Md€.' },
  { id: 'dep_defense', titre: 'Dépenses de défense', unite: '% de la ligne', min: -30, max: 30, type: 'depense', signe: -1,
    rendement: (P) => P['base.cofog.defense'] / 100, categorie: 'achats_invest', blocs: () => ALL_CENTRAL,
    statut: 'sourcé', aide: '1 % de la fonction « défense » (COFOG 2024).' },
  { id: 'dep_ordre_securite', titre: 'Ordre et sécurité publics', unite: '% de la ligne', min: -30, max: 30, type: 'depense', signe: -1,
    rendement: (P) => P['base.cofog.ordre_securite'] / 100, categorie: 'remunerations', blocs: stateLocal,
    statut: 'sourcé', aide: '1 % de la fonction « ordre et sécurité publics » (COFOG 2024).' },
  { id: 'dep_affaires_eco', titre: 'Affaires économiques', unite: '% de la ligne', min: -30, max: 30, type: 'depense', signe: -1,
    rendement: (P) => P['base.cofog.affaires_economiques'] / 100, categorie: 'achats_invest', blocs: stateLocal,
    statut: 'sourcé', aide: '1 % de la fonction « affaires économiques » (COFOG 2024).' },
  { id: 'ondam', titre: 'ONDAM (dépenses de santé)', unite: '% de la ligne', min: -10, max: 10, type: 'depense', signe: -1,
    rendement: (P) => P['base.cofog.sante'] / 100, categorie: 'prestations', blocs: () => ALL_SECU,
    statut: 'sourcé', aide: '1 % de la fonction « santé » (COFOG 2024, proxy de l\'ONDAM).' },
  { id: 'travail_assurance_chomage', titre: 'Assurance chômage (allocations)', unite: '% de la ligne', min: -30, max: 30, type: 'depense', signe: -1,
    rendement: (P) => P['base.unedic.allocations'] / 100, categorie: 'prestations', blocs: () => ALL_SECU,
    statut: 'sourcé', aide: '1 % des allocations de l\'Unédic (37,2 Md€ en 2025) : environ 0,37 Md€. Positif = plus généreux (plus de dépense) ; négatif = resserrement. L\'Unédic est classée en sécurité sociale (ASSO).' },
  { id: 'indexation_pensions', titre: 'Indexation des pensions', unite: 'points sous l\'inflation', min: -3, max: 3, type: 'depense', signe: -1,
    rendement: (P) => (P['ref.derive.a_retraites'][2025] / 100) * P['base.pib.2025'] / 100, categorie: 'prestations', blocs: () => ALL_SECU,
    offsetGroup: 'prestations', statut: 'sourcé',
    aide: '1 point d\'écart d\'indexation : 1 % des dépenses de retraites du COR (14,1 % du PIB 2025), proxy de la ligne « vieillesse ».' },
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

/** Rampe : part de l'effet en vigueur l'année t (t = 0 pour 2026). Défaut : plein effet dès t = 1 (2027). */
export function ramp(t, { start = 1, years = 1 } = {}) {
  if (t < start) return 0
  return Math.min(1, (t - start + 1) / Math.max(1, years))
}

/** Taux après réforme τ1 (décimal) pour un levier de recette. */
export function postReformRate(lever, x, P) {
  const tau0 = P[lever.theta.tau0] / 100
  return clampTau(lever.theta.mode === 'proportionnel' ? tau0 * (1 + x / 100) : tau0 + x / 100)
}

/** θ d'un levier au taux après réforme (recettes), ou décalage o pour les dépenses de prestations ; 0 sinon. */
export function leverTheta(lever, x, P) {
  if (lever.type === 'recette') {
    const t = lever.theta
    return thetaAtRate(P[t.id], P[t.tau0] / 100, postReformRate(lever, x, P), t.form)
  }
  return lever.offsetGroup === 'prestations' ? P['comp.offset.prestations'] : 0
}

/** Étalon statique en Md€ (ex ante) pour x unités : signe × rendement × x. */
export const staticYield = (lever, x, P) => lever.signe * lever.rendement(P) * x

/**
 * Convertit des valeurs de leviers { id: x } en instruments du moteur.
 * Instrument : { id, source, categorie, aBlocks: {bloc: number[]}, theta: number[] } sur t = 0..nYears (fractions du PIB).
 */
export function leversToInstruments(values, P, nYears, rampOpts) {
  const out = []
  for (const lever of LEVERS) {
    const x = sane(values?.[lever.id], lever.min, lever.max)
    if (x === 0) continue
    const shares = lever.blocs(P)
    const total = staticYield(lever, x, P) / P['base.pib.2025']
    const theta = leverTheta(lever, x, P)
    const aBlocks = { centrales: [], securiteSociale: [], locales: [] }
    for (let t = 0; t <= nYears; t++) for (const b of BLOCKS) aBlocks[b].push(total * shares[b] * ramp(t, rampOpts))
    // x : valeur signée du levier ; start : année (t) d'entrée en vigueur ; sizeByYear : x × rampe, taille de la mesure
    // dans l'unité du levier (sert à l'effet d'offre E5, voir supply.js).
    const sizeByYear = Array.from({ length: nYears + 1 }, (_, t) => x * ramp(t, rampOpts))
    out.push({ id: lever.id, source: 'levier', categorie: lever.categorie, aBlocks, theta: Array(nYears + 1).fill(theta),
      x, start: rampOpts?.start ?? 1, sizeByYear })
  }
  return out
}
