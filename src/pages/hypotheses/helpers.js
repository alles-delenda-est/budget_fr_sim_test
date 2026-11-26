// Fonctions pures de la page « Hypothèses & Paramètres » (moteur v2) :
// comptes 2025, COFOG, équations E1–E12, catalogue des leviers et effets d'offre σ,
// regroupement complet des paramètres PARAMS, formatage sans NaN et questions aux relecteurs.

import { PARAMS, PARAM_BY_ID, resolveParams, macroGrowthSourceLabel } from '../../engine/params.js'
import { LEVERS, staticYield } from '../../engine/levers.js'

export { macroGrowthSourceLabel }
import { SUPPLY_BY_LEVER, sigmaFiscal, sigmaFiscalCase } from '../../engine/supply.js'
import { IR_TRANCHES, irTranches, thetaIrTranches, thetaReelIr, facteurCsgDeductible } from '../../engine/ir-tranches.js'
import { deriveBAutres, deriveMPrestations } from '../../engine/internal-derivations.js'
import { lvtComponents } from '../../engine/lvt-module.js'
import { LVT_PROVENANCE } from '../../engine/lvt-snapshot.js'
import { START_YEAR, RATE_MAX, HORIZONS, projectScenario } from '../../engine/project.js'
import { fmt, isFlagged, paramRange, BLOCK_LABELS } from '../budget/helpers.js'

const APU_BLOCK_SPECS = [
  { id: 'centrales', label: 'Administrations centrales (État et ODAC)' },
  { id: 'locales', label: 'Collectivités locales (APUL)' },
  { id: 'secu', label: 'Sécurité sociale (ASSO)' },
  { id: 'apu', label: 'Total APU consolidé', isTotal: true },
]

/** Tableau des comptes 2025 des administrations publiques (Insee), dérivé de PARAMS. */
export function buildApu2025Accounts(P) {
  const rows = APU_BLOCK_SPECS.map((b) => ({
    ...b,
    depenses: P[`base.depenses.${b.id}`],
    interets: P[`base.interets.${b.id}`],
    solde: P[`base.solde.${b.id}`],
    recettes: P[`base.recettes.${b.id}`],
    soldeRatio: (P[`base.solde.${b.id}`] / P['base.pib.2025']) * 100,
  }))
  const nonConsolDepenses = P['base.depenses.centrales'] + P['base.depenses.locales'] + P['base.depenses.secu']
  const interBlockTransfers = nonConsolDepenses - P['base.depenses.apu']
  return { rows, nonConsolDepenses, interBlockTransfers }
}

const COFOG_LABELS = {
  protection_sociale: 'Protection sociale',
  sante: 'Santé',
  services_generaux: 'Services généraux (dont charge de la dette)',
  affaires_economiques: 'Affaires économiques',
  enseignement: 'Enseignement',
  defense: 'Défense',
  ordre_securite: 'Ordre et sécurité publics',
  culture: 'Loisirs, culture, culte',
  logement: 'Logement et équipements collectifs',
  environnement: 'Protection de l\'environnement',
}

/** Dépenses par fonction COFOG 2024 (Insee), triées par montant décroissant. */
export function buildCofogRows(P) {
  return PARAMS
    .filter((q) => q.id.startsWith('base.cofog.'))
    .map((q) => {
      const slug = q.id.replace('base.cofog.', '')
      return { id: q.id, label: COFOG_LABELS[slug] ?? slug, value: P[q.id], unit: q.unit, status: q.status }
    })
    .sort((a, b) => b.value - a.value)
}

