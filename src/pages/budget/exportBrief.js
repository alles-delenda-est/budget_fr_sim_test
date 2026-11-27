// Export « Note de synthèse » (Markdown GFM + données structurées pour l'impression A4).
// Fonctions pures sans dépendance externe, conformes CSP (vercel.json) et CWE-74 (assainissement URL & cellules).

import { LEVERS, effectiveRampFor } from '../../engine/levers.js'
import { PARAM_BY_ID, resolveParams } from '../../engine/params.js'
import { HORIZONS, START_YEAR } from '../../engine/project.js'
import { APP_VERSION, versionStamp } from '../../version.js'
import {
  fmt,
  leverGroup,
  SUPPLY_CASES,
  DEMAND_REGIME_OPTIONS,
  hasSupplyEffect,
  jobsNote,
  fmtJobs,
  snapshotAt,
  debtMovesAgainstBalance,
  YEAR1_PARADOX_TEXT,
  decomposeAtYear,
  blocksAt,
  isFlagged,
  paramRange,
} from './helpers.js'
import { betaRegimeText, tier1Text, tier2Text } from './warnings.js'

const FAMILY_LABELS = {
  recettes: 'Recettes',
  depenses: 'Dépenses',
  prestations: 'Prestations',
}

const CHAR_ESCAPE = {
  '(': '%28',
  ')': '%29',
  '[': '%5B',
  ']': '%5D',
  '|': '%7C',
  '<': '%3C',
  '>': '%3E',
  '\\': '%5C',
  '`': '%60',
}

/**
 * Assainit une URL avant interpolation Markdown / href :
 * n'accepte que http(s), supprime la chaîne `search` (avant `#`) contrôlable par un lien tiers (CWE-74),
 * et encode en pourcentage tout caractère métasyntaxique Markdown `( ) [ ] | < > \ whitespace \``.
 */
export function sanitizeBriefUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return ''
  try {
    const u = new URL(rawUrl.trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return ''
    u.search = ''
    return u.href.replace(/[\s()[\]|<>\\`]/g, (ch) => CHAR_ESCAPE[ch] ?? encodeURIComponent(ch))
  } catch {
    return ''
  }
}

/** Neutralise les sauts de ligne, séparateurs de colonnes GFM et balises dans une cellule ou ligne Markdown. */
export function mdCell(raw) {
  const s = String(raw ?? '').replace(/[\r\n\t]+/g, ' ').trim()
  return s
    .replace(/\\/g, '\\\\')
    .replace(/([|`<>[\]])/g, '\\$1')
    .replace(/^#+/, (m) => `\\${m}`)
}

/** Assainit un nom de fichier téléchargé (bloque `..`, chemins et caractères spéciaux). */
export function safeFilename(raw, fallback = 'note-synthese-budget.md') {
  const cleaned = String(raw ?? '')
    .replace(/\.\./g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+/, '')
  return cleaned || fallback
}

function describeLeverCalendar(lever, x) {
  const r = effectiveRampFor(lever, x, 1)
  if (lever.id === 'age_legal') {
    if (x > 0) return `2028–2034 (7 ans, LFSS 2026)`
    return `2029–2033 (5 ans, LFSS 2026)`
  }
  if (!r) return 'Dès 2027 (plein effet)'
  const startYr = START_YEAR + (r.start ?? 1)
  const yrs = r.years ?? 1
  return `${startYr}–${startYr + yrs - 1} (${yrs} ans)`
}

function measureCalendarWithPhasing(lever, x, phasingYears) {
  if (lever.id === 'age_legal' || lever.defaultRamp || lever.defaultRampDown) {
    return describeLeverCalendar(lever, x)
  }
  if (Number.isInteger(phasingYears) && phasingYears > 1) {
    return `2027–${2026 + phasingYears} (${phasingYears} ans, rampe)`
  }
  return 'Dès 2027'
}

function formatMilestoneTitle(t, N, year) {
  if (t === 0) return `${year} (base)`
  if (t === 1) return `${year} (An 1)`
  if (t === 5) return `${year} (An 5)`
  if (t === 10 && N > 10) return `${year} (10 ans)`
  if (t === N) return `${year} (Fin)`
  return `${year}`
}

function formatOverrideValue(v, unit = '') {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return `${fmt(v, Math.abs(v) < 1 ? 3 : 2)} ${unit}`.trim()
  }
  if (v && typeof v === 'object' && Number.isFinite(v[2070])) {
    return `2070 : ${fmt(v[2070], 1)} ${unit}`.trim()
  }
  return '—'
}

