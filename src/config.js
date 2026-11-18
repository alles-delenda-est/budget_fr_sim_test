// Configuration de la version de relecture.

/** Lien vers le canal de commentaires des relecteurs (formulaire, courriel « mailto: », etc.). Vide : le lien est masqué. */
export const COMMENT_URL = ''

/**
 * Seuils des avertissements « trajectoire hors de l'expérience historique » (page Simulateur budgétaire).
 * Une seule source : toute modification se fait ici.
 */
export const WARNING_THRESHOLDS = {
  /**
   * Palier 1 : dette en % du PIB au-delà du plus haut niveau jamais atteint par une économie avancée.
   * Repère : Japon, dette brute des administrations publiques 258,4 % du PIB en 2020 (FMI, World Economic Outlook, série
   * FRED GGGDTAJPA188N). Le seuil est arrondi à 260 %. L'énoncé ne porte que sur les économies avancées : des pays à faible
   * revenu ont connu des ratios très élevés (Liban ≈ 358 % en 2021, Irak ≈ 344 % en 2004, agrégateurs de données du FMI).
   */
  tier1DebtPct: 260,
  /** Repère affiché dans le texte du palier 1 (Japon 2020, FMI) ; arrondi de 258,4. */
  tier1ReferencePct: 258,
  tier1ReferenceYear: 2020,
  /** Palier 2 : dette en % du PIB. */
  tier2DebtPct: 500,
  /** Palier 2 : intérêts en % des recettes publiques. */
  tier2InterestShareRevenuePct: 50,
  /** Règle générale : toute grandeur affichée en % du PIB (dette, intérêts, solde en valeur absolue) au-dessus de ce seuil déclenche le palier 2. */
  tier2GdpFigurePct: 500,
}
