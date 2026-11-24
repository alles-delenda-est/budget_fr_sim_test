# Vérification primaire des paramètres « de mémoire » et « à collecter » (Day 0 — 24 nov. 2026)

> **Objet :** Faire passer un premier lot de paramètres `de mémoire` et `à collecter` de `src/engine/params.js` par des sources primaires officielles ou de la littérature publiée (exigence de `docs/model-note.md` §4 avant le 10 décembre), **sans modifier aucune valeur centrale macroéconomique** sans décision explicite de Patrick (zéro dérive sur la trajectoire de référence et les comparateurs).
>
> Chaque chiffre est étiqueté **`read`** (PDF / API officielle téléchargés et inspectés directement), **`secondary`** (synthèse ou résumé académique), ou **`assumed`** (choix de modélisation).

---

## 1. Résumé des mises à jour dans `src/engine/params.js` et `src/engine/levers.js`

| Paramètre | Avant | Après | Valeur centrale | Mode de lecture & source |
|---|---|---|---:|---|
| `bloc.cofog.enseignement.*` (remplace proxy `bloc.part_hors_secu.*`) | `à collecter` (67,0 / 33,0 %) | **`sourcé (calcul)`** | **69,8 % État / 30,2 % locales** | **`read`** — Eurostat `gov_10a_exp` (2024, France, GF09) |
| `bloc.cofog.ordre_securite.*` | `à collecter` (67,0 / 33,0 %) | **`sourcé (calcul)`** | **80,3 % État / 19,7 % locales** | **`read`** — Eurostat `gov_10a_exp` (2024, France, GF03) |
| `bloc.cofog.affaires_economiques.*` | `à collecter` (67,0 / 33,0 %) | **`sourcé (calcul)`** | **68,7 % État / 31,3 % locales** | **`read`** — Eurostat `gov_10a_exp` (2024, France, GF04) |
| `fisc.eps` | `de mémoire` | **`sourcé (fourchette), centre choisi`** | **0,60** (`[0,50 ; 0,65]`, inchangé) | **`read`** — Commission européenne, Mourre, Poissonnier & Lausegger (2019), `dp098_en.pdf` : France = **0,630** (Tableau I.3 p. 41), sensibilité **0,60–0,63** (Tableau V.1 p. 50) |
| `comp.tau0.tva` | `de mémoire` | **`sourcé`** | **20 %** (inchangé) | **`read`** (texte légal) — CGI art. 278 (Légifrance) |
| `comp.tau0.csg` | `de mémoire` | **`sourcé`** | **9,2 %** (inchangé) | **`read`** (texte légal) — CSS art. L. 136-8 (Légifrance) |
| `offre.csg.tmi_salarie` | `de mémoire` | **`sourcé`** | **30 %** (inchangé) | **`read`** — Barème officiel IR 2026 (`service-public.gouv.fr` : 29 580 € à 84 577 € / part) |
| `ref.derive.b_autres` | `à collecter` (`0`, sans borne) | **`à valider`** (`0`, **`[0 ; 0,11]`**) | **0** (inchangé ; décision D7 soumise à Patrick) | **`read`** — Calcul direct sur séries Eurostat 1995–2024 (`gov_10a_exp` + `gov_10a_main` + `nama_10_gdp`) |
| `emploi.kappa` | `de mémoire` | **`sourcé (secondaire)`** | **0,4** (`[0,3 ; 0,5]`, inchangé) | **`secondary`** — Ball, Leigh & Loungani (2017, *JMCB* 49(7)) : France = **−0,37** |
| `comp.theta.is` | `de mémoire` | **`sourcé (secondaire)`** | **0,25** (`[0,20 ; 0,38]`, inchangé) | **`secondary`** — Beer, de Mooij & Liu (2020, *J. Economic Surveys* 34(3)) : `η ≈ 1,0–1,5` (`η × 25 % = 0,25–0,375`) |
| `comp.theta.tva` | `de mémoire` | **`sourcé (secondaire)`** | **0,03** (`[0 ; 0,08]`, inchangé) | **`secondary`** — Commission européenne, *VAT Gap in Europe 2025* : écart de conformité France **5,6 %** en 2023 (5,1 % en 2022) |
| `dem.m.achats_invest` | `de mémoire` | **`sourcé (secondaire)`** | **0,9** (`[0,5 ; 1,3]`, inchangé) | **`secondary`** — Ramey (2019, *JEP* 33(2) : `0,6–1,0`) ; Gechert (2015, *OEP* 67(3), 104 études : `≈ 1,0`, investissement `+0,5`) |
| `macro.pi.long` | `à collecter` | `à collecter` (source enrichie) | **1,85 %** (`[1,3 ; 2,3]`, inchangé) | **`secondary`** — Encadré par Banque de France sept. 2026 (IPCH 2028 : **1,6 %** total, **1,9 %** sous-jacent) et cible BCE (**2,0 %**) |

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
- **Conclusion pour le moteur :** Conserver `fisc.eps = 0,60` au centre dans la fourchette `[0,50 ; 0,65]` est pleinement cohérent avec les bornes empiriques de la Commission (`0,60–0,63`, moyenne UE `0,50`). Le statut passe de `de mémoire` à **`sourcé (fourchette), centre choisi`**.

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