function milestoneIndices(N) {
  const raw = [0, 1, Math.min(5, N), ...(N > 10 ? [10] : []), N]
  const seen = new Set()
  return raw.filter((idx) => {
    if (idx < 0 || idx > N || seen.has(idx)) return false
    seen.add(idx)
    return true
  })
}

function extractHorizonLabel(horizon) {
  return HORIZONS[horizon]?.label ?? horizon
}

function extractCaseLabel(ysCase) {
  return SUPPLY_CASES.find((c) => c.id === ysCase)?.label ?? ysCase
}

function describeMilestones(targets) {
  if (!targets) return null
  const stab = targets.debtStabilization
  const def3 = targets.deficit3Pct
  const stabText = stab.status === 'sustained'
    ? `Dette stabilisée dès ${stab.year} (variation fin d'horizon : ${fmt(stab.endDeltaPp, 2, { signed: true })} pt PIB)`
    : stab.status === 'transient'
      ? `Stabilisation temporaire (${stab.firstYear}–${stab.lastYear}) puis reprise (${fmt(stab.endDeltaPp, 2, { signed: true })} pt PIB en ${targets.endYear})`
      : `Dette non stabilisée en ${targets.endYear} (${fmt(stab.endDeltaPp, 2, { signed: true })} pt PIB la dernière année)`

  const def3Text = def3.status === 'sustained'
    ? `Solde ≥ −3,0 % du PIB atteint dès ${def3.year} (${fmt(def3.endBalancePct, 2)} % en ${targets.endYear})`
    : def3.status === 'transient'
      ? `Seuil de −3,0 % atteint temporairement (${def3.firstYear}–${def3.lastYear}), repassant à ${fmt(def3.endBalancePct, 2)} % en ${targets.endYear}`
      : `Seuil de −3,0 % non atteint d'ici ${targets.endYear} (${fmt(def3.endBalancePct, 2)} % du PIB)`

  const sp = targets.endYearTarget
  const spGapText = sp && Number.isFinite(sp.effortGapMd)
    ? sp.effortGapMd > 0.05
      ? `manque ${fmt(sp.effortGapMd, 1)} Md€ (${fmt(sp.effortGapPct, 2, { signed: true })} pt PIB) par rapport au solde primaire stabilisant requis sp* = ${fmt(sp.spStarPct, 2, { signed: true })} %`
      : `solde primaire supérieur au seuil stabilisant sp* = ${fmt(sp.spStarPct, 2, { signed: true })} % (marge de ${fmt(Math.abs(sp.effortGapMd), 1)} Md€)`
    : null

  const dpn = targets.euNetExpenditure
  const dpnText = dpn
    ? `Proxy DPN 2026–2029 (calculé) : ${fmt(dpn.avgGrowthPct, 2, { signed: true })} %/an vs plafond ${fmt(dpn.avgCeilingPct, 2, { signed: true })} %/an (${dpn.withinCeiling ? 'conforme' : 'dépassement'})`
    : null

  return { stabText, def3Text, spGapText, dpnText }
}

function summarizeStressPoint(result, reference, unshockedResult, centralReference, idx, label) {
  const s = result.total[idx]
  const refS = reference.total[idx]
  const u = unshockedResult.total[idx]
  const c = centralReference.total[idx]
  return {
    year: s.year,
    label,
    unshockedDebtPct: u.debtRatio * 100,
    shockedDebtPct: s.debtRatio * 100,
    shockCostDebtPp: (s.debtRatio - u.debtRatio) * 100,
    shockedRefDebtPct: refS.debtRatio * 100,
    centralRefDebtPct: c.debtRatio * 100,
    planProtectionPp: (s.debtRatio - refS.debtRatio) * 100,
    unshockedBalPct: u.balanceRatio * 100,
    shockedBalPct: s.balanceRatio * 100,
    shockCostBalPp: (s.balanceRatio - u.balanceRatio) * 100,
    shockedRefBalPct: refS.balanceRatio * 100,
    shockedIntMd: s.interest,
    centralRefIntMd: c.interest,
    shockedRefIntDeltaMd: refS.interest - c.interest,
  }
}

