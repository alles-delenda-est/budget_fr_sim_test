# Note de modèle — Simulateur Budget France

**Statut : v0.3, décisions de Patrick intégrées le 17 novembre 2026 ; reste à valider la rédaction. Aucun code moteur ne doit être écrit avant cette validation.**

**v0.3 — 17 novembre 2026 :** décisions D1 à D12 intégrées (section 8) ; croissance de référence = médiane des prévisionnistes indépendants, prévisions du Gouvernement en comparateur ; chiffres officiels de `docs/baseline-data.md` repris (dépenses 1 714,2 ; dette 2026 119,3 % ; inflation 2026 2,1 % ; PIB 2025–2027 ; intérêts de la Cour des comptes ; DSM 144,0 % en 2036 ; COR) ; règle de prudence (section 5) ; E3 : θ = 0 pour la dépense, décalage optionnel ; dérive de référence en deux composantes ; σ = 0 par défaut, revue de preuves ouverte ; comptes notionnels en préréglage ; taxe sur la valeur du sol : D11 et D12 ; contrat de module : `flux[]` ; trois horizons ; limites « inflation » et « régimes de multiplicateurs » déplacées en section 11.

16 novembre 2026 (v0.2). Rédaction interrompue par une limite d'usage : plusieurs sources primaires n'ont pas pu être relues. Elles sont signalées « non trouvé » ou « de mémoire » et récapitulées en section 10.

Conventions : montants en Md€ courants ; ratios en % du PIB ; taux en décimal dans les équations, en % à l'affichage. « non trouvé » : valeur cherchée sans succès, avec ce qui a été tenté. « de mémoire » : non relue dans la source le jour de la rédaction, à vérifier dans la table des citations. « calcul » : dérivée des chiffres sourcés de la même ligne.

## 1. Périmètre et année de base

### 1.1 Périmètre

Toutes administrations publiques (APU) en comptabilité nationale, en trois blocs : administrations centrales (État et ODAC), sécurité sociale (ASSO), collectivités locales (APUL). Le solde et la dette sont ceux de Maastricht. Les transferts entre blocs sont consolidés et affichés une seule fois. Le bloc local est affiché sans levier natif ; il reçoit les sorties des modules (D9).

Comptes 2025 (Insee, provisoires) :

| Md€, 2025 | Centrales (dont État) | Locales | Sécurité sociale | Total APU consolidé |
|---|---|---|---|---|
| Dépenses | 681,1 (607,7) | 335,5 | 803,2 | 1 714,2 |
| Consommations intermédiaires | 61,6 (36,1) | 61,1 | 40,8 | 163,5 |
| Rémunérations | 184,9 (153,8) | 97,0 | 88,2 | 370,0 |
| Intérêts | 53,3 (52,4) | 6,0 | 5,6 | 64,7 |
| Prestations sociales | 132,4 (130,6) | 31,4 | 607,2 | 771,0 |
| Investissement (FBCF) | 50,7 (16,7) | 70,7 | 10,8 | 132,2 |
| Autres, y c. transferts versés (calcul) | 198,2 | 69,3 | 50,6 | 212,8 |
| Solde | −130,3 (−128,1) | −15,6 | −6,7 | −152,5 |
| Recettes (calcul : dépenses + solde) | 550,8 | 319,9 | 796,5 | 1 561,7 |

Sources : dépenses, Insee, « Dépenses par administration publique en 2025 » [S1] ; soldes, Insee Première n° 2106 [S2]. La somme des trois blocs (1 819,8) dépasse le total consolidé de 105,6 Md€ : ce sont les transferts entre blocs (calcul). Le tableau 4 d'Insee Première n° 2106 donne aussi 164,6 Md€ de consommations intermédiaires (centrales : 61,8) et 803,3 de dépenses de sécurité sociale, contre 163,5 / 61,6 / 803,2 ci-dessus : arrondi ou révision (mise à jour d'août 2026 ?), non tranché ; les lignes ci-dessus sont conservées jusqu'à vérification (`baseline-data.md`, item 1).

Agrégats : PIB 2025 = 2 991 Md€ (RESF 2027, tableau 1, p. 188 [S17] ; cohérent avec 1 714,2 / 57,3 %) ; dépenses 57,3 % du PIB [S2] ; dette 3 460,5 Md€, soit 115,6 % (115,7 % après révision, et dans le RESF [S17]) [S4][S2].

Ce que ce tableau corrige : le modèle actuel additionne le budget de l'État (445 Md€) et les régimes de base (687 Md€), soit 66 % de la dépense publique, et les rapproche d'une dette toutes APU.

**Trouvé en partie.** Impôts et cotisations sociales 2025, y c. imputées : 1 374,1 Md€ pour les APU (centrales 458,0 ; locales 181,6 ; sécurité sociale 740,6) [S2, tableau 4] ; prélèvements obligatoires 43,6 % du PIB (+0,9 pt) et recettes totales 52,2 % du PIB [S18]. Dépenses par fonction (COFOG), 2024 provisoire : protection sociale 693 Md€ (41 %), santé 261 (16 %), services généraux 181 (11 %, dont charge de la dette 60), affaires économiques 166 (10 %), enseignement 149 (9 %), défense 54 ; total 1 672 Md€ (57,0 % du PIB) [S19, figure 2]. Le niveau 2025 paraîtra en décembre 2026 (tableaux 3.301 à 3.307).

