// Rendements LVTShift du module « taxe sur la valeur du sol » (docs/review-lvt-module.md §1.3, §2.2, §5.2 et §8), DÉRIVÉS de
// src/engine/data/lvt-yields.json : copie verbatim de lvtshift-fr/site/public/data/yields.json (dépôt alles-delenda-est/LVTShift),
// importée à un commit épinglé par scripts/sync-lvt-yields.mjs (npm run sync:lvt), provenance dans data/lvt-yields.source.json.
// Import au build, pas de lecture réseau à l'exécution : les relecteurs voient des chiffres stables et testés.
// Aucun rendement n'est recopié ici : seuls restent des libellés, les choix de millésime de la revue, les statuts de relecture
// et les arrondis du Day 0 (LVT_ARRONDIS), conservés pour que l'import ne change aucun résultat.
// Montants : M€ dans yields.json, ramenés ici en Md€ (euros de price_basis.year, 2025 ; moyennes sur cinq ans pour les DMTO et les
// plus-values, convention de LVTShift). Le module les convertit en % du PIB 2025 avec `base.pib.2025` (params.js).
//
// Statuts de relecture (docs/review-lvt-module.md §2.2) : « relu » = lu dans la source officielle par la revue ; « relu (secondaire) »
// = lu dans une source qui cite la source officielle ; « LVTShift » = repris de yields.json, source et URL indiquées par LVTShift,
// non relues par la revue. Le statut propre à LVTShift (verified, derived, reported) est repris tel quel (statutLVTShift).

import YIELDS from './data/lvt-yields.json' with { type: 'json' }
import SOURCE from './data/lvt-yields.source.json' with { type: 'json' }
import { assertLvtYields, LVT_YIELDS_VARIANTS } from './lvt-yields-schema.js'

assertLvtYields(YIELDS, 'src/engine/data/lvt-yields.json')
for (const k of ['repo', 'path', 'commit', 'commitDate', 'fetchedAt', 'sha256']) {
  if (typeof SOURCE[k] !== 'string' || !SOURCE[k]) throw new Error(`src/engine/data/lvt-yields.source.json : champ « ${k} » manquant (relancer npm run sync:lvt)`)
}

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    for (const v of Object.values(o)) deepFreeze(v)
  }
  return o
}

/** Contenu de yields.json, tel qu'importé (copie gelée). */
export const LVT_YIELDS = deepFreeze(structuredClone(YIELDS))
const TAX = Object.fromEntries(LVT_YIELDS.taxes.map((t) => [t.key, t]))

/**
 * Arrondis de l'instantané du Day 0 (recopié à la main avant l'import), conservés pour que les sorties restent identiques :
 * niveaux et totaux des variantes au dixième de Md€ ; prélèvements sociaux des plus-values au centième, des loyers au dixième ;
 * assiette foncière au Md€. Les retirer changerait les résultats (moins de 0,05 Md€ par montant) : décision à prendre à part.
 */
export const LVT_ARRONDIS = Object.freeze({ niveauxMd: 1, psPlusValuesMd: 2, psLoyersMd: 1, baseFonciereMd: 0 })
const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d
const md = (meur) => meur / 1000
const fr = (v, d) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
const frDate = (iso) => iso.split('-').reverse().join('/')

/** Provenance de l'import (affichée dans la carte du module et dans ses explications). */
export const LVT_PROVENANCE = Object.freeze({
  depot: SOURCE.repo,
  fichier: SOURCE.path,
  commit: SOURCE.commit.slice(0, 7),
  commitComplet: SOURCE.commit,
  commitDate: SOURCE.commitDate,
  asOf: LVT_YIELDS.as_of,
  importeLe: SOURCE.fetchedAt,
  sha256: SOURCE.sha256,
  url: `https://github.com/${SOURCE.repo}/blob/${SOURCE.commit}/${SOURCE.path}`,
  texte: `Données LVTShift, commit ${SOURCE.commit.slice(0, 7)} (as_of ${frDate(LVT_YIELDS.as_of)}), importées le ${frDate(SOURCE.fetchedAt)}`,
})