- **Gain concret :** L'ancien proxy global sous-estimait de **13,3 points** la part de l'État dans *Ordre et sécurité publics* (`80,3 %` réels contre `67,0 %`). Aucun changement sur les totaux consolidés APU (les parts somment toujours exactement à 1).

---

## 4. Lecture directe primaire — Tendance longue de la dépense primaire hors vieillissement (`ref.derive.b_autres`, décision D7)

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

**Constat pour Patrick (décision D7) :**
- Quasi toute la hausse historique du ratio de dépenses primaires depuis 1995 (+4,4 pts de PIB) vient de la santé et des retraites (déjà dans `dA`).
- La dépense primaire **hors vieillissement** est restée remarquablement plate autour de **32–33 % du PIB** sur 25 ans (`−0,07` à `+0,02 pt/an`).
- Face à une croissance potentielle future plus basse (`1,0 %`), la tendance 2011–2024 (`+1,01 %/an`) implique **`0,00 pt/an`**, tandis que la tendance 1995–2024 (`+1,34 %/an`) implique **`+0,11 pt/an`**.
- Cette PR conserve `ref.derive.b_autres = 0` (aucun changement de trajectoire de référence), ajoute la fourchette sourcée **`[0 ; 0,11]`** et passe le statut de `à collecter` à **`à valider`** pour décision de Patrick.

---

## 5. Ce qui reste ouvert après cette PR (avant le 10 décembre)

1. **9 paramètres toujours `de mémoire` (nécessitent lectures primaires ciblées France / *Mésange* / DGFiP) :**
   - Multiplicateurs par catégorie (6) : `dem.m.remunerations` (0,8), `dem.m.prestations` (0,5), `dem.m.tva` (0,4), `dem.m.ir_csg` (0,4), `dem.m.cotisations` (0,4), `dem.m.is` (0,2).
   - Réactions comportementales `θ` (3) : `comp.theta.ir` (0,15), `comp.theta.csg` (0,10), `comp.theta.cotis` (0,15).
2. **5 paramètres toujours `à collecter` :**
   - `rend.is` (`2,3 Md€/pt`, proxy `58,2/25`), `rend.cotis` (`8,5 Md€/pt`, fourchette secondaire `7–10`), `comp.offset.prestations` (`0`, pour l'indexation des pensions et NDC), `macro.pi.long` (`1,85 %`, encadré `1,6–2,0 %`), `cmp.aft.taux_emission.2026` (`3,5 %`, affichage seul, non publié par l'AFT).
3. **2 décisions propriétaire (`à valider`) :**
   - `lvt.capi.part = 0,80` (`[0,60 ; 1,00]`, D12) et go/no-go du module LVT (30 nov.).
   - `ref.derive.b_autres = 0` (`[0 ; 0,11]`, D7 — maintenir `0` ou retenir un centre positif ex. `+0,05` / `+0,10`).
4. **Hard gate de mise en production (`CLAUDE.md` §7) :** revue de sécurité **Gemini 4 Neon** avant toute fusion vers `main`.
