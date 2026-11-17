# Données de référence officielles (complément à la note de modèle)

Brouillon en cours, 17 novembre 2026. Chaque item : valeur, année, définition, source, page/tableau, nature de la lecture. « non trouvé » indique ce qui a été tenté. Aucune valeur n'est complétée de mémoire. Limite d'outil : les fichiers xlsx de l'Insee sont interdits aux robots (robots_disallowed) et le shell n'a pas d'accès web ; la lecture passe par WebFetch, qui résume les PDF (les chiffres cités ont été rendus par cet outil, pas relus à l'œil dans le PDF).

Avancement : item 1 partiel, item 5 trouvé (autres items en cours).

## Item 1. Recettes 2025 par impôt (comptabilité nationale)

Trouvé : totaux « impôts et cotisations sociales » par sous-secteur. Non trouvé : ventilation par impôt (TVA, IR, IS, CSG, cotisations, fiscalité locale).

| Agrégat | Valeur 2025 (Md€) | Définition | Source | Lecture |
|---|---|---|---|---|
| Total des recettes APU | 1 561,7 (APUC 550,8 ; APUL 319,9 ; ASSO 796,6) | Comptabilité nationale, base 2020, consolidé | Insee Première n° 2106, « Le compte des administrations publiques en 2025 », mai 2026, tableau 4 (https://www.insee.fr/fr/statistiques/fichier/version-html/8997691/ip2106.pdf) | Primaire (via résumé WebFetch) |
| Impôts et cotisations sociales (y c. imputées) | APU 1 374,1 ; APUC 458,0 ; APUL 181,6 ; ASSO 740,6 | idem | idem, tableau 4 | Primaire |
| Prélèvements obligatoires | 43,6 % du PIB (+0,9 pt) | Nets des crédits d'impôt, y c. UE (0,1 pt) | Insee Résultats, « Finances publiques en 2025 », 29/05/2026 (https://www.insee.fr/fr/statistiques/8988841) | Primaire |
| Recettes totales | 52,2 % du PIB | idem | idem | Primaire |
| TVA, IR, IS, CSG, cotisations, impôts locaux : montants | non trouvé | | | |

Ce qui a été tenté pour la ventilation : Insee Première 2106 (le texte ne donne que des variations : IR État +7,6 Md€ soit +7,9 %, DMTO +19,8 %, cotisations ASSO +3,3 %, sans niveau) ; page Insee « Impôts » (arrêtée à 2017) ; page Insee 8988845 (« Dépenses et recettes des APU en 2025 », publiée le 29/05/2026, tableaux mis à jour le 28/08/2026). Les tableaux utiles sont 3.216 (prélèvements obligatoires) et 3.217 (« Principaux impôts par catégorie ») à https://www.insee.fr/fr/statistiques/fichier/8988845/t_3217_fr.xlsx et .../t_3216_fr.xlsx ; les sous-secteurs sont aux tableaux 3.202 (centrales), 3.205 (locales), 3.212 (sécurité sociale). Aucun de ces xlsx n'a pu être lu. À ouvrir à la main.

Écarts avec la note (section 1.1), à vérifier dans la mise à jour Insee d'août 2026 : la note donne consommations intermédiaires APU 163,5 (APUC 61,6) et dépenses ASSO 803,2 ; le tableau 4 d'Insee Première 2106 donne 164,6 (APUC 61,8) et 803,3, dépenses APU 1 714,2 contre 1 714,1. Sur les recettes la note concorde (1 561,7 contre 1 561,6 calculé). Les écarts sont de l'ordre de l'arrondi ou d'une révision ; la note cite peut-être la version d'août.

## Item 5. Niveaux 2026 et 2027 (RESF 2027)

Source : Direction générale du Trésor, « Rapport économique, social et financier » annexé au PLF 2027, publié le 6 octobre 2026 (https://www.tresor.economie.gouv.fr/Articles/03454e04-445d-4ce6-832b-cff601a11485/files/56839f98-37fc-48d8-b502-81cac5a48cad). Lecture primaire (PDF), via résumé WebFetch. Définition : comptabilité nationale, toutes APU, déficit et dette au sens de Maastricht.

| Grandeur | 2025 | 2026 | 2027 | Page / tableau |
|---|---|---|---|---|
| PIB en valeur (Md€) | 2 991 | 3 051 | 3 135 | p. 188, tableau 1 |
| Inflation, prix à la consommation (moyenne annuelle) | 0,9 % | 2,1 % | 1,8 % | p. 188, tableau 2 ; p. 191, tableau 10 |
| Solde public (% PIB) | −5,1 | −5,4 | −5,0 | p. 192, tableau 13 |
| Dette brute (% PIB) | 115,7 | 119,3 | 121,7 | p. 192, tableau 14 |
| Charge d'intérêts (% PIB) | 2,2 | 2,6 | 2,9 | p. 192, tableau 13 ; p. 194, tableau 17 (D.41) |

Équivalents en Md€ (calcul, non publiés tels quels dans les tableaux lus : % × PIB) : solde ≈ −165 en 2026 ; dette ≈ 3 640 ; intérêts ≈ 79 (≈ 91 en 2027). Le tableau 17 (p. 194) peut donner la charge d'intérêts en Md€ : à lire directement. L'indice de prix (IPC ou IPCH) n'a pas été précisé par l'outil.

Remarques : (a) inflation 2026 : 2,1 % trouvée, ce qui comble le « non trouvé » de la note 1.2 ; (b) dette 2026 : 119,3 % publié contre 119,2 % calculé dans la note ; (c) un article secondaire (LégiFiscal, citant le communiqué du gouvernement du 11/09/2026, n° 1018) donne un déficit de 4,9 % en 2026 et 2027, en contradiction avec 5,4 % et 5,0 % du RESF et du HCFP : traiter le RESF comme référence, la différence venant probablement d'une autre définition ou d'une version antérieure (non vérifié) ; (d) non trouvé : projet de loi de fin de gestion 2026 et soldes par bloc en 2026.

## Item 2. Rendement statique d'un point de taux d'IS

Résultat : **non trouvé** (aucun chiffre officiel par point de taux).

| Élément cherché ou trouvé | Valeur | Source | Lecture |
|---|---|---|---|
| Rendement d'un point de taux d'IS | non trouvé | | |
| IS net, prévision de recettes de l'État (budgétaire) | 2025 : 58,2 Md€ (révisé ; 53,0 en LFI 2025) ; 2026 : 59,0 Md€ | PLF 2026, Voies et moyens tome I « Évaluations des recettes », p. 6 et 20 (https://www.assemblee-nationale.fr/dyn/contenu/visualisation/1087930/file/PLF%202026%20-%20V%26M%20TI%20-%20Evaluations%20des%20recettes.pdf) | Primaire, 100 000 premiers caractères sur 228 050 seulement |
| Taux normal d'IS | 25 % depuis 2022 ; taux réduit 15 % pour certaines PME | idem, p. 18 | Primaire |

Tenté : texte vu du tome I du PLF 2026 (aucune sensibilité par point ; les 128 000 caractères restants n'ont pas été lus, ni le tome I du PLF 2027) ; fiche FIPECO « L'impôt sur les sociétés » (6 mars 2021, https://www.fipeco.fr/pdf/IS.pdf : pas de chiffre par point) ; note FIPECO sur la majoration d'IS (17 octobre 2024 : donne seulement le rendement attendu de la majoration pour les très grandes entreprises, 8 Md€ en 2025 et 4 Md€ en 2026, sans lien avec un point de taux) ; recherche web sur Conseil des prélèvements obligatoires et DG Trésor sans résultat chiffré. Un chapitre de l'Institut Avant-Garde (juin 2026, p. 18, secondaire) cite une estimation de L. Bach (IPP, octobre 2024) pour un passage de 25 % à 33,5 % (4,4 à 8 Md€), dont la base n'est pas établie : non utilisable comme étalon sans relire l'étude de l'IPP. Aucune valeur par point n'est proposée ici.

## Item 3. Rendement d'un point de cotisations patronales

Résultat : **non trouvé** dans les annexes du PLFSS 2026 lues ; la note garde donc ses sources secondaires (DSS 7 Md€, Ecalle environ 10 Md€).

| Élément | Valeur | Source | Lecture |
|---|---|---|---|
| Coût combiné des baisses de 1,8 pt (famille) et de 6 pts (maladie) de cotisations | 38,2 Md€ en 2024 ; 36,2 Md€ estimé en 2025 | PLFSS 2026, annexe 4 « Présentation des mesures de réduction et d'exonération de cotisations et contributions ainsi que de leur compensation », p. 24, section 1.3.1 (https://www.assemblee-nationale.fr/dyn/contenu/visualisation/1088679/file/PLFSS2026-Annexe4-20251014-183718-59-11_avec%20couverture-2.pdf) | Primaire, première moitié du document seulement |
| Total des exonérations (ROBSS) | 74,7 (2024) ; 71,8 (2025) ; 71,5 Md€ (2026) | idem, tableau 6, p. 23 | Primaire |
| Valeur d'un point de cotisation employeur | non trouvé | | |

Ces montants agrègent plusieurs dispositifs et ne se divisent pas en rendement par point. Tenté : annexe 4 (moitié), recherche web ciblée (comptes rendus parlementaires, rapports du Sénat non ouverts). Pistes non explorées : annexe 5 et annexe 9 du PLFSS, réponses de la DSS aux questionnaires parlementaires.

## Item 4. Dépenses des APU par fonction (COFOG)

Année : **2024** (provisoire). Le niveau 2025 n'existe pas encore : la page Insee « Dépenses des APU ventilées par fonction en 2025 » (https://www.insee.fr/fr/statistiques/8988847) indique que les tableaux 3.301 à 3.307 paraîtront en décembre 2026. Définition : comptabilité nationale, toutes APU consolidées, COFOG division (première niveau), Md€ courants.

Source : Insee Première n° 2093, « Usage de l'argent public : les dépenses publiques par fonction en 2024 », février 2026, figure 2 (https://www.insee.fr/fr/statistiques/fichier/8735252/IP2093.pdf). Lecture primaire, via résumé WebFetch.

| Fonction | 2024, Md€ | Part de la dépense |
|---|---|---|
| Protection sociale (retraites, famille, chômage, maladie, exclusion) | 693 | 41 % |
| Santé | 261 | 16 % |
| Services généraux (dont charge de la dette 60 Md€) | 181 | 11 % |
| Affaires économiques | 166 | 10 % |
| Enseignement | 149 | 9 % |
| Défense | 54 | 3 % ou moins (1,9 % du PIB) |
| Ordre et sécurité publics | 52 | 3 % ou moins |
| Loisirs, culture, culte | 43 | 3 % ou moins |
| Logement et équipements collectifs | 42 | 3 % ou moins |
| Protection de l'environnement | 30 | 3 % ou moins |
| Total | 1 672 (57,0 % du PIB) | |

Sous-postes de la protection sociale publiés dans le texte : famille 67 Md€ ; chômage 49 Md€ (incl. formation des demandeurs d'emploi). **Vieillesse : niveau non trouvé** (le texte donne seulement la hausse de +23 Md€, soit +6,2 %). Exclusion sociale et survie : non publiés séparément dans le texte. Les détails par groupe de fonctions sont aux tableaux xlsx 3.30x de l'Insee, illisibles ici (robots interdits). La somme des lignes (1 671) concorde avec le total à l'arrondi près. Le total 2024 de 1 672 est le chiffre provisoire de février 2026, à ne pas confondre avec les dépenses 2025 de 1 714,2.

