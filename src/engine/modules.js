// Contrat de module (note §7). Un module est un paquet autonome : le moteur l'appelle et additionne ses sorties.
// Règle : un module n'écrit JAMAIS dans la dette ni dans les intérêts ; ses sorties s'affichent sur une ligne distincte.
//
// {
//   id, titre, sources: string[], statut: 'validé' | 'non validé',
//   leviers: [{ id, unite, bornes: [min, max], defaut, aide }],
//   calculer(leviers, contexte) -> {
//     annees: [{ a: {centrales, securiteSociale, locales}, theta, m | categorie, yS?: {bas, central, haut} }],  // t = 0..N
//     flux?: [{ libelle, bloc, montant }],   // AFFICHAGE SEULEMENT, % du PIB ; n'entre pas dans le solde
//     explications?: string[],
//   },
//   explications: string[]
// }
// `a` en fraction du PIB (positif = améliore le solde) ; `theta` en [0, 1] ; `m` multiplicateur d'impact (nombre)
// ou `categorie` parmi CATEGORIES ; `yS` : effet d'offre en niveau de PIB (fraction), chemin bas / central / haut.
// `contexte` : { startYear, endYear, nYears, years, gdpBase2025, params }.

import { BLOCKS } from './levers.js'

export const CATEGORIES = ['achats_invest', 'remunerations', 'prestations', 'tva', 'ir_csg', 'cotisations', 'is']
const YEAR_KEYS = new Set(['a', 'theta', 'm', 'categorie', 'yS'])
const OUT_KEYS = new Set(['annees', 'flux', 'explications'])
const finite = (v) => Number.isFinite(v)

export function validateModuleDefinition(mod) {
  const errs = []
  if (!mod || typeof mod !== 'object') return ['module absent']
  if (typeof mod.id !== 'string' || !mod.id) errs.push('id manquant')
  if (typeof mod.titre !== 'string') errs.push('titre manquant')
  if (!Array.isArray(mod.sources)) errs.push('sources[] manquant')
  if (!['validé', 'non validé'].includes(mod.statut)) errs.push('statut doit être « validé » ou « non validé »')
  if (!Array.isArray(mod.leviers)) errs.push('leviers[] manquant')
  else for (const l of mod.leviers) {
    if (!l || typeof l !== 'object' || !l.id || !l.unite || !Array.isArray(l.bornes) || l.bornes.length !== 2 || !finite(l.bornes[0]) || !finite(l.bornes[1]) || l.bornes[0] > l.bornes[1] || !finite(l.defaut) || typeof l.aide !== 'string') errs.push(`levier mal formé : ${l?.id}`)
  }
  if (typeof mod.calculer !== 'function') errs.push('calculer() manquant')
  if (!Array.isArray(mod.explications)) errs.push('explications[] manquant')
  return errs
}

/** Valeurs de leviers du module, bornées, avec défauts ; entrées non finies => défaut. */
export function moduleLeverValues(mod, values = {}) {
  return Object.fromEntries(mod.leviers.map((l) => {
    const v = values[l.id]
    return [l.id, finite(v) ? Math.min(l.bornes[1], Math.max(l.bornes[0], v)) : l.defaut]
  }))
}

/**
 * Appelle le module et valide sa sortie ; renvoie un instrument du moteur
 * { id, source:'module', categorie|m, aBlocks, theta, yS?, flux, explications, statut, titre }.
 */