**Non trouvé :** recettes 2025 par impôt (TVA, IR, IS, CSG, cotisations, fiscalité locale) ; dépenses de vieillesse en COFOG (seule la hausse, +23 Md€, est publiée). Tenté : Insee Première n° 2106 (variations seulement), tableau Insee des impôts (page arrêtée à 2017), tableaux 3.216, 3.217, 3.202, 3.205 et 3.212 (fichiers xlsx interdits aux robots : à ouvrir à la main) [S5].

### 1.2 Année de base et ancre de croissance

Année de base (décision D1, tranchée) : niveaux ancrés sur 2025, seule année observée en comptabilité nationale ; 2026 affiché comme « année en cours, estimation » ; leviers agissant à partir de 2027.

**Règle d'ancrage (décision de Patrick).** Les prévisions de croissance du Gouvernement ne servent jamais de référence. La référence de croissance est la médiane des prévisionnistes indépendants (Banque de France, Commission européenne, OCDE, FMI) ; la croissance potentielle vient des estimations de la Commission et de l'OCDE. Les prévisions du Gouvernement ne figurent que comme comparateur (colonne de droite ci-dessous et table 4) et comme préréglage « Prévisions du Gouvernement ».

| Grandeur | Référence du modèle | Comparateur : Gouvernement (RESF 2027 [S17] ; HCFP, avis n° 2026-5 [S7]) |
|---|---|---|
| Croissance en volume 2026 | médiane des prévisionnistes indépendants — valeurs à collecter | 0,5 % [S7] |
| Croissance en volume 2027 | médiane des prévisionnistes indépendants — valeurs à collecter | 1,0 % (jugée optimiste par le HCFP) [S7] |
| Croissance potentielle | médiane Commission et OCDE — valeurs à collecter | 1,2 % en 2026 et 2027 [S7] |
| Inflation, prix à la consommation (moyenne annuelle) 2025 / 2026 / 2027 | médiane des prévisionnistes indépendants — valeurs à collecter (2025 : observé, 0,9 % [S17]) | 0,9 % (observé) / 2,1 % / 1,8 % [S17, tableaux 2 et 10] |
| PIB en valeur 2025 / 2026 / 2027 (Md€) | 2025 : 2 991 (observé) ; 2026–2027 : calculé par le modèle à partir des lignes ci-dessus | 2 991 / 3 051 / 3 135 [S17, p. 188, tableau 1] |
| Solde public (% du PIB) 2025 / 2026 / 2027 | sortie du modèle | −5,1 / −5,4 / −5,0 [S17, tableau 13] |
| Dette brute (% du PIB) 2025 / 2026 / 2027 | sortie du modèle | 115,7 / 119,3 / 121,7 [S17, tableau 14] |
| Charge d'intérêts (% du PIB) 2025 / 2026 / 2027 | sortie du modèle | 2,2 / 2,6 / 2,9 [S17, tableaux 13 et 17] |

Équivalents en Md€ (calcul : % × PIB, non publiés tels quels) : solde ≈ −165 en 2026 ; dette ≈ 3 640 ; intérêts ≈ 79 (≈ 91 en 2027). L'indice de prix (IPC ou IPCH) n'est pas précisé dans la lecture. Un article secondaire donne un déficit de 4,9 % en 2026 et 2027 : écarté, le RESF et le HCFP font foi.

**Non trouvé :** médianes des prévisionnistes indépendants (croissance 2026–2027, croissance potentielle, inflation) : à collecter dans les publications de la Banque de France, de la Commission, de l'OCDE et du FMI ; charge d'intérêts 2026 en Md€ (à lire au tableau 17 du RESF) ; soldes par bloc 2026 ; chiffres du projet de loi de fin de gestion 2026 (déposé le 4 novembre 2026).

### 1.3 Passage PLF/PLFSS → comptabilité nationale

Deux points d'ancrage sourcés pour 2025 :
- État : solde budgétaire −124,7 Md€ [S8] contre besoin de financement −128,1 Md€ [S2].
- Sécurité sociale : régimes de base et FSV −21,6 Md€ [S8] contre ASSO −6,7 Md€ [S2]. L'écart tient au champ : les ASSO incluent notamment l'Unédic, les régimes complémentaires, la Cades et les hôpitaux (de mémoire pour la liste).

Le détail ligne à ligne est **non trouvé** ; il figure dans le tableau Insee 3.108 (régime général → ASSO) et dans la clé de passage du solde de l'État [S4]. Le tableau de passage sera publié avec la note.

## 2. Équations

Indices : t = 0 pour 2026, t ≥ 1 à partir de 2027. Exposant b : trajectoire de référence (sans mesure nouvelle).

