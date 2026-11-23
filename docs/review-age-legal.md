# Revue primaire et recalibrage du levier « Âge légal de départ en retraite » (`age_legal`)

> **Document de revue (23 nov. 2026) — destiné à Claude et Patrick sur `review/day0`.**
> Analyse primaire menée à partir des PDF originaux de la **Cour des comptes** (*Situation financière et perspectives du système de retraites*, 20 févr. 2025, `297428.pdf`, **lu**) et du **COR** (*Rapport annuel – Juin 2026, Synthèse*, `Synthèse_RA_2026.pdf`, **lu**). Chaque chiffre est étiqueté **`read`** (lu directement dans le document primaire), **`secondary`** (source secondaire / synthèse) ou **`assumed`** (hypothèse de modélisation explicite).

---

## 0. Ce que corrige cette PR par rapport à l'implémentation précédente (`rend.age_legal = 8,4 Md€`)

L'étalon initial (`rend.age_legal = 8,4 Md€`, symétrique, `comp.offset.prestations = 0`, rampe linéaire 6 ans 2028–2033) cumulait **quatre biais identifiés lors de la lecture directe des PDF primaires** :

1. **Double comptage des cotisations retraites (`~2,0 Md€` à PIB 2025, soit `20,5 %` du retour fiscal) :** Le `8,4 Md€` du Tableau n° 6 de la Cour des comptes (p. 72, **`read`**) somme `+6,0 Md€` de pensions évitées `(A)` et `+2,4 Md€` de cotisations retraites additionnelles `(B)`. Or l'équation `E7` applique déjà `fisc.eps_offre = 0,436` (taux de prélèvements obligatoires **toutes administrations, cotisations retraites incluses**) à l'effet d'offre `yS`. Conserver `8,4 Md€` dans `E2` compte donc les cotisations retraites deux fois.
2. **Erreur d'échelle de PIB (`~+17 %`) :** Les `8,4 Md€` de la Cour sont exprimés en **euros constants 2024** mais au niveau de PIB et de masse de pensions de **2035 (`3 284 Md€`)** ou **2045 (`3 628 Md€`)**, alors que `E2` divise l'étalon statique par `base.pib.2025 = 2 991 Md€`. En part de PIB, `8,48 / 3 628 = 0,234 %` du PIB (soit `6,99 Md€` à PIB 2025 pour `A+B`, et **`4,95 Md€`** pour les seules pensions évitées `A`).
3. **Omission des effets de report hors retraites (`−20 %` de `A`) :** Le Tableau n° 6 de la Cour n'intègre pas les reports vers d'autres prestations sociales, alors que la **page 67 du même rapport (`read`)** cite DREES/DARES (janv. 2022) et Rabaté & Rochut (2020) à **`20 %` des économies brutes de pensions** (`52 %` Unédic ARE/AREF, `36 %` IJ maladie, `12 %` RSA/ASS, `0 %` invalidité/AAH tant que l'AOD invalidité reste à 62 ans). Le moteur applique désormais `comp.offset.age_legal = 0,20` (`[0,15 ; 0,25]`) via `E3`.
4. **Asymétrie hausse / baisse et calendrier LFSS 2026 :**
   - **Hausse (`64 → 65 ans`)** : `rend.age_legal.hausse = 4,95 Md€` (`[3,80 ; 6,10]`, `0,166 %` PIB brut ; `+3,96 Md€` / `+0,132 %` PIB net des 20 % de reports).
   - **Baisse (`64 → 63 ans`)** : `rend.age_legal.baisse = 2,61 Md€` (`[2,20 ; 4,10]`, `0,087 %` PIB brut ; `−2,08 Md€` / `−0,070 %` PIB net des 20 % de reports), reflétant l'asymétrie des seuils *carrières longues* et la contrainte croissante des 172 trimestres.
   - **Calendrier LFSS 2026 :** le gel à `62 ans 9 mois / 170 trim.` couvre la génération `1964` **et le T1 `1965`** ; la reprise de janvier 2028 porte `64 ans / 172 trim.` à la génération **`1969` (2033)**. Un plafonnement à `63 ans` ne mord donc qu'en **2029** (gén. `1966`–`1969`, plein effet `2033`, 5 ans).

### Points ouverts soumis à l'avis de Claude (et Patrick) avant fusion

1. **Calendrier par défaut à la hausse (`x > 0`) : accéléré `+6 mois/gén.` dès 2028 vs continuation `+3 mois/gén.` dès 2034.**
   - Cette PR retient par défaut pour `x > 0` le **profil accéléré `+6 mois/gén.` dès janvier 2028** (`2028–2034` : `[0,156 ; 0,281 ; 0,375 ; 0,625 ; 0,719 ; 0,781 ; 1,000]`), afin qu'une hausse d'âge produise un effet lisible dès l'horizon 10 ans (`2036`) et reste comparable au scénario symétrique de la Cour (`2028–2033` avant LFSS 2026) et à l'affichage UI « dès janvier 2028 ».
   - L'alternative strictement fidèle à la continuation `+3 mois/gén.` (gén. `1970–1973`) donne `0 Md€` de 2028 à 2033 et monte de `2034` à `2038` (`[0,219 ; 0,406 ; 0,594 ; 0,781 ; 1,000]`, soit `59,4 %` en 2036). Souhaitez-vous garder `2028` accéléré par défaut, basculer sur `2034` continuation, ou exposer un sélecteur de rythme ?
2. **Centre de `rend.age_legal.baisse` (`2,61 Md€` vs hypothèse *carrières longues* symétriques `≈ 3,4 Md€`).**
   - `2,61 Md€` reproduit fidèlement la part 2045 de la Cour (p. 73, seuils *carrières longues* inchangés à la baisse) ; la borne haute (`4,10 Md€`) couvre un abaissement symétrique des seuils *carrières longues* et le pic 2035.
3. **Symétrie de `offre.sigma.age_legal` à la baisse (`x < 0`).**
   - `offre.sigma.age_legal` reste symétrique (`+0,15 / +0,30 / +0,50 %` PIB, décision de Patrick du 17 nov. 2026). À long terme (`2045`), la contrainte des 172 trimestres pourrait également réduire l'élasticité d'emploi d'un retour à 63 ans (`sigmaBaisse` plus faible en valeur absolue). À trancher si besoin dans une passe ultérieure.

---

## 1. Summary

Reading the primary **Cour des comptes** report (*Situation financière et perspectives du système de retraites*, 20 Feb 2025, `297428.pdf`, pp. 11, 66–68, 70–73, 92–95 — **`read`**) and the **COR June 2026 Synthèse** (`Synthèse_RA_2026.pdf`, pp. 1–5, 9, 15 — **`read`**) directly resolves every press ambiguity and exposes **four major parameter adjustments** needed in the simulator. First, under **LFSS 2026**, the freeze covers generation 1964 *and* Q1 1965 at 62y9m / 170 quarters, pushing 64 years back to **generation 1969 (reaching 64 in 2033)** (**`read`**, COR 2026 p. 5); consequently, a +3 months/generation continuation to 65 affects generations **1970–1973 (phase-in 2034–2038)**, whereas capping at 63 affects generations **1966–1969 (phase-in 2029–2033)**, and only an accelerated **+6 months/generation** reform starts in **2028** (generations 1965 Q2–1969, full in 2034). Second, the Cour's headline **`+8,4 Md€`** (2035 symmetric / 2045 delayed, constant **2024** €) already bundles **`+6,0 Md€` of pension spending avoided** and **`+2,4 Md€` of extra pension contributions** while omitting **~20% non-pension spillovers** (DREES/DARES Jan 2022 & Rabaté–Rochut 2020: 52% Unédic, 36% sickness IJ, 12% RSA/ASS; 0% invalidity because the 62-year invalidity threshold is unchanged). Third, because `ε_offre = 0,436` (total mandatory levies / GDP) already captures **100% of extra tax and pension-contribution revenues**, pension contributions represent **`~20,5%`** of the macro tax return — so putting `8,4 Md€` directly into `E2` *on top of* `σ × ε_offre` double-counts pension contributions by `~2,0 Md€` (2025 GDP scale), overstates GDP scaling (`8,4 Md€` is at 2035–2045 GDP, not 2025 GDP), omits spillovers (`~1,0 Md€`), and hides a strong **Up vs Down asymmetry** (`~0,234%` vs `−0,120%` of GDP in 2045 pension balance — roughly half from Cour's asymmetric *carrières longues* assumption and half from the binding 172-quarter duration rule). Stripping out double-counting and deducting 20% spillovers gives a clean steady-state direct non-macro APU spending yield of **`+0,132%` of GDP (`+3,96 Md€` at 2025 GDP)** Up and **`−0,070%` of GDP (`−2,08 Md€`)** Down (or **`+0,166%` / `−0,087%`** gross pensions avoided before applying `spillover_share = 0,20`), which paired with `σ = +0,30%`–`+0,45%` GDP yields **`+0,26%` to `+0,33%` of GDP** total APU — reconciling squarely with COR June 2026 (`+0,30` to `+0,65 pt` GDP at 20 years, **`read`**).

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