/** Équations E1–E12 du moteur v2 (source : docs/model-note.md §2), valeurs numériques lues dans P. */
export function buildEquations(P) {
  const betaLo = PARAM_BY_ID['dette.beta'].low
  const betaHi = PARAM_BY_ID['dette.beta'].high
  return [
    { id: 'E1', titre: 'PIB de référence', formule: 'Yb(t) = Yb(t−1) × (1 + g(t) + π(t))', detail: `Croissance réelle g = ${macroGrowthSourceLabel()} pour 2026–2027, puis croissance potentielle ; inflation π exogène.` },
    { id: 'E2', titre: 'Leviers en part de PIB', formule: 'a(j,t) = signe × rendement(j) × x(j) × rampe(j,t) / Y(2025)', detail: 'Chaque mesure reste indexée sur le PIB de référence ; a > 0 améliore le solde.' },
    { id: 'E3', titre: 'Réaction comportementale (θ non réel)', formule: 'effet ex post = (1 − θ_non_réel(t)) × a(j,t) ; θ_non_réel = max(0, θ − θ_réel × phase(t))', detail: `θ symétrique en paramètres et évalué au taux après réforme. Quand σ ≠ 0, la part réelle (déjà comptée par E5 + E7) est retirée pour éviter tout double compte. Dépenses : θ = 0, sauf effets de report sociaux sur l'âge légal (comp.offset.age_legal = ${fmt(P['comp.offset.age_legal'] * 100, 0)} %, DREES/DARES) et décalage sur prestations (comp.offset.prestations = ${fmt(P['comp.offset.prestations'] * 100, 0)} % par défaut, IPP n° 129).` },
    { id: 'E4', titre: 'Demande en niveau qui s\'estompe', formule: 'yD(t) = − Σ_j m_j × Σ_{k ≤ t} Δa(j,k) × λ^(t−k)', detail: `Un choc permanent de 1 % du PIB réduit le PIB de m % la première année, puis l'écart se referme au rythme λ = ${fmt(P['dem.lambda'], 1)}.` },
    { id: 'E5', titre: 'Effets d\'offre explicites (σ)', formule: 'yS_j(t) = σ_j × taille_j(t) × clamp((τ − t0_j) / (L_j − t0_j), 0, 1)', detail: 'Effet durable sur le niveau du PIB, ligne distincte par mesure (cas bas / central / haut). σ calculé pour les impôts (travail via e_L, IS via coût d\'usage) et décidé sur revue de preuves pour l\'âge légal, l\'assurance chômage et l\'enseignement.' },
    { id: 'E6', titre: 'PIB effectif', formule: 'Y(t) = Yb(t) × (1 + yD(t) + yS(t))', detail: 'Combinaison de la trajectoire tendancielle, de l\'écart de demande et des effets d\'offre.' },
    { id: 'E7', titre: 'Passage au solde (D13)', formule: 'Δsolde_PIB(t) = ε × yD(t) + ε_offre × yS(t)', detail: `La demande passe par les stabilisateurs cycliques (ε = ${fmt(P['fisc.eps'], 1)}) ; l'offre passe par le taux de prélèvements obligatoires (ε_offre = ${fmt(P['fisc.eps_offre'] * 100, 1)} %), sans dépense cyclique induite.` },
    { id: 'E8', titre: 'Solde primaire par bloc', formule: 'sp(t) = spb(0) − d(t) + Σ_j (1 − θ_j) a(j,t) + ε yD(t) + ε_offre yS(t)', detail: `Dérive de référence d(t) = dA(t) (vieillissement COR retraites + santé Commission 2024, bloc ASSO) + dB(t) (autres dépenses : ${fmt(P['ref.derive.b_autres'], 2)} pt/an, estimation interne Eurostat 1995–2024).` },
    { id: 'E9', titre: 'Taux à l\'émission et prime β', formule: `i_new(t) = clamp(i* + β × (dette/PIB(t−1) − dette/PIB(2026)), 0 %, ${fmt(RATE_MAX * 100, 0)} %)`, detail: `Ancre i* pondérée BTF / OAT 2–8 ans / OAT 10 ans+. Pente linéaire β = ${fmt(P['dette.beta'], 0)} pb/pt (fourchette ${fmt(betaLo, 0)}–${fmt(betaHi, 0)}) au-delà du ratio de 2026 ; le plafond de ${fmt(RATE_MAX * 100, 0)} % porte sur le taux à l'émission total.` },
    { id: 'E10', titre: 'Taux moyen du stock de dette', formule: 'i_moy(t) = (1 − φ(t)) i_moy(t−1) + φ(t) i_new(t) ; φ = min(1, 1/M + max(0, ΔD)/D)', detail: `Inertie de la maturité moyenne M = ${fmt(P['dette.M'], 2)} ans plus part de dette nouvelle émise dans l'année.` },
    { id: 'E11', titre: 'Charge d\'intérêts et dette', formule: 'INT(t) = i_moy(t) × D(t−1) ; D(t) = D(t−1) + INT(t) − sp(t) × Yb(t)', detail: 'Ajustements stock-flux nuls ; charge d\'intérêts répartie entre les trois blocs selon leur part observée en 2025.' },
    { id: 'E12', titre: 'Chômage (loi d\'Okun)', formule: 'u(t) = u_ref − κ × 100 × (yD(t) + yS(t))', detail: `Une baisse de 1 % du PIB relève le taux de chômage de κ = ${fmt(P['emploi.kappa'], 1)} point (chômage de référence maintenu à ${fmt(P['base.chomage_ref'], 1)} %).` },
  ]
}

