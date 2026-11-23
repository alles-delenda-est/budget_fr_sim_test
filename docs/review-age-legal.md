# Revue primaire et recalibrage du levier « Âge légal de départ en retraite » (`age_legal`)

## Addendum 23 nov. 2026 (Claude, validé par Patrick)

Trois paramètres du levier sont modifiés après relecture directe des sources. Le reste de ce document (revue initiale et PR #23) est conservé tel quel ; là où il diffère, cet addendum prévaut.

1. **`rend.age_legal.baisse` : 3,40 → 3,90 Md€/an (fourchette 2,60 – 4,95).** Le texte qui accompagne le Tableau n° 6 de la Cour des comptes (20 févr. 2025, `297428.pdf`) attribue l'écart d'environ 50 % entre les économies d'un relèvement de l'âge et le coût d'un arrêt à 63 ans au traitement des *carrières longues* : bornes relevées d'un an dans le scénario AOD 65, inchangées dans le scénario AOD 63. Les bornes suivant désormais l'âge légal dans les deux sens (décision du 23 nov. 2026), le chiffrage de la Cour à bornes fixes (2,61 Md€ de pensions en 2045, ramené au PIB 2025) est multiplié par ≈ 1,5, soit 3,90 Md€ (0,130 % du PIB). Bas 2,60 : Cour à bornes fixes ; haut 4,95 : symétrie complète avec la hausse. Cette règle remplace l'hypothèse de +30 % de la PR #23 ; le ratio résiduel hausse / baisse passe de 1,46 à ≈ 1,27 (contrainte des 172 trimestres). Statut : « sourcé (fourchette), centre choisi ».
2. **`offre.sigma.age_legal` : +0,15 / +0,30 / +0,50 → +0,30 / +0,50 / +0,70 % du PIB par année d'âge légal** (L = 6, t0 = 0 et `rampInSupplyLag` inchangés). Sources : (a) DG Trésor, « Simulations pour le COR », mars 2026 (séance COR du 26 mars 2026, document n° 3, Tableau 4, méthode comptable, AOD 64 → 65 ans, montée en charge immédiate et complète) : PIB +0,5 % à 2 et 5 ans, +0,6 % à 10 ans, +0,7 % à 20 ans ; emploi +142 000, +198 000, +210 000 ; solde APU +0,4 / +0,5 pt ; élasticité unitaire du PIB à l'emploi, productivité des seniors égale à la moyenne, statuts d'activité figés (pas d'effet sur le chômage) : estimation haute ; Mésange jugé inadapté à un décalage de l'AOD. (b) COR, rapport annuel juin 2026, partie 2, chapitre 6, Tableau 2.10 p. 123 (DG Trésor, I-MIP CepreHANK, OFCE EmeRaude) : PIB +0,1 à +0,5 % à 2 ans, +0,5 à +0,7 % à 10 ans, +0,1 à +0,8 % à 20 ans ; emploi +160 000 à +250 000 à 10 ans, +200 000 à +240 000 à 20 ans ; solde primaire APU +0,3 à +0,6 pt à 10 ans, +0,3 à +0,65 pt à 20 ans. Le texte pp. 122–123 indique +0,7 à +0,9 point de PIB à long terme, ce qui ne concorde pas avec le tableau. Centre +0,50 : bas de la fourchette des modèles à 10 ans, pour tenir compte d'une productivité et d'une durée du travail des seniors inférieures à la moyenne (choix) ; haut +0,70 : méthode comptable DG Trésor à 20 ans ; bas +0,30 : substitution et bas de la fourchette à 20 ans. Décision de Patrick du 23 nov. 2026, qui remplace celle du 17 nov. (+0,30 au centre).
3. **`comp.offset.age_legal` : centre 0,20 et bas 0,15 inchangés, haut 0,25 → 0,33.** Source ajoutée : COR, rapport annuel juin 2026, partie 2, chapitre 6, pp. 119–120, citant Drees/Dares (séance COR de janvier 2022) : « près d'un tiers des économies réalisées sur les dépenses de retraite grâce à un recul de l'âge d'ouverture des droits serait compensé à court terme par une hausse des dépenses sociales hors retraite ». Le centre (0,20) reste l'estimation stabilisée Cour / Drees-Dares sur la réforme de 2010 ; 0,33 est l'effet de court terme selon le COR.

**Vérification.** Chiffres du Tableau n° 6 de la Cour et part de 20 % de reports (p. 67) confirmés par lecture directe du PDF. Chiffres du Tableau 2.10 du COR (juin 2026) et du Tableau 4 de la DG Trésor (mars 2026) tels que repris ci-dessus.

