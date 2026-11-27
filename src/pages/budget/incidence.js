// Analyse d'incidence statutaire et sectorielle de 1er tour (« Qui paie ? », Stage A sur sources primaires)
// et contrat de branchement pour les déciles/cas-types microsimulés (Stage B, policyengine-fr).
// Fonctions pures (aucune constante économique codée en dur : toutes les clés proviennent de PARAMS / LVT_BASE_FONCIERE).

import { LEVER_BY_ID } from '../../engine/levers.js'
import { LVT_BASE_FONCIERE } from '../../engine/lvt-snapshot.js'

const COMPANIES_LAND_SHARE = (LVT_BASE_FONCIERE.companiesSharePct ?? 31.2) / 100
const HOUSEHOLDS_LAND_SHARE = 1 - COMPANIES_LAND_SHARE

export const PAYER_GROUPS = Object.freeze([
  {
    id: 'G1',
    titre: 'Ménages : revenus d\'activité',
    sousTitre: 'Salariés publics et privés, travailleurs indépendants',
  },
  {
    id: 'G2',
    titre: 'Ménages : retraités & remplacement',
    sousTitre: 'Pensions de retraite, allocations chômage, indemnités journalières',
  },
  {
    id: 'G3',
    titre: 'Ménages : consommation & patrimoine',
    sousTitre: 'TVA sur consommation finale, revenus fonciers/financiers et sol détenu',
  },
  {
    id: 'G4',
    titre: 'Entreprises & employeurs (redevable légal)',
    sousTitre: 'Impôt sur les sociétés, cotisations employeurs et foncier des sociétés',
  },
  {
    id: 'G5',
    titre: 'Services publics, soins & fonctions collectives',
    sousTitre: 'Usagers des services publics et des soins (ONDAM), agents et achats publics',
  },
])

export const EFFORT_PILLARS = Object.freeze([
  {
    id: 'recettes',
    titre: 'Prélèvements obligatoires',
    description: 'Impôts et cotisations sociales (ex ante, plus perte nette de capitalisation LVT D12).',
  },
  {
    id: 'services_publics',
    titre: 'Services publics & ministères',
    description: 'Fonctions régaliennes et collectives (COFOG : enseignement, défense, sécurité, affaires économiques).',
  },
  {
    id: 'prestations_sante',
    titre: 'Prestations sociales & santé (ASSO)',
    description: 'Pensions de retraite, assurance chômage et dépenses publiques de santé (ONDAM).',
  },
])

/** Clés d'incidence économique affichées dans les infobulles de chaque groupe (sources primaires documentées). */
const INCIDENCE_NOTES = Object.freeze({
  G1: 'Pour l\'IR (68,95 % d\'activité au barème hors PFU, DGFiP Stat n° 53 Tab. 1) et la CSG (70,40 % d\'activité sur produit constaté 2025, CCSS oct. 2026 Tab. 1 ; part marginale d\'un point Tab. 6 : 67,4 % activité, 21,9 % remplacement, 10,7 % capital), la ponction directe pèse sur les revenus du travail et alimente le coin fiscal dans E5. L\'érosion θ_non_réel réduit la recette encaissée par l\'État mais ne constitue pas un gain de revenu net pour le salarié (perte de 1er ordre ≈ effort ex ante).',
  G2: 'Pour les pensions (indexation générale : 20 % d\'amortisseur IR/CSG/ASPA/APL selon IPP Note n° 129 ; sous-indexation ciblée > 2 000 €/mois : 38 % de retour IR/CSG) et l\'âge légal (20 % de reports vers Unédic 52 %, IJ maladie 36 %, minima 12 %, DREES/DARES), l\'effet net APU est donc sensiblement inférieur à l\'effort brut. La CSG remplacement (17,98 % du produit) et l\'IR sur pensions (28,07 %) complètent la part statutaire.',
  G3: 'La TVA repose légalement à 100 % sur la consommation finale (1 545,9 Md€ Insee 2025) avec une répercussion moyenne sur les prix à la consommation d\'environ 80 % dès la 1re année (Gautier & Lalliard 2014 ; Benedek et al. 2015). S\'y ajoutent l\'IR sur revenus fonciers/non pro (2,98 %), la CSG capital et jeux (11,63 %) et 68,8 % de l\'assiette foncière du module LVT (4 221 / 6 122 Md€, Insee 2025).',
  G4: 'Incidence économique vs redevable légal : en économie ouverte, l\'impôt sur les sociétés se répercute à long terme entre détenteurs du capital (G3) et salaires (G1) via l\'accumulation du capital (Fuest, Peichl & Siegloch, AER 2018 : ~51 % sur les salaires). Pour les cotisations patronales hors lien contributif fort, Bozio, Breda & Grenet (IZA DP 12502 / REStud) mesurent une faible répercussion salariale à court-moyen terme (6 à 21 %), si bien que la charge pèse d\'abord sur le coût du travail et l\'emploi.',
  G5: 'Fonctions publiques collectives (COFOG) et soins de santé (GF07 / ONDAM) classés ensemble afin de ne pas confondre un freinage de dépenses de soins ou de services publics en nature avec une baisse directe de revenu monétaire des retraités (G2). Les achats/investissements et rémunérations publics ont des multiplicateurs de demande élevés à court terme (0,8 à 0,9 dans Mésange).',
})