/**
 * Construit l'objet structuré immuable servant de source unique au Markdown GFM (`formatBriefMarkdown`)
 * et à la feuille imprimable React (`<PolicyBriefPrint />`).
 */
export function buildBriefData({
  result,
  reference,
  unshockedResult = null,
  centralReference = null,
  resultA = null,
  pinnedScenario = null,
  values = {},
  horizon = 'dixAns',
  ysCase = 'central',
  phasingYears = 1,
  macroVariant = null,
  stressTest = null,
  lvtSetting = null,
  lvtScenario = null,
  demandRegime = 'normal',
  endogenousInflation = false,
  targets = null,
  incidence = null,
  warnings = null,
  paramIds = [],
  overrides = null,
  P = resolveParams(),
  eps = P['fisc.eps'],
  epsOffre = P['fisc.eps_offre'],
  url = '',
  stamp = versionStamp(),
  dateIso = new Date().toISOString().slice(0, 10),
  appVersion = APP_VERSION,
}) {
  const N = result.years.length - 1
  const y5Idx = Math.min(5, N)
  const sanitizedUrl = sanitizeBriefUrl(url)
  const provisional = String(appVersion ?? '0.9').startsWith('0.')
  const activeSupply = hasSupplyEffect(result)

  const dynParts = []
  if (demandRegime && demandRegime !== 'normal') {
    dynParts.push(`Régime E4 : ${DEMAND_REGIME_OPTIONS.find((o) => o.id === demandRegime)?.label ?? demandRegime}`)
  }
  if (endogenousInflation) dynParts.push('Inflation endogène et répercussion TVA actives')
  const dynamicsLabel = dynParts.length ? dynParts.join(' · ') : 'Standards'

  const frameworkLabel = stressTest
    ? `Stress-test actif : ${stressTest.titre} (référence soumise au même choc)`
    : macroVariant
      ? `Comparateur macroéconomique : ${macroVariant.label} (jamais une cible)`
      : 'Référence centrale (médiane des prévisionnistes indépendants)'

  const irVal = values?.ir ?? 0
  const hasIr = typeof irVal === 'number' && Number.isFinite(irVal) && irVal !== 0
  const tvaOverlap = Boolean((values?.tva_normal ?? 0) !== 0 && (values?.tva_tous_taux ?? 0) !== 0)
  const pensionsOverlap = Boolean((values?.indexation_pensions ?? 0) < 0 && (values?.sous_indexation_ciblee ?? 0) < 0)

  const alerts = []
  if (warnings?.tier2) alerts.push({ level: 'critique', text: tier2Text(warnings.tier2) })
  if (warnings?.tier1) alerts.push({ level: 'alerte', text: tier1Text(warnings.tier1) })
  if (warnings?.betaRegime && !warnings?.tier2) alerts.push({ level: 'info', text: betaRegimeText(warnings.betaRegime) })
  if (tvaOverlap) {
    alerts.push({
      level: 'info',
      text: 'Cumul d\'assiette détecté : « TVA, taux normal » et « TVA, tous les taux » sont activés simultanément.',
    })
  }
  if (pensionsOverlap) {
    alerts.push({
      level: 'info',
      text: 'Cumul d\'assiette détecté : sous-indexation générale et sous-indexation ciblée des pensions (> 2 000 €) sont actives simultanément.',
    })
  }

  // Section 1 : Mesures retenues
  const measures = []
  let grossRevMd = 0
  let grossSpendMd = 0
  let totalExAnteMd = 0

  for (const l of LEVERS) {
    const x = values?.[l.id]
    if (typeof x !== 'number' || !Number.isFinite(x) || x === 0) continue
    const yieldMd = l.signe * l.rendement(P, x) * x
    totalExAnteMd += yieldMd
    if (l.type === 'recette') grossRevMd += yieldMd
    else grossSpendMd += yieldMd

    const fam = FAMILY_LABELS[leverGroup(l)] ?? l.type
    let status = l.statut
    if (l.id === 'ir') status = `${l.statut} ; Effet d'offre de l'IR : non validé — avis demandé`
    else if (l.id === 'age_legal') {
      const jn = jobsNote('age_legal', x, P, ysCase)
      if (jn && jn.jobsForX !== null) {
        status = `${l.statut} (~${fmtJobs(jn.jobsForX, { signed: true })} emplois seniors à terme)`
      }
    }

    measures.push({
      id: l.id,
      titre: l.titre,
      family: fam,
      setting: `${fmt(x, Math.abs(x) % 1 ? 1 : 0, { signed: true })} ${l.unite}`,
      exAnteMd: yieldMd,
      calendar: measureCalendarWithPhasing(l, x, phasingYears),
      status,
    })
  }

  if (lvtScenario && lvtScenario.code > 0) {
    const lvtEndMd = result.total[N]?.byInstrument?.taxe_valeur_sol?.exAnte ?? 0
    totalExAnteMd += lvtEndMd
    grossRevMd += lvtEndMd
    measures.push({
      id: 'taxe_valeur_sol',
      titre: `Taxe sur la valeur du sol (${lvtScenario.id})`,
      family: 'Recettes (module)',
      setting: `${lvtScenario.libelle}${lvtSetting?.ocde ? ' + OCDE' : ''}`,
      exAnteMd: lvtEndMd,
      calendar: 'Dès 2027',
      status: 'LVTShift (capitalisation foncière et transfert Sécurité sociale → État inclus)',
    })
  }

  const totalAbsEff = Math.abs(grossRevMd) + Math.abs(grossSpendMd)
  const revSharePct = totalAbsEff > 0.05 ? (Math.abs(grossRevMd) / totalAbsEff) * 100 : null
  const spendSharePct = revSharePct !== null ? 100 - revSharePct : null

  const milestoneTexts = describeMilestones(targets)
  const execPoints = []
  if (measures.length === 0) {
    execPoints.push('Aucun levier budgétaire actif (trajectoire sans mesure nouvelle).')
  } else if (revSharePct !== null) {
    execPoints.push(
      `Effort statique en régime permanent : ${fmt(totalExAnteMd, 1, { signed: true })} Md€/an (base PIB 2025) — ${fmt(revSharePct, 0)} % recettes / ${fmt(spendSharePct, 0)} % dépenses et prestations.`,
    )
  } else {
    execPoints.push(`Effort statique net en régime permanent : ${fmt(totalExAnteMd, 1, { signed: true })} Md€/an (bascule fiscale nette proche de zéro).`)
  }

  if (milestoneTexts) {
    execPoints.push(`${milestoneTexts.stabText} ; ${milestoneTexts.def3Text}${milestoneTexts.spGapText ? ` (${milestoneTexts.spGapText})` : ''}.`)
    if (milestoneTexts.dpnText) execPoints.push(milestoneTexts.dpnText)
  }
  if (hasIr) {
    execPoints.push('Effet d\'offre de l\'IR : non validé — avis demandé (impact σ spécifique inclus selon le cas retenu).')
  }

  // Section 2 : Trajectoire
  const idxs = milestoneIndices(N)
  const trajectory = idxs.map((idx) => {
    const r = result.total[idx]
    const b = reference.total[idx]
    const a = resultA?.total?.[idx] ?? null
    return {
      idx,
      year: r.year,
      label: formatMilestoneTitle(idx, N, r.year),
      debtPct: r.debtRatio * 100,
      debtRefPct: b.debtRatio * 100,
      debtDeltaPp: (r.debtRatio - b.debtRatio) * 100,
      ...(a ? { debtAPct: a.debtRatio * 100, debtDeltaAPp: (r.debtRatio - a.debtRatio) * 100 } : {}),
      balancePct: r.balanceRatio * 100,
      balanceRefPct: b.balanceRatio * 100,
      balanceDeltaPp: (r.balanceRatio - b.balanceRatio) * 100,
      ...(a ? { balanceAPct: a.balanceRatio * 100, balanceDeltaAPp: (r.balanceRatio - a.balanceRatio) * 100 } : {}),
      primaryPct: r.primaryBalanceRatio * 100,
      primaryRefPct: b.primaryBalanceRatio * 100,
      interestMd: r.interest,
      interestRefMd: b.interest,
      interestPct: r.interestRatio * 100,
      gdpGapPct: r.gdpEffect * 100,
      yDPct: r.yD * 100,
      ySPct: r.yS * 100,
      unemploymentPct: r.unemployment,
      unemploymentRefPct: b.unemployment,
    }
  })

  const snapY1 = snapshotAt(result, reference, 1, resultA)
  const year1Paradox = debtMovesAgainstBalance(snapY1) ? YEAR1_PARADOX_TEXT : null

  const stressResilience = stressTest && unshockedResult && centralReference
    ? [
        ...(y5Idx !== N ? [summarizeStressPoint(result, reference, unshockedResult, centralReference, y5Idx, `Année 5 (${result.years[y5Idx]})`)] : []),
        summarizeStressPoint(result, reference, unshockedResult, centralReference, N, `Fin d'horizon (${result.years[N]})`),
      ]
    : null

  // Section 3 : Décomposition
  const decompY5 = decomposeAtYear(result, reference, y5Idx, eps, epsOffre)
  const decompEnd = decomposeAtYear(result, reference, N, eps, epsOffre)

  // Section 4 : Sous-secteurs APU & Incidence G1–G5
  const blocksY5 = blocksAt(result, reference, y5Idx, resultA)
  const blocksEnd = blocksAt(result, reference, N, resultA)
  const totEnd = result.total[N]
  const refEnd = reference.total[N]
  const aEnd = resultA?.total?.[N] ?? null

  const incidenceSummary = incidence?.hasActivity
    ? {
        year: incidence.year,
        isMixedSign: incidence.isMixedSign,
        totalExAnte: incidence.totalExAnte,
        totalExPost: incidence.totalExPost,
        pillars: incidence.pillars.map((p) => ({
          id: p.id,
          titre: p.titre,
          exAnte: p.exAnte,
          exPost: p.exPost,
          sharePct: p.sharePct,
        })),
        payers: incidence.payers.map((g) => ({
          id: g.id,
          titre: g.titre,
          exAnte: g.exAnte,
          exPost: g.exPost,
          sharePct: g.sharePct,
        })),
        lvtShift: incidence.lvtShift,
      }
    : null

  // Section 5 : Ancres & Paramètres signalés
  const endTarget = targets?.endYearTarget
  const anchors = [
    `Croissance réelle de référence : ${fmt(P['macro.g.2026'], 2)} % (2026), ${fmt(P['macro.g.2027'], 2)} % (2027), potentielle ${fmt(P['macro.g.potentielle'], 2)} %/an`,
    `Inflation (IPC) : ${fmt(P['macro.pi.2026'], 2)} % (2026), ${fmt(P['macro.pi.2027'], 2)} % (2027), long terme ${fmt(P['macro.pi.long'], 2)} %/an`,
    `Dette & taux : sensibilité β = ${fmt(P['dette.beta'], 1)} pb/pt, maturité moyenne M = ${fmt(P['dette.M'], 2)} ans, taux effectif fin d'horizon ${endTarget ? `${fmt(endTarget.iEffPct, 2)} %` : '—'}`,
    `Élasticités budgétaires : stabilisateurs ε = ${fmt(P['fisc.eps'], 2)}, offre ε_offre = ${fmt(P['fisc.eps_offre'], 3)}, persistance λ = ${fmt(P['dem.lambda'], 2)}, Okun κ = ${fmt(P['emploi.kappa'], 2)}`,
  ]
  if (overrides && Object.keys(overrides).length > 0) {
    const ovStr = Object.entries(overrides).map(([k, v]) => `${k} = ${formatOverrideValue(v, PARAM_BY_ID[k]?.unit ?? '')}`).join(' ; ')
    anchors.push(`Surcharges actives : ${ovStr}`)
  }

  const flaggedParams = (paramIds ?? [])
    .map((id) => PARAM_BY_ID[id])
    .filter((q) => q && isFlagged(q.status))
    .map((q) => ({
      id: q.id,
      status: q.status,
      rangeText: paramRange(q),
      description: q.role || q.source || q.id,
    }))

  return Object.freeze({
    meta: {
      stamp,
      dateIso,
      provisional,
      url: sanitizedUrl,
      horizonId: horizon,
      horizonLabel: extractHorizonLabel(horizon),
      endYear: result.years[N],
      y5Year: result.years[y5Idx],
      ysCase,
      ysCaseLabel: extractCaseLabel(ysCase),
      ysCaseNote: activeSupply ? `${extractCaseLabel(ysCase)}` : `${extractCaseLabel(ysCase)} (sans effet d'offre actif)`,
      phasingYears,
      phasingLabel: phasingYears > 1 ? `Progressive sur ${phasingYears} ans (2027–${2026 + phasingYears}, hors calendrier légal)` : 'Immédiate dès 2027 (1 an)',
      frameworkLabel,
      dynamicsLabel,
      pinnedLabel: pinnedScenario?.label ?? null,
      stressTitle: stressTest?.titre ?? null,
      hasIr,
    },
    alerts,
    execPoints,
    milestoneTexts,
    measures,
    totalExAnteMd,
    trajectory,
    year1Paradox,
    stressResilience,
    decomposition: {
      y5Year: result.years[y5Idx],
      endYear: result.years[N],
      y5: decompY5,
      end: decompEnd,
    },
    subsectors: {
      y5Year: result.years[y5Idx],
      endYear: result.years[N],
      rows: blocksEnd.map((endRow, i) => ({
        id: endRow.id,
        label: endRow.label,
        y5Delta: blocksY5[i]?.delta ?? 0,
        endBalance: endRow.balance,
        endRatio: endRow.balanceRatio,
        endDelta: endRow.delta,
        ...(aEnd ? { endDeltaVsA: endRow.deltaVsA } : {}),
      })),
      totalEnd: {
        balance: totEnd.balance,
        ratio: totEnd.balanceRatio * 100,
        endDelta: totEnd.balance - refEnd.balance,
        y5Delta: result.total[y5Idx].balance - reference.total[y5Idx].balance,
        ...(aEnd ? { deltaVsA: totEnd.balance - aEnd.balance } : {}),
      },
      incidence: incidenceSummary,
    },
    assumptions: {
      anchors,
      flaggedParams,
    },
  })
}

