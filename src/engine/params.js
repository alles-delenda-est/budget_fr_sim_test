// Paramètres du moteur v2 — note de modèle v0.3 (docs/model-note.md), §1, §4 et docs/baseline-data.md.
// Chaque paramètre : { id, value (central), low, high, unit, source, status, explanation }.
// status : "sourcé" | "calculé (estimation)" | "sourcé (calcul)" | "sourcé (secondaire)" | "sourcé (fourchette), centre choisi" | "de mémoire" | "à collecter" | "non validé"
//          | "à valider" (fourchette sourcée, valeur centrale proposée mais pas encore fixée par le propriétaire).
// Convention d'unités : chaque `unit` dit comment lire `value` (ex. "%" = 2,1 pour 2,1 %). Le moteur convertit.
// Un paramètre « à collecter » porte une VALEUR PROVISOIRE (placeholder) : ne jamais la présenter comme sourcée.

import { LVT_BASE_FONCIERE, LVT_PROVENANCE } from './lvt-snapshot.js'

const p = (id, value, low, high, unit, source, status, explanation) => ({
  id, value, low, high, unit, source, status, explanation,
})
const obs = (id, value, unit, source, explanation, status = 'sourcé') =>
  p(id, value, value, value, unit, source, status, explanation)

const PLACEHOLDER = 'Valeur provisoire (placeholder), à remplacer : '

// ---------- 1. Données de base (section 1, baseline-data.md) ----------
const S1 = 'Insee, Dépenses par administration publique 2025 [S1] ; Insee Première n° 2106 [S2]'
const BLOCS = [
  ['centrales', 'administrations centrales', [681.1, 53.3, -130.3, 550.8]],
  ['locales', 'collectivités locales', [335.5, 6.0, -15.6, 319.9]],
  ['secu', 'sécurité sociale', [803.2, 5.6, -6.7, 796.5]],
  ['apu', 'ensemble des administrations publiques (consolidé)', [1714.2, 64.7, -152.5, 1561.7]],
]
const baseBlocs = BLOCS.flatMap(([k, lib, [dep, int, sol, rec]]) => [
  obs(`base.depenses.${k}`, dep, 'Md€ 2025', S1, `Dépenses 2025, ${lib}.`),
  obs(`base.interets.${k}`, int, 'Md€ 2025', S1, `Intérêts payés en 2025, ${lib}.`),
  obs(`base.solde.${k}`, sol, 'Md€ 2025', S1, `Solde (capacité ou besoin de financement) 2025, ${lib}.`),
  obs(`base.recettes.${k}`, rec, 'Md€ 2025', `${S1} ; calcul : dépenses + solde`, `Recettes 2025, ${lib}.`),
])

// Parts par bloc dérivées des chiffres Insee ci-dessus (calcul).
const prim = { centrales: -130.3 + 53.3, locales: -15.6 + 6.0, secu: -6.7 + 5.6 }
const primSum = prim.centrales + prim.locales + prim.secu
const intSum = 53.3 + 6.0 + 5.6
const depSum = 681.1 + 335.5 + 803.2
const recSum = 550.8 + 319.9 + 796.5
const CALC = 'Calcul sur les chiffres Insee 2025 de la section 1.1 (normalisés pour sommer à 1)'
const partsBlocs = [
  ...['centrales', 'locales', 'secu'].flatMap((k, i) => {
    const kk = ['centrales', 'locales', 'secu'][i]
    return [
      obs(`bloc.part_primaire.${k}`, prim[kk] / primSum, 'part', CALC, `Part du solde primaire de référence portée par le bloc « ${k} ».`),
      obs(`bloc.part_interets.${k}`, [53.3, 6.0, 5.6][i] / intSum, 'part', CALC, `Part de la charge d'intérêts attribuée au bloc « ${k} ».`),
      obs(`bloc.part_depenses.${k}`, [681.1, 335.5, 803.2][i] / depSum, 'part', CALC, `Part des dépenses du bloc « ${k} » (sert à répartir la dérive des autres dépenses).`),
      obs(`bloc.part_recettes.${k}`, [550.8, 319.9, 796.5][i] / recSum, 'part', CALC, `Part des recettes du bloc « ${k} » (sert à répartir l'effet des stabilisateurs).`),
    ]
  }),
  // Ventilation État/ODAC (S1311) vs collectivités locales (S1313) par fonction COFOG 2024 (Eurostat gov_10a_exp, France, TE, M€) :
  // Enseignement (GF09) : S1311 106 078,3 / S1313 45 962,7 (S1314 = 0) ; Ordre et sécurité (GF03) : 42 175,9 / 10 325,0 (S1314 = 0) ;
  // Affaires économiques (GF04) : 123 826,5 / 56 428,3 (S1314 = 560,0, soit 0,3 % négligé). Normalisées pour sommer à 1.
  // Totaux de sous-secteurs NON consolidés : les transferts entre sous-secteurs (D7 + D9 versés à S1311/S1313/S1314) restent comptés chez le
  // payeur (S1311 + S1313 + S1314 − S13 = 3 401,4 / 387,9 / 14 742,0 M€). Parts nettes des transferts versés (dernier élément, affiché seulement) :
  // 69,8 % / 80,4 % / 66,9 % : la part État est surestimée surtout en affaires économiques (+1,8 pt). Valeurs moteur inchangées.
  ...([
    ['enseignement', 'enseignement (GF09)', 106078.3, 45962.7, 3401.4, 0.698],
    ['ordre_securite', 'ordre et sécurité publics (GF03)', 42175.9, 10325.0, 387.9, 0.804],
    ['affaires_economiques', 'affaires économiques (GF04)', 123826.5, 56428.3, 14742.0, 0.669],
  ]).flatMap(([slug, lib, c, l, recouvrement, partNette]) => {
    const pct = (v) => (100 * v).toFixed(1).replace('.', ',')
    const src = `Eurostat, gov_10a_exp (France, 2024, TE, M€, API officielle lue le 24 nov. 2026) : ${lib} — S1311 ${c.toFixed(1)} M€ / S1313 ${l.toFixed(1)} M€ (normalisé à 1). Totaux non consolidés : ${(recouvrement / 1000).toFixed(1).replace('.', ',')} Md€ de transferts entre sous-secteurs comptés chez le payeur ; part État nette des transferts versés ${pct(partNette)} % contre ${pct(c / (c + l))} % retenu (docs/review-day0-parameters.md §3)`
    return [
      obs(`bloc.cofog.${slug}.centrales`, c / (c + l), 'part', src, `Part des administrations centrales (État et ODAC) dans la fonction « ${lib} ».`, 'sourcé (calcul)'),
      obs(`bloc.cofog.${slug}.locales`, l / (c + l), 'part', src, `Part des collectivités locales (APUL) dans la fonction « ${lib} ».`, 'sourcé (calcul)'),
    ]
  }),
]

const baseMacro = [
  obs('base.pib.2025', 2991, 'Md€', 'RESF 2027, tableau 1, p. 188 [S17]', 'PIB en valeur 2025, observé.'),
  obs('base.dette.2025', 3460.5, 'Md€', 'Insee, Dette et déficit publics 2025 [S4]', 'Dette publique brute (Maastricht) fin 2025.'),
  obs('base.dette.2024', 3306.1, 'Md€', 'Insee [S4] ; valeur déduite de la moyenne 2024–2025 de la note (1.1)', 'Dette publique brute fin 2024 (sert au calcul de la dette nouvelle de 2025).'),
  obs('base.chomage', 8.2, '% de la population active', 'Insee, Informations rapides n° 270, 10 nov. 2026 [S22]', 'Taux de chômage au troisième trimestre 2026 ; tenu constant dans la référence (hypothèse de simplification).'),
  p('base.chomage_ref', 8.2, 7.2, 9.2, '% de la population active', 'Dernière observation [S22] ; maintien constant = hypothèse', 'non validé',
    'Chômage de référence maintenu au dernier niveau observé ; la note ne fixe pas de trajectoire.'),
  obs('base.is.produit_etat_2025', 58.2, 'Md€', 'PLF 2026, Voies et moyens, tome I, p. 6 [baseline-data, item 2]', 'Produit net de l\'impôt sur les sociétés de l\'État en 2025 (révisé).'),
  obs('base.is.taux', 25, '%', 'PLF 2026, Voies et moyens, tome I, p. 18', 'Taux normal de l\'impôt sur les sociétés.'),
  obs('base.dette.ratio_2025', 115.7, '% du PIB', 'RESF 2027, tableau 14 [S17]', 'Dette brute 2025 en % du PIB (après révision).'),
]
const COFOG = [
  ['protection_sociale', 693, 'protection sociale'], ['sante', 261, 'santé'],
  ['services_generaux', 181, 'services généraux'], ['affaires_economiques', 166, 'affaires économiques'],
  ['enseignement', 149, 'enseignement'], ['defense', 54, 'défense'], ['ordre_securite', 52, 'ordre et sécurité publics'],
  ['culture', 43, 'loisirs, culture, culte'], ['logement', 42, 'logement et équipements collectifs'],
  ['environnement', 30, "protection de l'environnement"],
].map(([k, v, lib]) => obs(`base.cofog.${k}`, v, 'Md€ 2024',
  'Insee Première n° 2093, figure 2 [S19] (2024 provisoire ; le niveau 2025 paraît en décembre 2026)',
  `Dépenses publiques 2024, fonction « ${lib} ».`))

// Allocations de l'Unédic (levier « assurance chômage »). Lu dans le PDF de l'Unédic par un outil de lecture : à reconfirmer sur le document.
const unedic = [
  obs('base.unedic.allocations', 37.2, 'Md€ 2025', 'Unédic, « Situation financière de l\'Assurance chômage à horizon 2028 », 17 juin 2026, tableau 4 p. 16, ligne « Allocations brutes et aides » (incluant notamment l\'Arce et la prime CSP) : 37,2 Md€ en 2025, 38,1 Md€ prévus en 2026 ; p. 11 : « stagné à 37,2 Md€ en 2025 ». Dépenses totales de l\'Unédic : 45,3 Md€ en 2025, 46,6 Md€ en 2026',
    'Allocations versées par l\'Unédic en 2025 (allocations brutes et aides, qui comprennent l\'ARE mais aussi l\'Arce et la prime CSP : l\'ARE seule n\'est pas isolée dans le document). Sert d\'étalon : 1 % de cette ligne = 0,372 Md€, soit 0,012 % du PIB.'),
]

const COR = { 2025: 14.1, 2030: 14.1, 2045: 14.2, 2070: 15.3 }