/**
 * Part des 5 groupes payeurs statutaires de 1er tour pour un instrument donné (somme exacte = 1,0).
 */
export function payerSharesForInstrument(id, P) {
  switch (id) {
    case 'ir':
      return {
        G1: P['offre.ir.part_actifs'],
        G2: P['incid.ir.part_pensions'],
        G3: P['incid.ir.part_patrimoine'],
        G4: 0,
        G5: 0,
      }
    case 'csg':
      return {
        G1: P['offre.csg.part_actifs'],
        G2: P['incid.csg.part_remplacement'],
        G3: P['incid.csg.part_capital_jeux'],
        G4: 0,
        G5: 0,
      }
    case 'tva_normal':
    case 'tva_tous_taux':
      return { G1: 0, G2: 0, G3: 1, G4: 0, G5: 0 }
    case 'is':
    case 'cotis_patronales':
      return { G1: 0, G2: 0, G3: 0, G4: 1, G5: 0 }
    case 'indexation_pensions':
    case 'sous_indexation_ciblee':
    case 'age_legal':
    case 'travail_assurance_chomage':
    case 'comptes_notionnels_ndc':
      return { G1: 0, G2: 1, G3: 0, G4: 0, G5: 0 }
    case 'taxe_valeur_sol':
      return { G1: 0, G2: 0, G3: HOUSEHOLDS_LAND_SHARE, G4: COMPANIES_LAND_SHARE, G5: 0 }
    default:
      return { G1: 0, G2: 0, G3: 0, G4: 0, G5: 1 }
  }
}

function pillarOfInstrument(id) {
  if (id === 'taxe_valeur_sol') return 'recettes'
  if (id === 'comptes_notionnels_ndc') return 'prestations_sante'
  const lever = LEVER_BY_ID[id]
  if (!lever) return 'services_publics'
  if (lever.type === 'recette') return 'recettes'
  return lever.categorie === 'prestations' ? 'prestations_sante' : 'services_publics'
}

/**
 * Calcule la composition macroéconomique (Vue A1), la répartition statutaire de 1er tour G1–G5 (Vue A2),
 * la bascule sectorielle LVT éventuelle, les repères d'échelle (Vue A3) et le contrat Stage B optionnel l'année `t`.
 * Conserve exactement Σ piliers = Σ payeurs = Σ byInstrument (écart < 1e-12 Md€).
 */