### Table 2A — Central Case: **Up (+3m/gen continuation, gen 1970–1973)** vs **Down (cap at 63, gen 1966–1969)**

*(Values in **Md€ constants 2025 (% of projected real GDP)**; maturation factors **`assumed`** to reproduce Cour Graphique 32 & p. 73 post-peak fade: Up `-11%` over 7 yrs post-peak from surcote/Agirc-Arrco accrual; Down `-33%` over 2035–2045 from binding 172q & smaller accrued pensions.)*

| Year | Up (1) Pensions | Up (2) Contrib | Up (3) Spillovers | Up (4a) Net Pension | Up (4b) Net APU ex-macro | Down (1) Pensions | Down (2) Contrib | Down (3) Spillovers | Down (4a) Net Pension | Down (4b) Net APU ex-macro |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **2028** | +0.00 (+0.00%) | +0.00 (+0.00%) | 0.00 (0.00%) | +0.00 (+0.00%) | +0.00 (+0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) |
| **2029** | +0.00 (+0.00%) | +0.00 (+0.00%) | 0.00 (0.00%) | +0.00 (+0.00%) | +0.00 (+0.00%) | −0.88 (−0.03%) | −0.33 (−0.01%) | +0.18 (+0.01%) | −1.21 (−0.04%) | −1.04 (−0.03%) |
| **2030** | +0.00 (+0.00%) | +0.00 (+0.00%) | 0.00 (0.00%) | +0.00 (+0.00%) | +0.00 (+0.00%) | −1.65 (−0.05%) | −0.62 (−0.02%) | +0.33 (+0.01%) | −2.27 (−0.07%) | −1.94 (−0.06%) |
| **2031** | +0.00 (+0.00%) | +0.00 (+0.00%) | 0.00 (0.00%) | +0.00 (+0.00%) | +0.00 (+0.00%) | −2.44 (−0.08%) | −0.92 (−0.03%) | +0.49 (+0.02%) | −3.35 (−0.11%) | −2.87 (−0.09%) |
| **2032** | +0.00 (+0.00%) | +0.00 (+0.00%) | 0.00 (0.00%) | +0.00 (+0.00%) | +0.00 (+0.00%) | −3.24 (−0.10%) | −1.22 (−0.04%) | +0.65 (+0.02%) | −4.46 (−0.14%) | −3.81 (−0.12%) |
| **2033** | +0.00 (+0.00%) | +0.00 (+0.00%) | 0.00 (0.00%) | +0.00 (+0.00%) | +0.00 (+0.00%) | −4.19 (−0.13%) | −1.58 (−0.05%) | +0.84 (+0.03%) | −5.76 (−0.18%) | −4.93 (−0.15%) |
| **2034** | +1.32 (+0.04%) | +0.53 (+0.02%) | −0.26 (−0.01%) | +1.85 (+0.06%) | +1.58 (+0.05%) | −4.23 (−0.13%) | −1.59 (−0.05%) | +0.85 (+0.03%) | −5.82 (−0.18%) | −4.98 (−0.15%) |
| **2035** | +2.48 (+0.08%) | +0.99 (+0.03%) | −0.50 (−0.02%) | +3.47 (+0.11%) | +2.97 (+0.09%) | −4.27 (−0.13%) | −1.61 (−0.05%) | +0.85 (+0.03%) | −5.88 (−0.18%) | −5.03 (−0.15%) |
| **2036** | +3.66 (+0.11%) | +1.46 (+0.04%) | −0.73 (−0.02%) | +5.12 (+0.15%) | +4.39 (+0.13%) | −4.17 (−0.13%) | −1.57 (−0.05%) | +0.83 (+0.03%) | −5.74 (−0.17%) | −4.91 (−0.15%) |
| **2037** | +4.87 (+0.15%) | +1.94 (+0.06%) | −0.97 (−0.03%) | +6.81 (+0.20%) | +5.83 (+0.17%) | −4.07 (−0.12%) | −1.53 (−0.05%) | +0.81 (+0.02%) | −5.60 (−0.17%) | −4.79 (−0.14%) |
| **2038** | +6.29 (+0.19%) | +2.50 (+0.07%) | −1.26 (−0.04%) | +8.80 (+0.26%) | +7.54 (+0.22%) | −3.96 (−0.12%) | −1.49 (−0.04%) | +0.79 (+0.02%) | −5.46 (−0.16%) | −4.66 (−0.14%) |
| **2039** | +6.26 (+0.18%) | +2.50 (+0.07%) | −1.25 (−0.04%) | +8.76 (+0.26%) | +7.51 (+0.22%) | −3.86 (−0.11%) | −1.45 (−0.04%) | +0.77 (+0.02%) | −5.31 (−0.16%) | −4.54 (−0.13%) |
| **2040** | +6.22 (+0.18%) | +2.50 (+0.07%) | −1.24 (−0.04%) | +8.71 (+0.25%) | +7.47 (+0.22%) | −3.75 (−0.11%) | −1.41 (−0.04%) | +0.75 (+0.02%) | −5.16 (−0.15%) | −4.41 (−0.13%) |
| **2041** | +6.18 (+0.18%) | +2.49 (+0.07%) | −1.24 (−0.04%) | +8.67 (+0.25%) | +7.43 (+0.21%) | −3.63 (−0.10%) | −1.37 (−0.04%) | +0.73 (+0.02%) | −5.00 (−0.14%) | −4.28 (−0.12%) |
| **2042** | +6.14 (+0.17%) | +2.49 (+0.07%) | −1.23 (−0.03%) | +8.62 (+0.24%) | +7.40 (+0.21%) | −3.52 (−0.10%) | −1.33 (−0.04%) | +0.70 (+0.02%) | −4.85 (−0.14%) | −4.14 (−0.12%) |
| **2043** | +6.10 (+0.17%) | +2.48 (+0.07%) | −1.22 (−0.03%) | +8.58 (+0.24%) | +7.36 (+0.21%) | −3.40 (−0.10%) | −1.28 (−0.04%) | +0.68 (+0.02%) | −4.69 (−0.13%) | −4.00 (−0.11%) |
| **2044** | +6.05 (+0.17%) | +2.48 (+0.07%) | −1.21 (−0.03%) | +8.53 (+0.24%) | +7.32 (+0.20%) | −3.28 (−0.09%) | −1.24 (−0.03%) | +0.66 (+0.02%) | −4.52 (−0.13%) | −3.86 (−0.11%) |
| **2045** | +6.01 (+0.17%) | +2.47 (+0.07%) | −1.20 (−0.03%) | +8.48 (+0.23%) | +7.27 (+0.20%) | −3.16 (−0.09%) | −1.19 (−0.03%) | +0.63 (+0.02%) | −4.35 (−0.12%) | −3.72 (−0.10%) |
| **2046** | +6.07 (+0.17%) | +2.49 (+0.07%) | −1.21 (−0.03%) | +8.56 (+0.23%) | +7.35 (+0.20%) | −3.19 (−0.09%) | −1.20 (−0.03%) | +0.64 (+0.02%) | −4.39 (−0.12%) | −3.76 (−0.10%) |
| **2047** | +6.13 (+0.17%) | +2.52 (+0.07%) | −1.23 (−0.03%) | +8.65 (+0.23%) | +7.42 (+0.20%) | −3.22 (−0.09%) | −1.21 (−0.03%) | +0.64 (+0.02%) | −4.44 (−0.12%) | −3.79 (−0.10%) |
| **2048** | +6.19 (+0.17%) | +2.54 (+0.07%) | −1.24 (−0.03%) | +8.73 (+0.23%) | +7.49 (+0.20%) | −3.26 (−0.09%) | −1.23 (−0.03%) | +0.65 (+0.02%) | −4.48 (−0.12%) | −3.83 (−0.10%) |
| **2049** | +6.25 (+0.17%) | +2.57 (+0.07%) | −1.25 (−0.03%) | +8.82 (+0.23%) | +7.57 (+0.20%) | −3.29 (−0.09%) | −1.24 (−0.03%) | +0.66 (+0.02%) | −4.53 (−0.12%) | −3.87 (−0.10%) |
| **2050** | +6.31 (+0.17%) | +2.60 (+0.07%) | −1.26 (−0.03%) | +8.91 (+0.23%) | +7.65 (+0.20%) | −3.32 (−0.09%) | −1.25 (−0.03%) | +0.66 (+0.02%) | −4.57 (−0.12%) | −3.91 (−0.10%) |
| **2051** | +6.38 (+0.17%) | +2.62 (+0.07%) | −1.28 (−0.03%) | +9.00 (+0.23%) | +7.72 (+0.20%) | −3.35 (−0.09%) | −1.26 (−0.03%) | +0.67 (+0.02%) | −4.62 (−0.12%) | −3.95 (−0.10%) |
| **2052** | +6.44 (+0.17%) | +2.65 (+0.07%) | −1.29 (−0.03%) | +9.09 (+0.23%) | +7.80 (+0.20%) | −3.39 (−0.09%) | −1.28 (−0.03%) | +0.68 (+0.02%) | −4.66 (−0.12%) | −3.99 (−0.10%) |
| **2053** | +6.50 (+0.17%) | +2.67 (+0.07%) | −1.30 (−0.03%) | +9.18 (+0.23%) | +7.88 (+0.20%) | −3.42 (−0.09%) | −1.29 (−0.03%) | +0.68 (+0.02%) | −4.71 (−0.12%) | −4.03 (−0.10%) |
| **2054** | +6.57 (+0.17%) | +2.70 (+0.07%) | −1.31 (−0.03%) | +9.27 (+0.23%) | +7.96 (+0.20%) | −3.46 (−0.09%) | −1.30 (−0.03%) | +0.69 (+0.02%) | −4.76 (−0.12%) | −4.07 (−0.10%) |
| **2055** | +6.63 (+0.17%) | +2.73 (+0.07%) | −1.33 (−0.03%) | +9.36 (+0.23%) | +8.04 (+0.20%) | −3.49 (−0.09%) | −1.32 (−0.03%) | +0.70 (+0.02%) | −4.81 (−0.12%) | −4.11 (−0.10%) |
| **2056** | +6.70 (+0.17%) | +2.76 (+0.07%) | −1.34 (−0.03%) | +9.46 (+0.23%) | +8.12 (+0.20%) | −3.53 (−0.09%) | −1.33 (−0.03%) | +0.71 (+0.02%) | −4.85 (−0.12%) | −4.15 (−0.10%) |
| **Steady state (2025 GDP = 2 991 Md€)** | **+4.95 (+0.17%)** | **+2.04 (+0.07%)** | **−0.99 (−0.03%)** | **+6.99 (+0.23%)** | **+6.00 (+0.20%)** | **−2.61 (−0.09%)** | **−0.98 (−0.03%)** | **+0.52 (+0.02%)** | **−3.59 (−0.12%)** | **−3.07 (−0.10%)** |

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
  - **AOD 63 (gen 1964):** Pensions `(A) = −4,2` (base `−3,0`, comp. `−1,2`), Contrib `(B) = −1,6`, Pension balance `(A+B) = −5,8`, Other revenues `(C) = −7,2`, Total APU `(A+B+C) = −13,0`. **In 2045 (p. 73):** `(A+B) = −4,3`.
  - **AOD 65 delayed (gen 1968→1972, +3m/gen from 1969, starts 2032):** Pensions `(A) = +3,5` (base `+2,4`, comp. `+1,1`), Contrib `(B) = +1,2`, Pension balance `(A+B) = +4,7`, Other revenues `(C) = +4,7`, Total APU printed as **`+10,6`** *(primary-PDF arithmetic typo: `3,5 + 1,2 + 4,7 = 9,4`, not `10,6`; `(C)` was likely `+5,9` before typesetting)*. **In 2045 (p. 73):** `(A+B) = +8,4`.
  - **AOD 65 symmetric variant (gen 1964→1968, +6m/gen from 1965, starts 2028):** Pensions `(A) = +6,0` (base `+4,3`, comp. `+1,7`), Contrib `(B) = +2,4`, Pension balance `(A+B) = +8,4`, Other revenues `(C) = +9,3`, Total APU `(A+B+C) = +17,7`.
