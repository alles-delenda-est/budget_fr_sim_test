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
   à tout l'immobilier pour un prix de terrain seul. Le recettes projetées gardent
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
