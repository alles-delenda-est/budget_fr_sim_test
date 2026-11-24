// Instantané daté des rendements LVTShift (module « taxe sur la valeur du sol », docs/review-lvt-module.md §1.3, §2.2, §5.2).
// Source : dépôt alles-delenda-est/LVTShift, fichier lvtshift-fr/site/public/data/yields.json produit par yields.py,
// commit 322190e du 12 novembre 2026 (fusion de la PR #69). Aucun couplage à l'exécution : ces chiffres sont figés ici.
// Montants en Md€ de 2025 (euros 2025 ; moyennes sur cinq ans pour les DMTO et les plus-values, convention de LVTShift).
// Le module les convertit en % du PIB 2025 avec `base.pib.2025` (params.js) : aucun PIB n'est écrit dans ce fichier.
//
// Statuts (docs/review-lvt-module.md §2.2) : « relu » = lu dans la source officielle par la revue ; « relu (secondaire) » = lu dans
// une source qui cite la source officielle ; « LVTShift » = repris de yields.py / yields.json, source et URL indiquées par LVTShift,
// non relues par la revue.

export const LVT_SNAPSHOT_META = Object.freeze({
  depot: 'alles-delenda-est/LVTShift',
  fichier: 'lvtshift-fr/site/public/data/yields.json',
  commit: '322190e',
  date: '2026-11-12',
  anneeReference: 2025,
  unite: 'Md€ 2025',
  note: 'Totaux arrondis au dixième dans yields.json : la somme des trois niveaux peut différer du total publié de 0,1 Md€ (S2 et S3 sans IFI).',
})

/**
 * Scénarios de yields.json (revue §1.3). code = valeur du levier du module (0 = module inactif).
 * local, departemental, national : ventilation par niveau ; tauxIndicatif : taux moyen en % de la valeur foncière imposable.
 * plusValues / revenusLocatifs : le scénario remplace l'IR et les prélèvements sociaux sur ces revenus (revue §2.1).
 */
export const LVT_SCENARIOS = Object.freeze([
  { code: 1, id: 'S1', libelle: 'S1 : taxe foncière, THRS et DMTO', total: 67.2, local: 50.5, departemental: 14.9, national: 1.8, tauxIndicatif: 1.10, ifi: false, plusValues: false, revenusLocatifs: false },
  { code: 2, id: 'S2', libelle: 'S2 sans IFI : S1 + plus-values immobilières', total: 71.1, local: 50.5, departemental: 14.9, national: 5.8, tauxIndicatif: 1.16, ifi: false, plusValues: true, revenusLocatifs: false },
  { code: 3, id: 'S2_IFI', libelle: 'S2 avec IFI', total: 73.5, local: 50.5, departemental: 14.9, national: 8.1, tauxIndicatif: 1.20, ifi: true, plusValues: true, revenusLocatifs: false },
  { code: 4, id: 'S3', libelle: 'S3 sans IFI : S2 + revenus locatifs', total: 79.4, local: 50.5, departemental: 14.9, national: 14.1, tauxIndicatif: 1.30, ifi: false, plusValues: true, revenusLocatifs: true },
  { code: 5, id: 'S3_IFI', libelle: 'S3 avec IFI', total: 81.8, local: 50.5, departemental: 14.9, national: 16.4, tauxIndicatif: 1.34, ifi: true, plusValues: true, revenusLocatifs: true },
].map(Object.freeze))

export const LVT_SCENARIO_BY_CODE = Object.freeze(Object.fromEntries(LVT_SCENARIOS.map((s) => [s.code, s])))

/**
 * Prélèvements sociaux (CSG, CRDS, prélèvement de solidarité) sur les revenus remplacés en S2 et S3 (revue §2.2 et §2.3).
 * Sert à la décision D11 : la part sécurité sociale de ces montants est perdue par ce bloc et gagnée par l'État.
 */
export const LVT_PRELEVEMENTS_SOCIAUX = Object.freeze({
  plusValues: Object.freeze({
    montant: 1.92, annee: 2024,
    libelle: 'Prélèvements sociaux sur les plus-values immobilières des particuliers',
    source: 'Cour des comptes, « L\'imposition des plus-values immobilières des particuliers », 25 nov. 2025 (total 2,8 Md€ en 2024, relu) ; décomposition IR 0,91 + PS 1,92 de LVTShift : https://www.ccomptes.fr/fr/publications/limposition-des-plus-values-immobilieres-des-particuliers',
    statut: 'LVTShift',
  }),
  revenusLocatifs: Object.freeze({
    montant: 3.5, annee: 2022,
    libelle: 'Prélèvements sociaux et CSG sur les revenus locatifs des particuliers (logement)',
    source: 'Conseil des prélèvements obligatoires, déc. 2023 (PS 2,4 + CSG 1,1 ; donnée 2022, pas 2024) : https://www.vie-publique.fr/files/rapport/pdf/292676.pdf',
    statut: 'LVTShift',
  }),
})