/** Décrit la répartition par bloc d'un levier. */
function formatBlocks(lever, P) {
  const shares = lever.blocs(P)
  const active = Object.entries(shares).filter(([, w]) => w > 0)
  if (active.length === 1) return BLOCK_LABELS[active[0][0]]
  return active.map(([b, w]) => `${BLOCK_LABELS[b]} (${fmt(w * 100, 0)} %)`).join(' · ')
}

/** Catalogue complet des leviers actifs avec rendement unitaire, rampe et σ (calculé ou décidé). */
export function buildLeverCatalog(P) {
  return LEVERS.map((l) => {
    const reg = SUPPLY_BY_LEVER[l.id]
    let supply = null
    if (reg?.sigmaFn) {
      const sg = sigmaFiscal(reg.sigmaFn, P)
      supply = {
        mode: 'calculé',
        low: sg.low,
        central: sg.value,
        high: sg.high,
        L: P[reg.L],
        t0: P[reg.t0] ?? 0,
        statut: reg.statut ?? null,
      }
    } else if (reg?.sigma) {
      const q = PARAM_BY_ID[reg.sigma]
      supply = {
        mode: 'décidé',
        low: q.low ?? P[reg.sigma],
        central: P[reg.sigma],
        high: q.high ?? P[reg.sigma],
        L: P[reg.L],
        t0: P[reg.t0] ?? 0,
        statut: q.status,
      }
    }
    const startYear = l.defaultRamp ? START_YEAR + l.defaultRamp.start : START_YEAR + 1
    const fullYear = l.defaultRamp ? startYear + l.defaultRamp.years - 1 : startYear
    let rampText = l.defaultRamp
      ? `Dès ${startYear}, rampe ${l.defaultRamp.years} ans (plein effet ${fullYear})`
      : `Plein effet dès ${startYear}`
    if (l.defaultRampDown) {
      const downStart = START_YEAR + l.defaultRampDown.start
      const downFull = downStart + l.defaultRampDown.years - 1
      rampText = `Hausse : dès ${startYear} (${l.defaultRamp.years} ans, plein effet ${fullYear}) · Baisse : dès ${downStart} (${l.defaultRampDown.years} ans, plein effet ${downFull})`
    }

    return {
      id: l.id,
      titre: l.titre,
      unite: l.unite,
      min: l.min,
      max: l.max,
      unitYield: staticYield(l, 1, P),
      unitYieldDown: l.asymmetric ? staticYield(l, -1, P) : null,
      blocsLabel: formatBlocks(l, P),
      statut: l.statut,
      rampText,
      supply,
    }
  })
}

/** Effet d'offre décidé pour le module LVT (hors catalogue des leviers natifs). */
export function lvtSupplyInfo(P) {
  const q = PARAM_BY_ID['offre.sigma.lvt']
  return {
    id: q.id,
    low: q.low,
    central: P['offre.sigma.lvt'],
    high: q.high,
    L: P['offre.lag.lvt'],
    t0: P['offre.t0.lvt'],
    unit: q.unit,
    status: q.status,
    explanation: q.explanation,
  }
}

/** Formate la valeur centrale et la fourchette d'un paramètre (nombre ou série annuelle), sans jamais afficher NaN. */
export function formatParamValue(q) {
  if (typeof q.value === 'number') return paramRange(q) || '—'
  if (q.value && typeof q.value === 'object') {
    const entries = Object.entries(q.value)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([y, v]) => `${y} : ${fmt(v, 1)} %`)
      .join(' · ')
    const lastYear = Object.keys(q.value).map(Number).sort((a, b) => a - b).at(-1)
    const lo = q.low?.[lastYear]
    const hi = q.high?.[lastYear]
    const range = Number.isFinite(lo) && Number.isFinite(hi) && (lo !== q.value[lastYear] || hi !== q.value[lastYear])
      ? ` (${lastYear} : bas ${fmt(lo, 1)} % / haut ${fmt(hi, 1)} %)`
      : ''
    return `${entries}${range}`
  }
  return '—'
}

