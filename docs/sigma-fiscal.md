# Effets d'offre des leviers fiscaux : méthode et chiffres proposés (v2)

**Statut : approuvé par Patrick le 18 novembre 2026 (décisions en section 6). Mis en œuvre dans le moteur (branche `engine/tax-sigma`) : σ calculé dans `src/engine/supply.js`, θ réduit à sa part non réelle dans `src/engine/levers.js`.** Décision de Patrick du 17 novembre : σ central non nul pour les leviers fiscaux, tiré de la part « activité réelle » de la réponse comportementale.

**v2 (18 novembre) :** e_L relevé de 0,19 à 0,40 (preuves des économies à prélèvements élevés, section 2) ; τ, z et α vérifiés (section 3) ; section 5 sur Laffer ; plafond Gemini abandonné pour les impôts larges sur le travail, gardé pour l'IS (à décider).

## 1. Méthode

**Principe.** Une baisse d'impôt déplace deux choses : les assiettes déclarées (optimisation, déplacement de revenus, calendrier) et l'activité réelle (heures, emploi, investissement). Seule la seconde change le PIB. σ mesure cette seconde partie.

**Impôts sur le travail (cotisations patronales, CSG, IR, TVA).** Ce qui compte pour l'offre de travail est le coin fiscal total, `1 − T` (ce que le salarié peut consommer par euro de coût du travail) :

`σ = e_L × |Δ ln(1 − T)|` (en % du PIB par unité de levier)

À long terme, le capital s'ajuste (K/Y constant) : le PIB varie comme le travail.

**IS.** Canal du coût d'usage du capital : `σ = α × ε_K × |Δc/c|`, avec `Δc/c = Δτ × (1/(1 − τ) − z/(1 − τz))`.

**Pas de double compte.** Quand σ ≠ 0, θ ne garde que la partie non réelle de la réponse (déplacements, calendrier). Sinon la réponse réelle sur l'assiette propre est comptée deux fois.

## 2. e_L : les économies à prélèvements élevés

La v1 prenait 0,19 du CBO : élasticité totale (non compensée), États-Unis. Deux raisons de la relever :

- **Élasticité compensée.** Notre convention (budget bouclé par une variable forfaitaire) appelle l'élasticité compensée (hicksienne), pas l'élasticité totale. Le CBO : substitution 0,24, revenu −0,05.
- **Les comparaisons dans le temps et entre pays riches donnent plus.**
  - Chetty, Guren, Manoli & Weber (2011, *AER P&P*) : élasticité hicksienne des heures agrégées 0,56 (micro) et 0,51 (macro) ; recommandation 0,3 (marge intensive) + 0,25 (marge extensive). Les estimations micro et macro concordent pour l'élasticité de long terme utile aux comparaisons entre pays.
  - Davis & Henrekson (2004) : dans les pays riches au milieu des années 1990, un écart de prélèvements de 12,8 points (un écart-type) va avec 122 heures de travail marchand en moins par adulte et par an et un taux d'emploi plus bas de 4,9 points. Élasticité implicite **0,34 à 0,44** (mon calcul, avec 1 200 à 1 400 heures par adulte et un coin moyen de 45 % à 50 %).
  - Ohanian, Raffo & Rogerson (2008) : 21 pays de l'OCDE, 1956–2004 ; les prélèvements expliquent une grande partie des écarts d'heures travaillées dans le temps et entre pays.
  - Prescott (2004) : au début des années 1970, les Français travaillaient plus que les Américains ; les écarts de fiscalité expliqueraient presque tout l'écart actuel (modèle calibré, élasticité élevée). Contestée : Alesina, Glaeser & Sacerdote (2005) jugent que la littérature micro n'en explique qu'une petite partie et mettent en avant syndicats et réglementation.
  - Keane & Rogerson (2012, *JEL* ; 2015) : les petites élasticités micro sont compatibles avec de grandes élasticités agrégées (capital humain, marge extensive).
- **Proposition : e_L central 0,40, fourchette 0,20 / 0,55.** Le bas reste au-dessus du 0,19 du CBO (élasticité compensée) ; le haut est le chiffre hicksien de Chetty et al. Une estimation française reste à trouver.

## 3. τ, z, α vérifiés

