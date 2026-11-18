# Effets d'offre des leviers fiscaux : méthode et chiffres proposés

**Statut : proposition, 18 novembre 2026, soumise à Patrick. Rien de ceci n'est encore dans le moteur.** Décision de Patrick du 17 novembre : σ central non nul pour les leviers fiscaux, tiré de la part « activité réelle » de la réponse comportementale ; les valeurs hautes de la revue Gemini (`docs/review-supply-effects-gemini.md`) servent de plafond.

## 1. Méthode

**Principe.** Une baisse d'impôt déplace deux choses : les assiettes déclarées (optimisation, déplacement de revenus, calendrier), et l'activité réelle (heures, emploi, investissement). Le moteur compte déjà la première dans θ (coût moindre que le coût statique). Seule la seconde change le PIB. σ mesure cette seconde partie, et seulement elle.

**Impôts sur le travail (cotisations patronales, CSG, IR, TVA).** Ce qui compte pour l'offre de travail est le coin fiscal total : ce que le salarié peut consommer par euro de coût du travail, `1 − T`. Pour chaque levier, on calcule de combien un point fait varier `ln(1 − T)`, puis :

`σ = e_L × |Δ ln(1 − T)|` (en % du PIB par unité de levier)

où `e_L` est l'élasticité du travail (pondérée par les salaires) à la rémunération nette. À long terme, le capital s'ajuste et garde K/Y constant, donc la variation du PIB égale celle du travail.

- `e_L` central **0,19**, fourchette 0,10 / 0,30. Source : CBO, élasticité totale du salaire pour l'ensemble des actifs, pondérée par les revenus, 0,19 (substitution 0,24, revenu −0,05) ; le CBO ne trouve pas d'élasticité nettement plus forte du travail des hauts revenus. Statut : sourcé (secondaire, États-Unis). Une estimation française reste à trouver. La fourchette est un choix.
- Coin fiscal au salaire moyen, célibataire, 2025 : 58,2 % du coût du travail ; IR + cotisations salariales (CSG comprise) 43,0 % du brut ; cotisation patronale marginale 36,4 % du brut (OCDE, *Taxing Wages 2026*, déjà dans `params.js`).

