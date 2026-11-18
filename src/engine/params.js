// Paramètres du moteur v2 — note de modèle v0.3 (docs/model-note.md), §1, §4 et docs/baseline-data.md.
// Chaque paramètre : { id, value (central), low, high, unit, source, status, explanation }.
// status : "sourcé" | "calculé (estimation)" | "sourcé (calcul)" | "sourcé (secondaire)" | "sourcé (fourchette), centre choisi" | "de mémoire" | "à collecter" | "non validé".
// Convention d'unités : chaque `unit` dit comment lire `value` (ex. "%" = 2,1 pour 2,1 %). Le moteur convertit.
// Un paramètre « à collecter » porte une VALEUR PROVISOIRE (placeholder) : ne jamais la présenter comme sourcée.

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
  p('bloc.part_hors_secu.centrales', 681.1 / (681.1 + 335.5), null, null, 'part',
    'Calcul (proxy) : dépenses centrales / (centrales + locales)', 'à collecter',
    PLACEHOLDER + 'répartition des fonctions de dépense (enseignement, ordre public, affaires économiques) entre État et collectivités, faute de ventilation COFOG par bloc.'),
  p('bloc.part_hors_secu.locales', 335.5 / (681.1 + 335.5), null, null, 'part',
    'Calcul (proxy) : dépenses locales / (centrales + locales)', 'à collecter',
    PLACEHOLDER + 'idem, part des collectivités locales.'),
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
  p('macro.pi.long', 1.85, 1.3, 2.3, '%', 'La note est silencieuse après 2027 ; maintien de la valeur 2027. BdF 2028 (IPCH) : 1,6 %', 'à collecter',
    PLACEHOLDER + 'inflation à partir de 2028, tenue égale à celle de 2027 (la note ne dit rien au-delà ; plage arbitraire).'),
  p('dem.lambda', 0.7, 0.5, 0.85, 'part', 'Hypothèse de calibration, sans source directe', 'non validé',
    'Part de l\'effet sur l\'activité qui subsiste l\'année suivante.'),
  p('dem.m.achats_invest', 0.9, 0.5, 1.3, 'multiplicateur', 'Coenen et al. 2012 ; Ramey 2019 (de mémoire)', 'de mémoire',
    '1 € de commande publique en moins retire environ 0,9 € d\'activité la première année.'),
  p('dem.m.remunerations', 0.8, 0.5, 1.2, 'multiplicateur', 'De mémoire', 'de mémoire',
    'Idem pour la masse salariale publique.'),
  p('dem.m.prestations', 0.5, 0.2, 0.8, 'multiplicateur', 'De mémoire', 'de mémoire',
    'Les ménages épargnent une partie des prestations.'),
  p('dem.m.tva', 0.4, 0.2, 0.6, 'multiplicateur', 'De mémoire', 'de mémoire',
    'Effet d\'une hausse de TVA sur la consommation.'),
  p('dem.m.ir_csg', 0.4, 0.2, 0.6, 'multiplicateur', 'De mémoire', 'de mémoire',
    'Effet d\'un impôt sur le revenu des ménages.'),
  p('dem.m.cotisations', 0.4, 0.2, 0.7, 'multiplicateur', 'De mémoire', 'de mémoire',
    'Effet du coût du travail à court terme.'),
  p('dem.m.is', 0.2, 0.1, 0.4, 'multiplicateur', 'De mémoire', 'de mémoire',
    'Effet de court terme de l\'impôt sur les bénéfices.'),
  p('comp.theta.ir', 0.15, 0.05, 0.30, 'part', 'Formule 3.2 ; e de mémoire (0,1–0,4)', 'de mémoire',
    'Part du rendement perdue parce que les contribuables s\'adaptent.'),
  p('comp.theta.csg', 0.10, 0, 0.20, 'part', 'Formule 3.2 ; de mémoire', 'de mémoire',
    'Idem, assiette large.'),
  p('comp.theta.cotis', 0.15, 0.05, 0.30, 'part', 'De mémoire', 'de mémoire',
    'Idem, via l\'emploi et les salaires.'),
  p('comp.theta.tva', 0.03, 0, 0.08, 'part', 'De mémoire', 'de mémoire',
    'Fraude et achats transfrontaliers.'),
  p('comp.theta.is', 0.25, 0.20, 0.38, 'part', 'Formule 3.2 ; η = 0,8 à 1,5 de mémoire (Beer, de Mooij, Liu 2018)', 'de mémoire',
    'Bénéfices déplacés vers d\'autres pays.'),
  p('offre.sigma.defaut', 0, null, null, 'part du PIB par % de PIB de levier', 'Décision D2 ; revue de preuves en cours (docs/brief-supply-effects.md)', 'non validé',
    'Effet durable sur le niveau du PIB ; non nul seulement si les preuves le justifient, sur une ligne distincte avec fourchette.'),
  p('comp.offset.prestations', 0, 0, 0.3, 'part', 'Section 2, E3 ; valeur à documenter (0 par défaut)', 'à collecter',
    PLACEHOLDER + '0 par défaut (aucun décalage) ; haut = 0,3 arbitraire. Part de l\'économie sur une prestation qui revient par d\'autres dépenses ou des recettes perdues.'),
  p('fisc.eps', 0.6, 0.5, 0.65, 'point de PIB par point d\'écart', 'Commission européenne, Mourre et al. 2019, France ≈ 0,63 (de mémoire ; non relu)', 'de mémoire',
    'Quand le PIB baisse de 1 %, le solde se dégrade d\'environ 0,6 point.'),
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
  p('cmp.aft.taux_emission.2026', 3.5, null, null, '%', 'Non publié à la date de collecte (le rapport annuel 2025 ne donne pas de chiffre 2026 ; le bulletin d\'août 2026 non plus)', 'à collecter',
    PLACEHOLDER + 'taux moyen à l\'émission 2026 de l\'AFT, non trouvé ; 3,5 % est un ordre de grandeur sans source (ne sert qu\'à l\'affichage, jamais dans le calcul).'),
  p('dette.i_moy_2025', 1.9, null, null, '%', 'Cour des comptes : 65,7 Md€ en 2025, 2,2 % du PIB [S14] ; calcul : 64,7 / moyenne (3 306,1 ; 3 460,5)', 'sourcé',
    'Taux moyen payé sur toute la dette.'),
  p('dette.beta', 3, 2, 5, 'pb par point de PIB de dette', 'Laubach 2009 ; Baldacci et Kumar 2010 (de mémoire)', 'de mémoire',
    'Hausse du taux quand la dette augmente d\'un point de PIB.'),
  p('emploi.kappa', 0.4, 0.3, 0.5, 'point de chômage par % de PIB', 'Ball, Leigh, Loungani 2017 (de mémoire)', 'de mémoire',
    '1 % de PIB en moins : 0,4 point de chômage en plus.'),
  // ref.derive (D7)
  p('ref.derive.a_retraites', COR, { ...COR, 2070: 14.5 }, { ...COR, 2070: 16.1 }, '% du PIB, par année', 'COR, rapport annuel de juin 2026 [S23] ; 2040 et 2050 non trouvés : interpolation linéaire', 'sourcé',
    'Dépenses de retraites à droit en vigueur ; le vieillissement est l\'écart avec 2025. Bas/haut : productivité 1,0 % / 0,4 % en 2070 (2045 inchangé).'),
  p('ref.derive.a_sante', 0.3 / 48, 0, 1.0 / 48, 'points de PIB par an', 'Commission européenne, 2024 Ageing Report, Institutional Paper 279, tableau 5 (p. 12) et tableau 1 (p. 5), scénario de référence : dépense publique de santé de la France 8,8 % du PIB en 2022, +0,3 pt d\'ici 2070 (≈ 9,1 %), soit 0,3 / 48 ans ; soins de longue durée 1,9 % (+0,7 pt). Lu sur une copie du document (mefop.it), non sur le site de la Commission ; fiche France (partie III, p. 273) non lue. Haut = santé + longue durée (+1,0 pt / 48 ans). Bas = 0 : absence de dérive (choix, non publié). Estimation plus ancienne : DG Trésor, Cahiers n° 2009-11, effet du vieillissement ≈ 1,5 pt d\'ici 2050 (0,6 à 2,3)', 'sourcé (secondaire)',
    'Dérive annuelle de la dépense publique de santé due au vieillissement, en points de PIB par an (linéaire, scénario de référence de la Commission, hors soins de longue durée). Hypothèse de coûts unitaires de la Commission : le haut de la fourchette ajoute la longue durée, et les estimations françaises plus anciennes sont plus élevées. Pas de double comptage dans le moteur : les retraites (COR) et les autres dépenses (ref.derive.b_autres, à 0 pour l\'instant) ne portent pas la longue durée ; si b_autres devient non nul, il devra l\'exclure tant que le haut de cette fourchette l\'inclut.'),
  p('ref.derive.b_autres', 0, null, null, 'points de PIB par an', 'D7 : max(projection officielle ; tendance longue de la dépense primaire réelle). Non trouvé : aucune croissance en volume de la dépense primaire hors 2020–2021 publiée. Plus proche : FIPECO, « Cinquante ans de dépenses publiques » (https://fipeco.fr/pdf/Depenses50ans.pdf, p. 2), dépense publique TOTALE (intérêts inclus, 2020–2021 inclus), volume déflaté par le prix du PIB : 1991–2010 +2,4 %/an ; 2011–2023 +1,0 %/an ; ce n\'est pas la mesure demandée. Rapport Cour des comptes de juin 2026 : illisible (erreur serveur). Reste à calculer sur les séries Insee', 'à collecter',
    PLACEHOLDER + '0 (aucune dérive des autres dépenses), faute de projection officielle et de tendance calculée : la référence est donc plus favorable que le choix délibéré de la note (D7).'),
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
  p('offre.sigma.age_legal', 0.30, 0.15, 0.50, '% du PIB (niveau) par année d\'âge légal', `${GEM}, n° 1 ; Rabaté et Rochut (2020) ; Dubois et Koubi (2017) ; Hairault, Sopraseuth et Langot (2010). Gemini : +0,25 / +0,45 / +0,60. Fourchette retenue par Patrick (17 nov.) : +0,15 / +0,30 / +0,50`, 'sourcé (fourchette), centre choisi',
    'Effet de long terme sur le niveau du PIB d\'un relèvement d\'un an de l\'âge légal de départ en retraite, via l\'emploi des seniors. Le centre (+0,30) est choisi sous celui de Gemini (+0,45), qui vient de la réforme de 2010 : à l\'époque la marge était de 60 ans, alors qu\'elle est aujourd\'hui de 62 ans et 9 mois, où moins de personnes sont encore en emploi. Pas encore branché sur un levier du moteur (aucune entrée d\'âge légal) : paramètre seul.'),
  lag('age_legal', 6, 'montée en charge des cohortes concernées'), t0('age_legal', 0, 'effet dès l\'entrée en vigueur'),
  p('offre.sigma.lvt', 0.20, 0.10, 0.45, '% du PIB (niveau), remplacement complet', `${GEM}, n° 15 (Gemini : +0,10 / +0,30 / +0,60 pour le remplacement des DMTO et de la taxe foncière) ; Patrick (17 nov.) : taxe foncière seule, sans les DMTO, +0,10 / +0,20 / +0,45`, 'sourcé (fourchette), centre choisi',
    'Effet de long terme sur le niveau du PIB du remplacement intégral de la taxe foncière par une taxe sur la valeur du sol, à rendement égal et sans toucher aux droits de mutation. Paramètre destiné au module LVT. La moitié haute de la fourchette suppose un assouplissement des règles d\'urbanisme.'),
  lag('lvt', 12, 'ajustement du bâti et de l\'usage des sols'), t0('lvt', 1, 'effet à partir de la deuxième année'),
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
  p('offre.is.eps_k', 0.5, 0.3, 1.0, 'élasticité (sans unité)', 'De mémoire ; fourchette 0,3 à 1,0 non vérifiée (docs/sigma-fiscal.md, section 3 : « à sourcer »)', 'de mémoire',
    'Élasticité du stock de capital au coût d\'usage du capital : une hausse de 1 % de ce coût réduit le capital, donc le PIB de long terme, de ε_K × α %. À sourcer.'),
  p('offre.is.tau_effectif', 25.8, null, null, '%', 'BOFiP, 12 août 2026 ; Legifiscal : taux normal 25 % + contribution sociale de 3,3 % (grandes entreprises) ; hors contribution exceptionnelle (temporaire). Le taux normal de 25 % reste dans comp.tau0.is', 'sourcé',
    'Taux d\'IS pris dans le calcul du coût d\'usage du capital : taux normal et contribution sociale, hors contribution exceptionnelle des plus grandes entreprises (temporaire).'),
  p('offre.is.plafond', 0.15, null, null, '% du PIB par point de taux', 'Revue de preuves Gemini (docs/review-supply-effects-gemini.md), n° 4 : 0,15 par point ; Gechert et Heimberger (2022)', 'sourcé',
    'Plafond de l\'effet d\'offre de l\'IS, en valeur absolue (le cas haut du calcul, 0,09, ne l\'atteint pas). Pas de plafond équivalent pour les impôts larges sur le travail (décision du 18 nov.).'),
  p('offre.ir.conv_brut', 0.76, null, null, 'part', 'docs/sigma-fiscal.md, section 7 : abattement de 10 % et CSG déductible (calcul)', 'calculé (estimation)',
    'Conversion du revenu imposable en salaire brut (× 0,76 environ) : le taux marginal d\'IR sur le revenu imposable vaut 0,76 fois son poids sur le salaire brut.'),
  p('offre.csg.part_deductible', 6.8 / 9.2, null, null, 'part', 'Code de la sécurité sociale : CSG de 9,2 % sur les revenus d\'activité, dont 6,8 points déductibles de l\'impôt sur le revenu', 'sourcé',
    'Part de la CSG déductible de l\'assiette de l\'impôt sur le revenu (6,8 sur 9,2) : un point de CSG en plus coûte moins cher au salarié imposé.'),
  p('offre.csg.tmi_salarie', 30, null, null, '%', 'Taux marginal de l\'impôt sur le revenu du salarié moyen (tranche de 30 %), choix de l\'implémentation indiqué dans docs/sigma-fiscal.md ; barème non relu', 'de mémoire',
    'Taux marginal d\'impôt sur le revenu auquel est déduite la part déductible de la CSG, pour le salarié moyen.'),
  p('offre.csg.assiette', 0.9825, null, null, 'part', 'Code de la sécurité sociale, art. L. 136-2 : abattement de 1,75 % (assiette = 98,25 % du salaire brut)', 'sourcé',
    'Part du salaire brut qui entre dans l\'assiette de la CSG sur les revenus d\'activité.'),
  obs('base.conso_menages', 1600, 'Md€', 'De mémoire : consommation des ménages ≈ 1 600 Md€ ; à vérifier sur les comptes nationaux de l\'Insee', 'Consommation finale des ménages en valeur : sert à convertir un point de TVA en variation du prix à la consommation (rendement du point / consommation).', 'de mémoire'),
  obs('base.ir.2025', 92.6, 'Md€', 'DGFiP 2025 ; Vie-publique, IR 2025 (docs/sigma-fiscal.md, section 7)', 'Produit net de l\'impôt sur le revenu en 2025 : recette propre de l\'IR qui varie avec le PIB (calcul de θ non réel).'),
  p('base.tva.2025', 190, 150, 210, 'Md€', 'Ordre de grandeur de la TVA nette, non relu sur le tome I des Voies et moyens', 'à collecter',
    PLACEHOLDER + 'TVA nette totale (190 Md€) : recette propre qui varie avec le PIB (calcul de θ non réel). Si la valeur est supérieure à environ 120 Md€, θ non réel de la TVA est nul.'),
  obs('base.is.produit_etat_2026', 59.0, 'Md€', 'PLF 2026, Voies et moyens, tome I, p. 6 : IS net de l\'État 59,0 Md€ en 2026', 'Produit net de l\'IS de l\'État en 2026 : recette propre qui varie avec le PIB (calcul de θ non réel).'),
]