/** Lignes d'impôts remplacés, telles que la revue les a relevées (§2.2). Affichage et traçabilité : le module calcule sur LVT_SCENARIOS. */
export const LVT_LIGNES = Object.freeze([
  { id: 'tfpb', impot: 'TFPB, communes et EPCI', bloc: 'locales', montant: 42.8, annee: 2025, scenarios: [1, 2, 3, 4, 5], url: 'https://data.ofgl.fr/explore/dataset/rei/', statut: 'LVTShift', note: 'REI 2025 via OFGL ; le BIS n° 209 de la DGCL donne 43,1 Md€ (relu, secondaire : https://www.maire-info.com/finances-locales/apres-des-annees-de-hausse-le-produit-de-la-fiscalite-directe-locale-s\'est-stabilise-en-2025-article-30783) ; écart de 0,3 Md€ non expliqué' },
  { id: 'tfpnb', impot: 'TFPNB, non agricole', bloc: 'locales', montant: 0.27, annee: 2025, scenarios: [1, 2, 3, 4, 5], url: 'https://data.ofgl.fr/explore/dataset/rei/', statut: 'LVTShift', note: 'part non agricole reconstituée (statut « derived » chez LVTShift)' },
  { id: 'annexes_tf', impot: 'Syndicats, TSE, GEMAPI, TASA sur l\'avis de taxe foncière', bloc: 'locales', montant: 0.92, annee: 2025, scenarios: [1, 2, 3, 4, 5], url: 'https://data.ofgl.fr/explore/dataset/rei/', statut: 'LVTShift' },
  { id: 'thrs', impot: 'Taxe d\'habitation sur les résidences secondaires', bloc: 'locales', montant: 2.97, annee: 2025, scenarios: [1, 2, 3, 4, 5], url: 'https://data.ofgl.fr/explore/dataset/rei/', statut: 'LVTShift' },
  { id: 'dmto_dep', impot: 'DMTO, part départementale', bloc: 'locales', montant: 13.5, annee: 2025, scenarios: [1, 2, 3, 4, 5], url: 'https://data.ofgl.fr/explore/dataset/ofgl-base-departements/', statut: 'LVTShift', note: '13,0 Md€ en 2023 (DGCL, BIS n° 190, relu : https://collectivites-locales.gouv.fr/files/Accueil/DESL/2024/BIS_190_DMTO.pdf) ; le niveau départemental de yields.json (14,9) est une moyenne sur cinq ans' },
  { id: 'dmto_com', impot: 'DMTO, part communale', bloc: 'locales', montant: 3.2, annee: 2025, scenarios: [1, 2, 3, 4, 5], url: 'https://data.ofgl.fr/explore/dataset/grand-livre/', statut: 'LVTShift', note: '3,1 Md€ en 2023 (BIS n° 190, relu)' },
  { id: 'frais_gestion', impot: 'Frais de gestion et d\'assiette de l\'État sur TF, THRS et DMTO', bloc: 'centrales', montant: 1.8, annee: 2025, scenarios: [1, 2, 3, 4, 5], url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053546093', statut: 'LVTShift', note: 'CGI art. 1641 et 1647 V (calcul de LVTShift)' },
  { id: 'pv_ir_ps', impot: 'Plus-values immobilières des particuliers, IR et prélèvements sociaux', bloc: 'centrales', montant: 2.8, annee: 2024, scenarios: [2, 3, 4, 5], url: 'https://www.ccomptes.fr/fr/publications/limposition-des-plus-values-immobilieres-des-particuliers', statut: 'relu', note: 'total relu (Cour des comptes) ; moyenne 2017–2023 de 3,5 Md€ ; décomposition IR 0,91 + PS 1,92 de LVTShift ; part sécurité sociale des PS : voir D11' },
  { id: 'ifi', impot: 'Impôt sur la fortune immobilière', bloc: 'centrales', montant: 2.3, annee: 2025, scenarios: [3, 5], url: 'https://www.impots.gouv.fr/dgfip-statistiques-limpot-sur-la-fortune-immobiliere-en-2025', statut: 'relu', note: 'DGFiP, Statistiques n° 45, 14 avril 2026 (recettes budgétaires 2,77 Md€ selon LVTShift)' },
  { id: 'loyers_ir_ps', impot: 'Revenus locatifs des particuliers, IR, CSG et prélèvements sociaux', bloc: 'centrales', montant: 7.7, annee: 2022, scenarios: [4, 5], url: 'https://www.vie-publique.fr/files/rapport/pdf/292676.pdf', statut: 'LVTShift', note: 'IR 4,2 + PS 2,4 + CSG 1,1 (CPO, données 2022, non relu) ; part sécurité sociale : voir D11' },
].map(Object.freeze))
