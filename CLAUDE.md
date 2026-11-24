# CLAUDE.md

Instructions de travail pour les agents et contributeurs sur **Simulateur Budget France (moteur v2)**.

## 1. Sources de vérité

- **Spécification du modèle** : `docs/model-note.md` (note de modèle v0.3, équations E1–E12, décisions D1–D13, limites §10–§12).
- **Données et collecte** : `docs/baseline-data.md`, `docs/sigma-fiscal.md`, `docs/review-supply-effects-gemini.md`, `docs/review-age-legal.md`, `docs/review-comptes-notionnels.md`, `docs/review-lvt-module.md`, `docs/citations.md`.
- **Catalogue unique des paramètres** : `src/engine/params.js` (167 paramètres avec valeur centrale, fourchette `low`/`high`, unité, source, statut et explication). Ne jamais dupliquer de constante économique dans les pages UI.
- **Seuils d'avertissement** : `src/config.js` (`WARNING_THRESHOLDS`, source unique).

## 2. Architecture du moteur v2 (`src/engine/`)

Le moteur projette les **administrations publiques consolidées (APU)** en comptabilité nationale (Maastricht), réparties en **3 blocs** : `centrales` (État et ODAC), `securiteSociale` (ASSO), `locales` (APUL). Les transferts entre blocs (105,6 Md€ en 2025) sont consolidés.

| Fichier | Rôle |
|---|---|
| `src/engine/params.js` | Catalogue `PARAMS` / `PARAM_BY_ID`, statuts `STATUSES`, `resolveParams(overrides)`, `interpolateSeries(series, year)`. |
| `src/engine/levers.js` | 14 leviers actifs (`LEVERS`), 3 leviers structurels désactivés (`STRUCTURAL_LEVERS`, `σ = 0`), `staticYield`, `thetaAtRate`, `leversToInstruments`. |
| `src/engine/supply.js` | Effets d'offre E5 (`SUPPLY_EFFECTS`, `coreSupplyLines`, `supplyPhase`), `σ` calculé pour les 5 familles fiscales (cotisations, CSG, TVA, IR, IS) et `θ_non_réel` (`partReelle`, `thetaNonReel`) pour éviter tout double compte avec E5 + E7. |
| `src/engine/modules.js` | Contrat de module autonome (`validateModuleDefinition`, `moduleLeverValues`, `runModule`, `TEST_MODULE`). Un module n'écrit **jamais** dans la dette ni dans les intérêts et reçoit un `contexte` profondément gelé (`deepFreeze`). |
| `src/engine/ndc-module.js` | `NDC_MODULE` (`comptes_notionnels_ndc`, `statut: 'non validé'`, décision D8) : forme réduite stabilisant sur 15 cohortes (dès janvier 2028, `NDC_START_T = 2`, `NDC_RAMP_YEARS = 15`) la dérive post-2025 de `ref.derive.a_retraites` (COR juin 2026), avec `yS = 0` et respect de `comp.offset.prestations`. |
| `src/engine/lvt-module.js` | `LVT_MODULE` (`taxe_valeur_sol`, `statut: 'non validé'`, décisions D11 et D12) : taxe sur la valeur du sol à rendement égal (S1, S2, S3, IFI en option), dès 2027 ; transfert sécurité sociale → État (D11), capitalisation négative répartie par niveau, `a(locales)` et `a(centrales)` (D12), `flux[]` par bloc, `yS` central 0 (borne OCDE en haut, option désactivée par défaut). Inactif par défaut sur la page Budget. |
| `src/engine/lvt-snapshot.js` | Instantané daté de `yields.json` de LVTShift (commit 322190e, 12 nov. 2026) : `LVT_SCENARIOS`, `LVT_PRELEVEMENTS_SOCIAUX`, `LVT_LIGNES` (source et statut par ligne). |
| `src/engine/project.js` | Boucle de projection E1–E12 (`projectScenario`, `HORIZONS` : 10 ans / 2040 / 30 ans, `issuanceRate`, `deepFreeze`, `DECOMPOSITION_LABELS`). |