// ---------- 3.1 Rendements statiques (étalons) et taux avant réforme ----------
const rend = [
  p('rend.tva_normal', 7.5, null, null, 'Md€ par point', 'DG Trésor 2025, repris par Vie-publique [S9]', 'sourcé', 'Un point de TVA au taux normal rapporte environ 7,5 Md€.'),
  p('rend.tva_tous_taux', 11.4, null, null, 'Md€ par point', 'DG Trésor 2025 [S9]', 'sourcé', 'Un point sur tous les taux de TVA rapporte environ 11,4 Md€ nets.'),
  p('rend.csg', 17, null, null, 'Md€ par point', 'FIPECO, 29 mai 2025 [S10] (2024)', 'sourcé', 'Un point de CSG, toutes assiettes, rapporte environ 17 Md€.'),
  p('rend.ir', 1.0, null, null, 'Md€ par % du produit', 'FIPECO [S10] (produit 2024 : 100 Md€ avant crédits, 91 après)', 'sourcé', 'Une variation de 1 % du produit de l\'impôt sur le revenu vaut environ 1 Md€.'),
  p('rend.cotis', 8.5, 7, 10, 'Md€ par point', 'DSS 7 Md€ à Ecalle ≈ 10 Md€, sources secondaires [S11] ; aucun chiffre officiel récent trouvé (baseline-data, collecte du 17 nov. ; recherche complétée : audition de la commission des affaires sociales sur les cotisations du 29 janv. 2026, aucun chiffre par point). Agrégats : exonérations ROBSS 71,5 Md€ en 2026 (PLFSS 2026, annexe 4, tableau 6, p. 23)', 'à collecter',
    PLACEHOLDER + '8,5 Md€ par point = milieu de la fourchette secondaire 7–10 Md€ (choix de l\'implémentation) ; aucun chiffre officiel.'),
  p('rend.is', 2.3, 2.0, 3.0, 'Md€ par point', 'Non trouvé (rendement officiel par point). Agrégats : IS net de l\'État 58,2 Md€ en 2025 / 59,0 Md€ en 2026, taux 25 % (PLF 2026, Voies et moyens, tome I, p. 6, 18, 20) ; FIPECO (6 mars 2021) : pas de chiffre par point, IS net 2019 52,5 Md€ hors CICE ; Assemblée nationale, amendement LFI du 22 oct. 2025 (non officiel) : 25 % → 33,3 % = +19 Md€ à bénéfices inchangés, soit ≈ 2,3 Md€ par point (calcul sur un amendement) ; audition DG Trésor, 2026 : modèles existent, chiffres non publiés. Proxy retenu : 58,2 / 25', 'à collecter',
    PLACEHOLDER + '2,3 Md€ par point = 58,2 / 25 (proportionnel, IS de l\'État seul) ; plage 2,0–3,0 arbitraire. Aucun étalon officiel n\'a été trouvé ; ce proxy surestime sans doute, car il ignore le taux réduit des PME.'),
  // Taux avant réforme, pour évaluer θ au taux après réforme (3.2). Non fournis par la note : placeholders.
  p('comp.tau0.tva', 20, null, null, '%', 'Taux normal de TVA (de mémoire)', 'de mémoire', 'Taux de TVA avant réforme, pour évaluer θ au taux après réforme.'),
  p('comp.tau0.ir', 21, 18, 23, '%', 'Calcul docs/sigma-fiscal.md §7 (18 nov. 2026) : taux marginal moyen de l\'impôt sur le revenu pondéré par les revenus, à partir des statistiques DGFiP 2026 (impôt 2026 sur les revenus 2025 : foyers et impôt moyen par taux marginal 0 / 11 / 30 / 41 / 45 %) ; revenu par tranche estimé avec des nombres de parts supposés (1,7 à 2,5), soit ≈ 1 290 Md€ au total ; 20 % au barème, 21–22 % avec la décote (FIPECO). Point faible : les nombres de parts. À ne pas confondre avec le taux marginal IR + cotisations salariales de l\'OCDE (43,0 %, Taxing Wages 2026, tableau 3.7)', 'calculé (estimation)',
    'Taux marginal moyen de l\'impôt sur le revenu, pondéré par les revenus, en % du revenu imposable (≈ 16 % du salaire brut après l\'abattement de 10 % et la CSG déductible). Calcul : docs/sigma-fiscal.md, section 7. Il sert à évaluer θ au taux après réforme et l\'effet d\'offre de l\'IR ; estimation à resserrer avec les tableaux de la DGFiP.'),
  p('comp.tau0.csg', 9.2, null, null, '%', 'Taux de CSG sur les revenus d\'activité (de mémoire)', 'de mémoire', 'Taux de CSG avant réforme, pour évaluer θ au taux après réforme.'),
  p('comp.tau0.cotis', 36.4, 20, 45, '%', 'OCDE, Taxing Wages 2026 (lien du tableau 3.7), célibataire sans enfant au salaire moyen, 2025 : coin fiscal marginal 58,2 % du coût du travail (tableau 3.6) ; taux marginal IR + cotisations salariales 43,0 % du salaire brut (tableau 3.7). Calcul : e = (0,582 − 0,430) / (1 − 0,582) = 36,4 % du salaire brut. Taux marginal au salaire moyen (après allègements), non un taux moyen sur l\'ensemble des salaires ; aucun taux patronal publié séparément dans le texte lu', 'sourcé (calcul)',
    'Taux de cotisations patronales marginal au salaire moyen, déduit de deux tableaux de l\'OCDE par le calcul 1 + e = (1 − 0,430) / (1 − 0,582), soit e = 36,4 % du salaire brut ; il varie fortement selon le niveau de salaire à cause des allègements.'),
  p('comp.tau0.is', 25, null, null, '%', 'PLF 2026, Voies et moyens, tome I, p. 18', 'sourcé', 'Taux normal de l\'impôt sur les sociétés avant réforme.'),
]

export const PARAMS = [...baseMacro, ...baseBlocs, ...partsBlocs, ...COFOG, ...unedic, ...table, ...offre, ...offreFiscal, ...rend, ...comparators]

export const PARAM_BY_ID = Object.fromEntries(PARAMS.map((q) => [q.id, q]))
if (Object.keys(PARAM_BY_ID).length !== PARAMS.length) throw new Error('params: identifiants dupliqués')

export const STATUSES = ['calculé (estimation)', 'sourcé', 'sourcé (calcul)', 'sourcé (secondaire)', 'sourcé (fourchette), centre choisi', 'de mémoire', 'à collecter', 'non validé']

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
