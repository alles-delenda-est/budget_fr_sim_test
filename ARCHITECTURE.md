# Architecture — Simulateur Budget France (moteur v2)

Ce document décrit l'architecture technique et économique du simulateur en version **moteur v2** (spécification : `docs/model-note.md` v0.3 ; données de base : `docs/baseline-data.md`).

---

## 1. Vue d'ensemble

Application statique React 19 + Vite 7 + Recharts 3, 100 % côté client (aucun backend, calcul déterministe synchrone dans le navigateur).

```text
src/
├── main.jsx                    # Point d'entrée React
├── index.css                   # Variables de thème et styles globaux
├── App.jsx / App.css           # Coque applicative, bandeau relecture, navigation hash, pied de page versionné
├── config.js                   # Seuils d'avertissement (WARNING_THRESHOLDS) et URL de commentaires
├── version.js / version.test.js# Empreinte de version (package.json, commit court, date build)
├── hooks/
│   └── useHashNavigation.js    # Routage #/intro, #/budget, #/retraites, #/hypotheses
├── components/
│   ├── Navigation.jsx/.css     # Barre d'onglets
│   └── ReviewBanner.jsx/.css   # Bandeau « Version de relecture »
├── engine/                     # Moteur de projection v2 (pur JavaScript, sans dépendance React)
│   ├── params.js               # Catalogue unique des 162 paramètres (PARAMS, PARAM_BY_ID, resolveParams, interpolateSeries)
│   ├── levers.js               # 14 leviers actifs (LEVERS) + 3 leviers structurels désactivés (STRUCTURAL_LEVERS)
│   ├── supply.js               # Effets d'offre E5 (σ calculé fiscal + σ décidé) et θ_non_réel
│   ├── modules.js              # Contrat de module autonome (validateModuleDefinition, runModule, TEST_MODULE)
│   ├── ndc-module.js           # Module Comptes notionnels (NDC_MODULE, forme réduite, non validé, D8)
│   ├── project.js              # Boucle de projection E1–E12 (projectScenario, HORIZONS, issuanceRate)
│   └── __tests__/
│       ├── engine.test.js      # Invariants et tests unitaires E1–E12, modules, offres
│       ├── benchmarks.test.js  # Comparateurs homogènes RESF 2027, CE 2026 / DSM 2025, Cour des comptes 2026
│       └── ndc-module.test.js  # Contrat, rampe 15 ans, ancrage COR 2026, décomposition NDC
├── pages/
│   ├── IntroPage.jsx/.css      # Accueil pédagogique, référence 10 ans et sensibilité β à 30 ans
│   ├── SimulateurBudgetPage.jsx/.css
│   ├── SimulateurRetraitesPage.jsx/.css
│   ├── HypothesesPage.jsx/.css
│   ├── budget/                 # Helpers, presets neutres, warnings, partage URL, export CSV, graphiques & tableaux
│   │   ├── helpers.js / .test.js
│   │   ├── presets.js / .test.js
│   │   ├── warnings.js / .test.js
│   │   ├── share.js / .test.js
│   │   ├── exportCsv.js / .test.js
│   │   ├── LeverPanel.jsx, Charts.jsx, Results.jsx, InfoPopover.jsx, ShareButton.jsx
│   ├── retraites/
│   │   └── helpers.js / .test.js   # Variantes COR 2026 & santé CE 2024, préréglage NDC (D8), séries & fiches
│   └── hypotheses/
│       └── helpers.js / .test.js   # Comptes APU 2025, COFOG 2024, équations E1–E12, catalogue leviers/PARAMS
└── __tests__/
    ├── eps-offre.test.js       # Vérification D13 (ε_offre vs ε)
    └── randomized.test.js      # Tests de propriété déterministes (balayage aléatoire, URL, CSV)
```

---

## 2. Périmètre comptable et trois blocs APU

Le modèle couvre l'ensemble des **administrations publiques (APU)** en comptabilité nationale (solde et dette au sens de Maastricht), ancré sur les comptes provisoires **2025** de l'Insee (`docs/baseline-data.md`) :

