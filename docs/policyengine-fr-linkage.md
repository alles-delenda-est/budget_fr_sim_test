# Bookmark — Intégration `policyengine-fr` (microsimulation ménages → moteur macro v2)

> **Statut :** Bookmarked pour la semaine suivante (décembre 2026).  
> **Dépôt compagnon :** `alles-delenda-est/policyengine-fr` (branche `feat/roadmap-2026-consolidation` : barèmes 2024–2025 IR/QF/décote/CEHR/PFU, cotisations salariales/patronales + réduction générale, CSG/CRDS/CASA pensions à 4 tranches, RSA, Prime d'activité, AF/ASF — 25/25 cas oracles DGFiP & `openfisca-france` validés).

---

## 1. Pourquoi lier `policyengine-fr` au moteur budgétaire ?

Dans Day 1a, l'effet d'offre travail (`E5`) de l'IR et de la CSG repose sur deux ratios agrégés provisoires issus de sources primaires (`src/engine/params.js`) :
- `offre.ir.part_actifs = 1 017 / 1 475 ≈ 68,9 %` (DGFiP Statistiques n° 53, nov. 2026, Tableau 1 p. 3 — revenus 2025)
- `offre.csg.part_actifs = 110 670 / 157 207 ≈ 70,4 %` (CCSS octobre 2026, §1.3, Tableau 1 p. 55 — constaté 2025)

Cette approximation agrégée ne distingue pas la part active **tranche par tranche**, ni l'interaction exacte entre le barème IR, la **décote** (`45,25 %`), le **quotient familial**, la **Prime d'activité** (`39 %`) et les **4 tranches de CSG retraites** (`0 / 3,8 / 6,6 / 8,3 %`).

Une fois `policyengine-fr` doté d'un **jeu de microdonnées pondéré** (INSEE ERFS ou population synthétique calibrée sur DGFiP Stat n° 53 + DREES retraites + CCSS), la microsimulation calcule directement, foyer par foyer :
1. Les **taux marginaux effectifs sur revenus d'activité seuls** ($\partial T / \partial w$ pour les actifs uniquement, $0$ pour les retraités et revenus du capital) → remplace l'inversion de barème `ir-tranches.js` et les deux ratios plats `offre.ir.part_actifs` / `offre.csg.part_actifs`.
2. Les **rendements statiques unifiés** (`rend.ir`, `rend.csg`, `rend.sous_indexation_ciblee`) et les **retours fiscaux/sociaux mécaniques** (`comp.offset.prestations`, `comp.offset.pensions_hautes`).
3. Des **trajectoires démographiques** optionnelles en repondérant les ménages sur les projections INSEE 2021–2070 (déjà disponibles) afin que la part active évolue avec le vieillissement.

---

## 2. Architecture cible (zéro dépendance Python dans le navigateur)

Même contrat découplé et reproductible que `LVTShift` (`src/engine/data/lvt-yields.json` + `lvt-yields.source.json`) :

1. **Côté `policyengine-fr` (Python, hors ligne / CI) :**
   - Construire et calibrer un jeu de ménages pondérés (cibles : 42,1 M foyers DGFiP Stat n° 53, 92,6 Md€ IR net, 157,2 Md€ CSG CCSS, masse salariale et pensions DREES/INSEE).
   - Exécuter un script d'export déterministe (`scripts/export_macro_snapshot.py`) sur les réformes de `policyengine_fr/reforms/budget_levers.py`.
   - Produire un fichier JSON épinglé **`microsim-snapshot.json`** + **`microsim-snapshot.source.json`** (commit SHA, `as_of`, version de `policyengine-fr`, empreinte SHA-256).
2. **Côté `budget_fr_sim_test` (JS pur, navigateur) :**
   - Importer `src/engine/data/microsim-snapshot.json` avec validation stricte de schéma (comme `lvt-yields-schema.js`) et tests de provenance SHA-256.
   - Alimenter automatiquement :
     - `ir.delta_ln_net_active` & `ir.theta_reel_unit` (et ventilation par tranche `11 / 30 / 41 / 45 %`),
     - `csg.delta_ln_net_active` (séparant activité / remplacement / patrimoine),
     - `rend.ir`, `rend.csg`, `rend.sous_indexation_ciblee`,
     - `comp.offset.prestations`, `comp.offset.pensions_hautes` (et ventilation IR / CSG / RSA / PPA / APL).

---

## 3. Prérequis à traiter la semaine prochaine

- [ ] **Microdataset calibré dans `policyengine-fr` :** construire la population synthétique pondérée (calage sur marges DGFiP Stat n° 53 + INSEE ERFS/Revenus fiscaux + CCSS + DREES) avec tolérance `< 1 %` sur IR net, CSG par assiette et masses de revenus.
- [ ] **Compléter les prestations manquantes pour `comp.offset.prestations` :** ajouter ASPA et APL (ou documenter la borne partielle RSA/PPA/AF/IR/CSG).
- [ ] **Exporter `microsim-snapshot.json` + tests croisés** dans `budget_fr_sim_test`, puis basculer `ir-tranches.js` / `supply.js` sur le snapshot épinglé avec repli documenté.