export const LVT_SNAPSHOT_META = Object.freeze({
  depot: LVT_PROVENANCE.depot,
  fichier: LVT_PROVENANCE.fichier,
  commit: LVT_PROVENANCE.commit,
  date: LVT_PROVENANCE.commitDate,
  anneeReference: LVT_YIELDS.price_basis.year,
  unite: `Md€ ${LVT_YIELDS.price_basis.year}`,
  note: 'M€ dans yields.json, arrondis ici au dixième de Md€ par niveau et par total (LVT_ARRONDIS) : la somme des trois niveaux peut différer du total arrondi de 0,1 Md€ (S2 et S3 sans IFI).',
})

/** Assiette : valeur foncière imposable (land_base.taxable_meur), en Md€ arrondis (paramètre `lvt.base_fonciere.2025`). */
export const LVT_BASE_FONCIERE = Object.freeze({
  montant: round(md(LVT_YIELDS.land_base.taxable_meur), LVT_ARRONDIS.baseFonciereMd),
  meur: LVT_YIELDS.land_base.taxable_meur,
  annee: LVT_YIELDS.land_base.year,
  source: LVT_YIELDS.land_base.source,
  url: LVT_YIELDS.land_base.url,
})

// Libellés des variantes (texte du simulateur ; le contenu de chaque variante vient de yields.json).
const LIBELLES = {
  S1: 'S1 : taxe foncière, THRS et DMTO',
  S2: 'S2 sans IFI : S1 + plus-values immobilières',
  S2_IFI: 'S2 avec IFI',
  S3: 'S3 sans IFI : S2 + revenus locatifs',
  S3_IFI: 'S3 avec IFI',
}
const hasTaxOf = (lines, scenario) => lines.some((k) => TAX[k].scenario === scenario)

/**
 * Variantes de yields.json (revue §1.3). code = valeur du levier du module (0 = module inactif).
 * local, departemental, national : tiers_meur en Md€ arrondis au dixième ; total : total_meur arrondi ; tauxIndicatif : rate_pct
 * (taux moyen en % de la valeur foncière imposable). plusValues / revenusLocatifs : la variante contient une ligne de scénario S2 / S3
 * (IR et prélèvements sociaux sur ces revenus, revue §2.1) ; ifi : include_ifi. lignes : clés des impôts remplacés.
 */
export const LVT_SCENARIOS = Object.freeze(LVT_YIELDS_VARIANTS.map(([sc, ifi], i) => {
  const v = LVT_YIELDS.variants.find((w) => w.scenario === sc && w.include_ifi === ifi)
  const id = ifi ? `${sc}_IFI` : sc
  const d = LVT_ARRONDIS.niveauxMd
  return Object.freeze({
    code: i + 1, id, libelle: LIBELLES[id],
    total: round(md(v.total_meur), d),
    local: round(md(v.tiers_meur.local), d),
    departemental: round(md(v.tiers_meur.departmental), d),
    national: round(md(v.tiers_meur.national), d),
    tauxIndicatif: v.rate_pct,
    ifi: v.include_ifi,
    plusValues: hasTaxOf(v.lines, 'S2'),
    revenusLocatifs: hasTaxOf(v.lines, 'S3'),
    lignes: v.lines,
  })
}))

export const LVT_SCENARIO_BY_CODE = Object.freeze(Object.fromEntries(LVT_SCENARIOS.map((s) => [s.code, s])))

const valueAt = (key, year) => {
  const v = TAX[key].values_meur[String(year)]
  if (typeof v !== 'number') throw new Error(`lvt-yields.json : ${key}.values_meur.${year} absent (millésime retenu par la revue)`)
  return v
}
const ligneSource = (keys, montantOf) => keys.map((k) => `${k} ${fr(montantOf(k), 0)} M€`).join(' + ')

