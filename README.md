# Simulateur Budget France (moteur v2)

Simulateur interactif des finances publiques françaises couvrant les **administrations publiques consolidées (APU)** en comptabilité nationale (Maastricht) — **administrations centrales (État et ODAC)**, **sécurité sociale (ASSO)** et **collectivités locales (APUL)** — sur trois horizons (**10 ans / 2036**, **2040** et **30 ans / 2056**).

Version en ligne : **https://budget-fr-sim-test.vercel.app**

## Fonctionnalités

- **Comptes 2025 consolidés (3 blocs APU)** : ancrage sur les comptes provisoires 2025 de l'Insee (`1 714,2 Md€` de dépenses consolidées, `1 561,7 Md€` de recettes, solde `−152,5 Md€`, dette brute `3 460,5 Md€` soit `115,7 %` du PIB ; transferts inter-blocs de `105,6 Md€` consolidés).
- **Moteur v2 (équations E1–E12)** :
  - Croissance et inflation de référence ancrées sur la médiane des prévisionnistes indépendants (les prévisions du Gouvernement figurent uniquement comme comparateur nommé, jamais comme cible).
  - **14 leviers actifs** (6 recettes fiscales, 4 fonctions de dépense COFOG, 4 prestations sociales dont `age_legal` et `indexation_pensions`) et **3 leviers structurels** affichés en « non validé — avis demandé » (`σ = 0`).
  - Réponse comportementale `θ` symétrique en paramètres, évaluée au taux après réforme et réduite à sa part non réelle (`θ_non_réel`) lorsqu'un effet d'offre `σ ≠ 0` existe.
  - Effets de demande en niveau qui s'estompent (`λ = 0,7`) et effets d'offre permanents explicites (`yS` bas / central / haut) passant au solde via deux coefficients distincts (`ε = 0,6` pour la demande ; `ε_offre = 0,436` pour l'offre, taux de prélèvements obligatoires 2025).
  - Charge d'intérêts aux taux de marché (`i*` pondéré BTF / OAT 2–8 ans / OAT 10 ans+ ≈ `4,38 %`), prime de risque `β = 3 pb/pt` (fourchette `1–5`) et inertie du stock de dette (`M = 8,45 ans`).
  - Avertissements « hors expérience historique » : **palier 1** (`260 %` du PIB, record Japon 2020) et **palier 2** (`500 %` du PIB ou intérêts `> 50 %` des recettes publiques).
- **Simulateur budgétaire** : 6 scénarios types **neutres** (dont le comparateur macroéconomique RESF 2027), décomposition exacte de l'écart de solde par cause, ventilation sur les 3 blocs APU, **URL partageables** et **export CSV** (séparateur `;`, protection anti-injection).
- **Simulateur retraites** : variantes de productivité du **COR (juin 2026)** et de dérive santé/dépendance (**Commission européenne 2024**), leviers retenus pour la version 0.9 (`age_legal` 62–67 ans recalibré sur sources primaires avec effet d'offre emploi seniors et 20 % de reports sociaux, `indexation_pensions`), préréglage **Comptes notionnels (NDC, dès 2028)** (`NDC_MODULE`, forme réduite `non validé`, confiance basse, décision D8) et mesure désactivée (`plafonnement_pensions`).
- **Onglet Hypothèses & Paramètres** : source unique de vérité lisant 100 % des 162 paramètres, statuts (`sourcé`, `de mémoire`, `à collecter`, `non validé`, etc.), fourchettes et questions ouvertes aux relecteurs directement dans le catalogue du moteur.

## Pile technique

- React 19 + Vite 7 + Recharts 3
- CSS pur (mobile d'abord, sans framework)
- Vitest (13 fichiers, 267 tests) + ESLint 9

## Lancer en local

```bash
npm ci
npm run dev      # http://localhost:5173
npm run lint     # vérification ESLint
npm test         # suite de tests Vitest
npm run build    # build de production (dist/)
```

## Structure du projet

```text
src/
├── engine/                     # Moteur de projection v2 (pur JS, sans React)
│   ├── params.js               # Catalogue unique des 162 paramètres (PARAMS)
│   ├── levers.js               # 14 leviers actifs + 3 leviers structurels désactivés
│   ├── supply.js               # Effets d'offre E5 (σ calculé fiscal + σ décidé) et θ_non_réel
│   ├── modules.js              # Contrat de module autonome
│   ├── ndc-module.js           # Module Comptes notionnels (forme réduite, non validé, D8)
│   ├── project.js              # Boucle de projection E1–E12 (projectScenario, HORIZONS)
│   └── __tests__/              # engine.test.js, benchmarks.test.js, ndc-module.test.js
├── pages/                      # IntroPage, SimulateurBudgetPage, SimulateurRetraitesPage, HypothesesPage
├── components/                 # Navigation, ReviewBanner
├── config.js                   # Seuils WARNING_THRESHOLDS et configuration relecture
└── __tests__/                  # eps-offre.test.js, randomized.test.js
docs/
├── model-note.md               # Spécification complète du modèle (v0.3, E1–E12, D1–D13)
├── baseline-data.md            # Données primaires collectées et comparateurs
├── sigma-fiscal.md             # Dérivation des effets d'offre fiscaux et θ_non_réel
├── review-age-legal.md         # Revue primaire et recalibrage du levier âge légal (Cour 2025, COR 2026)
├── review-comptes-notionnels.md# Revue du simulateur NDC externe
└── review-lvt-module.md        # Revue du module taxe sur la valeur du sol (LVTShift)
```

Pour l'architecture détaillée et les conventions de contribution, voir [ARCHITECTURE.md](ARCHITECTURE.md), [CLAUDE.md](CLAUDE.md) et [docs/model-note.md](docs/model-note.md).

## Limites assumées

- **Modèle déterministe** : pas de distribution probabiliste ; l'incertitude s'explore via les 3 cas d'offre (`bas` / `central` / `haut`) et les fourchettes des paramètres.
- **Inflation exogène** : trajectoire issue des prévisionnistes indépendants, sans boucle prix-salaires.
- **Multiplicateurs d'expansion uniquement** : pas de changement automatique de régime en récession.
- **Prolongement linéaire de `β`** jusqu'au plafond de 25 %, encadré par les avertissements palier 1 et palier 2.
- **Transparence de la collecte** : plusieurs paramètres restent marqués `de mémoire`, `à collecter` ou `non validé` dans toute l'interface dans l'attente de la revue des économistes (voir `docs/model-note.md` §10–§12).