- **Critical missing item in Tableau n° 6:** Unlike Rexecode in Tableau n° 5 (p. 68: `−2,7 Md€` spillovers for the 2023 reform), Tableau n° 6 **does not deduct non-pension social spillovers** (`chômage`, `IJ maladie`, `RSA/ASS`), even though p. 67 of the same report cites DREES/DARES (Jan 2022) at **20% of gross pension savings**.
- **COR June 2026 (Synthèse p. 15, `read`):** +1 year AOD across DG Trésor (*Mésange* & accounting model), I-MIP (*CepreHANK*), and OFCE (*EmeRaude*):
  - **2 yrs:** GDP `+0,1 to +0,5%`, Employment `+50k to +140k`, APU primary balance `+0,05 to +0,40 pt` GDP.
  - **10 yrs:** GDP `+0,5 to +0,7%`, Employment `+160k to +250k`, APU primary balance `+0,30 to +0,60 pt` GDP.
  - **20 yrs:** GDP `+0,1 to +0,8%`, Employment `+200k to +240k`, APU primary balance `+0,30 to +0,65 pt` GDP.
- **2023 PLFRSS Étude d'impact & Cour Tableau 4–5 (pp. 66–68, `read` / `secondary`):** Gross age+duration savings for the 2-year 2023 reform ramp `0,3 (2023) → 3,3 (2024) → 5,3 (2025) → 7,5 (2026) → 10,3 (2027) → 17,7 Md€ (2030)` (**`secondary`**, Assemblée nationale); after accompanying measures, net 2030 pension balance = `+9,7 Md€` (DG Trésor) / `+11,8 Md€` (Rexecode) in 2024 € (**`read`**, Tableau 5 p. 68), GDP `+1,1%` (`+300k` jobs) micro vs `+0,3%` *Mésange* / `−0,1%` *e-mod.fr* macro (**`read`**, Tableau 4 p. 66).