/** Groupes logiques couvrant 100 % de PARAMS (aucun paramètre omis ni dupliqué). */
export const PARAM_GROUP_DEFS = [
  { id: 'macro', titre: 'Macroéconomie et chômage (E1, E12)', match: (id) => id.startsWith('macro.') || id === 'base.chomage' || id === 'base.chomage_ref' || id === 'emploi.kappa' },
  { id: 'ref', titre: 'Dérive de référence et point de départ 2026 (E8, D7)', match: (id) => id.startsWith('ref.') },
  { id: 'dem', titre: 'Demande et multiplicateurs (E4)', match: (id) => id.startsWith('dem.') },
  { id: 'infl', titre: 'Inflation endogène et répercussion TVA (E1b, Phase 3 opt-in)', match: (id) => id.startsWith('infl.') },
  { id: 'comp', titre: 'Réaction comportementale et fiscalité (E3)', match: (id) => id.startsWith('comp.') },
  { id: 'offre', titre: 'Effets d\'offre (E5)', match: (id) => id.startsWith('offre.') },
  { id: 'lvt', titre: 'Module taxe sur la valeur du sol (D11, D12)', match: (id) => id.startsWith('lvt.') },
  { id: 'fisc', titre: 'Stabilisateurs et prélèvements obligatoires (E7, D13)', match: (id) => id.startsWith('fisc.') },
  { id: 'dette', titre: 'Dette et taux d\'intérêt (E9–E10)', match: (id) => id.startsWith('dette.') },
  { id: 'rend', titre: 'Rendements statiques et étalons (§3.1)', match: (id) => id.startsWith('rend.') },
  { id: 'base', titre: 'Comptes de base 2025, agrégats et clés de bloc (§1)', match: (id) => (id.startsWith('base.') && !id.startsWith('base.cofog.') && id !== 'base.chomage' && id !== 'base.chomage_ref') || id.startsWith('bloc.') },
  { id: 'cofog', titre: 'Dépenses par fonction COFOG 2024 (§1.1)', match: (id) => id.startsWith('base.cofog.') },
  { id: 'cmp', titre: 'Comparateurs officiels (jamais des cibles, §1.2 et §5)', match: (id) => id.startsWith('cmp.') },
]

/** Partitionne tous les paramètres dans les groupes définis, avec filtre optionnel sur les statuts à vérifier. */
export function groupParams(params = PARAMS, { flaggedOnly = false } = {}) {
  const filtered = flaggedOnly ? params.filter((q) => isFlagged(q.status)) : params
  const assigned = new Set()
  const groups = PARAM_GROUP_DEFS.map((def) => {
    const items = filtered.filter((q) => {
      if (assigned.has(q.id)) return false
      if (def.match(q.id)) {
        assigned.add(q.id)
        return true
      }
      return false
    })
    return { id: def.id, titre: def.titre, items }
  })
  const extras = filtered.filter((q) => !assigned.has(q.id))
  if (extras.length > 0) groups.push({ id: 'autres', titre: 'Autres paramètres', items: extras })
  return groups.filter((g) => g.items.length > 0)
}

/** Compte total des paramètres et nombre de paramètres portant un statut à vérifier. */
export function paramStatusCounts(params = PARAMS) {
  const flagged = params.filter((q) => isFlagged(q.status)).length
  return { total: params.length, flagged, sourced: params.length - flagged }
}

const lastRow = (r) => r.total[r.total.length - 1]

/** Dette/PIB (%) en fin d'horizon 30 ans pour une pente β donnée (référence sans levier). */
export const debt30AtBeta = (beta) => lastRow(projectScenario({ horizon: 'trenteAns', overrides: { 'dette.beta': beta } })).debtRatio * 100

/** Écart de solde primaire (Md€) en fin d'horizon 30 ans dû à +1 % du produit de l'IR, pour une élasticité e_L donnée. */
export function irPrimaryGap30(eL, refRow = null) {
  const ref = refRow ?? lastRow(projectScenario({ horizon: 'trenteAns' }))
  const res = lastRow(projectScenario({ horizon: 'trenteAns', overrides: { 'offre.e_L': eL }, levers: { ir: 1 } }))
  return res.primaryBalance - ref.primaryBalance
}

