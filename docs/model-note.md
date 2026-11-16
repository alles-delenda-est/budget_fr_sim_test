# Note de modèle — Simulateur Budget France

**Statut : brouillon v0.2, en attente de validation par Patrick. Aucun code moteur ne doit être écrit avant cette validation.**

16 novembre 2026. Rédaction interrompue par une limite d'usage : plusieurs sources primaires n'ont pas pu être relues. Elles sont signalées « non trouvé » ou « de mémoire » et récapitulées en section 10.

Conventions : montants en Md€ courants ; ratios en % du PIB ; taux en décimal dans les équations, en % à l'affichage. « non trouvé » : valeur cherchée sans succès, avec ce qui a été tenté. « de mémoire » : non relue dans la source le jour de la rédaction, à vérifier dans la table des citations. « calcul » : dérivée des chiffres sourcés de la même ligne.

## 1. Périmètre et année de base

### 1.1 Périmètre

Toutes administrations publiques (APU) en comptabilité nationale, en trois blocs : administrations centrales (État et ODAC), sécurité sociale (ASSO), collectivités locales (APUL). Le solde et la dette sont ceux de Maastricht. Les transferts entre blocs sont consolidés et affichés une seule fois.

Comptes 2025 (Insee, provisoires) :

| Md€, 2025 | Centrales (dont État) | Locales | Sécurité sociale | Total APU consolidé |
|---|---|---|---|---|
| Dépenses | 681,1 (607,7) | 335,5 | 803,2 | 1 714,1 |
| Consommations intermédiaires | 61,6 (36,1) | 61,1 | 40,8 | 163,5 |
| Rémunérations | 184,9 (153,8) | 97,0 | 88,2 | 370,0 |
| Intérêts | 53,3 (52,4) | 6,0 | 5,6 | 64,7 |
| Prestations sociales | 132,4 (130,6) | 31,4 | 607,2 | 771,0 |
| Investissement (FBCF) | 50,7 (16,7) | 70,7 | 10,8 | 132,2 |
| Autres, y c. transferts versés (calcul) | 198,2 | 69,3 | 50,6 | 212,7 |
| Solde | −130,3 (−128,1) | −15,6 | −6,7 | −152,5 |
| Recettes (calcul : dépenses + solde) | 550,8 | 319,9 | 796,5 | 1 561,6 |

Sources : dépenses, Insee, « Dépenses par administration publique en 2025 » [S1] ; soldes, Insee Première n° 2106 [S2]. La somme des trois blocs (1 819,8) dépasse le total consolidé de 105,7 Md€ : ce sont les transferts entre blocs (calcul).

Agrégats : PIB 2025 ≈ 2 991 Md€ (source secondaire [S3], cohérent avec 1 714,1 / 57,3 %) ; dépenses 57,3 % du PIB [S2] ; dette 3 460,5 Md€, soit 115,6 % (115,7 % après révision) [S4][S2].

Ce que ce tableau corrige : le modèle actuel additionne le budget de l'État (445 Md€) et les régimes de base (687 Md€), soit 66 % de la dépense publique, et les rapproche d'une dette toutes APU.

**Non trouvé :** recettes 2025 par impôt et par bloc (TVA, IR, IS, CSG, cotisations, fiscalité locale) ; dépenses par fonction (éducation, défense, santé, retraites). Tenté : Insee Première n° 2106 (erreur serveur), tableau Insee des impôts (page arrêtée à 2017). Où les prendre : tableaux Insee 3.2xx des comptes des APU 2025 [S5] et dépenses par fonction (COFOG) [S6].

### 1.2 Année de base

Proposition (décision D1) : ancrer les niveaux sur 2025, seule année observée en comptabilité nationale ; afficher 2026 comme « année en cours, prévision officielle » ; faire agir les leviers à partir de 2027.

Prévisions officielles retenues pour 2026–2027 (Gouvernement, PLF 2027, examinées par le HCFP, avis n° 2026-5 [S7]) :