// Comparateurs et repères (jamais des cibles) — section 1.2 et section 5.
const cmp = (id, value, unit, source, explanation) => obs(id, value, unit, source, explanation)
const RESF = 'RESF 2027 [S17]'
const comparators = [
  cmp('cmp.gouv.pib.2026', 3051, 'Md€', `${RESF}, tableau 1`, 'PIB en valeur 2026 selon le Gouvernement (comparateur).'),
  cmp('cmp.gouv.pib.2027', 3135, 'Md€', `${RESF}, tableau 1`, 'PIB en valeur 2027 selon le Gouvernement (comparateur).'),
  cmp('cmp.gouv.solde.2026', -5.4, '% du PIB', `${RESF}, tableau 13`, 'Solde public 2026 selon le Gouvernement.'),
  cmp('cmp.gouv.solde.2027', -5.0, '% du PIB', `${RESF}, tableau 13`, 'Solde public 2027 selon le Gouvernement.'),
  cmp('cmp.gouv.dette.2026', 119.3, '% du PIB', `${RESF}, tableau 14`, 'Dette 2026 selon le Gouvernement.'),
  cmp('cmp.gouv.dette.2027', 121.7, '% du PIB', `${RESF}, tableau 14`, 'Dette 2027 selon le Gouvernement.'),
  cmp('cmp.gouv.interets.2026', 2.6, '% du PIB', `${RESF}, tableaux 13 et 17`, 'Charge d\'intérêts 2026 selon le Gouvernement.'),
  cmp('cmp.gouv.interets.2027', 2.9, '% du PIB', `${RESF}, tableaux 13 et 17`, 'Charge d\'intérêts 2027 selon le Gouvernement.'),
  cmp('cmp.gouv.croissance.2026', 0.5, '%', 'HCFP, avis n° 2026-5 [S7]', 'Croissance en volume 2026 selon le Gouvernement.'),
  cmp('cmp.gouv.croissance.2027', 1.0, '%', 'HCFP, avis n° 2026-5 [S7]', 'Croissance en volume 2027 selon le Gouvernement (jugée optimiste par le HCFP).'),
  cmp('cmp.gouv.croissance.potentielle', 1.2, '%', 'HCFP, avis n° 2026-5 [S7]', 'Croissance potentielle 2026–2027 selon le Gouvernement.'),
  cmp('cmp.ce.solde.2026', -5.1, '% du PIB', 'Commission européenne, prévisions du printemps 2026 (21 mai 2026), page France', 'Solde public 2026 selon la Commission (politique inchangée) : comparateur.'),
  cmp('cmp.ce.solde.2027', -5.7, '% du PIB', 'Commission européenne, prévisions du printemps 2026 (21 mai 2026), page France', 'Solde public 2027 selon la Commission (politique inchangée) : comparateur.'),
  cmp('cmp.ce.interets.2026', 2.6, '% du PIB', 'Commission européenne, prévisions du printemps 2026, page France', 'Charge d\'intérêts 2026 selon la Commission.'),
  cmp('cmp.ce.interets.2027', 2.8, '% du PIB', 'Commission européenne, prévisions du printemps 2026, page France', 'Charge d\'intérêts 2027 selon la Commission.'),
  cmp('cmp.cour.interets.2025', 65.7, 'Md€', 'Cour des comptes, juin 2026, tableau 14 [S14]', 'Charge d\'intérêts 2025 (observé).'),
  cmp('cmp.cour.interets.2026', 77.4, 'Md€', 'Cour des comptes, juin 2026, tableau 14 [S14]', 'Charge d\'intérêts 2026 (prévision de printemps).'),
  cmp('cmp.cour.interets.2029', 100, 'Md€', 'Cour des comptes, juin 2026, p. 69 [S14]', 'Charge d\'intérêts 2029 : « plus de 100 Md€ par an » (seuil, non une série).'),
  cmp('cmp.cour.dette.2026', 118.5, '% du PIB', 'Cour des comptes, juin 2026 [S14]', 'Dette 2026 (prévision de printemps).'),
  cmp('cmp.cour.dette.2029_plafonds', 120.1, '% du PIB', 'Cour des comptes, tableau 19 [S14]', 'Dette 2029 si les plafonds de dépense nette sont tenus.'),
  cmp('cmp.cour.dette.2029_derive', 124.3, '% du PIB', 'Cour des comptes, tableau 21 [S14]', 'Dette 2029 dans le scénario « dérive ».'),
  cmp('cmp.dsm.dette.2025', 116.3, '% du PIB', 'Commission européenne, Debt Sustainability Monitor 2025, tableau 2.2 [S20]', 'Dette 2025, point de départ de la Commission (diffère de l\'Insee : recaler avant de superposer).'),
  cmp('cmp.dsm.dette.2036', 144.0, '% du PIB', 'Commission européenne, Debt Sustainability Monitor 2025, tableau 2.2 [S20]', 'Dette 2036 en scénario de base (solde primaire structurel maintenu à son niveau de 2026, hors vieillissement).'),
  cmp('cmp.cor.emplois.age_legal_10ans.bas', 160000, 'emplois', 'COR, Rapport annuel juin 2026, partie 2, chapitre 6, Tableau 2.10 p. 123 (DG Trésor, I-MIP CepreHANK, OFCE EmeRaude), AOD 64 → 65 ans', 'Effet d\'un relèvement d\'un an de l\'âge légal sur l\'emploi à 10 ans : bas de la fourchette des modèles du COR (comparateur, affiché à côté du levier âge légal).'),
  cmp('cmp.cor.emplois.age_legal_10ans.haut', 250000, 'emplois', 'COR, Rapport annuel juin 2026, partie 2, chapitre 6, Tableau 2.10 p. 123 (DG Trésor, I-MIP CepreHANK, OFCE EmeRaude), AOD 64 → 65 ans', 'Effet d\'un relèvement d\'un an de l\'âge légal sur l\'emploi à 10 ans : haut de la fourchette des modèles du COR (comparateur, affiché à côté du levier âge légal).'),
]