/** Élasticité e_L qui annule l'écart de solde primaire à 30 ans d'une hausse de l'IR (bissection sur [0 ; 2 × haut]) ; null si aucun changement de signe. */
export function irBreakEvenEL(refRow = null) {
  const ref = refRow ?? lastRow(projectScenario({ horizon: 'trenteAns' }))
  let lo = 0
  let hi = 2 * PARAM_BY_ID['offre.e_L'].high
  let fLo = irPrimaryGap30(lo, ref)
  if (Math.sign(fLo) === Math.sign(irPrimaryGap30(hi, ref))) return null
  for (let k = 0; k < 14; k++) {
    const mid = (lo + hi) / 2
    const fMid = irPrimaryGap30(mid, ref)
    if (Math.sign(fMid) === Math.sign(fLo)) { lo = mid; fLo = fMid } else hi = mid
  }
  return (lo + hi) / 2
}

/**
 * Quatre questions ouvertes aux relecteurs (docs/model-note.md §12 ; la quatrième est la question 6 de la note). Toutes les valeurs viennent de PARAMS
 * ou d'une projection du moteur (aucun chiffre écrit en dur).
 */
export function buildReviewerQuestions() {
  const P = resolveParams()
  const eL = PARAM_BY_ID['offre.e_L']
  const tauIr = PARAM_BY_ID['comp.tau0.ir']
  const epsOffre = PARAM_BY_ID['fisc.eps_offre']
  const beta = PARAM_BY_ID['dette.beta']
  const endYear = HORIZONS.trenteAns.endYear
  const sigmaIr = sigmaFiscalCase('ir', P, 'value')
  const tr = irTranches(P)
  const tauImplicite = tr ? tr.tranches.reduce((a, r) => a + (r.taux / 100) * r.revenu, 0) / tr.total : Number.NaN
  const ref30 = lastRow(projectScenario({ horizon: 'trenteAns' }))
  const gapCentral = irPrimaryGap30(eL.value, ref30)
  const gapLow = irPrimaryGap30(eL.low, ref30)
  const gapHigh = irPrimaryGap30(eL.high, ref30)
  const breakEven = irBreakEvenEL(ref30)
  const outcome = (gap) => (gap >= 0 ? 'la hausse reste rentable' : 'elle coûte')
  const pctTxt = (v) => `${fmt(v * 100, 1)} %`
  const debts = [beta.low, beta.value, beta.high, 0].map((b) => ({ b, d: b === beta.value ? ref30.debtRatio * 100 : debt30AtBeta(b) }))
  const thetaIr = PARAM_BY_ID['comp.theta.ir']
  const thetaReel = thetaReelIr(P, sigmaIr)
  const partActifs = P['offre.ir_csg.part_actifs']
  const etiUniforme = thetaReel > 0 ? thetaIr.value / (thetaReel / (eL.value * partActifs)) : Number.NaN
  const md = (v) => `${fmt(v, 2).replace('-', '−')} Md€`

  return [
    {
      numero: 1,
      titre: 'Une hausse uniforme de l\'impôt sur le revenu perd-elle de l\'argent à long terme ?',
      resume: `Avec e_L = ${fmt(eL.value, 2)} et un effet d'offre calculé tranche par tranche (revenus DGFiP 2024 estimés, coin marginal complet IR + CSG/CRDS + CEHR ; taux marginal moyen implicite ${fmt(tauImplicite * 100, 1)} %, contre ${fmt(tauIr.value, 0)} % (fourchette ${fmt(tauIr.low, 0)}–${fmt(tauIr.high, 0)} %) retenu pour θ), +1 % du produit de l'IR génère un effet d'offre calculé σ = ${fmt(sigmaIr, 3).replace('-', '−')} % du PIB qui, passé au solde par ε_offre = ${pctTxt(epsOffre.value)}, ${gapCentral < 0 ? 'dépasse' : 'reste inférieur à'} la recette statique à l'horizon ${endYear}${breakEven === null ? '' : ` (seuil de rentabilité vers e_L ≈ ${fmt(breakEven, 2)})`}. Au bas de la fourchette (e_L = ${fmt(eL.low, 2)}), ${outcome(gapLow)} ; au haut (${fmt(eL.high, 2)}), ${outcome(gapHigh)}.`,
      statut: 'Effet d\'offre de l\'IR : non validé — avis demandé.',
    },
    {
      numero: 2,
      titre: `Le taux de prélèvements obligatoires (ε_offre = ${pctTxt(epsOffre.value)}) est-il le bon coefficient de passage des effets d'offre au solde ?`,
      resume: `Décision D13 : les écarts de demande passent par la semi-élasticité cyclique ε = ${fmt(P['fisc.eps'], 1)} (recettes + dépenses automatiques de chômage), alors que les effets d'offre passent par ε_offre = ${pctTxt(epsOffre.value)} (taux de PO Insee 2025 ; haut ${pctTxt(epsOffre.high)}, recettes APU / PIB) car ils déplacent l'assiette fiscale sans déclencher de dépense cyclique. Limites : élasticité unitaire des recettes et absence d'indexation des dépenses sur les salaires.`,
      statut: 'Paramètres fisc.eps_offre (D13) et fisc.eps (E7).',
    },
    {
      numero: 3,
      titre: `La pente de taux β = ${fmt(beta.value, 0)} pb/pt (fourchette ${fmt(beta.low, 0)}–${fmt(beta.high, 0)}) est-elle bien calibrée pour la France en zone euro ?`,
      resume: `Les estimations empiriques sont dispersées (Kirpson et Staehr 2025 : ≈ 3 pb en zone euro ; Laubach 2009 : 3–4 pb aux États-Unis ; Banque de France WP 494 : 0,7 pb à long terme, 4,5 pb à court terme, non significatif en zone euro après 2008). Or β pilote la trajectoire de dette à 30 ans (${debts.map(({ b, d }) => `${fmt(d, 0)} % à β = ${fmt(b, 0)}`).join(', ')}). Faut-il conserver ${fmt(beta.value, 0)} pb au centre et prolonger linéairement au-delà de 200 % du PIB, ou plafonner ?`,
      statut: `Paramètre dette.beta : ${beta.status}.`,
    },
    {
      numero: 4,
      titre: 'Élasticité réelle de l\'offre de travail (e_L) et élasticité totale de l\'IR (θ) : laquelle retenir ?',
      resume: `L'élasticité uniforme équivalente à θ_IR = ${fmt(thetaIr.value, 2)} est ≈ ${fmt(etiUniforme, 2)}. Or e_L = ${fmt(eL.value, 2)} (pondérée par ${fmt(partActifs * 100, 0)} % de revenus d'activité), retenue pour l'effet d'offre, ${thetaReel > thetaIr.value ? `la dépasse en effet réel : la part réelle de la réponse (θ_réel ≈ ${fmt(thetaReel, 2)}) excède la réponse totale dont elle devrait n'être qu'une partie, et la part non réelle de θ tombe à 0 à plein effet d'offre.` : `reste en deçà : la part réelle de la réponse (θ_réel ≈ ${fmt(thetaReel, 2)}) est une partie de la réponse totale θ.`} Les deux chiffres viennent de littératures différentes (offre de travail agrégée pour e_L, élasticité du revenu imposable pour θ). En outre, l'effet d'offre passe au solde par ε_offre = ${pctTxt(epsOffre.value)} sur toutes les recettes publiques : une hausse de 1 % de l'IR ${gapCentral < 0 ? `coûte ${md(-gapCentral)}` : `rapporte ${md(gapCentral)}`} au solde primaire en ${endYear}. Le seuil de rentabilité de la question 1 se lit donc sur e_L seule, non sur θ. Faut-il rapprocher e_L de l'élasticité totale de l'IR, relever θ, ou garder les deux sources en le signalant ?`,
      statut: 'Paramètres offre.e_L (non validé) et comp.theta.ir — question 6 de la note de modèle, avis demandé.',
    },
  ]
}

/**
 * Vue avancée « Méthodologie des dérivations internes » de la page Hypothèses.
 * Toutes les valeurs sont calculées en direct depuis PARAMS, internal-derivations.js, lvt-module.js et ir-tranches.js.
 */
export function buildInternalDerivations(P) {
  const bParam = PARAM_BY_ID['ref.derive.b_autres']
  const bCalc = deriveBAutres(P)
  const debt2036Sensitivity = [bParam.low, bParam.value, bParam.high].map((b) => {
    const r = projectScenario({ horizon: 'dixAns', overrides: { 'ref.derive.b_autres': b } })
    const end = lastRow(r)
    return { b, debt2036Pct: end.debtRatio * 100, balance2036Pct: end.balanceRatio * 100 }
  })

  const mParam = PARAM_BY_ID['dem.m.prestations']
  const mCalc = deriveMPrestations(P)

  const capiParam = PARAM_BY_ID['lvt.capi.part']
  const partSolParam = PARAM_BY_ID['lvt.capi.part_sol']
  const tauxParam = PARAM_BY_ID['lvt.capi.taux_actualisation']
  const lvtScenarios = [1, 2, 3, 4, 5].map((code) => {
    const c = lvtComponents(code, P)
    return {
      code,
      id: c.scenario.id,
      totalMd: c.totalNouvelle,
      nationalAddMd: c.nationalAdditionnel,
      capiBrutePct: (c.capiBrute / c.pib) * 100,
      capiInversePct: (c.capiInverse / c.pib) * 100,
      netPct: (c.capitalisation / c.pib) * 100,
    }
  })

  const tr = irTranches(P)
  const pParts16 = resolveParams({ 'offre.ir.tranche.30.parts': 1.6 })
  const tr16 = irTranches(pParts16)
  const irSensitivity = [
    { id: 'central', label: `Base actuelle (e_L = ${fmt(P['offre.e_L'], 2)}, part actifs = ${fmt(P['offre.ir_csg.part_actifs'] * 100, 0)} %, parts TMI 30 % = ${fmt(P['offre.ir.tranche.30.parts'], 1)})`, p: P },
    { id: 'stat53_16', label: 'Audit DGFiP Stat 53 (parts TMI 30 % = 1,6)', p: pParts16 },
    { id: 'el_025', label: 'Sensibilité e_L = 0,25 (CBO / littérature française)', p: resolveParams({ 'offre.e_L': 0.25 }) },
  ].map(({ id, label, p: Pi }) => {
    const sig = sigmaFiscalCase('ir', Pi, 'value')
    return {
      id,
      label,
      sigmaPct: sig,
      thetaProp: thetaIrTranches(Pi, 'proportionnel'),
      thetaReel: thetaReelIr(Pi, sig),
      totalRevenu: (id === 'stat53_16' ? tr16 : tr)?.total ?? Number.NaN,
    }
  })
  return {
    bAutres: {
      param: bParam,
      ...(bCalc ?? { share2024Pct: Number.NaN, gPotPct: Number.NaN, windows: [], rawMedian: Number.NaN, window2007: null, window2007Implied: Number.NaN, ols2000ExCovid: Number.NaN, rounded: Number.NaN }),
      endYear10: HORIZONS.dixAns.endYear,
      debt2036Sensitivity,
    },
    mPrestations: {
      param: mParam,
      ...(mCalc ?? { lambda: Number.NaN, profile: [], mesange: null, cum4: Number.NaN, cum2: Number.NaN, e4Factor4: Number.NaN, e4Factor2: Number.NaN, frBdfEq4: Number.NaN, frBdfEq2: Number.NaN, mesangeIrCsgY1: Number.NaN, mesangeResidualUnit: Number.NaN, mesangeResidualEngine: Number.NaN, coenenSecondary: Number.NaN, rounded: Number.NaN }),
      mRem: P['dem.m.remunerations'],
      mAchats: P['dem.m.achats_invest'],
    },
    lvtCapi: {
      param: capiParam,
      partSolParam,
      tauxParam,
      provenance: LVT_PROVENANCE,
      effectiveNetShare: P['lvt.capi.part'] * (1 - P['lvt.capi.part_sol']),
      scenarios: lvtScenarios,
    },
    irTranches: {
      paramTheta: PARAM_BY_ID['comp.theta.ir'],
      paramPartActifs: PARAM_BY_ID['offre.ir_csg.part_actifs'],
      tranches: tr?.tranches ?? [],
      totalRevenu: tr?.total ?? Number.NaN,
      facteurCsg: facteurCsgDeductible(P),
      csgCrdsPct: P['comp.tau0.csg'] + P['offre.ir.coin.crds'],
      topTranchePct: IR_TRANCHES.at(-1),
      thetaProp: thetaIrTranches(P, 'proportionnel'),
      thetaPoint: thetaIrTranches(P, 'point'),
      sensitivity: irSensitivity,
    },
  }
}