| Paramètre | v1 | Vérifié | Source |
|---|---|---|---|
| τ (IS) | 25 % | 25 % taux normal ; 25,8 % avec la contribution sociale de 3,3 % (grandes entreprises) ; 36,1 % pour les entreprises de plus de 3 Md€ de chiffre d'affaires tant que dure la contribution exceptionnelle (prorogée par la LFI 2026 pour les deux premiers exercices clos à compter du 31 décembre 2025). Retenu : 25,8 % hors contribution exceptionnelle, temporaire | BOFiP, 12 août 2026 ; Legifiscal |
| z (valeur actuelle des amortissements) | 0,8 (de mémoire) | **0,742** (moyenne pondérée France 2025 : bâtiments 54,8 %, machines 88,0 %, incorporels 87,0 % ; actualisation 7,5 %) | Tax Foundation, *Capital Allowances in Europe 2025* |
| Δc/c par point | 0,33 % | **0,43 %** | calcul |
| α (part du capital des sociétés dans le PIB, brute) | 0,18 (de mémoire) | entre **0,16** (SNF seules ; mon estimation : taux de marge 31,4 % appliqué à leur valeur ajoutée) et **0,21** (EBE et revenu mixte des sociétés et entrepreneurs non financiers, 630,4 Md€ en 2025, sur PIB 2 991) ; 0,18 retenu | Insee, comptes nationaux 2025 |
| ε_K | 0,5 (de mémoire) | fourchette **0,25–1,0**, centre 0,5 choisi : 0,25 (Chirinko, Fazzari et Meyer 1999, États-Unis) et au plus 0,26 (Chatelain et Tiomo 2002, France 1990–1999, seule estimation française lue) avec des modèles à retards échelonnés ; ≈ 1 (Dwenger 2014, Allemagne ; Millar et Coulibaly 2010) en correction d'erreur ; 0,40 (panel long de Chirinko et al.) | résumés lus, 18 nov. 2026 |

## 4. Chiffres (e_L = 0,40 ; fourchette e_L 0,20–0,55)

Signes pour une **baisse**. « Par point de PIB » = par 1 % du PIB de coût statique.

| Levier | Δ ln(1−T) ou Δc/c | σ bas / central / haut (% du PIB) | Par point de PIB (central) | Plafond Gemini |
|---|---|---|---|---|
| Cotisations patronales, −1 pt | 0,73 % | 0,15 / **0,29** / 0,40 | 1,05 | 0,35 par point de PIB (n° 3, données CICE) |
| CSG, −1 pt | 1,36 % | 0,27 / **0,54** / 0,75 | 0,97 | aucun |
| TVA taux normal, −1 pt | 0,49 % | 0,10 / **0,19** / 0,27 | 0,79 | voir n° 6 |
| IS, −1 pt | 0,43 % | 0,02 / **0,04** / 0,09 | 0,52 | 0,15 par point (n° 4) |
| IR, −1 % du produit | dépend du taux marginal moyen pondéré | **en attente** | — | — |

**Plafond.** Le plafond Gemini des cotisations vient de l'évaluation du CICE : peu d'emplois en deux ou trois ans, une moitié de la baisse passée en salaires. Cela mesure la demande de travail à court terme, pas l'offre à long terme : des salaires nets plus hauts sont justement le canal d'offre. Proposition : pas de plafond Gemini pour les impôts larges sur le travail ; plafond maintenu pour l'IS (méta-analyse de Gechert & Heimberger, 2022). À décider.

**IR.** Avec e_L = 0,40 et un taux marginal moyen de 25 % (de mémoire), une hausse uniforme de l'IR perdrait de l'argent à long terme : le levier multiplie tout le barème, les taux marginaux montent beaucoup plus que le rendement. Résultat trop fort pour un taux non sourcé : IR à 0 en attendant le taux marginal moyen pondéré par les revenus (Insee, IPP ou DG Trésor).

## 5. Laffer : où est le sommet pour les impôts sur le travail ?

Dans le cas simple d'un coin uniforme `T` sur le travail, la recette est maximale pour `T* = 1/(1 + e_L)`, et une hausse marginale perd à long terme la part `e_L × T/(1 − T)` de son rendement statique.

