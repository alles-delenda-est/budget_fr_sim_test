# Vérification primaire des paramètres « de mémoire » et « à collecter » (Day 0 — 24 nov. 2026)

> **Objet :** Faire passer l'ensemble des **17 paramètres `de mémoire`** et **8 paramètres `à collecter`** initiaux de `src/engine/params.js` par des sources primaires officielles ou de la littérature publiée (exigence de `docs/model-note.md` §4 avant le 10 décembre), **sans modifier aucune valeur centrale macroéconomique** sans décision explicite de Patrick (zéro dérive sur la trajectoire de référence, les comparateurs et les fixtures LVT Day 0).
>
> Chaque chiffre est étiqueté **`read`** (PDF / API officielle téléchargés et inspectés directement), **`secondary`** (synthèse ou résumé académique), ou **`assumed`** (choix de modélisation).
>
> **Bilan après audit complet :** **`0` paramètre `de mémoire` restant** (sur 17 initiaux) ; **`1` seul paramètre `à collecter`** (`cmp.aft.taux_emission.2026`, rapport annuel AFT 2026 attendu en 2027) ; **`5` décisions propriétaire `à valider`** clairement identifiées en §8.

---

## 1. Tableau récapitulatif des mises à jour (`src/engine/params.js` et `src/engine/levers.js`)

