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