/** Formate la note de synthèse en Markdown GFM propre et assaini. */
export function formatBriefMarkdown(data) {
  const { meta, alerts, execPoints, measures, totalExAnteMd, trajectory, year1Paradox, stressResilience, decomposition, subsectors, assumptions } = data
  const lines = []

  lines.push(`# Note de synthèse — Simulation budgétaire (APU consolidées, Maastricht)`)
  lines.push('')
  lines.push(`- **Date :** ${mdCell(meta.dateIso)} · **Empreinte :** ${mdCell(meta.stamp)}${meta.provisional ? ' · *Version provisoire (< 1.0) — non publiée*' : ''}`)
  lines.push(`- **Horizon :** ${mdCell(meta.horizonLabel)} (2026–${meta.endYear}) · **Effets d'offre :** ${mdCell(meta.ysCaseNote)} · **Montée en charge :** ${mdCell(meta.phasingLabel)}`)
  lines.push(`- **Cadre macroéconomique :** ${mdCell(meta.frameworkLabel)} · **Dynamiques :** ${mdCell(meta.dynamicsLabel)}`)
  if (meta.pinnedLabel) lines.push(`- **Comparaison active vs Scénario épinglé (A) :** ${mdCell(meta.pinnedLabel)}`)
  if (meta.url) lines.push(`- **Lien reproductible :** <${meta.url}>`)
  lines.push('')

  lines.push(`## L'essentiel en 3 points`)
  lines.push('')
  for (const pt of execPoints) lines.push(`- ${mdCell(pt)}`)
  if (alerts.length > 0) {
    lines.push('')
    for (const a of alerts) lines.push(`> **Alerte (${mdCell(a.level)}) :** ${mdCell(a.text)}`)
  }
  lines.push('')

  // 1. Mesures retenues
  lines.push(`## 1. Mesures retenues`)
  lines.push('')
  if (measures.length === 0) {
    lines.push(`Aucun levier budgétaire actif : le scénario suit la trajectoire de politique inchangée.`)
  } else {
    lines.push(`| Mesure | Famille | Réglage | Effet statique (Md€/an, PIB 2025) | Calendrier | Statut |`)
    lines.push(`|---|---|---|---:|---|---|`)
    for (const m of measures) {
      lines.push(`| ${mdCell(m.titre)} | ${mdCell(m.family)} | ${mdCell(m.setting)} | ${fmt(m.exAnteMd, 1, { signed: true })} | ${mdCell(m.calendar)} | ${mdCell(m.status)} |`)
    }
    lines.push(`| **Total ex ante en régime permanent** | | | **${fmt(totalExAnteMd, 1, { signed: true })}** | | |`)
  }
  lines.push('')

  // 2. Trajectoire
  lines.push(`## 2. Trajectoire budgétaire et macroéconomique`)
  lines.push('')
  const hasA = Boolean(meta.pinnedLabel && trajectory.some((r) => r.debtAPct !== undefined))
  lines.push(
    hasA
      ? `| Jalon | Dette (% PIB) | Réf. (%) | Scén. A (%) | Solde (% PIB) | Solde primaire (%) | Intérêts (Md€) | Écart PIB (%) | Chômage (%) |`
      : `| Jalon | Dette (% PIB) | Réf. (%) | Écart dette (pt) | Solde (% PIB) | Solde primaire (%) | Intérêts (Md€) | Écart PIB (%) | Chômage (%) |`,
  )
  lines.push(
    hasA
      ? `|---|---:|---:|---:|---:|---:|---:|---:|---:|`
      : `|---|---:|---:|---:|---:|---:|---:|---:|---:|`,
  )
  for (const r of trajectory) {
    const col3 = hasA ? fmt(r.debtAPct, 1) : fmt(r.debtDeltaPp, 1, { signed: true })
    lines.push(
      `| ${mdCell(r.label)} | ${fmt(r.debtPct, 1)} | ${fmt(r.debtRefPct, 1)} | ${col3} | ${fmt(r.balancePct, 2)} | ${fmt(r.primaryPct, 2)} | ${fmt(r.interestMd, 1)} | ${fmt(r.gdpGapPct, 2, { signed: true })} | ${fmt(r.unemploymentPct, 1)} |`,
    )
  }
  if (year1Paradox) {
    lines.push('')
    lines.push(`*Note Année 1 :* ${mdCell(year1Paradox)}`)
  }
  if (stressResilience && stressResilience.length > 0) {
    lines.push('')
    lines.push(`### Résistance au choc macroéconomique (${mdCell(meta.stressTitle)})`)
    lines.push('')
    lines.push(`| Horizon | Plan hors choc (Dette) | Plan sous choc (Dette) | Coût du choc sur le plan | Politique inchangée sous choc | Effet protecteur du plan | Solde sous choc |`)
    lines.push(`|---|---:|---:|---:|---:|---:|---:|`)
    for (const sr of stressResilience) {
      lines.push(
        `| ${mdCell(sr.label)} | ${fmt(sr.unshockedDebtPct, 1)} % | ${fmt(sr.shockedDebtPct, 1)} % | ${fmt(sr.shockCostDebtPp, 1, { signed: true })} pt | ${fmt(sr.shockedRefDebtPct, 1)} % | ${fmt(sr.planProtectionPp, 1, { signed: true })} pt | ${fmt(sr.shockedBalPct, 2)} % |`,
      )
    }
  }
  lines.push('')

  // 3. Décomposition de l'écart de solde
  lines.push(`## 3. Décomposition de l'écart de solde (Md€ courants)`)
  lines.push('')
  const byKey5 = Object.fromEntries(decomposition.y5.lines.map((l) => [l.key, l]))
  const byKeyEnd = Object.fromEntries(decomposition.end.lines.map((l) => [l.key, l]))
  const orderedKeys = [...new Set([...decomposition.end.lines.map((l) => l.key), ...decomposition.y5.lines.map((l) => l.key)])]
  lines.push(`| Composante | ${decomposition.y5Year} (An 5) | ${decomposition.endYear} (Fin) |`)
  lines.push(`|---|---:|---:|`)
  for (const k of orderedKeys) {
    const lEnd = byKeyEnd[k]
    const l5 = byKey5[k]
    const m5 = l5?.montant ?? 0
    const mEnd = lEnd?.montant ?? 0
    if (Math.abs(m5) < 0.05 && Math.abs(mEnd) < 0.05 && k !== 'offre:ir') continue
    const label = (lEnd ?? l5).label
    lines.push(`| ${mdCell(label)} | ${fmt(m5, 1, { signed: true })} | ${fmt(mEnd, 1, { signed: true })} |`)
  }
  lines.push(`| **Écart de solde total (scénario − référence)** | **${fmt(decomposition.y5.ecart, 1, { signed: true })}** | **${fmt(decomposition.end.ecart, 1, { signed: true })}** |`)
  lines.push('')

  // 4. Répartition APU & Incidence Stage A
  lines.push(`## 4. Répartition par sous-secteur APU et incidence statutaire`)
  lines.push('')
  lines.push(`| Sous-secteur APU | Solde ${subsectors.endYear} (Md€) | Solde ${subsectors.endYear} (% PIB) | Écart vs réf. ${subsectors.y5Year} (Md€) | Écart vs réf. ${subsectors.endYear} (Md€) |`)
  lines.push(`|---|---:|---:|---:|---:|`)
  for (const row of subsectors.rows) {
    lines.push(`| ${mdCell(row.label)} | ${fmt(row.endBalance, 1)} | ${fmt(row.endRatio, 2)} % | ${fmt(row.y5Delta, 1, { signed: true })} | ${fmt(row.endDelta, 1, { signed: true })} |`)
  }
  lines.push(`| **Total APU consolidé (S13)** | **${fmt(subsectors.totalEnd.balance, 1)}** | **${fmt(subsectors.totalEnd.ratio, 2)} %** | **${fmt(subsectors.totalEnd.y5Delta, 1, { signed: true })}** | **${fmt(subsectors.totalEnd.endDelta, 1, { signed: true })}** |`)

  if (subsectors.incidence) {
    const inc = subsectors.incidence
    lines.push('')
    lines.push(`**Incidence statutaire de 1er tour en ${inc.year} (« Qui paie ? ») :**`)
    for (const g of inc.payers) {
      if (Math.abs(g.exAnte) < 0.05 && Math.abs(g.exPost) < 0.05) continue
      const share = g.sharePct !== null ? ` (${fmt(g.sharePct, 1)} %)` : ''
      lines.push(`- ${mdCell(`${g.id} — ${g.titre}`)} : ${fmt(g.exAnte, 1, { signed: true })} Md€ ex ante${share} · net APU ${fmt(g.exPost, 1, { signed: true })} Md€`)
    }
  }
  lines.push('')

  // 5. Hypothèses clés et paramètres signalés
  lines.push(`## 5. Hypothèses clés et paramètres à vérifier`)
  lines.push('')
  for (const anc of assumptions.anchors) lines.push(`- ${mdCell(anc)}`)
  if (assumptions.flaggedParams.length > 0) {
    lines.push('')
    lines.push(`**Paramètres portant un statut à vérifier (${assumptions.flaggedParams.length}) :**`)
    for (const p of assumptions.flaggedParams) {
      lines.push(`- \`${mdCell(p.id)}\` : ${mdCell(p.rangeText)} — [${mdCell(p.status)}]`)
    }
  }
  lines.push('')

  return lines.join('\n')
}

/** Raccourci combinant `buildBriefData` et `formatBriefMarkdown`. */
export const buildBriefMarkdown = (params) => formatBriefMarkdown(buildBriefData(params))

/** Déclenche le téléchargement local du fichier Markdown assaini (sans requête réseau). */
export function downloadMarkdown(markdown, filename) {
  const safeName = safeFilename(filename, 'note-synthese-budget.md')
  const blob = new Blob([String(markdown ?? '')], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safeName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