/**
 * Prélèvements sociaux (CSG, CRDS, prélèvement de solidarité) sur les revenus remplacés en S2 et S3 (revue §2.2 et §2.3).
 * Sert à la décision D11 : la part sécurité sociale de ces montants est perdue par ce bloc et gagnée par l'État.
 * Millésimes retenus par la revue (§2.4, bas de la fourchette : 1,1 à 1,4 Md€ en S2, 3,1 à 3,4 Md€ en S3) : plus-values 2024,
 * loyers 2022, valeurs nominales de values_meur (et non les moyennes sur cinq ans, qui donnent le haut de la fourchette).
 */
const PS_ANNEES = Object.freeze({ plusValues: 2024, revenusLocatifs: 2022 })
const PS_CLES = Object.freeze({ plusValues: Object.freeze(['gains_ps']), revenusLocatifs: Object.freeze(['rents_ps', 'rents_csg']) })
const psMontant = (k) => PS_CLES[k].reduce((a, key) => a + valueAt(key, PS_ANNEES[k]), 0) / 1000
export const LVT_PRELEVEMENTS_SOCIAUX = Object.freeze({
  plusValues: Object.freeze({
    montant: round(psMontant('plusValues'), LVT_ARRONDIS.psPlusValuesMd), annee: PS_ANNEES.plusValues, cles: PS_CLES.plusValues,
    libelle: 'Prélèvements sociaux sur les plus-values immobilières des particuliers',
    source: `yields.json (LVTShift, commit ${LVT_PROVENANCE.commit}) : gains_ps ${PS_ANNEES.plusValues} = ${fr(valueAt('gains_ps', PS_ANNEES.plusValues), 1)} M€ (IR : gains_ir ${fr(valueAt('gains_ir', PS_ANNEES.plusValues), 1)} M€) ; ${TAX.gains_ps.source} : ${TAX.gains_ps.url}. Total ${PS_ANNEES.plusValues} relu par la revue (Cour des comptes) ; millésime ${PS_ANNEES.plusValues} : bas de la fourchette de la revue (§2.4) ; la moyenne sur cinq ans donnerait plus`,
    statut: 'LVTShift',
  }),
  revenusLocatifs: Object.freeze({
    montant: round(psMontant('revenusLocatifs'), LVT_ARRONDIS.psLoyersMd), annee: PS_ANNEES.revenusLocatifs, cles: PS_CLES.revenusLocatifs,
    libelle: 'Prélèvements sociaux et CSG sur les revenus locatifs des particuliers (logement)',
    source: `yields.json (LVTShift, commit ${LVT_PROVENANCE.commit}) : ${ligneSource(PS_CLES.revenusLocatifs, (k) => valueAt(k, PS_ANNEES.revenusLocatifs))} (données ${PS_ANNEES.revenusLocatifs}) ; ${TAX.rents_ps.source} : ${TAX.rents_ps.url}. Avec les plus-values de ${PS_ANNEES.plusValues} : bas de la fourchette de la revue (§2.4, 3,1 à 3,4 Md€ en S3)`,
    statut: 'LVTShift',
  }),
})

/**
 * Impôts nationaux supprimés en S2 et S3, regroupés par scénario de yields.json (S2 : plus-values ; S3 : revenus locatifs ;
 * S2_IFI : IFI), champ `reference_meur` (M€ 2025) ramené en Md€, sans arrondi : leur somme forme la part nationale additionnelle
 * des variantes (part nationale moins frais de gestion de S1). Sert à la capitalisation inverse (D12, décision du 24 nov. 2026) :
 * leur suppression relève le prix des biens, et la part « sol » de cette hausse revient dans l'assiette de la nouvelle taxe.
 * Les millésimes relus par la revue (§2.2 ; LVT_LIGNES ci-dessous) sont plus bas. Statut : « relu » pour l'IFI, « LVTShift » sinon.
 */