// ---------- 4. Table des paramètres (section 4) ----------
const SPLACE = 'Règle d\'ancrage 1.2'
const table = [
  // Macro : valeurs à collecter -> placeholders (= comparateur Gouvernement), à remplacer par la médiane des prévisionnistes indépendants.
  p('macro.g.2026', 0.55, 0.4, 0.8, '% (volume)', 'Médiane de 4 prévisionnistes : BdF sept. 2026 0,4 ; FMI oct. 2026 0,4 (secondaire) ; OCDE juin 2026 0,7 ; CE printemps 2026 0,8 (baseline-data, collecte du 17 nov.). Bas/haut = min/max des sources', 'non validé',
    'Croissance 2026 de référence : médiane des prévisionnistes indépendants. Reposant sur 4 valeurs seulement, dont une secondaire, de millésimes anciens (CE printemps 2026, OCDE juin 2026).'),
  p('macro.g.2027', 0.85, 0.7, 1.1, '% (volume)', 'Médiane de 4 prévisionnistes : FMI 0,7 (secondaire) ; OCDE 0,8 ; BdF 0,9 ; CE 1,1 (baseline-data, collecte du 17 nov.). Bas/haut = min/max', 'non validé',
    'Croissance 2027 de référence : médiane des prévisionnistes indépendants. Reposant sur 4 valeurs seulement, dont une secondaire, de millésimes anciens.'),
  p('macro.g.potentielle', 1.0, 0.9, 1.2, '% (volume)', 'Banque de France, Eco Notepad n° 455, 8 juillet 2026, p. 3 : la plupart des institutions attendent 0,9 % à 1,2 % en 2026-2028 (fourchette ; valeurs par institution non lisibles). Central 1,0 % = choix de l\'implémentation, non publié', 'sourcé (fourchette), centre choisi',
    'Rythme auquel l\'économie croît sans surchauffe (sourcé : fourchette ; le central est un choix, pas un chiffre publié). Valeur appliquée dès 2028.'),
  p('macro.pi.2026', 2.4, 2.3, 2.5, '%', 'Médiane de 3 sources : BdF (IPCH) 2,3 ; CE 2,4 ; FMI (IPC, secondaire) 2,4 (baseline-data, collecte du 17 nov.). Bas/haut : min et arrondi supérieur (OCDE manquant)', 'non validé',
    'Hausse annuelle des prix en 2026 : médiane de 3 sources seulement, mélange IPCH et IPC.'),
  p('macro.pi.2027', 1.85, 1.8, 1.9, '%', 'Médiane de 2 sources : CE 1,8 ; BdF (IPCH) 1,9 (baseline-data, collecte du 17 nov.)', 'non validé',
    'Hausse annuelle des prix en 2027 : moyenne de 2 sources seulement, ce n\'est pas une médiane de quatre sources.'),
  p('macro.pi.long', 1.85, 1.3, 2.3, '%', 'Banque de France, « Projections macroéconomiques France », 15 sept. 2026, p. 1 (PDF primaire lu directement : IPCH total 1,6 % et hors énergie/alimentation 1,9 % en 2028) ; BCE, Survey of Professional Forecasters T4 2026 (30 oct. 2026, lu via synthèse : anticipations long terme 2031 ancrées à 2,0 %, cible symétrique BCE 2,0 %) ; comparateur RESF 2027 : 1,8 % en 2027. Centre 1,85 % conservé dans la fourchette 1,3–2,3 % (docs/review-day0-parameters.md)', 'sourcé (fourchette), centre choisi',
    'Inflation à partir de 2028 : encadrée entre la projection Banque de France 2028 (1,6 % total ; 1,9 % sous-jacent) et les anticipations long terme BCE (2,0 %).'),
  p('dem.lambda', 0.7, 0.5, 0.85, 'part', 'Hypothèse de calibration, sans source directe', 'non validé',
    'Part de l\'effet sur l\'activité qui subsiste l\'année suivante.'),
  p('dem.m.achats_invest', 0.9, 0.5, 1.3, 'multiplicateur', 'Insee / DG Trésor, Mésange G2017/04 (mai 2017, PDF primaire lu directement) : investissement public 1,31 an 1 (§4.1.1, p. 102), dépense publique générique 0,78 an 1 (§4.1.2, p. 105) ; Ramey (2019, JEP 33(2) : achats publics 0,6–1,0) ; Gechert (2015, OEP 67(3), 104 études : ≈ 1,0, investissement +0,5) — synthèses lues (docs/review-day0-parameters.md)', 'sourcé (fourchette), centre choisi',
    '1 € de commande publique en moins retire environ 0,9 € d\'activité la première année (Mésange : 0,78 dépense générique à 1,31 investissement public).'),
  p('dem.m.remunerations', 0.8, 0.5, 1.2, 'multiplicateur', 'Insee / DG Trésor, Mésange G2017/04 (mai 2017, PDF primaire lu directement, §4.1.2, pp. 105–106) : choc composite de dépense publique (dont 25 % de rémunérations publiques, moitié emploi / moitié salaire par tête) = 0,78 an 1 (1,06 an 2, 1,03 an 3) ; Banque de France, WP 883 (Aldama et al., 2022, EA-BDF, PDF primaire lu directement, p. 54) : consommation publique France 1,0–1,1 en moyenne sur 2 ans (docs/review-day0-parameters.md)', 'sourcé (fourchette), centre choisi',
    '1 € de masse salariale publique en moins retire environ 0,8 € d\'activité la première année (Mésange : 0,78 sur la dépense publique générique).'),
  p('dem.m.prestations', 0.5, 0.2, 0.8, 'multiplicateur', 'Aucune variante « prestations seules » dans Insee / DG Trésor, Mésange G2017/04 (PDF primaire lu directement : les prestations en espèces ne sont que 46 % du choc composite de dépense §4.1.2 pp. 105–106, multiplicateur 0,78 an 1 ; le chiffre de 0,41 cité auparavant est celui des variantes IR et CSG §4.1.6–4.1.7, pas des prestations). Seule source française directe trouvée : Banque de France, WP 750 (Aldama et Ouvrard, janv. 2020, modèle FR-BDF, PDF primaire lu directement, Tableau 11 p. 28) : hausse durable de 1 pt de PIB des prestations sociales hors chômage = +0,09 % de PIB an 1, +0,26 an 2, +0,37 an 3, +0,43 an 4 (dans FR-BDF, les variantes fiscales sont aussi faibles an 1 : impôts directs −0,09, Tableau 12 p. 30). Coenen et al. (2012, AEJ: Macro, transferts généraux 0,42 an 1) : non relu dans la source primaire (valeurs données en graphiques). Centre 0,5 conservé, sans source directe : à valider (docs/review-day0-parameters.md §5)', 'à valider',
    'Les ménages épargnent une partie des prestations. Centre 0,5 conservé mais à valider : la seule estimation française directe trouvée (Banque de France, modèle FR-BDF) donne 0,09 la première année et 0,43 la quatrième, sous la borne basse la première année.'),
  p('dem.m.tva', 0.4, 0.2, 0.6, 'multiplicateur', 'Insee / DG Trésor, Mésange G2017/04 (mai 2017, PDF primaire lu directement, §4.1.5, pp. 112–113) : hausse de TVA de 1 pt de PIB = −0,32 pt de PIB an 1 (−0,66 an 2, −0,72 an 3) ; Coenen et al. (2012, AEJ: Macro, lu via synthèse) : taxe sur la consommation = 0,61 an 1 (docs/review-day0-parameters.md)', 'sourcé (fourchette), centre choisi',
    'Effet d\'une hausse de TVA sur la consommation : multiplicateur de première année autour de 0,4 (Mésange : 0,32 an 1 ; Coenen et al. : 0,61).'),
  p('dem.m.ir_csg', 0.4, 0.2, 0.6, 'multiplicateur', 'Insee / DG Trésor, Mésange G2017/04 (mai 2017, PDF primaire lu directement, §4.1.6 CSG p. 115 et §4.1.7 IR p. 117) : baisse de 1 pt de PIB = +0,41 pt de PIB an 1 pour la CSG comme pour l\'IR (+0,84 / +0,83 an 2) ; Coenen et al. (2012, AEJ: Macro, lu via synthèse) : impôts sur le travail 0,23 an 1 (docs/review-day0-parameters.md)', 'sourcé (fourchette), centre choisi',
    'Effet d\'un impôt sur le revenu des ménages (IR ou CSG) : 0,41 en première année dans le modèle Mésange.'),
  p('dem.m.cotisations', 0.4, 0.2, 0.7, 'multiplicateur', 'Insee / DG Trésor, Mésange G2017/04 (mai 2017, PDF primaire lu directement, §4.1.3, pp. 107–108) : baisse de 1 pt de PIB de cotisations employeurs = +0,20 pt de PIB an 1, +0,55 an 2, +0,76 an 3 ; le centre 0,4 se situe entre l\'an 1 et l\'an 2 (moyenne des deux premières années ≈ 0,38) : choix de modélisation, car E4 applique m dès l\'année 1 puis l\'estompe ; cotisations salariés §4.1.4 p. 110 : +0,38 an 1. Recoupement : Banque de France, WP 750 (FR-BDF, PDF primaire lu directement, Tableau 15 p. 36) : hausse de 1 pt de PIB des cotisations employeurs = −0,04 % de PIB an 1, −0,25 an 2, −0,57 an 3, −0,84 an 4. Coenen et al. (2012) : chiffre de première année non relu dans la source primaire, retiré (docs/review-day0-parameters.md §5)', 'sourcé (fourchette), centre choisi',
    'Effet du coût du travail à court terme : 0,4, entre la première (0,20) et la deuxième année (0,55) de la variante Mésange sur les cotisations employeurs (choix d\'une moyenne sur deux ans).'),
  p('dem.m.is', 0.2, 0.1, 0.4, 'multiplicateur', 'Coenen et al. (2012, AEJ: Macro, 7 modèles institutionnels, lu via synthèse) : impôt sur les sociétés = 0,24 an 1 ; Gechert et Rannenberg (2018, JES, synthèse) : multiplicateur de demande le plus faible parmi les instruments fiscaux ; Insee / DG Trésor, Mésange G2017/04 (note 77 p. 105, lu directement) : les marges des entreprises n\'entrent pas directement dans l\'investissement de court terme (docs/review-day0-parameters.md)', 'sourcé (secondaire)',
    'Effet de court terme de l\'impôt sur les bénéfices : faible la première année (Coenen et al. : 0,24).'),
  p('comp.theta.ir', 0.15, 0.07, 0.39, 'part', 'Dérivation par tranche (docs/review-day0-parameters.md §9) pour +1 pt sur tous les taux du barème : θ = Σ_i (Z_i / B) × e_i × τ_i / (1 − τ_i), Z_i revenu imposable des foyers de taux marginal i, B assiette de la hausse (revenu au-delà du seuil de 11 %), τ_i coin marginal complet (IR × (1 − 6,8 % de CSG déductible) + 9,7 % CSG/CRDS + CEHR 3–4 % en tranche 45 %). Données : DGFiP, foyers et impôt net par taux marginal, revenus 2024 (tableur nid_25519 lu directement : 20,9 M / 6,9 M / 434 112 / 61 476 foyers à 11/30/41/45 %) ; revenus estimés par inversion du barème (hypothèse de parts). Élasticités : Lehmann, Marical et Rioux (2013, JPubE, résumé lu) ≈ 0,2 ; Cabannes, Houdré et Landais (2014, Économie et Statistique n° 467-468, PDF lu directement, Tableaux 3–4 pp. 155–156) : 0,02 ensemble, 0,31 dernier décile (variantes 0,15 et 0,45, p. 157) ; Neisser (2021, Tableau 8, lu directement) : après déductions moyenne 0,390 ; Piketty, Saez et Stantcheva (2014, AEJ: Policy, lu directement) : 0,5 pour le centile supérieur, dont ≤ 0,2 d\'offre réelle. Résultat : 0,21 (bas 0,07, haut 0,39 ; variante Cabannes et al. seuls 0,15 ; coin IR seul 0,14). Centre 0,15 conservé (décision de Patrick du 24 nov. 2026). Pour le levier du moteur (hausse proportionnelle du barème), les mêmes données donnent 0,37 (0,15–0,66) : 0,15 est prudent (question aux relecteurs). θ_non_réel = 0,048 quand σ est actif', 'sourcé (fourchette), centre choisi',
    'Part du rendement de l\'IR perdue parce que les contribuables s\'adaptent. Calcul tranche par tranche : 0,21 (0,07 à 0,39) pour +1 point sur tous les taux, car les tranches hautes, où le coin fiscal complet (IR + CSG) est le plus élevé, pèsent davantage ; centre prudent 0,15, ramené à 0,048 en part non réelle quand l\'effet d\'offre E5 est actif.'),
  p('comp.theta.csg', 0.03, 0.01, 0.05, 'part', 'Formule 3.2 (θ = e × τ / (1 − τ) à τ0 = 9,2 %, soit τ/(1−τ) = 0,101) ; Neisser (IZA DP 11958 / Economic Journal 2021, PDF primaire lu directement, Tableau 8 p. 55 imprimée, 852 estimations avant déductions / assiette large, 38 études) : médiane e = 0,203, moyenne 0,296 (salaires : 0,138–0,211), soit θ = 0,014–0,030. Centre recalibré à 0,03 par décision de Patrick du 24 nov. 2026 ; fourchette resserrée à 0,01–0,05 (approuvée le 24 nov. 2026 : 0,014–0,030 avec une marge ; l\'ancienne borne 0,20 n\'avait pas de source). Avec σ actif, θ_réel (E5, cas central, +1 pt) = 0,049 > θ = 0,034 au taux après réforme : θ_non_réel est bloqué à 0 (cas bas : 0,068 → 0 ; cas haut : 0,025 → 0,009) (docs/review-day0-parameters.md)', 'sourcé (fourchette), centre choisi',
    'Part du rendement de la CSG perdue par réaction comportementale (0,03 sur assiette large au taux de 9,2 %, d\'après Neisser 2021). Quand l\'effet d\'offre E5 est actif, sa part réelle (0,049 au cas central) dépasse déjà 0,03 : la part non réelle restante est bloquée à 0, et tout l\'effet passe par l\'offre et les stabilisateurs.'),
  p('comp.theta.cotis', 0.15, 0.05, 0.30, 'part', 'Source indirecte : Bozio, Breda et Grenet (IZA DP 12502 / Review of Economic Studies, PDF primaire lu directement, pp. 5 et 27–28) mesurent la répercussion des cotisations employeurs sur les salaires, pas une perte de recettes : sans lien contributif fort, répercussion de 6 et 21 % (deux réformes françaises, non significatives) et 15 % en moyenne sur 11 estimations de la littérature (contre 103 % sur 7 estimations avec lien fort, 21 estimations au total) ; le coin pèse donc sur le coût du travail et l\'emploi. Insee / DG Trésor, Mésange G2017/04 (§4.1.3 pp. 107–108, lu directement) : solde primaire an 1 = −0,72 pt pour 1 pt de PIB ex ante (retour de 28 %). Centre 0,15 choisi : à τ0 = 36,4 %, θ = 0,15 correspond à e ≈ 0,26 (ramené à θ_non_réel = 0,050 quand σ est actif ; docs/review-day0-parameters.md)', 'sourcé (fourchette), centre choisi',
    'Part du rendement des cotisations employeurs perdue via l\'emploi et les salaires. Source indirecte : l\'étude citée mesure la répercussion sur les salaires (faible hors lien contributif), non la perte de recettes ; centre 0,15 choisi, ramené à 0,050 en part non réelle avec E5.'),
  p('comp.theta.tva', 0.03, 0, 0.08, 'part', 'Commission européenne, VAT Gap in Europe 2025 (données 2023, lu via synthèse) : écart de conformité TVA France = 5,6 % de la TVA théorique (12,1 Md€ ; 5,1 % en 2022), qui borne par le haut la fuite marginale lors d\'une hausse de taux ; centre 0,03 (0–0,08) : choix prudent (docs/review-day0-parameters.md)', 'sourcé (secondaire)',
    'Fraude et achats transfrontaliers.'),
  p('comp.theta.is', 0.25, 0.20, 0.38, 'part', 'Formule 3.2 (θ = η × τ à τ = 25 %) ; Beer, de Mooij et Liu (2020, Journal of Economic Surveys 34(3), pp. 660–688, méta-analyse internationale, lu via synthèse) : semi-élasticité des bénéfices déclarés η ≈ 1,0 à 1,5 (soit θ = 0,25 au centre et 0,375 ≈ 0,38 en borne haute ; bas 0,20 pour η = 0,8) (docs/review-day0-parameters.md)', 'sourcé (secondaire)',
    'Bénéfices déplacés vers d\'autres pays.'),
  p('offre.sigma.defaut', 0, null, null, 'part du PIB par % de PIB de levier', 'Décision D2 ; revue de preuves en cours (docs/brief-supply-effects.md)', 'non validé',
    'Effet durable sur le niveau du PIB ; non nul seulement si les preuves le justifient, sur une ligne distincte avec fourchette.'),
  p('comp.offset.prestations', 0.20, 0, 0.3, 'part', 'Section 2, E3 ; Institut des politiques publiques (IPP), Note n° 129 (sept. 2026, Aubert, Duchesne, Tochev et Tô, modèle TAXIPP, lu via synthèse) : un gel des pensions de base économise 6,6 Md€ bruts mais 5,2 Md€ nets toutes APU, soit un effet de retour mécanique de 21,2 % (1,4 / 6,6) par baisse de l\'IR et de la CSG sur les pensions et hausse des aides sous conditions de ressources (ASPA, APL). Centre calibré à 0,20 par décision de Patrick du 24 nov. 2026 (indexation_pensions et NDC_MODULE ont σ = 0 ; simplification comptable : le retour est imputé au bloc sécurité sociale ; docs/review-day0-parameters.md)', 'sourcé (secondaire)',
    'Part de l\'économie sur une prestation (indexation des pensions, module NDC) annulée par des pertes d\'IR/CSG et des hausses d\'ASPA/APL : 20 % par défaut (d\'après la Note IPP n° 129 de sept. 2026 mesurant 21,2 % de retour mécanique).'),
  p('comp.offset.age_legal', 0.20, 0.15, 0.33, 'part', 'DREES / DARES (janv. 2022), cité dans Cour des comptes, « Situation financière et perspectives du système de retraites », 20 févr. 2025, p. 67 et note 123 (PDF primaire 297428.pdf lu directement) ; recoupé par Rabaté et Rochut (2020, J. Pension Economics & Finance, lu via résumé). Ventilation : 52 % Unédic (ARE/AREF), 36 % indemnités journalières maladie, 12 % minima sociaux (RSA/ASS), 0 % invalidité/AAH (l\'âge d\'ouverture invalidité reste à 62 ans) ; COR, Rapport annuel juin 2026, partie 2, chapitre 6, pp. 119–120, citant Drees/Dares (séance COR de janvier 2022) : « près d\'un tiers des économies réalisées sur les dépenses de retraite grâce à un recul de l\'âge d\'ouverture des droits serait compensé à court terme par une hausse des dépenses sociales hors retraite ». Centre 0,20 : estimation stabilisée Cour des comptes / Drees-Dares sur la réforme de 2010 ; bas 0,15 : incertitude à la marge 64–65 ans ; haut 0,33 : effet de court terme selon le COR (décision de Patrick, 23 nov. 2026 ; docs/review-age-legal.md)', 'sourcé',
    'Part des économies (ou surcoûts) brutes de pensions d\'une variation de l\'âge légal compensée par des effets de report vers d\'autres prestations sociales (chômage 52 %, maladie 36 %, minima sociaux 12 %, invalidité 0 % tant que son seuil reste à 62 ans). Le centre (0,20) est l\'estimation stabilisée sur la réforme de 2010 ; le haut (0,33, « près d\'un tiers ») correspond à l\'effet de court terme cité par le COR. Appliquée dans E3 au seul levier age_legal.'),
  p('fisc.eps', 0.6, 0.5, 0.65, 'point de PIB par point d\'écart', 'Commission européenne (DG ECFIN), Mourre, Poissonnier et Lausegger (mai 2019), European Economy Discussion Paper 098, PDF primaire dp098_en.pdf lu directement : semi-élasticité du solde public de la France = 0,630 (Tableau I.3 p. 41 : recettes +0,004, dépenses −0,626 ; précédente estimation 2014 : 0,603, Tableau IV.3 p. 49 ; sensibilité par pondérations : 0,60–0,63, Tableau V.1 p. 50 ; moyenne UE 0,50, p. 16). Centre 0,60 conservé dans la fourchette 0,50–0,65 (docs/review-day0-parameters.md)', 'sourcé (fourchette), centre choisi',
    'Quand le PIB baisse de 1 %, le solde se dégrade d\'environ 0,6 point (estimation Commission européenne 2019 pour la France : 0,60–0,63).'),
  p('fisc.eps_offre', 0.436, 0.436, 0.522, 'point de PIB par point d\'écart d\'offre', 'Insee, taux de prélèvements obligatoires 2025 : 43,6 % du PIB (comptes nationaux, provisoire, publié le 28/08/2026) ; haut : recettes APU / PIB = (1 714,2 − 152,5) / 2 991 ≈ 0,522 (docs/baseline-data.md)', 'sourcé',
    'Quand le PIB baisse durablement par l\'offre (moins de travail ou de capital), les recettes proportionnelles au PIB baissent, mais aucune dépense cyclique ne se déclenche : le solde se dégrade du taux de prélèvements obligatoires, soit environ 0,44 point par point de PIB.'),
  p('dette.M', 8.45, 8, 9, 'années', 'AFT, bulletin mensuel d\'août 2026 : 8 ans 163 jours [S12]', 'sourcé',
    'Durée moyenne avant qu\'un emprunt soit renouvelé.'),
  // Taux à l'émission : moyenne pondérée de trois classes (remplace l'ancien i* unique = TEC 10 ans, qui surestimait le coût des BTF).
  // Parts : encours de dette négociable fin juillet 2026 pour les BTF (220 / 2 882 Md€ = 7,6 %, AFT bulletin d'août 2026 p. 3) ;
  // le reste réparti selon l'émission brute d'OAT de janvier à juillet 2026 (AFT, bulletin d'août 2026, p. 2) : 2–8 ans 107,3 Md€, 10 ans et plus 125,2 Md€
  // (la ligne non étiquetée de 12,1 Md€, probablement indexée, est répartie au prorata). Choix : part du STOCK pour les BTF, car E10 renouvelle une fraction
  // du stock ; le flux brut de BTF (renouvelés plusieurs fois par an) donnerait un poids trompeur.
  p('dette.part_btf', 220 / 2882, null, null, 'part', 'AFT, bulletin mensuel d\'août 2026, p. 3 : BTF 220 Md€ sur 2 882 Md€ de dette négociable (31 juillet 2026) ; calcul. Part du stock, non du flux brut d\'émission', 'sourcé',
    'Part des bons du Trésor à court terme (BTF) dans les émissions servant à renouveler la dette.'),
  p('dette.part_moyen', (1 - 220 / 2882) * 107.3 / (107.3 + 125.2), null, null, 'part', 'AFT, bulletin d\'août 2026, p. 2 : émission brute d\'OAT janv.–juil. 2026, maturités 2 à 8 ans = 3,7 + 38,9 + 46,1 + 18,6 = 107,3 Md€ sur 232,5 ; calcul', 'sourcé',
    'Part des OAT de 2 à 8 ans (échéances intermédiaires) dans les émissions de renouvellement.'),
  p('dette.part_long', (1 - 220 / 2882) * 125.2 / (107.3 + 125.2), null, null, 'part', 'AFT, bulletin d\'août 2026, p. 2 : 10 ans 79,6 + 15–25 ans 33,4 + 30–50 ans 12,2 = 125,2 Md€ sur 232,5 ; calcul', 'sourcé',
    'Part des OAT de 10 ans et plus dans les émissions de renouvellement.'),
  p('dette.y_btf', 2.79, 2.5, 3.0, '%', 'AFT, « Dernières adjudications », BTF 3 mois adjugé le 26 octobre 2026 (échéance 3 février 2027) : taux moyen pondéré 2,787 % (https://www.aft.gouv.fr/en/dernieres-adjudications). Rendement d\'adjudication d\'un jour, non une moyenne mensuelle ; 6 mois 3,025–3,104 %, 12 mois 3,365 % au même jour', 'sourcé',
    'Rendement des bons du Trésor à court terme (BTF 3 mois), dernier relevé de l\'AFT. Bas/haut : choix de l\'implémentation autour du point (la moyenne 2025 était de 2,15 %, les 6 et 12 mois sont plus hauts).'),
  p('dette.y_moyen', 4.1, 4.0, 4.4, '%', 'AFT, « Dernières adjudications », OAT adjugées le 15 octobre 2026 : 25/02/2031 4,01 % ; 25/11/2031 4,10 % (≈ 5,1 ans, retenu comme proxy du 5 ans) ; 25/02/2032 4,16 % ; 25/11/2033 4,41 % (https://www.aft.gouv.fr/en/dernieres-adjudications). Aucun rendement à 5 ans exact ni moyenne mensuelle trouvés. Bas/haut = fourchette des lignes 2031–2033', 'sourcé',
    'Rendement des OAT de 2 à 8 ans : taux d\'adjudication de la ligne novembre 2031 (≈ 5 ans), 15 octobre 2026. Ce n\'est pas un rendement à exactement 5 ans.'),
  p('dette.y_long', 4.86, 4.4, 5.3, '%', 'Abcbourse, adjudication de long terme du 5 novembre 2026 (presse financière, secondaire ; https://www.abcbourse.com/marches/la-france-emet-pour-12-milliards-d-euros-d-oat-a-long-terme-avec-des-taux-globa_705679) : OAT 25/11/2036 4,74 % ; 25/10/2038 4,89 % ; 25/05/2045 5,08 % ; 25/05/2057 5,27 %. Moyenne pondérée par l\'émission brute AFT janv.–juil. 2026 (10 ans 79,6 ; 15–25 ans 33,4 ; 30–50 ans 12,2 Md€) avec 15–25 ans = moyenne 2038 et 2045 (4,985 %) et 30–50 ans = ligne 2057 : calcul. Moyenne mensuelle BCE/Banque de France du 10 ans, septembre 2026 : 4,44 % (relayée par eco3min.fr, secondaire). AFT : TEC 10 4,08 % le 18 août 2026 (bulletin d\'août 2026, p. 4). Non relu sur le site de l\'AFT', 'sourcé (secondaire)',
    'Rendement des OAT de 10 ans et plus, d\'après l\'adjudication de long terme du 5 novembre 2026 (dont 30 ans : 5,27 %). Source secondaire (presse financière) : à reprendre sur la page de l\'AFT. Un jour d\'adjudication, non une moyenne mensuelle.'),
  cmp('cmp.aft.taux_emission.2025', 2.73, '%', 'AFT, rapport annuel 2025, p. 5, 24, 29 (ensemble des émissions de dette à moyen et long terme ; titres à taux fixe de plus d\'un an, hors indexés : 3,14 %)', 'Taux moyen à l\'émission 2025 publié par l\'AFT (contrôle croisé : le taux pondéré du modèle doit être cohérent avec ce niveau, plus élevé en 2026 car les rendements ont monté).'),
  p('cmp.aft.taux_emission.2026', 3.5, null, null, '%', 'Non publié officiellement en année pleine (site AFT protégé ; rapport annuel 2026 attendu en 2027). Estimations financières secondaires en cours d\'année 2026 : taux moyen pondéré OAT MLT autour de 3,47–3,6 % (docs/review-day0-parameters.md)', 'à collecter',
    PLACEHOLDER + 'taux moyen à l\'émission 2026 de l\'AFT non encore publié en année pleine (repères secondaires en cours d\'année ≈ 3,47–3,6 % ; affichage seul, jamais utilisé dans le calcul).'),
  p('dette.i_moy_2025', 1.9, null, null, '%', 'Cour des comptes : 65,7 Md€ en 2025, 2,2 % du PIB [S14] ; calcul : 64,7 / moyenne (3 306,1 ; 3 460,5)', 'sourcé',
    'Taux moyen payé sur toute la dette.'),
  // β : sourcé en fourchette seulement. Lu (pages récupérées le 18 nov. 2026) : Banque de France WP 494 ; résumé de Laubach (2009) sur le site de la Fed.
  // Non lu faute d'accès : le coefficient de la dette de Laubach (2009), Attinasi et al., Gruber et Kamin, Ardagna et al., Baldacci et Kumar, le DSM.
  p('dette.beta', 3, 1, 5, 'pb par point de PIB de dette',
    'Fourchette : Bortoli, Harreau et Pouvelle, Banque de France, Working Paper n° 494 (juin 2014), « Determinants of OECD countries\' sovereign yields », 22 pays de l\'OCDE, janv. 1999 – déc. 2013, écart du rendement à 10 ans sur le taux de swap, dette/PIB : 0,5 pb par point (tableau 3, modèle de base, non significatif) ; 1,3 pb (variante macro, significatif à 10 %) ; long terme PMG 0,7 pb (tableau 8 ; « 10 points de dette = 7 pb ») ; court terme PMG 4,5 pb ; zone euro après Lehman : −1,7 pb, non significatif (tableau 6) ; aucun seuil ni test de non-linéarité. '
    + 'Laubach (2009, Journal of the European Economic Association 7(4), 858-885 ; Fed, FEDS 2003-12), États-Unis, projections CBO/OMB : +1 point de déficit projeté/PIB = environ +25 pb sur les taux longs (résumé lu sur le site de la Fed) ; le résumé publié de l\'article donne 3 à 4 pb par point de dette projetée/PIB (la version de travail de 2003 : 4 à 5 pb). '
    + 'Kirpson et Staehr (Banque d\'Estonie, WP 2025-06), zone euro, panel annuel 1999–2024, effets fixes et variables instrumentales : +1 point de dette/PIB ≈ +3 pb sur le taux de la dette publique (résumé lu). Fed, FEDS 2026-031 (États-Unis, étude d\'événement) : 1 à 2 pb sur le taux neutre et 2 à 3 pb sur la prime de terme à 10 ans (résumé lu). '
    + 'Centre 3 : estimation de zone euro de Kirpson et Staehr, bas de Laubach ; bas 1 (≈ long terme de la Banque de France, 0,7), haut 5 (≈ court terme de la Banque de France, 4,5 ; Laubach 2003, 4 à 5). '
    + 'Ancre : la prime se mesure par rapport au ratio dette/PIB de 2026 (t = 0), année où le taux d\'émission i* est observé : c\'est une convention du modèle, non une norme de la littérature (qui estime un effet de niveau, linéaire, sur le taux). '
    + 'Limites : la Banque de France ne trouve pas d\'effet significatif dans la zone euro après 2008 (β = 0 est donc plausible) ; les estimations portent sur des ratios de 40 à 200 % du PIB, le modèle prolonge la pente linéairement jusqu\'à 300-900 % sur 30 ans.',
    'sourcé (fourchette), centre choisi',
    'Hausse du taux d\'émission quand la dette dépasse son niveau de 2026 : 3 points de base par point de PIB au centre (1 à 5). Hypothèse du modèle : les estimations empiriques sont dispersées et faibles pour la zone euro ; cette pente décide du chemin de dette à 30 ans (voir la note de modèle, E9).'),
  p('emploi.kappa', 0.4, 0.3, 0.5, 'point de chômage par % de PIB', 'Ball, Leigh et Loungani (2017, Journal of Money, Credit and Banking 49(7), « Okun\'s Law: Fit at 50? », lu via synthèses académiques) : coefficient d\'Okun estimé pour la France = −0,37 (arrondi à 0,4 au centre, fourchette 0,3–0,5 ; docs/review-day0-parameters.md)', 'sourcé (secondaire)',
    '1 % de PIB en moins : 0,4 point de chômage en plus (Ball, Leigh et Loungani 2017 : 0,37 pour la France).'),
  // ref.derive (D7)
  p('ref.derive.a_retraites', COR, { ...COR, 2070: 14.5 }, { ...COR, 2070: 16.1 }, '% du PIB, par année', 'COR, rapport annuel de juin 2026 [S23] ; 2040 et 2050 non trouvés : interpolation linéaire', 'sourcé',
    'Dépenses de retraites à droit en vigueur ; le vieillissement est l\'écart avec 2025. Bas/haut : productivité 1,0 % / 0,4 % en 2070 (2045 inchangé).'),
  p('ref.derive.a_sante', 0.3 / 48, 0, 1.0 / 48, 'points de PIB par an', 'Commission européenne, 2024 Ageing Report, Institutional Paper 279, tableau 5 (p. 12) et tableau 1 (p. 5), scénario de référence : dépense publique de santé de la France 8,8 % du PIB en 2022, +0,3 pt d\'ici 2070 (≈ 9,1 %), soit 0,3 / 48 ans ; soins de longue durée 1,9 % (+0,7 pt). Lu sur une copie du document (mefop.it), non sur le site de la Commission ; fiche France (partie III, p. 273) non lue. Haut = santé + longue durée (+1,0 pt / 48 ans). Bas = 0 : absence de dérive (choix, non publié). Estimation plus ancienne : DG Trésor, Cahiers n° 2009-11, effet du vieillissement ≈ 1,5 pt d\'ici 2050 (0,6 à 2,3)', 'sourcé (secondaire)',
    'Dérive annuelle de la dépense publique de santé due au vieillissement, en points de PIB par an (linéaire, scénario de référence de la Commission, hors soins de longue durée). Hypothèse de coûts unitaires de la Commission : le haut de la fourchette ajoute la longue durée, et les estimations françaises plus anciennes sont plus élevées. Pas de double comptage dans le moteur : les retraites (COR) et les autres dépenses (ref.derive.b_autres, à 0 pour l\'instant) ne portent pas la longue durée ; si b_autres devient non nul, il devra l\'exclure tant que le haut de cette fourchette l\'inclut.'),
  p('ref.derive.b_autres', 0, 0, 0.11, 'points de PIB par an', 'Calcul sur séries officielles Eurostat (gov_10a_exp, gov_10a_main, nama_10_gdp, France S13, 1995–2024, API lue le 24 nov. 2026 ; docs/review-day0-parameters.md) : dépense primaire hors vieillissement (TOTAL − intérêts D41 − santé GF07 − vieillesse GF1002 = 34,7 % PIB en 1995, 32,2 % en 2000, 33,1 % en 2011, 32,3 % en 2019, 32,7 % en 2024). En part de PIB observé : −0,07 pt/an (1995–2024) à +0,02 pt/an (2000–2024). En volume (déflaté prix du PIB) face à g_pot = 1,0 % : +1,01 %/an sur 2011–2024 (≈ 0,00 pt/an, bas) à +1,34 %/an sur 1995–2024 (≈ +0,11 pt/an, haut). Valeur centrale 0 à valider par le propriétaire au regard de la règle D7', 'à valider',
    'Dérive annuelle des dépenses primaires hors vieillissement (retraites et santé déjà dans dA) : tenue à 0 au centre (à valider), fourchette sourcée Eurostat 1995–2024 de 0 à +0,11 point de PIB par an face à une croissance potentielle de 1,0 %.'),
  p('ref.spb_2026', -2.8, -2.9, -2.7, '% du PIB', 'Calcul : solde −5,4 % + intérêts 2,6 % du RESF 2027 [S17] ; soldes par bloc 2026 non trouvés', 'sourcé',
    'Solde primaire de 2026 en point de départ (le solde hors intérêts, avant toute mesure nouvelle).'),
]

