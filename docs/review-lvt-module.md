# Intégrer LVTShift au simulateur budgétaire : module « taxe sur la valeur du sol »

**En bref.** Day 0 sous condition (portillon au 30 novembre), en forme minimale : module non validé, `a` = 0 dans chaque bloc, `yS` central = 0, flux bruts affichés ; sinon janvier 2027. Le bloc local n'a pas besoin de leviers mais doit recevoir des sorties de module (D9 à reformuler). Aucune estimation d'effet sur le PIB français n'a été trouvée ; seul repère chiffré, l'OCDE, donne 0 à +1,1 % de PIB en borne haute (S3 avec IFI) et ne résiste pas aux tests de robustesse. Effort : ≈ 9 jours-personne, dont ≈ 4,5 propres au module.


Note d'évaluation, 17 novembre 2026. Rédigée pour Patrick. Aucun code n'est écrit ; la note recommande une voie et chiffre l'effort.

Conventions : montants en Md€ courants sauf mention ; « non trouvé » : valeur cherchée sans succès ; « LVTShift » : dépôt `alles-delenda-est/LVTShift`, état du 12 novembre 2026 (fusion de la PR #69), lu en clone local sans exécuter son code. Les notes de recherche de LVTShift (`dynamic-effects.md`, `yields-2026.md`) sont citées comme telles : leurs références primaires n'ont pas toutes été relues ici ; ce qui l'a été est signalé « relu ».

## 1. Ce que LVTShift calcule aujourd'hui

### 1.1 Nature de l'outil

LVTShift est un fork de l'outil américain LVTShift (Center for Land Economics). Le code français est dans `lvtshift-fr/` : un pipeline Python (`ingest.py`, `estimate.py`, `run_pipeline.py`, `export_web.py`, `yields.py`) et un site statique (Next.js, export statique sur Vercel, CSP `connect-src 'self'` : aucune API, tout est précalculé en JSON dans `lvtshift-fr/site/public/data/`).

Le pipeline simule, **commune par commune et parcelle par parcelle**, le passage de la taxe foncière sur les propriétés bâties (TFPB) d'une assiette « terrain + bâti » à une assiette terrain seul (taux « split-rate » 4:1), **à produit constant dans chaque commune** (neutralité vérifiée à 1 % près). Il ne s'agit pas d'un modèle macro-budgétaire : c'est un modèle de répartition (qui paie plus, qui paie moins).

### 1.2 Entrées

| Donnée | Source | Rôle |
|---|---|---|
| Transactions | DVF géolocalisé (Etalab) | valeur de marché (modèle hédonique), indexée Notaires-INSEE |
| Parcelles, bâtiments | Cadastre Etalab, BD TOPO (IGN) | surfaces, niveaux, usage |
| Âge du bâti | DPE (ADEME) | dépréciation du bâti |
| Produit de la taxe | REI (DGFiP) via OFGL | cible de neutralité par commune |
| Revenus | Filosofi IRIS (INSEE) | quintiles de revenu |
| Zonage | GPU `zone_urba` | constructible / agricole-naturel |
| Prix du foncier | DVF terrains à bâtir, SAFER, EPTB (SDES) | terrain non bâti |
| Logement social, foncier public | RPLS (SDES), fichiers DGFiP des personnes morales | exonérations |
| Base foncière nationale | INSEE, patrimoine national 2025 provisoire | contrôle descendant et taux indicatifs |

La valeur du terrain est **imputée** (méthode résiduelle : marché − coût de remplacement déprécié du bâti, part terrain bornée à [15 %, 85 %]), faute d'accès aux Fichiers fonciers. C'est le maillon faible assumé par ses auteurs.

### 1.3 Sorties

- Par commune ou territoire (13 entrées dans `index.json` au 12 novembre : Paris, Lyon, Grenoble, Annemasse, Villeurbanne, Roubaix, Cahors, Montreuil, Figeac, Sète, La Rochelle, petite couronne, etc. ; la spec vise un panel de 188 communes) : `headline` (produit neutre, montant déplacé brut et net, part terrain), ventilation par catégorie de bien, par quintile de revenu IRIS, par ratio terrain/bâti, avec bande de sensibilité ±10 points de part terrain.
- `yields.json` (produit par `yields.py`) : tableau des impôts à remplacer, par scénario, avec année, source, URL, statut (`verified` / `derived` / `reported`), et pour chaque variante le total, la ventilation par niveau (local, départemental, national) et un **taux moyen indicatif** en % de la valeur foncière imposable (6 122 Md€ en 2025, INSEE).
- Page « Scénarios » : graphique des rendements à remplacer.

Résultats `yields.json`, référence 2025 en euros 2025 :

| Variante | Total | Local | Départemental | National | Taux indicatif |
|---|---|---|---|---|---|
| S1 | 67,2 Md€ | 50,5 | 14,9 | 1,8 | 1,10 % |
| S2 sans IFI | 71,1 | 50,5 | 14,9 | 5,8 | 1,16 % |
| S2 avec IFI | 73,5 | 50,5 | 14,9 | 8,1 | 1,20 % |
| S3 sans IFI | 79,4 | 50,5 | 14,9 | 14,1 | 1,30 % |
| S3 avec IFI | 81,8 | 50,5 | 14,9 | 16,4 | 1,34 % |

Le « niveau national » de S1 (1,8 Md€) est constitué des frais de gestion que l'État prélève sur l'avis de taxe foncière (3 %, CGI art. 1641), sur la taxe d'habitation des résidences secondaires et sur les DMTO (2,37 % en sus des droits départementaux, art. 1647 V). Ces lignes sont comptées comme recettes de l'État à remplacer.

### 1.4 État d'avancement (ce qui est réellement calculé)

La spec 0005 (trois scénarios à rendement égal) est en statut « Draft » ; les décisions D1 à D8 sont prises. Dans le dépôt :

- **Fait :** le tableau des rendements (`yields.py`, S1 à S3 avec IFI optionnel), les taux nationaux indicatifs, le modèle communal TFPB (+ TFPNB non agricole remplacée, PR #69), la page « Scénarios ».
- **Pas fait (phasage de la spec, PR 2 à 6) :** attribution du DMTO aux parcelles (DVF), niveau départemental, capitalisation indicative, niveau national par parcelle (IFI, plus-values, revenus locatifs), répartition par statut d'occupation, sélecteur de scénario sur tout le site. Plusieurs de ces étapes exigent un accès réseau (data.gouv, IGN, INSEE, OFGL) et tournent sur la machine de Patrick.

Donc, aujourd'hui, le panel complet des 188 communes et les scénarios S2 et S3 au niveau des parcelles n'existent pas ; seuls existent les rendements agrégés et le modèle communal S1 partiel.

### 1.5 Effets comportementaux ou de PIB : rien de chiffré

LVTShift ne produit **aucun effet comportemental ni de PIB**. C'est un choix explicite : « rendement égal » signifie à assiettes d'aujourd'hui ; les effets dynamiques sont « signalés, pas modélisés » (spec 0005 §4.6), et la spec renvoie leur quantification au simulateur budgétaire (« Quantifying them belongs to the budget simulator, using its elasticities »).

Ce que LVTShift fournit à la place :
- une note de recherche, `docs/research/dynamic-effects.md` (26 octobre 2026, relue par Gemini le 27), qui classe six effets (transactions et mobilité ; construction ; loyers ; prix du foncier et capitalisation ; PIB de long terme ; effets de répartition) avec direction, mécanisme, fourchette quand la littérature en donne une, et niveau de crédibilité (fort / modéré / faible) ;
- une capitalisation **indicative** statique : variation de valeur foncière = −Δ / r, avec r de 3 % et 4 % réel, capitalisation de 100 % en central et 60 % en sensibilité.

La section 4 de la présente note reprend les preuves.

## 2. Recettes touchées par chaque scénario, par bloc

### 2.1 Scénarios et blocs du simulateur

| Scénario | Remplace | Blocs concernés |
|---|---|---|
| S1 | taxe foncière (TFPB, TFPNB non agricole) + taxe d'habitation sur résidences secondaires + DMTO | locales (APUL) pour l'essentiel ; centrales pour les frais de gestion et d'assiette que l'État ajoute à l'avis (≈ 1,8 Md€) |
| S2 | S1 + IR/PS sur plus-values immobilières des particuliers, IFI en option | + centrales (IR, IFI, part État des PS) ; + sécurité sociale (part CSG/CRDS des PS) |
| S3 | S2 + IR/PS/CSG sur revenus locatifs | + centrales ; + sécurité sociale (CSG, part des PS) |

Point à trancher, absent de la spec 0005 : à qui revient le produit de la taxe nationale de S2 et S3 ? Si elle va au budget de l'État, la sécurité sociale perd la part CSG/CRDS des prélèvements sociaux (≈ 3 Md€ en S3, calcul ci-dessous) : il faut soit une affectation d'une fraction de la taxe à la sécurité sociale (effet nul par bloc), soit une recette de remplacement de l'État (effet −x en sécurité sociale, +x en centrales, nul au total). La spec D2 les inclut « sur une ligne séparée ». C'est précisément ce que le contrat de module (`a` par bloc) permet de porter.

### 2.2 Rendements, bloc par bloc

Légende : **relu** = lu dans la source officielle ce jour ; **LVTShift** = repris de `yields.py` / `yields.json` (sources et URL indiquées par LVTShift, non relues ici). Le PIB 2025 retenu pour les ratios est 2 991 Md€ (note de modèle §1.1).

| Impôt | Bloc APU | Rendement | Source (URL) | Statut |
|---|---|---|---|---|
| TFPB, communes et EPCI | locales | **43,1 Md€ en 2025** (≈ 1,44 % du PIB) | DGCL, BIS n° 209, « La fiscalité directe locale en 2025 », cité par Maire-info le 12 mai 2026 : https://www.maire-info.com/finances-locales/apres-des-annees-de-hausse-le-produit-de-la-fiscalite-directe-locale-s'est-stabilise-en-2025-article-30783 (le BIS lui-même n'a pas été relu) | relu (secondaire) |
| TFPB, même périmètre | locales | 42,8 Md€ en 2025 (40,2 communes et EPCI + 2,6 « montant réel » ; écart de 0,3 Md€ avec le BIS, non expliqué) | REI 2025 via OFGL : https://data.ofgl.fr/explore/dataset/rei/ | LVTShift |
| TFPNB, non agricole | locales | 0,27 Md€ en 2025 (1,19 Md€ au total ; 0,92 agricole et naturel, hors réforme) ; le BIS 209 donne seulement une baisse de plus de 8 % en 2025 | REI 2025 via OFGL (même URL) | LVTShift (part non agricole reconstituée, statut « derived ») |
| Syndicats, TSE, GEMAPI, TASA (sur l'avis de taxe foncière) | locales (établissements publics locaux) | ≈ 0,92 Md€ en 2025 | REI 2025 via OFGL | LVTShift |
| Taxe d'habitation, résidences secondaires | locales | 2,97 Md€ en 2025 (3,69 en 2024 ; baisse de 19 % non expliquée) | REI via OFGL | LVTShift |
| Total fiscalité directe locale | locales | 68,6 Md€ en 2025 ; 115,6 Md€ avec les fractions de TVA transférées (donc ≈ 47 Md€ de TVA affectée aux collectivités, calcul) | BIS 209, même URL Maire-info | relu (secondaire) |
| DMTO, part départementale | locales (départements) | 13,0 Md€ en 2023 (BIS 190) ; rebond de 17 à 18 % en 2025 après deux années de baisse (Localtis, 3 sept. 2026) ; montant 2025 en Md€ : **non trouvé** en source officielle relue. LVTShift retient 13,5 Md€ pour 2025 (OFGL, hors part communale de Paris), 11,3 en 2024, 16,8 en 2022 | https://collectivites-locales.gouv.fr/files/Accueil/DESL/2024/BIS_190_DMTO.pdf ; https://www.banquedesterritoires.fr/budgets-des-clignotants-au-vert-pour-les-departements ; https://data.ofgl.fr/explore/dataset/ofgl-base-departements/ | 2023 relu ; 2025 LVTShift |
| DMTO, part communale | locales (communes) | 3,1 Md€ en 2023 (taxe additionnelle + fonds départemental pour les communes de moins de 5 000 habitants) ; 3,2 Md€ en 2025 chez LVTShift | BIS 190 (URL ci-dessus) ; https://data.ofgl.fr/explore/dataset/grand-livre/ | 2023 relu ; 2025 LVTShift |
| Frais de gestion et d'assiette sur TF, THRS et DMTO (taux de 3 %, 8 %, 9 % et 2,37 %) | centrales (État) | ≈ 1,8 Md€ | CGI art. 1641 et 1647 V : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053546093 ; https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000054373998 | LVTShift (calcul) |
| IFI | centrales (État) | **2,3 Md€ en 2025** (≈ 0,08 % du PIB), 193 600 foyers ; ≈ 2,1 en 2024 (calcul : +8 %) | DGFiP, Statistiques n° 45, 14 avril 2026 : https://www.impots.gouv.fr/dgfip-statistiques-limpot-sur-la-fortune-immobiliere-en-2025 | relu |
| IFI, recettes budgétaires | centrales | 2,74 Md€ en 2024, 2,77 en 2025 (restes à recouvrer et contrôle fiscal compris) | même page, selon LVTShift | LVTShift |
| Plus-values immobilières des particuliers, IR et PS | IR : centrales ; PS : voir 2.3 | **2,8 Md€ en 2024**, 3,6 Md€ en 2023 (3,7 dans l'introduction de la page), moyenne de 3,5 Md€ sur 2017–2023. Décomposition 2024 (LVTShift) : IR 0,91 + PS 1,92 | Cour des comptes, 25 nov. 2025 : https://www.ccomptes.fr/fr/publications/limposition-des-plus-values-immobilieres-des-particuliers | total relu ; décomposition LVTShift |
| Revenus locatifs des particuliers (logement) | IR : centrales ; CSG/PS : voir 2.3 | 2022 : IR 4,2 Md€, PS 2,4, CSG 1,1 (somme PS + CSG = 3,5, seule fiable). Compte du logement 2024 : 8,9 Md€ pour l'ensemble des impositions sur revenus immobiliers, y compris IS (0,5) et CRL (0,1), sans détail | CPO, déc. 2023 : https://www.vie-publique.fr/files/rapport/pdf/292676.pdf | LVTShift (non relu ; **donnée 2022, pas 2024**) |
| IS sur plus-values et loyers des sociétés ; locations meublées (BIC) | centrales | non trouvé | | décisions D3 et D7 de LVTShift : exclus |

### 2.3 Prélèvements sociaux : qui reçoit quoi

Les prélèvements sociaux sur revenus du capital sont de 17,2 %. LVTShift note que 7,5 points (prélèvement de solidarité) sont versés à l'État ; le reste (9,7 points, soit CSG 9,2 et CRDS 0,5, calcul par différence, à confirmer sur le texte) va à la sécurité sociale (CNAF, CNAM, FSV, CNSA) et à la Cades. En appliquant cette clé de 7,5/17,2 (43,6 %) aux montants ci-dessus (calcul, ordre de grandeur) :

| | Total PS (+ CSG) | État | Sécurité sociale (et Cades) |
|---|---|---|---|
| Plus-values, 2024 | 1,9 Md€ | ≈ 0,8 | ≈ 1,1 |
| Revenus locatifs, 2022 | 3,5 Md€ | ≈ 1,5 | ≈ 2,0 |
| Total S2 + S3 | 5,4 Md€ | ≈ 2,3 | ≈ 3,1 (≈ 0,10 % du PIB) |

C'est l'ordre de grandeur du transfert à régler entre blocs si la taxe nationale est versée à l'État (voir 2.1). La clé suppose que les taux d'affectation sont les mêmes pour les revenus locatifs et pour les plus-values ; LVTShift avertit que le partage PS/CSG du compte du logement suit une convention comptable.

### 2.4 Ce que ça donne en % du PIB

| Variante | Total remplacé | % du PIB 2025 | dont locales | dont centrales | dont sécurité sociale |
|---|---|---|---|---|---|
| S1 | 67,2 Md€ | 2,25 % | 65,4 (hors frais) | ≈ 1,8 | 0 |
| S2 sans IFI | 71,1 | 2,38 % | 65,4 | ≈ 4,4 à 4,7 | ≈ 1,1 à 1,4 |
| S3 sans IFI | 79,4 | 2,66 % | 65,4 | ≈ 10,7 à 11,0 | ≈ 3,1 à 3,4 |
| S3 avec IFI | 81,8 | 2,73 % | 65,4 | ≈ 13,0 à 13,3 | ≈ 3,1 à 3,4 |

(Totaux LVTShift en euros 2025, moyennes quinquennales pour DMTO et plus-values. Bloc local : niveaux local 50,5 + départemental 14,9 de `yields.json`. Bloc sécurité sociale : calcul de cette note par la clé 2.3, appliquée aux moyennes quinquennales ; bloc centrales : total national de LVTShift moins la part sécurité sociale. La fourchette tient à la clé de partage, dont l'hypothèse n'est pas vérifiée.) Pour chaque scénario, la somme est **nulle par construction** : ce qui sort des recettes est remplacé par la taxe sur la valeur du sol.

## 3. Ce dont le cœur du simulateur a besoin

Rappel du contrat (note de modèle §7) : un module fournit `a` par bloc et par année (ex ante, en % du PIB), un coefficient `theta`, une catégorie de multiplicateur, et en option `yS` (bas / central / haut). La décision D9 est : « bloc local affiché, sans levier ».

### 3.1 Le bloc local a-t-il besoin de leviers ?

**Non.** Le module LVT apporte ses propres leviers (scénario S1/S2/S3, option IFI ; éventuellement une part de remplacement entre 0 et 100 %). Il n'y a aucun levier de dépense ou de recette locale « natif » à ajouter pour que le module fonctionne.

**Mais le bloc local doit accepter des sorties de module.** « Sans levier » ne doit pas devenir « sans entrée ». Le bloc local doit pouvoir recevoir `a(local, t)` d'un module, l'ajouter à son solde, l'afficher sur une ligne distincte et l'agréger au consolidé. Pour LVT, `a(local, t)` est nul en net, mais le contrat le prévoit en général (un futur module sur la DGF ou sur le plafonnement des dépenses locales en aurait besoin).

### 3.2 Besoins par échéance

| Besoin | Day 0 (10 déc.) | Version plus complète |
|---|---|---|
| Équations E2, E3, E8 indexées par bloc (centrales, sécurité sociale, locales) ; somme au consolidé | **Oui.** Sans cela le contrat `a` par bloc n'a pas de support. Probablement déjà prévu par la note (§1.1) ; à vérifier dans le moteur | oui |
| Entrée `yS` (bas / central / haut) dans E6, E7, E12 | **Oui** : c'est le seul canal budgétaire du module ; sans lui il n'a aucun effet | oui |
| Affichage des **flux bruts** (impôts supprimés, taxe créée, par bloc) sur la ligne du module | **Oui, et c'est une extension du contrat** : `a` ne porte que le net, donc nul. Sans flux bruts, l'utilisateur voit un module « qui ne fait rien ». Champ optionnel `flux[]` : libellé, bloc, montant en % du PIB, **affichage seulement, n'entre pas dans le solde** | oui |
| Recettes locales par impôt (TFPB, DMTO, fractions de TVA, DGF) dans la référence | **Non** : le module porte ses propres montants (sourcés, 2025, 5 ans pour les cycliques) | **Oui** : pour que « impôt supprimé » se lise sur une ligne existante de la référence, et pour contrôler que le module ne retire pas plus que la référence ne contient. La note de modèle indique déjà ce manque (§1.1, « non trouvé » : recettes 2025 par impôt et par bloc). BIS 209 fournit déjà le total : 68,6 Md€ de fiscalité directe, 115,6 avec la TVA affectée |
| Transferts État ↔ locaux : compensations d'exonérations, fractions de TVA, DGF | **Non**, à condition de documenter la limite (voir ci-dessous) | **Oui** si l'on veut modéliser le niveau départemental avec fidélité : depuis 2021 les départements ne perçoivent plus de TFPB mais une fraction de TVA (loi de finances 2020, art. 16, de mémoire, non relue) ; la TVA affectée (≈ 47 Md€) est indexée sur la TVA, pas sur la taxe foncière |
| Dette locale | **Non** : la dette est celle de Maastricht, consolidée ; un module n'écrit jamais dans la dette | Non, sauf à afficher la dette par bloc (hors périmètre du module) |
| Stabilisateurs par bloc | **Non** : ε appliqué au consolidé suffit | Utile : les DMTO sont fortement cycliques (13,0 Md€ en 2023 contre 16,5 en 2021–2022, soit −21 % ; 11,3 en 2024 selon LVTShift), la taxe foncière non ; remplacer l'un par l'autre change la volatilité des recettes locales, effet que le modèle déterministe ne voit pas |
| Règle d'affectation de la taxe nationale (S2, S3) entre État et sécurité sociale | **À trancher** : sans règle, le module ne peut pas remplir `a(sécurité sociale)`. Défaut proposé : affectation d'une fraction égale à la perte de la sécurité sociale (voir 2.3), donc `a` nul dans chaque bloc | oui |

Limite à documenter pour le Day 0 : la part du produit de la taxe foncière payée par l'État en compensation (exonérations, réduction de moitié des valeurs locatives des établissements industriels) est un transfert État → locales. LVTShift l'utilise pour répartir la taxe entre groupes (« compensation WC75 ÷ taux 2020 ») mais ne dit pas si elle est incluse dans les 42,8 Md€ ; il exclut explicitement celle de l'exonération agricole du non bâti (≈ 131 M€). Le total de 67,2 Md€ est donc potentiellement un peu différent du « solde net des collectivités » en comptabilité nationale. Cela ne change pas `a = 0`, mais change l'affichage brut.

### 3.3 Cohérence de base entre les deux outils

- **Année et prix** : le cœur ancre sur 2025 en euros courants ; LVTShift exprime tout en euros 2025 et prend la moyenne de cinq ans pour DMTO et plus-values. Le module doit exposer ses flux en % du PIB 2025, constants (comme E2 le fait pour les leviers), et non en euros.
- **Périmètre comptable** : LVTShift lit des montants de gestion (REI, comptes de gestion OFGL, avis d'imposition DGFiP) ; le cœur raisonne en comptabilité nationale (droits constatés, Insee). Les écarts seront petits pour l'impôt local, plus incertains pour les plus-values et l'IFI (budget contre avis, 2,3 contre 2,8 Md€ pour l'IFI en 2025).
- **Statut « non validé »** : le contrat impose au module à effet dynamique la même validation que le cœur (§7). Les rendements LVTShift ont fait l'objet d'une revue interne (« Gemini », 27 octobre) et d'une vérification par le propriétaire, pas d'une validation par le cœur ; la plupart des chiffres de revenus locatifs sont de 2022.

## 4. L'effet dynamique : ce que la littérature permet de chiffrer

À rendement égal, l'effet budgétaire statique est nul. Tout effet budgétaire passe donc soit par le niveau du PIB (`yS`), soit par l'assiette. Sources : la note `dynamic-effects.md` de LVTShift (26 octobre 2026), dont la plupart des références primaires sont données comme lues dans le résumé ou la page de l'éditeur ; seules les références notées « relu » ont été vérifiées ici (existence de l'étude de Bérard et Trannoy sur le site de l'Insee : https://www.insee.fr/fr/statistiques/3621930 ; DGCL BIS 190 relu pour les DMTO).

### 4.1 Verdict en une phrase

**Il n'existe aucune estimation d'un effet sur le PIB français d'un remplacement de la taxe foncière, des DMTO ou des impôts sur plus-values et loyers par une taxe sur la valeur du sol.** Il existe des preuves partielles sur les canaux (transactions, construction, capitalisation), qui donnent des directions établies et des ordres de grandeur étrangers, non transposables tels quels.

### 4.2 Preuves par canal

| Canal | Direction | Ordre de grandeur disponible | Crédibilité |
|---|---|---|---|
| Transactions et mobilité, retrait des DMTO | hausse | À l'étranger : environ +6 % (Allemagne, Fritzsche et Vandrei 2019) à +14 % (Toronto, Dachis, Duranton et Turner 2012 : −15 % de ventes pour 1,1 point) de ventes par point de taxe retiré. Le taux français sur l'ancien est de 5,8 à 6,3 points : aucune extrapolation linéaire crédible. **France : la hausse de 2014 (3,8 → 4,5 %) n'a eu qu'un effet de calendrier (+26 % le mois précédent, −6 % par mois sur le trimestre) et aucun effet à moyen terme** (Bérard et Trannoy 2018, Économie et Statistique 500-502) | direction forte ; taille étrangère modérée ; France faible |
| Coût de bien-être des DMTO | gain | Toronto : 1 € pour 8 € de recettes ; modèle d'Helsinki (Määttänen et Terviö 2022) : 12 à 15 % des recettes à un taux de 2 %, croissant avec le taux. Appliqué aux ≈ 16 Md€ de DMTO : ≈ 2 Md€ par an, soit ≈ 0,07 % du PIB (calcul de LVTShift ; c'est du bien-être, pas du PIB ; borne basse proche de zéro d'après 2014) | faible pour la France |
| Construction et intensité d'usage du sol | hausse modeste | Finlande (Lyytikäinen 2009) : environ +12 % de mises en chantier de maisons avec une surtaxe sur terrains non bâtis ; Pennsylvanie : +2 à +10 points de croissance de logements par décennie selon le modèle (Banzhaf et Lavery 2010) ; Nouvelle-Zélande (Gemmell et al. 2019) : peu d'effet. Élasticité de l'offre de logement en France : 0,25 à 0,5 (Chapelle, Eyméoud et Wolf 2023), contre 1,75 aux États-Unis : réponse française probablement plus faible | direction modérée ; taille faible |
| Loyers | ≈ 0 à court terme ; légère baisse possible à long terme | Report de la fiscalité foncière sur les loyers à l'étranger : 14 % (New York) à 100 % (Allemagne, où la taxe est légalement récupérable, ce qui ne vaut pas pour la TFPB). Aucune estimation française pour des impôts sur le revenu des bailleurs. Fourchette retenue par LVTShift pour les impôts supprimés sur loyers : 0,1 (0 à 0,2) les années 1 à 3, 0,5 (0,25 à 0,75) à long terme | théorie forte ; taille faible |
| Capitalisation dans les prix | transfert entre propriétaires | 60 à 100 % de la valeur actuelle de la variation de taxe récurrente (Palmon et Smith 1998 : 62 % ; Høj et al. 2018 : capitalisation complète au Danemark). France : réforme de la taxe d'habitation, +50 €/m² par point de TH sur revenu (IPP 2023), capitalisation partielle | forte (taxe récurrente) ; modérée (France) |
| PIB de long terme | hausse petite | Seul repère chiffré : OCDE (Arnold et al. 2011, Economic Journal 121), cité par O'Connor et al. 2016 : transférer 1 % des recettes fiscales des impôts sur le revenu vers la consommation et le patrimoine immobilier augmente le PIB par habitant de 0,25 à 1 % à long terme. **Ne s'applique pas à S1** (échange entre impôts fonciers) et **ne résiste pas aux tests de robustesse** (Xing 2012 ; Baiardi et al. 2019) | faible |

### 4.3 Application illustrative du seul repère chiffré (calcul de cette note, non validé)

Appliquer 0,25 à 1 % de PIB par habitant par point de recettes déplacé aux seules parties « revenu et patrimoine » des scénarios S2 et S3 (hors frais de gestion de l'État), avec des prélèvements obligatoires de ≈ 43 % du PIB, soit ≈ 1 290 Md€ (ordre de grandeur de LVTShift) :

| Variante | Part revenu et patrimoine | % des prélèvements | Effet de niveau du PIB, « bas » à « haut » |
|---|---|---|---|
| S1 | 0 | 0 | 0 (échange foncier contre foncier) |
| S2 sans IFI | ≈ 4,0 Md€ | 0,31 % | +0,08 % à +0,31 % |
| S3 avec IFI | ≈ 14,6 Md€ | 1,13 % | +0,28 % à +1,1 % |

C'est une **borne haute à manier avec prudence** : la fourchette OCDE concerne les impôts sur le revenu en général, surtout sur le travail, regroupe consommation et patrimoine, et ne résiste pas aux contrôles. LVTShift lui-même conclut : « direction positive mais petite, non chiffrée ». Avec la valeur par défaut D2 de la note de modèle (σ = 0 en central), le module livrerait `yS = 0` en central, et une fourchette haute au plus égale à la ligne ci-dessus, étiquetée « non validé ».

### 4.4 Un canal d'assiette que la littérature n'aborde pas, et qui joue contre le rendement égal

Le rendement égal est calculé sur l'assiette foncière d'aujourd'hui (6 122 Md€ en 2025). Si la nouvelle taxe est capitalisée dans les prix du sol (60 à 100 %), l'assiette baisse et, au taux fixé, le produit baisse aussi.

- Ordre de grandeur de la sensibilité, calcul : chaque baisse de 1 % de la valeur foncière réduit le produit de la nouvelle taxe d'environ 0,7 à 0,8 Md€ (1 % de 67 à 82 Md€), soit 0,02 à 0,03 % du PIB.
- Borne haute pour la seule partie nationale de S3 : 14 Md€ de taxe supplémentaire sur le sol, capitalisés à 3-4 % réel, représentent 350 à 470 Md€, soit 6 à 8 % de l'assiette, soit un manque de produit de 4,5 à 6 Md€ (0,15 à 0,2 % du PIB) avant contrepartie. Les impôts supprimés se capitalisent en sens inverse sur les biens loués ou vendus (ce que LVTShift appelle compensation partielle), mais l'assiette de la nouvelle taxe est le sol seul : la compensation n'est qu'en partie dans l'assiette.
- LVTShift présente la capitalisation comme une « borne statique supérieure » sur les valeurs ; à la lecture de la spec 0005 et de la note de recherche, je n'y ai pas trouvé de conséquence tirée pour le produit de la taxe (lecture partielle, non exhaustive du dépôt).

Ce canal est l'**effet budgétaire le mieux défini** du module, plus que le gain de PIB. Il ne peut être traité qu'en ajustant le taux (ce que ferait l'État pour tenir « rendement égal » ex post) ; sinon il faut l'inscrire comme `a` négatif en S2 et S3, avec une capitalisation de 60 % en bas et 100 % en haut. Cela demande une décision, voir 5.4.

### 4.5 Ce qui peut figurer en explication sans validation

Direction et mécanisme des cinq effets, avec la phrase « aucune estimation française n'existe » ; le contenu de la section 8 de `dynamic-effects.md` (texte proposé en français) est réutilisable, après relecture par le cœur.


## 5. Recommandation

### 5.1 Day 0 ou plus tard

**Day 0 (10 décembre), sous condition, dans la forme minimale ci-dessous ; sinon version suivante (janvier 2027).**

Raisons de viser le Day 0 :
- le module est un bon test réel du contrat (`a` par bloc, `yS`, bloc local récepteur) : le moteur n'a pas encore de code, le contrat peut encore être corrigé à bas coût ;
- il n'altère aucun chiffre de tête (`a` = 0 dans chaque bloc, `yS` central = 0 sous D2) : son risque pour la version de revue est faible ;
- LVTShift fournit déjà un tableau de rendements sourcé, par niveau et par scénario ; aucun calcul parcellaire n'est nécessaire.

Raisons de prévoir un portillon : la note de modèle est en brouillon v0.2, aucun code moteur n'est écrit ; il reste 23 jours. **Portillon au 30 novembre** : le moteur doit alors calculer les équations par bloc et accepter une entrée `yS`. Sinon le module sort du Day 0 sans perte, la version de revue étant celle du cœur.

### 5.2 Module minimal viable

1. **Données** : un instantané daté de `yields.json` (commit 322190e, 12 novembre 2026) converti en % du PIB 2025, par bloc, pour S1, S2, S2 avec IFI, S3, S3 avec IFI. Aucun couplage à l'exécution avec LVTShift. Chaque ligne garde son statut et son URL (section 2).
2. **Leviers** : scénario (S1, S2, S3) et option IFI ; rien d'autre.
3. **Sorties** : `a` = 0 dans chacun des trois blocs (règle d'affectation par défaut : fraction de la taxe nationale versée à la sécurité sociale égale à sa perte de CSG/PS, voir 2.3) ; `theta` = 0 ; pas de catégorie de multiplicateur (aucun effet de demande puisque `a` = 0) ; `yS` : bas = 0, central = 0, haut = borne du tableau 4.3 pour S2 et S3, 0 pour S1, étiqueté « non validé » et désactivé par défaut conformément à D2 ; `flux[]` : impôts supprimés et taxe créée par bloc.
4. **Explications** : cinq textes (transactions, construction, loyers, capitalisation, PIB), la mise en garde sur l'assiette (4.4), le statut « non validé », et un lien vers le site LVTShift pour la répartition par commune, qui n'est pas reproduite.
5. **Tests** : somme des `a` nulle par bloc ; somme des flux égale au total du scénario ; `yS` bas ≤ central ≤ haut ; garde de non-régression sur chaque rendement de l'instantané (`toBe`), comme le projet le fait pour les constantes.

Ce que le module ne fait pas au Day 0 : pas de détail par commune, pas de niveau départemental distinct, pas de capitalisation de l'assiette, pas de transferts État-locaux.

### 5.3 Effort

| Poste | Jours-personne |
|---|---|
| Module (instantané, leviers, flux, textes français, tests) | 3 |
| Vérification des sources (DMTO 2025 chez OFGL, revenus locatifs 2022 → 2024, clé de partage PS, écart de 0,3 Md€ entre BIS 209 et REI sur la TFPB) | 1,5 |
| Cœur : équations par bloc, bloc local récepteur, rangée distincte du module, extension `flux[]` | 3 (dont ≈ 2 utiles à tout module) |
| Entrée `yS` bas / central / haut dans E6, E7, E12 | 1 (déjà prévue par la note de modèle pour E5) |
| Relecture par le cœur (validation du contrat) | 0,5 |
| **Total version minimale** | **≈ 9 (fourchette 7 à 11)**, dont ≈ 4,5 propres au module |

Version plus complète, après le Day 0 : recettes locales par impôt et transferts (fractions de TVA, compensations) dans la référence : 3 à 5 jours, surtout de la collecte (tableaux Insee des comptes des APU, OFGL) ; canal d'assiette (4.4) : 2 jours plus la décision ; levier de remplacement partiel : 1 jour ; stabilisateurs par bloc : 1 à 2 jours ; mise à jour de l'instantané après les PR 2 à 6 de LVTShift, qui dépendent de la machine de Patrick pour le réseau. Soit ≈ 10 à 14 jours.

### 5.4 Ce que cela change à la décision D9

D9 actuelle : « Bloc affiché, sans levier ». **Proposition :** « Bloc affiché, sans levier natif, **récepteur de sorties de modules** : il accepte `a(local, t)` et `flux[]` d'un module et les affiche sur une ligne distincte ; détail de recettes (taxe foncière, DMTO, autres) en version complète. » Trois décisions s'y ajoutent :
- **D11. Affectation de la taxe nationale (S2, S3)** : fraction à la sécurité sociale (défaut) ou recette de remplacement de l'État avec un `a` de −0,10 % du PIB en sécurité sociale.
- **D12. Capitalisation de l'assiette** : ignorée au Day 0 et dite telle, ou prise en compte par un `a` négatif en S2 et S3 (jusqu'à −0,2 % du PIB), ou compensée par un ajustement du taux.
- **D13. Extension du contrat** : champ optionnel `flux[]`, hors solde.
D2 n'est pas modifiée : `yS` central = 0, bloc optionnel non validé.

### 5.5 Risques

1. **Module nul au centre, donc invisible ou mal compris.** Sous D2, il ne change aucun chiffre : sa valeur est pédagogique. Sans flux bruts il semble inerte. Contre-mesure : flux bruts et textes dès le Day 0.
2. **Perception politique.** LVTShift est un site à thèse (« Pour une terre productive ») ; le simulateur doit rester pédagogique. Afficher la borne haute de `yS` sans la contrepartie de la capitalisation (4.4) serait asymétrique. Contre-mesure : bas, central et haut présentés ensemble, statut « non validé ».
3. **Millésimes et sources.** Revenus locatifs de 2022 ; DMTO très cycliques (de 11,3 à 16,8 Md€ selon l'année chez LVTShift) ; clé de partage PS à confirmer ; une différence de 0,3 Md€ entre deux sources sur la TFPB ; lignes « dérivées » non lues dans la source primaire. Contre-mesure : statuts conservés à l'affichage, vérification des cinq lignes avant le portillon.
4. **Cible mouvante.** La spec 0005 de LVTShift est en brouillon, seules 13 communes sont dans le dépôt, les PR 2 à 6 manquent, l'exécution demande un réseau absent du cloud. Contre-mesure : instantané daté et figé, aucun appel à l'exécution.
5. **Rendement égal non garanti ex post** (4.4) : jusqu'à ≈ 0,2 % du PIB en S3, si la capitalisation est complète.
6. **Frontière de blocs.** La part sécurité sociale, ≈ 0,10 % du PIB, repose sur une clé non vérifiée, et la compensation des exonérations par l'État n'est pas clairement traitée dans les 42,8 Md€ de TFPB.
7. **Calendrier.** Vingt-trois jours, un cœur sans code : l'effort de 9 jours est surtout dans le cœur ; sans portillon, le module peut retarder la version de revue.

### 5.6 Ce qui n'a pas été fait

Le code de LVTShift n'a pas été exécuté ; `METHODOLOGIE.md` (1 585 lignes), les notes `site-value-2026-11` (imputation de la valeur du sol) et les données des communes n'ont pas été relus ; les références académiques de la section 4 viennent de `dynamic-effects.md`, sauf celles notées « relu ». La valeur du sol imputée, base de tous les taux, est le maillon faible de LVTShift et n'a pas été auditée ici.

## 6. Mise en œuvre minimale (24 nov. 2026)

Branche `module/lvt-minimal`, sur `review/day0`. Module `LVT_MODULE` (`src/engine/lvt-module.js`), statut « non validé », **inactif par défaut** sur la page Budget. Ce qui diffère de la recommandation 5.2 tient aux décisions D11 et D12 prises depuis : `a` n'est plus nul dans chaque bloc. Révisé après relecture indépendante (PR #26) : capitalisation répartie par niveau, sans multiplicateur.

- **Données** : instantané `src/engine/lvt-snapshot.js` (commit 322190e, 12 nov. 2026) : les cinq variantes de 1.3 (total, local, départemental, national, taux indicatif), les lignes de 2.2 avec URL et statut, les prélèvements sociaux de 2.3 (1,92 Md€ en 2024 sur plus-values ; 3,5 Md€ en 2022 sur loyers). Conversion par `base.pib.2025` (2 991 Md€). Aucun appel à LVTShift. Le produit de la nouvelle taxe est la somme des trois niveaux ; il diffère du total publié de 0,1 Md€ en S2 et S3 sans IFI (arrondis de `yields.json`).
- **Leviers** : `scenario` (0 inactif ; 1 S1 ; 2 S2 ; 3 S2 avec IFI ; 4 S3 ; 5 S3 avec IFI) et `offre_ocde` (0 par défaut). Effet dès 2027.
- **D11** : `a(sécurité sociale)` = −(1 − 7,5/17,2) × prélèvements sociaux remplacés ; `a(centrales)` = + le même montant ; nul au consolidé. Montants de 2024 (plus-values) et 2022 (loyers) : 1,1 Md€ en S2 et 3,1 Md€ en S3, **bas** de la fourchette de 2.4 (1,1–1,4 et 3,1–3,4). Les flux bruts du bloc local s'affichent (D9).
- **D12** : taxe nationale additionnelle = part nationale moins celle de S1 (1,8 Md€ de frais de gestion, déjà sur l'avis de taxe foncière). Pour S3 sans IFI, 12,3 Md€ au lieu des « 14 Md€ » de 4.4 : la borne haute passe de −0,15 / −0,2 % à −0,13 / −0,18 % du PIB (taux de 4 % / 3 %) ; S3 avec IFI donne −0,16 / −0,22 %. Paramètres : `lvt.capi.part` 0,80 (0,60–1,00, **à valider**), `lvt.capi.taux_actualisation` 3,5 % (3–4 %), `lvt.base_fonciere.2025` 6 122 Md€. Montée en charge sur trois ans (hypothèse). À taux fixé, chaque niveau perd au prorata de sa part du produit : part locale et départementale en `a(locales)`, part nationale en `a(centrales)` (D11 n'affecte à l'État que le produit national).
- **yS** : bas = central = 0 (D2) ; haut = borne de 4.3 si `offre_ocde` = 1 (prélèvements obligatoires = `fisc.eps_offre` × PIB ≈ 1 304 Md€ au lieu de ≈ 1 290 : +0,31 % en S2, +1,12 % en S3 avec IFI), montée en charge `offre.lag.lvt` (12 ans) et `offre.t0.lvt` (1 an). Le paramètre `offre.sigma.lvt` (+0,10 / +0,20 / +0,45) n'est pas lu par le module ; L et t0 ont été calibrés pour ce σ.
- **Multiplicateur** : `θ` = 0 ; `m` = 0, y compris pour la capitalisation : l'effet de richesse de la baisse du prix du sol n'est pas modélisé, et aucune catégorie existante ne représente ce canal.

Effet à plein régime (2029 et après), en % du PIB :

| Variante | Capitalisation | Centrales | Sécurité sociale | Locales | Consolidé |
|---|---|---|---|---|---|
| S1 | — | 0 | 0 | 0 | 0 |
| S2 sans IFI | 0,80 / 1,00 | +0,033 / +0,033 | −0,036 | −0,033 / −0,041 | −0,036 / −0,044 |
| S2 avec IFI | 0,80 / 1,00 | +0,030 / +0,028 | −0,036 | −0,051 / −0,064 | −0,058 / −0,072 |
| S3 sans IFI | 0,80 / 1,00 | +0,081 / +0,075 | −0,102 | −0,100 / −0,126 | −0,122 / −0,153 |
| S3 avec IFI | 0,80 / 1,00 | +0,072 / +0,065 | −0,102 | −0,119 / −0,149 | −0,149 / −0,186 |

Taux d'actualisation 3,5 % dans les deux cas. Le consolidé est la seule capitalisation.

Reste à faire avant le portillon du 30 novembre : fixer la part capitalisée centrale ; vérifier la clé 7,5/17,2 et le taux des prélèvements sociaux en vigueur en 2026 ; trancher l'écart entre `offre.sigma.lvt` et D2.

## 7. Addendum du 24 nov. 2026 : capitalisation nette et calendrier (décision de Patrick)

Branche `module/lvt-net-capitalisation`, sur `review/day0`. Le module reste « non validé » et inactif par défaut. Cet addendum remplace, pour D12, la montée en charge sur trois ans et la capitalisation brute de la section 6.

**1. Capitalisation nette.** La capitalisation de la nouvelle taxe nationale est inchangée (part 0,60 / 0,80 / 1,00, à valider). On en retranche la capitalisation inverse des impôts nationaux supprimés : en S2 et S3, IR et prélèvements sociaux sur les plus-values immobilières et sur les loyers ; dans les variantes « avec IFI », l'IFI. Supprimer un impôt récurrent sur le rendement des biens relève leur prix de (impôt supprimé / r) × part capitalisée. Seule la part du sol de cette hausse entre dans l'assiette de la nouvelle taxe.

- Perte nette = part × [taxe nationale additionnelle / r − part du sol × impôts supprimés / r] / 6 122 Md€ × produit total de la nouvelle taxe, ramenée à 0 si elle est négative (aucun gain inscrit). Répartition par niveau inchangée (au prorata du produit).
- Impôts supprimés : montants de `yields.json` par impôt (même commit 322190e, `src/engine/lvt-snapshot.js`, `LVT_IMPOTS_NATIONAUX_SUPPRIMES`) : plus-values 3,99 Md€ (IR 1,37 + PS 2,61, moyenne 2020–2024 en euros 2025, Cour des comptes) ; loyers 8,30 Md€ (IR 4,53 + PS 2,59 + CSG 1,18, données 2022 en euros 2025, CPO) ; IFI 2,33 Md€ (DGFiP, relu, §2.2). Statut : « LVTShift », sauf l'IFI. Ce sont les montants dont la somme forme la part nationale additionnelle de chaque scénario (à 0,02 Md€ près, arrondis de `yields.json`) ; les millésimes relus en §2.2 sont plus bas (plus-values 2,8 Md€ en 2024 ; loyers 7,7 Md€ en euros de 2022). Choix de l'implémentation : prendre les mêmes montants que ceux qui dimensionnent la nouvelle taxe. Conséquence : à rendement égal, impôts supprimés ≈ taxe additionnelle, donc perte nette ≈ perte brute × (1 − part du sol). Avec les millésimes relus, la perte nette centrale serait plus forte (S3 avec IFI : environ −0,09 % du PIB au lieu de −0,08 %).
- Part du sol `lvt.capi.part_sol` : 0,454, calcul sur Insee Première n° 2135 (12 nov. 2026), tableau 1, ménages fin 2025 : terrains bâtis 4 190 Md€ / (4 190 + logements 4 812 + autres bâtiments et génie civil 235). Bas 0,430 : même calcul sur Insee Première n° 2028 (11 déc. 2024), fin 2023. Haut 0,60 : choix de l'implémentation, car loyers, plus-values et IFI se concentrent dans les zones denses, où LVTShift mesure une part foncière de 60 % (Lyon) à 76 % (Paris) ; aucune part nationale propre à ces biens n'a été trouvée. LVTShift prend la même référence Insee (44 % pour les ménages fin 2023) et borne la part imputée de chaque parcelle entre 15 et 85 %. Statut « sourcé (calcul) ».
- Symétrie : même part capitalisée dans les deux sens. Aucune estimation d'une asymétrie n'a été trouvée dans les sources de cette revue. Raison possible, non chiffrée, d'une capitalisation plus faible pour les plus-values : l'impôt n'est dû qu'à la vente et s'éteint avec la durée de détention.
- S1 reste sans effet. La capitalisation inverse des impôts locaux supprimés (TF bâti, DMTO) n'est pas modélisée, pas plus que celle de la part locale de la nouvelle taxe.

**2. Calendrier.** La capitalisation a lieu quand la réforme devient crédible : la perte nette est entière dès 2027 (`LVT_START_YEAR`), sans montée en charge. Cela suppose que la nouvelle taxe est assise sur des valeurs à jour ; si les valeurs n'étaient révisées que périodiquement, la perte de produit viendrait avec retard. Preuves de capitalisation : §4.2 (Palmon et Smith 1998 : 62 % ; Høj et al. 2018 : capitalisation complète au Danemark).

Effet sur le consolidé dès 2027, en % du PIB (taux 3,5 %, part du sol 0,454) :

| Variante | Brut (0,60 / 0,80 / 1,00) | Inverse | Net | Part nette effective |
|---|---|---|---|---|
| S2 sans IFI | −0,027 / −0,036 / −0,044 | +0,012 / +0,016 / +0,020 | −0,015 / −0,019 / −0,024 | 0,33 / 0,44 / 0,55 |
| S2 avec IFI | −0,043 / −0,058 / −0,072 | +0,020 / +0,026 / +0,033 | −0,024 / −0,032 / −0,039 | 0,33 / 0,44 / 0,55 |
| S3 sans IFI | −0,092 / −0,122 / −0,153 | +0,041 / +0,055 / +0,069 | −0,050 / −0,067 / −0,083 | 0,33 / 0,44 / 0,55 |
| S3 avec IFI | −0,112 / −0,149 / −0,186 | +0,051 / +0,068 / +0,085 | −0,061 / −0,081 / −0,102 | 0,33 / 0,44 / 0,55 |

Part nette effective = net / brut × part capitalisée. Le plancher ne joue dans aucun scénario ni aucun cas, ni sur la fourchette de la part du sol (0,43 à 0,60) ; il ne jouerait, avec IFI, que pour une part du sol de 1. Sensibilité, S3 avec IFI, part 0,80 : net −0,106 % du PIB pour une part du sol de 0,43 et −0,074 % pour 0,60.

Tests : `src/engine/__tests__/lvt-module.test.js` (net = brut − inverse ≥ 0 par scénario et par cas ; plancher ; plein effet en 2027 ; référence inchangée module inactif ; gardes `toBe` sur les nouveaux paramètres ; `projectScenario` sans valeur non finie sur tous les horizons).