### Équations clés (E1–E12)
- **E1** : PIB nominal de référence `Yb(t) = Yb(t-1) * (1 + g + pi)` (croissance et inflation = médiane des prévisionnistes indépendants, jamais les prévisions du Gouvernement).
- **E2** : Effet ex ante d'un levier en part du PIB de base (`a(j,t)` positif = améliore le solde), indexé sur le PIB (zéro érosion nominale).
- **E3** : Réponse comportementale `θ` symétrique en paramètres, évaluée au taux après réforme, réduite à sa part non réelle `θ_non_réel(t)` quand `σ ≠ 0` ; `θ = 0` sur les dépenses hors effets de report sociaux de l'âge légal (`comp.offset.age_legal = 0,20`) et `comp.offset.prestations` optionnel (`0` par défaut).
- **E4** : Effet de demande en niveau, qui s'estompe (`λ = 0,7`), par catégorie de multiplicateur `dem.m.*`.
- **E5** : Effets d'offre permanents sur le niveau du PIB (`yS`), isolés ligne par ligne avec cas `bas` / `central` / `haut` ordonnés par résultat PIB.
- **E6** : PIB réalisé `Y(t) = Yb(t) * (1 + yD(t) + yS(t))`.
- **E7 (D13)** : Passage au solde par deux coefficients distincts : `ε = 0,6` (`fisc.eps`) pour la demande `yD`, `ε_offre = 0,436` (`fisc.eps_offre`, taux de prélèvements obligatoires 2025) pour l'offre `yS`.
- **E8** : Solde primaire par bloc = référence (`spb0` moins dérive `dA + dB`) + mesures ex post + stabilisateurs.
- **E9** : Taux à l'émission `i_new = clamp(i* + β * (ratioPrev - ratioRef) * 100, 0, 25 %)`, avec `i*` pondéré BTF / OAT 2–8 ans / OAT 10 ans+ (≈ 4,38 %) et `β = 3 pb/pt` (fourchette 1–5) ancré sur 2026.
- **E10** : Inertie du taux moyen du stock `φ = min(1, 1/M + max(0, ΔD)/D)`, `M = 8,45 ans`.
- **E11** : Intérêts `INT = i_moy * D(t-1)` et dette `D(t) = D(t-1) + INT - primary` (ajustements stock-flux nuls).
- **E12** : Chômage d'Okun `u(t) = u_ref - κ * 100 * (yD + yS)`.

## 3. Interface utilisateur (`src/pages/` et `src/components/`)