**E1 — PIB de référence.** `Yb(t) = Yb(t−1) × (1 + g + π)`, avec g la croissance de référence (médiane des prévisionnistes indépendants en 2026–2027, puis croissance potentielle selon la Commission et l'OCDE) et π l'inflation (médiane des prévisionnistes indépendants), voir 1.2.

**E2 — Leviers.** Chaque levier j est exprimé par son effet ex ante sur le solde, en % du PIB : `a(j,t)`, positif s'il améliore le solde. `a(j,t) = rendement(j) × x(j) × rampe(j,t) / Y(base)`. Il reste constant en part de PIB (indexation), ce qui corrige l'érosion des leviers en euros courants du modèle actuel.

**E3 — Réponse comportementale (recettes).** Effet ex post = `(1 − θ(j)) × a(j,t)`. En paramètres, θ est le même à la hausse et à la baisse ; il est évalué au taux après réforme (voir 3.2). θ = 0 pour les leviers de dépense : une dépense n'a pas de base fiscale qui s'érode quand on la modifie. Les réactions comportementales à la dépense passent par E4 (demande) et E5 (offre), pas par θ.
En option, un décalage spécifique `comp.offset.prestations` = o(j) peut s'appliquer à quelques lignes de dépense, les prestations d'abord : effet ex post = `(1 − o(j)) × a(j,t)`, o étant la part de l'économie annulée par des dépenses induites ou des recettes perdues. Valeur : à documenter ; o = 0 par défaut.

**E4 — Effet de demande, en niveau, qui s'estompe.**
`yD(t) = − Σj m(j) × Σk≤t Δa(j,k) × λ^(t−k)`
où Δa(j,k) est la variation du levier l'année k, m(j) le multiplicateur d'impact et λ ∈ (0,1) la persistance. Une mesure permanente de 1 % du PIB réduit le PIB de m % la première année, puis l'écart se referme.
Vérification : multiplicateur cumulé sur T années = `m × (1 − λ^T) / ((1 − λ) × T)`. Avec m = 0,8, λ = 0,7, T = 10 : 0,26. Le pic vaut m. Le modèle actuel donne des valeurs de 5 à 98.

**E5 — Effet d'offre (optionnel).** `yS(t) = Σj σ(j) × a(j) × min(t / L(j), 1)`, effet permanent sur le niveau du PIB, atteint en L années. σ = 0 par défaut (décision D2). Un σ non nul n'est retenu qu'au cas par cas, quand les preuves le justifient, après une revue de preuves distincte (en cours : `docs/brief-supply-effects.md`). Chaque σ non nul s'affiche sur une ligne distincte et étiquetée, avec une fourchette bas / central / haut.

**E6 — PIB.** `Y(t) = Yb(t) × (1 + yD(t) + yS(t))`.

**E7 — Stabilisateurs automatiques.** Le solde varie de `ε × (yD(t) + yS(t))` points de PIB : ils jouent sur l'écart de niveau cumulé, pas sur la croissance d'une seule année.

**E8 — Solde primaire, en % du PIB de référence.**
`sp(t) = spb(t) + Σj (1 − θ(j)) × a(j,t) + ε × (yD(t) + yS(t))`
avec `spb(t) = spb(0) − d(t)`, d(t) étant la dérive de référence (décision D7, ci-dessous).

**E9 — Taux à l'émission.** `i_new(t) = i* + β × (dette/PIB(t−1) − dette/PIB(0))`, i* étant le taux de marché observé (ancre) et β la pente par point de dette.

**E10 — Taux moyen du stock.** `i_moy(t) = (1 − φ(t)) × i_moy(t−1) + φ(t) × i_new(t)`, avec `φ(t) = 1/M + max(0, ΔD(t−1)) / D(t−1)` : la part refinancée chaque année plus la dette nouvelle. M est la durée de vie moyenne.

**E11 — Intérêts et dette.** `INT(t) = i_moy(t) × D(t−1)` ; `D(t) = D(t−1) + INT(t) − sp(t) × Yb(t)`. Ajustements stock-flux nuls.

**E12 — Chômage (Okun).** `u(t) = ub(t) − κ × 100 × (yD(t) + yS(t))`, u en points, l'écart de PIB en décimal. Un PIB inférieur de 1 % relève le chômage de κ point.

**Dérive de référence d(t) (D7).** `d(t) = dA(t) + dB(t)`, en points de PIB, en deux composantes distinctes et affichées comme telles.
(a) *Vieillissement des retraites et de la santé.* Dynamique, pilotée par les réglages retraites : dA(t) est l'écart, en points de PIB, entre la dépense de retraites projetée par le COR pour les paramètres choisis et son niveau de 2025, plus l'écart équivalent pour la santé. Calage sur les projections du COR : à droit en vigueur, 14,1 % du PIB en 2025 et en 2030, 14,2 % en 2045, 15,3 % en 2070 [S23]. Le COR ne publie pas 2040 ni 2050 en texte (figure 2.2 seulement : **non trouvé**). Trajectoire de dépense de santé : **non trouvée**, source à identifier.
(b) *Autres dépenses.* On retient la plus haute de deux valeurs : la projection officielle, ou la tendance longue de la dépense primaire réelle. C'est un choix délibéré, annoncé comme tel dans l'interface : il écarte l'hypothèse implicite d'une dépense qui cesserait de croître. Valeur de la tendance : **à calculer (séries Insee)**.

Limites assumées : élasticité unitaire des recettes au PIB dans la référence (le HCFP relève 0,8 pour 2027 [S7]) ; θ (base fiscale) et ε (cycle) sont deux canaux distincts, mais un recouvrement partiel est possible. Les limites « pas de modèle d'inflation » et « pas de changement de régime des multiplicateurs » du brouillon v0.2 sont déplacées en section 11.

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

Les coefficients hérités (0,9 ; 0,95 ; 0,7), qui se cumulaient avec les « efficacités », sont supprimés, ainsi que l'asymétrie hausse/baisse sur les paramètres.

θ est donc symétrique en paramètres, mais θ = e × τ / (1 − τ) est évalué au taux **après réforme** τ. Conséquence voulue : une hausse à partir d'un taux déjà élevé fait perdre plus de recettes qu'une baisse de même ampleur n'en fait gagner. Illustration (calcul, e égal) : θ vaut 1,0 × e à τ = 50 % et 0,67 × e à τ = 40 % ; relever de 40 à 50 % est donc corrigé davantage que ramener de 50 à 40 % ne l'est. Patrick a accepté ce traitement ; D6 est tranchée.

## 4. Table des paramètres

| Id | Central | Bas / haut | Comparateur (Gouvernement) | Source | Explication (réutilisable dans l'interface) |
|---|---|---|---|---|---|
| `macro.g` | médiane des prévisionnistes indépendants — valeurs à collecter (potentielle : médiane Commission et OCDE) | à fixer d'après la dispersion des prévisionnistes | 1,2 % [S7] | Règle d'ancrage 1.2 | Rythme auquel l'économie croît sans surchauffe. |
| `macro.pi` | médiane des prévisionnistes indépendants — valeurs à collecter | à fixer d'après la dispersion des prévisionnistes | 2,1 % (2026), 1,8 % (2027) [S17] | Règle d'ancrage 1.2 | Hausse annuelle des prix. |
| `dem.lambda` | 0,7 | 0,5 / 0,85 | — | Hypothèse de calibration, sans source directe | Part de l'effet sur l'activité qui subsiste l'année suivante. |
| `dem.m.achats_invest` | 0,9 | 0,5 / 1,3 | — | De mémoire (Coenen et al. 2012 ; Ramey 2019) | 1 € de commande publique en moins retire environ 0,9 € d'activité la première année. |
| `dem.m.remunerations` | 0,8 | 0,5 / 1,2 | — | De mémoire | Idem pour la masse salariale publique. |
| `dem.m.prestations` | 0,5 | 0,2 / 0,8 | — | De mémoire | Les ménages épargnent une partie des prestations. |
| `dem.m.tva` | 0,4 | 0,2 / 0,6 | — | De mémoire | Effet d'une hausse de TVA sur la consommation. |
| `dem.m.ir_csg` | 0,4 | 0,2 / 0,6 | — | De mémoire | Effet d'un impôt sur le revenu des ménages. |
| `dem.m.cotisations` | 0,4 | 0,2 / 0,7 | — | De mémoire | Effet du coût du travail à court terme. |
| `dem.m.is` | 0,2 | 0,1 / 0,4 | — | De mémoire | Effet de court terme de l'impôt sur les bénéfices. |
| `comp.theta.ir` | 0,15 | 0,05 / 0,30 | — | Formule 3.2 ; e de mémoire (0,1–0,4) | Part du rendement perdue parce que les contribuables s'adaptent. |
| `comp.theta.csg` | 0,10 | 0 / 0,20 | — | Formule 3.2 ; de mémoire | Idem, assiette large. |
| `comp.theta.cotis` | 0,15 | 0,05 / 0,30 | — | De mémoire | Idem, via l'emploi et les salaires. |
| `comp.theta.tva` | 0,03 | 0 / 0,08 | — | De mémoire | Fraude et achats transfrontaliers. |
| `comp.theta.is` | 0,25 | 0,20 / 0,38 | — | Formule 3.2 ; η = 0,8 à 1,5 de mémoire (Beer, de Mooij, Liu 2018) | Bénéfices déplacés vers d'autres pays. |
| `offre.sigma.*` | 0 | à documenter, par mesure | — | Décision D2 ; revue de preuves en cours (`docs/brief-supply-effects.md`) | Effet durable sur le niveau du PIB ; non nul seulement si les preuves le justifient, sur une ligne distincte avec fourchette. |
| `comp.offset.prestations` | à documenter (0 par défaut) | — | — | Section 2, E3 | Part de l'économie sur une prestation qui revient par d'autres dépenses ou des recettes perdues. |
| `fisc.eps` | 0,6 | 0,5 / 0,65 | — | De mémoire (Commission européenne, Mourre et al. 2019, France ≈ 0,63) ; **non relu** | Quand le PIB baisse de 1 %, le solde se dégrade d'environ 0,6 point. |
| `dette.M` | 8,45 ans | 8 / 9 | — | AFT, fin juillet 2026 : 8 ans 163 jours [S12] | Durée moyenne avant qu'un emprunt soit renouvelé. |
| `dette.i_star` | à fixer (D4) | 3,5 / 5,0 | — | TEC 10 : 4,08 % le 18 août 2026 [S12] ; ≈ 4,9 % mi-novembre (sources secondaires [S13]) | Taux auquel l'État emprunte aujourd'hui à dix ans. |
| `dette.i_moy_2025` | 1,9 % | — | Cour des comptes : 65,7 Md€ en 2025, 2,2 % du PIB [S14] | Calcul : 64,7 / moyenne (3 306,1 ; 3 460,5) [S1][S4] | Taux moyen payé sur toute la dette. |
| `dette.beta` | 3 pb/pt | 2 / 5 | — | De mémoire (Laubach 2009 ; Baldacci et Kumar 2010) | Hausse du taux quand la dette augmente d'un point de PIB. |
| `emploi.kappa` | 0,4 | 0,3 / 0,5 | — | De mémoire (Ball, Leigh, Loungani 2017) | 1 % de PIB en moins : 0,4 point de chômage en plus. |
| `ref.derive` | (a) vieillissement retraites et santé : COR pour les paramètres choisis (droit en vigueur : 14,1 % du PIB en 2025 et 2030, 15,3 % en 2070) ; (b) autres dépenses : max(projection officielle ; tendance longue de la dépense primaire réelle), tendance à calculer (séries Insee) | retraites 2070 : 14,5 % si productivité 1,0 % ; 16,1 % si 0,4 % [S23] | — | COR, rapport annuel de juin 2026 [S23] ; santé : **non trouvé** ; tendance : à calculer | Hausse spontanée des dépenses : le vieillissement, puis les autres dépenses qui continuent de croître. |

Toutes les lignes « de mémoire » doivent passer par la table des citations avant le 10 décembre. Aucune n'est à présenter comme vérifiée.

## 5. Trajectoire de référence et points de comparaison

Référence : 2025 observé, 2026–2027 selon la médiane des prévisionnistes indépendants (1.2), puis E1–E11 sans levier. Elle sera comparée, année par année, à des repères officiels. Ce sont des comparateurs, non des cibles : un écart avec le Gouvernement est attendu et s'explique d'abord par l'ancre de croissance.

| Repère | Ce qu'on en attend | État |
|---|---|---|
| HCFP, avis n° 2026-5 [S7] | Déficit 5,4 % puis 5,0 % ; dette ≈ 122 % fin 2027 ; intérêts +12 Md€ en 2027 | Lu |
| RESF 2027 [S17] | Solde −5,4 % / −5,0 % ; dette 119,3 % / 121,7 % ; intérêts 2,6 % / 2,9 % du PIB (2026 / 2027) | Lu (primaire, via résumé d'outil) |
| Cour des comptes, rapport de juin 2026 [S14] | Intérêts : 65,7 Md€ en 2025 (2,2 %), 77,4 en 2026 (2,5 %), « plus de 100 Md€ par an » en 2029 ; dette 118,5 % en 2026 ; 2029 : déficit 3,2 % et dette 120,1 % si les plafonds de dépense nette sont tenus, −5,4 % et 124,3 % en scénario « dérive » (tableaux 14 et 21) | Lu en partie ; **non trouvé** : intérêts 2027, 2028 et 2030 ; dette à l'horizon 2030. Millésime de printemps, antérieur au RESF |
| Commission européenne, Debt Sustainability Monitor 2025 [S20] | Dette 116,3 % du PIB en 2025, puis 144,0 % en 2036 (sommet) en scénario de base, solde primaire structurel maintenu à son niveau de 2026 jusqu'en 2036, hors coût du vieillissement ; risque à moyen terme élevé (tableau 2.2, p. 27) | Lu en partie (100 000 premiers caractères sur 1 048 904). Départ différent de l'Insee (115,7 %) : recaler avant de superposer |

Critère de passage : écart inférieur à 1 point de PIB sur la dette à trois ans, et tout écart au-delà expliqué par une hypothèse nommée. La part de l'écart due à l'ancre de croissance est isolée en faisant tourner le même modèle avec la croissance du Gouvernement (préréglage).

**Règle de prudence.** Les paramètres de référence sont fixés un par un d'après les preuves ; là où les prévisionnistes indépendants sont plus pessimistes que le Gouvernement, on retient les leurs. Il n'y a pas de biais pessimiste généralisé. Fait à garder en vue : en 2025, les taux d'activité et d'emploi des 15–64 ans étaient à leur plus haut niveau depuis 1975 (Insee Première n° 2096, mars 2026 [S21]), alors que le chômage est monté à 8,2 % au troisième trimestre 2026 (Insee, Informations rapides n° 270, 10 novembre 2026 [S22]).

**Horizons (D10).** Trois horizons prédéfinis : 10 ans, 2040 et 30 ans. Au-delà de 10 ans, l'affichage de l'incertitude doit s'élargir (fourchettes bas / central / haut de la table 4, le modèle restant déterministe). L'horizon à 30 ans s'appuie sur la démographie des projections du COR (jusqu'en 2070 [S23]).

Tests de référence du moteur : chaque levier restitue son étalon (3.1) à 0,1 Md€ près ; multiplicateur cumulé à dix ans inférieur à m pour chaque instrument ; à leviers nuls, scénario = référence ; un excédent ne déclenche aucune prime.

## 6. Retraites, réformes structurelles : ce qui reste

**Droit en vigueur.** La LFSS 2026 gèle l'âge légal à 62 ans et 9 mois et la durée d'assurance à 170 trimestres jusqu'en janvier 2028 [S15][S16]. La référence suit ce calendrier, puis la reprise de la montée vers 64 ans (décision D8).

Dépenses de retraites du COR à droit en vigueur (suspension de la réforme de 2023 incluse), scénario de référence : 14,1 % du PIB en 2025 et en 2030, 14,2 % en 2045, 15,3 % en 2070 (+1,2 pt) ; solde du système −0,2 % du PIB en 2025, −0,9 pt en 2045, −2,4 pts en 2070 ; âge moyen de départ 63,1 ans en 2025, 64,6 en 2070 [S23]. La suspension coûte environ 1,8 Md€ par an en moyenne jusqu'en 2032 (chiffre issu d'un résumé automatique : à relire sur le PDF avant usage).

**Leviers conservés, validés :** indexation des pensions (en points par rapport à l'inflation, appliqués à la ligne « vieillesse ») ; ONDAM (en %). Rendement : 1 % de la ligne correspondante.

**Portés « non validé — avis demandé » :** âge légal au-delà du droit en vigueur, plafonnement ; bloc des réformes structurelles (effets exprimés en points de croissance annuelle, à reformuler en effets de niveau σ avec fourchette, E5), auquel s'ajoutent, décision D5, des leviers de réforme du logement et du marché du travail (mesures candidates, d'après `docs/brief-supply-effects.md` : offre de logement et encadrement des loyers ; règles de licenciement et assurance chômage). Leur σ sera fixé d'après la revue de preuves ; en attendant, σ = 0. Ils restent visibles pour les relecteurs, désactivés par défaut, avec leur source et la question posée.

**Préréglage « Comptes notionnels » (D8).** Âge légal 65 ans et passage aux comptes notionnels, à partir de janvier 2028 (aligné sur la reprise de la réforme), indexation des pensions sans écart, pas de plafonnement. Paramètres ancrés sur le COR [S23] et sur la littérature suédoise des comptes notionnels (NDC) : références à citer, à collecter. Il remplace le levier actuel du code (−6 % de la masse de pensions en 15 ans, sans source autre que « francetdb.com, COR 2024 »). C'est une forme réduite, libellée comme telle, « non validé », confiance « low » faute de recoupement indépendant (recalibrage sur une trajectoire citable : option, 4 à 6 jours d'après la revue [S25]).
Implémentation citée : le simulateur du Parti libéral français [S24] (code Apache-2.0, textes CC BY-SA 4.0), présenté comme « modèle publié par le Parti libéral français », jamais comme « le » modèle des comptes notionnels ; l'éditeur est déclaré dans la description du préréglage. Nos textes sont écrits depuis les sources primaires. Le chiffre de −53 % de dépense en 2070 affiché par ce site n'est pas repris : c'est une marge du système, non une économie (coefficient d'équilibre supérieur à 1 selon la revue [S25]). Les éléments de programme du parti (taux unique de 18 %, capitalisation, garantie vieillesse, taxe sur le terrain) sont exclus.