| Paramètre | Avant | Après | Valeur centrale | Mode de lecture & source |
|---|---|---|---:|---|
| `bloc.cofog.enseignement.*` (remplace `bloc.part_hors_secu.*`) | `à collecter` (67,0 / 33,0 %) | **`sourcé (calcul)`** | **69,8 % État / 30,2 % locales** | **`read`** — Eurostat `gov_10a_exp` (2024, France, GF09) |
| `bloc.cofog.ordre_securite.*` | `à collecter` (67,0 / 33,0 %) | **`sourcé (calcul)`** | **80,3 % État / 19,7 % locales** | **`read`** — Eurostat `gov_10a_exp` (2024, France, GF03) |
| `bloc.cofog.affaires_economiques.*` | `à collecter` (67,0 / 33,0 %) | **`sourcé (calcul)`** | **68,7 % État / 31,3 % locales** | **`read`** — Eurostat `gov_10a_exp` (2024, France, GF04) |
| `fisc.eps` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,60** (`[0,50 ; 0,65]`, inchangé) | **`read`** — Commission européenne, Mourre et al. (2019), `dp098_en.pdf` : France = **0,630** (Tableau I.3 p. 41), sensibilité **0,60–0,63** (Tableau V.1 p. 50) |
| `comp.tau0.tva` | `de mémoire` | **`sourcé`** | **20 %** (inchangé) | **`read`** — CGI art. 278 (Légifrance) |
| `comp.tau0.csg` | `de mémoire` | **`sourcé`** | **9,2 %** (inchangé) | **`read`** — CSS art. L. 136-8 (Légifrance) |
| `offre.csg.tmi_salarie` | `de mémoire` | **`sourcé`** | **30 %** (inchangé) | **`read`** — Barème officiel IR 2026 (`service-public.gouv.fr` : 29 580 €–84 577 €/part) |
| `macro.pi.long` | `à collecter` | **`sourcé (fourchette), centre choisi`** | **1,85 %** (`[1,3 ; 2,3]`, inchangé) | **`read`** BdF sept. 2026 p. 1 (IPCH 2028 : **1,6 %** total, **1,9 %** hors énergie/alim.) + **`secondary`** BCE SPF T4 2026 (2031 : **2,0 %**) |
| `dem.m.achats_invest` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,9** (`[0,5 ; 1,3]`, inchangé) | **`read`** *Mésange* `G2017/04` (invest. **1,31** p. 102, dépense générique **0,78** p. 105) + **`secondary`** Ramey (2019), Gechert (2015) |
| `dem.m.remunerations` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,8** (`[0,5 ; 1,2]`, inchangé) | **`read`** *Mésange* `G2017/04` §4.1.2 pp. 105–106 (**0,78** an 1 / **1,06** an 2) + **`read`** BdF WP 883 p. 57 (`EA-BDF` : **1,0–1,1** sur 2 ans) |
| `dem.m.prestations` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,5** (`[0,2 ; 0,8]`, inchangé) | **`read`** *Mésange* §4.1.2 (canal revenu disponible ≈ **0,41** an 1) + **`secondary`** Coenen et al. (2012 : transferts généraux **0,42**, ciblés **1,30**) |
| `dem.m.tva` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,4** (`[0,2 ; 0,6]`, inchangé) | **`read`** *Mésange* `G2017/04` §4.1.5 pp. 112–113 (**−0,32** an 1 / **−0,66** an 2) + **`secondary`** Coenen et al. (2012 : **0,61**) |
| `dem.m.ir_csg` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,4** (`[0,2 ; 0,6]`, inchangé) | **`read`** *Mésange* `G2017/04` §4.1.6 CSG p. 115 & §4.1.7 IR p. 117 (**0,41** an 1 pour les deux) + **`secondary`** Coenen et al. (2012 : **0,23**) |
| `dem.m.cotisations` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,4** (`[0,2 ; 0,7]`, inchangé) | **`read`** *Mésange* `G2017/04` §4.1.3 pp. 107–108 (**0,20** an 1 / **0,55** an 2 employeurs ; §4.1.4 **0,38** salariés) + **`secondary`** Coenen et al. (2012 : **0,23**) |
| `dem.m.is` | `de mémoire` | **`sourcé (secondaire)`** | **0,2** (`[0,1 ; 0,4]`, inchangé) | **`secondary`** Coenen et al. (2012 : **0,24** an 1), Gechert & Rannenberg (2018) ; **`read`** *Mésange* note 77 p. 105 |
| `comp.theta.ir` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,15** (`[0,05 ; 0,30]`, inchangé) | **`read`** Neisser (IZA DP 11958 / *EJ* 2021, Tableau 8 p. 55 : après déductions médiane **0,343**, moy. **0,390**) + **`secondary`** Lehmann et al. (2013 France : **≈ 0,20**) |
| `comp.theta.csg` | `de mémoire` | **`à valider`** | **0,10** (`[0 ; 0,20]`, inchangé) | **`read`** Neisser (Tableau 8 p. 55 : avant déductions **0,203** médiane / **0,296** moy. → formule 3.2 à 9,2 % = **0,014–0,030**, écart soumis à Patrick) |
| `comp.theta.cotis` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,15** (`[0,05 ; 0,30]`, inchangé) | **`read`** Bozio, Breda & Grenet (IZA DP 12502 / *REStud*, pp. 7 & 30 : pass-through **6–21 %**, moy. **15 %** sans lien contributif) + **`read`** *Mésange* §4.1.3 |
| `comp.theta.tva` | `de mémoire` | **`sourcé (secondaire)`** | **0,03** (`[0 ; 0,08]`, inchangé) | **`secondary`** Commission européenne, *VAT Gap in Europe 2025* : France **5,6 %** en 2023 (5,1 % en 2022) |
| `comp.theta.is` | `de mémoire` | **`sourcé (secondaire)`** | **0,25** (`[0,20 ; 0,38]`, inchangé) | **`secondary`** Beer, de Mooij & Liu (2020, *JES* 34(3)) : `η ≈ 1,0–1,5` (`η × 25 % = 0,25–0,375`) |
| `emploi.kappa` | `de mémoire` | **`sourcé (secondaire)`** | **0,4** (`[0,3 ; 0,5]`, inchangé) | **`secondary`** Ball, Leigh & Loungani (2017, *JMCB* 49(7)) : France = **−0,37** |
| `ref.derive.b_autres` | `à collecter` (`0`, sans borne) | **`à valider`** (`0`, **`[0 ; 0,11]`**) | **0** (inchangé ; décision D7) | **`read`** — Eurostat 1995–2024 (`gov_10a_exp` + `gov_10a_main` + `nama_10_gdp`) |
| `comp.offset.prestations` | `à collecter` | **`à valider`** | **0** (`[0 ; 0,30]`, inchangé) | **`secondary`** — Note IPP n° 129 (sept. 2026, TAXIPP) : gel des pensions **6,6 Md€** bruts → **5,2 Md€** nets APU (**21,2 %** de retour IR + CSG + ASPA/APL) |
| `rend.is` | `à collecter` | **`calculé (estimation)`** | **2,3** (`[2,0 ; 3,0]`, inchangé) | **`read`** PLF 2026 V&M t. I pp. 18–20 (IS net **58,2 Md€** / 25 % = **2,33**) + **`secondary`** DGFiP Stat. n° 51 sept. 2026 (IS brut **70,5 Md€** → jusqu'à **2,6–2,8 Md€/pt**) |
| `rend.cotis` | `à collecter` | **`à valider`** | **8,5** (`[7 ; 10]`, inchangé) | **`read`** Eurostat `D11` **1 129,3 Md€** (2025) & PLFSS 2026 A4 (**> 75 Md€** allègements) + **`secondary`** Urssaf masse privée **726 Md€** (2024 → **7,3–7,5 Md€/pt**, **6,2–7,5** net d'allègements) |
| `cmp.aft.taux_emission.2026` | `à collecter` | `à collecter` (source enrichie) | **3,5 %** (inchangé, affichage seul) | **`secondary`** — Estimations financières en cours d'année 2026 ≈ **3,47–3,6 %** (rapport annuel AFT 2026 attendu en 2027) |

---

## 2. Lecture directe primaire — Commission européenne DP 098 (Mourre, Poissonnier & Lausegger, mai 2019)

**Source (`read`) :** `https://economy-finance.ec.europa.eu/system/files/2019-05/dp098_en.pdf` (*The Semi-Elasticities Underlying the Cyclically-Adjusted Budget Balance: An Update and Further Analysis*, European Economy Discussion Paper 098, 60 pages).

- **Semi-élasticité globale France (`ε`)** : **`0,630`** (plus élevée de l'UE, moyenne UE `0,50`, étendue `0,29` Bulgarie à `0,63` France — p. 16 et **Tableau I.3, p. 41** ; pagination imprimée du rapport).
- **Décomposition France (Tableau I.3, p. 41)** :
  - Élasticité des recettes au PIB : `1,01` (semi-élasticité recettes : **`+0,004`** ; poids recettes `51,99 %` du PIB).
  - Élasticité des dépenses au PIB : `−0,11` (semi-élasticité dépenses : **`−0,626`** ; poids dépenses `56,50 %` du PIB).
  - Somme : `0,004 − (−0,626) = 0,630`.
- **Élasticités détaillées France (Tableau I.1, p. 39 ; Tableau I.2, p. 40)** : IR `1,86` (part `18,73 %`), IS `2,76` (`4,87 %`), impôts indirects `1,00` (`29,93 %`), cotisations sociales `0,63` (`35,98 %`), dépenses de chômage `−3,23` (`3,34 %` des dépenses).
- **Évolution et sensibilité** :
  - Millésime précédent (2014) : **`0,603`** (**Tableau IV.3, p. 49**).
  - Analyse de sensibilité sur les fenêtres de pondération : **`0,60` à `0,63`** (`0,60 / 0,63 / 0,62 / 0,61` — **Tableau V.1, p. 50**).
- **Conclusion :** Conserver `fisc.eps = 0,60` dans `[0,50 ; 0,65]` est pleinement cohérent avec les bornes empiriques de la Commission (`0,60–0,63`, moyenne UE `0,50`). Statut : **`sourcé (fourchette), centre choisi`**.

---

## 3. Lecture directe primaire — Ventilation COFOG 2024 par sous-secteur (Eurostat `gov_10a_exp`)

**Source (`read`) :** API officielle Eurostat `gov_10a_exp` (`geo=FR`, `unit=MIO_EUR`, `na_item=TE`, `sector=S13/S1311/S1313/S1314`, année **2024**, téléchargée le 24 nov. 2026). Les totaux `S13` concordent au milliard près avec Insee Première n° 2093 (`base.cofog.*`).

| Fonction COFOG (2024, M€) | Total APU (`S13`) | Administrations centrales (`S1311`) | Administrations locales (`S1313`) | Sécurité sociale (`S1314`) | Part normalisée État / Locales | Ancien proxy (`bloc.part_hors_secu`) |
|---|---:|---:|---:|---:|---:|---:|
| **GF09 — Enseignement** | 148 639,6 | 106 078,3 | 45 962,7 | 0,0 | **69,8 % / 30,2 %** | 67,0 % / 33,0 % |
| **GF03 — Ordre et sécurité publics** | 52 113,0 | 42 175,9 | 10 325,0 | 0,0 | **80,3 % / 19,7 %** | 67,0 % / 33,0 % |
| **GF04 — Affaires économiques** | 166 072,8 | 123 826,5 | 56 428,3 | 560,0 (0,3 %) | **68,7 % / 31,3 %** | 67,0 % / 33,0 % |
| **GF02 — Défense** | 54 199,0 | 54 201,6 | 0,0 | 0,0 | **100,0 % / 0,0 %** | 100,0 % / 0,0 % |
| *Total toutes fonctions* | *1 671 793,8* | *670 299,3* | *329 745,6* | *778 426,9* | *67,0 % / 33,0 %* | *67,0 % / 33,0 %* |

- **Gain concret :** L'ancien proxy sous-estimait de **13,3 points** la part de l'État dans *Ordre et sécurité publics* (`80,3 %` réels contre `67,0 %`). Aucun changement sur les totaux consolidés APU (les parts somment exactement à 1).

---

## 4. Lecture directe primaire — Tendance longue hors vieillissement (`ref.derive.b_autres`, D7)

**Sources (`read`) :** Séries officielles Eurostat 1995–2024 téléchargées le 24 nov. 2026 : `gov_10a_exp` (`TOTAL`, `GF07` Santé, `GF1002` Vieillesse), `gov_10a_main` (`TE`, `D41PAY` intérêts), `nama_10_gdp` (`B1GQ` en valeur `CP_MEUR`, en volume `CLV20_MEUR`, déflateur du PIB `PD20_EUR`).

Pour éviter tout double compte avec la dérive démographique `dA` (retraites COR + santé Commission), la dépense pertinente pour `ref.derive.b_autres` est la **dépense primaire hors santé et hors vieillesse** (`TOTAL − D41PAY − GF07 − GF1002`) :

| Année | Dépense primaire hors vieillissement (Md€) | % du PIB | Santé + Vieillesse (`GF07 + GF1002`, % du PIB) |
|---:|---:|---:|---:|
| 1995 | 423,8 | 34,73 % | 17,87 % |
| 2000 | 474,2 | 32,18 % | 17,48 % |
| 2007 | 612,4 | 31,60 % | 19,34 % |
| 2011 | 682,2 | 33,08 % | 21,22 % |
| 2019 | 786,3 | 32,33 % | 21,50 % |
| 2024 | 958,6 | 32,66 % | 22,25 % |

| Fenêtre (hors point Covid 2020–2021) | Croissance réelle hors vieillissement (déflateur PIB) | Croissance réelle du PIB | Dérive observée (% PIB / an) | Dérive implicite face à `g_pot = 1,0 %` (`0,327 × (g_dep − 1,0 %)`) |
|---|---:|---:|---:|---:|
| **1995–2024 (29 ans)** | +1,34 % / an | +1,55 % / an | −0,071 pt / an | **+0,110 pt / an** |
| **2000–2024 (24 ans)** | +1,32 % / an | +1,26 % / an | +0,020 pt / an | **+0,104 pt / an** |
| **2011–2024 (13 ans)** | +1,01 % / an | +1,11 % / an | −0,033 pt / an | **+0,002 pt / an** |
| **2011–2019 (8 ans)** | +0,91 % / an | +1,20 % / an | −0,094 pt / an | **−0,028 pt / an** |

- **Constat pour Patrick (D7) :** Quasi toute la hausse historique (+4,4 pts de PIB depuis 1995) vient de la santé et des retraites (déjà dans `dA`). La dépense primaire hors vieillissement est restée plate autour de **32–33 % du PIB** ; face à `g_pot = 1,0 %`, la fourchette implicite est **`[0 ; 0,11]` pt/an**. Centre conservé à `0`, statut passé à **`à valider`**.

---

## 5. Lecture directe primaire — Multiplicateurs budgétaires (*Mésange* `G2017/04` et Banque de France WP 883)

**Sources principales :**
- **`read`** — Insee / DG Trésor, *« Le modèle macroéconométrique Mésange : réestimation et nouveautés »*, Document de travail **G2017/04** (mai 2017, `https://www.insee.fr/fr/statistiques/fichier/2848300/G2017-04.pdf`, section 4.1, pp. 102–118 imprimées).
- **`read`** — Banque de France, Working Paper n° **883** (Aldama, Gaulier, Lemoine, Robert, Turunen & Zhutova, 2022, *The EA-BDF Model and Government Spending Multipliers in a Monetary Union*, `wp-883.pdf`, p. 57).
- **`secondary`** — Coenen et al. (2012, *AEJ: Macroeconomics*, moyenne 1re année de 7 modèles institutionnels sous politique monétaire accommodante) ; Gechert & Rannenberg (2018, *Journal of Economic Surveys*, 98 études).

| Variante (*Mésange* `G2017/04`, choc permanent de 1 % PIB ex ante) | Section & page imprimée | PIB An 1 | PIB An 2 | PIB An 3 | PIB An 5 | Solde primaire An 1 | Paramètre moteur (`dem.m.*`) |
|---|---|---:|---:|---:|---:|---:|---|
| 4.1.1 Investissement public (hausse) | p. 102 | **+1,31** | +1,38 | +1,22 | +0,93 | −0,49 | `achats_invest = 0,9 [0,5 ; 1,3]` |
| 4.1.2 Dépense publique générique (25 % rém. pub., 46 % prest. espèces, 12 % CI, 9 % nature, 8 % invest.) | p. 105–106 | **+0,78** | +1,06 | +1,03 | +0,86 | −0,53 | `remunerations = 0,8 [0,5 ; 1,2]` ; `prestations = 0,5 [0,2 ; 0,8]` |
| 4.1.3 Cotisations sociales employeurs (baisse) | p. 107–108 | **+0,20** | +0,55 | +0,76 | +0,97 | −0,72 | `cotisations = 0,4 [0,2 ; 0,7]` |
| 4.1.4 Cotisations sociales salariés (baisse) | p. 110 | **+0,38** | +0,72 | +0,75 | +0,77 | −0,73 | *(repère)* |
| 4.1.5 TVA (hausse) | p. 112–113 | **−0,32** | −0,66 | −0,72 | −0,81 | +0,80 | `tva = 0,4 [0,2 ; 0,6]` |
| 4.1.6 CSG (baisse) | p. 115 | **+0,41** | +0,84 | +0,90 | +0,81 | −0,81 | `ir_csg = 0,4 [0,2 ; 0,6]` |
| 4.1.7 Impôt sur le revenu (baisse) | p. 117 | **+0,41** | +0,83 | +0,88 | +0,81 | −0,81 | `ir_csg = 0,4 [0,2 ; 0,6]` |

- **Complément `dem.m.is = 0,2 [0,1 ; 0,4]` :** *Mésange* (note 77, p. 105, `read`) ne fait pas entrer les marges/trésoreries d'entreprises directement dans l'investissement de court terme ; Coenen et al. (2012, `secondary`) donnent un multiplicateur moyen de première année de **`0,24`** pour l'impôt sur les sociétés (contre `0,42` pour les transferts généraux, `0,23` impôts travail, `0,61` taxes sur la consommation). `dem.m.is` est donc honnêtement classé **`sourcé (secondaire)`**.
- **Complément `EA-BDF` (BdF WP 883, p. 57, `read`) :** Le multiplicateur français de consommation publique sur les 2 premières années atteint **`1,0` à `1,1`** (`MCE` / `VBE`), cohérent avec la borne haute de `dem.m.remunerations` (`1,2`).

---

## 6. Lecture directe primaire — Réactions comportementales `θ` (Neisser 2021 et Bozio, Breda & Grenet 2019)

**Sources principales :**
- **`read`** — Carina Neisser, *The Elasticity of Taxable Income: A Meta-Regression Analysis*, IZA DP n° 11958 (publié *The Economic Journal*, 131(640), 2021), `https://docs.iza.org/dp11958.pdf` (**Tableau 8, p. 55 imprimée / p. 58 PDF**, 1 448 estimations issues de 51–53 études).
- **`read`** — Antoine Bozio, Thomas Breda & Julien Grenet, *Does Tax-Benefit Linkage Matter for the Incidence of Social Security Contributions?*, IZA DP n° 12502 (publié *Review of Economic Studies*), `https://docs.iza.org/dp12502.pdf` (pp. 7 et 30).
- **`secondary`** — Étienne Lehmann, François Marical & Laurence Rioux (2013, *Journal of Public Economics*), France : élasticité des revenus salariaux bruts au taux net d'IR **`≈ 0,20`**.

| Base fiscale (Neisser, Tableau 8 p. 55 imprimée, `read`) | Obs. / Études | Moyenne `e` | Médiane `e` | Application formule §3.2 `θ = e × τ / (1 − τ)` |
|---|---:|---:|---:|---|
| **Après déductions (assiette étroite, type IR)** | 596 / 37 | **0,390** | **0,343** | À `τ0 = 21 %` (`0,266`) : `θ = 0,09–0,10` (0,05 avec Lehmann `0,20`) ; aux tranches hautes `30–45 %` (`0,43–0,82`) : **`0,15–0,30`** → `comp.theta.ir = 0,15 [0,05 ; 0,30]` |
| **Avant déductions (assiette large, type CSG)** | 852 / 38 | **0,296** | **0,203** | À `τ0 = 9,2 %` (`0,101`) : **`θ = 0,021–0,030`** (`0,014–0,021` sur salaires seuls `e = 0,138 / 0,211`) → **écart notable avec le centre actuel `0,10`** (signalé `à valider`) |
| *Total toutes études* | *1 448 / 53* | *0,340* | *0,260* | — |

- **Cotisations patronales (`comp.theta.cotis = 0,15 [0,05 ; 0,30]`) :** Bozio, Breda & Grenet (`read`, pp. 7 & 30) établissent sur trois réformes françaises qu'en l'absence de lien contributif fort, la répercussion sur les salaires est limitée (**6 % à 21 %**, moyenne méta-analyse **15 %** sur 11 études contre **103 %** avec lien contributif fort), si bien que le coin pèse sur le coût du travail et l'emploi (retour budgétaire de **28 %** dès l'année 1 dans *Mésange* §4.1.3). À `τ0 = 36,4 %`, `θ = 0,15` implique `e ≈ 0,26`, et `θ_non_réel` redescend à `0,050` lorsque E5 est actif.

---

## 7. Audit des 5 paramètres « à collecter »

1. **`macro.pi.long` (`1,85 % [1,3 ; 2,3]` → `sourcé (fourchette), centre choisi`) :**
   - Banque de France, *Projections macroéconomiques France*, 15 sept. 2026 (`bdf_proj_sept2026.pdf`, p. 1, **`read`**) : IPCH total **`2,3 %`** (2026), **`1,9 %`** (2027), **`1,6 %`** (2028) ; inflation hors énergie et alimentation **`1,6 %`** (2026), **`2,3 %`** (2027), **`1,9 %`** (2028).
   - BCE, *Survey of Professional Forecasters* T4 2026 (30 oct. 2026, **`secondary`**) : anticipations long terme (2031) ancrées à **`2,0 %`** (total et sous-jacent, cible symétrique BCE `2,0 %`). Le centre `1,85 %` s'inscrit exactement entre BdF 2028 (`1,6–1,9 %`) et la cible BCE (`2,0 %`).
2. **`comp.offset.prestations` (`0 [0 ; 0,30]` → `à valider`) :**
   - **Note IPP n° 129** (sept. 2026, P. Aubert, S. Duchesne, T. Tochev & M. Tô, *« Comment mettre à contribution les retraités pour le redressement des finances publiques ? »*, modèle TAXIPP, **`secondary`**) : un gel complet des pensions de base économise **`6,6 Md€`** bruts pour les régimes de retraite mais seulement **`5,2 Md€`** nets pour l'ensemble des APU, soit un **effet de retour mécanique de `21,2 %`** (`1,4 / 6,6`) par moindres recettes d'IR et de CSG et hausse induite d'ASPA et d'APL.
   - **Point d'attention pour Patrick :** `indexation_pensions` et `NDC_MODULE` ont `σ = 0` (`yD → 0` à long terme) : laisser `comp.offset.prestations = 0` surestime donc d'environ **20 %** l'économie permanente nette APU d'une sous-indexation. Le centre est conservé à `0` (zéro dérive non validée) et passé en **`à valider`**.
3. **`rend.is` (`2,3 [2,0 ; 3,0]` Md€/pt → `calculé (estimation)`) :**
   - **PLF 2026, *Voies et moyens, tome I*** (`plf2026_vm_t1.pdf`, pp. 18–20, **`read`**) : taux normal `25 %` (PME `15 %` ≤ 42 500 €), IS net État **`57,4 Md€`** (2024), **`58,2 Md€`** (2025 révisé), **`59,0 Md€`** (2026) → ratio net `58,2 / 25 = 2,33 Md€/pt` (`59,0 / 25 = 2,36`).
   - **DGFiP Statistiques n° 51** (sept. 2026, *L'impôt sur le bénéfice 2025 des entreprises*, **`secondary`** `impots.gouv.fr`) : **IS brut 2025 = `70,5 Md€`** (`69 Md€` en 2024), crédits et réductions d'impôt ≈ `13 Md€`, résultat fiscal IS `176 Md€`. Les crédits d'impôt (CIR, etc.) étant forfaitaires en euros, un point de taux normal porte sur l'assiette **brute** taxée à 25 %, ce qui borne le rendement statique brut autour de **`2,6–2,8 Md€/pt`** (`70,5 / 25 = 2,82` avant retrait de la tranche PME 15 %). Faute de sensibilité publiée par la DG Trésor, le proxy `2,3` est maintenu en **`calculé (estimation)`**.
4. **`rend.cotis` (`8,5 [7 ; 10]` Md€/pt → `à valider`) :**
   - **Eurostat `nama_10_gdp`** (`eurostat_wages_fr.json`, **`read`**) : salaires et traitements bruts totaux (`D11`) = **`1 111,6 Md€`** (2024) et **`1 129,3 Md€`** (2025) ; cotisations employeurs (`D12`) = `406,9 Md€` (2025).
   - **Urssaf / Acoss** (2024, **`secondary`** `urssaf.org`) : masse salariale du **secteur privé** soumise à cotisations = **`726 Md€`** (+3,3 %, soit ≈ `750 Md€` en 2025), hors salaires bruts publics (≈ `234 Md€`, FIPECO — où une hausse de cotisations employeurs publics est un transfert interne entre APUC/APUL et ASSO, **neutre au consolidé APU**).
   - **PLFSS 2026, Annexe 4** (`plfss2026_annexe4.pdf`, pp. 23–24 et 37, **`read`**) : les allègements généraux dépassent **`75 Md€`** en 2024 (`71,5 Md€` ROBSS en 2026), réduisant l'assiette effective autour du SMIC (`6,2–7,5 Md€/pt` selon Cour des comptes / Sénat, `secondary`).
   - **Point d'attention pour Patrick :** Sur la masse salariale privée consolidée, 1 point vaut **`≈ 7,3–7,5 Md€`** brut (`6,2–7,5` net des allègements bas salaires), en dessous du centre actuel `8,5 Md€` (hérité de la moyenne DSS `7` / Ecalle `10`). Centre conservé à `8,5`, statut passé à **`à valider`**.
5. **`cmp.aft.taux_emission.2026` (`3,5 %`, affichage seul → reste `à collecter`) :**
   - Le site `aft.gouv.fr` est protégé contre l'accès automatisé (défi Cloudflare, non contourné) et le rapport annuel AFT 2026 n'est publié qu'après clôture de l'exercice. Les suivis financiers secondaires situent le taux moyen pondéré des émissions OAT MLT en cours d'année 2026 autour de **`3,47–3,6 %`**. Conservé honnêtement en **`à collecter`**.

---

## 8. Bilan Day 0 — Décisions ouvertes pour Patrick (avant le 10 décembre / `main`)

1. **`0` paramètre `de mémoire` restant** dans `src/engine/params.js` (sur 17 initiaux).
2. **`1` seul paramètre `à collecter` restant :** `cmp.aft.taux_emission.2026` (`3,5 %`, affichage seul, en attente du rapport annuel AFT 2026).
3. **5 décisions propriétaire (`à valider`) :**
   - `lvt.capi.part = 0,80` (`[0,60 ; 1,00]`, D12) et go/no-go du module LVT (30 nov.).
   - `ref.derive.b_autres = 0` (`[0 ; 0,11]`, D7 — maintenir `0` ou retenir un centre positif ex. `+0,05` / `+0,10` d'après Eurostat 1995–2024).
   - `comp.offset.prestations = 0` (`[0 ; 0,30]` — maintenir `0` ou calibrer autour de **`0,20`** d'après la Note IPP n° 129 de sept. 2026 mesurant `21,2 %` de retour IR/CSG/ASPA/APL sur un gel des pensions).
   - `comp.theta.csg = 0,10` (`[0 ; 0,20]` — maintenir `0,10` ou ramener vers **`0,02–0,03`** conformément à la formule §3.2 appliquée aux élasticités assiette large de Neisser 2021).
   - `rend.cotis = 8,5` (`[7 ; 10]` Md€/pt — maintenir `8,5` ou recaler autour de **`7,3–7,5`** Md€/pt sur la masse salariale privée Urssaf consolidée APU).
4. **3 paramètres `calculé (estimation)` :** `comp.tau0.ir` (`21 %`), `offre.ir.conv_brut` (`0,76`), `rend.is` (`2,3 Md€/pt` net vs `2,6–2,8` brut DGFiP).
5. **Hard gate de mise en production (`CLAUDE.md` §7) :** revue de sécurité **Gemini 4 Neon** avant toute fusion `review/day0` → `main`.