| Bloc (Md€ 2025) | Recettes | Dépenses | Intérêts | Solde |
|---|---:|---:|---:|---:|
| Administrations centrales (État et ODAC) | 550,8 | 681,1 | 53,3 | −130,3 |
| Collectivités locales (APUL) | 319,9 | 335,5 | 6,0 | −15,6 |
| Sécurité sociale (ASSO) | 796,5 | 803,2 | 5,6 | −6,7 |
| **Total APU consolidé** | **1 561,7** | **1 714,2** | **64,7** | **−152,5** |

- **Consolidation** : les transferts entre blocs (`105,6 Md€`) sont éliminés dans le total consolidé.
- **PIB 2025** : `2 991 Md€` (RESF 2027) ; **dette brute 2025** : `3 460,5 Md€` (`115,7 %` du PIB).
- **Horizons (`HORIZONS`)** : `dixAns` (2026–2036), `jusqua2040` (2026–2040), `trenteAns` (2026–2056). `t = 0` représente 2026 (année en cours, estimation) ; les leviers agissent dès `t = 1` (2027), sauf l'âge légal et `NDC_MODULE` qui démarrent en janvier 2028 (`t = 2`, alignés sur la fin du gel LFSS 2026).

---

## 3. Flux de calcul du moteur (`projectScenario`)

### 3.1 Résolution des paramètres et instruments
1. `resolveParams(overrides)` résout les 162 paramètres de `PARAMS` en validant les identifiants et la finitude des valeurs.
2. `leversToInstruments(levers, P, N, ramp, { sigma, ysCase })` convertit les 14 leviers actifs (`LEVERS`) en séries annuelles par bloc `aBlocks[bloc][t]` (fraction du PIB de référence) et `theta[t]`.
3. Chaque module passé dans `options.modules` est exécuté par `runModule(mod, values, context)` avec un `context` profondément gelé (`deepFreeze`). Le contrat impose qu'un module ne renvoie que `{ annees, flux, explications }`, ne touche jamais à la dette ni aux intérêts, et fournisse `a` par bloc, `theta ∈ [0, 1]`, `categorie` ou `m`, et un `yS` optionnel `{ bas, central, haut }`.
4. `coreSupplyLines` calcule les séries d'effets d'offre E5 des leviers natifs pour les trois cas (`bas`, `central`, `haut`), auxquelles s'ajoutent celles des modules et d'un éventuel chemin `options.yS` externe.

### 3.2 Équations E1–E12 (boucle `t = 0..N`)
- **E1 — PIB nominal de référence** : `Yb(t) = Yb(t-1) * (1 + g(t) + pi(t))`. La référence utilise la médiane des prévisionnistes indépendants (`macro.g.2026/2027/potentielle`, `macro.pi.2026/2027/long`).
- **E2 — Mesures ex ante** : `a(j,t) = signe * rendement(j) * x(j) * rampe(j,t) / base.pib.2025`, appliqué au PIB de référence `Yb(t)`.
- **E3 — Réponse comportementale `θ`** :
  - Recettes : `θ = e·τ/(1−τ)` (ou `η·τ` pour l'IS), symétrique en paramètres, évalué au taux après réforme `τ1`. Quand le levier porte un effet d'offre `σ ≠ 0`, `θ` est réduit à sa part non réelle au rythme de la montée en charge E5 (`θ_non_réel(t) = max(0, θ − θ_réel × phase(t))`) afin d'éviter tout double compte avec E5 + E7.
  - Dépenses : `θ = 0`, sauf effets de report sociaux `comp.offset.age_legal` (`0,20`, DREES/DARES) pour `age_legal` et décalage optionnel `comp.offset.prestations` (`0` par défaut) pour `indexation_pensions` et `NDC_MODULE`.
- **E4 — Effet de demande** : `S_j(t) = λ S_j(t-1) + m_j Δa_j(t)` ; `yD(t) = −Σ S_j(t)` (`λ = 0,7`). Effet en niveau qui s'estompe vers 0.
- **E5 — Effets d'offre** : `yS_j(t) = σ_j × taille_j(t) × clamp((τ − t0_j) / (L_j − t0_j), 0, 1)`.
  - `σ` **calculé** dans `supply.js` pour les impôts sur le travail (`cotis_patronales`, `csg`, `tva_normal`, `tva_tous_taux`, `ir` via `offre.e_L = 0,40` et le coin fiscal `comp.coin.part_nette = 0,57`) et pour l'`is` (coût d'usage du capital, plafonné à `0,15 %` PIB/pt). L'effet d'offre de l'`ir` porte le statut `non validé`.
  - `σ` **décidé** (revue de preuves) pour `age_legal` (`+0,50 %` PIB/an, `+0,30 / +0,70`, `L = 6`, décision du 23 nov. 2026), `travail_assurance_chomage` (`−0,012 %` PIB par % de générosité, `L = 3`), `dep_enseignement` (`0 / 0 / +0,040 %` PIB par % de ligne, `L = 35`, `t0 = 8`), ainsi que `offre.sigma.lvt` (`+0,20 %`, `L = 12`, `t0 = 1`, destiné au futur module LVT).