**Supprimés :** liquidation HLM, impact migratoire, capitalisation (PR n° 3), levier notionnel à −6 % sur 15 ans (remplacé par le préréglage).

**Non trouvé :** dépenses de retraites du COR en 2040 et 2050 (lisibles sur le graphique seulement) ; effet de la suspension en % du PIB ou du solde (non chiffré séparément).

## 7. Contrat de module

Un module est un paquet autonome que le moteur appelle et dont il additionne les sorties. Il fournit :
- `id`, `titre`, `sources[]`, `statut` (validé / non validé) ;
- `leviers[]` : identifiant, unité, bornes, valeur par défaut, texte d'aide ;
- `calculer(leviers, contexte) →` pour chaque année : `a` par bloc (centrales, sécurité sociale, locales), `theta`, `m` ou catégorie d'instrument, et, en option, `yS` avec bas / central / haut ;
- `flux[]` (optionnel, **affichage seulement**, n'entre pas dans le solde) : flux bruts par impôt et par bloc (libellé, bloc, montant en % du PIB), pour qu'un module à effet net nul ne paraisse pas inerte ;
- `explications[]` : textes associés aux résultats.

Règles : un module n'écrit jamais dans la dette ni dans les intérêts ; un module à effet dynamique passe la même validation que le cœur ; ses sorties s'affichent sur une ligne distincte.

**Exigences pour le cœur** (revue LVT [S26]) : E2, E3 et E8 sont indexées par bloc (centrales, sécurité sociale, locales), le consolidé étant leur somme moins les transferts entre blocs ; le bloc local reçoit `a(local, t)` et `flux[]` des modules et les affiche sur une ligne distincte ; l'entrée `yS` (bas / central / haut) alimente E6, E7 et E12.

**Taxe sur la valeur du sol (module LVT).** À rendement égal, `a` net est nul par construction, hors capitalisation (D12) ; le canal de PIB `yS` exige une source et une fourchette. Aucune estimation de l'effet sur le PIB français n'a été trouvée ; le seul repère chiffré, l'OCDE, donne de 0 à +1,1 % du PIB en borne haute (S3 avec IFI) et ne résiste pas aux tests de robustesse : `yS` central = 0 (D2).
- *D11 : le produit d'une taxe nationale sur la valeur du sol va à l'État.* La sécurité sociale perd alors sa part de CSG et de prélèvements sociaux sur les plus-values et loyers remplacés : ≈ 3,1 Md€ en S3, soit ≈ 0,10 % du PIB (de 1,1 à 3,4 Md€ selon la variante ; clé 7,5/17,2 non vérifiée). Soit `a(sécurité sociale)` ≈ −0,10 % du PIB, `a(centrales)` ≈ +0,10 %, nul au consolidé.
- *D12 : la capitalisation dans le prix du sol est comptée dès le Day 0.* Mécanisme : la nouvelle taxe se capitalise pour 60 à 100 % dans le prix du sol, l'assiette baisse et, au taux fixé, le produit aussi. Sensibilité : chaque point de baisse de la valeur foncière retire 0,7 à 0,8 Md€ de produit (0,02 à 0,03 % du PIB). Borne haute, partie nationale de S3 : 14 Md€ capitalisés à 3–4 % réel, soit 350 à 470 Md€ (6 à 8 % de l'assiette), donc un manque de 4,5 à 6 Md€ (0,15 à 0,2 % du PIB). Traitement : `a` négatif en S2 et S3, jusqu'à −0,2 % du PIB, capitalisation de 60 % (bas) à 100 % (haut) ; valeur centrale à fixer. Chiffres de la revue [S26] (calculs, non relus).

