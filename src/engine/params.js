// Paramètres du moteur v2 — note de modèle v0.3 (docs/model-note.md), §1, §4 et docs/baseline-data.md.
// Chaque paramètre : { id, value (central), low, high, unit, source, status, explanation }.
// status : "sourcé" | "sourcé (secondaire)" | "sourcé (fourchette), centre choisi" | "de mémoire" | "à collecter" | "non validé".
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
    'Dérive annuelle de la dépense publique de santé due au vieillissement, en points de PIB par an (linéaire, scénario de référence de la Commission, hors soins de longue durée). Hypothèse de coûts unitaires de la Commission : le haut de la fourchette ajoute la longue durée, et les estimations françaises plus anciennes sont plus élevées.'),
  p('ref.derive.b_autres', 0, null, null, 'points de PIB par an', 'D7 : max(projection officielle ; tendance longue de la dépense primaire réelle) ; tendance à calculer (séries Insee)', 'à collecter',
    PLACEHOLDER + '0 (aucune dérive des autres dépenses), faute de projection officielle et de tendance calculée : la référence est donc plus favorable que le choix délibéré de la note (D7).'),
  p('ref.spb_2026', -2.8, -2.9, -2.7, '% du PIB', 'Calcul : solde −5,4 % + intérêts 2,6 % du RESF 2027 [S17] ; soldes par bloc 2026 non trouvés', 'sourcé',
    'Solde primaire de 2026 en point de départ (le solde hors intérêts, avant toute mesure nouvelle).'),
]

// ---------- 3.1 Rendements statiques (étalons) et taux avant réforme ----------
const rend = [
  p('rend.tva_normal', 7.5, null, null, 'Md€ par point', 'DG Trésor 2025, repris par Vie-publique [S9]', 'sourcé', 'Un point de TVA au taux normal rapporte environ 7,5 Md€.'),
  p('rend.tva_tous_taux', 11.4, null, null, 'Md€ par point', 'DG Trésor 2025 [S9]', 'sourcé', 'Un point sur tous les taux de TVA rapporte environ 11,4 Md€ nets.'),
  p('rend.csg', 17, null, null, 'Md€ par point', 'FIPECO, 29 mai 2025 [S10] (2024)', 'sourcé', 'Un point de CSG, toutes assiettes, rapporte environ 17 Md€.'),
  p('rend.ir', 1.0, null, null, 'Md€ par % du produit', 'FIPECO [S10] (produit 2024 : 100 Md€ avant crédits, 91 après)', 'sourcé', 'Une variation de 1 % du produit de l\'impôt sur le revenu vaut environ 1 Md€.'),
  p('rend.cotis', 8.5, 7, 10, 'Md€ par point', 'DSS 7 Md€ à Ecalle ≈ 10 Md€, sources secondaires [S11] ; aucun chiffre officiel récent trouvé (baseline-data, collecte du 17 nov.)', 'à collecter',
    PLACEHOLDER + '8,5 Md€ par point = milieu de la fourchette secondaire 7–10 Md€ (choix de l\'implémentation) ; aucun chiffre officiel.'),
  p('rend.is', 2.3, 2.0, 3.0, 'Md€ par point', 'Non trouvé (rendement officiel). Proxy : IS net de l\'État 58,2 Md€ / taux 25 % [baseline-data, item 2]', 'à collecter',
    PLACEHOLDER + '2,3 Md€ par point = 58,2 / 25 (proportionnel, IS de l\'État seul) ; plage 2,0–3,0 arbitraire. Aucun étalon officiel n\'a été trouvé ; ce proxy surestime sans doute, car il ignore le taux réduit des PME.'),
  // Taux avant réforme, pour évaluer θ au taux après réforme (3.2). Non fournis par la note : placeholders.
  p('comp.tau0.tva', 20, null, null, '%', 'Taux normal de TVA (de mémoire)', 'de mémoire', 'Taux de TVA avant réforme, pour évaluer θ au taux après réforme.'),
  p('comp.tau0.ir', 30, 11, 45, '%', 'Non fourni par la note', 'à collecter',
    PLACEHOLDER + 'taux marginal moyen de l\'impôt sur le revenu avant réforme = 30 % (tranche médiane du barème, arbitraire).'),
  p('comp.tau0.csg', 9.2, null, null, '%', 'Taux de CSG sur les revenus d\'activité (de mémoire)', 'de mémoire', 'Taux de CSG avant réforme, pour évaluer θ au taux après réforme.'),
  p('comp.tau0.cotis', 30, 20, 45, '%', 'Non fourni par la note', 'à collecter',
    PLACEHOLDER + 'taux moyen de cotisations patronales = 30 % (arbitraire).'),
  p('comp.tau0.is', 25, null, null, '%', 'PLF 2026, Voies et moyens, tome I, p. 18', 'sourcé', 'Taux normal de l\'impôt sur les sociétés avant réforme.'),
]

export const PARAMS = [...baseMacro, ...baseBlocs, ...partsBlocs, ...COFOG, ...table, ...rend, ...comparators]

export const PARAM_BY_ID = Object.fromEntries(PARAMS.map((q) => [q.id, q]))
if (Object.keys(PARAM_BY_ID).length !== PARAMS.length) throw new Error('params: identifiants dupliqués')

export const STATUSES = ['sourcé', 'sourcé (secondaire)', 'sourcé (fourchette), centre choisi', 'de mémoire', 'à collecter', 'non validé']

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