- **E6 — PIB réalisé** : `Y(t) = Yb(t) * (1 + yD(t) + yS(t))`.
- **E7 — Stabilisateurs et retour fiscal (D13)** : `stab = (ε * yD + ε_offre * yS) * Yb`, avec `ε = 0,6` (cyclique) et `ε_offre = 0,436` (taux de prélèvements obligatoires 2025, sans dépense cyclique).
- **E8 — Solde primaire par bloc** : `sp(b, t) = ref(b, t) + exAnte(b, t) + behav(b, t) + stab(b, t)`. La dérive de référence combine le vieillissement `dA` (écart COR retraites à 2025 + dérive santé Commission européenne, affecté à `securiteSociale`) et `dB` (`ref.derive.b_autres`, actuellement `0`, réparti au prorata des dépenses), retranchés en variation depuis `t = 0` pour éviter de compter deux fois la dérive déjà incluse dans `ref.spb_2026`.
- **E9 — Taux à l'émission** : `i*` est la moyenne pondérée BTF / OAT 2–8 ans / OAT 10 ans+ (≈ `4,38 %`). Prime de risque linéaire `β * (ratio(t-1) − ratio(2026)) * 100` (`β = 3 pb/pt`, fourchette `1–5`), bornée à `[0, 25 %]`.
- **E10 — Taux moyen du stock** : `i_moy(t) = (1 − φ) i_moy(t-1) + φ i_new(t)` avec `φ = min(1, 1/M + max(0, D(t-1) − D(t-2)) / D(t-1))`, `M = 8,45 ans`.
- **E11 — Intérêts et dette** : `INT(t) = i_moy(t) * D(t-1)` (ventilé par bloc via `bloc.part_interets.*`) et `D(t) = D(t-1) + INT(t) − primary(t)`.
- **E12 — Chômage (Okun)** : `u(t) = base.chomage_ref − κ * 100 * (yD + yS)` (`κ = 0,4`).

### 3.3 Catalogue des leviers et modules
- **14 leviers actifs (`LEVERS`)** :
  - *Recettes (6)* : `tva_normal`, `tva_tous_taux`, `csg`, `ir`, `is`, `cotis_patronales`.
  - *Dépenses par fonction COFOG (4)* : `dep_enseignement`, `dep_defense`, `dep_ordre_securite`, `dep_affaires_eco`.
  - *Prestations sociales / ASSO (4)* : `ondam`, `travail_assurance_chomage`, `indexation_pensions`, `age_legal`.
