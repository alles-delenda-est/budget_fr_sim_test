# Guide des hypothèses en langage clair — où concentrer votre attention

Ce guide résume, sans jargon ni symbole grec, les **228 paramètres** du simulateur : ce qui pèse vraiment sur les chiffres, ce qui relève d'un choix d'expert à valider, et ce qui est déjà solidement établi dans les sources officielles.

---

## Priorité 1 — Les 5 chiffres qui déplacent le plus les courbes

Sur la trajectoire tendancielle (sans réforme), **5 hypothèses** expliquent la quasi-totalité de la fourchette à 10 ans (en points de PIB de dette en 2036) :

1. **L'inflation de long terme (`macro.pi.long` — retenu : 1,85 %/an, fourchette 1,4 % à 2,4 %)**
   - *Effet 2036 :* **~13,5 points de PIB d'écart** entre le bas (168,0 %) et le haut (154,4 %).
   - *Pourquoi ça joue autant :* une inflation plus élevée fait monter le PIB en euros courants plus vite que le stock d'ancienne dette émis à taux fixe ; une inflation trop basse pèse mécaniquement sur le ratio dette/PIB.
2. **La tendance spontanée des dépenses hors retraites et santé (`ref.derive.b_autres` — retenu : +0,03 pt de PIB/an, fourchette 0 à +0,09)**
   - *Effet 2036 :* **~5,6 points de PIB d'écart** (158,5 % à 164,1 %) ; **~151 points à 30 ans**.
   - *Pourquoi ça joue autant :* estime de combien les « autres dépenses » (État, collectivités, aides, investissement) augmentent sans mesure nouvelle. Le chiffre est calculé directement sur les séries Eurostat 1995–2024 (médiane à 0,03 pt/an, marquée *calculé (estimation)*).
3. **La réaction des taux d'intérêt quand la dette augmente (`dette.beta` — retenu : 3 points de base par point de dette, fourchette 1 à 5)**
   - *Effet 2036 :* **~4,3 points de PIB** ; **> 700 points à 30 ans** entre la borne basse et la borne haute !
   - *Pourquoi ça joue autant :* si la dette monte fortement et que les marchés exigent une prime de risque plus élevée, l'effet « boule de neige » des intérêts domine tout à long terme.
4. **Le taux d'emprunt de l'État à long terme (`dette.y_long` — retenu : 4,89 %, fourchette 4,4 % à 5,3 %)**
   - *Effet 2036 :* **~4,6 points de PIB** (157,9 % à 162,5 %).
   - *Origine :* série Eurostat officielle d'octobre 2026 recoupée aux adjudications AFT.
5. **La croissance de fond de l'économie hors inflation (`macro.g.potentielle` — retenu : 1,05 %/an, fourchette 0,85 % à 1,15 %)**
   - *Effet 2036 :* **~4,1 points de PIB** (159,0 % à 163,1 %) ; **~74 points à 30 ans**.
   - *Origine :* médiane d'automne 2026 du FMI, de l'OCDE, de la Banque de France et de la Commission européenne.

---

## Priorité 2 — Les 3 choix de jugement à valider avant publication v1.0

1. **L'effet économique d'une hausse d'impôt sur le revenu (`ir`)** — *statut : non validé — avis demandé*
   - *Question simple :* quand on augmente l'impôt sur le revenu, est-ce que la baisse de travail ou d'heures travaillées réduit assez le PIB pour faire perdre une partie importante de la recette (voire coûter net à long terme) ?
   - *État actuel :* le curseur fonctionne et affiche explicitement le bandeau *« non validé — avis demandé »* partout où il apparaît (panneau des leviers, décomposition, note de synthèse).
2. **Les modules optionnels (taxe sur la valeur du sol LVT & comptes notionnels NDC)** — *statut : non validé*
   - Désactivés par défaut ; ne changent rien aux scénarios standards tant que l'utilisateur ne les coche pas explicitement.
3. **Ce que fait le modèle au-delà de 180 % et 260 % de dette à 30 ans**
   - Au-delà des niveaux historiquement observés en zone euro (~180 % PIB), prolonger la réaction linéaire des taux est une convention arithmétique signalée automatiquement par des bandeaux gradués et le grisé au-delà du palier 2.

---

## Priorité 3 — Ce qui est déjà solidement établi (rien à refaire)

- **214 paramètres sur 228** proviennent directement de sources institutionnelles primaires (Insee comptes 2025, DGFiP Statistiques n° 53, CCSS oct. 2026, AFT adjudications 2026, COR juin 2026, Commission européenne *Ageing Report* & *AMECO*, Banque de France, FMI, OCDE, Unédic).
- **0 paramètre** en statut *« de mémoire »*, *« à collecter »* ou *« à valider »*.
- **Exactitude comptable vérifiée :** la décomposition du solde par cause et la ventilation par bloc APU / groupe payeur (`G1`–`G5`) bouclent à moins de `10⁻⁶ Md€` sur l'ensemble des horizons et des combinaisons testées.

---

## Liste de lancement (3 minutes quand vous décidez d'ouvrir au public)

1. Renseigner `COMMENT_URL` dans `src/config.js` (adresse courriel `mailto:` ou formulaire de retours).
2. Retirer `<meta name="robots" content="noindex, nofollow" />` dans `index.html` et ouvrir `public/robots.txt` (`Allow: /`) pour autoriser l'indexation.
3. Quand la revue externe est terminée : passer `package.json` à `1.0.0`, ajuster/retirer `ReviewBanner` dans `src/components/ReviewBanner.jsx`, et promouvoir `day1` → `main`.
