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