const GROUPES_NATIONAUX = [
  { id: 'pv_ir_ps', scenario: 'S2', drapeau: 'plusValues', court: 'plus-values immobilières', libelle: 'Plus-values immobilières des particuliers, IR et prélèvements sociaux', statut: 'LVTShift' },
  { id: 'loyers_ir_ps', scenario: 'S3', drapeau: 'revenusLocatifs', court: 'revenus locatifs', libelle: 'Revenus locatifs des particuliers, IR, CSG et prélèvements sociaux', statut: 'LVTShift' },
  { id: 'ifi', scenario: 'S2_IFI', drapeau: 'ifi', court: 'IFI', libelle: 'Impôt sur la fortune immobilière', statut: 'relu', revue: 'DGFiP, Statistiques n° 45, 14 avril 2026, relu par la revue' },
]
const anneesTexte = (t) => {
  const ys = t.reference_years
  const py = LVT_YIELDS.price_basis.year
  const span = ys.length > 1 ? `${ys[0]}–${ys[ys.length - 1]}` : String(ys[0])
  if (t.basis === 'average') return `${span} (moyenne, euros ${py})`
  return ys.length === 1 && ys[0] === py ? span : `${span} (euros ${py})`
}
export const LVT_IMPOTS_NATIONAUX_SUPPRIMES = Object.freeze(GROUPES_NATIONAUX.map((g) => {
  const taxes = LVT_YIELDS.taxes.filter((t) => t.scenario === g.scenario && t.tier === 'national')
  if (taxes.length === 0) throw new Error(`lvt-yields.json : aucune ligne nationale de scénario ${g.scenario}`)
  const cles = taxes.map((t) => t.key)
  const urls = [...new Set(taxes.map((t) => t.url))]
  return Object.freeze({
    id: g.id, drapeau: g.drapeau, court: g.court, libelle: g.libelle, cles: Object.freeze(cles),
    montant: taxes.reduce((a, t) => a + t.reference_meur, 0) / 1000,
    annees: anneesTexte(taxes[0]),
    source: `yields.json (LVTShift, commit ${LVT_PROVENANCE.commit}) : ${ligneSource(cles, (k) => TAX[k].reference_meur)} ; ${taxes[0].source}${g.revue ? ` (${g.revue})` : ''} : ${urls.join(' ; ')}`,
    statut: g.statut,
    statutLVTShift: [...new Set(taxes.map((t) => t.status))].join(', '),
  })
}))

/**
 * Lignes d'impôts remplacés, telles que la revue les a relevées (§2.2), montants lus dans yields.json : `valeur` = 'reference'
 * (reference_meur, M€ 2025) ou une année (values_meur nominal de cette année, millésime cité par la revue). Affichage et
 * traçabilité : le module calcule sur LVT_SCENARIOS. statut = relecture de la revue ; statutLVTShift = statut(s) de LVTShift.
 */