**IS.** Canal du coût d'usage du capital : `σ = α × ε_K × |Δc/c|`, avec `Δc/c = Δτ × (1/(1 − τ) − z/(1 − τz))`.
- τ = 25 % ; z (valeur actuelle des amortissements) ≈ 0,8 (de mémoire) → Δc/c ≈ 0,33 % par point.
- ε_K (élasticité du capital au coût d'usage) 0,5, fourchette 0,3–1,0 (de mémoire).
- α (part du capital des sociétés dans le PIB) ≈ 0,18 (de mémoire, à calculer sur les comptes des SNF).

**Pas de double compte.** Aujourd'hui θ contient toute la réponse, réelle comprise. Si σ ajoute la perte de PIB, la réponse réelle sur l'assiette propre de l'impôt est comptée deux fois : une fois dans θ, une fois via le PIB. Quand σ ≠ 0, θ ne doit garder que la partie non réelle. Exemple, cotisations : la part réelle de θ vaut environ 0,05 ; θ passerait de 0,15 à 0,10.

**Plafond.** Si le chiffre calculé dépasse la valeur haute de Gemini : central = plafond, haut = chiffre calculé, bas = valeur basse de Gemini. Sinon : central = chiffre calculé, haut = plafond.

## 2. Chiffres

Montée en charge : 5 ans (IS : 7 ans, délai de 1 an), comme dans la revue Gemini. Signes donnés pour une **baisse**. « Par point de PIB » = par 1 % du PIB de coût statique.

| Levier | Calcul | Chiffre calculé (e_L 0,10–0,30) | Plafond Gemini | Proposé bas / central / haut | Par point de PIB (central) |
|---|---|---|---|---|---|
| Cotisations patronales, −1 pt | Δ ln(1−T) = 0,01 / 1,364 = 0,73 % | +0,14 % du PIB (0,07–0,22) | +0,10 (0,35 par point de PIB, n° 3) | 0 / **+0,10** / +0,14 | 0,35 |
| CSG, −1 pt | Δ ln(1−T) ≈ 1,36 % (part déductible de l'IR au taux marginal de 30 %, pondérée 74 / 26) | +0,26 % du PIB (0,14–0,41) | aucun (non couvert) | +0,14 / **+0,26** / +0,41 | 0,46 |
| IS, −1 pt | 0,18 × 0,5 × 0,33 % | +0,03 % du PIB | +0,15 (n° 4) | 0 / **+0,03** / +0,15 | 0,40 |
| TVA taux normal, −1 pt | Δ ln(1−T) ≈ 7,5 / 1 600 = 0,47 % du prix de la consommation (consommation des ménages ≈ 1 600 Md€, de mémoire) | +0,09 % du PIB (0,05–0,14) | 0 / −0,20 pour une hausse (n° 6) | 0 / **+0,09** / +0,14 | 0,36 |
| IR, −1 % du produit | dépend du taux marginal moyen pondéré par les revenus (non sourcé) | voir ci-dessous | +1,20 par point de PIB, taux supérieur seulement (n° 5) | **en attente** | — |

**Conséquence budgétaire, ordre de grandeur.** Pour cotisations et CSG, la perte de PIB d'une hausse coûte à long terme environ un quart du rendement statique (PIB × taux de prélèvement sur la production marginale ≈ 0,48). C'est l'arithmétique de Laffer aux taux français, sans dépasser le sommet.

**TVA.** Le 17 novembre, la décision était central 0, bas −0,10 par point de hausse. La méthode donne −0,09 par point de hausse au centre. Pour être cohérent, le central devrait passer à −0,09 (et le bas rester vers −0,14), sinon la TVA serait le seul impôt traité autrement. TVA tous taux : même calcul à l'échelle du rendement (11,4 / 7,5).

**IR.** Le levier multiplie tout le barème (« % du produit »). Comme l'IR est progressif, le taux marginal moyen (environ 25 % pondéré par les revenus, de mémoire) est bien supérieur au taux moyen (environ 10 %). Avec 25 %, le calcul donne environ +0,08 % du PIB par 1 % du produit, soit deux fois et demie le rendement statique (1 Md€) : une hausse uniforme de l'IR ne rapporterait presque rien à long terme. C'est trop fort pour être retenu sur un taux non sourcé (`comp.tau0.ir` est « à collecter »). Il faut d'abord le taux marginal moyen pondéré par les revenus (Insee, IPP ou DG Trésor). En attendant, IR à 0.

## 3. Décisions demandées

1. Méthode (coin fiscal × e_L ; coût d'usage pour l'IS), avec e_L = 0,19 du CBO.
2. Règle du plafond (central = plafond quand le calcul le dépasse ; haut = calcul).
3. θ réduit à sa partie non réelle quand σ ≠ 0.
4. TVA alignée sur la méthode (central −0,09 par point de hausse) ou maintenue à 0.
5. IR : en attente du taux marginal moyen ; σ = 0 d'ici là.

## Sources

- CBO, *Dynamic Scoring at CBO* (présentation) : élasticité totale 0,19 (substitution 0,24, revenu −0,05).
- CBO, mise à jour de la revue de 1996 sur l'offre de travail (publication 43675) : pas d'élasticité nettement plus forte du travail des hauts revenus.
- OCDE, *Taxing Wages 2026*, tableaux 3.6 et 3.7 (dans `params.js`).
- Rendements par point : `params.js` (DG Trésor pour la TVA, FIPECO pour la CSG, proxys pour cotisations et IS).
- Revue Gemini v2.0 : `docs/review-supply-effects-gemini.md`.
