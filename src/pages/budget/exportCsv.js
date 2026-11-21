// Export CSV du scénario courant et de la référence, année par année. Fonctions pures (testées dans exportCsv.test.js) ;
// le téléchargement lui-même est dans downloadCsv. Format pour Excel français : séparateur « ; », virgule décimale,
// UTF-8 avec BOM, fins de ligne CRLF.

import { LEVERS } from '../../engine/levers.js'
import { decomposeAtYear } from './helpers.js'

const SEP = ';'
const EOL = '\r\n'
const BOM = '﻿'

/** Nombre avec virgule décimale et sans séparateur de milliers ; cellule vide si la valeur n'est pas un nombre fini. */
export function csvNumber(v, decimals = 3) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return ''
  const r = Number(v.toFixed(decimals))
  return String(Math.abs(r) < 1e-12 ? 0 : r).replace('.', ',')
}

/** Cellule de texte : entre guillemets si elle contient « ; », un guillemet ou un saut de ligne. */
export function csvText(s) {
  const t = String(s ?? '')
  return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

const KIND_SUM = ['macro', 'statique', 'comportement', 'demande', 'offre', 'interets']

export const COLUMNS = [
  'Année',
  'PIB scénario (Md€)', 'Solde scénario (% du PIB)', 'Dette scénario (% du PIB)', 'Intérêts scénario (Md€)', 'Chômage scénario (%)',
  'PIB référence (Md€)', 'Solde référence (% du PIB)', 'Dette référence (% du PIB)', 'Intérêts référence (Md€)', 'Chômage référence (%)',
  'Écart de solde total (Md€)',
  'Cause : hypothèses macroéconomiques (Md€)',
  'Cause : mesures, effet statique (Md€)', 'Cause : réaction des contribuables (Md€)', 'Cause : demande (Md€)',
  'Cause : effets d\'offre (Md€)', 'Cause : intérêts (Md€)',
]

/** Lignes numériques du tableau, une par année (2026 comprise). Ratios en %, montants en Md€. */
export function buildExportRows(result, reference, eps, epsOffre) {
  return result.total.map((r, t) => {
    const b = reference.total[t]
    const d = decomposeAtYear(result, reference, t, eps, epsOffre)
    const byKind = Object.fromEntries(KIND_SUM.map((k) => [k, d.lines.filter((l) => l.kind === k).reduce((s, l) => s + l.montant, 0)]))
    return [
      r.year,
      r.gdp, r.balanceRatio * 100, r.debtRatio * 100, r.interest, r.unemployment,
      b.gdp, b.balanceRatio * 100, b.debtRatio * 100, b.interest, b.unemployment,
      d.ecart,
      byKind.macro, byKind.statique, byKind.comportement, byKind.demande, byKind.offre, byKind.interets,
    ]
  })
}

/**
 * Contenu complet du CSV (avec BOM) : bloc d'en-tête (version, lien, horizon, cas, variante macro éventuelle, leviers), ligne vide, tableau.
 * @param {{stamp: string, url: string, horizonLabel: string, ysCase: string, macroLabel?: string | null, values: object, rows: number[][]}} o
 */
export function buildCsv({ stamp, url, horizonLabel, ysCase, macroLabel = null, values, rows }) {
  const headerRows = [
    ['Simulateur Budget France : export du scénario'],
    ['Version', stamp],
    ['Lien du scénario', url],
    ['Horizon', horizonLabel],
    ['Cas des effets d\'offre', ysCase],
  ]
  if (macroLabel) headerRows.push(['Hypothèses macroéconomiques', macroLabel])
  headerRows.push(['Leviers (dès 2027, âge légal dès 2028 avec montée en charge sur 6 ans)'])
  const lines = headerRows.map((cells) => cells.map(csvText).join(SEP))
  const active = LEVERS.filter((l) => typeof values?.[l.id] === 'number' && Number.isFinite(values[l.id]) && values[l.id] !== 0)
  if (active.length === 0) {
    lines.push(csvText(macroLabel ? 'Aucun levier actif (comparateur macroéconomique seul)' : 'Aucun levier actif (scénario identique à la référence)'))
  }
  for (const l of active) lines.push([csvText(l.titre), csvNumber(values[l.id], 2), csvText(l.unite)].join(SEP))
  lines.push('')
  lines.push(COLUMNS.map(csvText).join(SEP))
  for (const row of rows) lines.push(row.map((v, i) => (i === 0 ? String(v) : csvNumber(v))).join(SEP))
  return BOM + lines.join(EOL) + EOL
}

/** Déclenche le téléchargement d'un texte CSV (Blob + lien « download »). */
export function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