export function runModule(mod, values, context) {
  const errs = validateModuleDefinition(mod)
  if (errs.length) throw new Error(`module « ${mod?.id} » invalide : ${errs.join(' ; ')}`)
  const out = mod.calculer(moduleLeverValues(mod, values), context)
  if (!out || typeof out !== 'object' || Array.isArray(out)) throw new Error(`module « ${mod.id} » : objet de sortie attendu`)
  for (const k of Object.keys(out)) {
    if (!OUT_KEYS.has(k)) throw new Error(`module « ${mod.id} » : sortie interdite « ${k} » (un module n'écrit jamais dans la dette ni dans les intérêts)`)
  }
  const n = context.nYears + 1
  if (!Array.isArray(out.annees) || out.annees.length !== n) throw new Error(`module « ${mod.id} » : annees[] doit avoir ${n} éléments`)
  const aBlocks = { centrales: [], securiteSociale: [], locales: [] }
  const theta = []
  const m = []
  const yS = { bas: [], central: [], haut: [] }
  let hasYS = false
  out.annees.forEach((y, t) => {
    if (!y || typeof y !== 'object' || Array.isArray(y)) throw new Error(`module « ${mod.id} », année ${t} : objet attendu`)
    for (const k of Object.keys(y)) if (!YEAR_KEYS.has(k)) throw new Error(`module « ${mod.id} », année ${t} : clé interdite « ${k} »`)
    for (const b of BLOCKS) {
      const v = y.a?.[b] ?? 0
      if (!finite(v)) throw new Error(`module « ${mod.id} », année ${t} : a.${b} non fini`)
      aBlocks[b].push(v)
    }
    const th = y.theta ?? 0
    if (!finite(th) || th < 0 || th > 1) throw new Error(`module « ${mod.id} », année ${t} : theta hors de [0, 1]`)
    theta.push(th)
    if (y.m !== undefined) {
      if (!finite(y.m) || y.m < 0) throw new Error(`module « ${mod.id} », année ${t} : m invalide`)
      m.push(y.m)
    } else if (y.categorie !== undefined) {
      if (!CATEGORIES.includes(y.categorie)) throw new Error(`module « ${mod.id} », année ${t} : catégorie inconnue « ${y.categorie} »`)
      m.push(context.params[`dem.m.${y.categorie}`])
    } else throw new Error(`module « ${mod.id} », année ${t} : m ou categorie requis`)
    if (y.yS !== undefined) {
      if (!y.yS || typeof y.yS !== 'object' || Array.isArray(y.yS)) throw new Error(`module « ${mod.id} », année ${t} : yS doit être un objet`)
      hasYS = true
      for (const c of ['bas', 'central', 'haut']) {
        if (!finite(y.yS[c])) throw new Error(`module « ${mod.id} », année ${t} : yS.${c} non fini`)
        yS[c].push(y.yS[c])
      }
    } else for (const c of ['bas', 'central', 'haut']) yS[c].push(0)
  })
  if (out.flux !== undefined && !Array.isArray(out.flux)) throw new Error(`module « ${mod.id} » : flux doit être un tableau`)
  for (const f of out.flux ?? []) {
    if (!f || typeof f !== 'object' || !BLOCKS.includes(f.bloc) || !finite(f.montant) || typeof f.libelle !== 'string') throw new Error(`module « ${mod.id} » : flux mal formé`)
  }
  if (out.explications !== undefined && (!Array.isArray(out.explications) || !out.explications.every((s) => typeof s === 'string'))) {
    throw new Error(`module « ${mod.id} » : explications doit être un tableau de textes`)
  }
  return {
    id: mod.id, titre: mod.titre, source: 'module', statut: mod.statut, aBlocks, theta, mByYear: m,
    yS: hasYS ? yS : null, flux: out.flux ?? [], explications: [...(mod.explications ?? []), ...(out.explications ?? [])],
  }
}

/** Module de test trivial (pas le module LVT) : un transfert fictif entre blocs, un flux d'affichage, un effet d'offre optionnel. */
export const TEST_MODULE = {
  id: 'module_test',
  titre: 'Module de test',
  sources: ['Aucune : module fictif pour tester le contrat'],
  statut: 'non validé',
  leviers: [
    { id: 'taille', unite: '% du PIB', bornes: [-1, 1], defaut: 0, aide: 'Améliore le solde de l\'État de cette part de PIB et dégrade celui de la sécurité sociale de moitié moins.' },
    { id: 'effet_offre', unite: '% du PIB (niveau)', bornes: [-2, 2], defaut: 0, aide: 'Effet d\'offre fictif sur le niveau du PIB (central ; bas = moitié, haut = double), atteint dès 2027.' },
  ],
  calculer({ taille, effet_offre }, { nYears }) {
    const annees = Array.from({ length: nYears + 1 }, (_, t) => {
      const on = t >= 1 ? 1 : 0
      const ys = (effet_offre / 100) * on
      return {
        a: { centrales: (taille / 100) * on, securiteSociale: (-taille / 200) * on, locales: 0 },
        theta: 0, categorie: 'tva', yS: { bas: ys / 2, central: ys, haut: ys * 2 },
      }
    })
    return {
      annees,
      flux: [{ libelle: 'Flux brut fictif', bloc: 'locales', montant: Math.abs(taille) / 100 }],
      explications: ['Module fictif : ne sert qu\'à vérifier que les sorties atterrissent dans le bon bloc.'],
    }
  },
  explications: ['Module de test du contrat de la note (section 7).'],
}