### Question 1 — Is Up symmetric with Down?
**No — raising 64→65 saves materially more than lowering 64→63 costs, at both 10 years and steady state:**
- **Under Cour's exact rules (`carrières longues` shifted up for 65, fixed for 63):** Up/Down ratio is **`1,45×`** at 10 years (`+8,4` vs `−5,8 Md€`) and **`1,95×`** in steady state (`+8,4` vs `−4,3 Md€`, or `+0,234%` vs `−0,120%` of GDP).
- **Five mechanisms driving the asymmetry:**
  1. ***Carrières longues* legal design (largest driver in Cour, ~half of the gap):** Cour (pp. 71–72, 92, **`read`**) raised long-career age thresholds by +1 year in the 65 scenario, but left them untouched in the 63 scenario. Under *symmetric* long-career rules (moving thresholds both ways, or freezing both ways), the ratio narrows to **~`1,20–1,35×`** at 10 years and **~`1,40–1,60×`** in steady state.
  2. **Binding *durée d'assurance* (172 quarters = 43 years):** Lowering AOD to 63 does *not* grant full-rate retirement to cohorts born in the 1970s–1980s who entered work at 21–23; to avoid the permanent *décote* (up to 5%/yr), they still wait until 64–66. Raising AOD to 65 *does* bind everyone who already hit 172 quarters by 64. Because entry ages rose across cohorts, this causes the 63-year cost to shrink sharply from `−5,8` (2035) to `−4,3 Md€` (2045).
  3. **Cohort timing under LFSS 2026:** Current law climbs to 64 until 2033; therefore a natural +3m/gen **Up** reform delivers **`0 Md€`** until **2034**, while **Down** starts costing money in **2029**. At a 10-year horizon (2036), natural +3m/gen Up (`+5,1 Md€`) yields *less* than Down (`−5,7 Md€`) solely due to the 5-year head start of Down.
  4. ***Inaptitude* & *invalidité* anchor at 62:** Unchanged in both directions (**`read`**, Annexe 2 p. 92), capping the affected population at ~75–80% of cohorts; baseline employment also declines with age (`40%` for 60–64 vs `77%` for 55–59, **`read`**, fn. 110 p. 66), muting marginal employment gains beyond 64.
  5. **Accrued pension / *surcote* feedback:** Working to 65 earns higher Agirc-Arrco points and *surcote*, trimming Up savings by ~10% post-peak; retiring at 63 yields lower pensions / occasional *décote*, trimming Down costs over time.

