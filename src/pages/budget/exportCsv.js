// Export CSV du scénario courant et de la référence, année par année. Fonctions pures (testées dans exportCsv.test.js) ;
// le téléchargement lui-même est dans downloadCsv. Format pour Excel français : séparateur « ; », virgule décimale,
// UTF-8 avec BOM, fins de ligne CRLF.

import { LEVERS } from '../../engine/levers.js'
import { decomposeAtYear } from './helpers.js'

const SEP = ';'
const EOL = '\r\n'
const BOM = '\uFEFF'
const FORMULA_TRIGGER = /^[ \t\r]*[=+\-@]|^[\t\r]/

/** Nombre avec virgule décimale et sans séparateur de milliers ; cellule vide si la valeur n'est pas un nombre fini. */
export function csvNumber(v, decimals = 3) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return ''
  const r = Number(v.toFixed(decimals))
  return String(Math.abs(r) < 1e-12 ? 0 : r).replace('.', ',')
}

/** Cellule de texte : neutralise les préfixes de formule tableur (CWE-1236) et protège « ; », guillemets ou sauts de ligne. */
export function csvText(s) {
  let t = String(s ?? '')
  if (FORMULA_TRIGGER.test(t)) t = `'${t}`
  return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

const KIND_SUM = ['macro', 'statique', 'comportement', 'demande', 'offre', 'interets']

export const COLUMNS = [
  'Année',
  'PIB scénario (Md€)', 'Solde scénario (% du PIB)', 'Dette scénario (% du PIB)', 'Intérêts scénario (Md€)', 'Chômage scénario (%)',
  'PIB référence (Md€)', 'Solde référence (% du PIB)', 'Dette référence (% du PIB)', 'Intérêts référence (Md€)', 'Chômage référence (%)',
  'Écart de solde total (Md€)',
  'Cause : hypothèses macroéconomiques (Md€)',
  'Cause : mesures, effet statique (Md€)', 'Cause : réaction comportementale et reports (Md€)', 'Cause : demande (Md€)',
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
 * Contenu complet du CSV (avec BOM) : bloc d'en-tête (version, lien, horizon, cas, variante macro éventuelle, modules actifs, leviers),
 * ligne vide, tableau. `modules` : [[libellé du module, réglage]] des modules actifs (p. ex. taxe sur la valeur du sol).
 * @param {{stamp: string, url: string, horizonLabel: string, ysCase: string, macroLabel?: string | null, modules?: string[][], values: object, rows: number[][]}} o
 */
export function buildCsv({ stamp, url, horizonLabel, ysCase, macroLabel = null, modules = [], values, rows }) {
  const headerRows = [
    ['Simulateur Budget France : export du scénario'],
    ['Version', stamp],
    ['Lien du scénario', url],
    ['Horizon', horizonLabel],
    ['Cas des effets d\'offre', ysCase],
  ]
  if (macroLabel) headerRows.push(['Hypothèses macroéconomiques', macroLabel])
  for (const m of modules ?? []) headerRows.push(m.map(String))
  headerRows.push(['Leviers (dès 2027, âge légal dès 2028 en hausse [2028–2034] ou 2029 en baisse [2029–2033])'])
  const lines = headerRows.map((cells) => cells.map(csvText).join(SEP))
  const active = LEVERS.filter((l) => typeof values?.[l.id] === 'number' && Number.isFinite(values[l.id]) && values[l.id] !== 0)
  if (active.length === 0) {
    const why = modules?.length ? 'Aucun levier actif (modules seuls)' : macroLabel ? 'Aucun levier actif (comparateur macroéconomique seul)' : 'Aucun levier actif (scénario identique à la référence)'
    lines.push(csvText(why))
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