export function computeIncidenceAtYear(result, t, P, { lvtScenario = null, lvtCompanyShiftMd = null, microsimSnapshot = null } = {}) {
  const row = result?.total?.[t]
  if (!row || !P) return null
  const year = row.year
  const gdp = Number.isFinite(row.gdpBase) && row.gdpBase > 0 ? row.gdpBase : P['base.pib.2025']
  const entries = Object.entries(row.byInstrument ?? {})
    .filter(([, v]) => v && (Math.abs(v.exAnte) > 1e-12 || Math.abs(v.exPost) > 1e-12))

  const pillarAcc = {
    recettes: { exAnte: 0, exPost: 0, grossPos: 0, grossNeg: 0 },
    services_publics: { exAnte: 0, exPost: 0, grossPos: 0, grossNeg: 0 },
    prestations_sante: { exAnte: 0, exPost: 0, grossPos: 0, grossNeg: 0, especesExAnte: 0, santeExAnte: 0 },
  }
  const payerAcc = Object.fromEntries(PAYER_GROUPS.map((g) => [g.id, { exAnte: 0, exPost: 0 }]))

  let grossPos = 0
  let grossNeg = 0
  let totalExAnte = 0
  let totalExPost = 0
  let hasIr = false
  let hasCotis = false
  let hasPensions = false

  for (const [id, v] of entries) {
    const ea = Number.isFinite(v.exAnte) ? v.exAnte : 0
    const ep = Number.isFinite(v.exPost) ? v.exPost : 0
    totalExAnte += ea
    totalExPost += ep
    if (ea > 1e-9) grossPos += ea
    else if (ea < -1e-9) grossNeg += ea

    const pId = pillarOfInstrument(id)
    pillarAcc[pId].exAnte += ea
    pillarAcc[pId].exPost += ep
    if (ea >= 0) pillarAcc[pId].grossPos += ea
    else pillarAcc[pId].grossNeg += ea
    if (pId === 'prestations_sante') {
      if (id === 'ondam') pillarAcc[pId].santeExAnte += ea
      else pillarAcc[pId].especesExAnte += ea
    }

    const shares = payerSharesForInstrument(id, P)
    for (const g of PAYER_GROUPS) {
      const w = shares[g.id] ?? 0
      if (w !== 0) {
        payerAcc[g.id].exAnte += w * ea
        payerAcc[g.id].exPost += w * ep
      }
    }

    if (id === 'ir') hasIr = true
    if (id === 'cotis_patronales') hasCotis = true
    if (id === 'indexation_pensions' || id === 'sous_indexation_ciblee' || id === 'age_legal' || id === 'comptes_notionnels_ndc') {
      hasPensions = true
    }
  }

  const isMixedSign = grossPos > 1e-6 && grossNeg < -1e-6
  const maxAbsPillar = Math.max(1e-6, ...Object.values(pillarAcc).map((p) => Math.abs(p.exAnte)))
  const sumAbsPillar = Math.max(1e-6, Object.values(pillarAcc).reduce((s, p) => s + Math.abs(p.exAnte), 0))

  const pillars = EFFORT_PILLARS.map((def) => {
    const acc = pillarAcc[def.id]
    const sharePct = isMixedSign ? null : (Math.abs(acc.exAnte) / sumAbsPillar) * 100
    const barPct = Math.min(100, (Math.abs(acc.exAnte) / maxAbsPillar) * 100)
    return {
      ...def,
      exAnte: acc.exAnte,
      exPost: acc.exPost,
      gdpPct: (acc.exAnte / gdp) * 100,
      sharePct,
      barPct,
      ...(def.id === 'prestations_sante' ? { especesExAnte: acc.especesExAnte, santeExAnte: acc.santeExAnte } : {}),
    }
  })

  const maxAbsPayer = Math.max(1e-6, ...PAYER_GROUPS.map((g) => Math.max(Math.abs(payerAcc[g.id].exAnte), Math.abs(payerAcc[g.id].exPost))))
  const sumAbsPayer = Math.max(1e-6, PAYER_GROUPS.reduce((s, g) => s + Math.abs(payerAcc[g.id].exAnte), 0))
  const payers = PAYER_GROUPS.map((g) => {
    const acc = payerAcc[g.id]
    return {
      ...g,
      exAnte: acc.exAnte,
      exPost: acc.exPost,
      gdpPct: (acc.exAnte / gdp) * 100,
      sharePct: isMixedSign ? null : (Math.abs(acc.exAnte) / sumAbsPayer) * 100,
      barPct: Math.min(100, (Math.abs(acc.exAnte) / maxAbsPayer) * 100),
      note: INCIDENCE_NOTES[g.id],
    }
  })

  // Bascule brute LVT Ménages (G3) -> Sociétés (G4) sur assiette foncière (S2/S3)
  const lvtShift = lvtScenario && lvtScenario.code > 0
    ? {
        scenarioLabel: lvtScenario.libelle,
        companiesSharePct: LVT_BASE_FONCIERE.companiesSharePct ?? 31.2,
        householdsSharePct: 100 - (LVT_BASE_FONCIERE.companiesSharePct ?? 31.2),
        companyShiftMd: Number.isFinite(lvtCompanyShiftMd) ? lvtCompanyShiftMd : (lvtScenario.companyLandMd ?? 0),
        netCapiLossMd: row.byInstrument?.taxe_valeur_sol?.exAnte ?? 0,
      }
    : null

  // Vue A3 : repères d'échelle moyens sur dénominateurs primaires (jamais une prédiction par ménage médian)
  const menagesM = P['demog.menages.2025']
  const foyersM = P['demog.foyers_fiscaux.2025']
  const imposesM = P['demog.foyers_imposes_ir.2025']
  const emploisM = P['demog.emploi.2025']
  const retraitesM = P['demog.retraites_droit_direct.2023']

  const householdsDirectMd = payerAcc.G1.exAnte + payerAcc.G2.exAnte + payerAcc.G3.exAnte
  const irMd = row.byInstrument?.ir?.exAnte ?? 0
  const cotisMd = row.byInstrument?.cotis_patronales?.exAnte ?? 0
  const pensionIdxMd = row.byInstrument?.indexation_pensions?.exAnte ?? 0

  const benchmarks = []
  if (entries.length > 0 && menagesM > 0) {
    benchmarks.push({
      id: 'total_per_household',
      label: `Ensemble des mesures ramené à ${menagesM.toFixed(1).replace('.', ',')} M de ménages`,
      valueEur: (totalExAnte * 1000) / menagesM,
      unit: '€/ménage/an',
      caveat: 'Moyenne purement comptable incluant l\'IS, les cotisations employeurs et les services publics (ne mesure pas le revenu disponible médian).',
    })
    if (Math.abs(householdsDirectMd) > 0.05) {
      benchmarks.push({
        id: 'g123_per_household',
        label: 'Part légale ménages (G1 + G2 + G3) par ménage',
        valueEur: (householdsDirectMd * 1000) / menagesM,
        unit: '€/ménage/an',
        caveat: 'Regroupe IR, CSG, TVA et prestations monétaires rapportés aux 31,7 M de ménages.',
      })
    }
  }
  if (hasIr && foyersM > 0 && imposesM > 0) {
    benchmarks.push({
      id: 'ir_per_foyer',
      label: `Levier IR par foyer imposé (${imposesM.toFixed(1).replace('.', ',')} M sur ${foyersM.toFixed(1).replace('.', ',')} M)`,
      valueEur: (irMd * 1000) / imposesM,
      secondaryEur: (irMd * 1000) / foyersM,
      unit: '€/foyer imposé/an',
      caveat: 'DGFiP Stat n° 53 (nov. 2026) : 52,3 % des foyers fiscaux ne sont pas imposés au barème ; le dernier dixième acquitte 67,5 % de l\'IR au barème et le centile supérieur 24,1 %.',
    })
  }
  if ((Math.abs(payerAcc.G1.exAnte) > 0.05 || hasCotis) && emploisM > 0) {
    const numMd = hasCotis && Math.abs(payerAcc.G1.exAnte) < 0.05 ? cotisMd : payerAcc.G1.exAnte
    benchmarks.push({
      id: 'g1_per_job',
      label: hasCotis && Math.abs(payerAcc.G1.exAnte) < 0.05
        ? `Cotisations patronales rapportées à ${emploisM.toFixed(1).replace('.', ',')} M d'emplois`
        : `Revenus d'activité (G1) par emploi (${emploisM.toFixed(1).replace('.', ',')} M)`,
      valueEur: (numMd * 1000) / emploisM,
      unit: '€/emploi/an',
      caveat: 'Concentré au-dessus de 1,6 SMIC pour les cotisations employeurs (allègements généraux de 71,5 Md€, PLFSS 2026 Annexe 4).',
    })
  }
  if (hasPensions && retraitesM > 0 && Math.abs(pensionIdxMd) > 0.05) {
    benchmarks.push({
      id: 'pension_per_retiree',
      label: `Indexation générale rapportée à ${retraitesM.toFixed(1).replace('.', ',')} M de retraités`,
      valueEur: (pensionIdxMd * 1000) / retraitesM,
      unit: '€/retraité/an',
      caveat: 'Avant amortisseur IR/CSG/ASPA (~20 %, IPP Note n° 129). Une sous-indexation ciblée (> 2 000 €/mois) ne concerne que ~30 % des retraités (~5,2 M) ; l\'âge légal et les comptes notionnels portent sur les générations liquidantes.',
    })
  }

  const stageB = microsimSnapshot && typeof microsimSnapshot === 'object' ? { available: true, snapshot: microsimSnapshot } : null

  return {
    year,
    gdp,
    hasActivity: entries.length > 0 || lvtShift !== null,
    isMixedSign,
    grossPos,
    grossNeg,
    totalExAnte,
    totalExPost,
    totalGdpPct: (totalExAnte / gdp) * 100,
    pillars,
    payers,
    lvtShift,
    benchmarks,
    stageB,
  }
}