### Question 2 — Single Steady-State Yield & Range for the Simulator
**Crucial accounting rule for the simulator (`src/engine/project.js`):** Because `E7` already applies `fisc.eps_offre = 0,436` (all mandatory levies, *including* pension contributions) to `yS`, **`E2` must ONLY enter direct pension spending `(1)`** (with `spillover_share = 0,20` applied via `comp.offset.age_legal`), **NEVER `(1) + (2)`** (`8,4 Md€`), otherwise pension contributions are double-counted.
- **Recommended zero-double-counting setup (`E2` = gross pensions `(1)`, `E3` = `comp.offset.age_legal = 0,20`, `E7` = full `eps_offre = 0,436`):**
  - **Up (`64 → 65`, steady state, normalized to 2025 GDP = 2 991 Md€):** **`4,95 Md€` (`0,166%` GDP)** central; range **`3,80 – 6,10 Md€`** (`0,127% – 0,204%` GDP; low = *carrières longues* unshifted, high = peak/no surcote erosion). Net of 20% spillovers: **`3,96 Md€` (`0,132%` GDP)** central.
  - **Down (`64 → 63`, steady state, 2025 GDP scale):** **`2,61 Md€` (`0,087%` GDP)** central (Cour asymmetric *carrières longues*); range **`2,20 – 4,10 Md€`** (`0,074% – 0,137%` GDP; high = symmetric *carrières longues* shift + 2035 peak). Net of 20% spillovers: **`2,08 Md€` (`0,070%` GDP)** central.