// ---------- 4bis. Effets d'offre (E5, note de modèle) : σ par mesure, délai de montée en charge L et délai de grâce t0 ----------
// σ : effet de long terme sur le niveau du PIB, en % du PIB par unité du levier (voir src/engine/supply.js).
// Valeurs : revue de preuves Gemini (docs/review-supply-effects-gemini.md), après les corrections et les décisions de Patrick du 17 novembre 2026.
// Les études citées par Gemini n'ont été lues que sur résumé ou synthèse ; les sources de 2026 ne sont pas vérifiées.
const GEM = 'Revue de preuves Gemini (docs/review-supply-effects-gemini.md, 17 nov. 2026 ; études lues sur résumé ou synthèse seulement)'
const LAG_SRC = `${GEM} : délai de montée en charge proposé par Gemini, non vérifié`
const lag = (id, v, lib) => p(`offre.lag.${id}`, v, v, v, 'années', LAG_SRC, 'non validé',
  `Nombre d'années après l'entrée en vigueur de la mesure pour atteindre l'effet d'offre complet (${lib}).`)
const t0 = (id, v, lib) => p(`offre.t0.${id}`, v, v, v, 'années', LAG_SRC, 'non validé',
  `Délai de grâce avant que l'effet d'offre ne démarre (${lib}).`)

