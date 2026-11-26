# Vérification primaire des paramètres « de mémoire » et « à collecter » (Day 0 — 24 nov. 2026)

> **Objet :** Faire passer l'ensemble des **17 paramètres `de mémoire`** et **8 paramètres `à collecter`** initiaux de `src/engine/params.js` par des sources primaires officielles ou de la littérature publiée (exigence de `docs/model-note.md` §4 avant le 10 décembre), **sans modifier aucune valeur centrale macroéconomique** sans décision explicite de Patrick (zéro dérive sur la trajectoire de référence, les comparateurs et les fixtures LVT Day 0).
>
> Chaque chiffre est étiqueté **`read`** (PDF / API officielle téléchargés et inspectés directement), **`secondary`** (synthèse ou résumé académique), ou **`assumed`** (choix de modélisation).
>
> **Bilan après audit complet et décisions de Patrick (25 nov. 2026) :** **`0` paramètre `de mémoire` restant** (sur 17 initiaux) ; **`0` paramètre `à valider` restant** ; **`1` seul paramètre `à collecter`** (`cmp.aft.taux_emission.2026`, rapport annuel AFT 2026 attendu en 2027) ; **3 calibrations de leviers approuvées** (`comp.offset.prestations = 0,20`, `comp.theta.csg = 0,03`, `rend.cotis = 7,4 Md€` avec préréglage `tva_sociale` rééquilibré à `+1 pt` TVA / `−1,5 pt` cotisations) ; **2 estimations internes calculées et documentées** (`ref.derive.b_autres = +0,05 pt/an` et `dem.m.prestations = 0,45`, statut `calculé (estimation)`, `src/engine/internal-derivations.js` et vue avancée de `HypothesesPage.jsx`) ; **vérification d'héritage LVTShift** pour `lvt.capi.part` (`yields.json` n'exporte aucun paramètre de capitalisation → valeur `0,80 [0,60 ; 1,00]` conservée dans le module).
>
> **Suivi post-fusion des PR #30/#32 (24 nov. 2026, approuvé par Patrick) :** corrections de sources sans changement de valeur centrale ni de trajectoire de référence (sorties du moteur identiques au cas central, bas et haut) : `rend.is` (bulletin DGFiP n° 51 relu dans le PDF, §7), `rend.cotis` (borne basse ramenée de 6,2 à 7,0, §7), parts COFOG (effet sur la répartition État / collectivités publié, §3), `comp.theta.csg` (fourchette resserrée à 0,01–0,05, §6), `dem.m.prestations` (passé `à valider`, §5), `dem.m.cotisations` et `comp.theta.cotis` (sources précisées, §5–6), et **dérivation tranche par tranche de `comp.theta.ir`** (nouvelle §9 : pour le levier proportionnel du moteur, **0,37** (0,15–0,66) ; 0,21 pour +1 point sur chaque taux ; ramenés le 25 nov. à **0,35** (0,14–0,62) et 0,20 avec le facteur de CSG déductible de σ ; centre fixé à 0,15 le 24 nov., **relevé à 0,35 le 25 nov. 2026, décision de Patrick**). **25 nov. 2026 (décision de Patrick) :** l'effet d'offre σ de l'IR est recalculé tranche par tranche avec les mêmes données (σ −0,112 → −0,122 % du PIB par point ; §9) ; c'est le seul changement de sortie du moteur de cette PR (levier IR seulement). **25 nov. 2026 (décision de Patrick, PR suivante) :** centre de `comp.theta.ir` relevé de 0,15 à **0,35** (fourchette 0,14–0,62), valeur calculée pour le levier proportionnel du moteur avec le facteur de CSG déductible de σ (§9), et part réelle θ_réel de l'IR calculée avec les mêmes poids et coins que θ ; sorties modifiées pour le levier IR seulement (trajectoire de référence inchangée).

---

## 1. Tableau récapitulatif des mises à jour (`src/engine/params.js` et `src/engine/levers.js`)

