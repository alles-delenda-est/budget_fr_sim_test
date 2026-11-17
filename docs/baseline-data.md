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

