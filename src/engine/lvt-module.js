// Module « Taxe sur la valeur du sol » (LVT) — forme minimale du Day 0, statut « non validé ».
// Spécification : docs/review-lvt-module.md §5.2 ; décisions D2, D9, D11, D12 (docs/model-note.md §7 et §8).
// Contrat de module (src/engine/modules.js) : n'écrit jamais dans la dette ni dans les intérêts.
//
// Mécanisme :
//   - Données : instantané daté de yields.json de LVTShift (src/engine/lvt-snapshot.js), converti en part du PIB 2025
//     (`base.pib.2025`), constant en part de PIB comme les leviers (E2). Effet dès 2027 (t = 1, D1).
//   - Rendement égal : chaque impôt supprimé est remplacé par la taxe sur la valeur du sol, niveau par niveau.
//     Bloc local : impôts locaux supprimés et part locale (et départementale) de la nouvelle taxe s'annulent ; a(locales) = 0,
//     les flux bruts s'affichent (flux[], D9).
//   - D11 : la part nationale de la taxe va à l'État. En S2 et S3, la sécurité sociale perd sa part des prélèvements sociaux
//     sur les plus-values et les loyers remplacés (clé `lvt.ps.cle_etat`) ; l'État la gagne : a(sécu) < 0, a(centrales) > 0,
//     nul au consolidé.
//   - D12 : capitalisation de la nouvelle taxe nationale dans le prix du sol. Valeur capitalisée = taxe nationale additionnelle /
//     taux réel ; part d'assiette perdue = valeur capitalisée / valeur foncière × part capitalisée ; perte de produit = part perdue
//     × produit total de la nouvelle taxe. À taux fixé, chaque niveau perd au prorata de sa part du produit : part locale et
//     départementale -> a(locales) < 0, part nationale -> a(centrales) < 0 (D11 n'affecte à l'État que le produit national). Taxe nationale additionnelle = part nationale du scénario
//     moins celle de S1 (frais de gestion de l'État, déjà prélevés sur l'avis de taxe foncière, donc déjà capitalisés) :
//     S1 n'a pas d'effet de capitalisation (échange entre impôts fonciers, revue §4.4).
//     Montée en charge sur LVT_CAPI_RAMP_YEARS = 3 ans (hypothèse de l'implémentation : les valeurs servant d'assiette sont
//     révisées avec retard sur les prix).
//   - yS : bas 0, central 0 (D2). Haut = borne de l'OCDE (revue §4.3) pour S2 et S3, 0 pour S1, seulement si le levier
//     `offre_ocde` vaut 1 (désactivé par défaut, « non validé ») ; montée en charge offre.lag.lvt / offre.t0.lvt.
//   - theta = 0 ; aucun multiplicateur de demande (m = 0), y compris pour la capitalisation : l'effet de richesse de la baisse
//     du prix du sol (canal patrimonial) n'est pas modélisé, et aucune catégorie existante ne représente ce canal.

import { LVT_SCENARIO_BY_CODE, LVT_PRELEVEMENTS_SOCIAUX as PS } from './lvt-snapshot.js'
import { supplyPhase } from './supply.js'
import { PARAM_BY_ID } from './params.js'
import { START_YEAR } from './project.js'

/** Code du levier : 0 = inactif, 1 = S1, 2 = S2 sans IFI, 3 = S2 avec IFI, 4 = S3 sans IFI, 5 = S3 avec IFI. */
export const LVT_SCENARIO_CODES = [0, 1, 2, 3, 4, 5]
/** Montée en charge de la capitalisation (D12) : 1/3 en 2027, 2/3 en 2028, plein effet en 2029 (hypothèse). */
export const LVT_CAPI_RAMP_YEARS = 3
/** Année d'entrée en vigueur (t = 1, soit 2027, D1). */
export const LVT_START_T = 1
/** Année civile d'entrée en vigueur (START_YEAR + LVT_START_T). */
export const LVT_START_YEAR = START_YEAR + LVT_START_T
/** Paramètres de params.js lus par le module (affichés dans « Hypothèses utilisées » quand il est actif). */
export const LVT_PARAM_IDS = ['base.pib.2025', 'lvt.base_fonciere.2025', 'lvt.capi.part', 'lvt.capi.taux_actualisation', 'lvt.ps.cle_etat', 'lvt.ys.ocde_par_point', 'fisc.eps_offre', 'offre.lag.lvt', 'offre.t0.lvt']
/** Scénario de référence pour la part nationale « déjà foncière » (frais de gestion) : S1. */
const S1 = LVT_SCENARIO_BY_CODE[1]