| e_L | T* | Perte à long terme, T = 58,2 % (coin marginal OCDE, sans TVA) | Perte, T ≈ 65 % (avec impôts sur la consommation, mon calcul) |
|---|---|---|---|
| 0,19 (v1) | 84 % | 26 % | 36 % |
| 0,40 (proposé) | 71 % | 56 % | 75 % |
| 0,55 (haut) | 65 % | 77 % | 103 % |

- **Avec e_L = 0,40, la France est près du sommet sans le dépasser** pour le salarié moyen : une hausse des impôts sur le travail ne rapporte à long terme qu'un quart à moitié de son rendement statique ; une baisse se finance pour moitié à trois quarts. Cohérent avec Trabandt & Uhlig (2011) : dans l'UE-14, 54 % d'une baisse des impôts sur le travail s'autofinance ; avec capital humain, les États-Unis et l'UE-14 sont près du sommet.
- **Dépasser le sommet demande e_L > 0,53** (coin avec TVA) **ou > 0,72** (sans) : dans le haut de la fourchette, pas au centre.
- **Exceptions où le sommet peut être dépassé :**
  - cotisations patronales au niveau du Smic : le salaire ne peut pas baisser, c'est l'élasticité de la demande de travail (0,5 à 0,9 selon la revue Gemini, n° 2) qui joue ; d'où un levier « allègements » distinct à prévoir ;
  - assiettes étroites et mobiles (dividendes, hauts revenus, patrimoine) : fortes réponses, surtout de déplacement. Exemples : le coût du PFU est très fortement réduit par la hausse induite des dividendes (comité d'évaluation, France Stratégie) ; le plafonnement de l'ISF a coûté environ 2 Md€, le double du coût statique (IPP).
- **« Les hausses rapportent moins que prévu » ne prouve pas le dépassement du sommet.** En 2013, les impôts devaient rapporter 28,3 Md€ de plus qu'en 2012 ; ils ont rapporté 15,6 Md€ de plus. La Cour des comptes l'attribue à une croissance plus faible et à des hypothèses d'élasticité des recettes trop optimistes. Moins que prévu, mais toujours plus. De même, la baisse du taux d'IS de 33,3 % à 25 % (2016–2022) s'est accompagnée d'une hausse de l'IS brut de 31 %, mais le bénéfice imposable a crû de 71 %, porté en partie par des résultats exceptionnels et financiers (Insee) : on ne peut pas attribuer cette hausse à la baisse du taux.

## 6. Décisions de Patrick (18 novembre 2026)

1. **Méthode approuvée** (coin fiscal × e_L ; coût d'usage pour l'IS), avec **e_L = 0,40** (fourchette 0,20–0,55).
2. **Pas de plafond Gemini** pour les impôts larges sur le travail (cotisations, CSG, TVA, IR). Le plafond de l'IS ne mord pas (0,04 contre 0,15).
3. **θ réduit à sa partie non réelle** quand σ ≠ 0 : θ_non réel = max(0, θ − θ_réel), où θ_réel est la perte de recette propre due à la baisse du PIB, rapportée au rendement statique.
4. **TVA alignée sur la méthode** : central −0,19 % du PIB par point de hausse (bas −0,27, haut −0,10 ; consommation des ménages Insee 2025, 1 545,9 Md€) ; tous taux à l'échelle du rendement.
5. **IR** : taux marginal moyen pondéré par les revenus **21 %** du revenu imposable (calculé, fourchette 18–23 %, voir section 7), soit environ 16 % du salaire brut ; σ activé avec la même méthode ; résultat marqué « non validé — avis demandé » et inscrit parmi les questions aux relecteurs.
6. Levier « allègements généraux » (bas salaires, élasticité de la demande) et cotisations au niveau du Smic : reportés après le Day 0.

## 7. Taux marginal moyen de l'IR (calcul du 18 novembre)

DGFiP (impôt 2026 sur les revenus 2025) : foyers et impôt moyen par taux marginal — 0 % : 13,1 M (−45 €) ; 11 % : 20,9 M (605 €) ; 30 % : 6,9 M (7 114 €) ; 41 % : 434 112 (40 983 €) ; 45 % : 61 476 (203 999 €). La DGFiP ne publie pas le revenu par tranche : je l'estime à partir de l'impôt moyen, avec des nombres de parts supposés (1,7 à 2,5), soit environ 1 290 Md€ au total. Taux marginal moyen pondéré par les revenus : environ 20 % au barème ; 21–22 % avec la décote (barème réel d'un célibataire : 16 % entre 17 062 et 29 315 €, FIPECO). Conversion en salaire brut (abattement de 10 %, CSG déductible) : × 0,76 environ. Point faible : les nombres de parts ; à resserrer avec les tableaux DGFiP.

**Mise à jour du 25 nov. 2026 (décision de Patrick) : σ de l'IR calculé tranche par tranche.** Les effectifs ci-dessus portent en fait sur les revenus 2024 (tableur DGFiP `nid_25519_ir_taux_marginal.xlsx`, feuille 2024, lu directement), qui donne aussi l'impôt net par tranche : 12,66 / 48,86 / 17,79 / 12,54 Md€. Les revenus par tranche sont estimés par inversion du barème (parts 1,5 / 2,0 / 1,8 / 1,8 ; 5 Md€ d'impôt hors barème et de CEHR retirés en tranche 45 %) : 476 / 476 / 74 / 22,5 Md€, plus ≈ 96 Md€ à 0 % (total 1 144 Md€, taux marginal moyen implicite 20,6 %). Le levier étant proportionnel, +1 % du produit relève chaque taux de 0,01 × τ_i ; σ = −100 × e_L × Σ_i (Z_i / Z) × 0,01 × τ_i × (1 − 6,8 %) / (1 − w_i), avec le coin complet w_i = 9,7 % + 0,932 × τ_i (+ CEHR 3 % à 45 %) : 20,0 / 37,7 / 47,9 / 54,6 %. Résultat : **σ = −0,122** (−0,061 / −0,168) % du PIB par point, contre −0,112 (−0,056 / −0,154) avec la moyenne unique (21 % × 0,76 / 0,57) ; seuil de rentabilité e_L ≈ 0,23 (0,25). Le paramètre `offre.ir.conv_brut` est supprimé. Code : `src/engine/ir-tranches.js` ; mêmes données que la dérivation de θ (`docs/review-day0-parameters.md` §9).

Conséquence : l'IR net (92,6 Md€ en 2025) vaut environ 7 % du revenu, pour un taux marginal de 21 % ; multiplier tout le barème augmente les taux marginaux trois fois plus vite que la recette. Avec e_L = 0,40, une hausse uniforme de l'IR perd de l'argent à long terme (même en excluant les pensions, environ 26 % des revenus déclarés) ; avec e_L = 0,20, elle garde 20 % à 40 % de son rendement statique.

## Sources

- CBO, *Dynamic Scoring at CBO* : élasticité totale 0,19 (substitution 0,24, revenu −0,05).
- Chetty, Guren, Manoli & Weber (2011), *AER* 101(3), 471–475.
- Davis & Henrekson (2004), NBER WP 10509.
- Ohanian, Raffo & Rogerson (2008), *Journal of Monetary Economics* 55(8), 1353–1362.
- Prescott (2004), FRB Minneapolis *Quarterly Review* 28(1) ; Alesina, Glaeser & Sacerdote (2005), *NBER Macroeconomics Annual*.
- Keane & Rogerson (2012), *JEL* 50(2), 464–476 ; (2015), *Annual Review of Economics* 7, 89–117.
- Trabandt & Uhlig (2011), *Journal of Monetary Economics* 58(4), 305–327.
- BOFiP, actualité du 12 août 2026 (contribution exceptionnelle) ; Legifiscal (taux global).
- Tax Foundation, *Capital Allowances in Europe 2025*.
- Insee, comptes nationaux 2025 (taux de marge des SNF ; compte des sociétés et entrepreneurs non financiers) ; Insee Analyses sur la réforme du taux d'IS.
- Cour des comptes, exécution du budget 2013 (via MoneyVox) ; comité d'évaluation des réformes de la fiscalité du capital (France Stratégie).
- OCDE, *Taxing Wages 2026* (dans `params.js`).
- DGFiP, statistiques de l'impôt 2026 (via MoneyVox) ; FIPECO, fiche IR-CSG ; Vie-publique, IR 2025.