- **3 leviers structurels désactivés (`STRUCTURAL_LEVERS`)** : `logement_offre`, `logement_loyers`, `travail_licenciement` (`actif: false`, `statut: 'non validé'`, `σ = 0`).
- **Module actif sur la page Retraites (`NDC_MODULE`, `src/engine/ndc-module.js`)** :
  - `id: 'comptes_notionnels_ndc'`, `statut: 'non validé'` (confiance basse, D8).
  - Démarre en janvier 2028 (`t = 2`), montée en charge linéaire sur 15 cohortes (`2028–2042`), stabilise sur le bloc `securiteSociale` la dérive `max(0, COR(y) − COR(2025))` de la série `ref.derive.a_retraites` active, avec `yS = 0` (effet d'offre emploi seniors porté uniquement par `age_legal`).

---

## 4. Couche présentation, transparence et garde-fous

### 4.1 Décomposition exacte par cause (`decomposeAtYear`)
Pour toute année `t`, `decomposeAtYear(result, reference, t, eps, epsOffre)` décompose l'écart de solde `result.total[t].balance − reference.total[t].balance` (en Md€) en lignes exhaustives dont la somme exacte égale l'écart (`< 1e-6`) :
- `macro` (si un comparateur macroéconomique comme RESF 2027 est actif) ;
- `statique` et `comportement` par instrument (levier natif ou module, libellé depuis `LEVER_BY_ID` puis `result.modules`) ;
- `demande` (stabilisateurs automatiques liés à `yD`) ;
- `offre` (une ligne distincte par effet d'offre actif dans le cas retenu, portant `ε_offre * yS_j * Yb`) ;
- `interets` (écart de charge d'intérêts : taux et stock cumulé).

### 4.2 Avertissements « hors expérience historique » (`src/config.js`, `src/pages/budget/warnings.js`)
- **Palier 1 (`tier1DebtPct = 260 %`)** : dette dépassant le record historique des économies avancées (Japon `258 %` en 2020, FMI). Bandeau de vigilance et ligne repère orangée.
- **Palier 2 (`tier2DebtPct = 500 %`, `tier2InterestShareRevenuePct = 50 %`, `tier2GdpFigurePct = 500 %`)** : trajectoire hors de toute expérience historique. Bandeau d'alerte, zone grisée sur les graphiques (`splitSeriesAtYear`) et axe vertical calibré sur la seule zone réaliste (`visibleDomain`).

### 4.3 Partage, export et scénarios neutres
- **Scénarios types neutres (`src/pages/budget/presets.js`)** : 6 points de départ non partisans (`reference`, `previsions_gouv` comparateur RESF 2027, `equilibre`, `depenses`, `recettes`, `tva_sociale`).
- **URL partageables (`src/pages/budget/share.js`)** : sérialisation dans le hash `#/budget?h=…&cas=…&m=…&levier=…`, décodage strict borné aux plages valides.
- **Export CSV (`src/pages/budget/exportCsv.js`)** : séparateur `;`, virgule décimale, horodatage de version, protection contre l'injection de formules tableur.
- **Statuts de validation** : `StatusBadge` et `InfoPopover` mettent en évidence tout paramètre dont le statut appartient à `FLAGGED_STATUSES` (`de mémoire`, `à collecter`, `non validé`, `calculé (estimation)`).

---

## 5. Tests, qualité et construction

Commandes de vérification (toutes requises sans erreur ni avertissement) :
- `npm run lint` : ESLint 9 (`eslint.config.js`).
- `npm test` : Vitest (`vitest run`), couvrant le moteur v2 (`engine.test.js`, `benchmarks.test.js`, `ndc-module.test.js`), D13 (`eps-offre.test.js`), les propriétés aléatoires à graine fixe (`randomized.test.js`), les helpers des 4 pages et l'empreinte de version (`version.test.js`).
- `npm run build` : build de production Vite (`dist/`) avec injection de `__APP_VERSION__`, `__GIT_COMMIT__` et `__BUILD_DATE__`.

---

## 6. Limites assumées et pistes ouvertes (`docs/model-note.md` §10–§12)

1. **Modèle déterministe** : l'incertitude est explorée via les 3 cas d'offre (`bas`/`central`/`haut`) et les fourchettes de `PARAMS`, sans bande probabiliste.
2. **Inflation exogène** : pas de boucle prix-salaires ni de réponse endogène de l'inflation.
3. **Multiplicateurs d'expansion** : pas de basculement automatique en régime de récession.
4. **Boucle dette–taux linéaire** : prolongement de `β` jusqu'au plafond de 25 %, d'où l'encadrement visuel par les paliers 1 et 2 et la question ouverte aux relecteurs sur le calibrage de `β` en zone euro.
5. **Modules en attente** : le module LVT (taxe sur la valeur du sol, `docs/review-lvt-module.md`, décisions D11–D12) et le plafonnement des pensions restent hors activation jusqu'à validation ; le module `NDC_MODULE` reste en forme réduite `non validé` (confiance basse).