const code = (v) => {
  const c = Math.round(Number(v))
  return LVT_SCENARIO_CODES.includes(c) ? c : 0
}

/** Rampe de capitalisation à l'année t (0 avant 2027, puis 1/3, 2/3, 1). */
export const capiRamp = (t) => (t < LVT_START_T ? 0 : Math.min(1, (t - LVT_START_T + 1) / LVT_CAPI_RAMP_YEARS))

/**
 * Composantes du module en régime permanent (fractions du PIB 2025), pour un code de scénario et des paramètres.
 * @returns {null | { scenario, pib, totalNouvelle, local, departemental, national, secuPerte, nationalAdditionnel,
 *   valeurCapitalisee, partAssiettePerdue, capitalisation, capiLocales, capiCentrales, ysHaut }}  montants en Md€ ;
 *   capitalisation ≤ 0 (Md€) = capiLocales + capiCentrales, réparties au prorata des niveaux du produit de la nouvelle taxe.
 */
export function lvtComponents(scenarioCode, P, { capiPart = P['lvt.capi.part'], tauxPct = P['lvt.capi.taux_actualisation'] } = {}) {
  const s = LVT_SCENARIO_BY_CODE[code(scenarioCode)]
  if (!s) return null
  const pib = P['base.pib.2025']
  // Produit de la nouvelle taxe = somme des trois niveaux (yields.json arrondit son total : écart ≤ 0,1 Md€, voir LVT_SNAPSHOT_META).
  const totalNouvelle = s.local + s.departemental + s.national
  const psTotal = (s.plusValues ? PS.plusValues.montant : 0) + (s.revenusLocatifs ? PS.revenusLocatifs.montant : 0)
  const secuPerte = psTotal * (1 - P['lvt.ps.cle_etat'])
  const nationalAdditionnel = Math.max(0, s.national - S1.national)
  const r = tauxPct / 100
  const valeurCapitalisee = r > 0 ? nationalAdditionnel / r : 0
  const partAssiettePerdue = Math.min(1, Math.max(0, (valeurCapitalisee / P['lvt.base_fonciere.2025']) * capiPart))
  const capitalisation = partAssiettePerdue > 0 ? -partAssiettePerdue * totalNouvelle : 0
  // À taux fixé, la perte d'assiette touche chaque niveau au prorata de son produit (revue §4.4) : local + départemental -> locales.
  const capiLocales = partAssiettePerdue > 0 ? -partAssiettePerdue * (s.local + s.departemental) : 0
  const capiCentrales = partAssiettePerdue > 0 ? -partAssiettePerdue * s.national : 0
  // Borne OCDE (revue §4.3) : effet en % du PIB = coefficient × part des prélèvements obligatoires déplacée (en points) ;
  // prélèvements obligatoires = fisc.eps_offre × PIB 2025 (≈ 1 304 Md€ ; la revue retient ≈ 1 290). En fraction : coef × nA / PO.
  const ysHaut = P['lvt.ys.ocde_par_point'] * nationalAdditionnel / (P['fisc.eps_offre'] * pib)
  return {
    scenario: s, pib, totalNouvelle, local: s.local, departemental: s.departemental, national: s.national,
    secuPerte, nationalAdditionnel, valeurCapitalisee, partAssiettePerdue, capitalisation, capiLocales, capiCentrales, ysHaut,
  }
}

// Textes fixes générés depuis params.js (aucune valeur recopiée en dur).
const fr = (v, d) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
const QP = (id) => PARAM_BY_ID[id]
const CAPI = QP('lvt.capi.part')
const TAUX = QP('lvt.capi.taux_actualisation')
const CLE = QP('lvt.ps.cle_etat').value
const TXT_CAPI = `part capitalisée ${fr(CAPI.value, 2)} (fourchette ${fr(CAPI.low, 2)} à ${fr(CAPI.high, 2)}, valeur centrale à valider), taux réel ${fr(TAUX.value, 1)} % (${fr(TAUX.low, 0)} à ${fr(TAUX.high, 0)} %)`
const TXT_CLE = `clé État / sécurité sociale de ${fr(CLE * 100, 1)} % / ${fr((1 - CLE) * 100, 1)} %, non vérifiée`

const fmtMd = (v) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v)
const fmtPct = (v) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