// Éducation : Gemini donne 0 / +0,8 / +2,5 % du PIB par point de PIB de dépense ; Patrick retient 0 / 0 / +0,8.
// Conversion en % du PIB par % de la ligne : 1 % de la ligne = 149/100 Md€ (COFOG 2024, base.cofog.enseignement) ; 1 point de PIB = 2 991/100 Md€ (base.pib.2025).
const SIGMA_ENS_HAUT = 0.8 * (149 / 100) / (2991 / 100)

const offre = [
  p('offre.sigma.enseignement', 0, 0, SIGMA_ENS_HAUT, '% du PIB (niveau) par % de la ligne', `${GEM}, n° 9 ; Bénabou, Kramarz et Prost (2009) ; DEPP 2026 (non vérifié) ; Jackson, Johnson et Persico (2016). Gemini : 0 / +0,8 / +2,5 par point de PIB de dépense ; fourchette retenue par Patrick (17 nov.) : 0 / 0 / +0,8. Conversion : 0,8 × 1,49 / 29,91 = 0,0399`, 'sourcé (fourchette), centre choisi',
    'Effet de long terme sur le niveau du PIB d\'une hausse de 1 % de la ligne « enseignement » (capital humain), symétrique pour une baisse. Le centre est nul parce que le levier n\'est pas ciblé (variation uniforme de la dépense) et que les évaluations françaises ne montrent pas d\'effet durable ; le haut suppose une dépense bien ciblée. Conversion : 1 % de la ligne = 1,49 Md€ = 0,0498 % du PIB, donc 0,8 % du PIB par point de PIB de dépense vaut 0,8 × 0,0498 = 0,040 % du PIB par % de la ligne. Effet attendu après 35 ans, à partir de 8 ans.'),
  lag('enseignement', 35, 'génération entière arrivée sur le marché du travail'), t0('enseignement', 8, 'durée de la scolarité avant les premiers effets'),
  lag('tva', 5, 'érosion de l\'avantage de coût par l\'indexation'), t0('tva', 0, 'effet dès l\'entrée en vigueur'),
  p('offre.sigma.age_legal', 0.50, 0.30, 0.70, '% du PIB (niveau) par année d\'âge légal', `DG Trésor, « Simulations pour le COR », mars 2026 (COR, séance du 26 mars 2026, document n° 3, Tableau 4, méthode comptable, AOD 64 → 65 ans avec montée en charge immédiate et complète) : PIB +0,5 % à 2 et 5 ans, +0,6 % à 10 ans, +0,7 % à « 20 ans » (simulé à 18 ans) ; emploi +142 000, +198 000, +210 000 ; solde APU +0,4 / +0,5 pt de PIB ; hypothèses : élasticité unitaire du PIB à l'emploi, productivité des seniors égale à la moyenne, statuts d'activité figés (pas d'effet sur le chômage), donc estimation haute ; Mésange jugé inadapté à un décalage de l'AOD. COR, Rapport annuel juin 2026, partie 2, chapitre 6, Tableau 2.10 p. 123 (DG Trésor, I-MIP CepreHANK, OFCE EmeRaude) : PIB +0,1 à +0,5 % à 2 ans, +0,5 à +0,7 % à 10 ans, +0,1 à +0,8 % à 20 ans ; emploi +160 000 à +250 000 à 10 ans, +200 000 à +240 000 à 20 ans ; solde primaire APU +0,3 à +0,6 pt à 10 ans, +0,3 à +0,65 pt à 20 ans (le texte pp. 122–123 indique +0,7 à +0,9 point de PIB à long terme : incohérence relevée entre texte et tableau). Centre +0,50 : bas de la fourchette des modèles à 10 ans, pour tenir compte d'une productivité et d'une durée du travail des seniors inférieures à la moyenne (choix) ; haut +0,70 : méthode comptable DG Trésor à 20 ans ; bas +0,30 : substitution et bas de la fourchette à 20 ans. Décision de Patrick du 23 nov. 2026 (remplace +0,15 / +0,30 / +0,50 du 17 nov.) ; voir aussi Cour des comptes, 20 févr. 2025, pp. 66–68 ; ${GEM}, n° 1 ; docs/review-age-legal.md`, 'sourcé (fourchette), centre choisi',
    'Effet de long terme sur le niveau du PIB d\'un relèvement d\'un an de l\'âge légal de départ en retraite, via l\'emploi des seniors. Le centre (+0,50) se situe au bas de la fourchette des modèles du COR à 10 ans (+0,5 à +0,7 %), car les simulations supposent une productivité des seniors égale à la moyenne et aucun effet sur le chômage ; le taux d\'emploi chute entre 60 et 65 ans (40 % pour les 60–64 ans contre 77 % pour les 55–59 ans, Cour des comptes p. 66). Dans E7, ε_offre = 43,6 % (tous prélèvements obligatoires) capte déjà 100 % du retour fiscal y compris les cotisations retraites (~20,5 %), exclues de rend.age_legal.* pour éviter tout double compte (docs/review-age-legal.md).'),
  p('offre.emplois_par_pt_pib.age_legal', 315000, 300000, 330000, 'emplois par point de PIB (niveau)', 'Calcul sur DG Trésor, « Simulations pour le COR », mars 2026 (COR, séance du 26 mars 2026, document n° 3, Tableau 4, méthode comptable, AOD 64 → 65 ans) : +198 000 emplois pour un PIB +0,6 % à 10 ans, soit ≈ 330 000 emplois par point de PIB ; +210 000 emplois pour +0,7 % à « 20 ans », soit 300 000. Centre 315 000 : milieu des deux ratios (choix). Ce ratio reflète l\'hypothèse d\'élasticité unitaire du PIB à l\'emploi de la DG Trésor (1 % d\'emplois en plus = 1 % de PIB en plus, productivité des seniors égale à la moyenne), donc ≈ 1 % de l\'emploi total. Le catalogue ne contient pas de paramètre d\'emploi total (base.emploi*) : la conversion est tirée du même document que offre.sigma.age_legal pour rester cohérente avec lui', 'sourcé (calcul)',
    'Nombre d\'emplois correspondant à 1 % de PIB pour le relèvement de l\'âge légal, déduit des simulations de la DG Trésor pour le COR (emplois / effet sur le PIB). Sert uniquement à l\'affichage : emplois implicites = σ (offre.sigma.age_legal, cas choisi) × années d\'âge légal × ce ratio ; il n\'entre pas dans le calcul du solde. Hypothèse d\'élasticité unitaire du PIB à l\'emploi : si les seniors ajoutés sont moins productifs que la moyenne, un même effet sur le PIB suppose davantage d\'emplois.'),
  lag('age_legal', 6, 'montée en charge des cohortes concernées'), t0('age_legal', 0, 'effet dès l\'entrée en vigueur'),
  p('offre.sigma.lvt', 0.20, 0.10, 0.45, '% du PIB (niveau), remplacement complet', `${GEM}, n° 15 (Gemini : +0,10 / +0,30 / +0,60 pour le remplacement des DMTO et de la taxe foncière) ; Patrick (17 nov.) : taxe foncière seule, sans les DMTO, +0,10 / +0,20 / +0,45`, 'sourcé (fourchette), centre choisi',
    'Effet de long terme sur le niveau du PIB du remplacement intégral de la taxe foncière par une taxe sur la valeur du sol, à rendement égal et sans toucher aux droits de mutation. Paramètre destiné au module LVT. La moitié haute de la fourchette suppose un assouplissement des règles d\'urbanisme.'),
  lag('lvt', 12, 'ajustement du bâti et de l\'usage des sols ; calibré pour offre.sigma.lvt, que le module LVT ne lit pas : le module ne reprend que ce délai pour la borne OCDE de son cas haut'),
  t0('lvt', 1, 'effet à partir de la deuxième année ; calibré pour offre.sigma.lvt, non lu par le module LVT, qui ne reprend que ce délai'),
  p('offre.sigma.assurance_chomage', -0.012, -0.005, -0.022, '% du PIB (niveau) par % de la ligne (plus de générosité)', `${GEM}, n° 10 ; Le Barbanchon, Rathelot et Roulet (2019) ; Le Bihan et Fabre (2026, non vérifié). Gemini : +0,05 / +0,12 / +0,22 par resserrement de 10 % ; divisé par 10 et de signe opposé pour 1 % de générosité en plus`, 'sourcé (fourchette), centre choisi',
    'Effet de long terme sur le niveau du PIB de 1 % de générosité en plus de l\'assurance chômage (durée ou taux de remplacement) : −0,012 au centre, donc +0,12 % du PIB pour un resserrement de 10 %. L\'effet passe par le retour plus rapide à l\'emploi, net de l\'effet d\'éviction entre demandeurs d\'emploi. Symétrique : un assouplissement réduit le PIB. Les cas bas / haut se lisent sur le résultat (le plus faible et le plus fort effet).'),
  lag('assurance_chomage', 3, 'retour à l\'emploi des chômeurs'), t0('assurance_chomage', 0, 'effet dès l\'entrée en vigueur'),
  // Leviers fiscaux (cotisations, CSG, TVA, IR, IS) : σ calculé à partir de offre.e_L et des paramètres de la section 4ter (supply.js), plus de paramètre offre.sigma.* propre.
  lag('ir', 5, 'IR'), t0('ir', 0, 'IR'),
  lag('is', 7, 'IS'), t0('is', 1, 'IS'),
  lag('cotis', 5, 'cotisations'), t0('cotis', 0, 'cotisations'),
  lag('csg', 5, 'CSG ; valeur par défaut empruntée aux autres impôts, sans source propre'), t0('csg', 0, 'CSG'),
]

