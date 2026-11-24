// Contrôle de structure de yields.json (LVTShift), partagé par scripts/sync-lvt-yields.mjs (à l'import) et par
// src/engine/lvt-snapshot.js (au chargement du module). Aucune dépendance : JavaScript pur, utilisable par Node et par Vite.
// Toute structure inattendue est une erreur : un changement de format chez LVTShift doit être relu avant d'entrer dans le moteur.
// Énumérations reprises de lvtshift-fr/yields.py (Tier, Status) et de la docstring de TaxYield (scenario).

export const LVT_YIELDS_TIERS = Object.freeze(['local', 'departmental', 'national'])
export const LVT_YIELDS_STATUSES = Object.freeze(['verified', 'derived', 'reported'])
export const LVT_YIELDS_TAX_SCENARIOS = Object.freeze(['S1', 'S2', 'S2_IFI', 'S3'])
/** Variantes lues par le module (scénario, include_ifi), dans l'ordre du levier (codes 1 à 5). */
export const LVT_YIELDS_VARIANTS = Object.freeze([['S1', false], ['S2', false], ['S2', true], ['S3', false], ['S3', true]].map(Object.freeze))
/** Lignes d'impôts dont le module lit les montants (lvt-snapshot.js). */
export const LVT_YIELDS_REQUIRED_KEYS = Object.freeze([
  'tfpb', 'tfpnb', 'tf_annexes', 'tf_etat', 'thrs', 'thrs_etat', 'dmto_communes', 'dmto_departements', 'dmto_etat',
  'gains_ir', 'gains_ps', 'ifi', 'rents_ir', 'rents_ps', 'rents_csg',
])
/** Écart toléré entre un niveau publié d'une variante et la somme des reference_meur de ses lignes (arrondi au M€). */
const TOL_MEUR = 1.5

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const num = (v) => typeof v === 'number' && Number.isFinite(v)
const str = (v) => typeof v === 'string' && v.length > 0
const https = (v) => str(v) && /^https:\/\/[^\s]+$/.test(v)
const date = (v) => str(v) && /^\d{4}-\d{2}-\d{2}$/.test(v)
const year = (v) => Number.isInteger(v) && v >= 1990 && v <= 2100

/**
 * Vérifie la structure et la cohérence interne de yields.json.
 * @param {unknown} y  contenu analysé (JSON.parse)
 * @returns {string[]} liste des erreurs (vide si le fichier est conforme)
 */