4 pages reliées par navigation hash (`src/hooks/useHashNavigation.js`) :
1. **`IntroPage.jsx`** : présentation pédagogique du moteur v2, chiffres 2025 lus depuis `PARAMS`, trajectoire de référence à 10 ans et sensibilité à `β` à 30 ans, limites assumées.
2. **`SimulateurBudgetPage.jsx`** (`src/pages/budget/`) : 14 leviers actifs en 3 groupes (recettes, dépenses, prestations), 3 leviers structurels désactivés, **6 scénarios types neutres** (`presets.js`, dont le comparateur macroéconomique RESF 2027), 3 horizons, 3 cas d'offre, décomposition exacte par cause (`decomposeAtYear`, somme = écart au centième de milliard), 3 blocs APU, avertissements palier 1 (`260 %`, record Japon 2020) / palier 2 (`500 %` dette ou `50 %` intérêts/recettes), **URL partageables** (`share.js`), **export CSV** (`exportCsv.js`).
3. **`SimulateurRetraitesPage.jsx`** (`src/pages/retraites/`) : variantes de productivité COR juin 2026 (`1,0 %` / `0,7 %` / `0,4 %`), variantes santé/dépendance Commission européenne 2024, leviers validés (`age_legal` 62–67 ans dès janv. 2028 avec effet d'offre emploi seniors, `indexation_pensions`), **préréglage Comptes notionnels (D8)** (`age_legal = 65 ans` + `NDC_MODULE`, `non validé`, confiance basse), mesure désactivée (`plafonnement_pensions`), 4 graphiques, décomposition exacte et 3 blocs.
4. **`HypothesesPage.jsx`** (`src/pages/hypotheses/`) : lit 100 % de ses tableaux dans `PARAMS`, `LEVERS`, `STRUCTURAL_LEVERS`, `SUPPLY_EFFECTS` et `WARNING_THRESHOLDS` (comptes APU 2025, COFOG 2024, équations E1–E12, catalogue leviers/σ, table filtrable des 167 paramètres, 3 questions ouvertes aux relecteurs).

## 4. Suite de tests (`npm test`)

- `src/engine/__tests__/engine.test.js` : tests unitaires et d'invariants du moteur v2 (paramètres, leviers, θ, offre, E1–E12, modules, balayage aléatoire).
- `src/engine/__tests__/benchmarks.test.js` : comparaisons à périmètre homogène contre RESF 2027, Commission européenne (printemps 2026 et DSM 2025) et Cour des comptes (juin 2026).
- `src/engine/__tests__/ndc-module.test.js` : contrat de module, rampe 15 ans dès 2028, ancrage COR 2026 sur 3 variantes, `yS = 0`, préréglage complet et décomposition exacte.
- `src/engine/__tests__/lvt-module.test.js` : instantané et paramètres (gardes `toBe`), contrat, D11 par bloc, flux, capitalisation D12, `yS`, intégration au moteur sur tous les horizons.
- `src/__tests__/eps-offre.test.js` : vérification de D13 (`ε_offre` vs `ε`) et de la séparation demande/offre.
- `src/__tests__/randomized.test.js` : tests de propriété déterministes (graines fixes) sur scénarios aléatoires, URL partageables, CSV et bornes numériques.
- `src/pages/budget/*.test.js` (`helpers`, `presets`, `warnings`, `share`, `exportCsv`), `src/pages/retraites/helpers.test.js`, `src/pages/hypotheses/helpers.test.js`, `src/version.test.js`.

## 5. Discipline Git, neutralité et rigueur scientifique

- **Branches** : travailler sur des branches dédiées issues de `review/day0`, ouvrir les PR avec `--base review/day0`. **Ne jamais toucher `main`** ni fusionner soi-même sans revue indépendante.
- **Comparateurs, jamais cibles** : les prévisions du Gouvernement (RESF 2027), de la Commission européenne et de la Cour des comptes servent de comparateurs nommés ; le moteur ne calibre jamais ses paramètres pour les reproduire artificiellement.
- **Neutralité politique** : aucun scénario partisan ; si une implémentation externe partisane est citée en comparaison (ex. simulateur du Parti libéral français `[S24]`), son éditeur est déclaré explicitement, ses chiffres non transposables (`−53 %`, marge de système) et ses éléments de programme sont exclus, et les textes sont rédigés depuis les sources primaires.
- **Honnêteté des statuts et modes de lecture** : distinguer `sourcé`, `sourcé (calcul)`, `sourcé (secondaire)`, `sourcé (fourchette), centre choisi`, `calculé (estimation)`, `de mémoire`, `à collecter`, `non validé`. Ne jamais présenter un chiffre lu via résumé ou source secondaire comme une lecture directe de PDF primaire, et ne jamais inventer un paramètre sans ancrage documenté.
- **Validation avant tout commit / PR** : exécuter impérativement :
  ```bash
  npm run lint && npm test && npm run build
  ```
  (sous Windows PowerShell 5.1, séparer avec `;` et vérifier chaque code de sortie). Zéro erreur et zéro avertissement lint exigés.

## 6. Limites connues (alignées sur `docs/model-note.md` §10–§12)

- **Paramètres à vérifier / collecter** : plusieurs paramètres portent un statut signalé (notamment `de mémoire` pour multiplicateurs, θ, ε, κ ; `à collecter` pour `ref.derive.b_autres`, `comp.offset.prestations`, `rend.is`, `rend.cotis`, `bloc.part_hors_secu.*`, `macro.pi.long` ; `non validé` pour `macro.g/pi` 2026–2027, `dem.lambda`, délais `offre.lag/t0`, effet d'offre de l'IR, `NDC_MODULE`).
- **Hors périmètre Day 0** : modèle déterministe (pas de distribution probabiliste), inflation exogène (pas de boucle prix-salaires), régime unique de multiplicateurs d'expansion, prolongement linéaire de `β` jusqu'au plafond de 25 % (encadré par les paliers 1 et 2).
- **Questions ouvertes aux relecteurs (§12)** : (1) rentabilité long terme d'une hausse uniforme d'IR (`e_L = 0,40`, `τ_m = 21 %`), (2) calibrage de `ε_offre = 0,436` (D13), (3) pente dette–taux `β = 3 pb/pt` en zone euro et comportement au-delà de 200 % de dette/PIB.

---

## 7. Security Review Process (HARD GATE)

**MANDATORY: No production deployment proceeds without Gemini security review sign-off.**

**Reviewer model: Gemini 4 Neon** (API model code `gemini-4-neon`, Google AI Studio / Gemini API). Do not substitute another model without Patrick's approval.

### Review Scope

1. **Security-by-design:** No injection vulnerabilities, proper input validation at system boundaries (URL parameters in `src/pages/budget/share.js`, CSV export in `src/pages/budget/exportCsv.js`)
2. **Coding excellence:** Clean code, no dead code, consistent patterns, proper error handling
3. **Robustness:** Edge cases handled (NaN, undefined, extreme lever values, 30-year horizon, debt-warning tiers)

### Process

1. Before any deployment to production, request a Gemini 4 Neon review of all changed files
2. Gemini must confirm: "APPROVED for production deployment"
3. If Gemini flags issues, fix them and re-request review
4. **No exceptions.** Preview deploys are allowed without review; production deploys are not.

### Review Checklist

- [ ] All interest-rate paths (`issuanceRate()`, β premium, `RATE_MAX` cap in `src/engine/project.js`) produce valid numbers (no NaN, no Infinity)
- [ ] All lever extreme combinations produce valid projections on every horizon
- [ ] No hardcoded credentials or API keys
- [ ] No eval(), innerHTML, dangerouslySetInnerHTML or other injection vectors
- [ ] All external data (user inputs, URL-decoded scenarios) are sanitized and clamped before use in calculations

---

## 8. Deployment Workflow

### Platform: Vercel

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build (`vite build`) |
| `npm run preview` | Preview production build locally |
| `npx vitest run` | Run test suite |

### Deployment Steps

1. **Development:** Work on a branch from `review/day0`, run tests locally
2. **Preview deploy:** Push branch → Vercel creates a preview deploy automatically
3. **Gemini 4 Neon review:** Request security review (HARD GATE — see §7)
4. **Production deploy:** Only after Gemini sign-off, merge to `main` (Patrick only) → Vercel deploys to production

### Pre-deployment Checklist

- [ ] `npm run lint && npx vitest run && npm run build` — zero errors, zero lint warnings
- [ ] Manual verification: load app, check baseline figures, test lever extremes
- [ ] No NaN in any chart or metric card
- [ ] All presets load correctly
- [ ] Hypothèses page displays all parameters with sources and statuses
- [ ] Gemini 4 Neon security review: APPROVED
