// Import épinglé de yields.json (LVTShift) dans le simulateur : src/engine/data/lvt-yields.json (copie verbatim) et
// src/engine/data/lvt-yields.source.json (provenance : dépôt, chemin, commit, date du commit, date d'import, empreinte SHA-256).
// Aucun accès réseau au build ni à l'exécution : le moteur lit le fichier vendu. Ce script est le seul à aller chercher LVTShift.
//
// Usage :
//   npm run sync:lvt                       # réimporte le commit épinglé dans lvt-yields.source.json
//   npm run sync:lvt -- <commit|branche>   # importe un autre commit (SHA complet de 40 caractères) ou une branche (ex. main)
//   npm run sync:lvt -- main --check       # compare seulement : code 1 si le fichier de LVTShift diffère du fichier vendu
//   npm run sync:lvt -- <ref> --clone <dossier>   # utilise un clone local de LVTShift (sinon : clone temporaire, superficiel)
//
// Récupération par git (git fetch --depth 1 <dépôt> <ref>, puis git show <commit>:<chemin>) : fonctionne là où
// raw.githubusercontent.com n'est pas joignable. Un SHA abrégé ne se récupère pas à distance ; donnez le SHA complet ou une branche.
// Le fichier est validé (src/engine/lvt-yields-schema.js) avant toute écriture : une structure inattendue arrête le script.
// Après un import : relire le diff (git diff src/engine/data), lancer npx vitest run (les gardes toBe sur les rendements
// échouent si les chiffres ont changé : les mettre à jour en connaissance de cause), puis ouvrir une PR.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateLvtYields } from '../src/engine/lvt-yields-schema.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'src/engine/data/lvt-yields.json')
const SOURCE = join(ROOT, 'src/engine/data/lvt-yields.source.json')

const fail = (msg) => { console.error(`sync:lvt : ${msg}`); process.exit(2) }

// ---- Arguments ----
const args = process.argv.slice(2)
let ref = null
let clone = null
let check = false
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--check') check = true
  else if (a === '--clone') { clone = args[++i]; if (!clone) fail('--clone demande un dossier') }
  else if (a.startsWith('-')) fail(`option inconnue « ${a} »`)
  else if (ref === null) ref = a
  else fail(`argument en trop « ${a} »`)
}

const source = JSON.parse(readFileSync(SOURCE, 'utf8'))
for (const k of ['repo', 'path', 'commit']) if (typeof source[k] !== 'string' || !source[k]) fail(`${SOURCE} : champ « ${k} » manquant`)
if (!/^[\w.-]+\/[\w.-]+$/.test(source.repo) || source.repo.includes('..')) fail(`dépôt invalide « ${source.repo} »`)
if (!/^[\w./-]+$/.test(source.path) || source.path.startsWith('/') || source.path.startsWith('-') || source.path.includes('..')) fail(`chemin invalide « ${source.path} »`)
ref = ref ?? source.commit
if (!/^[\w./-]+$/.test(ref) || ref.startsWith('-') || ref.includes('..')) fail(`référence invalide « ${ref} »`)
const repoUrl = `https://github.com/${source.repo}.git`

// ---- Récupération par git ----
const git = (cwd, gitArgs, opts = {}) => execFileSync('git', ['-C', cwd, ...gitArgs], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024, ...opts })
let workdir = clone ? resolve(clone) : null
let temp = null
let bytes, commit, commitDate
try {
  if (!workdir) {
    temp = mkdtempSync(join(tmpdir(), 'lvtshift-'))
    workdir = temp
    git(workdir, ['init', '-q'])
  } else if (!existsSync(workdir)) fail(`clone introuvable : ${workdir}`)
  // Clone local : un SHA (même abrégé) déjà présent est lu sans réseau ; une branche est toujours récupérée à distance.
  const isSha = /^[0-9a-f]{4,40}$/i.test(ref)
  let local = null
  if (clone && isSha) {
    try { local = git(workdir, ['rev-parse', '--verify', '-q', `${ref}^{commit}`]).toString().trim() } catch { local = null }
  }
  if (local) commit = local
  else {
    try {
      git(workdir, ['fetch', '-q', '--depth', '1', '--', repoUrl, ref])
    } catch (err) {
      const short = isSha && ref.length < 40
      fail(`git fetch ${repoUrl} ${ref} a échoué${short ? ' (SHA abrégé : donnez le SHA complet de 40 caractères, ou utilisez --clone avec un clone qui contient ce commit)' : ''}\n${err.stderr?.toString() ?? err.message}`)
    }
    commit = git(workdir, ['rev-parse', 'FETCH_HEAD^{commit}']).toString().trim()
  }
  commitDate = git(workdir, ['show', '-s', '--format=%cs', commit]).toString().trim()
  try {
    bytes = git(workdir, ['show', `${commit}:${source.path}`], { encoding: 'buffer' })
  } catch (err) {
    fail(`${source.path} introuvable au commit ${commit}\n${err.stderr?.toString() ?? err.message}`)
  }
} finally {
  if (temp) rmSync(temp, { recursive: true, force: true })
}