**Revue LVT [S26] (LVTShift) :**
- LVTShift est un modèle de répartition commune par commune, à rendement constant, sans bouclage macro ; rendements à remplacer de 67,2 Md€ (S1) à 81,8 Md€ (S3 avec IFI), soit 2,25 à 2,73 % du PIB, somme nulle par bloc.
- Aucune estimation d'effet sur le PIB français ; l'OCDE n'offre qu'une borne haute fragile ; les preuves par canal (transactions, construction, loyers, capitalisation) ont des directions établies mais des tailles étrangères.
- L'effet budgétaire le mieux défini est l'érosion de l'assiette par capitalisation, jusqu'à ≈ 0,2 % du PIB (D12).
- Recommandation : module minimal au Day 0 (instantané daté de `yields.json`, `flux[]`, `yS` central 0 ; ≈ 9 jours-personne, fourchette 7 à 11), sous réserve d'un go/no-go le 30 novembre (moteur capable de calculer par bloc et d'accepter `yS`) ; sinon janvier 2027.

**Revue NDC [S25] (comptes notionnels) :**
- Le simulateur du Parti libéral français compare six pensions pour une carrière et chiffre le coût du système jusqu'en 2070 en appliquant des rapports de masses de pensions à la trajectoire du COR ; c'est un outil de campagne.
- Ses écarts (−53 % de dépense en 2070 au scénario 3, contre 6 % pour l'ancien levier) sont des marges, non des économies ; ses chiffres de tête ont été corrigés plusieurs fois en six semaines (85 passages de test rouges sur 485 selon la revue).
- Code Apache-2.0 réutilisable ; textes CC BY-SA 4.0 ; données dérivées sans licence claire, à ne pas reprendre sans accord écrit.
- Recommandation : préréglage maintenant (1 à 2 jours) ; module plus tard, construit par nous (20 à 30 jours), le site servant de contrôle croisé.

**Non fait :** lecture des dépôts depense-publique-fonctions et shape_of_tax_system_2026_FR. Hypothèse à vérifier : depense-publique-fonctions servirait mieux de source de données (dépenses par fonction) que de module. LVTShift et le simulateur de comptes notionnels n'ont été lus que par les deux revues ci-dessus.

## 8. Décisions

| # | Décision | Statut | Formulation retenue |
|---|---|---|---|
| D1 | Ancrage | Tranchée | Niveaux 2025 observés ; 2026 = estimation, croissance de référence = médiane des prévisionnistes indépendants (Gouvernement en comparateur) ; leviers dès 2027 |
| D2 | Effets d'offre | Tranchée sur le principe | σ = 0 par défaut ; non nul seulement au cas par cas après revue de preuves (en cours), sur une ligne distincte étiquetée avec fourchette |
| D3 | Multiplicateurs et persistance | Tranchée | Valeurs de la table, sous réserve de vérification des sources |
| D4 | Taux d'ancrage i* | Tranchée | Moyenne du TEC 10 sur trois mois, avec curseur bas / central / haut |
| D5 | Leviers du Day 0 | Tranchée sur le principe | TVA (normal, tous taux), CSG, IR en % du produit, IS, cotisations, cinq à six fonctions de dépense, indexation des pensions, ONDAM ; plus leviers de réforme du logement et du marché du travail, « non validé — avis demandé », σ d'après la revue de preuves |
| D6 | Corrections comportementales θ | Tranchée | Valeurs de la table ; symétriques en paramètres, évaluées au taux après réforme |
| D7 | Dérive de référence | Tranchée sur le principe | Deux composantes : (a) vieillissement retraites et santé, calé sur le COR pour les paramètres choisis ; (b) autres dépenses : max(projection officielle ; tendance longue de la dépense primaire réelle), choix délibéré |
| D8 | Retraites | Tranchée sur le principe | Droit en vigueur dans la référence ; préréglage « Comptes notionnels » ; le reste « non validé » |
| D9 | Collectivités locales | Tranchée | Bloc local affiché, sans levier natif ; il reçoit les sorties des modules |
| D10 | Horizon | Tranchée sur le principe | Trois horizons : 10 ans, 2040, 30 ans ; incertitude élargie au-delà de 10 ans ; 30 ans sur démographie du COR |
| D11 | Produit d'une taxe nationale sur la valeur du sol | Tranchée | À l'État (bloc des administrations centrales) |
| D12 | Capitalisation dans le prix du sol | Tranchée | Comptée dès le Day 0 dans le module LVT, mécanisme et fourchette de la revue LVT |

**Reste ouvert :** (1) valeurs à collecter (section 10) ; (2) σ issus de la revue de preuves (D2, D5, et `yS` haut du module LVT) ; (3) valeur centrale de la capitalisation (D12) et go/no-go du module LVT le 30 novembre.

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
- [S17] Direction générale du Trésor, Rapport économique, social et financier annexé au PLF 2027, 6 octobre 2026 (tableaux 1, 2, 10, 13, 14, 17 ; p. 188-194) : https://www.tresor.economie.gouv.fr/Articles/03454e04-445d-4ce6-832b-cff601a11485/files/56839f98-37fc-48d8-b502-81cac5a48cad (lecture primaire, via résumé d'outil ; voir `docs/baseline-data.md`, item 5)
- [S18] Insee Résultats, Finances publiques en 2025, 29 mai 2026 : https://www.insee.fr/fr/statistiques/8988841
- [S19] Insee Première n° 2093, dépenses publiques par fonction en 2024, février 2026 : https://www.insee.fr/fr/statistiques/fichier/8735252/IP2093.pdf
- [S20] Commission européenne, Debt Sustainability Monitor 2025, Institutional Paper 332 : https://economy-finance.ec.europa.eu/document/download/39b3b61d-42c1-46d7-8088-0aad82e8731e_en?filename=ip332_en.pdf
- [S21] Insee Première n° 2096, mars 2026 (référence fournie par Patrick ; URL non relevée, non relue pour cette note)
- [S22] Insee, Informations rapides n° 270, 10 novembre 2026 (référence fournie par Patrick ; URL non relevée, non relue pour cette note)
- [S23] COR, rapport annuel de juin 2026 : synthèse https://www.cor-retraites.fr/sites/default/files/2026-06/Synth%C3%A8se_RA_2026.pdf ; partie 2, chapitre 1 https://www.cor-retraites.fr/sites/default/files/2026-06/RA_Part2_Chap1.pdf (lecture primaire, via résumé d'outil ; voir `docs/baseline-data.md`, item 7)
- [S24] Parti libéral français, simulateur « Retraite à comptes notionnels » (g-pliberal) : https://g-pliberal.github.io/retraitecomptenotionelle/ ; dépôt https://github.com/g-pliberal/retraitecomptenotionelle
- [S25] Revue du simulateur de comptes notionnels, 17 novembre 2026 : `docs/review-comptes-notionnels.md`, branche `docs/review-ndc`
- [S26] Revue du module taxe sur la valeur du sol (LVTShift), 17 novembre 2026 : `docs/review-lvt-module.md`, branche `docs/review-lvt`

## 10. Ce qui manque

Non trouvé : recettes 2025 par impôt et par bloc ; dépenses de vieillesse en COFOG et niveau 2025 des dépenses par fonction (décembre 2026) ; charge d'intérêts 2026 en Md€, soldes par bloc 2026, loi de fin de gestion ; rendement d'un point d'IS ; étalon officiel des cotisations ; tableau de passage détaillé ; Cour des comptes : intérêts 2027, 2028 et 2030, dette à l'horizon 2030 ; COR : dépenses 2040 et 2050, effet de la suspension en % du PIB ; trajectoire de dépense de santé liée au vieillissement.

À collecter : médianes des prévisionnistes indépendants (Banque de France, Commission, OCDE, FMI) pour la croissance 2026–2027, la croissance potentielle et l'inflation ; tendance longue de la dépense primaire réelle (à calculer, séries Insee) ; valeur de `comp.offset.prestations` (à documenter) ; références de la littérature suédoise des comptes notionnels ; valeur centrale de la capitalisation du sol (D12) ; σ de la revue de preuves.

De mémoire, à vérifier : tous les multiplicateurs, λ, les θ, ε, β, κ, la composition du champ ASSO. Les chiffres de `docs/baseline-data.md` ont été lus par résumé d'outil, non à l'œil dans les PDF.

Non fait : lecture de depense-publique-fonctions et shape_of_tax_system_2026_FR.

## 11. Développements ultérieurs

Phases ultérieures, hors Day 0 ; ces points sont aujourd'hui des limites assumées.
- **Modèle d'inflation.** L'inflation est exogène, égale à la médiane des prévisionnistes indépendants (1.2) ; aucune réponse endogène des prix.
- **Changement de régime des multiplicateurs.** Les multiplicateurs (E4) sont ceux de l'expansion ; aucun basculement automatique en récession.