- **Standalone pension-system balance `(1) + (2)` (for comparison only — DO NOT combine unadjusted with `ε_offre = 0,436`):** Up **`6,99 Md€`** (`0,234%` GDP, range `5,4–8,5`); Down **`3,59 Md€`** (`0,120%` GDP, range `3,0–5,5`).

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
# All Md€ normalized to 2025 GDP = 2,991 Md€ (constant 2025 €).

rend_up:                     # 64 -> 65, gross pensions avoided (1), steady state
  param_id: "rend.age_legal.hausse"
  unit: "Md€ 2025 per year of legal age (at 2025 GDP)"
  low: 3.80                  # 0.127% GDP (carrières longues thresholds unshifted)
  central: 4.95              # 0.166% GDP (Cour 2025 steady-state 2045 share, CL shifted)
  high: 6.10                 # 0.204% GDP (peak/pre-surcote-fade + high cohort size)

rend_down:                   # 64 -> 63, gross pensions added (1), steady state (magnitude)
  param_id: "rend.age_legal.baisse"
  unit: "Md€ 2025 per year of legal age (at 2025 GDP)"
  low: 2.20                  # 0.074% GDP (strongly binding 172q, CL fixed)
  central: 2.61              # 0.087% GDP (Cour 2025 2045 share, CL fixed)
  high: 4.10                 # 0.137% GDP (symmetric CL shift + 2035 peak share)