// ---- Validation ----
let parsed
try { parsed = JSON.parse(bytes.toString('utf8')) } catch (err) { fail(`JSON illisible au commit ${commit} : ${err.message}`) }
const errors = validateLvtYields(parsed)
if (errors.length) fail(`structure inattendue de ${source.path} au commit ${commit} (${errors.length} erreur(s)) :\n  - ${errors.join('\n  - ')}`)

const sha256 = createHash('sha256').update(bytes).digest('hex')
const current = existsSync(DATA) ? readFileSync(DATA) : null
const same = current !== null && Buffer.compare(current, bytes) === 0

// ---- Mode contrôle : aucune écriture ----
if (check) {
  console.log(`LVTShift ${ref} = ${commit} (${commitDate}), as_of ${parsed.as_of}, sha256 ${sha256}`)
  console.log(`Fichier vendu : commit ${source.commit} (${source.commitDate ?? '?'}), sha256 ${source.sha256 ?? '?'}`)
  if (same) { console.log('Identique : rien à importer.'); process.exit(0) }
  console.log(`Différent : lancer « npm run sync:lvt -- ${commit} », relire le diff et ouvrir une PR.`)
  const vendored = current ? JSON.parse(current.toString('utf8')) : null
  if (vendored) {
    const ref0 = Object.fromEntries((vendored.taxes ?? []).map((t) => [t.key, t.reference_meur]))
    for (const t of parsed.taxes) {
      if (ref0[t.key] !== t.reference_meur) console.log(`  taxes.${t.key}.reference_meur : ${ref0[t.key] ?? '(absent)'} -> ${t.reference_meur}`)
    }
    if (vendored.land_base?.taxable_meur !== parsed.land_base.taxable_meur) console.log(`  land_base.taxable_meur : ${vendored.land_base?.taxable_meur} -> ${parsed.land_base.taxable_meur}`)
    for (const v of parsed.variants) {
      const old = (vendored.variants ?? []).find((w) => w.scenario === v.scenario && w.include_ifi === v.include_ifi)
      if (old?.total_meur !== v.total_meur) console.log(`  variante ${v.scenario}${v.include_ifi ? '+IFI' : ''}.total_meur : ${old?.total_meur ?? '(absent)'} -> ${v.total_meur}`)
    }
    if (vendored.as_of !== parsed.as_of) console.log(`  as_of : ${vendored.as_of} -> ${parsed.as_of}`)
  }
  process.exit(1)
}

// ---- Écriture : copie verbatim + provenance ----
writeFileSync(DATA, bytes)
const today = new Date().toISOString().slice(0, 10)
const next = {
  ...source,
  commit,
  commitDate,
  fetchedAt: same && source.commit === commit && source.fetchedAt ? source.fetchedAt : today,
  sha256,
}
writeFileSync(SOURCE, `${JSON.stringify(next, null, 2)}\n`)
console.log(`${same ? 'Inchangé' : 'Importé'} : ${source.repo}@${commit} (${commitDate}), ${source.path}, as_of ${parsed.as_of}, sha256 ${sha256}`)
if (!same) console.log('Étapes suivantes : git diff src/engine/data ; npx vitest run (gardes toBe à mettre à jour si les chiffres ont changé) ; PR.')
