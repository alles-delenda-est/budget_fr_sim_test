# Intégrer LVTShift au simulateur budgétaire : module « taxe sur la valeur du sol »

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