export function validateLvtYields(y) {
  const e = []
  if (!isObj(y)) return ['racine : objet attendu']
  if (!date(y.as_of)) e.push('as_of : date AAAA-MM-JJ attendue')
  const pb = y.price_basis
  if (!isObj(pb)) e.push('price_basis : objet attendu')
  else {
    if (!year(pb.year)) e.push('price_basis.year : année attendue')
    if (!str(pb.source)) e.push('price_basis.source : texte attendu')
    if (!https(pb.url)) e.push('price_basis.url : URL https attendue')
  }

  const byKey = {}
  if (!Array.isArray(y.taxes) || y.taxes.length === 0) e.push('taxes : tableau non vide attendu')
  else {
    y.taxes.forEach((t, i) => {
      const at = `taxes[${i}]${isObj(t) && str(t.key) ? ` (${t.key})` : ''}`
      if (!isObj(t)) { e.push(`${at} : objet attendu`); return }
      if (!str(t.key)) e.push(`${at}.key : texte attendu`)
      else if (byKey[t.key]) e.push(`${at}.key : clé en double`)
      else byKey[t.key] = t
      if (!str(t.label_fr)) e.push(`${at}.label_fr : texte attendu`)
      if (!LVT_YIELDS_TAX_SCENARIOS.includes(t.scenario)) e.push(`${at}.scenario : « ${t.scenario} » inattendu (${LVT_YIELDS_TAX_SCENARIOS.join(', ')})`)
      if (!LVT_YIELDS_TIERS.includes(t.tier)) e.push(`${at}.tier : « ${t.tier} » inattendu (${LVT_YIELDS_TIERS.join(', ')})`)
      if (!LVT_YIELDS_STATUSES.includes(t.status)) e.push(`${at}.status : « ${t.status} » inattendu (${LVT_YIELDS_STATUSES.join(', ')})`)
      if (!num(t.reference_meur) || t.reference_meur < 0) e.push(`${at}.reference_meur : nombre positif attendu`)
      if (!str(t.source)) e.push(`${at}.source : texte attendu`)
      if (!https(t.url)) e.push(`${at}.url : URL https attendue`)
      if (!isObj(t.values_meur) || Object.keys(t.values_meur).length === 0) e.push(`${at}.values_meur : objet non vide attendu`)
      else {
        for (const [k, v] of Object.entries(t.values_meur)) {
          if (!year(Number(k)) || !num(v)) e.push(`${at}.values_meur.${k} : année -> nombre attendu`)
        }
      }
      if (!Array.isArray(t.reference_years) || t.reference_years.length === 0 || !t.reference_years.every(year)) e.push(`${at}.reference_years : tableau d'années attendu`)
    })
    for (const k of LVT_YIELDS_REQUIRED_KEYS) if (!byKey[k]) e.push(`taxes : ligne « ${k} » absente (lue par le module)`)
  }

  const lb = y.land_base
  if (!isObj(lb)) e.push('land_base : objet attendu')
  else {
    if (!num(lb.taxable_meur) || lb.taxable_meur <= 0) e.push('land_base.taxable_meur : nombre strictement positif attendu')
    if (!year(lb.year)) e.push('land_base.year : année attendue')
    if (!str(lb.source)) e.push('land_base.source : texte attendu')
    if (!https(lb.url)) e.push('land_base.url : URL https attendue')
  }

  if (!Array.isArray(y.variants) || y.variants.length === 0) e.push('variants : tableau non vide attendu')
  else {
    y.variants.forEach((v, i) => {
      const at = `variants[${i}]${isObj(v) ? ` (${v.scenario}${v.include_ifi ? ' + IFI' : ''})` : ''}`
      if (!isObj(v)) { e.push(`${at} : objet attendu`); return }
      if (!str(v.scenario)) e.push(`${at}.scenario : texte attendu`)
      if (typeof v.include_ifi !== 'boolean') e.push(`${at}.include_ifi : booléen attendu`)
      if (!num(v.total_meur) || v.total_meur <= 0) e.push(`${at}.total_meur : nombre strictement positif attendu`)
      if (!num(v.rate_pct)) e.push(`${at}.rate_pct : nombre attendu`)
      if (!isObj(v.tiers_meur)) e.push(`${at}.tiers_meur : objet attendu`)
      else {
        const extra = Object.keys(v.tiers_meur).filter((k) => !LVT_YIELDS_TIERS.includes(k))
        if (extra.length) e.push(`${at}.tiers_meur : niveaux inattendus ${extra.join(', ')}`)
        for (const k of LVT_YIELDS_TIERS) if (!num(v.tiers_meur[k])) e.push(`${at}.tiers_meur.${k} : nombre attendu`)
      }
      if (!Array.isArray(v.lines) || v.lines.length === 0) { e.push(`${at}.lines : tableau non vide attendu`); return }
      const unknown = v.lines.filter((k) => !byKey[k])
      if (unknown.length) { e.push(`${at}.lines : lignes inconnues ${unknown.join(', ')}`); return }
      // Cohérence interne : chaque niveau publié égale la somme des reference_meur de ses lignes ; le total, la somme des niveaux.
      if (isObj(v.tiers_meur) && LVT_YIELDS_TIERS.every((k) => num(v.tiers_meur[k]))) {
        for (const k of LVT_YIELDS_TIERS) {
          const s = v.lines.reduce((a, key) => a + (byKey[key].tier === k ? byKey[key].reference_meur : 0), 0)
          if (Math.abs(s - v.tiers_meur[k]) > TOL_MEUR) e.push(`${at}.tiers_meur.${k} = ${v.tiers_meur[k]} ≠ somme des lignes ${s}`)
        }
        const tot = LVT_YIELDS_TIERS.reduce((a, k) => a + v.tiers_meur[k], 0)
        if (num(v.total_meur) && Math.abs(tot - v.total_meur) > TOL_MEUR) e.push(`${at}.total_meur = ${v.total_meur} ≠ somme des niveaux ${tot}`)
      }
    })
    for (const [sc, ifi] of LVT_YIELDS_VARIANTS) {
      const n = y.variants.filter((v) => isObj(v) && v.scenario === sc && v.include_ifi === ifi).length
      if (n !== 1) e.push(`variants : ${n} variante(s) ${sc}${ifi ? ' avec IFI' : ' sans IFI'} (une attendue)`)
    }
  }
  return e
}

/** Lève une erreur lisible si yields.json n'est pas conforme. */
export function assertLvtYields(y, origine = 'yields.json') {
  const errs = validateLvtYields(y)
  if (errs.length) throw new Error(`${origine} : structure inattendue (${errs.length} erreur(s)) :\n  - ${errs.join('\n  - ')}`)
  return y
}