const LIGNES_DEF = [
  { id: 'tfpb', impot: 'TFPB, communes et EPCI', cles: ['tfpb'], valeur: 'reference', statut: 'LVTShift', note: () => 'REI via OFGL ; le BIS n° 209 de la DGCL donne 43,1 Md€ pour 2025 (relu, secondaire : https://www.maire-info.com/finances-locales/apres-des-annees-de-hausse-le-produit-de-la-fiscalite-directe-locale-s\'est-stabilise-en-2025-article-30783) ; écart de 0,3 Md€ non expliqué' },
  { id: 'tfpnb', impot: 'TFPNB, non agricole', cles: ['tfpnb'], valeur: 'reference', statut: 'LVTShift', note: () => 'part non agricole reconstituée par LVTShift' },
  { id: 'annexes_tf', impot: 'Syndicats, TSE, GEMAPI, TASA sur l\'avis de taxe foncière', cles: ['tf_annexes'], valeur: 'reference', statut: 'LVTShift' },
  { id: 'thrs', impot: 'Taxe d\'habitation sur les résidences secondaires', cles: ['thrs'], valeur: 'reference', statut: 'LVTShift' },
  { id: 'dmto_dep', impot: 'DMTO, part départementale', cles: ['dmto_departements'], valeur: 2025, statut: 'LVTShift', note: () => `13,0 Md€ en 2023 (DGCL, BIS n° 190, relu : https://collectivites-locales.gouv.fr/files/Accueil/DESL/2024/BIS_190_DMTO.pdf) ; le niveau départemental des variantes (${fr(LVT_SCENARIOS[0].departemental, 1)} Md€) est une moyenne sur cinq ans` },
  { id: 'dmto_com', impot: 'DMTO, part communale', cles: ['dmto_communes'], valeur: 2025, statut: 'LVTShift', note: () => '3,1 Md€ en 2023 (BIS n° 190, relu)' },
  { id: 'frais_gestion', impot: 'Frais de gestion et d\'assiette de l\'État sur TF, THRS et DMTO', cles: ['tf_etat', 'thrs_etat', 'dmto_etat'], valeur: 'reference', statut: 'LVTShift', note: () => 'CGI art. 1641 et 1647 V (calcul de LVTShift)' },
  { id: 'pv_ir_ps', impot: 'Plus-values immobilières des particuliers, IR et prélèvements sociaux', cles: ['gains_ir', 'gains_ps'], valeur: 2024, statut: 'relu', note: () => `total relu (Cour des comptes) ; décomposition IR ${fr(md(valueAt('gains_ir', 2024)), 2)} + PS ${fr(md(valueAt('gains_ps', 2024)), 2)} Md€ de LVTShift ; part sécurité sociale des PS : voir D11` },
  { id: 'ifi', impot: 'Impôt sur la fortune immobilière', cles: ['ifi'], valeur: 'reference', statut: 'relu', note: () => 'DGFiP, Statistiques n° 45, 14 avril 2026 (montant des avis ; recettes budgétaires plus élevées, voir la note de LVTShift)' },
  { id: 'loyers_ir_ps', impot: 'Revenus locatifs des particuliers, IR, CSG et prélèvements sociaux', cles: ['rents_ir', 'rents_ps', 'rents_csg'], valeur: 2022, statut: 'LVTShift', note: () => `IR ${fr(md(valueAt('rents_ir', 2022)), 1)} + PS ${fr(md(valueAt('rents_ps', 2022)), 1)} + CSG ${fr(md(valueAt('rents_csg', 2022)), 1)} Md€ (CPO, données 2022, non relu) ; part sécurité sociale : voir D11` },
]
const BLOC_OF_TIER = { local: 'locales', departmental: 'locales', national: 'centrales' }
export const LVT_LIGNES = Object.freeze(LIGNES_DEF.map((l) => {
  const taxes = l.cles.map((k) => TAX[k])
  const blocs = [...new Set(taxes.map((t) => BLOC_OF_TIER[t.tier]))]
  if (blocs.length !== 1) throw new Error(`LVT_LIGNES ${l.id} : lignes de niveaux différents`)
  const meur = l.valeur === 'reference' ? taxes.reduce((a, t) => a + t.reference_meur, 0) : l.cles.reduce((a, k) => a + valueAt(k, l.valeur), 0)
  const ref = taxes[0].reference_years
  const urls = [...new Set(taxes.map((t) => t.url))]
  return Object.freeze({
    id: l.id, impot: l.impot, bloc: blocs[0], cles: Object.freeze([...l.cles]),
    montant: meur / 1000,
    annee: l.valeur === 'reference' ? ref[ref.length - 1] : l.valeur,
    valeur: l.valeur === 'reference' ? `reference_meur (${anneesTexte(taxes[0])})` : `values_meur ${l.valeur} (nominal)`,
    scenarios: Object.freeze(LVT_SCENARIOS.filter((s) => l.cles.every((k) => s.lignes.includes(k))).map((s) => s.code)),
    url: urls[0], urls: Object.freeze(urls),
    statut: l.statut,
    statutLVTShift: [...new Set(taxes.map((t) => t.status))].join(', '),
    ...(l.note ? { note: l.note() } : {}),
  })
}))