| Paramètre | Avant | Après | Valeur centrale | Mode de lecture & source |
|---|---|---|---:|---|
| `bloc.cofog.enseignement.*` (remplace `bloc.part_hors_secu.*`) | `à collecter` (67,0 / 33,0 %) | **`sourcé (calcul)`** | **69,8 % État / 30,2 % locales** | **`read`** — Eurostat `gov_10a_exp` (2024, France, GF09) ; totaux de sous-secteurs non consolidés, effet sur la répartition par bloc publié au §3 |
| `bloc.cofog.ordre_securite.*` | `à collecter` (67,0 / 33,0 %) | **`sourcé (calcul)`** | **80,3 % État / 19,7 % locales** | **`read`** — Eurostat `gov_10a_exp` (2024, France, GF03) |
| `bloc.cofog.affaires_economiques.*` | `à collecter` (67,0 / 33,0 %) | **`sourcé (calcul)`** | **68,7 % État / 31,3 % locales** | **`read`** — Eurostat `gov_10a_exp` (2024, France, GF04) |
| `fisc.eps` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,60** (`[0,50 ; 0,65]`, inchangé) | **`read`** — Commission européenne, Mourre et al. (2019), `dp098_en.pdf` : France = **0,630** (Tableau I.3 p. 41), sensibilité **0,60–0,63** (Tableau V.1 p. 50) |
| `comp.tau0.tva` | `de mémoire` | **`sourcé`** | **20 %** (inchangé) | **`read`** — CGI art. 278 (Légifrance) |
| `comp.tau0.csg` | `de mémoire` | **`sourcé`** | **9,2 %** (inchangé) | **`read`** — CSS art. L. 136-8 (Légifrance) |
| `offre.csg.tmi_salarie` | `de mémoire` | **`sourcé`** | **30 %** (inchangé) | **`read`** — Barème officiel IR 2026 (`service-public.gouv.fr` : 29 580 €–84 577 €/part) |
| `macro.pi.long` | `à collecter` | **`sourcé (fourchette), centre choisi`** | **1,85 %** (`[1,3 ; 2,3]`, inchangé) | **`read`** BdF sept. 2026 p. 1 (IPCH 2028 : **1,6 %** total, **1,9 %** hors énergie/alim.) + **`secondary`** BCE SPF T4 2026 (2031 : **2,0 %**) |
| `dem.m.achats_invest` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,9** (`[0,5 ; 1,3]`, inchangé) | **`read`** *Mésange* `G2017/04` (invest. **1,31** p. 102, dépense générique **0,78** p. 105) + **`secondary`** Ramey (2019), Gechert (2015) |
| `dem.m.remunerations` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,8** (`[0,5 ; 1,2]`, inchangé) | **`read`** *Mésange* `G2017/04` §4.1.2 pp. 105–106 (**0,78** an 1 / **1,06** an 2) + **`read`** BdF WP 883 p. 54 (`EA-BDF` : **1,0–1,1** sur 2 ans) |
| `dem.m.prestations` | `de mémoire` | **`calculé (estimation)`** (25 nov.) | **0,45** (`[0,2 ; 0,8]`) | Estimation interne (`src/engine/internal-derivations.js`) : **`read`** BdF WP 750 (FR-BDF, Tableau 11 p. 28 : `0,09 / 0,26 / 0,37 / 0,43`, cumul `1,15` ÷ facteur E4 `2,533` = **`0,454 ≈ 0,45`** ; 2 ans `0,206` ≈ borne basse `0,2`), recoupée par **`read`** *Mésange* IR/CSG (`0,41`) et résidu composite §4.1.2 (`0,47–0,62`) (§5) |
| `dem.m.tva` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,4** (`[0,2 ; 0,6]`, inchangé) | **`read`** *Mésange* `G2017/04` §4.1.5 pp. 112–113 (**−0,32** an 1 / **−0,66** an 2) + **`secondary`** Coenen et al. (2012 : **0,61**) |
| `dem.m.ir_csg` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,4** (`[0,2 ; 0,6]`, inchangé) | **`read`** *Mésange* `G2017/04` §4.1.6 CSG p. 115 & §4.1.7 IR p. 117 (**0,41** an 1 pour les deux) + **`secondary`** Coenen et al. (2012 : **0,23**) |
| `dem.m.cotisations` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,4** (`[0,2 ; 0,7]`, inchangé) | **`read`** *Mésange* `G2017/04` §4.1.3 pp. 107–108 (**0,20** an 1 / **0,55** an 2 employeurs : 0,4 = choix d'une moyenne sur deux ans ; §4.1.4 **0,38** salariés) + **`read`** BdF WP 750 (FR-BDF, Tableau 15 p. 36 : 0,04 / 0,25 / 0,57 / 0,84) ; Coenen et al. retiré (non relu) |
| `dem.m.is` | `de mémoire` | **`sourcé (secondaire)`** | **0,2** (`[0,1 ; 0,4]`, inchangé) | **`secondary`** Coenen et al. (2012 : **0,24** an 1), Gechert & Rannenberg (2018) ; **`read`** *Mésange* note 77 p. 105 |
| `comp.theta.ir` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,35** (`[0,14 ; 0,62]` : fourchette du levier proportionnel, §9) | Dérivation par tranche (§9) : **`read`** DGFiP, foyers et impôt net par taux marginal (revenus 2024) ; **`read`** Cabannes, Houdré & Landais (2014 : **0,02** ensemble, **0,31** dernier décile), Neisser (2021), Piketty, Saez & Stantcheva (2014) ; **`secondary`** Lehmann et al. (2013, résumé : **≈ 0,2**) → levier proportionnel du moteur **0,35** (0,14–0,62) ; +1 pt sur chaque taux 0,20 (0,07–0,36). Centre 0,35 = valeur calculée pour le levier proportionnel (décision de Patrick, 25 nov. 2026 ; 0,15 auparavant) |
| `comp.theta.csg` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,03** (`[0,01 ; 0,05]`, recalibré et resserré 24 nov.) | **`read`** Neisser (Tableau 8 p. 55 : avant déductions **0,203** médiane / **0,296** moy. → formule 3.2 à 9,2 % = **0,014–0,030** ; `θ_non_réel = 0` avec E5) |
| `comp.theta.cotis` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,15** (`[0,05 ; 0,30]`, inchangé) | **Source indirecte** : **`read`** Bozio, Breda & Grenet (IZA DP 12502 / *REStud*, pp. 5 & 27–28 : répercussion salariale **6 % et 21 %**, moy. **15 %** sur **11 estimations** sans lien contributif — une incidence salariale, pas une perte de recettes) + **`read`** *Mésange* §4.1.3 |
| `comp.theta.tva` | `de mémoire` | **`sourcé (secondaire)`** | **0,03** (`[0 ; 0,08]`, inchangé) | **`secondary`** Commission européenne, *VAT Gap in Europe 2025* : France **5,6 %** en 2023 (5,1 % en 2022) |
| `comp.theta.is` | `de mémoire` | **`sourcé (secondaire)`** | **0,25** (`[0,20 ; 0,38]`, inchangé) | **`secondary`** Beer, de Mooij & Liu (2020, *JES* 34(3)) : `η ≈ 1,0–1,5` (`η × 25 % = 0,25–0,375`) |
| `emploi.kappa` | `de mémoire` | **`sourcé (secondaire)`** | **0,4** (`[0,3 ; 0,5]`, inchangé) | **`secondary`** Ball, Leigh & Loungani (2017, *JMCB* 49(7)) : France = **−0,37** |
| `ref.derive.b_autres` | `à collecter` (`0`, sans borne) | **`calculé (estimation)`** (`+0,05`, **`[0 ; 0,11]`**) | **+0,05 pt/an** (D7, 25 nov.) | **`read`** — Eurostat 1995–2024 (`gov_10a_exp` + `gov_10a_main` + `nama_10_gdp`), médiane des 5 fenêtres D7 face à `g_pot = 1,0 %` = fenêtre 2007–2024 (`+0,050`, §4) |
| `comp.offset.prestations` | `à collecter` | **`sourcé (secondaire)`** | **0,20** (`[0 ; 0,30]`, recalibré 24 nov.) | **`secondary`** — Note IPP n° 129 (sept. 2026, TAXIPP) : gel des pensions **6,6 Md€** bruts → **5,2 Md€** nets APU (**21,2 %** de retour IR + CSG + ASPA/APL) |
| `rend.is` | `à collecter` | **`calculé (estimation)`** | **2,3** (`[2,0 ; 3,0]`, inchangé) | **`read`** PLF 2026 V&M t. I pp. 18–20 (IS net **58,2 Md€** / 25 % = **2,33**) + **`read`** DGFiP Stat. n° 51 sept. 2026 (bénéfice imposable à 25 % **257 Md€** → borne statique brute **≈ 2,6 Md€/pt**, §7) |
| `rend.cotis` | `à collecter` | **`sourcé (fourchette), centre choisi`** | **7,4** (`[7,0 ; 10]`, recalibré 24 nov. ; borne basse 6,2 → 7,0 au suivi) | **`read`** REPSS Financement 2026 (indicateur 1.4.1, pp. 32–33 : point de cotisation déplafonnée **7,3 Md€** en 2025, dont privé **6,9**) ; Eurostat `D11` **1 129,3 Md€** ; PLFSS 2026 A4 (**71,5 Md€** = total des exonérations ROBSS 2026) ; Urssaf **726 Md€** (2024, `secondary`) et **+1,85 %** en 2025 (`read`) |
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
- **Effet sur la répartition par bloc (à connaître, suivi post-fusion) :** les totaux APU sont inchangés, mais l'effet d'un levier se répartit autrement entre État et collectivités. Calcul exact avec le moteur (`projectScenario`, effet ex ante 2027, `fisc.eps = fisc.eps_offre = 0`, comparaison avec l'ancien proxy 67 / 33) :

| Levier (2027) | Effet ex ante État, parts Eurostat | Effet ex ante État, ancien proxy | Écart État (= − écart collectivités) |
|---|---:|---:|---:|
| Enseignement −10 % | +10,991 Md€ | +10,555 Md€ | **+0,436 Md€** (économie plus forte pour l'État, plus faible pour les collectivités) |
| Ordre et sécurité +10 % | −4,417 Md€ | −3,684 Md€ | **−0,733 Md€** (dépense plus forte pour l'État) |
| Affaires économiques −20 % | +24,114 Md€ | +23,519 Md€ | **+0,595 Md€** |

- **Limite : totaux non consolidés.** Les parts sont calculées sur les totaux de chaque sous-secteur, qui comptent chez le payeur les transferts versés aux autres sous-secteurs (`S1311 + S1313 + S1314 − S13` = **3 401,4** M€ en enseignement, **387,9** M€ en ordre et sécurité, **14 742,0** M€ en affaires économiques). Lecture directe des transferts versés (`read`, `gov_10a_exp`, `D7` et `D9` « payables à » S1311 / S1313 / S1314, 2024) : en affaires économiques, l'État verse 13 068,1 M€ (dont 10 539,2 M€ de transferts courants à la sécurité sociale) et les collectivités 1 673,8 M€ ; la somme (14 741,9 M€) correspond au recouvrement. Parts nettes des transferts versés : **69,8 %** (enseignement), **80,4 %** (ordre et sécurité), **66,9 %** (affaires économiques, contre 68,7 % retenu). La part État est donc surestimée de 1,8 point en affaires économiques et quasiment exacte ailleurs. Valeurs du moteur inchangées ; écart affiché dans la source des paramètres `bloc.cofog.*`.

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
| **2007–2024 (17 ans)** | +1,15 % / an | +0,96 % / an | +0,062 pt / an | **+0,050 pt / an** |
| **2011–2024 (13 ans)** | +1,01 % / an | +1,11 % / an | −0,033 pt / an | **+0,002 pt / an** |
| **2011–2019 (8 ans)** | +0,91 % / an | +1,20 % / an | −0,094 pt / an | **−0,028 pt / an** (plancher D7 : 0) |

- **Estimation interne retenue (25 nov. 2026, `src/engine/internal-derivations.js`) :** Quasi toute la hausse historique (+4,4 pts de PIB depuis 1995) vient de la santé et des retraites (déjà dans `dA`, et l'exclusion de `GF07 + GF1002` retire aussi les soins de longue durée liés au grand âge : zéro double compte avec `ref.derive.a_sante`). En appliquant la règle D7 (`s_2024 × max(0 ; g_dép − g_pot)`) aux 5 fenêtres structurelles, la **médiane vaut `+0,050 → +0,05 pt/an`**, valeur identique à celle de la fenêtre post-crise **2007–2024** (seule fenêtre où la croissance réelle observée du PIB, `+0,96 %/an`, coïncide avec `g_pot = 1,0 %`) et cohérente avec la pente MCO 2000–2024 hors Covid en part de PIB (`+0,054 pt/an`). Fourchette **`[0 ; 0,11]` pt/an**, centre fixé à **`+0,05` pt/an**, statut **`calculé (estimation)`**, méthodologie exposée dans la vue avancée de `HypothesesPage.jsx`.

---

## 5. Lecture directe primaire — Multiplicateurs budgétaires (*Mésange* `G2017/04` et Banque de France WP 883)

**Sources principales :**
- **`read`** — Insee / DG Trésor, *« Le modèle macroéconométrique Mésange : réestimation et nouveautés »*, Document de travail **G2017/04** (mai 2017, `https://www.insee.fr/fr/statistiques/fichier/2848300/G2017-04.pdf`, section 4.1, pp. 102–118 imprimées).
- **`read`** — Banque de France, Working Paper n° **883** (Aldama, Gaulier, Lemoine, Robert, Turunen & Zhutova, 2022, *The EA-BDF Model and Government Spending Multipliers in a Monetary Union*, `wp-883.pdf`, p. 54 imprimée).
- **`secondary`** — Coenen et al. (2012, *AEJ: Macroeconomics*, moyenne 1re année de 7 modèles institutionnels sous politique monétaire accommodante) ; Gechert & Rannenberg (2018, *Journal of Economic Surveys*, 98 études).

| Variante (*Mésange* `G2017/04`, choc permanent de 1 % PIB ex ante) | Section & page imprimée | PIB An 1 | PIB An 2 | PIB An 3 | PIB An 5 | Solde primaire An 1 | Paramètre moteur (`dem.m.*`) |
|---|---|---:|---:|---:|---:|---:|---|
| 4.1.1 Investissement public (hausse) | p. 102 | **+1,31** | +1,38 | +1,22 | +0,93 | −0,49 | `achats_invest = 0,9 [0,5 ; 1,3]` |
| 4.1.2 Dépense publique générique (25 % rém. pub., 46 % prest. espèces, 12 % CI, 9 % nature, 8 % invest.) | p. 105–106 | **+0,78** | +1,06 | +1,03 | +0,86 | −0,53 | `remunerations = 0,8 [0,5 ; 1,2]` (pas de variante « prestations seules ») |
| 4.1.3 Cotisations sociales employeurs (baisse) | p. 107–108 | **+0,20** | +0,55 | +0,76 | +0,97 | −0,72 | `cotisations = 0,4 [0,2 ; 0,7]` (entre an 1 et an 2) |
| 4.1.4 Cotisations sociales salariés (baisse) | p. 110 | **+0,38** | +0,72 | +0,75 | +0,77 | −0,73 | *(repère)* |
| 4.1.5 TVA (hausse) | p. 112–113 | **−0,32** | −0,66 | −0,72 | −0,81 | +0,80 | `tva = 0,4 [0,2 ; 0,6]` |
| 4.1.6 CSG (baisse) | p. 115 | **+0,41** | +0,84 | +0,90 | +0,81 | −0,81 | `ir_csg = 0,4 [0,2 ; 0,6]` |
| 4.1.7 Impôt sur le revenu (baisse) | p. 117 | **+0,41** | +0,83 | +0,88 | +0,81 | −0,81 | `ir_csg = 0,4 [0,2 ; 0,6]` |

- **Complément `dem.m.is = 0,2 [0,1 ; 0,4]` :** *Mésange* (note 77, p. 105, `read`) ne fait pas entrer les marges/trésoreries d'entreprises directement dans l'investissement de court terme ; Coenen et al. (2012, `secondary`) donnent un multiplicateur moyen de première année de **`0,24`** pour l'impôt sur les sociétés (contre `0,42` pour les transferts généraux, `0,23` impôts travail, `0,61` taxes sur la consommation). `dem.m.is` est donc honnêtement classé **`sourcé (secondaire)`**.
- **Complément `EA-BDF` (BdF WP 883, p. 54 imprimée, `read`) :** Le multiplicateur français de consommation publique sur les 2 premières années atteint **`1,0` à `1,1`** (`MCE` / `VBE`), cohérent avec la borne haute de `dem.m.remunerations` (`1,2`).
- **Estimation interne retenue (25 nov. 2026, `src/engine/internal-derivations.js`) — `dem.m.prestations = 0,45 [0,2 ; 0,8]`, statut `calculé (estimation)`.** *Mésange* `G2017/04` n'a pas de variante « prestations » : les prestations en espèces ne sont que 46 % du choc composite 4.1.2, et `0,41` est le multiplicateur des variantes IR et CSG (4.1.6–4.1.7). La seule source française directe lue (`read`) est **Banque de France, WP 750** (Aldama & Ouvrard, janv. 2020, *Variantes analytiques du modèle FR-BDF*, `wp750.pdf`), **Tableau 11 p. 28** : hausse durable de 1 pt de PIB des prestations sociales hors chômage = PIB **+0,09 %** an 1, **+0,26** an 2, **+0,37** an 3, **+0,43** an 4 (cumul sur 4 ans = **1,15**). Comme E4 décroît géométriquement dès l'an 1 (`1 + λ + λ² + λ³ = 2,533` à `λ = 0,7`), retenir l'an 1 seul (`0,09`) écraserait l'impulsion d'un modèle en cloche. **Équivalence cumulée sur 4 ans dans E4** : `1,15 / 2,533 = 0,454 ≈` **`0,45`** (équivalent 2 ans : `0,35 / 1,70 = 0,206`, cohérent avec la borne basse `0,2`). **Recoupements *Mésange* (`read`) :** proxy revenu disponible IR/CSG = **`0,41`** (plancher bas) ; décomposition algébrique résiduelle du choc composite §4.1.2 (`0,78 = 0,08×1,31 + 0,25×m_rém + 0,21×m_achats + 0,46×m_prest`) = **`0,47`** (à `m_direct = 1,0`) à **`0,62`** (aux centres moteur `0,8 / 0,9`). Coenen et al. (2012, `secondary`, non relu dans le PDF primaire) : `0,42`. Méthodologie exposée dans la vue avancée de `HypothesesPage.jsx`.
- **Précision `dem.m.cotisations = 0,4` :** le centre se situe entre l'an 1 (**0,20**) et l'an 2 (**0,55**) de la variante *Mésange* 4.1.3 (moyenne ≈ 0,38) : choix d'une moyenne sur deux ans, puisque E4 applique `m` dès l'année 1 puis l'estompe (`λ = 0,7`). Recoupement FR-BDF (Tableau 15 p. 36, `read`) : 0,04 / 0,25 / 0,57 / 0,84 sur quatre ans. Le chiffre de Coenen et al. (0,23, qui porte sur l'impôt sur le revenu du travail et non sur les cotisations employeurs) n'a pas été relu dans la source primaire et est retiré de `params.js`.

---

## 6. Lecture directe primaire — Réactions comportementales `θ` (Neisser 2021 et Bozio, Breda & Grenet 2019)

**Sources principales :**
- **`read`** — Carina Neisser, *The Elasticity of Taxable Income: A Meta-Regression Analysis*, IZA DP n° 11958 (publié *The Economic Journal*, 131(640), 2021), `https://docs.iza.org/dp11958.pdf` (**Tableau 8, p. 55 imprimée / p. 58 PDF**, 1 448 estimations issues de 51–53 études).
- **`read`** — Antoine Bozio, Thomas Breda & Julien Grenet, *Does Tax-Benefit Linkage Matter for the Incidence of Social Security Contributions?*, IZA DP n° 12502 (publié *Review of Economic Studies*), `https://docs.iza.org/dp12502.pdf` (pp. 5 et 27–28 imprimées).
- **`secondary`** — Étienne Lehmann, François Marical & Laurence Rioux (2013, *Journal of Public Economics*), France : élasticité des revenus salariaux bruts au taux net d'IR **`≈ 0,20`**.

| Base fiscale (Neisser, Tableau 8 p. 55 imprimée, `read`) | Obs. / Études | Moyenne `e` | Médiane `e` | Application formule §3.2 `θ = e × τ / (1 − τ)` |
|---|---:|---:|---:|---|
| **Après déductions (assiette étroite, type IR)** | 596 / 37 | **0,390** | **0,343** | Le calcul au seul taux moyen `τ0 = 21 %` (`θ = 0,05–0,10`) sous-estime θ : voir la dérivation par tranche de la **§9** (levier proportionnel **0,35**, 0,14–0,62 ; +1 pt 0,20) → `comp.theta.ir = 0,35 [0,14 ; 0,62]` |
| **Avant déductions (assiette large, type CSG)** | 852 / 38 | **0,296** | **0,203** | À `τ0 = 9,2 %` (`0,101`) : **`θ = 0,021–0,030`** (`0,014–0,021` sur salaires seuls `e = 0,138 / 0,211`) → **recalibré à `0,03` par Patrick le 24 nov. 2026**, fourchette resserrée à **`[0,01 ; 0,05]`** (ancienne borne haute 0,20 sans source) |
| *Total toutes études* | *1 448 / 53* | *0,340* | *0,260* | — |

- **Cotisations patronales (`comp.theta.cotis = 0,15 [0,05 ; 0,30]`) — source indirecte :** Bozio, Breda & Grenet (`read`, pp. 5 et 27–28 imprimées) mesurent l'**incidence salariale** des cotisations employeurs, pas une perte de recettes : sur deux réformes françaises sans lien contributif, la répercussion sur les salaires est de **6 %** et **21 %** (non significatives) ; leur méta-analyse compare **21 estimations**, dont **11** sans lien contributif (répercussion moyenne **15 %**) et **7** avec lien fort (**103 %**). Une faible répercussion signifie que le coin pèse sur le coût du travail et l'emploi, d'où une perte de recettes, mais l'étude ne la chiffre pas (le retour de 28 % en année 1 de *Mésange* §4.1.3 est un repère de solde, non un θ). Centre 0,15 **choisi** : à `τ0 = 36,4 %`, il implique `e ≈ 0,26` ; `θ_non_réel` redescend à `0,050` lorsque E5 est actif.
- **CSG : part non réelle bloquée à 0 avec l'effet d'offre (vérifié dans le moteur).** Pour +1 pt de CSG, θ au taux après réforme vaut **0,034** (`leverTheta`) ; la part réelle `θ_réel = −σ × recette propre / (100 × rendement)` vaut **0,049** au cas central (σ = −0,537), **0,068** au cas bas et **0,025** au cas haut (`partReelle`). D'où `θ_non_réel = max(0, θ − θ_réel)` = **0** aux cas central et bas, **0,009** au cas haut. Avec la fourchette resserrée, la borne haute 0,05 (0,056 au taux après réforme) laisserait 0,007 au cas central. Les sorties du moteur ne dépendent pas des bornes de θ (seul le centre est utilisé).

---

## 7. Audit des 5 paramètres « à collecter »

1. **`macro.pi.long` (`1,85 % [1,3 ; 2,3]` → `sourcé (fourchette), centre choisi`) :**
   - Banque de France, *Projections macroéconomiques France*, 15 sept. 2026 (`bdf_proj_sept2026.pdf`, p. 1, **`read`**) : IPCH total **`2,3 %`** (2026), **`1,9 %`** (2027), **`1,6 %`** (2028) ; inflation hors énergie et alimentation **`1,6 %`** (2026), **`2,3 %`** (2027), **`1,9 %`** (2028).
   - BCE, *Survey of Professional Forecasters* T4 2026 (30 oct. 2026, **`secondary`**) : anticipations long terme (2031) ancrées à **`2,0 %`** (total et sous-jacent, cible symétrique BCE `2,0 %`). Le centre `1,85 %` s'inscrit exactement entre BdF 2028 (`1,6–1,9 %`) et la cible BCE (`2,0 %`).
2. **`comp.offset.prestations` (`0 → 0,20 [0 ; 0,30]` → `sourcé (secondaire)`, décision de Patrick du 24 nov. 2026) :**
   - **Note IPP n° 129** (sept. 2026, P. Aubert, S. Duchesne, T. Tochev & M. Tô, *« Comment mettre à contribution les retraités pour le redressement des finances publiques ? »*, modèle TAXIPP, **`secondary`**) : un gel complet des pensions de base économise **`6,6 Md€`** bruts pour les régimes de retraite mais seulement **`5,2 Md€`** nets pour l'ensemble des APU, soit un **effet de retour mécanique de `21,2 %`** (`1,4 / 6,6`) par moindres recettes d'IR et de CSG et hausse induite d'ASPA et d'APL.
   - **Décision du 24 nov. 2026 :** Calibré à **`0,20`** (parce que `indexation_pensions` et `NDC_MODULE` ont `σ = 0` ; simplification assumée : le retour est imputé au bloc sécurité sociale).
3. **`rend.is` (`2,3 [2,0 ; 3,0]` Md€/pt → `calculé (estimation)`) :**
   - **PLF 2026, *Voies et moyens, tome I*** (`plf2026_vm_t1.pdf`, pp. 18–20, **`read`**) : taux normal `25 %` (PME `15 %` ≤ 42 500 €), IS net État **`57,4 Md€`** (2024), **`58,2 Md€`** (2025 révisé), **`59,0 Md€`** (2026) → ratio net `58,2 / 25 = 2,33 Md€/pt` (`59,0 / 25 = 2,36`).
   - **DGFiP Statistiques n° 51** (sept. 2026, *L'impôt sur le bénéfice 2025 des entreprises*, PDF `dgfip_stat_51_is-2025.pdf` **`read`**, corrigé au suivi post-fusion) :
     - **Entreprises à l'IS** : résultat fiscal **176 Md€** (287 de bénéfices − 111 de déficits, p. 2) ; **IS brut 70,5 Md€** (+2,0 %, p. 2) ; bénéfice imposable **257 Md€ à 25 %**, **31 Md€ à 15 %**, assiette de la contribution exceptionnelle (CEBGE) 20 Md€ (graphique 2 et note, p. 3) ; IS net provisoire **64,8 Md€** (p. 3).
     - **Ensemble des entreprises (IS + IR sur bénéfices professionnels)** : impôt brut **83,7 Md€** (+2,5 %), **13,1 Md€** de réductions et crédits d'impôt utilisés (dont CIR 7,7, Tableau 3 p. 7), impôt net **70,7 Md€** (+4 %) (p. 1). L'ancienne rédaction attribuait à tort les 13 Md€ de crédits au seul IS ; la relecture demandée (« IS brut 83,7 / net 70,7 ») confondait elle aussi le total IS + IR avec l'IS.
     - **Borne haute statique brute recalculée :** un point de taux normal porte sur les **257 Md€** imposés à 25 %, soit **2,57 ≈ 2,6 Md€/pt** (calcul, hors comportements et hors effet transitoire sur la CEBGE ; les crédits d'impôt, forfaitaires, ne varient pas avec le taux). L'ancien « 2,6–2,8 » (70,5 / 25) incluait à tort l'impôt au taux de 15 %. Faute de sensibilité publiée par la DG Trésor, le proxy `2,3` (ratio net Voies et moyens) est maintenu en **`calculé (estimation)`**, fourchette `[2,0 ; 3,0]` inchangée.
4. **`rend.cotis` (`8,5 → 7,4 [6,2 ; 10]` Md€/pt → `sourcé (fourchette), centre choisi`, décision de Patrick du 24 nov. 2026) :**
   - **Eurostat `nama_10_gdp`** (`eurostat_wages_fr.json`, **`read`**) : salaires et traitements bruts totaux (`D11`) = **`1 111,6 Md€`** (2024) et **`1 129,3 Md€`** (2025) ; cotisations employeurs (`D12`) = `406,9 Md€` (2025).
   - **Urssaf / Acoss** : masse salariale du **secteur privé** soumise à cotisations = **`726 Md€`** en 2024 (**`secondary`**) ; **+1,85 %** en moyenne annuelle en 2025 (*Stat'Ur* n° 415, févr. 2026, **`read`** ; la DGFiP cite +1,9 %), soit **≈ 739 Md€** en 2025 (calcul ; le chiffre « 740,0 » n'a pas été vu dans une source, l'API open.urssaf.fr étant inaccessible depuis l'environnement de travail). Hors salaires bruts publics (≈ `234 Md€`, FIPECO — une hausse de cotisations employeurs publics est un transfert interne entre APUC/APUL et ASSO, **neutre au consolidé APU**).
   - **Rapport d'évaluation des politiques de sécurité sociale – Financement 2026** (annexe 1 au PLACSS 2025, indicateur 1.4.1, pp. 32–33, données CCSS, **`read`**) : valeur 2025 d'un point de cotisation, **calculée avant exonérations** (« rendement constaté augmenté des montants d'exonérations », rapporté au taux) : vieillesse déplafonnée **7,3 Md€** (dont secteur privé **6,9 Md€**, graphique 2), vieillesse plafonnée **6,3 Md€**, maladie et famille **10,7 Md€** (champ élargi aux fonctionnaires, à certaines grandes entreprises comme EDF ou La Poste, aux agricoles et aux indépendants).
   - **PLFSS 2026, Annexe 4** (`plfss2026_annexe4.pdf`, **`read`**, corrigé) : **71,5 Md€** est le **coût total 2026 de l'ensemble des exonérations** sur le champ des régimes obligatoires de base (ROBSS) — allègements généraux 61,8 + exonérations ciblées compensées 6,9 + non compensées 2,8 (Tableau 6, p. 23 ; hors exemptions d'assiette) —, pas les seuls allègements généraux. Ces derniers « dépassent 75 Md€ en 2024 » en incluant les régimes spéciaux (39,4 Md€ de réduction générale et 36 Md€ de réductions proportionnelles, p. 36).
   - **Borne basse ramenée de 6,2 à 7,0 Md€/pt (suivi post-fusion) :** la « synthèse Cour des comptes / Sénat » à 6,2–7,5 n'a pas été retrouvée. 7,0 encadre la valeur du point du secteur privé (6,9) et de la vieillesse déplafonnée (7,3). Le raisonnement « net d'allègements » n'est pas retenu : les valeurs de point officielles sont calculées avant exonérations, et l'absorption d'une hausse de taux par la réduction générale dépend de la rédaction de la mesure.
   - **Décision du 24 nov. 2026 :** Recalibré à **`7,4 Md€/pt`** (`[7,0 ; 10]` après le suivi) et préréglage `tva_sociale` rééquilibré à `+1 pt` TVA tous taux (`+11,4 Md€`) / `−1,5 pt` cotisations (`−11,1 Md€`, écart ex ante `+0,3 Md€`) ; ces montants sont désormais calculés depuis `params.js` dans `presets.js`.
5. **`cmp.aft.taux_emission.2026` (`3,5 %`, affichage seul → reste `à collecter`) :**
   - Le site `aft.gouv.fr` est protégé contre l'accès automatisé (défi Cloudflare, non contourné) et le rapport annuel AFT 2026 n'est publié qu'après clôture de l'exercice. Les suivis financiers secondaires situent le taux moyen pondéré des émissions OAT MLT en cours d'année 2026 autour de **`3,47–3,6 %`**. Conservé honnêtement en **`à collecter`**.

---

## 8. Bilan Day 0 — Décisions ouvertes pour Patrick (avant le 10 décembre / `main`)

1. **`0` paramètre `de mémoire` restant** dans `src/engine/params.js` (sur 17 initiaux).
2. **`1` seul paramètre `à collecter` restant :** `cmp.aft.taux_emission.2026` (`3,5 %`, affichage seul, en attente du rapport annuel AFT 2026).
3. **3 calibrations approuvées le 24 nov. 2026 :** `comp.offset.prestations = 0,20`, `comp.theta.csg = 0,03`, `rend.cotis = 7,4 Md€/pt` (avec rééquilibrage du préréglage `tva_sociale`).
4. **`0` décision `à valider` restante (25 nov. 2026) :**
   - `ref.derive.b_autres = +0,05` (`[0 ; 0,11]`, **`calculé (estimation)`**, §4) : médiane des 5 fenêtres Eurostat D7 face à `g_pot = 1,0 %` (identique à la fenêtre 2007–2024).
   - `dem.m.prestations = 0,45` (`[0,2 ; 0,8]`, **`calculé (estimation)`**, §5) : équivalence cumulée 4 ans dans E4 à partir du profil FR-BDF WP 750 (`1,15 / 2,533 = 0,454`), recoupée par les proxys *Mésange*.
   - `lvt.capi.part = 0,80` (`[0,60 ; 1,00]`, **`sourcé (fourchette), centre choisi`**) : vérification directe du dépôt `alles-delenda-est/LVTShift` confirmant que `yields.json` n'exporte aucun paramètre de capitalisation (recommandation en prose dans `dynamic-effects.md` §5.4 : 100 % central / 60 % sensibilité) ; valeur `0,80` retenue le 24 nov. conservée dans le module.
   - Pour information : `comp.theta.ir` relevé de 0,15 à **0,35** (fourchette 0,14–0,62) par décision de Patrick du 25 nov. 2026 (§9).
5. **Paramètres `calculé (estimation)` (10 au total) :** `comp.tau0.ir`, les 6 revenus par tranche de l'IR (`offre.ir.tranche.*.parts`, `.0.revenu`, `.45.hors_bareme`), `rend.is` (`2,3 Md€/pt`), `ref.derive.b_autres` (`+0,05` pt/an) et `dem.m.prestations` (`0,45`).
6. **Hard gate de mise en production (`CLAUDE.md` §7) :** revue de sécurité **Gemini 4 Neon** avant toute fusion `review/day0` → `main`.

---

## 9. Dérivation tranche par tranche de `comp.theta.ir` (suivi post-fusion, 24 nov. 2026)

**Question.** La relecture des PR #30/#32 appliquait `θ = e × τ / (1 − τ)` au taux marginal moyen pondéré par les revenus (`τ0 = 21 %`) et en déduisait `θ = 0,05–0,10`. Patrick conteste la méthode : pour une hausse uniforme du barème, θ est la somme, pondérée par le rendement, de `e_i × τ_i / (1 − τ_i)` sur les tranches ; cette fonction est convexe en τ, le τ pertinent est le **coin marginal complet** (IR + CSG/CRDS + CEHR), et l'élasticité croît avec le revenu dans les études françaises. Cette section fait le calcul.

**Formule.** Pour une hausse de 1 point de tous les taux du barème (11, 30, 41 et 45 %), le rendement statique est `0,01 × B`, avec `B` le revenu imposable situé au-delà du seuil de la tranche à 11 % (somme sur les foyers de `z − 11 497 € × parts`). Chaque foyer de taux marginal `τ_i` voit son taux net `1 − τf_i` baisser de `0,01 × (1 − 6,8 %)` (le revenu imposable est net de la CSG déductible : même facteur que σ, ajouté le 25 nov. 2026 à la demande de la relecture indépendante de la PR #34, décision de Patrick) et son revenu imposable total `z` baisser de `e_i × z × 0,01 × 0,932 / (1 − τf_i)` ; la recette perdue (IR + CSG/CRDS + CEHR) vaut `τf_i` fois ce montant. D'où :

`θ(+1 pt) = Σ_i (Z_i / B) × e_i × τf_i / (1 − τf_i) × 0,932`

où `Z_i` est le revenu imposable total des foyers de la tranche i. Les poids `Z_i / B` somment à `a = Σ Z_i / B ≈ 2` (paramètre de Saez, 2001) : la réponse porte sur tout le revenu, la recette mécanique seulement sur sa part au-delà du premier seuil. Ce facteur, absent du calcul à taux unique, pèse autant que la convexité.

Le levier IR du moteur est une **hausse proportionnelle du barème** (« +1 % du produit ») : tous les taux sont multipliés par 1,01, si bien que le taux marginal d'un foyer monte de `0,01 × τ_i` tandis que son impôt ne monte que de 1 %. Pour ce levier : `θ(proportionnel) = Σ_i (τ_i × Z_i / T) × e_i × τf_i / (1 − τf_i) × 0,932`, `T` étant l'impôt total ; les poids somment à `Σ τ_i Z_i / T ≈ 2,7` (rapport du taux marginal au taux moyen).

**Données et méthode (revenu par tranche).**
- **`read`** — DGFiP, *Impôt sur le revenu : nombre de foyers et montant de l'impôt net par taux marginal de taxation du barème* (tableur `nid_25519_ir_taux_marginal.xlsx`, feuille 2024, revenus 2024, foyers imposés au barème) : 11 % : 20 930 797 foyers, 12 657,8 M€ ; 30 % : 6 868 031 foyers, 48 857,9 M€ ; 41 % : 434 112 foyers, 17 791,4 M€ ; 45 % : 61 476 foyers, 12 541,0 M€ (bornes du quotient familial 11 497 / 29 315 / 83 823 / 180 294 €). Ces effectifs sont ceux de `docs/sigma-fiscal.md` §7, qui les date à tort de l'impôt 2026 sur les revenus 2025 : ils portent sur les revenus 2024.
- La DGFiP ne publie pas le revenu par tranche. **Estimation (calcul)** : dans la tranche i, l'impôt par part vaut `τ_i × q − k_i` (k = 1 264,67 / 6 834,52 / 16 055,05 / 23 266,81 € d'après le barème) ; avec un nombre moyen de parts `p_i` supposé (1,5 / 2,0 / 1,8 / 1,8), `Z_i = (T_i + k_i × N_i × p_i) / τ_i`. Pour la tranche à 45 %, on retire d'abord ≈ 5 Md€ d'impôt hors barème et de CEHR (le millième supérieur en acquitte 5,05 Md€ : 3,73 + 1,32, DGFiP Statistiques n° 53, Tableau 2, **`read`**). Les quotients moyens obtenus (15 162 / 34 638 / 94 692 / 203 144 € par part) tombent bien dans les tranches. Total des tranches imposables : `Z` = 1 048 Md€, `B` = 519 Md€.
- **Coin marginal complet** (**`read`** service-public.fr, F2971 et F31130) : CSG 9,2 % + CRDS 0,5 % sur les revenus d'activité, dont 6,8 points de CSG déductibles ; CEHR 3 % (célibataire de 250 000 à 500 000 € de RFR, couple de 500 000 à 1 M€), 4 % au-delà. `τf = 9,7 % + τ_IR × (1 − 6,8 %)` (+ 3 % de CEHR en tranche 45 % au centre, 4 % au haut).
- **Élasticités** : **`secondary`** Lehmann, Marical & Rioux (2013, *JPubE* 99, résumé lu) : ≈ **0,2** pour le revenu salarial brut (surtout la participation des femmes mariées) ; **`read`** Cabannes, Houdré & Landais (2014, *Économie et Statistique* n° 467-468, `ES467F.pdf`) : **0,02** sur l'ensemble des foyers (Tableau 3, p. 155), **0,01** (P10–60) et **0,00** (P60–90) non significatives, **0,31** pour le dernier décile (Tableau 4, p. 156), variantes **0,15** et **0,45** (p. 157) ; **`read`** Neisser (2021, Tableau 8) : après déductions, moyenne **0,390**, médiane **0,343** ; **`read`** Piketty, Saez & Stantcheva (2014, *AEJ: Economic Policy* 6(1), pp. 232–233) : élasticité totale du centile supérieur **≈ 0,5**, dont au plus **0,2** d'offre réelle et au moins 0,3 de négociation des rémunérations (cette dernière n'est pas entièrement une perte de recettes).

**Tableau (cas central, revenus 2024).**

| Tranche | Revenu estimé `Z_i` (Md€) | Part du revenu imposable | `Z_i / B` | Coin complet `τf` | `τf / (1 − τf)` | `e` bas / central / haut | Contribution +1 pt (× 0,932) | Poids proportionnel `τ_i Z_i / T` | Contribution proportionnelle (× 0,932) |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|
| 11 % | 476,0 | 45,4 % | 0,917 | 19,95 % | 0,249 | 0,01 / **0,20** / 0,39 | 0,043 | 0,603 | 0,028 |
| 30 % | 475,8 | 45,4 % | 0,916 | 37,66 % | 0,604 | 0,08 / **0,20** / 0,39 | 0,103 | 1,644 | 0,185 |
| 41 % | 74,0 | 7,1 % | 0,143 | 47,91 % | 0,920 | 0,15 / **0,31** / 0,45 | 0,038 | 0,349 | 0,093 |
| 45 % | 22,5 | 2,1 % | 0,043 | 54,64 % (CEHR 3 %) | 1,205 | 0,15 / **0,31** / 0,50 | 0,015 | 0,116 | 0,041 |
| **Total** | **1 048,3** | 100 % | **2,02** | | | | **0,199** | **2,71** | **0,347** |

Élasticités : 11 % — bas Cabannes et al. P10–60, centre Lehmann et al., haut Neisser ; 30 % — bas : Cabannes et al. pondéré (≈ 0 pour P60–90, 0,15 pour la partie au-delà de P90), centre Lehmann et al. (Cabannes et al. pondéré ≈ 0,17), haut Neisser ; 41 et 45 % — Cabannes et al. dernier décile et ses variantes, haut 0,50 de Piketty et al. en tranche 45 %.

**Résultats.**

| Variante | θ, +1 pt sur tous les taux | θ, hausse proportionnelle (levier du moteur) |
|---|---:|---:|
| Bas (e bas, CEHR 3 %) | **0,07** | 0,14 |
| **Central** | **0,20** | **0,35** |
| Haut (e haut, CEHR 4 %) | **0,36** | 0,62 |
| Cabannes et al. seuls (0,01 / 0,17 / 0,31 / 0,31) | 0,14 | 0,29 |
| Coin IR seul (sans CSG/CRDS ni CEHR ni facteur 0,932), e central | 0,14 | 0,26 |
| Hypothèses de revenu basses / hautes (parts, hors barème 6,5 / 0 Md€), e central | 0,19 / 0,21 | 0,32 / 0,38 |
| Pour mémoire, sans le facteur 0,932 (version du 24 nov.) : bas / central / haut | 0,07 / 0,21 / 0,39 | 0,15 / 0,37 / 0,66 |
| Rappel : taux unique 21 %, IR seul (relecture) | 0,05 (e = 0,2) – 0,09 (e = 0,343) | — |

- **Conclusion.** La méthode de Patrick est confirmée : le calcul à taux unique sous-estime θ d'un facteur 4 à élasticité égale (0,20 contre 0,05 avec e = 0,2). Trois effets se cumulent : le facteur `a ≈ 2` (la réponse porte sur tout le revenu), le coin complet (la CSG/CRDS ajoute ≈ 10 points dans toutes les tranches) et, dans une moindre mesure ici, la convexité et l'élasticité plus forte en haut (41 et 45 % : 0,053 sur 0,199, alors qu'ils ne représentent que 9 % du revenu). Le levier du moteur étant proportionnel, le chiffre qui lui correspond est **0,35** (0,14–0,62) ; pour une hausse de 1 point de chaque taux (autre définition possible du levier), θ = 0,20 (0,07–0,36). Centre retenu : **0,35**, la valeur calculée pour le levier proportionnel du moteur, arrondie à 2 décimales (**décision de Patrick du 25 nov. 2026** ; le centre avait été fixé le 24 nov. à 0,15, bas de la fourchette, puis à 0,37 dans la première version de la PR #34, avant l'ajout du facteur 0,932). Fourchette enregistrée `[0,14 ; 0,62]`, statut **`sourcé (fourchette), centre choisi`**. Élasticité uniforme équivalente : θ / Σ_i (τ_i Z_i / T) × τf_i / (1 − τf_i) × 0,932 = 0,347 / 1,496 ≈ **0,23**.
- **Réserve tranchée (décision de Patrick, 25 nov. 2026) :** le centre 0,15 surestimait le rendement d'une hausse de l'IR (et sous-estimait le coût d'une baisse). Le centre est relevé à 0,35 ; le levier reste défini comme une hausse proportionnelle du barème.
- **Part réelle θ_réel de l'IR, cohérente avec θ (relecture indépendante de la PR #34, décision de Patrick du 25 nov. 2026).** L'ancienne part réelle (`−σ × recette propre de l'IR / (100 × rendement)` ≈ 0,113) n'était pas comparable à θ : elle ne comptait que l'IR, au taux moyen, avec des poids de revenu, alors que θ compte tout le coin (IR + CSG/CRDS + CEHR, `τf / (1 − τf)`) avec les poids `τ_i Z_i / T`. Désormais `θ_réel(t) = Σ_i (τ_i Z_i / T) × e_L × τf_i / (1 − τf_i) × 0,932 × phase(t)` (`thetaReelIr`, `src/engine/ir-tranches.js`), e_L étant déduit de σ (`e_L = −σ / (100 × Δ ln(1 − T))`), avec la même montée en charge que l'effet d'offre ; `θ_non_réel(t) = max(0, θ − θ_réel(t))`. θ_réel = 1,496 × e_L : **0,60** au cas central (e_L = 0,40), 0,82 au cas d'offre « bas » (e_L = 0,55), 0,30 au cas « haut » (e_L = 0,20). Au taux après réforme (+1 %, θ = 0,354), θ_non_réel vaut **0** aux cas central et bas et **0,055** au cas haut, à plein effet d'offre (contre 0,039 / 0 / 0,095 avec θ = 0,15 et l'ancienne part réelle). Les autres leviers gardent la formule générale : pour la CSG et les cotisations patronales, θ et θ_réel sont tous deux des mesures de l'impôt propre (taux propre dans θ, recette propre dans θ_réel), donc comparables entre eux ; voir `docs/model-note.md` §12, questions 4 et 6.
- **Élasticité réelle et élasticité totale (question 6 aux relecteurs).** e_L = 0,40 dépasse l'élasticité uniforme équivalente à θ (≈ 0,23) : la réponse « réelle » serait plus forte que la réponse totale dont elle devrait être une partie. Les deux viennent de littératures différentes (offre de travail agrégée et macroéconomique d'un côté, élasticité du revenu imposable sur données fiscales françaises de l'autre). Au cas central, θ_non_réel est donc bloqué à 0 et la réaction de l'IR passe entièrement par E5 et E7.
- **Limites du calcul :** revenus par tranche estimés (parts supposées ; impôt net après crédits d'impôt, ce qui sous-estime le revenu de la tranche à 11 %) ; décote ignorée (elle porte le taux marginal effectif d'une partie de la tranche à 11 % vers 16 %, ce qui relèverait θ) ; plafonnement du quotient familial et CDHR ignorés ; CSG des pensions plus faible (8,3 % + 0,5 %) ; cotisations sociales salariales non comptées dans le coin (prudent) ; élasticités de court terme (Cabannes et al.) appliquées au long terme.
- **Effet d'offre σ de l'IR : calculé tranche par tranche avec les mêmes données (décision de Patrick, 25 nov. 2026 ; question 5 de la note).** Les revenus, les seuils et les coins ci-dessus sont désormais des paramètres (`offre.ir.*`, `params.js`) lus par `src/engine/ir-tranches.js`, qui calcule à la fois σ de l'IR et θ par tranche (`thetaIrTranches`, qui reproduit 0,199 et 0,347 avec le facteur 0,932 ; `comp.theta.ir` = 0,35 depuis le 25 nov. 2026). Pour le levier proportionnel, `σ = −100 × e_L × Σ_i (Z_i / Z) × 0,01 × τ_i × (1 − 6,8 %) / (1 − w_i)`, la tranche à 0 % (≈ 96 Md€, estimation) comptant dans Z. Les poids somment à 1 : σ est une part du PIB, et le facteur `a ≈ 2` de θ (rapport à la recette mécanique) n'a pas lieu d'être.

| | Ancien (moyenne unique 21 % × 0,76 / 0,57) | Nouveau (par tranche) |
|---|---:|---:|
| σ de l'IR, % du PIB par point (bas / central / haut) | −0,056 / −0,112 / −0,154 | **−0,061 / −0,122 / −0,168** |
| Seuil de rentabilité e_L (solde primaire 2056) | 0,25 | **0,23** |
| Effet du levier IR +1 sur le solde primaire, cas central, 2036 / 2056 | −0,71 / −1,22 Md€ | **−0,87 / −1,51 Md€** |
| θ_non_réel IR (θ 0,152 au taux après réforme − part réelle), bas / central / haut | 0,009 / 0,048 / 0,100 | **0 / 0,039 / 0,095** |

**Effet des décisions du 25 nov. 2026 sur le levier IR (σ par tranche, cas central, e_L = 0,40).** Écart à la référence ; solde primaire en Md€, dette en points de PIB. Colonne 1 : `review/day0` avant la PR #34 ; colonne 2 : première version de la PR #34 (θ = 0,37, ancienne part réelle) ; colonne 3 : version retenue (θ = 0,35, part réelle cohérente avec θ).

| | θ = 0,15, ancienne part réelle | θ = 0,37, ancienne part réelle | **θ = 0,35, part réelle cohérente** |
|---|---:|---:|---:|
| IR +1 % : solde primaire 2030 / 2036 / 2056 | −0,14 / −0,87 / −1,51 | −0,40 / −1,18 / −2,04 | **−0,04 / −0,82 / −1,42** |
| IR +1 % : dette/PIB 2030 / 2036 / 2056 | +0,07 / +0,30 / +3,50 | +0,10 / +0,39 / +4,54 | **+0,07 / +0,31 / +3,43** |
| IR −1 % : solde primaire 2030 / 2036 / 2056 | +0,14 / +0,87 / +1,50 | +0,39 / +1,16 / +2,02 | **+0,04 / +0,82 / +1,42** |
| IR −1 % : dette/PIB 2030 / 2036 / 2056 | −0,07 / −0,30 / −3,44 | −0,10 / −0,39 / −4,45 | **−0,07 / −0,30 / −3,39** |
| Seuil de rentabilité e_L (solde primaire 2056) | 0,23 | 0,17 | **0,25** |
| IR +1 % en 2056 à e_L = 0,20 / 0,55 | +0,26 / −2,84 | −0,27 / −3,37 | **+0,35 / −2,84** |
| θ_non_réel IR (+1 %, plein effet), cas d'offre bas / central / haut | 0 / 0,039 / 0,095 | 0,219 / 0,262 / 0,318 | **0 / 0 / 0,055** |
| Scénario type « recettes » : solde primaire 2030 / 2036 / 2056 | +27,0 / +21,0 / +37,8 | +24,2 / +17,6 / +31,9 | **+27,8 / +21,8 / +39,2** |
| Scénario type « recettes » : dette/PIB 2036 / 2056 (écart à la référence) | −4,6 / −55,8 | −3,6 / −45,2 | **−4,6 / −56,7** |

  Au e_L central (0,40), une hausse proportionnelle de l'IR fait perdre des recettes à long terme ; elle ne se finance que si e_L < ≈ 0,25. La première version de la PR #34 (seuil 0,17, hausse perdante même à e_L = 0,20) comptait deux fois la réponse réelle (θ_non_réel trop élevé). Au cas central, θ_non_réel est nul à plein effet : le relèvement de θ ne joue que pendant la montée en charge de l'effet d'offre (5 ans) et dans le cas « haut ». Aucun autre levier n'est modifié ; seul le scénario type « recettes » contient le levier IR. Ce résultat dépend de l'effet d'offre de l'IR, toujours « non validé — avis demandé ».

  Le calcul par tranche ne relève σ que de 9 % : la convexité donne plus de poids aux tranches hautes, mais l'ancien calcul appliquait à tous les revenus la part nette du salarié de la tranche à 30 % (0,57). Variante avec un coin brut incluant les cotisations salariales (calé sur les 43 % de l'OCDE à la tranche de 30 %) : σ ≈ −0,109. Les revenus par tranche restent des estimations.