export const LVT_MODULE = {
  id: 'taxe_valeur_sol',
  titre: 'Taxe sur la valeur du sol (non validé)',
  statut: 'non validé',
  sources: [
    'LVTShift (alles-delenda-est/LVTShift), yields.json, commit 322190e du 12 novembre 2026 : rendements à remplacer par scénario et par niveau (instantané figé, src/engine/lvt-snapshot.js)',
    'Revue du module taxe sur la valeur du sol, 17 novembre 2026 (docs/review-lvt-module.md) [S26] : blocs, clé des prélèvements sociaux (§2.3), borne OCDE (§4.3), capitalisation (§4.4)',
    'Note de modèle, décisions D2, D9, D11 et D12 (docs/model-note.md §7 et §8)',
    'OCDE, Arnold et al. (2011, Economic Journal 121), cité par O\'Connor et al. (2016) : seule borne chiffrée d\'effet sur le PIB, non robuste',
  ],
  leviers: [
    {
      id: 'scenario',
      unite: 'code (0 à 5)',
      bornes: [0, 5],
      defaut: 0,
      aide: `0 = module inactif ; 1 = S1 (taxe foncière, THRS, DMTO) ; 2 = S2 sans IFI (+ plus-values immobilières) ; 3 = S2 avec IFI ; 4 = S3 sans IFI (+ revenus locatifs) ; 5 = S3 avec IFI. Remplacement à rendement égal dès ${LVT_START_YEAR}.`,
    },
    {
      id: 'offre_ocde',
      unite: 'booléen (0 ou 1)',
      bornes: [0, 1],
      defaut: 0,
      aide: 'Inclut (1) la borne haute de l\'OCDE dans le cas « haut » des effets d\'offre (S2 et S3 seulement). Non validé ; désactivé par défaut (D2). Bas et central restent nuls.',
    },
  ],
  calculer({ scenario, offre_ocde }, contexte) {
    const P = contexte.params
    const n = contexte.nYears + 1
    const c = lvtComponents(scenario, P)
    const ocde = offre_ocde >= 0.5
    if (!c) {
      return {
        annees: Array.from({ length: n }, () => ({ a: { centrales: 0, securiteSociale: 0, locales: 0 }, theta: 0, m: 0, yS: { bas: 0, central: 0, haut: 0 } })),
        flux: [],
        explications: ['Module taxe sur la valeur du sol inactif.'],
      }
    }
    const { pib, secuPerte, capitalisation, capiLocales, capiCentrales } = c
    const hasCapi = capitalisation !== 0
    const L = P['offre.lag.lvt']
    const t0 = P['offre.t0.lvt']
    const annees = Array.from({ length: n }, (_, t) => {
      const on = t >= LVT_START_T ? 1 : 0
      const transfert = (secuPerte / pib) * on
      const ramp = capiRamp(t)
      const capiC = (capiCentrales / pib) * ramp
      const capiL = (capiLocales / pib) * ramp
      const haut = ocde ? c.ysHaut * supplyPhase(t - LVT_START_T, L, t0) : 0
      return {
        a: { centrales: transfert + capiC, securiteSociale: 0 - transfert, locales: 0 + capiL }, // 0 − x, 0 + x : jamais de −0
        theta: 0,
        m: 0, // pas d'effet de demande : l'effet de richesse de la baisse du prix du sol n'est pas modélisé
        yS: { bas: 0, central: 0, haut },
      }
    })
    const s = c.scenario
    const remplaces = ['frais de gestion']
    if (s.plusValues) remplaces.push('IR et prélèvements sociaux (part État) sur plus-values')
    if (s.revenusLocatifs) remplaces.push('IR et prélèvements sociaux (part État) sur loyers')
    if (s.ifi) remplaces.push('IFI')
    const flux = [
      { libelle: 'Impôts locaux supprimés (TFPB, TFPNB, THRS, taxes annexes, DMTO communaux)', bloc: 'locales', montant: -s.local / pib },
      { libelle: 'DMTO départementaux supprimés', bloc: 'locales', montant: -s.departemental / pib },
      { libelle: 'Taxe sur la valeur du sol : part communale et intercommunale', bloc: 'locales', montant: s.local / pib },
      { libelle: 'Taxe sur la valeur du sol : part départementale', bloc: 'locales', montant: s.departemental / pib },
      { libelle: `Recettes de l'État supprimées (${remplaces.join(' ; ')})`, bloc: 'centrales', montant: -(s.national - secuPerte) / pib },
      { libelle: 'Taxe sur la valeur du sol : part nationale (État, D11)', bloc: 'centrales', montant: s.national / pib },
    ]
    if (secuPerte > 0) flux.push({ libelle: 'CSG et prélèvements sociaux supprimés (part sécurité sociale, D11)', bloc: 'securiteSociale', montant: -secuPerte / pib })
    const explications = [
      `${s.libelle} : ${fmtMd(c.totalNouvelle)} Md€ de taxe sur la valeur du sol (${fmtPct(c.totalNouvelle / pib * 100)} % du PIB 2025) remplacent le même montant d'impôts, dès ${contexte.startYear + LVT_START_T}${Math.abs(c.totalNouvelle - s.total) > 1e-9 ? ` (total publié par LVTShift : ${fmtMd(s.total)} Md€, écart d'arrondi)` : ''}.`,
      secuPerte > 0
        ? `D11 : la sécurité sociale perd ${fmtMd(secuPerte)} Md€ (${fmtPct(secuPerte / pib * 100)} % du PIB) de CSG et de prélèvements sociaux ; l'État reçoit la part nationale de la taxe et gagne ce montant. Effet nul au consolidé.`
        : 'D11 : aucun prélèvement social n\'est remplacé dans ce scénario ; aucun transfert entre l\'État et la sécurité sociale.',
      hasCapi
        ? `D12 : capitalisation de ${fmtMd(c.nationalAdditionnel)} Md€ de taxe nationale additionnelle, soit ${fmtMd(c.valeurCapitalisee)} Md€ de valeur du sol (${fmtPct(c.partAssiettePerdue * 100)} % de l'assiette après part capitalisée) : perte de produit de ${fmtMd(-capitalisation)} Md€ (${fmtPct(-capitalisation / pib * 100)} % du PIB) à plein effet en ${contexte.startYear + LVT_START_T + LVT_CAPI_RAMP_YEARS - 1}, dont ${fmtMd(-capiLocales)} Md€ pour les collectivités et ${fmtMd(-capiCentrales)} Md€ pour l'État (au prorata de leur part du produit). L'effet de richesse de la baisse du prix du sol n'est pas modélisé (aucun effet de demande).`
        : 'D12 : pas d\'effet de capitalisation en S1 (échange entre impôts fonciers, déjà inscrits dans les prix).',
      ocde && c.ysHaut > 0
        ? `Cas « haut » des effets d'offre : borne de l'OCDE incluse (+${fmtPct(c.ysHaut * 100)} % du PIB à long terme), non validée.`
        : 'Effet d\'offre : nul (bas, central et haut).',
    ]
    return { annees, flux, explications }
  },
  explications: [
    'Ce module remplace des impôts existants par une taxe sur la valeur du sol, à rendement égal, selon trois scénarios de LVTShift (S1 : impôts fonciers locaux et DMTO ; S2 : en plus, l\'imposition des plus-values immobilières ; S3 : en plus, celle des revenus locatifs ; IFI en option). Les montants sont un instantané daté (12 novembre 2026), convertis en part du PIB 2025.',
    'LVTShift est un modèle de répartition (qui paie plus, qui paie moins, commune par commune) à produit constant. Il ne calcule aucun effet sur l\'activité. Le détail par commune n\'est pas repris ici.',
    'Aucune estimation de l\'effet sur le PIB français n\'a été trouvée. Le seul repère chiffré, de l\'OCDE, ne résiste pas aux tests de robustesse : l\'effet d\'offre est nul en bas et au centre ; la borne de l\'OCDE n\'entre dans le cas « haut » que si l\'option est cochée.',
    `D11 : la part nationale de la taxe va à l'État. La sécurité sociale perd sa part de CSG et de prélèvements sociaux sur les revenus remplacés (${TXT_CLE}). Montants retenus : plus-values de ${PS.plusValues.annee}, loyers de ${PS.revenusLocatifs.annee}, soit le bas de la fourchette de la revue (1,1 à 1,4 Md€ en S2, 3,1 à 3,4 Md€ en S3 avec les moyennes sur cinq ans). Le solde consolidé n'en est pas modifié.`,
    `D12 : la nouvelle taxe nationale se reporte en partie dans le prix du sol ; l'assiette baisse et, à taux fixé, le produit de chaque niveau aussi, au prorata de sa part (collectivités et État). Paramètres : ${TXT_CAPI} ; montée en charge sur ${LVT_CAPI_RAMP_YEARS} ans (hypothèse). C'est le seul effet du module sur le solde consolidé. L'effet de richesse de la baisse du prix du sol n'est pas modélisé : aucun effet de demande n'est associé à cette perte.`,
    'Limites : pas de transferts entre l\'État et les collectivités (compensations, fractions de TVA) ; DMTO très cycliques, pris en moyenne sur cinq ans ; écart de 0,3 Md€ entre deux sources sur la taxe foncière ; la valeur du sol imputée par LVTShift n\'a pas été auditée. Les impôts supprimés se capitalisent en sens inverse, ce qui n\'est pas modélisé.',
  ],
}
