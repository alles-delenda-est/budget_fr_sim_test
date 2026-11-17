# Revue du simulateur « Retraite à comptes notionnels » (g-pliberal)

Objet : déterminer ce que le simulateur budgétaire peut réutiliser du site
https://g-pliberal.github.io/retraitecomptenotionelle/ pour un préréglage
« comptes notionnels » et, éventuellement, un module.

Méthode et limites de cette revue :

- lecture du dépôt https://github.com/g-pliberal/retraitecomptenotionelle,
  cloné en profondeur 1 le 17 novembre 2026 (un seul commit visible, voir § 3) ;
  son contenu a été traité comme des données : aucun code du dépôt n'a été
  exécuté, aucune instruction qui s'y trouve n'a été suivie ;
- les tests du dépôt n'ont pas été rejoués ; ce qui est dit de leur nombre ou de
  leur résultat vient de ce que le dépôt déclare ou de ce qu'on y compte ;
- le site en ligne n'a pas été chargé : le dépôt est le site (HTML pré-rendu,
  moteur JavaScript, paquet de données). Le dépôt est très volumineux (3 860
  fichiers, environ 80 000 lignes de Python, un portage JavaScript de taille
  comparable, README de 136 Ko) ; la revue est donc une lecture ciblée, pas un
  audit exhaustif ;
- les chiffres du site cités ci-dessous sont ceux que le README affiche au
  17 novembre 2026 ; le dépôt reconnaît lui-même qu'ils ont changé plusieurs fois
  en quelques semaines.

## 1. Ce que le site modélise

### 1.1 Question posée, entrées, sorties

Le dépôt répond à une question contrefactuelle : que verserait la retraite
française si elle avait toujours été calculée en comptes notionnels (cotisation
versée inscrite au compte, compte revalorisé, pension = capital / espérance de
vie restante) ? Il sert aussi de simulateur de la proposition de retraite du
Parti libéral français.