**Totaux de régime permanent (PIB 2025, `ε_offre` = 0,436).** Hausse : 4,95 × 0,8 + 0,436 × 0,50 % × 2 991 = +10,48 Md€ (+0,350 % du PIB ; +0,438 % au cas haut d'offre). Baisse : −3,90 × 0,8 − 0,436 × 0,50 % × 2 991 = −9,64 Md€ (−0,322 % du PIB). Ces totaux remplacent +0,263 % / +0,350 % cités plus bas.

**Effets simulés par rapport à la référence** (`projectScenario`, horizon 30 ans, paramètres centraux, profils de cohortes par défaut) :

| Variante | Année | Δ solde (Md€ courants) | Δ solde (pt de PIB) | Δ solde primaire (pt de PIB) | Δ PIB (%) |
|---|---|---|---|---|---|
| +1 an (65 ans) | 2030 | +3,9 | +0,12 | +0,11 | +0,15 |
| +1 an (65 ans) | 2034 | +15,2 | +0,43 | +0,34 | +0,46 |
| +1 an (65 ans) | 2036 | +19,2 | +0,52 | +0,35 | +0,48 |
| +1 an (65 ans) | 2040 | +30,9 | +0,73 | +0,36 | +0,50 |
| +1 an (65 ans) | 2045 | +60,2 | +1,22 | +0,36 | +0,50 |
| −1 an (63 ans) | 2030 | −2,3 | −0,07 | −0,07 | −0,06 |
| −1 an (63 ans) | 2034 | −12,2 | −0,35 | −0,28 | −0,39 |
| −1 an (63 ans) | 2036 | −17,0 | −0,47 | −0,33 | −0,49 |
| −1 an (63 ans) | 2040 | −27,6 | −0,67 | −0,34 | −0,50 |
| −1 an (63 ans) | 2045 | −54,9 | −1,14 | −0,34 | −0,50 |

Le solde total s'écarte du solde primaire au fil du temps parce que la dette plus basse (ou plus haute) réduit (ou augmente) la charge d'intérêts ; le solde primaire se stabilise vers +0,36 / −0,34 pt de PIB, dans la fourchette du COR (+0,3 à +0,6 pt à 10 ans).

---

> **Document de revue (23 nov. 2026) — destiné à Claude et Patrick sur `review/day0`.**
> Analyse primaire menée à partir des PDF originaux de la **Cour des comptes** (*Situation financière et perspectives du système de retraites*, 20 févr. 2025, `297428.pdf`, **lu**) et du **COR** (*Rapport annuel – Juin 2026, Synthèse*, `Synthèse_RA_2026.pdf`, **lu**). Chaque chiffre est étiqueté **`read`** (lu directement dans le document primaire), **`secondary`** (source secondaire / synthèse) ou **`assumed`** (hypothèse de modélisation explicite).
>
> **Décision tranchée par Patrick (23 nov. 2026) :** sur l'incertitude n° 2 (*carrières longues*), les **bornes d'âge des départs anticipés pour carrières longues suivent symétriquement l'âge légal de la réforme** (en hausse comme en baisse). Les incertitudes n° 1 (`σ` emploi à 64–65 ans), n° 3 (part de reports à 64–65 ans / ancrage invalidité à 62 ans) et n° 4 (interaction avec les 172 trimestres pour les générations 1970–1980) sont notées en l'état pour la revue.

---

## 0. Ce que corrige cette PR par rapport à l'implémentation précédente (`rend.age_legal = 8,4 Md€`)

L'étalon initial (`rend.age_legal = 8,4 Md€`, symétrique, `comp.offset.prestations = 0`, rampe linéaire 6 ans 2028–2033) cumulait **quatre biais identifiés lors de la lecture directe des PDF primaires** :

1. **Double comptage des cotisations retraites (`~2,0 Md€` à PIB 2025, soit `20,5 %` du retour fiscal) :** Le `8,4 Md€` du Tableau n° 6 de la Cour des comptes (p. 72, **`read`**) somme `+6,0 Md€` de pensions évitées `(A)` et `+2,4 Md€` de cotisations retraites additionnelles `(B)`. Or l'équation `E7` applique déjà `fisc.eps_offre = 0,436` (taux de prélèvements obligatoires **toutes administrations, cotisations retraites incluses**) à l'effet d'offre `yS`. Conserver `8,4 Md€` dans `E2` compte donc les cotisations retraites deux fois.
2. **Erreur d'échelle de PIB (`+20 %` de surestimation vs PIB 2045, soit `−17,6 %` d'abattement pour ramener au PIB 2025) :** Les `8,4 Md€` de la Cour sont exprimés en **euros constants 2024** mais au niveau de PIB et de masse de pensions de **2035 (`3 284 Md€`, `+10 %` vs 2025)** ou **2045 (`3 628 Md€`, `+21,3 %` en volume, `+20,2 %` après IPC 2025 sur `8,4 / 6,99`)**, alors que `E2` divise l'étalon statique par `base.pib.2025 = 2 991 Md€`. En part de PIB, `8,48 / 3 628 = 0,234 %` du PIB (soit `6,99 Md€` à PIB 2025 pour `A+B`, et **`4,95 Md€`** pour les seules pensions évitées `A`).
3. **Omission des effets de report hors retraites (`−20 %` de `A`) :** Le Tableau n° 6 de la Cour n'intègre pas les reports vers d'autres prestations sociales, alors que la **page 67 du même rapport (`read`)** cite DREES/DARES (janv. 2022) et Rabaté & Rochut (2020) à **`20 %` des économies brutes de pensions** (`52 %` Unédic ARE/AREF, `36 %` IJ maladie, `12 %` RSA/ASS, `0 %` invalidité/AAH tant que l'AOD invalidité reste à 62 ans). Le moteur applique désormais `comp.offset.age_legal = 0,20` (`[0,15 ; 0,25]`) via `E3`.
4. **Asymétrie hausse / baisse (bornes *carrières longues* symétriques, décision du 23 nov. 2026) et calendrier LFSS 2026 :**
   - **Hausse (`64 → 65 ans`)** : `rend.age_legal.hausse = 4,95 Md€` (`[4,20 ; 6,10]`, `0,166 %` PIB brut ; `+3,96 Md€` / `+0,132 %` PIB net des 20 % de reports). Le scénario `AOD 65` de la Cour translate déjà les bornes *carrières longues* de `+1 an` (`read`, pp. 71–72, 92).
   - **Baisse (`64 → 63 ans`)** : `rend.age_legal.baisse = 3,40 Md€` (`[2,60 ; 4,30]`, `0,114 %` PIB brut ; `−2,72 Md€` / `−0,091 %` PIB net des 20 % de reports). Par décision de Patrick (23 nov. 2026), les bornes *carrières longues* suivent aussi la baisse de `−1 an`, ce qui majore d'environ `+30 %` (`assumed`, calibré sur Cour p. 71) le chiffrage de la Cour à *carrières longues* fixes (`2,61 Md€`, borne basse `2,60`). L'asymétrie résiduelle (`4,95 / 3,40 = 1,46×`) reflète uniquement la contrainte structurelle des **172 trimestres** pour les générations nées après 1970.
   - **Calendrier LFSS 2026 :** le gel à `62 ans 9 mois / 170 trim.` couvre la génération `1964` **et le T1 `1965`** ; la reprise de janvier 2028 porte `64 ans / 172 trim.` à la génération **`1969` (2033)**. Un plafonnement à `63 ans` ne mord donc qu'en **2029** (gén. `1966`–`1969`, plein effet `2033`, 5 ans).

### Points ouverts soumis à l'avis de Claude avant fusion

1. **Calendrier par défaut à la hausse (`x > 0`) : accéléré `+6 mois/gén.` dès 2028 vs continuation `+3 mois/gén.` dès 2034.**
   - Cette PR retient par défaut pour `x > 0` le **profil accéléré `+6 mois/gén.` dès janvier 2028** (`2028–2034` : `[0,156 ; 0,281 ; 0,375 ; 0,625 ; 0,719 ; 0,781 ; 1,000]`), afin qu'une hausse d'âge produise un effet lisible dès l'horizon 10 ans (`2036`) et reste comparable au scénario symétrique de la Cour (`2028–2033` avant LFSS 2026) et à l'affichage UI « dès janvier 2028 ».
   - L'alternative strictement fidèle à la continuation `+3 mois/gén.` (gén. `1970–1973`) donne `0 Md€` de 2028 à 2033 et monte de `2034` à `2038` (`[0,219 ; 0,406 ; 0,594 ; 0,781 ; 1,000]`, soit `59,4 %` en 2036). Souhaitez-vous garder `2028` accéléré par défaut, basculer sur `2034` continuation, ou exposer un sélecteur de rythme ?
2. **Symétrie de `offre.sigma.age_legal` à la baisse (`x < 0`).**
   - `offre.sigma.age_legal` reste symétrique (`+0,15 / +0,30 / +0,50 %` PIB, décision de Patrick du 17 nov. 2026). À long terme (`2045`), la contrainte des 172 trimestres pourrait également réduire l'élasticité d'emploi d'un retour à 63 ans (`sigmaBaisse` plus faible en valeur absolue). À trancher si besoin dans une passe ultérieure.

*(Le point antérieur sur le traitement des seuils carrières longues à la baisse a été tranché par Patrick le 23 nov. 2026 : ils suivent symétriquement l'âge légal de la réforme.)*

---

## 1. Summary

Reading the primary **Cour des comptes** report (*Situation financière et perspectives du système de retraites*, 20 Feb 2025, `297428.pdf`, pp. 11, 66–68, 70–73, 92–95 — **`read`**) and the **COR June 2026 Synthèse** (`Synthèse_RA_2026.pdf`, pp. 1–5, 9, 15 — **`read`**) directly resolves every press ambiguity and exposes **four major parameter adjustments** needed in the simulator. First, under **LFSS 2026**, the freeze covers generation 1964 *and* Q1 1965 at 62y9m / 170 quarters, pushing 64 years back to **generation 1969 (reaching 64 in 2033)** (**`read`**, COR 2026 p. 5); consequently, a +3 months/generation continuation to 65 affects generations **1970–1973 (phase-in 2034–2038)**, whereas capping at 63 affects generations **1966–1969 (phase-in 2029–2033)**, and only an accelerated **+6 months/generation** reform starts in **2028** (generations 1965 Q2–1969, full in 2034). Second, the Cour's headline **`+8,4 Md€`** (2035 symmetric / 2045 delayed, constant **2024** €) already bundles **`+6,0 Md€` of pension spending avoided** and **`+2,4 Md€` of extra pension contributions** while omitting **~20% non-pension spillovers** (DREES/DARES Jan 2022 & Rabaté–Rochut 2020: 52% Unédic, 36% sickness IJ, 12% RSA/ASS; 0% invalidity because the 62-year invalidity threshold is unchanged). Third, because `ε_offre = 0,436` (total mandatory levies / GDP) already captures **100% of extra tax and pension-contribution revenues**, pension contributions represent **`~20,5%`** of the macro tax return — so putting `8,4 Md€` directly into `E2` *on top of* `σ × ε_offre` double-counts pension contributions by `~2,0 Md€` (2025 GDP scale), overstates GDP scaling (`8,4 Md€` is at 2035–2045 GDP, not 2025 GDP), omits spillovers (`~1,0 Md€`), and hides a genuine **Up vs Down asymmetry**. Fourth, per Patrick's 23 Nov 2026 design decision, ***carrières longues* thresholds track the statutory reform age symmetrically** in both directions (eliminating ~half of Cour's `1,95×` gap where *carrières longues* were held fixed on the downside, leaving a structural **`1,46×`** steady-state asymmetry driven by the binding 172-quarter duration rule). Stripping out double-counting and deducting 20% spillovers gives a clean steady-state direct non-macro APU spending yield of **`+0,132%` of GDP (`+3,96 Md€` at 2025 GDP)** Up and **`−0,091%` of GDP (`−2,72 Md€`)** Down (or **`+0,166%` / `−0,114%`** gross pensions avoided/added — **`4,95` / `3,40 Md€`** — before applying `spillover_share = 0,20`), which paired with `σ = +0,30%`–`+0,50%` GDP yields **`+0,26%` to `+0,35%` of GDP** total APU Up — reconciling squarely with COR June 2026 (`+0,30` to `+0,65 pt` GDP at 20 years, **`read`**).

---

## Verification of Current Law (LFSS 2026) & Generational Schedules

- **Correction to current-law summary:** Under **LFSS 2026** (effective 1 Sept 2026, **`read`** in COR June 2026 Synthèse p. 5; details **`secondary`** via `service-public.gouv.fr` & `salerya.fr`), the freeze at **62y9m / 170 quarters** applies to **generation 1964 AND those born Jan–Mar 1965**. The +3m/gen climb resumes in **January 2028** starting with **Apr–Dec 1965 (63y0m / 171q)**, then **1966 (63y3m / 172q)**, **1967 (63y6m / 172q)**, **1968 (63y9m / 172q)**, reaching **64y0m / 172q for generation 1969** (retiring in **2033**, one year later than the 2023 law's gen 1968 / 2032).
- **Exact affected generations and calendar arrival years:**

| Generation | Current Law (LFSS 2026) | **Up (+3m/gen continuation)** | **Up (+6m/gen accelerated from Jan 2028)** | **Down (cap at 63 = −3m/gen vs law)** |
|---|---|---|---|---|
| **1964** | 62y9m / 170q (Oct 2026–Sep 2027) | Unchanged | Unchanged | Unchanged |
| **1965 Q1** | 62y9m / 170q (Oct–Dec 2027) | Unchanged | Unchanged | Unchanged |
| **1965 Q2–Q4** | 63y0m / 171q (Apr–Dec 2028) | Unchanged | **63y3m** (+3m, Jul 2028–Mar 2029) | 63y0m (0m diff) |
| **1966** | 63y3m / 172q (Apr 2029–Mar 2030) | Unchanged | **63y9m** (+6m, Oct 2029–Sep 2030) | **63y0m** (−3m, Jan–Dec 2029) |
| **1967** | 63y6m / 172q (Jul 2030–Jun 2031) | Unchanged | **64y3m** (+9m, Apr 2031–Mar 2032) | **63y0m** (−6m, Jan–Dec 2030) |
| **1968** | 63y9m / 172q (Oct 2031–Sep 2032) | Unchanged | **64y9m** (+12m, Oct 2032–Sep 2033) | **63y0m** (−9m, Jan–Dec 2031) |
| **1969** | 64y0m / 172q (Jan–Dec 2033) | Unchanged | **65y0m** (+12m, Jan–Dec 2034) | **63y0m** (−12m, Jan–Dec 2032) |
| **1970** | 64y0m / 172q (Jan–Dec 2034) | **64y3m** (+3m, Apr 2034–Mar 2035) | **65y0m** (+12m) | **63y0m** (−12m) |
| **1971** | 64y0m / 172q (Jan–Dec 2035) | **64y6m** (+6m, Jul 2035–Jun 2036) | **65y0m** (+12m) | **63y0m** (−12m) |
| **1972** | 64y0m / 172q (Jan–Dec 2036) | **64y9m** (+9m, Oct 2036–Sep 2037) | **65y0m** (+12m) | **63y0m** (−12m) |
| **1973+** | 64y0m / 172q (Jan–Dec 2037+) | **65y0m** (+12m, Jan–Dec 2038+) | **65y0m** (+12m) | **63y0m** (−12m) |

*(Note: For **Down 64→63**, a "−6m/gen" variant starting in 2028 does not exist without dipping below 63, because current law is already at 63y0m for gen 1965 Q2–Q4 and only climbs at +3m/gen thereafter.)*

---

## 2. Year-by-Year Estimates (2028–2056 & Steady State)

**Deflation & GDP basis:** Cour des comptes constant-2024-euro figures (**`read`**, p. 72) are converted to **constant 2025 euros** using 2025 annual CPI inflation **`+0,9%`** (`× 1,009`; **`read`** in `docs/baseline-data.md` / RESF 2027 & INSEE — note 2025 GDP deflator is `+1,1%` **`secondary`**, a 0,2% difference). Real GDP starts at **`2 991,0 Md€`** in 2025 (**`read`**, RESF 2027) and grows at the simulator's reference real growth path (`0,55%` in 2026, `0,85%` in 2027, `1,00%` from 2028 onward → `3 063 Md€` in 2028, `3 284 Md€` in 2035, `3 628 Md€` in 2045, `4 048 Md€` in 2056).

**Column definitions (sign convention: `+` improves public balance, `−` degrades it):**
- **(1) Pensions:** Pension spending avoided (`+`) or added (`−`), all mandatory schemes (base + complementary + public sector).
- **(2) Contrib:** Extra (`+`) or lost (`−`) pension contributions from longer/shorter careers *(flagged: overlaps ~20,5% of macro tax return in Section 3)*.
- **(3) Spillovers:** `−20%` of `(1)` (**`read`** in Cour p. 67 citing DREES/DARES Jan 2022 & Rabaté–Rochut 2020: **52% Unédic ARE/AREF**, **36% sickness IJ**, **12% RSA/ASS**, **0% invalidity/AAH** since invalidity AOD stays at 62).
- **(4a) Net Pension = `(1) + (2)`** (Cour des comptes `A + B` perimeter).
- **(4b) Net APU (excl. broader macro tax return C) = `(1) + (2) + (3)`**. *(Pure non-macro direct spending net of spillovers = `(1) + (3)` is reported explicitly in Section 3.)*

### Table 2A — Central Case (Symmetric *carrières longues*, Patrick decision 23 Nov 2026): **Up (+3m/gen continuation, gen 1970–1973)** vs **Down (cap at 63, gen 1966–1969)**

*(Values in **Md€ constants 2025 (% of projected real GDP)**; maturation factors **`assumed`** to reproduce Cour Graphique 32 & p. 73 post-peak fade: Up `-11%` over 7 yrs post-peak from surcote/Agirc-Arrco accrual; Down `-33%` over 2035–2045 from binding 172q & smaller accrued pensions. Down column reflects **symmetric `-1 yr` *carrières longues* shift** = `+30%` **`assumed`** uplift over Cour's fixed-*carrières longues* baseline of `−2,61 Md€` / `−0,087%` GDP in steady state, calibrated from Cour p. 71.)*

| Year | Up (1) Pensions | Up (2) Contrib | Up (3) Spillovers | Up (4a) Net Pension | Up (4b) Net APU ex-macro | Down (1) Pensions | Down (2) Contrib | Down (3) Spillovers | Down (4a) Net Pension | Down (4b) Net APU ex-macro |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **2028** | +0.00 (+0.00%) | +0.00 (+0.00%) | 0.00 (0.00%) | +0.00 (+0.00%) | +0.00 (+0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) |
| **2029** | +0.00 (+0.00%) | +0.00 (+0.00%) | 0.00 (0.00%) | +0.00 (+0.00%) | +0.00 (+0.00%) | −1.15 (−0.04%) | −0.44 (−0.01%) | +0.23 (+0.01%) | −1.59 (−0.05%) | −1.36 (−0.04%) |
| **2030** | +0.00 (+0.00%) | +0.00 (+0.00%) | 0.00 (0.00%) | +0.00 (+0.00%) | +0.00 (+0.00%) | −2.15 (−0.07%) | −0.82 (−0.03%) | +0.43 (+0.01%) | −2.97 (−0.10%) | −2.54 (−0.08%) |
| **2031** | +0.00 (+0.00%) | +0.00 (+0.00%) | 0.00 (0.00%) | +0.00 (+0.00%) | +0.00 (+0.00%) | −3.18 (−0.10%) | −1.21 (−0.04%) | +0.64 (+0.02%) | −4.39 (−0.14%) | −3.76 (−0.12%) |
| **2032** | +0.00 (+0.00%) | +0.00 (+0.00%) | 0.00 (0.00%) | +0.00 (+0.00%) | +0.00 (+0.00%) | −4.22 (−0.13%) | −1.61 (−0.05%) | +0.84 (+0.03%) | −5.83 (−0.18%) | −4.99 (−0.16%) |
| **2033** | +0.00 (+0.00%) | +0.00 (+0.00%) | 0.00 (0.00%) | +0.00 (+0.00%) | +0.00 (+0.00%) | −5.46 (−0.17%) | −2.08 (−0.06%) | +1.09 (+0.03%) | −7.54 (−0.23%) | −6.45 (−0.20%) |
| **2034** | +1.32 (+0.04%) | +0.53 (+0.02%) | −0.26 (−0.01%) | +1.85 (+0.06%) | +1.58 (+0.05%) | −5.52 (−0.17%) | −2.10 (−0.06%) | +1.10 (+0.03%) | −7.62 (−0.23%) | −6.52 (−0.20%) |
| **2035** | +2.48 (+0.08%) | +0.99 (+0.03%) | −0.50 (−0.02%) | +3.47 (+0.11%) | +2.97 (+0.09%) | −5.57 (−0.17%) | −2.12 (−0.06%) | +1.11 (+0.03%) | −7.70 (−0.23%) | −6.58 (−0.20%) |
| **2036** | +3.66 (+0.11%) | +1.46 (+0.04%) | −0.73 (−0.02%) | +5.12 (+0.15%) | +4.39 (+0.13%) | −5.44 (−0.16%) | −2.07 (−0.06%) | +1.09 (+0.03%) | −7.52 (−0.23%) | −6.43 (−0.19%) |
| **2037** | +4.87 (+0.15%) | +1.94 (+0.06%) | −0.97 (−0.03%) | +6.81 (+0.20%) | +5.83 (+0.17%) | −5.31 (−0.16%) | −2.02 (−0.06%) | +1.06 (+0.03%) | −7.33 (−0.22%) | −6.27 (−0.19%) |
| **2038** | +6.29 (+0.19%) | +2.50 (+0.07%) | −1.26 (−0.04%) | +8.80 (+0.26%) | +7.54 (+0.22%) | −5.17 (−0.15%) | −1.97 (−0.06%) | +1.03 (+0.03%) | −7.14 (−0.21%) | −6.11 (−0.18%) |
| **2039** | +6.26 (+0.18%) | +2.50 (+0.07%) | −1.25 (−0.04%) | +8.76 (+0.26%) | +7.51 (+0.22%) | −5.03 (−0.15%) | −1.92 (−0.06%) | +1.01 (+0.03%) | −6.95 (−0.20%) | −5.94 (−0.17%) |
| **2040** | +6.22 (+0.18%) | +2.50 (+0.07%) | −1.24 (−0.04%) | +8.71 (+0.25%) | +7.47 (+0.22%) | −4.89 (−0.14%) | −1.86 (−0.05%) | +0.98 (+0.03%) | −6.75 (−0.20%) | −5.78 (−0.17%) |
| **2041** | +6.18 (+0.18%) | +2.49 (+0.07%) | −1.24 (−0.04%) | +8.67 (+0.25%) | +7.43 (+0.21%) | −4.74 (−0.14%) | −1.81 (−0.05%) | +0.95 (+0.03%) | −6.55 (−0.19%) | −5.60 (−0.16%) |
| **2042** | +6.14 (+0.17%) | +2.49 (+0.07%) | −1.23 (−0.03%) | +8.62 (+0.24%) | +7.40 (+0.21%) | −4.59 (−0.13%) | −1.75 (−0.05%) | +0.92 (+0.03%) | −6.34 (−0.18%) | −5.43 (−0.15%) |
| **2043** | +6.10 (+0.17%) | +2.48 (+0.07%) | −1.22 (−0.03%) | +8.58 (+0.24%) | +7.36 (+0.21%) | −4.44 (−0.12%) | −1.69 (−0.05%) | +0.89 (+0.02%) | −6.13 (−0.17%) | −5.24 (−0.15%) |
| **2044** | +6.05 (+0.17%) | +2.48 (+0.07%) | −1.21 (−0.03%) | +8.53 (+0.24%) | +7.32 (+0.20%) | −4.28 (−0.12%) | −1.63 (−0.05%) | +0.86 (+0.02%) | −5.92 (−0.16%) | −5.06 (−0.14%) |
| **2045** | +6.01 (+0.17%) | +2.47 (+0.07%) | −1.20 (−0.03%) | +8.48 (+0.23%) | +7.27 (+0.20%) | −4.12 (−0.11%) | −1.57 (−0.04%) | +0.82 (+0.02%) | −5.70 (−0.16%) | −4.87 (−0.13%) |
| **2046** | +6.07 (+0.17%) | +2.49 (+0.07%) | −1.21 (−0.03%) | +8.56 (+0.23%) | +7.35 (+0.20%) | −4.17 (−0.11%) | −1.59 (−0.04%) | +0.83 (+0.02%) | −5.75 (−0.16%) | −4.92 (−0.13%) |
| **2047** | +6.13 (+0.17%) | +2.52 (+0.07%) | −1.23 (−0.03%) | +8.65 (+0.23%) | +7.42 (+0.20%) | −4.21 (−0.11%) | −1.60 (−0.04%) | +0.84 (+0.02%) | −5.81 (−0.16%) | −4.97 (−0.13%) |
| **2048** | +6.19 (+0.17%) | +2.54 (+0.07%) | −1.24 (−0.03%) | +8.73 (+0.23%) | +7.49 (+0.20%) | −4.25 (−0.11%) | −1.62 (−0.04%) | +0.85 (+0.02%) | −5.87 (−0.16%) | −5.02 (−0.13%) |
| **2049** | +6.25 (+0.17%) | +2.57 (+0.07%) | −1.25 (−0.03%) | +8.82 (+0.23%) | +7.57 (+0.20%) | −4.29 (−0.11%) | −1.63 (−0.04%) | +0.86 (+0.02%) | −5.93 (−0.16%) | −5.07 (−0.13%) |
| **2050** | +6.31 (+0.17%) | +2.60 (+0.07%) | −1.26 (−0.03%) | +8.91 (+0.23%) | +7.65 (+0.20%) | −4.33 (−0.11%) | −1.65 (−0.04%) | +0.87 (+0.02%) | −5.99 (−0.16%) | −5.12 (−0.13%) |
| **2051** | +6.38 (+0.17%) | +2.62 (+0.07%) | −1.28 (−0.03%) | +9.00 (+0.23%) | +7.72 (+0.20%) | −4.38 (−0.11%) | −1.67 (−0.04%) | +0.88 (+0.02%) | −6.05 (−0.16%) | −5.17 (−0.13%) |
| **2052** | +6.44 (+0.17%) | +2.65 (+0.07%) | −1.29 (−0.03%) | +9.09 (+0.23%) | +7.80 (+0.20%) | −4.42 (−0.11%) | −1.68 (−0.04%) | +0.88 (+0.02%) | −6.11 (−0.16%) | −5.22 (−0.13%) |
| **2053** | +6.50 (+0.17%) | +2.67 (+0.07%) | −1.30 (−0.03%) | +9.18 (+0.23%) | +7.88 (+0.20%) | −4.47 (−0.11%) | −1.70 (−0.04%) | +0.89 (+0.02%) | −6.17 (−0.16%) | −5.27 (−0.13%) |
| **2054** | +6.57 (+0.17%) | +2.70 (+0.07%) | −1.31 (−0.03%) | +9.27 (+0.23%) | +7.96 (+0.20%) | −4.51 (−0.11%) | −1.72 (−0.04%) | +0.90 (+0.02%) | −6.23 (−0.16%) | −5.33 (−0.13%) |
| **2055** | +6.63 (+0.17%) | +2.73 (+0.07%) | −1.33 (−0.03%) | +9.36 (+0.23%) | +8.04 (+0.20%) | −4.56 (−0.11%) | −1.74 (−0.04%) | +0.91 (+0.02%) | −6.29 (−0.16%) | −5.38 (−0.13%) |
| **2056** | +6.70 (+0.17%) | +2.76 (+0.07%) | −1.34 (−0.03%) | +9.46 (+0.23%) | +8.12 (+0.20%) | −4.60 (−0.11%) | −1.75 (−0.04%) | +0.92 (+0.02%) | −6.35 (−0.16%) | −5.43 (−0.13%) |
| **Steady state (2025 GDP = 2 991 Md€)** | **+4.95 (+0.17%)** | **+2.04 (+0.07%)** | **−0.99 (−0.03%)** | **+6.99 (+0.23%)** | **+6.00 (+0.20%)** | **−3.40 (−0.11%)** | **−1.30 (−0.04%)** | **+0.68 (+0.02%)** | **−4.70 (−0.16%)** | **−4.02 (−0.13%)** |

### Table 2B — Second Variant: **Up Accelerated (+6m/gen total = +3m/gen on top of LFSS 2026 from Jan 2028, gen 1965 Q2–1969)**

*(From 2041 onward, identical to Table 2A Up steady-state percentages: `+0.17% / +0.07% / −0.03% / +0.23% / +0.20%`.)*

| Year | Cohort Share | Up (1) Pensions | Up (2) Contrib | Up (3) Spillovers | Up (4a) Net Pension | Up (4b) Net APU ex-macro |
|---:|---:|---:|---:|---:|---:|---:|
| **2028** | 15.6% | +0.89 (+0.03%) | +0.35 (+0.01%) | −0.18 (−0.01%) | +1.24 (+0.04%) | +1.07 (+0.03%) |
| **2029** | 28.1% | +1.62 (+0.05%) | +0.64 (+0.02%) | −0.32 (−0.01%) | +2.26 (+0.07%) | +1.94 (+0.06%) |
| **2030** | 37.5% | +2.18 (+0.07%) | +0.87 (+0.03%) | −0.44 (−0.01%) | +3.05 (+0.10%) | +2.61 (+0.08%) |
| **2031** | 62.5% | +3.67 (+0.12%) | +1.46 (+0.05%) | −0.73 (−0.02%) | +5.13 (+0.16%) | +4.39 (+0.14%) |
| **2032** | 71.9% | +4.26 (+0.13%) | +1.70 (+0.05%) | −0.85 (−0.03%) | +5.96 (+0.19%) | +5.10 (+0.16%) |
| **2033** | 78.1% | +4.68 (+0.15%) | +1.86 (+0.06%) | −0.94 (−0.03%) | +6.54 (+0.20%) | +5.60 (+0.17%) |
| **2034** | 100.0% | +6.05 (+0.19%) | +2.41 (+0.07%) | −1.21 (−0.04%) | +8.45 (+0.26%) | +7.25 (+0.22%) |
| **2035** | 100.0% | +6.01 (+0.18%) | +2.40 (+0.07%) | −1.20 (−0.04%) | +8.42 (+0.26%) | +7.21 (+0.22%) |
| **2036** | 100.0% | +5.98 (+0.18%) | +2.40 (+0.07%) | −1.20 (−0.04%) | +8.37 (+0.25%) | +7.18 (+0.22%) |
| **2037** | 100.0% | +5.94 (+0.18%) | +2.39 (+0.07%) | −1.19 (−0.04%) | +8.33 (+0.25%) | +7.14 (+0.21%) |
| **2038** | 100.0% | +5.90 (+0.17%) | +2.39 (+0.07%) | −1.18 (−0.03%) | +8.29 (+0.24%) | +7.11 (+0.21%) |

---

## Benchmark Reconciliations & Explicit Answers to Questions 1–3

### Primary-Source Audit of Cour des comptes (20 Feb 2025, `297428.pdf`) — **`read`**
- **Price basis:** All figures in Graphique 32 (p. 71), Tableau 6 (p. 72), and p. 73 are in **constant 2024 euros** (`Md€ constants 2024`).
- **Exact Tableau n° 6 (p. 72, exercise 2035, Md€ constants 2024):**
  - **AOD 63 (gen 1964, *carrières longues* fixed):** Pensions `(A) = −4,2` (base `−3,0`, comp. `−1,2`), Contrib `(B) = −1,6`, Pension balance `(A+B) = −5,8`, Other revenues `(C) = −7,2`, Total APU `(A+B+C) = −13,0`. **In 2045 (p. 73):** `(A+B) = −4,3`.
  - **AOD 65 delayed (gen 1968→1972, +3m/gen from 1969, starts 2032, *carrières longues* +1 yr):** Pensions `(A) = +3,5` (base `+2,4`, comp. `+1,1`), Contrib `(B) = +1,2`, Pension balance `(A+B) = +4,7`, Other revenues `(C) = +4,7`, Total APU printed as **`+10,6`** *(primary-PDF arithmetic typo: `3,5 + 1,2 + 4,7 = 9,4`, not `10,6`; `(C)` was likely `+5,9` before typesetting)*. **In 2045 (p. 73):** `(A+B) = +8,4`.
  - **AOD 65 symmetric variant (gen 1964→1968, +6m/gen from 1965, starts 2028, *carrières longues* +1 yr):** Pensions `(A) = +6,0` (base `+4,3`, comp. `+1,7`), Contrib `(B) = +2,4`, Pension balance `(A+B) = +8,4`, Other revenues `(C) = +9,3`, Total APU `(A+B+C) = +17,7`.
- **Critical missing item in Tableau n° 6:** Unlike Rexecode in Tableau n° 5 (p. 68: `−2,7 Md€` spillovers for the 2023 reform), Tableau n° 6 **does not deduct non-pension social spillovers** (`chômage`, `IJ maladie`, `RSA/ASS`), even though p. 67 of the same report cites DREES/DARES (Jan 2022) at **20% of gross pension savings**.
- **COR June 2026 (Synthèse p. 15, `read`):** +1 year AOD across DG Trésor (*Mésange* & accounting model), I-MIP (*CepreHANK*), and OFCE (*EmeRaude*):
  - **2 yrs:** GDP `+0,1 to +0,5%`, Employment `+50k to +140k`, APU primary balance `+0,05 to +0,40 pt` GDP.
  - **10 yrs:** GDP `+0,5 to +0,7%`, Employment `+160k to +250k`, APU primary balance `+0,30 to +0,60 pt` GDP.
  - **20 yrs:** GDP `+0,1 to +0,8%`, Employment `+200k to +240k`, APU primary balance `+0,30 to +0,65 pt` GDP.
- **2023 PLFRSS Étude d'impact & Cour Tableau 4–5 (pp. 66–68, `read` / `secondary`):** Gross age+duration savings for the 2-year 2023 reform ramp `0,3 (2023) → 3,3 (2024) → 5,3 (2025) → 7,5 (2026) → 10,3 (2027) → 17,7 Md€ (2030)` (**`secondary`**, Assemblée nationale); after accompanying measures, net 2030 pension balance = `+9,7 Md€` (DG Trésor) / `+11,8 Md€` (Rexecode) in 2024 € (**`read`**, Tableau 5 p. 68), GDP `+1,1%` (`+300k` jobs) micro vs `+0,3%` *Mésange* / `−0,1%` *e-mod.fr* macro (**`read`**, Tableau 4 p. 66).

### Question 1 — Is Up symmetric with Down?
**No — even with symmetric *carrières longues*, raising 64→65 saves materially more in steady state than lowering 64→63 costs:**
- **Under Cour's original asymmetric rule (*carrières longues* shifted up for 65, fixed for 63, pp. 71–72, 92 `read`):** Up/Down ratio is **`1,45×`** at 10 years (`+8,4` vs `−5,8 Md€`) and **`1,95×`** in steady state (`+8,4` vs `−4,3 Md€`, or `4,95` vs `2,61 Md€` pensions at 2025 GDP).
- **Under Patrick's 23 Nov 2026 design decision (*carrières longues* thresholds track the statutory reform age symmetrically in both directions):** The 2035 ratio narrows to **`~1,09×`** (`+6,01` vs `−5,57 Md€` pensions), while the **steady-state (2045+) ratio stays `1,46×`** (`4,95` vs `3,40 Md€` at 2025 GDP, or `+0,166%` vs `−0,114%` GDP).
- **Five mechanisms behind the asymmetry:**
  1. ***Carrières longues* legal design (RESOLVED by decision, 23 Nov 2026):** Accounted for ~half of Cour's gap (p. 71: *"50 % plus importantes... s'explique par les hypothèses retenues sur le dispositif de départ anticipé pour carrière longue"*). By deciding that *carrières longues* age gates move symmetrically with the statutory age, this legislative-convention gap is removed.
  2. **Binding *durée d'assurance* (172 quarters = 43 years — main remaining structural driver):** Lowering AOD to 63 does *not* grant full-rate retirement to cohorts born in the 1970s–1980s who entered work at 21–23; to avoid the permanent *décote* (up to 5%/yr), they still wait until 64–66. Raising AOD to 65 *does* bind everyone who already hit 172 quarters by 64. Because entry ages rose across cohorts, the 63-year cost shrinks by ~33% between 2035 and 2045.
  3. **Cohort timing under LFSS 2026:** Current law climbs to 64 until 2033; therefore a natural +3m/gen **Up** reform delivers **`0 Md€`** until **2034**, while **Down** starts costing money in **2029**. At a 10-year horizon (2036), natural +3m/gen Up (`+5,1 Md€`) yields *less* than Down (`−7,5 Md€` with symmetric CL) solely due to the 5-year head start of Down.
  4. ***Inaptitude* & *invalidité* anchor at 62:** Unchanged in both directions (**`read`**, Annexe 2 p. 92), capping the affected population at ~75–80% of cohorts; baseline employment also declines with age (`40%` for 60–64 vs `77%` for 55–59, **`read`**, fn. 110 p. 66), muting marginal employment gains beyond 64.
  5. **Accrued pension / *surcote* feedback:** Working to 65 earns higher Agirc-Arrco points and *surcote*, trimming Up savings by ~10% post-peak; retiring at 63 yields lower pensions / occasional *décote*, trimming Down costs over time.

### Question 2 — Single Steady-State Yield & Range for the Simulator
**Crucial accounting rule for the simulator (`src/engine/project.js`):** Because `E7` already applies `fisc.eps_offre = 0,436` (all mandatory levies, *including* pension contributions) to `yS`, **`E2` must ONLY enter direct pension spending `(1)`** (with `spillover_share = 0,20` applied via `comp.offset.age_legal`), **NEVER `(1) + (2)`** (`8,4 Md€`), otherwise pension contributions are double-counted.
- **Implemented zero-double-counting setup (`E2` = gross pensions `(1)`, `E3` = `comp.offset.age_legal = 0,20`, `E7` = full `eps_offre = 0,436`, symmetric *carrières longues*):**
  - **Up (`64 → 65`, steady state, normalized to 2025 GDP = 2 991 Md€):** **`4,95 Md€` (`0,166%` GDP)** central; range **`4,20 – 6,10 Md€`** (`0,140% – 0,204%` GDP; low = stronger surcote/172q fade, high = peak/pre-surcote erosion). Net of 20% spillovers: **`3,96 Md€` (`0,132%` GDP)** central.
  - **Down (`64 → 63`, steady state, 2025 GDP scale, symmetric *carrières longues*):** **`3,40 Md€` (`0,114%` GDP)** central (`+30%` **`assumed`** uplift over Cour's fixed-CL `2,61 Md€`, calibrated from Cour p. 71); range **`2,60 – 4,30 Md€`** (`0,087% – 0,144%` GDP; low = Cour fixed-CL / strongly binding 172q floor, high = 2035 peak with symmetric CL). Net of 20% spillovers: **`2,72 Md€` (`0,091%` GDP)** central.
- **Standalone pension-system balance `(1) + (2)` (for comparison only — DO NOT combine unadjusted with `ε_offre = 0,436`):** Up **`6,99 Md€`** (`0,234%` GDP, range `5,9–8,5`); Down **`4,70 Md€`** (`0,157%` GDP, range `3,6–6,0`).

### Question 3 — Is Cour's `8,4 Md€` a 2035 or 2045 Figure, and Under Which Schedule?
**Both — under two *different* schedules (**`read`**, pp. 11, 72–73, 93):**
- **`+8,4 Md€` in 2035** = the **accelerated symmetric variant** (`+6m/gen`, generations **1964–1968**, reaching 65 in 2033; Tableau n° 6 col. 3, p. 72).
- **`+8,4 Md€` in 2045** = the **delayed +3m/gen continuation** (generations **1968–1972**, starting 2032, reaching 65 in 2037; p. 73). In 2035, this schedule is only halfway through phase-in (`+4,7 Md€`, Tableau n° 6 col. 2).
- The fact that both equal `8,4 Md€` in constant 2024 euros is a near-coincidence: `+9–10%` real GDP/pension-mass growth between 2035 and 2045 offsets `~−9–10%` post-peak erosion in `% of GDP` (`0,256%` in 2035 → `0,234%` in 2045).

---

## 3. Direct Simulator Parameter Block

```yaml
# Direct pension-spending yield (1) ONLY — excludes pension contributions (2)
# so E7 (fisc.eps_offre = 0.436 * yS) does NOT double-count pension SSCs.
# Apply spillover_share via comp.offset.age_legal (E3).
# Policy design decision (Patrick, 23 Nov 2026): carrières longues age gates
# track the statutory reform age symmetrically in both directions.
# All Md€ normalized to 2025 GDP = 2,991 Md€ (constant 2025 €).

rend_up:                     # 64 -> 65, gross pensions avoided (1), steady state (CL +1 yr)
  param_id: "rend.age_legal.hausse"
  unit: "Md€ 2025 per year of legal age (at 2025 GDP)"
  low: 4.20                  # 0.140% GDP (stronger surcote / 172q fade)
  central: 4.95              # 0.166% GDP (Cour 2025 steady-state 2045 share, CL shifted +1 yr)
  high: 6.10                 # 0.204% GDP (peak/pre-surcote-fade + high cohort size)

rend_down:                   # 64 -> 63, gross pensions added (1), steady state (CL -1 yr)
  param_id: "rend.age_legal.baisse"
  unit: "Md€ 2025 per year of legal age (at 2025 GDP)"
  low: 2.60                  # 0.087% GDP (Cour fixed-CL floor / strongly binding 172q)
  central: 3.40              # 0.114% GDP (+30% assumed symmetric-CL uplift on Cour 2.61; Up/Down = 1.46x)
  high: 4.30                 # 0.144% GDP (2035 peak with symmetric CL before 172q erosion)

# Reference only (NOT for E2 if E7 uses full PO rate 0.436):
# net_pension_balance_up_2025gdp:   6.99 Md€ (0.234% GDP) [range 5.9 - 8.5]
# net_pension_balance_down_2025gdp: 4.70 Md€ (0.157% GDP) [range 3.6 - 6.0]

start_year:
  up_3m_continuation: 2034   # LFSS 2026 reaches 64 in 2033 (gen 1969); +3m/gen starts gen 1970
  up_6m_accelerated:  2028   # +3m/gen ON TOP of LFSS 2026 from Jan 2028 (gen 1965 Q2-1969) [PR default]
  down_3m_cap63:      2029   # LFSS 2026 already at 63y0m for gen 1965 Q2-Q4; cap binds gen 1966 [PR default]

phase_in_profile:            # Share of steady-state cohort shift active each year (exact monthly overlap)
  up_3m_continuation:        # 2034..2038 (0 before 2034, 1.000 from 2038)
    2034: 0.219
    2035: 0.406
    2036: 0.594
    2037: 0.781
    2038: 1.000
  up_6m_accelerated:         # 2028..2034 (1.000 from 2034)
    2028: 0.156
    2029: 0.281
    2030: 0.375
    2031: 0.625
    2032: 0.719
    2033: 0.781
    2034: 1.000
  down_3m_cap63:             # 2029..2033 (0 in 2028, 1.000 from 2033)
    2029: 0.219
    2030: 0.406
    2031: 0.594
    2032: 0.781
    2033: 1.000

spillover_share:             # Share of gross pension savings (1) offset by non-pension benefits
  param_id: "comp.offset.age_legal"
  central: 0.20              # DREES/DARES Jan 2022 (Cour p. 67) & Rabaté-Rochut (2020)
  range: [0.15, 0.25]
  breakdown_of_spillovers:
    unemployment_unedic: 0.52   # 10.4% of (1)
    sickness_ij:         0.36   #  7.2% of (1)
    minima_rsa_ass:      0.12   #  2.4% of (1)
    invalidity_aah:      0.00   #  0.0% (invalidity AOD stays at 62; would add ~8-10% if raised)

employment_effect_sigma:     # Long-run GDP level effect (% GDP per +1 year of legal age)
  param_id: "offre.sigma.age_legal"
  unit: "% of GDP level per year of legal age"
  low: 0.15                  # ~+50k-70k jobs; conservative macro / high-unemployment friction (Mésange/COR low)
  central: 0.30              # ~+100k-120k jobs; Patrick's 17 Nov decision (diminishing margin at 64->65)
                             # (Note: COR June 2026 p.15 multi-model 10y/20y band is +0.5/+0.7 and +0.1/+0.8)
  high: 0.50                 # Kept at Patrick's 17 Nov decision (literature micro ceiling ≈ 0.55)
  lag_years: 6               # Cohort phase-in + labour-market adjustment (aligned with ramp end)
  t0_years: 0

double_counting_share:       # Share of total macro tax return (eps_offre * yS) that IS pension contrib (2)
  central: 0.205             # Cour Tableau 6 Up: 2.4 / (2.4 + 9.3) = 20.5%; Down: 1.6 / 8.8 = 18.2%;
                             # COR 2025 macro check: 277 Md€ pension contrib / 1,304 Md€ PO = 21.2%
  rule: "Keep (2) OUT of E2 (use rend.age_legal.hausse=4.95 / rend.age_legal.baisse=3.40 + comp.offset.age_legal=0.20 and full eps_offre=0.436)."
```

*(Sanity check of total steady-state APU effect under the implemented zero-double-counting setup: Up = `+0,132%` direct net of spillovers + `0,30% × 0,436 (+0,131%)` = **`+0,263%` GDP** [`+7,87 Md€` at 2025 GDP]; at `σ = 0,50%` [cas haut] → **`+0,350%` GDP** [`+10,48 Md€`]. Down = `−0,091%` direct net − `0,131%` = **`−0,222%` GDP** [`−6,63 Md€`]. Directly spans Cour Tableau 4 (`+0,20` to `+0,45 pt`/yr) and COR June 2026 p. 15 (`+0,30` to `+0,65 pt`/yr).)*

---

## 4. Source List (Tagged `read` / `secondary` / `assumed`)

1. **Cour des comptes**, *Situation financière et perspectives du système de retraites* (20 Feb 2025), https://www.vie-publique.fr/files/rapport/pdf/297428.pdf — **`read`** (primary PDF downloaded & inspected):
   - Synthèse p. 11 (`+8,4`, `−5,8`, `−4,3`, `+17,7`, `−13,0 Md€`).
   - Ch. II p. 44 (pension spending `414,5 Md€` in 2025 → `460` in 2035 → `500` in 2045).
   - Ch. II pp. 66–68, Tableaux 4–5 (2023 reform macro vs micro: *Mésange* `+0,3%` PIB / `+0,4 pt` APU, *e-mod.fr* `−0,1%` / `+0,1 pt`, DG Trésor `+1,1%` / `+0,9 pt` / `+24,2 Md€`, Rexecode `+1,1%` / `+0,6 pt` / `+20,0 Md€` with `−2,7 Md€` spillovers; 60–64 employment rate `40%` vs `77%` for 55–59, fn. 110; DREES/DARES Jan 2022 `20%` spillovers = `52%` ARE/AREF, `36%` IJ, `12%` RSA/ASS, invalidity excluded per fn. 123).
   - Ch. III pp. 70–73, Graphique 32 & Tableau 6 (constant **2024** €, exact `A`, `B`, `A+B`, `C`, `A+B+C` for 63, 65 delayed, 65 symmetric, plus PDF typo `+10,6` in col. 2, and p. 71–72 *carrières longues* asymmetry explanation).
   - Annexes 2–3 pp. 92–95, Tableaux 12–13 & Graphique 38 (CNAV *Prisme* deterministic method, no horizon/substitution effects, invalidity fixed at 62, exact generation schedules).
2. **COR**, *Rapport annuel – Juin 2026, Synthèse* (June 2026), https://www.cor-retraites.fr/sites/default/files/2026-06/Synth%C3%A8se_RA_2026.pdf — **`read`** (primary PDF downloaded & inspected):
   - pp. 1–4 (`422 Md€` / `14,1%` PIB in 2025, `14,2%` in 2045, `15,3%` in 2070; balance `−0,2% → −0,9% → −2,4%`; suspension cost `1,8 Md€/yr` to 2032).
   - p. 5 (LFSS 2026 freeze covers gen 1964 and Jan–Mar 1965; resumption thereafter).
   - p. 9 (`277 Md€` contributions out of `417 Md€` pension resources in 2025).
   - p. 15 (multi-model +1 yr AOD table: DG Trésor, I-MIP *CepreHANK*, OFCE *EmeRaude* at 2, 10, 20 years).
3. **LFSS 2026 generation calendar** (`service-public.gouv.fr`, `salerya.fr`) — **`secondary`** (search summary; corroborates COR 2026 p. 5: 1964 & Q1 1965 at 62y9m/170q; Q2–Q4 1965 at 63y0m/171q; 1969 reaches 64y0m/172q in 2033).
4. **PLFRSS 2023 Étude d'impact** (Assemblée nationale, Jan 2023) — **`secondary`** for year-by-year gross savings `0,3 / 3,3 / 5,3 / 7,5 / 10,3 / 17,7 Md€` (2023–2030) and `+300k` jobs; **`read`** indirectly via Cour Tableau 4–5 (pp. 66–68) for net 2030 balance (`+9,7 Md€` 2024 €) and `+1,1%` GDP.
5. **INSEE / RESF 2027 inflation & GDP** — 2025 GDP `2 991 Md€` and 2025 CPI `+0,9%` **`read`** (via `docs/baseline-data.md` item 5); 2025 GDP deflator `+1,1%` **`secondary`** (INSEE search summary).
6. **Academic senior-employment literature:**
   - **Rabaté & Rochut (2020)**, *J. Pension Economics & Finance* 19(3), 293–308 (`DOI: 10.1017/S1474747218000392`) — **`secondary`** (abstract/synthesis: +21 pp age-60 employment, ~20% fiscal spillover offset).
   - **Dubois & Koubi (2017)**, *Insee Analyses* n° 30 & *Économie & Prévision* 211–212 — **`read`** for cohort breakdown (fn. 119 Cour p. 67: age-60 cohort employment `33% → 49%` = `+16 pp`, unemployment `4% → 11%`, inactive `13% → 15%`, retired `50% → 25%`); **`secondary`** for broader 2008–2014 LFS details.
   - **Hairault, Langot & Sopraseuth (2010)**, *JEEA* 8(5), 1034–1076 (`DOI: 10.1111/j.1542-4774.2010.tb00547.x`) — **`secondary`** (abstract/synthesis: upstream "horizon effect" boosting age 55–59 employment).
7. **Post-peak maturation curves (`−11%` Up over 7 yrs, `−33%` Down over 2035–2045), symmetric *carrières longues* Down uplift (`+30%` on Cour fixed-CL `2,61 → 3,40 Md€`, Patrick decision 23 Nov 2026 calibrated from Cour p. 71), monthly cohort uniform birth distribution, and `σ` diminishing-returns discount at 64→65** — **`assumed`**.

---

## 5. Main Uncertainties (Ranked & Status)

1. **Employment retention & macro GDP effect at ages 64–65 (`σ`) — *OPEN (noted for review)*:** The single largest swing factor (`+0,15%` to `+0,50%` GDP → `~±4,6 Md€/yr` on APU balance). All French quasi-experimental evidence comes from the 2010 reform at **60–62**; baseline employment is much lower at 63–65 (`40%` for 60–64), while *Mésange* / *e-mod.fr* macro models (`+0,1` to `+0,3%` GDP) diverge sharply from DG Trésor/Rexecode micro-accounting (`+0,55%` GDP/yr).
2. **Treatment of *carrières longues* thresholds — *DECIDED (Patrick, 23 Nov 2026)*:** Decided that *carrières longues* age thresholds **track the statutory reform age symmetrically** in both directions (`+1 yr` on Up, already in Cour `AOD 65` → `4,95 Md€` [`4,20–6,10`] ; `−1 yr` on Down → `3,40 Md€` [`2,60–4,30`], narrowing the steady-state Up/Down ratio from `1,90×` to `1,46×`). The exact `+30%` uplift over Cour's fixed-CL Down figure remains an **`assumed`** calibration (from Cour p. 71) pending a dedicated CNAV *Prisme* run with downward-shifted *carrières longues* gates.
3. **Spillover share at 64–65 (and whether invalidity stays at 62) — *OPEN (noted for review)*:** DREES/DARES's 20% offset comes from 60–62 (2010 reform). Health wear, sickness leave (IJ), and senior unemployment could push spillovers toward **25–30%** at age 64–65 — or if invalidity/inaptitude exits rise endogenously at 62–64, gross pension savings shrink directly.
4. **Interaction with 172 quarters (*durée d'assurance*) for 1970s–1980s cohorts — *OPEN (noted for review)*:** Later labour-market entry steadily erodes the Down (`64→63`) cost and moderates marginal Up (`64→65`) gains after 2040, depending on future higher-education and unemployment trajectories.
5. **LFSS 2026 political durability & start year — *OPEN (question #1 to Claude)*:** Whether a 65-year reform waits for 2034 (continuation) or accelerates in 2028 (+6m/gen) changes cumulative 10-year (2028–2036) budget savings by **~35–40 Md€**.