// ---------- 4ter. Effets d'offre des impôts : élasticité e_L, coin fiscal, coût d'usage du capital (docs/sigma-fiscal.md, décisions de Patrick du 18 nov. 2026) ----------
// σ de chaque levier fiscal est CALCULÉ dans supply.js à partir de ces paramètres (jamais écrit en dur) :
//   travail (cotisations, CSG, TVA, IR) : σ = −e_L × |Δ ln(1 − T)|  ; IS : σ = −α × ε_K × Δc/c.
const SF = 'docs/sigma-fiscal.md (v2, approuvé le 18 nov. 2026)'
const offreFiscal = [
  p('offre.e_L', 0.40, 0.20, 0.55, 'élasticité (sans unité)', `Chetty, Guren, Manoli et Weber (2011, AER Papers & Proceedings 101(3)) : élasticité hicksienne des heures agrégées 0,51 à 0,56 ; Davis et Henrekson (2004, NBER WP 10509) : 0,34 à 0,44 (calcul) ; CBO, Dynamic Scoring (substitution 0,24, revenu −0,05) ; ${SF}, section 2`, 'sourcé (fourchette), centre choisi',
    'Élasticité compensée de l\'offre de travail au coin fiscal : une hausse de 1 % de ce que le salarié garde par euro de coût du travail (1 − T) fait varier le travail, donc le PIB de long terme, de e_L %. Fourchette : le bas reste au-dessus du chiffre du CBO (élasticité compensée) ; le haut est le chiffre hicksien de Chetty et al. Aucune estimation française retenue pour l\'instant.'),
  p('comp.coin.part_nette', 0.57, null, null, 'part du salaire brut', 'OCDE, Taxing Wages 2026, tableau 3.7 : taux marginal IR + cotisations salariales au salaire moyen 43,0 % ; calcul : 1 − 0,430', 'sourcé (calcul)',
    'Part de chaque euro de salaire brut qui reste au salarié moyen après l\'impôt sur le revenu et les cotisations salariales (CSG comprise). Sert de dénominateur pour convertir une variation d\'impôt en variation de ce que le salarié garde. Les cotisations patronales (comp.tau0.cotis) s\'ajoutent au coût du travail.'),
  p('offre.is.z', 0.742, null, null, 'valeur actuelle (sans unité)', 'Tax Foundation, Capital Allowances in Europe 2025 : moyenne pondérée France (bâtiments 54,8 %, machines 88,0 %, incorporels 87,0 % ; actualisation 7,5 %)', 'sourcé',
    'Valeur actuelle des amortissements déductibles par euro investi : plus elle est haute, moins l\'impôt sur les sociétés pèse sur le coût du capital.'),
  p('offre.is.alpha', 0.18, 0.16, 0.21, 'part du PIB', 'Insee, comptes nationaux 2025 : 0,16 = sociétés non financières seules (taux de marge 31,4 % appliqué à leur valeur ajoutée, mon estimation) ; 0,21 = EBE et revenu mixte des sociétés et entrepreneurs non financiers, 630,4 Md€ sur un PIB de 2 991 Md€ ; 0,18 retenu', 'sourcé (fourchette), centre choisi',
    'Part du capital productif des sociétés dans le PIB (brute) : elle transforme une variation du coût du capital en variation du PIB.'),
  p('offre.is.eps_k', 0.5, 0.25, 1.0, 'élasticité (sans unité)', 'Bas 0,25 : Chirinko, Fazzari et Meyer (1999, Journal of Public Economics), États-Unis, micro-données, ≈ −0,25 ; Chatelain et Tiomo (2002, IFO-Studien), 6 946 entreprises manufacturières françaises 1990–1999, au plus −0,26 (résumés lus). Haut 1,0 : Dwenger (2014, Economica 81, 161–186), Allemagne, modèle à correction d\'erreur, proche de −1 (préférée −1,3 dans la version DIW 924) ; Millar et Coulibaly (Fed, 2010), Afrique du Sud, ≈ −1,0, valeur de Cobb-Douglas (résumés lus). Chirinko, Fazzari et Meyer, panel long : ≈ 0,40. Centre 0,5 : choix, entre les estimations à retards échelonnés (0,25–0,40, dont la seule française) et celles en correction d\'erreur (≈ 1).', 'sourcé (fourchette), centre choisi',
    'Élasticité du stock de capital au coût d\'usage du capital : une hausse de 1 % de ce coût réduit le capital, donc le PIB de long terme, de ε_K × α %.'),
  p('offre.is.tau_effectif', 25.8, null, null, '%', 'BOFiP, 12 août 2026 ; Legifiscal : taux normal 25 % + contribution sociale de 3,3 % (grandes entreprises) ; hors contribution exceptionnelle (temporaire). Le taux normal de 25 % reste dans comp.tau0.is', 'sourcé',
    'Taux d\'IS pris dans le calcul du coût d\'usage du capital : taux normal et contribution sociale, hors contribution exceptionnelle des plus grandes entreprises (temporaire).'),
  p('offre.is.plafond', 0.15, null, null, '% du PIB par point de taux', 'Revue de preuves Gemini (docs/review-supply-effects-gemini.md), n° 4 : 0,15 par point ; Gechert et Heimberger (2022)', 'sourcé',
    'Plafond de l\'effet d\'offre de l\'IS, en valeur absolue (le cas haut du calcul, 0,09, ne l\'atteint pas). Pas de plafond équivalent pour les impôts larges sur le travail (décision du 18 nov.).'),
  p('offre.ir.conv_brut', 0.76, null, null, 'part', 'docs/sigma-fiscal.md, section 7 : abattement de 10 % et CSG déductible (calcul)', 'calculé (estimation)',
    'Conversion du revenu imposable en salaire brut (× 0,76 environ) : le taux marginal d\'IR sur le revenu imposable vaut 0,76 fois son poids sur le salaire brut.'),
  p('offre.csg.part_deductible', 6.8 / 9.2, null, null, 'part', 'Code de la sécurité sociale : CSG de 9,2 % sur les revenus d\'activité, dont 6,8 points déductibles de l\'impôt sur le revenu', 'sourcé',
    'Part de la CSG déductible de l\'assiette de l\'impôt sur le revenu (6,8 sur 9,2) : un point de CSG en plus coûte moins cher au salarié imposé.'),
  p('offre.csg.tmi_salarie', 30, null, null, '%', 'Barème officiel de l\'impôt sur le revenu 2026 (CGI art. 197 ; service-public.gouv.fr) : tranche marginale de 30 % pour un revenu net imposable par part de 29 580 € à 84 577 €, couvrant le salarié célibataire au salaire moyen OCDE', 'sourcé',
    'Taux marginal d\'impôt sur le revenu auquel est déduite la part déductible de la CSG, pour le salarié moyen (tranche de 30 %).'),
  p('offre.csg.assiette', 0.9825, null, null, 'part', 'Code de la sécurité sociale, art. L. 136-2 : abattement de 1,75 % (assiette = 98,25 % du salaire brut)', 'sourcé',
    'Part du salaire brut qui entre dans l\'assiette de la CSG sur les revenus d\'activité.'),
  obs('base.conso_menages', 1545.9, 'Md€', 'Insee, comptes nationaux annuels 2025 (base 2020), publiés le 29 mai 2026 : dépense de consommation finale des ménages 1 545,9 Md€ (tableau « Le PIB et les opérations sur les biens et les services »)', 'Consommation finale des ménages en valeur : sert à convertir un point de TVA en variation du prix à la consommation (rendement du point / consommation).', 'sourcé'),
  obs('base.ir.2025', 92.6, 'Md€', 'DGFiP 2025 ; Vie-publique, IR 2025 (docs/sigma-fiscal.md, section 7)', 'Produit net de l\'impôt sur le revenu en 2025 : recette propre de l\'IR qui varie avec le PIB (calcul de θ non réel).'),
  p('base.tva.2025', 208.8, 200, 215, 'Md€', 'Insee, comptes nationaux annuels 2025 (base 2020), tableau « Impôts, données annuelles de 1995 à 2025 » (https://www.insee.fr/fr/statistiques/2381408 ; aussi tableau 3.217 « Principaux impôts par catégorie ») : TVA (D211) 208,8 Md€ en 2025 (provisoire), 207,8 Md€ en 2024 ; au sens des comptes nationaux, un peu inférieure à la TVA totale (la TVA sur les subventions agricoles est classée en autres impôts sur la production). Fourchette : écart entre sources (DGFiP et PLF 2026 révisé, environ 210 Md€ toutes affectations ; IFRAP, environ 206 Md€ en estimation basse ; bornes arrondies, choix)', 'sourcé',
    'TVA totale, toutes administrations (208,8 Md€) : recette propre qui varie avec le PIB (calcul de θ non réel). Si la valeur est supérieure à environ 120 Md€, θ non réel de la TVA est nul.'),
  obs('base.is.produit_etat_2026', 59.0, 'Md€', 'PLF 2026, Voies et moyens, tome I, p. 6 : IS net de l\'État 59,0 Md€ en 2026', 'Produit net de l\'IS de l\'État en 2026 : recette propre qui varie avec le PIB (calcul de θ non réel).'),
]