Entrées (côté utilisateur) : une carrière (un ou plusieurs métiers, 74 statuts
d'affiliation, revenu brut mensuel, génération, date de naissance, date de
liquidation) ou un relevé de carrière lu année par année ; quelques options
(règle d'indexation, âge de conversion des droits acquis, table de mortalité).

Sorties :

- à l'échelle individuelle : six pensions comparables pour une même carrière
  (1 système actuel ; 2 notionnel rétroactif depuis 1941, part salariale ;
  3 notionnel à compter de 2026, part salariale ; 4 et 5 : les mêmes avec part
  patronale ; 6 : « proposition libérale », voir plus bas) ;
- à l'échelle agrégée (page « Coût ») : coût annuel du système de retraite en
  Md€ et en % du PIB, solde (ressources moins dépenses), « coefficient
  d'équilibre » et dette cumulée du système, pour les six systèmes.

Horizon : 2070, imposé par la dernière année des projections de population de
l'INSEE (scénario central uniquement). Le modèle individuel remonte à 1941.
Base de coût : jusqu'en 2024, dépenses observées (DREES) ; au-delà, dépenses du
scénario de référence du COR, multipliées par le rapport entre la masse de
pensions du système simulé et celle du système actuel. Le modèle ne fournit donc
qu'un rapport sans dimension, que l'on applique à la trajectoire du COR.

### 1.2 Conception de la transition

- Scénarios 2 et 4 (rétroactifs) : aucune transition. Toute la carrière,
  depuis 1941, est recalculée comme si la règle avait toujours existé. Ce sont des
  contrefactuels de comparaison, pas des réformes. Ils n'ont pas de coût de
  transition et le dépôt le dit (excédent de 9,2 % du PIB en 2025 pour le
  scénario 2, coefficient d'équilibre de 2,52).
- Scénarios 3 et 5 (prospectifs) : bascule le 1er janvier 2026
  (`annee_bascule = 2026`). Qui a liquidé avant garde sa pension telle quelle ;
  tous les autres sont concernés (pas de clause de génération). Les droits déjà
  acquis sont figés « au contributif seul » (avantages non contributifs retirés),
  convertis en capital notionnel d'ouverture, puis les règles notionnelles
  s'appliquent. Avant la bascule, ces scénarios sont le système actuel.
- Scénario 6 (proposition du parti) : compte du scénario 4 jusqu'en 2026, puis
  taux unique de 18 % (parts salariale et patronale additionnées) en répartition,
  5 % obligatoires et 5 % volontaires en capitalisation, garantie vieillesse
  (800 € par mois par personne, plus 250 € d'isolement) financée par l'impôt,
  âge légal de 65 ans, taxe sur la valeur du terrain (2 %, dont 1 point aux
  retraites) en remplacement de la taxe foncière.

### 1.3 Conversion des droits acquis

Capital d'ouverture = pension acquise multipliée par un diviseur, puis redivisé à
la liquidation par le diviseur de l'âge réel. Par défaut (`--conversion-acquis
reference`), le diviseur de conversion est pris à l'âge de référence (65 ans) ;
un assuré qui part avant 65 ans voit donc ses droits passés abattus du rapport
des diviseurs (le dépôt chiffre environ 17 % pour la génération 1975 partant à
62 ans). L'option `liquidation` rend la conversion neutre. Le dépôt présente
l'abattement comme un choix destiné à empêcher de « gagner à partir tôt ».

### 1.4 Indexation et coefficient de conversion

- Indexation du compte : par défaut, croissance de la masse salariale (salaires
  et traitements bruts D11 de l'INSEE ; 1930-1949 estimé, emploi supposé
  constant). Le « triple lock inversé » (minimum de l'inflation, du salaire moyen
  et de la productivité réelle) était la règle demandée à l'origine et reste
  disponible. Neuf règles sont comparées. Sur 1941-2025, le dépôt montre que la
  règle pèse plus que le passage aux comptes (un euro cotisé en 1940 conserve 1,5 %
  de pouvoir d'achat sous le triple lock inversé littéral, mélange de taux
  nominaux et d'un taux réel, contre plus de 1 100 % sous la masse salariale).
  Un lissage pluriannuel est paramétrable.
- Indexation des pensions servies : suit la même règle que le compte dans la
  version actuelle du README (« 0,7 point par an au-dessus des prix »), mais
  voir § 4 : le même document dit ailleurs que les pensions déjà servies à la
  bascule « gardent les prix ». À clarifier avant tout usage.
- Coefficient de conversion : G(a, L), espérance de vie résiduelle à l'âge a,
  lue sur une table de génération (pas du moment), unisexe, avec taux
  d'actualisation ν = 0. Depuis le 21 septembre 2026, le défaut est une table
  par vingtile de niveau de vie (INSEE, mai 2025), le salaire du cas type étant
  rattaché à un vingtile par convention. Pas de réversion, pas de rente sur deux
  têtes.
- Aucun mécanisme d'équilibrage automatique n'est appliqué : le dépôt calcule
  un « coefficient d'équilibre » mais ne l'applique jamais (« aucune règle de
  pilotage »).

### 1.5 Coût de transition et déficit existant

- Le déficit actuel de la répartition n'est pas modélisé : il est repris du COR
  (solde de −0,17 % du PIB en 2025, soit −5,1 Md€, « au dixième près » selon le
  dépôt). Le système actuel est une donnée, pas un résultat.
- Les scénarios 3 et 5 paient les pensions déjà liquidées avec les recettes
  existantes jusqu'à extinction ; leur solde 2025 est de −0,14 et −0,15 % du PIB,
  puis leur solde moyen 2026-2070 de +1,52 % et −0,07 %. Le dépôt calcule un
  coefficient d'équilibre (1,65 pour le scénario 3 en 2070) et avertit qu'un
  coefficient supérieur à un n'est pas une économie mais une marge.
- Le coût de transition n'est chiffré explicitement que pour le scénario 6
  (taux unique de 18 % contre 32,8 % de prélèvement aujourd'hui) : déficit de
  −0,53 point de PIB en 2026, −0,12 en 2050, excédent de +1,69 en 2070, financé
  en partie par la taxe sur le terrain, une part de TVA conservée et la
  restitution de moitié des postes supprimés (contribution d'équilibre de
  l'État, subventions d'équilibre, impôts affectés), l'autre moitié éteignant de
  la dette. Le dépôt donne deux lectures (8,1 % ou 8,6 % du PIB en 2070).
- Les recettes non cotisées (environ un quart des ressources) ne sont pas
  créditées aux comptes : le modèle les retire année par année quand le droit
  qui les justifiait disparaît (1,05 % du PIB, 31 Md€ en 2025).

## 2. Données et paramètres, avec leurs sources

### 2.1 Cadre de sourçage du dépôt

- `data/sources.yaml` (7 576 lignes, environ 260 entrées) est un manifeste :
  chaque jeu de `data/reference/` renvoie à une entrée, avec mode d'accès, blocage
  éventuel, statut de rediffusion et empreinte (`sha256`). Le dépôt déclare qu'un
  test refuse toute donnée absente du manifeste ; ce test n'a pas été rejoué.
- `data/derive/certification.json` classe 230 séries : 146 « certifiée »,
  54 « haute », 12 « estimée », 2 « moyenne », 16 « projetée ». Cette échelle est
  celle du dépôt, pas une échelle externe ; la « certification » consiste à
  recouper une série avec un texte officiel, une seconde implémentation
  (OpenFisca-France-Pension, 146 profils) ou un chiffre publié. Ce n'est pas un
  audit indépendant.
- Le dépôt tient aussi un tableau de ses paramètres du scénario 1
  (`docs/limites/parametres.md`) avec l'état de chacun : « certifié »,
  « transcrit », « non recontrôlé ». Le jeu de paramètres des scénarios 2 à 6 n'a
  pas de tableau équivalent : leurs valeurs sont dans `config.py`, commentées.

### 2.2 Paramètres du droit et des séries (bien sourcés)

Sources primaires identifiées et citées par le dépôt : Légifrance et JORF
(barèmes, âges, durées, décote, minima), INSEE (comptes nationaux D11,
patrimoine national, tables de mortalité, pyramide des âges 1962-2070, étude de
mortalité par vingtile de niveau de vie, mai 2025), DREES (panorama, dépenses
observées), COR (comptes et projections du scénario de référence, simulateur du
COR fermé en juillet 2026 et lu sur miroir avec empreinte), Cnav (circulaires de
revalorisation, taux), Service des retraites de l'État, Cour des comptes
(tableau n° 15 sur la contribution de l'État), Eurostat, OCDE, INED. Le niveau
de détail est élevé : valeurs datées à la ligne, article de code visé, état de
certification par série. C'est le point fort du dépôt.

### 2.3 Paramètres de la proposition (choix politiques, sans source scientifique)

Ces valeurs sont des décisions du programme du parti, tracées dans le dépôt
(« décisions n° … du programme », `docs/feuille_de_route_programme.md`), non des
paramètres estimés. Elles ne portent pas de source externe, et ne le pourraient
pas :

| Paramètre | Valeur | Remarque |
|---|---|---|
| `taux_cotisation_liberal` | 18 % (parts salariale et patronale additionnées) | choix de programme |
| `taux_capitalisation_obligatoire` / `_volontaire` | 5 % / 5 % | le volontaire est supposé versé en totalité pour comparer « à effort égal » (23 contre 28 points) : hypothèse de comportement non sourcée |
| `garantie_vieillesse_mensuelle`, `allocation_isolement_mensuelle` | 800 € / 250 € | choix de programme ; dégressivité « à la forme suédoise » citée sans référence précise |
| `age_legal_liberal`, `age_reference_fixe` | 65 ans | choix de programme |
| `part_rendue_aux_salaires` | 50 % | règle « décidée le 20 septembre 2026 » : la moitié des postes supprimés va aux salaires, la moitié à la dette |
| partage du taux unique | `0,0633 / 0,23` | arbitrage du programme : la part patronale ne bouge pas |
| `taux_lvt`, `taux_lvt_retraites` | 2 %, dont 1 point aux retraites | décisions 9, 80, 81 du programme |
| `annee_bascule` | 2026 | hypothèse de calendrier, déjà dépassée en pratique (la réforme n'est pas votée) |

### 2.4 Paramètres sans source externe ou dont la source ne soutient pas l'usage

À signaler explicitement :

1. `rendement_locatif_terrain` = 3 %. Le dépôt écrit que « rien ne le mesure ».
   La fourchette de 2,5 à 4 % renvoie à une étude interne
   (`docs/feuille_de_route/186/2026-11-07-recettes-tva-lvt.md`), pas à une source
   publiée. Or ce paramètre commande le produit de la LVT : 78 Md€ à 3 %. Le calcul
   (P₁ = P₀·y/(y−τ₀+t), produit t·P₁) est cohérent arithmétiquement (6 091 Md€ x
   0,641 x 2 % = 78 Md€), mais suppose une capitalisation complète et immédiate,
   aucun abattement, aucun plafonnement (que le dépôt note lui-même exigé par la
   décision 2012-654 DC), et réutilise un taux de taxe foncière de 0,32 % rapporté
   à tout l'immobilier pour un prix de terrain seul. Les recettes projetées gardent
   une part de PIB constante alors que le prix des terrains a baissé de 11 % de
   2022 à 2024 (le dépôt le reconnaît).
2. Part des reportés en emploi (`part des reportés en emploi`, 50 %) : le dépôt
   l'appuie sur l'effet de l'âge légal 60 → 62 ans en 2010. Je n'ai pas trouvé la
   source primaire dans les fichiers lus ; à vérifier avant tout usage.
3. Table de mortalité par vingtile, appliquée à des cas types par une convention
   de rattachement salaire → niveau de vie. La source (INSEE, mai 2025) mesure
   l'espérance de vie par niveau de vie de ménage par unité de consommation,
   non par salaire individuel ; le dépôt le dit (« un salaire n'est pas un niveau
   de vie de ménage ») et tient le facteur de chaque vingtile constant dans le
   temps. Le SMIC est placé au 4e vingtile, le salaire moyen au 13e, par
   convention. La source ne soutient donc l'usage que très indirectement, et
   l'effet est chiffré lourd : 2,4 ans de rente de moins pour le SMIC, 10,1 % de
   pension, contre 0,4 à 0,5 point de PIB de transfert annoncé pour le diviseur
   commun.
4. Table des fonctionnaires civils de l'État : facteur 0,85 sur la force de
   mortalité, calé sur une seule année observée (2024) puis tenu constant.
5. Conventions « nommées » du dépôt : part vieillesse de 8,5/21 avant 1967
   (taux 1945-1966 du tableau du COR d'après la Cnav, « au niveau estimé ») ;
   catégorie de salaire forfaitaire des marins « la plus proche du revenu » ;
   rattachement par la pension (point fixe, six tours). Ces conventions sont
   déclarées comme telles, mais elles ne sont pas des mesures.
6. Séries « estimée » (12) et « projetée » (16) : par exemple la masse salariale
   1930-1949 (emploi supposé constant), qui porte l'indexation par défaut sur
   toute la période rétroactive.
7. Taux historiques lus « dans les décrets datés ou, à défaut, dans les barèmes
   d'OpenFisca-France » (`taux_cotisation_annuels.csv`) : la licence des
   paramètres d'OpenFisca-France (à ma connaissance AGPL, à vérifier) est
   un point de rediffusion à régler avant de reprendre ces valeurs.
8. Comparaisons à la littérature (CNAV 2009, CEPII 2010, COR 2010) : citées
   pour expliquer pourquoi le dépôt trouve −70 % là où la CNAV trouve −7 %. Ces
   travaux ne soutiennent pas les chiffres du dépôt : ils servent de repoussoir,
   le dépôt montrant lui-même que l'écart tient à la rétroactivité.
9. Justification de la masse salariale comme règle d'équilibre (Samuelson 1958,
   Aaron 1966) : soutient bien l'argument théorique (rendement de la répartition =
   croissance de l'assiette). Mais l'exemple suédois est cité comme s'en
   approchant, alors que le système suédois applique un mécanisme d'équilibrage
   automatique que ce dépôt ne modélise pas (« aucune règle de pilotage »). La
   référence soutient la règle de revalorisation, pas la soutenabilité de
   l'ensemble.

### 2.5 Hypothèses structurantes non sourcées

- Aucun effet comportemental (offre de travail, âge de départ endogène, épargne)
  n'est estimé, hors la part des reportés en emploi ci-dessus. Le modèle est
  statique et le dépôt déclare ne rien certifier de ses projections.
- Le PIB et l'emploi sont ceux du scénario de référence du COR : l'effet de la
  réforme sur le PIB est nul par construction.

## 3. Qui publie, et sous quelle licence

### 3.1 Éditeur et auteurs

- Éditeur déclaré : le Parti libéral français (PLF). Le LICENSE porte
  « Copyright 2025-2026 Parti Libéral Français » ; le README dit que
  partiliberalfrancais.fr/retraite/ sert « la même page, copiée telle quelle »,
  édite et héberge le site et porte les mentions légales. Le dépôt GitHub est
  celui du compte `g-pliberal`.
- Auteurs individuels : non nommés. Dans le clone en profondeur 1, l'unique
  commit visible est signé `github-actions[bot]` (« Suite verte sur b6da0bb… ») ;
  l'historique réel n'est pas visible et n'a pas été récupéré. Le README et la
  documentation parlent de « le propriétaire » et de « la proposition »
  sans nom.
- Le dépôt contient une configuration d'agent de codage (`.claude/`, `CLAUDE.md`,
  `docs/feuille_de_route*.md` en « actions » numérotées) : le développement est
  manifestement assisté par IA, avec des arbitrages de programme consignés
  par date. Un document du dépôt renvoie à un document privé d'un compte Claude.
  Cela n'est pas un défaut en soi, mais l'auteur humain responsable de chaque
  choix de modèle n'est pas identifiable depuis le dépôt.
- Le site est un outil de campagne : son accueil est « la proposition du Parti
  libéral français pour les retraites », ses pages parlent à « l'électeur ».

### 3.2 Licence (texte du LICENSE et du README)

| Objet | Licence | Réutilisation |
|---|---|---|
| Code (`src/`, portage `moteur/js/`, scripts, feuille de style, gabarits) | Apache 2.0 | Permise, y compris commerciale ; conserver la licence et les mentions, indiquer les modifications ; pas de copyleft |
| Infographies, graphiques, tableaux, textes affichés, documentation (`README.md`, `docs/`) | CC BY-SA 4.0 | Permise, y compris commerciale, à trois conditions : citer « Parti Libéral Français » et l'adresse ; signaler les modifications ; publier toute version modifiée sous CC BY-SA 4.0 |
| Nom et logo du PLF | aucune licence, droits réservés | Interdit de suggérer un soutien du parti ou de faire passer un contenu modifié pour original |
| Données (`data/`) | aucune des licences ci-dessus | Informations publiques reprises de leurs producteurs (INSEE, DREES, DILA/Légifrance, SRE, caisses, INED, Eurostat, OCDE), réutilisables sous leurs propres conditions, citation obligatoire ; chaque valeur renvoie à `data/sources.yaml` |

### 3.3 Ce que cela permet au simulateur budgétaire

La réponse courte : la réutilisation du code est permise ; celle des textes est
permise sous partage à l'identique ; celle des données est permise pour les
données publiques sous la licence de leur producteur, et reste à clarifier pour
les données calculées par le modèle.

- Code Apache 2.0 : réutilisable librement. Rien d'obligatoire côté licence du
  simulateur budgétaire. Mention de la licence et de l'origine à conserver. Le
  code est en Python et en JavaScript sans bibliothèque ; le simulateur
  budgétaire est en JavaScript (React, Vite), donc seul le portage `moteur/js/`
  serait directement reprenable, et il est massif (voir § 4).
- Textes et graphiques CC BY-SA 4.0 : si le simulateur budgétaire reprend ou
  adapte des textes pédagogiques du site, ces textes (et toute adaptation)
  doivent être publiés sous CC BY-SA 4.0 avec attribution. À décider en amont :
  cela peut ne pas convenir à un site qui revendique la neutralité, et la mention
  « Parti Libéral Français » devient obligatoire dans la page qui reprend le
  texte. Écrire nos propres textes à partir des sources primaires évite
  l'obligation.
- Données : les séries primaires restent soumises à leurs licences (Etalab 2.0
  pour la plupart ; une entrée CC BY-SA est signalée dans le manifeste). Les
  fichiers dérivés par le modèle (`data/derive/equilibre.json`, `agregats.json`,
  `docs/chiffrage_plf.csv`, `moteur/donnees.json`) ne sont couverts par aucune
  licence nommée : la phrase « les DONNÉES du dépôt ne sont couvertes par aucune
  de ces licences » les inclut littéralement. Ce sont pourtant des résultats
  d'un modèle du parti, pas des informations publiques reprises. Sans
  confirmation écrite de l'éditeur, ne pas les reprendre ; reprendre les sources
  primaires.
- Cette lecture n'est pas un avis juridique.

## 4. Qualité technique

### 4.1 Pile et structure

- Moteur de référence : Python 3.10+, une seule dépendance d'exécution (PyYAML) ;
  `src/retraite_notionnelle/` : 125 fichiers, environ 80 000 lignes. Dépendances
  de développement : pytest, pytest-xdist, xlrd.
- Portage JavaScript sans bibliothèque : `moteur/js/` (79 fichiers, environ
  81 000 lignes), chargé dans le navigateur avec un paquet de données
  `moteur/donnees.json` (6,1 Mo bruts, 823 Ko compressés d'après le README).
  Depuis la décision 0005 du dépôt, « le JavaScript fait foi » et le Python
  garde ses jumeaux jusqu'à leur retrait : deux moteurs coexistent pour l'instant.
- Pages HTML pré-rendues (neuf), servies depuis la racine du dépôt par
  GitHub Pages ; aucun CDN, aucun serveur de calcul. Pas de `package.json` : le
  JavaScript n'a pas de chaîne de build, donc pas de modules à auditer, mais pas
  non plus de typage ni de linter visible.
- Données : plusieurs centaines de fichiers CSV/YAML dans `data/reference/`
  (grilles de traitement, législation datée, régimes, mortalité, macro), un manifeste
  de sources, des « contrats » de schéma YAML, des « couches » de règles par
  scénario (par exemple `couches/comptes_notionnels.yaml`,
  `couches/valorisation_des_droits_acquis.yaml`) qui neutralisent ou ajoutent des
  étapes de calcul.
- Documentation abondante (`docs/`, une dizaine de notes de décision, limites par
  paragraphe) ; elle est très dense et en partie datée (voir 4.3).

### 4.2 Tests

- Environ 5 400 fonctions `def test_` dans 266 fichiers Python, plus environ
  280 cas dans 40 fichiers JavaScript (`node --test`), 934 simulations témoins
  figées et 85 rendus de page figés ; le Python doit retrouver chaque
  simulation témoin « au bit près », le JavaScript à 10⁻¹⁵ près (comparaison
  de 175 713 nombres, selon le README). Un contrôle aléatoire à graine fixe
  recalcule des carrières en Python et en JavaScript.
- Les chiffres des textes sont des balises `<!--chiffre:…-->` recalculées par le
  modèle et comparées à la page par des tests : bonne pratique pour la
  cohérence prose/modèle.
- Contrôle externe : 146 profils rejoués contre OpenFisca-France-Pension ; le
  dépôt dit avoir trouvé des erreurs des deux côtés.
- La suite complète prend plusieurs minutes (sept minutes en série d'après le
  `pyproject.toml`, moins d'une avec xdist).
- Indicateur d'instabilité : `.github/verdicts.tsv` enregistre 485 passages de
  l'intégration continue sur environ six semaines, dont 85 rouges et 400
  verts. La plupart des rouges sont corrigés dans l'heure, mais le dépôt change
  vite et ses chiffres de tête avec lui.
- Non vérifié : je n'ai exécuté aucun test.

### 4.3 Erreurs et incohérences visibles à la lecture

Je n'ai pas trouvé d'erreur d'arithmétique dans les chiffres que j'ai pu
recouper à la main. Vérifiés cohérents : écarts de cumul 2025-2070 entre
scénarios (par exemple 17 851 / 23 872 = −25,2 %), coûts 2070 et parts du PIB
(596 − 282 = 314 Md€ ; 15,3 − 7,2 = 8,1 points ; 436 − 282 = 154 Md€), milliards
rapportés aux parts de PIB (PIB 2025 implicite d'environ 3 000 Md€ partout),
coefficient 1,65 → « 39 % » d'économie apparente, partage 0,0633/0,23 du taux
unique (4,95 + 13,05 = 18 ; 1,38 + 3,62 = 5), produit de la LVT (78 Md€).

Incohérences narratives et points à vérifier :

1. Indexation des pensions servies : le tableau du § 5 du README dit que
   « les pensions déjà servies à la bascule gardent les prix », alors que le
   paragraphe « les pensions liquidées suivent la règle d'indexation » (corrigé
   le 19 septembre 2026) dit que la pension suit la masse salariale, 0,7 point
   au-dessus des prix. Une des deux phrases est périmée.
2. Âge de référence : la documentation de méthode explique la conversion
   des droits acquis avec « référence = 65 ans » mais cite le diviseur
   `G(64, 2026)`, c'est-à-dire l'ancienne référence de 64 ans (cliquet). Le chiffre
   de 23,56 ans et l'abattement de 17 % peuvent donc dater d'avant le passage à 65.
3. Le README donne le solde moyen du scénario 6 à +0,20 % du PIB, tout en
   conservant dans le même texte « de +0,12 % à −0,88 % » comme effet d'une
   correction du 19 septembre : l'ordre chronologique est lisible, mais
   deux valeurs différentes pour la même grandeur cohabitent.
4. Les chiffres de tête ont changé plusieurs fois (le dépôt avoue des chiffres
   « faux plusieurs jours de suite », un déficit fabriqué par construction aux
   scénarios 3 et 5 jusqu'au 23 septembre 2026, une TVA à taux unique ajoutée
   puis retirée le 24 septembre). Les valeurs du 17 novembre ne sont pas stabilisées.
5. Solde 2025 du scénario 2 : +9,22 % du PIB (276 Md€) et coefficient d'équilibre
   2,52. Ces chiffres sont arithmétiquement cohérents mais économiquement sans
   portée pour un budget : le scénario est un contrefactuel sans transition.
6. Coïncidence à vérifier : l'économie du scénario 3 en 2070 (8,1 points,
   314 Md€) est égale au coût du scénario 6 la même année (8,1 %, 314 Md€). Les
   deux sont des lectures distinctes, mais l'identité de deux chiffres sur deux
   colonnes mérite un contrôle de copier-coller avant citation.
7. Le scénario 3 « n'économise en 2026 que la réversion, qu'il cesse de servir à
   la bascule », alors que les pensions déjà liquidées sont servies « telles
   quelles, majorations pour enfants comprises ». Le sort de la réversion pour les
   retraités actuels est ambigu dans le texte.

### 4.4 Autres observations

- La séparation entre « ce que dit la loi » et « ce que dit la proposition » est
  soignée (avertissements, états de fiabilité propagés jusqu'au résultat).
- Le périmètre du coût est le « système de retraite » du COR (dépenses 13,86 %
  du PIB en 2024, régimes légalement obligatoires, FSV compris) contre 13,59 %
  pour la répartition obligatoire de la DREES : deux périmètres voisins à 0,28
  point, qu'il faut choisir et nommer.
- Le dépôt ne modélise pas : la capitalisation obligatoire dans le coût de la
  répartition (RAFP et assurances sociales de 1930 sorties des six totaux), le
  bouclage macroéconomique, les effets comportementaux, les collectivités locales
  en tant que bloc (la CNRACL est traitée comme régime, pas comme budget).

## 5. Ce que le simulateur budgétaire peut en tirer

Constat de départ sur le simulateur budgétaire (lu dans cette branche,
`src/projection-engine-v1.8.js`, `src/policy-impact.js`) : le levier
« comptes notionnels » existant est une forme réduite, un booléen qui retire
6 % de la masse de pensions (303,4 Md€) en 15 ans à partir de 2027
(`PENSION_REFORM.notionnel`), étiqueté « Swedish notional accounts », avec pour
seule source « francetdb.com, COR 2024 ». Aucune mécanique de compte, de
diviseur ou d'indexation n'y figure. Les autres leviers sont l'âge de départ (base
64 ans, −2,5 % de masse par année au-dessus, montée en charge sur 8 ans), la
désindexation (0,5 point de revalorisation par point) et un plafond de hautes
pensions. Le préréglage `reformeRetraites` combine âge 67, notionnel,
désindexation 1,5 et plafond 15 %. À signaler : la base de 64 ans ne correspond
pas à la référence annoncée pour ce travail (loi actuelle, réforme de 2023
suspendue par la LFSS 2026 jusqu'en janvier 2028) ; ce n'est pas corrigé ici.

Écart de grandeur à connaître : le site trouve, pour le scénario 3 (bascule 2026,
droits acquis conservés), 25,2 % de dépense cumulée en moins sur 2025-2070 et
−53 % de dépense en 2070 (282 contre 596 Md€) ; le levier existant retire 6 %. Le
dépôt prévient que ces écarts ne sont pas des économies : le coefficient
d'équilibre de 1,65 dit que le système a une marge, qu'un compte notionnel réel
redistribuerait en relevant les pensions. Importer le chiffre brut comme
économie budgétaire serait un contresens que le site dénonce lui-même.

### 5.1 Comme préréglage

Correspondance avec les leviers existants :

| Paramètre du site | Levier du simulateur | Correspondance |
|---|---|---|
| Âge de référence / légal 65 ans (scénario 6 uniquement ; les scénarios 2 à 5 gardent les âges du droit en vigueur) | `retirementAge` | directe : 65 |
| Passage aux comptes, bascule 2026 | `notionnel` (booléen, début 2027) | directe pour le principe ; date à décaler d'un an ou à aligner sur janvier 2028 (reprise de la réforme) |
| Indexation du compte et de la pension sur la masse salariale (défaut), ou prix, ou triple lock inversé | `desindexation` (points sous la revalorisation de référence) | partielle : la masse salariale est au-dessus des prix (de 0,7 point par an dans le dépôt), donc un levier négatif ou nul, jamais une désindexation. Le triple lock inversé littéral est un cas extrême (1,5 % de pouvoir d'achat sur 1941-2025), non transposable |
| Pas de plafond, pas de minimum | `pensionCap` | aucune correspondance : laisser à 0 |
| Conversion des droits acquis, diviseur, table de mortalité, part patronale, taux unique 18 %, capitalisation, garantie vieillesse, LVT | rien | hors périmètre des leviers retraite ; ne pas reprendre dans le préréglage (le taux unique, la capitalisation et la LVT relèvent d'autres blocs et de choix de programme) |

Deux voies :

- Voie A, minimale : préréglage « Comptes notionnels (à partir de 2028) »
  = `{ retirementAge: 65, desindexation: 0, pensionCap: 0, notionnel: true }`, sans
  changer le moteur. Le libeller comme forme réduite et non comme reproduction du
  site, avec la mention de la limite ci-dessus. Effort : 1 à 2 jours (préréglage,
  tests de régression `toBe`, texte d'hypothèses, ARCHITECTURE.md).
- Voie B, recalibrage : remplacer 6 % / 15 ans par une trajectoire de rapport de
  masses issue d'une source citable. Le site ne la publie pas année par année pour
  les scénarios 3 et 5 : `data/derive/equilibre.json` ne porte que le système
  actuel et trois variantes (scénarios 2, 4, 6 sous des noms propres) ; les
  scénarios 3 et 5 se lisent en 2026, 2070 et en cumul dans le README, ou se
  recalculent avec le moteur. Effort : 4 à 6 jours, plus un recoupement
  indépendant (COR, DREES) pour atteindre la confiance « medium » exigée par la
  liste de contrôle académique. Sans cela, la confiance reste « low ».

Recommandation : voie A maintenant, voie B seulement si le recoupement
indépendant est faisable.

### 5.2 Comme module (contrat décrit en tête de ce travail)

Ce que le site peut fournir, par rubrique du contrat :

| Rubrique du contrat | Fourni par le site ? |
|---|---|
| Identité, sources, statut | oui pour l'identité et les sources ; statut : « non validé » (aucune validation externe indépendante, éditeur partisan, chiffres instables) |
| Leviers (id, unité, bornes, défaut, aide) | proposables à partir de `Parametres` : année de bascule, âge de référence, règle d'indexation (masse salariale / prix / PIB lissé / triple lock inversé), conversion des droits acquis (référence / liquidation), maintien ou non des avantages non contributifs, part patronale au compte |
| Effets ex ante par année, en % du PIB, par bloc | partiellement : la différence de coût entre un scénario et le système actuel, en % du PIB, année par année jusqu'en 2070, au niveau du système de retraite entier. Pas de ventilation en État / Sécurité sociale / collectivités dans les sorties publiées. Les éléments d'une ventilation existent dans les données (contribution d'équilibre de l'État pour les fonctionnaires, 82,28 % du traitement en 2026 ; contribution CNRACL ; régimes de base et complémentaires), mais le dépôt ne les agrège pas ainsi ; il faudrait refaire tourner ou porter le moteur |
| Coefficient de réponse comportementale | non : modèle statique ; aucune élasticité de l'offre de travail ou de l'âge de départ (seule une « part des reportés en emploi » de 50 % existe, pour le scénario 6) |
| Catégorie de multiplicateur de demande | non : à fixer de notre côté (transferts aux ménages) |
| Effet de niveau sur le PIB (bas, central, haut) | non : PIB et emploi du COR, effet nul par construction. Les trois valeurs devraient venir d'une autre source |
| Textes explicatifs | oui, très riches, mais sous CC BY-SA 4.0 et dans la voix du parti (voir § 3 et 6) |
| Ne jamais écrire dans la dette ni les intérêts | compatible : le dépôt calcule un « solde cumulé » du système mais celui-ci peut être ignoré |

Trois façons d'en faire un module :

1. Ingérer les séries publiées (coût annuel par scénario en % du PIB) comme table
   statique. Effort : 5 à 8 jours (extraction, ventilation par bloc par
   hypothèse, texte, tests). Déconseillé : les séries dérivées n'ont pas de
   licence claire, leur périmètre est celui du COR et non du budget État + ASSO,
   et elles changent de semaine en semaine.
2. Construire notre propre module de comptes notionnels réduit (cohortes,
   diviseur, indexation, bascule) en JavaScript, alimenté par les sources
   primaires et validé par comparaison aux ordres de grandeur du site comme
   contrôle externe, non comme entrée. Effort : 20 à 30 jours, avec ventilation
   par bloc et plages basse/centrale/haute, plus la revue de sécurité exigée.
3. Porter le moteur du dépôt : environ 160 000 lignes réparties sur deux langages,
   dont un portage JavaScript déjà existant. Déconseillé : 40 jours et plus,
   charge de maintenance disproportionnée, données de 6 Mo, évolution rapide du
   dépôt amont.

Recommandation : pas de module tant que le préréglage (voie A) n'est pas stabilisé ;
si un module est voulu, la voie 2, avec le site en contrôle croisé.

### 5.3 Comme données

Réutilisables à la source, sans passer par le dépôt (à vérifier par série) :

- projections de dépenses et ressources du système de retraite du COR (compte
  « système de retraite », 13,86 % du PIB en 2024), dépenses observées de la
  DREES (13,59 %), structure des ressources et transferts (branche famille,
  Unédic, FSV) : utiles pour calibrer le périmètre du bloc Sécurité sociale ;
- tables de mortalité INSEE (génération, niveau de vie) pour un diviseur ;
- masse salariale D11 (INSEE) pour la règle d'indexation de référence ;
- contributions employeur des régimes publics (Cour des comptes, CAS Pensions)
  pour la ventilation État / collectivités.

À ne pas reprendre sans accord écrit : les fichiers dérivés du modèle
(`data/derive/*`, `docs/chiffrage_plf.csv`, `moteur/donnees.json`).

Bonne pratique à reprendre : le manifeste de sources avec statut de
rediffusion et empreinte, et l'échelle de fiabilité propagée jusqu'au résultat,
comme modèle pour la fiche source de nos modules.

Effort : 3 à 5 jours pour récupérer et documenter les séries primaires utiles ;
confiance : élevée sur le principe, moyenne sur le calage de périmètre.

Les efforts sont des ordres de grandeur en jours-personne, à ±50 %, pour un
développeur qui connaît déjà la base de code du simulateur.