# Reference only (NOT for E2 if E7 uses full PO rate 0.436):
# net_pension_balance_up_2025gdp:   6.99 Md€ (0.234% GDP) [range 5.4 - 8.5]
# net_pension_balance_down_2025gdp: 3.59 Md€ (0.120% GDP) [range 3.0 - 5.5]

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
  rule: "Keep (2) OUT of E2 (use rend.age_legal.hausse=4.95 / rend.age_legal.baisse=2.61 + comp.offset.age_legal=0.20 and full eps_offre=0.436)."
```

*(Sanity check of total steady-state APU effect under the implemented zero-double-counting setup: Up = `+0,132%` direct net of spillovers + `0,30% × 0,436 (+0,131%)` = **`+0,263%` GDP** [`+7,87 Md€` at 2025 GDP]; at `σ = 0,50%` [cas haut] → **`+0,350%` GDP** [`+10,48 Md€`]. Directly spans Cour Tableau 4 (`+0,20` to `+0,45 pt`/yr) and COR June 2026 p. 15 (`+0,30` to `+0,65 pt`/yr).)*

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
7. **Post-peak maturation curves (`−11%` Up over 7 yrs, `−33%` Down over 2035–2045), monthly cohort uniform birth distribution, and `σ` diminishing-returns discount at 64→65** — **`assumed`** (calibrated directly to match Cour Graphique 32 & p. 73).

---

## 5. Main Uncertainties (Ranked)

1. **Employment retention & macro GDP effect at ages 64–65 (`σ`):** The single largest swing factor (`+0,15%` to `+0,55%` GDP → `~±5 Md€/yr` on APU balance). All French quasi-experimental evidence comes from the 2010 reform at **60–62**; baseline employment is much lower at 63–65 (`40%` for 60–64), while *Mésange* / *e-mod.fr* macro models (`+0,1` to `+0,3%` GDP) diverge sharply from DG Trésor/Rexecode micro-accounting (`+0,55%` GDP/yr).
2. **Treatment of *carrières longues* thresholds:** Accounts for ~half of the Cour's Up/Down asymmetry (`±1,2 to ±1,5 Md€/yr` in pensions avoided). Whether a future law shifts long-career age gates symmetrically with the statutory age is a political design choice, not a fixed elasticity.
3. **Spillover share at 64–65 (and whether invalidity stays at 62):** DREES/DARES's 20% offset comes from 60–62 (2010 reform). Health wear, sickness leave (IJ), and senior unemployment could push spillovers toward **25–30%** at age 64–65 — or if invalidity/inaptitude exits rise endogenously at 62–64, gross pension savings shrink directly.
4. **Interaction with 172 quarters (*durée d'assurance*) for 1970s–1980s cohorts:** Later labour-market entry steadily erodes the Down (`64→63`) cost and moderates marginal Up (`64→65`) gains after 2040, depending on future higher-education and unemployment trajectories.
5. **LFSS 2026 political durability & start year:** Whether a 65-year reform waits for 2034 (continuation) or accelerates in 2028 (+6m/gen) changes cumulative 10-year (2028–2036) budget savings by **~35–40 Md€**.
