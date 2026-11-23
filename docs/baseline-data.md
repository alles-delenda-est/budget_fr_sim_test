# Données de référence officielles (complément à la note de modèle)

Brouillon en cours, 17 novembre 2026. Chaque item : valeur, année, définition, source, page/tableau, nature de la lecture. « non trouvé » indique ce qui a été tenté. Aucune valeur n'est complétée de mémoire. Limite d'outil : les fichiers xlsx de l'Insee sont interdits aux robots (robots_disallowed) et le shell n'a pas d'accès web ; la lecture passe par WebFetch, qui résume les PDF (les chiffres cités ont été rendus par cet outil, pas relus à l'œil dans le PDF).

Avancement : items 5, 6 et 7 trouvés ; items 1 et 4 partiels ; items 2 et 3 non trouvés.

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

## Item 6. Points de comparaison

### 6a. Cour des comptes, juin 2026

Source : Cour des comptes, « La situation et les perspectives des finances publiques », délibéré le 22 juin 2026 (https://www.vie-publique.fr/files/rapport/pdf/303867.pdf, copie du PDF sur Vie-publique). Lecture primaire, via résumé WebFetch (environ 280 000 caractères sur 339 579 ; numéros de page déduits des en-têtes, donc approximatifs). Définition : comptabilité nationale, toutes APU.

| Grandeur | Valeur | Hypothèse | Page / tableau |
|---|---|---|---|
| Charge d'intérêts des APU 2024 / 2025 | 60,1 Md€ (2,0 %) / 65,7 Md€ (2,2 %) | observé | tableau 14, p. 67 |
| Charge d'intérêts 2026 | 77,4 Md€ (2,5 % du PIB), +11,7 Md€ | prévision gouvernementale de printemps | tableau 14, p. 67 ; texte p. 69 |
| Charge d'intérêts 2029 | « plus de 100 Md€ par an » (seuil, pas de série annuelle dans le texte lu) | idem | p. 69 |
| Charge d'intérêts de l'État 2025 / 2026 | 52,5 / 61,9 Md€ | | tableau 16, p. 71 |
| Dette 2026 | 118,5 % du PIB | prévisions du gouvernement de l'époque | p. 18-19 |
| Déficit fin 2029 si plafonds de dépense nette respectés | 3,2 % du PIB ; dette 2029 : 120,1 % | plafonds DPN | tableau 19, p. 84 environ |
| Déficit fin 2029 si cibles du plan à moyen terme respectées | 2,8 % ; dette 2029 : 118,8 % | cibles PSMT | tableau 19 ; tableau 21 (trajectoire de référence) |
| Scénarios 2029 (solde ; dette) | « dérive » −5,4 ; 124,3 ; « choc macro » −3,3 ; 121,6 ; « hausse des taux » −3,3 ; 120,0 ; cumulé −6,2 ; 127,6 | | tableau 21, p. 91 |

Non trouvé : charge d'intérêts annuelle 2027, 2028 et 2030 ; horizon 2030 pour la dette. Le rapport est antérieur au RESF d'octobre : son 2026 (dette 118,5 %, intérêts 77,4 Md€, déficit cible 5,0 %) diffère du RESF (119,3 %, ≈ 79 Md€, 5,4 %), l'écart étant une question de millésime de prévision et non de contradiction.

### 6b. Commission européenne, Debt Sustainability Monitor

Source : Commission européenne, DG ECFIN, « Debt Sustainability Monitor 2025 », Institutional Paper 332, publié début 2026 (la date exacte « février 2026 » vient du résumé de l'outil, non vérifiée) (https://economy-finance.ec.europa.eu/document/download/39b3b61d-42c1-46d7-8088-0aad82e8731e_en?filename=ip332_en.pdf). Lecture primaire (100 000 premiers caractères sur 1 048 904), via résumé WebFetch. Définition : dette brute Maastricht ; scénario de base « sans changement de politique budgétaire » (solde primaire structurel maintenu à son niveau de 2026 jusqu'en 2036, hors coût du vieillissement ; les ajustements promis dans les plans à moyen terme au-delà de 2026 ne sont pas pris en compte).

| France | Valeur |
|---|---|
| Dette 2025 (point de départ du document) | 116,3 % du PIB |
| Dette 2036, scénario de base | 144,0 % du PIB (sommet en 2036) |
| Autres scénarios déterministes, 2036 | SPB historique 146,1 ; SPB bas 148,9 ; r−g défavorable 155,6 ; stress financier 146,7 (calcul de l'outil : base + écart, à confirmer) |
| Risque à moyen terme | élevé ; long terme : moyen |
| Référence | tableau 2.2, p. 27 ; carte de chaleur, tableau 2, p. 10 |

Attention : la dette de départ 116,3 % (prévision de la Commission, automne 2025) diffère des 115,7 % de l'Insee ; ne pas additionner les deux sources sur la même courbe sans recalage.

## Item 7. COR, rapport annuel de juin 2026

Sources : Conseil d'orientation des retraites, « Rapport annuel, juin 2026 » : synthèse (https://www.cor-retraites.fr/sites/default/files/2026-06/Synth%C3%A8se_RA_2026.pdf) et partie 2, chapitre 1 (https://www.cor-retraites.fr/sites/default/files/2026-06/RA_Part2_Chap1.pdf). Lecture primaire, via résumé WebFetch ; les deux documents concordent. Définition : dépenses du système de retraites en % du PIB, scénario de référence du COR.

| Grandeur | Valeur | Page / figure |
|---|---|---|
| Dépenses de retraite, 2025 | 14,1 % du PIB | synthèse p. 1-3 ; chap. 1 p. 65 et 69 (figure 2.2) |
| 2030 | 14,1 % | synthèse p. 3 ; chap. 1 p. 69 |
| 2045 | 14,2 % | synthèse p. 3 ; chap. 1 p. 69 |
| 2070 | 15,3 % (soit +1,2 pt sur la période) | synthèse p. 1-3 ; partie 2 chap. 3 p. 93 pour le +1,2 pt |
| 2040 et 2050 | non trouvé en texte (lisibles uniquement sur le graphique, figure 2.2) | |
| Solde du système, scénario de référence | 2025 : −0,2 % du PIB ; 2030 : −0,2 pt (≈ 6,8 Md€) ; 2045 : −0,9 pt ; 2070 : −2,4 pts | partie 2 chap. 3, p. 91 et 94 |
| Sensibilités 2070 | productivité 1,0 % : 14,5 % ; 0,4 % : 16,1 % (publiés) ; autres écarts de la synthèse p. 17-18 : fécondité ±1 pt, espérance de vie −1 pt, chômage −0,3/+0,4 pt | synthèse p. 17 |
| Effet de la suspension de la réforme de 2023 | environ 1,8 Md€ par an en moyenne, en régime annuel, jusqu'en 2032 ; pas d'effet séparé chiffré sur la part du PIB ni sur le solde | synthèse p. 1-2 et 11-12 |
| Âge moyen de départ | 63,1 ans en 2025, 64,6 en 2070 (suspension incluse) ; pas de contrefactuel sans suspension | synthèse p. 5 |

Précisions : jusqu'en 2045 les effets démographiques favorables compensent le coût de la suspension, selon la synthèse (p. 11-12). L'effet sur les âges de départ des générations 1964 à 1968 s'éteint en 2033 (chap. 1, p. 76, note 72). Le chiffre de 1,8 Md€ vient d'un résumé automatique de la synthèse ; à relire sur le PDF avant usage dans le moteur.

## Collecte du 17 novembre

Règle suivie : aucune valeur n'est complétée par estimation ; « non trouvé » signale ce qui a été essayé. Les outils web ne rendent que des résumés de pages : « lecture primaire » signifie que le document de l'éditeur a été ouvert via WebFetch (résumé automatique, pas relecture manuelle du PDF) ; « secondaire » signifie un agrégateur ou la presse.

### Point 1. Prévisions indépendantes pour la France

Millésimes réellement obtenus (le plus récent trouvé pour chaque institution) : Banque de France, projections intermédiaires de septembre 2026 ; Commission européenne, prévisions de printemps 2026 (les prévisions d'automne 2026 n'ont pas été trouvées : la page pays de la Commission affichait encore le printemps et la recherche web n'a renvoyé aucune publication d'automne 2026) ; OCDE, Perspectives économiques n° 119 de juin 2026 (celui de décembre 2026 n'est pas paru) ; FMI, WEO d'octobre 2026 lu uniquement via un agrégateur.

| Institution | Source (éditeur, date) | PIB réel 2026 / 2027 | Inflation 2026 / 2027 | Déficit APU 2026 / 2027 | Dette APU 2026 / 2027 | Lecture |
|---|---|---|---|---|---|---|
| Banque de France | « Projections macroéconomiques intermédiaires, septembre 2026 », 15 sept. 2026, p. 1 et p. 2-4 (https://www.banque-france.fr/system/files/2026-09/Projections_macroeconomiques_Septembre_2026.pdf) | 0,4 % / 0,9 % (2028 : 1,2 %) | IPCH : 2,3 % / 1,9 % (2028 : 1,6 %) | non publié dans ce document | non publié dans ce document | primaire ; tableaux de l'annexe (p. 7) non lisibles dans l'extraction |
| Commission européenne | Page pays France, « Spring 2026 Economic Forecast », 21 mai 2026 (https://economy-finance.ec.europa.eu/economic-surveillance-eu-member-states/country-pages-including-country-reports/france/economic-forecast-france_en) | 0,8 % / 1,1 % | « headline » 2,4 % / 1,8 % ; le document de synthèse de printemps utilise l'IPCH, la page pays ne le dit pas | −5,1 % / −5,7 % du PIB | 118,1 % / 120,2 % du PIB | primaire (page pays) ; numéros de page sans objet |
| OCDE | « OECD Economic Outlook, Volume 2026 Issue 1 », chapitre France, juin 2026 (https://www.oecd.org/en/publications/oecd-economic-outlook-volume-2026-issue-1_2d1956f0-en/full-report/france_ad7164c1.html) | 0,7 % / 0,8 % | non trouvé (seule l'inflation d'avril 2026, 2,5 %, est citée) | −5,0 % / −4,6 % | « 121 % », année non précisée dans le texte lu | primaire ; définition des soldes (Maastricht ou SCN) non précisée |
| FMI | WEO octobre 2026, données reprises par statisticsoftheworld.com (https://statisticsoftheworld.com/country/france/forecast) | 0,4 % / 0,7 % | IPC moyen : 2,4 % (2026) ; 2027 non trouvé | non trouvé | 118,5 % (2026) ; 2027 non trouvé | secondaire ; le millésime n'est pas explicitement rattaché à la page. La page WEO du FMI consultée était un aperçu « bientôt » sans chiffres France ; les consultations Article IV (mai-juillet 2026) n'ont pas été lues |

Désaccord à signaler : un article de presse (cbnews.fr, mai 2026) donne 0,9 % pour la croissance 2027 de la Commission, contre 1,1 % sur la page de la Commission. J'ai retenu la page de la Commission. La médiane 2027 est la même dans les deux cas (voir ci-dessous).

Médianes (valeurs triées, médiane = moyenne des deux valeurs centrales quand n est pair) :

| Variable | Valeurs disponibles | Calcul | Médiane | Remarque |
|---|---|---|---|---|
| PIB 2026 | 0,4 (BdF) ; 0,4 (FMI) ; 0,7 (OCDE) ; 0,8 (CE) | (0,4 + 0,7) / 2 | 0,55 % | n = 4, dont un secondaire |
| PIB 2027 | 0,7 (FMI) ; 0,8 (OCDE) ; 0,9 (BdF) ; 1,1 (CE) | (0,8 + 0,9) / 2 | 0,85 % | avec 0,9 pour la CE : 0,7 ; 0,8 ; 0,9 ; 0,9, soit 0,85 aussi |
| Inflation 2026 | 2,3 (BdF, IPCH) ; 2,4 (CE) ; 2,4 (FMI, IPC) | valeur centrale | 2,4 % | n = 3 ; mélange IPCH et IPC ; OCDE manquant |
| Inflation 2027 | 1,8 (CE) ; 1,9 (BdF, IPCH) | (1,8 + 1,9) / 2 | 1,85 % | n = 2 seulement : ce n'est pas une médiane de quatre sources |
| Déficit 2026 | −5,1 (CE) ; −5,0 (OCDE) | (5,0 + 5,1) / 2 | −5,05 % du PIB | n = 2 |
| Déficit 2027 | −5,7 (CE) ; −4,6 (OCDE) | (4,6 + 5,7) / 2 | −5,15 % du PIB | n = 2 ; écart de 1,1 pt entre les deux sources, la moyenne n'a guère de sens |
| Dette 2026 | 118,1 (CE) ; 118,5 (FMI, secondaire) | (118,1 + 118,5) / 2 | 118,3 % du PIB | n = 2 ; la valeur OCDE (121 %) est exclue faute d'année |
| Dette 2027 | 120,2 (CE) seul | n/a | non calculable | |

Réserves : les millésimes diffèrent (mai à octobre 2026) et la Commission comme l'OCDE précèdent le choc énergétique plus récent pris en compte par la Banque de France ; à rafraîchir quand les prévisions d'automne de la Commission paraîtront.

### Point 2. Croissance potentielle de la France

| Source | Valeur | Années | Lecture |
|---|---|---|---|
| Banque de France, Eco Notepad n° 455, « France's potential growth following the Covid crisis », A. Devulder, 8 juillet 2026, p. 3 (https://www.banque-france.fr/system/files/2026-07/Billet_455_VE.pdf) | la plupart des institutions attendent 0,9 % à 1,2 % par an | 2026-2028 | primaire pour le billet, mais secondaire pour les institutions citées ; les valeurs par institution figurent seulement dans le graphique 2 (non lisible en texte) |
| Commission européenne (AMECO, mai 2026, cité dans le graphique 2 du billet) | valeur propre non trouvée | n/a | la page pays et la synthèse de printemps ne donnent ni écart de production ni croissance potentielle ; AMECO n'a pas été consulté directement (pas d'URL vue) |
| OCDE (Economic Outlook de décembre 2025, cité dans le même graphique) | valeur propre non trouvée | n/a | le chapitre France de juin 2026 lu en partie ne donne pas de croissance potentielle ni d'écart de production |

### Point 3. Rendement statique d'un point de taux d'IS

Aucun chiffre officiel par point n'a été trouvé. Données disponibles :

| Élément | Valeur | Source |
|---|---|---|
| Taux normal de l'IS | 25 % depuis 2022 ; taux réduit 15 % pour les PME (chiffre d'affaires ≤ 10 M€, dans la limite de 42 500 € de bénéfice) | Voies et moyens tome I, PLF 2026, « Évaluations des recettes », p. 18 (https://www.assemblee-nationale.fr/dyn/contenu/visualisation/1087930/file/PLF%202026%20-%20V%26M%20TI%20-%20Evaluations%20des%20recettes.pdf) |
| IS net 2025 (révisé) | 58,2 Md€ (LFI 2025 : 53,0 Md€) | idem, p. 6 et 20 |
| IS net 2026 (prévision PLF) | 59,0 Md€ | idem, p. 6 et 20 |

Essais : recherche web sur « rendement d'un point de taux d'IS » ; lecture des 100 000 premiers caractères sur 228 050 du Voies et moyens PLF 2026 (aucune sensibilité par point). Non consultés : PLF 2027, DG Trésor, CPO, Cour des comptes, FIPECO. Ne pas diviser 59,0 Md€ par 25 pour obtenir un « point » : l'assiette est hétérogène (taux réduit, contribution exceptionnelle, crédits d'impôt), ce calcul ne serait pas une donnée officielle.

### Point 4. Rendement d'un point de cotisations sociales employeur

Aucun chiffre officiel récent n'a été trouvé (PLFSS, DSS, HCFiPS). Seule une donnée ancienne et secondaire :

| Champ | Valeur (2012) | Source |
|---|---|---|
| Un point de cotisation, régime général : AT et vieillesse déplafonnée 5,27 Md€ ; vieillesse plafonnée 4,43 ; maladie 6,54 ; famille 7,44 | année 2012 | CFDT retraités, page publiée le 20/12/2013 (https://www.xn--cfdt-retraits-mhb.fr/Valeur-d-un-point-de-cotisation-deplafonnee-entre-5-3-et-7-4-milliards), qui cite le rapport de la Commission des comptes de la sécurité sociale de septembre 2013 ; secondaire |

Réserves : la page ne précise pas si le champ est patronal seul ou patronal et salarié, ni qui a fait le calcul ; ces valeurs sont périmées (masse salariale 2012) et ne doivent pas entrer dans le simulateur. Essais : recherches web sur les annexes du PLFSS 2026 et sur les publications HCFiPS, Cour des comptes et FIPECO ; aucun document n'a été ouvert (pistes repérées : annexe 1 du PLFSS 2026, HCFiPS « état des lieux du financement » 2023).

### Point 5. Système suédois de comptes notionnels (NDC)

| Paramètre | Valeur | Source et lecture |
|---|---|---|
| Taux de cotisation vers le compte notionnel (pension de revenu) | 16 points sur 18,5 % de la base ; les 2,5 points restants vont à la pension par capitalisation (premium pension) | Pensionsmyndigheten, Orange Report 2020, chap. 4 (https://www.pensionsmyndigheten.se/statistik/publikationer/orange-report-2020/4-how-the-national-pension-system-works.html) ; Ministère suédois des Finances, « The Swedish pension system in brief », 27 nov. 2025, p. 1 (https://government.se/contentassets/c40b1026b5f64cba929445d37d0b3f12/the-swedish-pension-system-in-brief.pdf) |
| Règle d'indexation | soldes des comptes indexés sur l'indice de revenu (croissance du revenu moyen) ; rendement moyen depuis 1995 : 3,1 % | Orange Report 2020, chap. 4 |
| Base du diviseur de rente | espérance de vie restante à l'âge de liquidation (hommes et femmes confondus) et taux d'intérêt anticipé de 1,6 % ; exemple : 65 ans, diviseur 17,07. Après liquidation, la pension est réindexée chaque année selon l'écart entre l'indice de revenu et 1,6 % | Orange Report 2020, chap. 4 |
| Mécanisme d'équilibrage automatique | ratio d'équilibre = actifs / engagements ; s'il est inférieur à 1,0000, l'indexation passe à un « indice d'équilibre » (ratio lissé) plus faible ; retour à l'indice de revenu après rattrapage. Ratio fin 2020 : 1,0824 | Orange Report 2020, chap. 4 ; le document du ministère ne traite pas le mécanisme |

Références complémentaires non lues : Holzmann, Palmer et Robalino (dir.), « Nonfinancial Defined Contribution Pension Schemes in a Changing Pension World », vol. 1, Banque mondiale, 2013, notice du catalogue (https://openknowledge.worldbank.org/entities/publication/0a7f6b2c-7cfc-5989-a3dc-2c6d7e657c63) ; Orange Report 2025 (https://www.pensionsmyndigheten.se/statistik/publikationer/orange-rapport-2025/orange-rapport-2025.pdf), à consulter pour les paramètres à jour. Le chapitre cité est du millésime 2020 : taux, diviseur et ratio d'équilibre sont à revérifier sur le rapport le plus récent, et les valeurs OCDE (Pensions at a Glance) n'ont pas été consultées.

## Référence du moteur v2 face aux repères (calcul du 17 novembre 2026, branche engine/v2)

Moteur : leviers nuls, taux à l'émission pondéré (3,81 %), β = 3 pb par point de dette. Repères : comparateurs, jamais cibles. **Placeholders encore actifs : rendements BTF, 2–8 ans et 10 ans et plus (« à collecter »), dérive santé et autres dépenses (0), inflation après 2027, rendements des cotisations et de l'IS, taux avant réforme.** La référence n'est pas apte à la décision tant qu'ils ne sont pas remplacés.

| Année | Dette (% PIB) moteur | Repères dette | Solde (% PIB) moteur | Repères solde | Intérêts moteur (Md€ ; % PIB) | Repères intérêts |
|---|---|---|---|---|---|---|
| 2026 | 117,7 | Gouv. 119,3 ; Cour 118,5 | −5,28 | Gouv. −5,4 ; CE −5,1 | 76,5 ; 2,48 | Gouv. 2,6 % ; Cour 77,4 Md€ ; CE 2,6 % |
| 2027 | 120,2 | Gouv. 121,7 | −5,63 | Gouv. −5,0 ; CE −5,7 | 89,5 ; 2,83 | Gouv. 2,9 % ; CE 2,8 % |
| 2029 | 125,7 | Cour 120,1 (plafonds) à 124,3 (dérive) | −6,28 | Cour −3,2 (plafonds) à −5,4 (dérive) | 116,4 ; 3,48 | Cour « plus de 100 Md€ » |
| 2030 | 128,8 | non trouvé | −6,60 | non trouvé | 130,6 ; 3,80 | non trouvé |
| 2036 | 152,4 | CE (DSM) 144,0 | −8,65 | non trouvé | 236,4 ; 5,81 | non trouvé |
| 2040 | 173,5 | non trouvé | −10,40 | non trouvé | 343,3 ; 7,53 | non trouvé |
| 2056 | 366,3 | non trouvé | −32,67 | non trouvé | 2 091,9 ; 29,28 | non trouvé |

Lecture : 2056 est une trajectoire explosive (taux moyen 8,8 %, taux à l'émission 10,6 %), pas une prévision ; elle montre l'effet de β = 3 pb par point sur 30 ans sans correction budgétaire. Le DSM 144,0 % suppose un solde primaire structurel constant, hors vieillissement.

### Écart de solde primaire (non comblé)

| % du PIB | 2026 | 2027 |
|---|---|---|
| Moteur (référence, politique inchangée) | −2,80 | −2,80 |
| Gouvernement (RESF 2027 : solde − intérêts) | −2,8 (−5,4 + 2,6) | −2,1 (−5,0 + 2,9) |
| Commission européenne, printemps 2026, politique inchangée (calcul : solde − intérêts ; la Commission ne publie pas le solde primaire sur sa page pays) | −2,5 (−5,1 + 2,6) | −2,9 (−5,7 + 2,8) |

Écart moteur − Gouvernement : 0,0 en 2026 et −0,7 point en 2027 (le Gouvernement suppose un effort de 0,7 point de PIB en 2027 que le moteur n'inclut pas, par construction). Écart moteur − Commission : −0,3 en 2026 et +0,1 en 2027. Le moteur reste donc proche de la trajectoire « politique inchangée » de la Commission. Millésime de la Commission : printemps 2026 (21 mai 2026) ; les prévisions d'automne n'ont pas été trouvées.

### Taux à l'émission (sources de la collecte du 17 novembre 2026)

- Parts : BTF 7,6 % (220 / 2 882 Md€ de dette négociable, AFT août 2026 p. 3) ; OAT 2–8 ans 42,6 % ; OAT 10 ans et plus 49,8 % (émission brute d'OAT janv.–juil. 2026, p. 2, ligne non étiquetée de 12,1 Md€ répartie au prorata).
- Rendements, tous « à collecter » : BTF 2,5 % ; 2–8 ans 3,35 % (interpolé) ; 10 ans et plus 4,4 % (10 ans 4,23 % et 20 ans 4,74 % à l'adjudication du 3 septembre 2026, presse secondaire ; 30 ans non trouvé, 5,0 % supposé). Aucun rendement à 3 mois, 5 ans ou 30 ans n'a été trouvé dans les bulletins de l'AFT ni auprès de la Banque de France (outils web limités).
- Contrôle croisé : taux moyen à l'émission 2025 de l'AFT : 2,73 % (ensemble) ou 3,14 % (taux fixe de plus d'un an, hors indexés) ; 2026 non publié. Le taux pondéré du modèle (3,81 %) est supérieur car les rendements ont monté en 2026 (10 ans : 3,45 % en février, 4,23 % début septembre).

## Recalcul après remplacement de placeholders (branche data/placeholders-1, 17 novembre 2026)

Rendements retenus : BTF 3 mois 2,79 % ; OAT ≈ 5 ans 4,10 % ; OAT 10 ans et plus 4,86 % (secondaire) ; taux pondéré à l'émission 4,38 % ; dérive santé 0,00625 pt de PIB par an.

| Année | Dette (% PIB) | Solde (% PIB) | Intérêts (Md€ ; % PIB) |
|---|---|---|---|
| 2026 | 117,8 | −5,39 | 79,7 ; 2,59 |
| 2027 | 120,5 | −5,84 | 95,9 ; 3,03 |
| 2029 | 126,7 | −6,68 | 129,2 ; 3,86 |
| 2036 | 158,5 | −9,78 | 280,2 ; 6,88 |

Encore placeholders : dérive des autres dépenses, rendements de l'IS et des cotisations, taux avant réforme de l'IR, inflation après 2027, taux moyen à l'émission 2026 de l'AFT.

## Tests de comparaison à hypothèses homogènes (21 novembre 2026) : contrôles de plausibilité, non validation

Suite de tests dédiée : `src/engine/__tests__/benchmarks.test.js`. Principe appliqué (`docs/model-note.md`, §5) : **comparateurs, jamais cibles**. Aucun taux n'est rétro-ajusté pour reproduire une cible ; lorsque la courbe de taux complète d'un comparateur n'est pas publiée dans les sources lues, elle est signalée **non trouvé** et remplacée par une fourchette de sensibilité transparente correspondant au millésime de marché du document.

**Portée de ces tests (lecture honnête).** Ce sont des contrôles de plausibilité de la décomposition, non une validation du moteur. (a) Le module de test `primaryShiftModule` injecte la trajectoire de solde primaire propre au comparateur (effort RESF de +0,7 pt en 2027, dégradation de −0,4 pt de la Commission) : l'accord sur le solde est donc obtenu par construction, et seules la dynamique des intérêts et celle de la dette sont réellement testées. (b) Les hypothèses de taux que le comparateur ne publie pas (OAT 2–8 ans du RESF, bande BTF / OAT 2–8 ans de la Cour, fourchette de `i*` pour la Commission et le DSM) sont déduites des chiffres d'intérêts et de dette du comparateur lui-même : un accord sur les intérêts montre que la décomposition est cohérente, il ne valide pas le taux. Les valeurs du moteur figées sans chiffre de comparateur (dette de référence 2026–2036, intérêts 2029, étape 4 de la cascade DSM) sont regroupées dans le bloc « instantanés de non-régression » de `benchmarks.test.js` : elles détectent un changement du moteur, elles ne valident rien.

### Hypothèses de taux et de cadrage des quatre comparateurs

| Comparateur (millésime) | Macro & solde primaire propres | Hypothèses de taux retenues pour le test | Mode de lecture / statut |
|---|---|---|---|
| **Gouvernement — RESF 2027 / PLF 2027** (6 oct. 2026) | `g = 0,5 %` (2026), `1,0 %` (2027), `1,2 %` (pot.) ; IPC `π = 2,1 % / 1,8 %` ; SPB `−2,8 %` (2026) puis `−2,1 %` (2027, soit **+0,7 pt** d'effort primaire) | `β = 0` ; BTF 3 mois ≈ **3,0 %** ; OAT 10 ans **4,2 %–4,3 %** (4,3 % moy. 2027 ; affecter le 10 ans à `dette.y_long` [10 ans et plus] sous-estime légèrement la tranche 10 ans+ sur une courbe pentue) ; OAT 2–8 ans : **non trouvé** séparément → fourchette `3,7 %–3,9 %` (centre `3,8 %`, soit `i* = 3,99 %`) | Macro/finances publiques : primaire (PDF via résumé WebFetch, item 5). Taux BTF/OAT 10 ans (Sénat / Covéa / analyses PLF 2027) : **résumé de recherche web (non relu à l'œil sur le document primaire)**. OAT 2–8 ans : **non trouvé** (fourchette) |
| **Cour des comptes** (*La situation et les perspectives des finances publiques*, 22 juin 2026) | Millésime de printemps (antérieur au RESF) : déficit cible 2026 `−5,0 %`, intérêts `2,5 %` (`77,4 Md€`), soit SPB printemps `−2,5 %` (les tests conservent la macro médiane nov. 2026 du moteur) | `β = 0` ; OAT 10 ans ≈ **3,9 %** fin 2026 (scénarios DG Trésor / Cour juin 2026 ; affecter le 10 ans à `dette.y_long` [10 ans et plus] sous-estime légèrement la tranche 10 ans+ sur une courbe pentue) ; courbe complète BTF / 2–8 ans / 10 ans+ 2026–2029 : **non trouvé** dans le texte lu → fourchette printemps à taux long `3,9 %` (`BTF 2,3–2,7 %`, `2–8 ans 3,2–3,6 %`, soit `i* = 3,48 %–3,68 %`) + borne haute uniforme `3,9 %` | Repères dette/intérêts : primaire (PDF via résumé WebFetch, item 6a). OAT 10 ans `3,9 %` : **résumé de recherche web (non relu à l'œil sur le document primaire ; non trouvé dans les tableaux lus à l'item 6a)**. Courbe complète : **non trouvé** (fourchette) |
| **Commission européenne — Spring 2026 Economic Forecast** (21 mai 2026) | `g = 0,8 % / 1,1 %` ; inflation `2,4 % / 1,8 %` ; SPB `−2,5 %` (2026) puis `−2,9 %` (2027, soit **−0,4 pt** de dégradation à politique inchangée) | `β = 0` ; courbe technique de rendement de la Commission : **non trouvé** sur la page pays → fourchette de printemps mai 2026 `i* ∈ [3,3 % ; 3,8 %]` | Macro/solde/dette/intérêts : primaire (page pays CE, collecte 17 nov.). Hypothèse de taux : **non trouvé** (fourchette) |
| **Commission européenne — Debt Sustainability Monitor 2025** (IP 332, févr. 2026) | Horizon 2025 → **2036** ; SPB constant dès 2026, **hors vieillissement** (`a_sante = 0`, retraites plates à `14,1 %`) ; recalage dette 2025 : **116,3 %** (CE automne 2025) vs 115,7 % Insee (**+0,6 pt**) | `β = 0` ; courbe annuelle des taux de marché (automne 2025) de la fiche pays France : **non trouvé** dans les 100 000 premiers caractères lus → fourchette automne 2025 `i* ∈ [3,3 % ; 3,8 %]` | Dette 2025 et 2036 : primaire (PDF partiel via résumé WebFetch, item 6b). Série annuelle de taux : **non trouvé** (fourchette) |

### Tableau de réconciliation : moteur par défaut vs hypothèses homogènes vs repères publiés

| Comparateur & horizon | Grandeur | Moteur par défaut (`i* = 4,38 %`, `β = 3`) | Moteur à hypothèses homogènes (fourchette) | Repère publié | Écart résiduel et explication nommée |
|---|---|---|---|---|---|
| **RESF 2027 — 2026** | Intérêts (`% PIB` ; `Md€`) | `2,59 %` (`79,7`) | `2,52 %–2,53 %` (`77,3–77,8`) | `2,6 %` (`≈ 79,3`) | `−0,07 pt` (structure de maturités / arrondi) |
| **RESF 2027 — 2026** | Solde (`% PIB`) | `−5,39 %` | `−5,32 %` à `−5,33 %` | `−5,4 %` | `+0,07 pt` (idem intérêts) |
| **RESF 2027 — 2026** | Dette (`% PIB`) | `117,8 %` | `118,1 %` (`118,08–118,10`) | `119,3 %` | `−1,21 pt` = déflateur E1 (`−0,67 pt`) + SFA nul E11 (`−0,48 pt`) + intérêts (`−0,06 pt`) |
| **RESF 2027 — 2027** | Intérêts (`% PIB` ; `Md€`) | `3,03 %` (`95,9`) | `2,89 %–2,92 %` (`91,1–92,0`) | `2,9 %` (`≈ 90,9`) | `0,00 pt` au centre (`2,90 %`, `91,5 Md€`) |
| **RESF 2027 — 2027** | Solde (`% PIB`) | `−5,84 %` | `−5,71 %` (sans effort) / **`−4,99 %` à `−5,02 %`** (+0,7 pt) | `−5,0 %` | `−0,01 pt` au centre une fois l'effort `+0,7 pt` isolé |
| **RESF 2027 — 2027** | Dette (`% PIB`) | `120,5 %` | `119,9 %` (+0,7 pt) | `121,7 %` | `−1,82 pt` = déflateur 2026–2027 (`−0,72 pt`) + SFA implicites 2026–2027 (`−1,06 pt`) |
| **Cour des comptes — 2026** | Intérêts (`Md€` ; `% PIB`) | `79,7` (`2,59 %`) | `74,7–75,8` (`2,42 %–2,46 %`) ; `77,0` (`2,50 %`) à `3,9 %` unif. | `77,4` (`2,5 %`) | Proche au millésime de taux printemps (bande de taux inférée) |
| **Cour des comptes — 2029** | Intérêts (`Md€`) | `129,2` (`3,86 %`) | **`107,9–112,2`** (`3,23 %–3,36 %`) | **`> 100 Md€`** | `−17` à `−21 Md€` vs nov. 2026 ; cohérent avec le seuil `> 100 Md€` |
| **Cour des comptes — 2029** | Dette (`% PIB`) | `126,7 %` | `125,2 %–125,5 %` (SPB `−2,8 %`) ; **`124,1 %`** (SPB printemps `−2,5 %`, macro médiane nov. 2026) | **`124,3 %`** (« dérive ») | `−0,2 pt` avec SPB et taux de printemps (solde 2029 `−5,78 %` vs `−5,4 %` Cour ; `120,1 %` « plafonds » suppose un ajustement) |
| **CE printemps — 2026** | Intérêts / Solde (`% PIB`) | `2,59 %` / `−5,39 %` | `2,39 %–2,48 %` / `−4,89 %` à `−4,98 %` | `2,6 %` / `−5,1 %` | `−0,12` à `−0,21 pt` (courbe technique CE non publiée) |
| **CE printemps — 2027** | Intérêts / Solde (`% PIB`) | `3,03 %` / `−5,84 %` | `2,63 %–2,81 %` / **`−5,54 %` à `−5,71 %`** (−0,4 pt SPB) | `2,8 %` / `−5,7 %` | `±0,01 pt` à `i* = 3,8 %` une fois le décalage SPB `−0,4 pt` isolé |
| **CE printemps — 2026 / 2027** | Dette (`% PIB`) | `117,8 %` / `120,5 %` | `117,0–117,1 %` / **`119,2–119,5 %`** | `118,1 %` / `120,2 %` | Écart 2026 (`−1,0 pt`) = déflateur/SFA (E1/E11) ; hausse 2026→2027 (`+2,3 pt` vs `+2,1 pt`) cohérente |
| **CE DSM 2025 — 2036** | Dette (`% PIB`) | `158,5 %` (`+14,5 pt`) | `146,0 %–150,4 %` (SPB `−2,8 %`) ; **`144,3 %`** (SPB `−2,5 %`, `i* = 3,5 %`) | **`144,0 %`** | Décomposition complète ci-dessous |

### Décomposition en cascade de l'écart 2036 face au DSM 2025 (`158,5 %` vs `144,0 %`)

1. **Moteur par défaut** (`i* = 4,38 %`, `β = 3`, vieillissement actif, dette 2025 Insee `115,7 %`) : **`158,49 %`** (intérêts `6,88 %` du PIB), soit **`+14,49 pt`** au-dessus du DSM.
2. **Suppression de la prime endogène `β = 3 → 0`** : `158,49 % → 155,49 %` (**`−3,00 pt`**, intérêts `5,96 %`).
3. **Suppression du vieillissement** (`a_sante = 0`, retraites COR plates à `14,1 %`) : `155,49 % → 154,99 %` (**`−0,50 pt`** ; cumul `β` + vieillissement = **`−3,50 pt`**, soit `155,0 %`).
4. **Recalage de la dette initiale 2025** (`115,7 % → 116,3 %`, prévision CE automne 2025) : `154,99 % → 155,71 %` (**`+0,72 pt`** composé sur 11 ans).
5. **Millésime de taux automne 2025 (`i* ∈ [3,3 % ; 3,8 %]` vs `4,38 %` nov. 2026)** : `155,71 % → 145,99 %–150,40 %` (**`−5,31` à `−9,72 pt`**, intérêts `4,32 %–5,06 %` du PIB, taux implicite `3,11 %–3,55 %`).
6. **Millésime de SPB 2026 ou croissance nominale long terme** : passer au SPB 2026 de la Commission (`−2,5 %` au lieu du RESF automne `−2,8 %`) retranche **`−3,42 pt`** (atterrissage **`144,3 %`** à `i* = 3,5 %`) ; alternativement, une croissance nominale de long terme `g = 1,1 %`, `π = 2,0 %` retranche **`−3,39 pt`** (`144,3 %`, exactement `144,35 %`). En combinant *simultanément* SPB CE (`−2,5 %`) et macro CE (`g = 1,1 %`, `π = 2,0 %`), la dette 2036 atterrit à **`143,5 %`** à `i* = 3,8 %` (`141,0 %` à `3,5 %`). Une fois les hypothèses alignées, l'écart de dette au DSM se ramène à des hypothèses nommées ; c'est un contrôle de plausibilité, non une validation (voir « Portée de ces tests » ci-dessus).

### Mécanisme structurel d'année 0 (2026) : déflateur du PIB (E1) et ajustements stock-flux (E11)

Deux choix assumés du moteur expliquent systématiquement l'écart d'environ **`−1,0` à `−1,2 pt`** de dette/PIB dès la première année (2026) face au RESF (`118,1 %` vs `119,3 %`) et à la Commission (`117,0 %` vs `118,1 %`) :
- **IPC au lieu du déflateur du PIB dans E1** : `Yb(2026) = 2 991 × (1 + g + π)` applique l'inflation à la consommation (`2,1 %` dans le RESF, `2,4 %` dans la prévision CE) au PIB nominal. Pour le RESF 2027, cela donne `3 068,8 Md€` contre `3 051 Md€` publiés (`+0,58 %`), car le déflateur implicite du PIB du RESF n'est que de `1,51 %`. Cet écart de dénominateur abaisse mécaniquement le ratio dette/PIB 2026 de **`−0,67 pt`** (et de **`−0,72 pt`** cumulés en 2027).
- **Ajustements stock-flux nuls (`SFA = 0`) dans E11** : la comptabilité de dette du RESF implique un SFA positif d'environ **`+0,48 pt` de PIB en 2026** (`≈ +14,6 Md€`, puisque `(3 460,5 + 5,4 % × 3 051) / 3 051 = 118,82 %` contre `119,3 %` publiés) et **`+0,60 pt` en 2027** (`≈ +18,7 Md€`, puisque `(119,3 % × 3 051 + 5,0 % × 3 135) / 3 135 = 121,10 %` contre `121,7 %`). Comme E11 ne modélise pas de SFA, ces `−0,48 pt` (2026) et `−1,06 pt` cumulés (2027) s'ajoutent directement à l'écart de déflateur pour expliquer l'intégralité de l'écart de ratio dette/PIB.