| | 2026 | 2027 |
|---|---|---|
| Croissance en volume | 0,5 % | 1,0 % (jugée optimiste par le HCFP) |
| Inflation | non trouvé | 1,8 % |
| Déficit public | 5,4 % | 5,0 % |
| Dette | hausse de plus de 3,5 pts, soit ≈ 119,2 % (calcul) | ≈ 121,7–122 % |
| Croissance potentielle | 1,2 % | 1,2 % |

**Non trouvé :** niveaux 2026 en Md€ (PIB, charge d'intérêts, soldes par bloc) ; chiffres du projet de loi de fin de gestion 2026 (déposé le 4 novembre 2026). À lire dans le rapport économique, social et financier du PLF 2027.

### 1.3 Passage PLF/PLFSS → comptabilité nationale

Deux points d'ancrage sourcés pour 2025 :
- État : solde budgétaire −124,7 Md€ [S8] contre besoin de financement −128,1 Md€ [S2].
- Sécurité sociale : régimes de base et FSV −21,6 Md€ [S8] contre ASSO −6,7 Md€ [S2]. L'écart tient au champ : les ASSO incluent notamment l'Unédic, les régimes complémentaires, la Cades et les hôpitaux (de mémoire pour la liste).

Le détail ligne à ligne est **non trouvé** ; il figure dans le tableau Insee 3.108 (régime général → ASSO) et dans la clé de passage du solde de l'État [S4]. Le tableau de passage sera publié avec la note.

## 2. Équations

Indices : t = 0 pour 2026, t ≥ 1 à partir de 2027. Exposant b : trajectoire de référence (sans mesure nouvelle).

**E1 — PIB de référence.** `Yb(t) = Yb(t−1) × (1 + g + π)`, avec g la croissance potentielle et π l'inflation.

**E2 — Leviers.** Chaque levier j est exprimé par son effet ex ante sur le solde, en % du PIB : `a(j,t)`, positif s'il améliore le solde. `a(j,t) = rendement(j) × x(j) × rampe(j,t) / Y(base)`. Il reste constant en part de PIB (indexation), ce qui corrige l'érosion des leviers en euros courants du modèle actuel.

**E3 — Réponse comportementale (recettes).** Effet ex post = `(1 − θ(j)) × a(j,t)`. θ est le même à la hausse et à la baisse. θ = 0 pour les leviers de dépense. Voir 3.2.

**E4 — Effet de demande, en niveau, qui s'estompe.**
`yD(t) = − Σj m(j) × Σk≤t Δa(j,k) × λ^(t−k)`
où Δa(j,k) est la variation du levier l'année k, m(j) le multiplicateur d'impact et λ ∈ (0,1) la persistance. Une mesure permanente de 1 % du PIB réduit le PIB de m % la première année, puis l'écart se referme.
Vérification : multiplicateur cumulé sur T années = `m × (1 − λ^T) / ((1 − λ) × T)`. Avec m = 0,8, λ = 0,7, T = 10 : 0,26. Le pic vaut m. Le modèle actuel donne des valeurs de 5 à 98.

**E5 — Effet d'offre (optionnel).** `yS(t) = Σj σ(j) × a(j) × min(t / L(j), 1)`, effet permanent sur le niveau du PIB, atteint en L années. Valeur centrale proposée : σ = 0 (décision D2).

**E6 — PIB.** `Y(t) = Yb(t) × (1 + yD(t) + yS(t))`.

**E7 — Stabilisateurs automatiques.** Le solde varie de `ε × (yD(t) + yS(t))` points de PIB : ils jouent sur l'écart de niveau cumulé, pas sur la croissance d'une seule année.

**E8 — Solde primaire, en % du PIB de référence.**
`sp(t) = spb(t) + Σj (1 − θ(j)) × a(j,t) + ε × (yD(t) + yS(t))`
avec `spb(t) = spb(0) − d × t` si une dérive tendancielle d des dépenses est retenue (décision D7).

**E9 — Taux à l'émission.** `i_new(t) = i* + β × (dette/PIB(t−1) − dette/PIB(0))`, i* étant le taux de marché observé (ancre) et β la pente par point de dette.

**E10 — Taux moyen du stock.** `i_moy(t) = (1 − φ(t)) × i_moy(t−1) + φ(t) × i_new(t)`, avec `φ(t) = 1/M + max(0, ΔD(t−1)) / D(t−1)` : la part refinancée chaque année plus la dette nouvelle. M est la durée de vie moyenne.

**E11 — Intérêts et dette.** `INT(t) = i_moy(t) × D(t−1)` ; `D(t) = D(t−1) + INT(t) − sp(t) × Yb(t)`. Ajustements stock-flux nuls.

**E12 — Chômage (Okun).** `u(t) = ub(t) − κ × 100 × (yD(t) + yS(t))`, u en points, l'écart de PIB en décimal. Un PIB inférieur de 1 % relève le chômage de κ point.

Limites assumées : pas de modèle d'inflation ; pas de changement de régime des multiplicateurs ; élasticité unitaire des recettes au PIB dans la référence (le HCFP relève 0,8 pour 2027 [S7]) ; θ (base fiscale) et ε (cycle) sont deux canaux distincts, mais un recouvrement partiel est possible.

## 3. Rendements statiques des leviers

### 3.1 Un étalon officiel par levier

| Levier | Unité | Rendement statique | Source |
|---|---|---|---|
| TVA, taux normal | 1 pt | 7,5 Md€ | DG Trésor 2025, repris par Vie-publique [S9] |
| TVA, tous les taux | 1 pt | 11,4 Md€ nets | idem [S9] |
| CSG, toutes assiettes | 1 pt | 17 Md€ (2024) | FIPECO, 29 mai 2025 [S10] |
| Impôt sur le revenu | 1 % du produit | ≈ 1,0 Md€ (produit 2024 : 100 Md€ avant crédits, 91 après) | FIPECO [S10] |
| Cotisations patronales | 1 pt, tous salaires | 7 Md€ (DSS) à ≈ 10 Md€ (Ecalle), sources secondaires [S11] | à confirmer sur l'annexe PLFSS |
| Impôt sur les sociétés | 1 pt | **non trouvé** pour 2025 (tenté : FIPECO, note de 2021 ; recherche presse) | Voies et moyens, tome I |
| Dépenses par fonction | 1 % | 1 % de la ligne COFOG | Insee [S6], non lu |

Le levier IR devient une variation proportionnelle du barème, faute d'étalon officiel pour « 1 point d'IR ».

### 3.2 Une seule correction comportementale, symétrique

Pour un impôt de taux marginal τ sur une assiette B d'élasticité e au taux net (1 − τ) : `dB/B = −e × dτ / (1 − τ)`, d'où `dR = B × dτ × (1 − θ)` avec **θ = e × τ / (1 − τ)**.
Pour l'IS, avec une semi-élasticité η de l'assiette au taux : **θ = η × τ**.

Les coefficients hérités (0,9 ; 0,95 ; 0,7), qui se cumulaient avec les « efficacités », sont supprimés, ainsi que l'asymétrie hausse/baisse.

## 4. Table des paramètres

| Id | Central | Bas / haut | Source | Explication (réutilisable dans l'interface) |
|---|---|---|---|---|
| `macro.g` | 1,2 % | 0,8 / 1,5 | HCFP [S7] ; fourchette : hypothèse | Rythme auquel l'économie croît sans surchauffe. |
| `macro.pi` | 1,8 % | 1,5 / 2,2 | Prévision 2027 [S7] ; fourchette : hypothèse | Hausse annuelle des prix. |
| `dem.lambda` | 0,7 | 0,5 / 0,85 | Hypothèse de calibration, sans source directe | Part de l'effet sur l'activité qui subsiste l'année suivante. |
| `dem.m.achats_invest` | 0,9 | 0,5 / 1,3 | De mémoire (Coenen et al. 2012 ; Ramey 2019) | 1 € de commande publique en moins retire environ 0,9 € d'activité la première année. |
| `dem.m.remunerations` | 0,8 | 0,5 / 1,2 | De mémoire | Idem pour la masse salariale publique. |
| `dem.m.prestations` | 0,5 | 0,2 / 0,8 | De mémoire | Les ménages épargnent une partie des prestations. |
| `dem.m.tva` | 0,4 | 0,2 / 0,6 | De mémoire | Effet d'une hausse de TVA sur la consommation. |
| `dem.m.ir_csg` | 0,4 | 0,2 / 0,6 | De mémoire | Effet d'un impôt sur le revenu des ménages. |
| `dem.m.cotisations` | 0,4 | 0,2 / 0,7 | De mémoire | Effet du coût du travail à court terme. |
| `dem.m.is` | 0,2 | 0,1 / 0,4 | De mémoire | Effet de court terme de l'impôt sur les bénéfices. |
| `comp.theta.ir` | 0,15 | 0,05 / 0,30 | Formule 3.2 ; e de mémoire (0,1–0,4) | Part du rendement perdue parce que les contribuables s'adaptent. |
| `comp.theta.csg` | 0,10 | 0 / 0,20 | Formule 3.2 ; de mémoire | Idem, assiette large. |
| `comp.theta.cotis` | 0,15 | 0,05 / 0,30 | De mémoire | Idem, via l'emploi et les salaires. |
| `comp.theta.tva` | 0,03 | 0 / 0,08 | De mémoire | Fraude et achats transfrontaliers. |
| `comp.theta.is` | 0,25 | 0,20 / 0,38 | Formule 3.2 ; η = 0,8 à 1,5 de mémoire (Beer, de Mooij, Liu 2018) | Bénéfices déplacés vers d'autres pays. |
| `offre.sigma.*` | 0 | à documenter | Décision D2 | Effet durable sur le niveau du PIB ; non retenu sans preuve. |
| `fisc.eps` | 0,6 | 0,5 / 0,65 | De mémoire (Commission européenne, Mourre et al. 2019, France ≈ 0,63) ; **non relu** | Quand le PIB baisse de 1 %, le solde se dégrade d'environ 0,6 point. |
| `dette.M` | 8,45 ans | 8 / 9 | AFT, fin juillet 2026 : 8 ans 163 jours [S12] | Durée moyenne avant qu'un emprunt soit renouvelé. |
| `dette.i_star` | à fixer (D4) | 3,5 / 5,0 | TEC 10 : 4,08 % le 18 août 2026 [S12] ; ≈ 4,9 % mi-novembre (sources secondaires [S13]) | Taux auquel l'État emprunte aujourd'hui à dix ans. |
| `dette.i_moy_2025` | 1,9 % | — | Calcul : 64,7 / moyenne (3 306,1 ; 3 460,5) [S1][S4] | Taux moyen payé sur toute la dette. |
| `dette.beta` | 3 pb/pt | 2 / 5 | De mémoire (Laubach 2009 ; Baldacci et Kumar 2010) | Hausse du taux quand la dette augmente d'un point de PIB. |
| `emploi.kappa` | 0,4 | 0,3 / 0,5 | De mémoire (Ball, Leigh, Loungani 2017) | 1 % de PIB en moins : 0,4 point de chômage en plus. |
| `ref.derive` | à fixer (D7) | — | **non trouvé** (COR 2026, Ageing Report) | Hausse spontanée des dépenses liée au vieillissement. |

Toutes les lignes « de mémoire » doivent passer par la table des citations avant le 10 décembre. Aucune n'est à présenter comme vérifiée.

## 5. Trajectoire de référence et points de comparaison

Référence : 2025 observé, 2026–2027 selon les prévisions officielles (1.2), puis E1–E11 sans levier. Elle sera comparée, année par année, à trois repères :

| Repère | Ce qu'on en attend | État |
|---|---|---|
| HCFP, avis n° 2026-5 [S7] | Déficit 5,4 % puis 5,0 % ; dette ≈ 122 % fin 2027 ; intérêts +12 Md€ en 2027 | Lu |
| Cour des comptes, rapport de juin 2026 [S14] | Charge d'intérêts et dette à l'horizon 2029–2030 | **non trouvé** (erreur serveur) |
| Commission européenne, Debt Sustainability Monitor | Dette à dix ans à politique inchangée | **non trouvé** |

Critère de passage : écart inférieur à 1 point de PIB sur la dette à trois ans, et tout écart au-delà expliqué par une hypothèse nommée.

Tests de référence du moteur : chaque levier restitue son étalon (3.1) à 0,1 Md€ près ; multiplicateur cumulé à dix ans inférieur à m pour chaque instrument ; à leviers nuls, scénario = référence ; un excédent ne déclenche aucune prime.

## 6. Retraites, réformes structurelles : ce qui reste

**Droit en vigueur.** La LFSS 2026 gèle l'âge légal à 62 ans et 9 mois et la durée d'assurance à 170 trimestres jusqu'en janvier 2028 [S15][S16]. La référence suit ce calendrier, puis la reprise de la montée vers 64 ans (décision D8).

**Leviers conservés, validés :** indexation des pensions (en points par rapport à l'inflation, appliqués à la ligne « vieillesse ») ; ONDAM (en %). Rendement : 1 % de la ligne correspondante.

**Portés « non validé — avis demandé » :** âge légal au-delà du droit en vigueur, plafonnement, comptes notionnels (paramètres issus de francetdb.com, site non identifié) ; bloc des réformes structurelles (effets exprimés en points de croissance annuelle, à reformuler en effets de niveau σ avec fourchette, E5). Ils restent visibles pour les relecteurs, désactivés par défaut, avec leur source et la question posée.

**Supprimés :** liquidation HLM, impact migratoire, capitalisation (PR n° 3).

**Non trouvé :** projections COR 2026 (dépenses de retraite en % du PIB, effet de la suspension).

## 7. Contrat de module

Un module est un paquet autonome que le moteur appelle et dont il additionne les sorties. Il fournit :
- `id`, `titre`, `sources[]`, `statut` (validé / non validé) ;
- `leviers[]` : identifiant, unité, bornes, valeur par défaut, texte d'aide ;
- `calculer(leviers, contexte) →` pour chaque année : `a` par bloc (centrales, sécurité sociale, locales), `theta`, `m` ou catégorie d'instrument, et, en option, `yS` avec bas / central / haut ;
- `explications[]` : textes associés aux résultats.

Règles : un module n'écrit jamais dans la dette ni dans les intérêts ; un module à effet dynamique passe la même validation que le cœur ; ses sorties s'affichent sur une ligne distincte.

Taxe foncière sur la valeur du sol : à rendement égal, `a = 0` par construction ; tout l'effet budgétaire est `yS`, qui exige une source et une fourchette. Le module a besoin du bloc local.

**Non fait (limite d'usage) :** lecture des dépôts LVTShift, depense-publique-fonctions et shape_of_tax_system_2026_FR. Hypothèse à vérifier : depense-publique-fonctions servirait mieux de source de données (dépenses par fonction) que de module.

## 8. Décisions attendues de Patrick

| # | Décision | Défaut recommandé |
|---|---|---|
| D1 | Ancrage | Niveaux 2025 observés ; 2026 = prévision officielle ; leviers dès 2027 |
| D2 | Effets d'offre | Zéro en central ; bloc optionnel « non validé » |
| D3 | Multiplicateurs et persistance | Valeurs de la table, sous réserve de vérification des sources |
| D4 | Taux d'ancrage i* | Moyenne du TEC 10 sur trois mois, avec curseur bas / central / haut |
| D5 | Leviers du Day 0 | TVA (normal, tous taux), CSG, IR en % du produit, IS, cotisations, cinq à six fonctions de dépense, indexation des pensions, ONDAM |
| D6 | Corrections comportementales θ | Valeurs de la table ; symétriques |
| D7 | Dérive tendancielle des dépenses | Calée sur une projection officielle si elle est trouvée ; sinon ratio constant, annoncé comme tel |
| D8 | Retraites | Droit en vigueur dans la référence ; le reste « non validé » |
| D9 | Collectivités locales | Bloc affiché, sans levier |
| D10 | Horizon | Dix ans |

## 9. Sources

- [S1] Insee, Dépenses par administration publique, 2025 : https://www.insee.fr/fr/statistiques/2381404
- [S2] Insee Première n° 2106, comptes des APU 2025 : https://www.insee.fr/fr/statistiques/8997691 (lu via extraits de recherche ; la page n'a pas pu être relue)
- [S3] PIB 2025, source secondaire : https://www.bdor.fr/actualites-or/france-a-depense-1714-milliards
- [S4] Insee, Dette et déficit publics 2025 : https://www.insee.fr/fr/statistiques/8988843
- [S5] Insee, Dépenses et recettes des APU 2025 : https://www.insee.fr/fr/statistiques/8988845
- [S6] Insee, Dépenses des APU par fonction 2024 : https://www.insee.fr/fr/statistiques/8574707
- [S7] HCFP, avis n° 2026-5 : https://www.hcfp.fr/liste-avis/avis-ndeg2026-5-lois-de-finances-2027
- [S8] Ministère de l'économie, 27 mars 2026 : https://www.economie.gouv.fr/actualites/finances-publiques-un-deficit-public-en-amelioration-en-2025
- [S9] TVA : https://www.moneyvox.fr/votre-argent/actualites/106527/debat-sur-la-hausse-de-la-tva-3-questions-cruciales-sur-cet-impot-que-tout-le-monde-paie (reprise ; la note de la DG Trésor n'a pas été lue directement)
- [S10] FIPECO, IR et CSG : https://www.fipeco.fr/pdf/IR-CSG.pdf
- [S11] Cotisations, source secondaire : https://lessentieldeleco.fr/8323-tva-sociale-comment-fonctionne-le-dispositif/
- [S12] AFT, bulletin mensuel d'août 2026 : https://www.aft.gouv.fr/files/medias-aft/7_Publications/7.2_BM/435_Bulletin%20mensuel%20aout%202026.pdf
- [S13] TEC 10 de novembre, sources secondaires : https://www.actual-immo.fr/taux-emprunt-etat-10-ans/
- [S14] Cour des comptes, juin 2026 : https://www.vie-publique.fr/rapport/303867-la-situation-et-les-perspectives-des-finances-publiques-2026
- [S15] Vie-publique, LFSS 2026 : https://www.vie-publique.fr/loi/300445-loi-de-financement-de-la-securite-sociale-2026-retraites-lfss
- [S16] OFCE, 30 janvier 2026 : https://www.ofce.sciences-po.fr/blog2024/fr/2026/20260129_MD/

## 10. Ce qui manque

Non trouvé : recettes 2025 par impôt et par bloc ; dépenses par fonction ; niveaux 2026 en Md€ et loi de fin de gestion ; inflation 2026 ; rendement d'un point d'IS ; étalon officiel des cotisations ; tableau de passage détaillé ; projections Cour des comptes, Commission et COR ; dérive tendancielle des dépenses.

De mémoire, à vérifier : tous les multiplicateurs, λ, les θ, ε, β, κ, la composition du champ ASSO.

Non fait : lecture des trois dépôts candidats au statut de module.
