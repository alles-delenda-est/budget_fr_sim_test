// Test de fumée mobile (facultatif, hors CI) : ouvre la page budget construite à 375 px avec 10 liens de scénario aléatoires
// et vérifie : aucune erreur de console, aucun « NaN » dans le texte, aucun débordement horizontal.
//
// Usage :
//   npm run build && npx vite preview --port 4173 &
//   npm install --no-save --prefix /tmp/smoke puppeteer-core     # hors du dépôt
//   NODE_PATH=/tmp/smoke/node_modules CHROME_BIN=/usr/bin/google-chrome node scripts/mobile-smoke.mjs [http://localhost:4173] [graine]
//
// Sans puppeteer-core ou sans Chrome, le script le dit et sort avec le code 0 (rien à vérifier).

import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { LEVERS } from '../src/engine/levers.js'
import { HORIZONS } from '../src/engine/project.js'
import { encodeScenario } from '../src/pages/budget/share.js'

const base = process.argv[2] ?? 'http://localhost:4173'
let seed = Number(process.argv[3] ?? 20261118) >>> 0
const rng = () => { // mulberry32
  seed = (seed + 0x6d2b79f5) >>> 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (a) => a[Math.floor(rng() * a.length)]

const require = createRequire(import.meta.url)
let puppeteer
try { puppeteer = require('puppeteer-core') } catch { console.log('puppeteer-core introuvable : test de fumée ignoré.'); process.exit(0) }
const chrome = [process.env.CHROME_BIN, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => p && existsSync(p))
if (!chrome) { console.log('Aucun binaire Chrome trouvé (CHROME_BIN) : test de fumée ignoré.'); process.exit(0) }

const scenarios = Array.from({ length: 10 }, (_, i) => {
  const values = {}
  for (const l of LEVERS) {
    if (i === 0) values[l.id] = l.min
    else if (i === 1) values[l.id] = l.max
    else if (rng() < 0.5) values[l.id] = rng() < 0.2 ? pick([l.min, l.max]) : l.min + rng() * (l.max - l.min)
  }
  return { values, horizon: pick(Object.keys(HORIZONS)), ysCase: pick(['bas', 'central', 'haut']) }
})

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] })
let failures = 0
for (const [i, s] of scenarios.entries()) {
  const url = `${base}/#/budget?${encodeScenario(s)}`
  const page = await browser.newPage()
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 800))
  const { text, scrollWidth, clientWidth } = await page.evaluate(() => ({
    text: document.body.innerText, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
  }))
  const problems = []
  if (errors.length) problems.push(`erreurs de console : ${errors.slice(0, 3).join(' | ')}`)
  if (/NaN|Infinity|undefined/.test(text)) problems.push('texte « NaN », « Infinity » ou « undefined » affiché')
  if (scrollWidth > clientWidth + 1) problems.push(`débordement horizontal (${scrollWidth} > ${clientWidth})`)
  if (text.trim().length < 200) problems.push('page quasi vide')
  console.log(`${problems.length ? 'ÉCHEC' : 'OK   '} ${i + 1}/10 ${url}${problems.length ? '\n       ' + problems.join('\n       ') : ''}`)
  failures += problems.length ? 1 : 0
  await page.close()
}
await browser.close()
console.log(failures ? `${failures} scénario(s) en échec` : 'Tous les scénarios sont corrects.')
process.exit(failures ? 1 : 0)