// ---------- 4quater. Module « taxe sur la valeur du sol » (src/engine/lvt-module.js ; docs/review-lvt-module.md, décisions D11 et D12) ----------
// Les rendements de LVTShift sont lus dans src/engine/data/lvt-yields.json (import épinglé, src/engine/lvt-snapshot.js) ;
// ici, les paramètres du mécanisme, et l'assiette foncière, lue dans le même fichier (land_base.taxable_meur).
const LVTR = 'Revue du module taxe sur la valeur du sol, 17 nov. 2026 (docs/review-lvt-module.md) [S26]'
const fmtMeur = (v) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v)
const lvt = [
  obs('lvt.base_fonciere.2025', LVT_BASE_FONCIERE.montant, `Md€ ${LVT_BASE_FONCIERE.annee}`, `yields.json de LVTShift (commit ${LVT_PROVENANCE.commit}, importé le ${LVT_PROVENANCE.importeLe}), land_base.taxable_meur = ${fmtMeur(LVT_BASE_FONCIERE.meur)} M€, arrondi au Md€ : ${LVT_BASE_FONCIERE.source} : ${LVT_BASE_FONCIERE.url} ; ${LVTR}, §1.3 et §4.4. Non relu dans la publication de l'INSEE`,
    'Valeur du sol qui sert d\'assiette à la nouvelle taxe. La capitalisation de la taxe dans le prix du sol réduit cette assiette (D12).', 'sourcé (secondaire)'),
  p('lvt.capi.part', 0.80, 0.60, 1.00, 'part', `${LVTR}, §4.2 et §4.4 : capitalisation de 60 à 100 % de la valeur actuelle d'une taxe récurrente (Palmon et Smith 1998 : 62 % ; Høj et al. 2018 : complète au Danemark ; LVTShift : 100 % en central, 60 % en sensibilité). Centre 0,80 proposé par l'implémentation (milieu de la fourchette) : valeur centrale NON fixée par le propriétaire (D12, « valeur centrale à fixer »). Même part pour la nouvelle taxe et pour les impôts supprimés (symétrie, décision du 24 nov. 2026) : aucune estimation d'une asymétrie n'a été trouvée dans les sources de la revue`, 'à valider',
    'Part de la valeur actuelle d\'une taxe récurrente qui se reporte dans le prix des biens (D12). Elle s\'applique dans les deux sens (décision du 24 nov. 2026) : baisse du prix du sol sous l\'effet de la nouvelle taxe nationale, hausse du prix des biens après la suppression des impôts nationaux sur les plus-values, les loyers et, selon la variante, l\'IFI. Plus elle est forte, plus l\'assiette nette et donc le produit de la taxe baissent à taux fixé. Le centre (0,80) est à valider : il n\'a pas été choisi par le propriétaire.'),
  p('lvt.capi.part_sol', 4190 / (4190 + 4812 + 235), 3829 / (3829 + 4847 + 233), 0.60, 'part',
    `Insee Première n° 2135, « Le patrimoine économique national en 2025 », 12 nov. 2026, tableau 1, ménages fin 2025 : terrains bâtis 4 190 Md€ / (terrains bâtis 4 190 + logements 4 812 + autres bâtiments et génie civil 235) (calcul) : https://www.insee.fr/fr/statistiques/9111734. Bas : Insee Première n° 2028, 11 déc. 2024, ménages fin 2023 : 3 829 / (3 829 + 4 847 + 233) (calcul) : https://www.insee.fr/fr/statistiques/8305990. Haut 0,60 : choix de l'implémentation ; LVTShift (METHODOLOGIE.md, commit 322190e) mesure une part foncière de 60,0 % à Lyon, 63,5 % en couronne parisienne et 75,8 % à Paris, où se concentrent loyers, plus-values et IFI ; aucune part nationale propre à ces biens n'a été trouvée. LVTShift borne la part foncière imputée de chaque parcelle entre 15 et 85 %`, 'sourcé (calcul)',
    'Part du sol dans la valeur des biens immobiliers des ménages. Quand un impôt national sur les revenus ou le patrimoine immobiliers est supprimé, le prix des biens monte ; seule la part « sol » de cette hausse entre dans l\'assiette de la taxe sur la valeur du sol et compense en partie la capitalisation de la nouvelle taxe (D12, capitalisation nette). Une part plus forte réduit la perte nette.'),
  p('lvt.capi.taux_actualisation', 3.5, 3, 4, '% (réel)', `${LVTR}, §4.4 (calcul, non relu) ; LVTShift, capitalisation indicative à 3 % et 4 % réel. Centre 3,5 % : milieu de la fourchette (choix de l'implémentation)`, 'non validé',
    'Taux d\'actualisation réel qui transforme une taxe annuelle en baisse de la valeur du sol : valeur capitalisée = taxe / taux. Un taux plus bas donne une capitalisation plus forte.'),
  p('lvt.ps.cle_etat', 7.5 / 17.2, null, null, 'part', `${LVTR}, §2.3 : prélèvements sociaux sur les revenus du capital de 17,2 %, dont 7,5 points (prélèvement de solidarité) versés à l'État selon LVTShift ; le reste (CSG 9,2 et CRDS 0,5, calcul par différence) va à la sécurité sociale et à la Cades. Clé non vérifiée sur le texte ; le taux en vigueur en 2026 est à confirmer`, 'non validé',
    'Part de l\'État dans les prélèvements sociaux sur les plus-values et les loyers (7,5 / 17,2). Le complément est la perte de la sécurité sociale quand la taxe nationale sur le sol, versée à l\'État (D11), remplace ces prélèvements.'),
  p('lvt.ys.ocde_par_point', 1.0, 0.25, 1.0, '% du PIB (niveau) par point de recettes déplacé', `${LVTR}, §4.2 et §4.3 : OCDE, Arnold et al. (2011, Economic Journal 121), cité par O'Connor et al. (2016) et par la note dynamic-effects.md de LVTShift (non relu) : transférer 1 % des recettes fiscales des impôts sur le revenu vers la consommation et le patrimoine immobilier relève le PIB par habitant de 0,25 à 1 % à long terme. Ne résiste pas aux tests de robustesse (Xing 2012 ; Baiardi et al. 2019)`, 'non validé',
    'Repère de l\'OCDE, utilisé seulement pour la borne haute de l\'effet d\'offre du module (cas « haut », désactivé par défaut) : la valeur utilisée est le haut de la fourchette (1 % du PIB par point de recettes déplacé). Le cas central reste nul (D2). Ne s\'applique pas à S1 (échange entre impôts fonciers).'),
]

// ---------- 3.1 Rendements statiques (étalons) et taux avant réforme ----------
const rend = [
  p('rend.tva_normal', 7.5, null, null, 'Md€ par point', 'DG Trésor 2025, repris par Vie-publique [S9]', 'sourcé', 'Un point de TVA au taux normal rapporte environ 7,5 Md€.'),
  p('rend.tva_tous_taux', 11.4, null, null, 'Md€ par point', 'DG Trésor 2025 [S9]', 'sourcé', 'Un point sur tous les taux de TVA rapporte environ 11,4 Md€ nets.'),
  p('rend.csg', 17, null, null, 'Md€ par point', 'FIPECO, 29 mai 2025 [S10] (2024)', 'sourcé', 'Un point de CSG, toutes assiettes, rapporte environ 17 Md€.'),
  p('rend.ir', 1.0, null, null, 'Md€ par % du produit', 'FIPECO [S10] (produit 2024 : 100 Md€ avant crédits, 91 après)', 'sourcé', 'Une variation de 1 % du produit de l\'impôt sur le revenu vaut environ 1 Md€.'),
  p('rend.cotis', 7.4, 7.0, 10, 'Md€ par point', 'Rapport d\'évaluation des politiques de sécurité sociale – Financement 2026 (annexe 1 au PLACSS 2025, indicateur 1.4.1, pp. 32–33, données Commission des comptes de la sécurité sociale, PDF primaire lu directement) : valeur 2025 d\'un point de cotisation, calculée avant exonérations (rendement constaté augmenté des exonérations, rapporté au taux), vieillesse déplafonnée 7,3 Md€ (dont secteur privé 6,9 Md€, graphique 2), vieillesse plafonnée 6,3 Md€, maladie et famille 10,7 Md€ (champ élargi aux fonctionnaires et indépendants). Eurostat nama_10_gdp (API officielle lue directement) : salaires bruts D11 = 1 129,3 Md€ en 2025. Urssaf : masse salariale privée 726 Md€ en 2024 (lu via synthèse) et +1,85 % en moyenne annuelle en 2025 (Stat\'Ur n° 415, févr. 2026, lu directement), soit ≈ 739 Md€ (calcul). PLFSS 2026, annexe 4 (PDF primaire lu directement) : 71,5 Md€ = coût total 2026 des exonérations sur le champ des régimes obligatoires de base (ROBSS), allègements généraux 61,8 + exonérations ciblées compensées 6,9 + non compensées 2,8 (Tableau 6, p. 23) ; les seuls allègements généraux dépassent 75 Md€ en 2024 en incluant les régimes spéciaux (p. 36). Borne basse ramenée de 6,2 à 7,0 : le chiffre de 6,2 (« Cour des comptes / Sénat ») n\'a pas été retrouvé ; 7,0 encadre la valeur du point du secteur privé (6,9) et de la vieillesse déplafonnée (7,3). Borne haute historique Ecalle ≈ 10 Md€ [S11], proche du champ maladie et famille (10,7). Centre calibré à 7,4 Md€/pt par décision de Patrick du 24 nov. 2026 (docs/review-day0-parameters.md §7)', 'sourcé (fourchette), centre choisi',
    'Un point de cotisations employeurs rapporte environ 7,4 Md€ (valeur du point de cotisation déplafonnée 2025 : 7,3 Md€, dont 6,9 Md€ pour le secteur privé ; les employeurs publics s\'annulent au consolidé).'),
  p('rend.is', 2.3, 2.0, 3.0, 'Md€ par point', 'PLF 2026, Voies et moyens, tome I (PDF primaire lu directement, pp. 18–20) : taux normal 25 % (taux réduit PME 15 % ≤ 42 500 €), IS net État 57,4 Md€ en 2024, 58,2 Md€ en 2025, 59,0 Md€ en 2026 (ratio net 58,2 / 25 = 2,33 Md€/pt) ; DGFiP Statistiques n° 51 (sept. 2026, PDF primaire dgfip_stat_51_is-2025.pdf lu directement) : entreprises à l\'IS, résultat fiscal 176 Md€ (287 de bénéfices − 111 de déficits, p. 2), IS brut 70,5 Md€ (+2,0 %, p. 2), bénéfice imposable à 25 % = 257 Md€, à 15 % = 31 Md€, assiette CEBGE 20 Md€ (graphique 2, p. 3), IS net provisoire 64,8 Md€ (p. 3) ; les 83,7 Md€ d\'impôt brut et 70,7 Md€ d\'impôt net (p. 1) portent sur l\'ensemble des entreprises, IS et IR sur bénéfices professionnels réunis, après 13,1 Md€ de réductions et crédits d\'impôt (Tableau 3, p. 7). Borne haute statique brute : 1 pt de taux normal sur 257 Md€ = 2,57 ≈ 2,6 Md€/pt (calcul, hors comportements, avant crédits d\'impôt forfaitaires et hors effet transitoire sur la CEBGE). Absence d\'étalon officiel DG Trésor ; proxy conservé à 2,3 Md€/pt (docs/review-day0-parameters.md §7)', 'calculé (estimation)',
    'Estimation calculée faute de sensibilité officielle publiée par la DG Trésor : 2,3 Md€/pt correspond au ratio IS net / 25 % (58,2 / 25) ; en brut, 1 point de taux normal sur les 257 Md€ de bénéfice imposable à 25 % (DGFiP 2025) rapporterait au plus ≈ 2,6 Md€.'),
  p('rend.age_legal.hausse', 4.95, 4.20, 6.10, 'Md€ 2025 par année (PIB 2025)',
    'Cour des comptes, « Situation financière et perspectives du système de retraites », 20 févr. 2025, PDF primaire 297428.pdf lu directement (Tableau n° 6 p. 72 et p. 73) : en 2035 (variante accélérée, bornes carrières longues translatées de +1 an), +6,0 Md€ constants 2024 de pensions évitées (+8,4 avec +2,4 de cotisations retraites) ; en 2045 (régime permanent), +8,4 Md€ (A+B) à PIB 2045 (3 628 Md€), dont 6,01 Md€ 2025 de pensions évitées seules (déflaté +0,9 % IPC 2025, docs/baseline-data.md), soit 0,166 % du PIB = 4,95 Md€ ramené au PIB 2025 (2 991 Md€). Décision du 23 nov. 2026 : les bornes carrières longues suivent l\'âge légal symétriquement. Bas 4,20 : érosion surcote / 172 trimestres plus forte ; haut 6,10 : pic avant érosion surcote / Agirc-Arrco. Détail : docs/review-age-legal.md',
    'sourcé (fourchette), centre choisi',
    'Économie statique brute de régime permanent (pensions évitées seules, hors cotisations retraites) d\'un relèvement d\'un an de l\'âge légal (64 → 65 ans, bornes carrières longues translatées de +1 an), ramenée au PIB 2025 (0,166 % PIB). Les cotisations retraites additionnelles (~2,0 Md€, soit ~20,5 % du retour fiscal) sont volontairement exclues de E2 car E7 (ε_offre = 43,6 % × yS) les compte déjà. Net de 20 % de reports sociaux (comp.offset.age_legal), l\'économie directe vaut +3,96 Md€ (+0,132 % PIB), portant le total APU de régime permanent avec offre (+0,50 % PIB, ε_offre = 43,6 %) à +0,350 % PIB (+10,5 Md€ au PIB 2025), dans la fourchette du COR juin 2026 (solde primaire APU +0,3 à +0,6 pt PIB à 10 ans, Tableau 2.10).'),
  p('rend.age_legal.baisse', 3.90, 2.60, 4.95, 'Md€ 2025 par année (PIB 2025)',
    'Cour des comptes, « Situation financière et perspectives du système de retraites », 20 févr. 2025, PDF primaire 297428.pdf lu directement (Tableau n° 6 et texte qui l\'accompagne, p. 71–73 ; annexe 2 p. 92) + décision de Patrick du 23 nov. 2026 (bornes carrières longues translatées symétriquement de −1 an avec l\'âge légal). La Cour attribue l\'écart d\'environ 50 % entre les économies d\'un relèvement de l\'âge et le coût d\'un arrêt à 63 ans au traitement des carrières longues (bornes relevées d\'un an dans le scénario AOD 65, inchangées dans le scénario AOD 63). Son chiffrage à bornes fixes (−4,3 Md€ A+B en 2045, dont 2,61 Md€ de pensions ramenés au PIB 2025) est donc multiplié par ≈ 1,5 lorsque les bornes bougent symétriquement : 2,61 × 1,5 ≈ 3,90 Md€ (0,130 % PIB). Bas 2,60 : chiffrage de la Cour à bornes carrières longues fixes ; haut 4,95 : symétrie complète avec la hausse. Remplace l\'hypothèse de +30 % retenue dans la PR #23 (3,40 Md€) ; le ratio résiduel hausse/baisse passe de 1,46 à ≈ 1,27. Détail : docs/review-age-legal.md',
    'sourcé (fourchette), centre choisi',
    'Surcoût statique brut de régime permanent (pensions supplémentaires seules, hors perte de cotisations retraites déjà comptée par E7) d\'un abaissement d\'un an de l\'âge légal (64 → 63 ans, bornes carrières longues translatées symétriquement de −1 an par décision du 23 nov. 2026), ramené au PIB 2025 (0,130 % PIB). Reste inférieur à une hausse symétrique (4,95 Md€, ratio ≈ 1,27) car la durée d\'assurance requise de 172 trimestres empêche une part croissante des générations nées après 1970 de liquider à taux plein dès 63 ans. Net de 20 % de moindres reports (comp.offset.age_legal), le coût direct avant offre vaut −3,12 Md€ (−0,104 % PIB).'),
  // Taux avant réforme, pour évaluer θ au taux après réforme (3.2).
  p('comp.tau0.tva', 20, null, null, '%', 'Code général des impôts, art. 278 (Légifrance) : « Le taux normal de la taxe sur la valeur ajoutée est fixé à 20 % »', 'sourcé', 'Taux normal légal de TVA avant réforme, pour évaluer θ au taux après réforme.'),
  p('comp.tau0.ir', 21, 18, 23, '%', 'Calcul docs/sigma-fiscal.md §7 (18 nov. 2026) : taux marginal moyen de l\'impôt sur le revenu pondéré par les revenus, à partir des statistiques DGFiP 2026 (impôt 2026 sur les revenus 2025 : foyers et impôt moyen par taux marginal 0 / 11 / 30 / 41 / 45 %) ; revenu par tranche estimé avec des nombres de parts supposés (1,7 à 2,5), soit ≈ 1 290 Md€ au total ; 20 % au barème, 21–22 % avec la décote (FIPECO). Point faible : les nombres de parts. À ne pas confondre avec le taux marginal IR + cotisations salariales de l\'OCDE (43,0 %, Taxing Wages 2026, tableau 3.7)', 'calculé (estimation)',
    'Taux marginal moyen de l\'impôt sur le revenu, pondéré par les revenus, en % du revenu imposable (≈ 16 % du salaire brut après l\'abattement de 10 % et la CSG déductible). Calcul : docs/sigma-fiscal.md, section 7. Il sert à évaluer θ au taux après réforme et l\'effet d\'offre de l\'IR ; estimation à resserrer avec les tableaux de la DGFiP.'),
  p('comp.tau0.csg', 9.2, null, null, '%', 'Code de la sécurité sociale, art. L. 136-8 (Légifrance) : taux de CSG de 9,2 % sur les revenus d\'activité', 'sourcé', 'Taux légal de CSG sur les revenus d\'activité avant réforme, pour évaluer θ au taux après réforme.'),
  p('comp.tau0.cotis', 36.4, 20, 45, '%', 'OCDE, Taxing Wages 2026 (lien du tableau 3.7), célibataire sans enfant au salaire moyen, 2025 : coin fiscal marginal 58,2 % du coût du travail (tableau 3.6) ; taux marginal IR + cotisations salariales 43,0 % du salaire brut (tableau 3.7). Calcul : e = (0,582 − 0,430) / (1 − 0,582) = 36,4 % du salaire brut. Taux marginal au salaire moyen (après allègements), non un taux moyen sur l\'ensemble des salaires ; aucun taux patronal publié séparément dans le texte lu', 'sourcé (calcul)',
    'Taux de cotisations patronales marginal au salaire moyen, déduit de deux tableaux de l\'OCDE par le calcul 1 + e = (1 − 0,430) / (1 − 0,582), soit e = 36,4 % du salaire brut ; il varie fortement selon le niveau de salaire à cause des allègements.'),
  p('comp.tau0.is', 25, null, null, '%', 'PLF 2026, Voies et moyens, tome I, p. 18', 'sourcé', 'Taux normal de l\'impôt sur les sociétés avant réforme.'),
]

export const PARAMS = [...baseMacro, ...baseBlocs, ...partsBlocs, ...COFOG, ...unedic, ...table, ...offre, ...offreFiscal, ...lvt, ...rend, ...comparators]

export const PARAM_BY_ID = Object.fromEntries(PARAMS.map((q) => [q.id, q]))
if (Object.keys(PARAM_BY_ID).length !== PARAMS.length) throw new Error('params: identifiants dupliqués')

export const STATUSES = ['calculé (estimation)', 'sourcé', 'sourcé (calcul)', 'sourcé (secondaire)', 'sourcé (fourchette), centre choisi', 'de mémoire', 'à collecter', 'non validé', 'à valider']

/** Valeurs centrales, avec remplacements éventuels { id: valeur }. Rejette les ids inconnus et les valeurs non finies. */
export function resolveParams(overrides = {}) {
  const out = Object.fromEntries(PARAMS.map((q) => [q.id, q.value]))
  for (const [id, v] of Object.entries(overrides ?? {})) {
    if (!(id in out)) throw new Error(`params: identifiant inconnu « ${id} »`)
    const isSeries = typeof out[id] === 'object'
    if (isSeries ? typeof v !== 'object' : !Number.isFinite(v)) throw new Error(`params: valeur invalide pour « ${id} »`)
    out[id] = v
  }
  return out
}

/** Interpolation linéaire d'une série {année: valeur}, plate hors bornes. */
export function interpolateSeries(series, year) {
  const ys = Object.keys(series).map(Number).sort((a, b) => a - b)
  if (year <= ys[0]) return series[ys[0]]
  if (year >= ys[ys.length - 1]) return series[ys[ys.length - 1]]
  for (let i = 1; i < ys.length; i++) {
    if (year <= ys[i]) {
      const w = (year - ys[i - 1]) / (ys[i] - ys[i - 1])
      return series[ys[i - 1]] * (1 - w) + series[ys[i]] * w
    }
  }
  return series[ys[ys.length - 1]]
}
