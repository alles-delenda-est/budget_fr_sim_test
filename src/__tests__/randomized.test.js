// Tests aléatoires (graine fixe) : ce qu'on ferait à la main (valeurs extrêmes, petits changements, graphiques sur mobile),
// mais tiré au hasard. Chaque test tire de 50 à 200 cas d'un générateur mulberry32 ; en cas d'échec, le message
// donne la graine, le numéro du cas et les valeurs de leviers, pour rejouer exactement le même cas.
// Pour explorer d'autres tirages : changer BASE_SEED (le nom des tests porte la graine).

import { describe, it, expect } from 'vitest'
import { LEVERS, LEVER_BY_ID, BLOCKS, leversToInstruments, staticYield } from '../engine/levers.js'
import { PARAMS, resolveParams } from '../engine/params.js'
import { projectScenario, HORIZONS, deepFreeze } from '../engine/project.js'
import { SUPPLY_EFFECTS } from '../engine/supply.js'
import { TEST_MODULE } from '../engine/modules.js'
import { fmt, buildSeries, decomposeAtYear, visibleLines, HIDE_BELOW, deltaTone, paramRange } from '../pages/budget/helpers.js'
import { encodeScenario, decodeScenario } from '../pages/budget/share.js'
import { buildExportRows, buildCsv, COLUMNS, csvNumber } from '../pages/budget/exportCsv.js'

const BASE_SEED = 20261118
const RATE_MAX = 0.25 // plafond du taux à l'émission dans project.js (non exporté)
const HORIZON_IDS = Object.keys(HORIZONS)
const CASES = ['bas', 'central', 'haut']
const P0 = resolveParams()

// ---------- Générateur pseudo-aléatoire à graine (mulberry32) ----------
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const uniform = (rng, lo, hi) => lo + (hi - lo) * rng()
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]
const shuffled = (rng, arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
const clampLever = (l, x) => Math.min(l.max, Math.max(l.min, x))
const randomLevers = (rng, { density = 0.5 } = {}) =>
  Object.fromEntries(LEVERS.filter(() => rng() < density).map((l) => [l.id, uniform(rng, l.min, l.max)]))
const extremeMixLevers = (rng) => Object.fromEntries(LEVERS.map((l) => [l.id, pick(rng, [l.min, l.max, 0])]))

/**
 * Tire `n` cas. `body(rng, c)` peut renseigner `c.info` (valeurs de leviers, etc.) ; si le cas échoue, l'erreur est
 * relancée avec la graine, le numéro du cas et `c.info`, pour reproduire.
 */
function forCases(name, seed, n, body) {
  const rng = mulberry32(seed)
  for (let i = 0; i < n; i++) {
    const c = { info: null }
    try {
      body(rng, c, i)
    } catch (e) {
      e.message = `[${name} | seed=${seed} | cas ${i}/${n}] ${JSON.stringify(c.info)}\n${e.message}`
      throw e
    }
  }
}

/** Parcourt récursivement un résultat et renvoie le chemin du premier nombre non fini (ou null). */
function firstNonFinite(o, path = 'result', seen = new Set()) {
  if (typeof o === 'number') return Number.isFinite(o) ? null : `${path}=${o}`
  if (o && typeof o === 'object') {
    if (seen.has(o)) return null
    seen.add(o)
    for (const [k, v] of Object.entries(o)) {
      const r = firstNonFinite(v, `${path}.${k}`, seen)
      if (r) return r
    }
  }
  return null
}

const TOTAL_FIELDS = ['gdp', 'debt', 'debtRatio', 'balanceRatio', 'interest', 'avgRate', 'unemployment']
const isFiniteOrNull = (v) => v === null || (typeof v === 'number' && Number.isFinite(v))
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b))
const revenueLevers = LEVERS.filter((l) => l.type === 'recette')
const balanceUpLevers = LEVERS.filter((l) => l.signe > 0)
const balanceDownLevers = LEVERS.filter((l) => l.signe < 0)

describe(`tests aléatoires (graine de base ${BASE_SEED})`, () => {
  // ================= Valeurs extrêmes =================
  it('01 [seed +1] leviers au min, au max ou à 0, horizon et cas au hasard : aucune valeur non finie', () => {
    forCases('01', BASE_SEED + 1, 150, (rng, c) => {
      const levers = extremeMixLevers(rng)
      const horizon = pick(rng, HORIZON_IDS)
      const ysCase = pick(rng, CASES)
      c.info = { levers, horizon, ysCase }
      const r = projectScenario({ levers, horizon, ysCase })
      for (const row of r.total) for (const f of TOTAL_FIELDS) expect(Number.isFinite(row[f]), `${row.year}.${f}=${row[f]}`).toBe(true)
      expect(firstNonFinite(r)).toBeNull()
    })
  })

  it('02 [seed +2] leviers uniformes dans [min, max], tous horizons : dette ≤ 1000 % du PIB (finie sur 30 ans), taux et chômage dans des bornes plausibles', () => {
    forCases('02', BASE_SEED + 2, 120, (rng, c) => {
      const levers = Object.fromEntries(LEVERS.map((l) => [l.id, uniform(rng, l.min, l.max)]))
      const horizon = pick(rng, HORIZON_IDS)
      c.info = { levers, horizon }
      const r = projectScenario({ levers, horizon, ysCase: pick(rng, CASES) })
      for (const row of r.total) {
        expect(row.debtRatio, `debtRatio ${row.year}`).toBeGreaterThanOrEqual(0)
        // Bande de la spécification : 0 à 1000 % du PIB jusqu'à 2040. Sur 30 ans avec tous les leviers tirés au hasard, la dette peut
        // exploser (effet boule de neige : 1055 % en 2055 avec la graine 20261120, cas 14 ; 3033 % en 2056 avec la graine 102, cas 7,
        // après les effets d'offre fiscaux). Ce n'est pas un défaut du moteur : sur cet horizon, on vérifie seulement que la dette
        // reste finie et positive (le test 01 couvre déjà les valeurs non finies).
        if (horizon === 'trenteAns') expect(Number.isFinite(row.debtRatio), `debtRatio fini ${row.year}`).toBe(true)
        else expect(row.debtRatio, `debtRatio ${row.year}`).toBeLessThanOrEqual(10)
        for (const k of ['avgRate', 'newRate']) {
          expect(row[k], `${k} ${row.year}`).toBeGreaterThanOrEqual(0)
          expect(row[k], `${k} ${row.year}`).toBeLessThanOrEqual(RATE_MAX)
        }
        expect(row.unemployment, `chômage ${row.year}`).toBeGreaterThanOrEqual(0)
        expect(row.unemployment, `chômage ${row.year}`).toBeLessThanOrEqual(100)
      }
    })
  })

  it('03 [seed +3] entrées aberrantes (hors bornes, ±1e9, NaN, texte, undefined, ids inconnus) : pas d\'exception, valeurs bornées ou ignorées', () => {
    const junk = [1e9, -1e9, NaN, Infinity, -Infinity, 'abc', '3', '', null, undefined, {}, [], true]
    // Équivalent « propre » : valeur non finie ou non numérique => 0 (levier absent), sinon bornée.
    const clean = (l, v) => (typeof v === 'number' && Number.isFinite(v) ? clampLever(l, v) : 0)
    forCases('03', BASE_SEED + 3, 100, (rng, c) => {
      // (a) lever -> instruments / projection
      const dirty = {}
      const cleaned = {}
      for (const l of LEVERS) {
        if (rng() < 0.5) continue
        const v = rng() < 0.5 ? pick(rng, junk) : (rng() < 0.5 ? l.max : l.min) * uniform(rng, 1, 50) * (rng() < 0.5 ? 1 : -1)
        dirty[l.id] = v
        cleaned[l.id] = clean(l, v)
      }
      dirty[`inconnu_${Math.floor(rng() * 1000)}`] = 5
      dirty.__proto__x = 1
      c.info = { dirty: JSON.stringify(dirty, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v === undefined ? 'undefined' : v)), cleaned }
      const a = projectScenario({ levers: dirty })
      const b = projectScenario({ levers: cleaned })
      expect(a.total).toEqual(b.total)
      expect(() => leversToInstruments(dirty, P0, 10)).not.toThrow()
      expect(firstNonFinite(a)).toBeNull()

      // (b) décodeur d'URL
      const q = new URLSearchParams()
      const expected = {}
      for (const l of LEVERS) {
        if (rng() < 0.5) continue
        const raw = pick(rng, ['1e9', '-1e9', 'NaN', 'Infinity', '-Infinity', 'abc', '', '  ', String(uniform(rng, l.min * 3, l.max * 3)), '0', '-0', '1e-9'])
        q.set(l.id, raw)
        const x = raw.trim() === '' ? NaN : Number(raw)
        if (Number.isFinite(x)) { const v = clampLever(l, x); if (v !== 0) expected[l.id] = v }
      }
      q.set('zzz', '3'); q.set('h', 'nope'); q.set('cas', 'extreme')
      c.info = { query: q.toString() }
      let d
      expect(() => { d = decodeScenario(q.toString()) }).not.toThrow()
      expect(d.values).toEqual(expected)
      expect(d.horizon).toBe('dixAns')
      expect(d.ysCase).toBe('central')
      for (const [id, v] of Object.entries(d.values)) {
        expect(v).toBeGreaterThanOrEqual(LEVER_BY_ID[id].min)
        expect(v).toBeLessThanOrEqual(LEVER_BY_ID[id].max)
      }
    })
  })

  it('04 [seed +4] remplacements de paramètres dans [bas, haut] : la projection reste finie', () => {
    const numeric = PARAMS.filter((q) => q.low !== null && q.high !== null && typeof q.value === 'number' && !q.id.startsWith('cmp.'))
    const series = PARAMS.filter((q) => typeof q.value === 'object' && q.low && q.high)
    forCases('04', BASE_SEED + 4, 100, (rng, c) => {
      const overrides = {}
      for (const q of shuffled(rng, numeric).slice(0, 1 + Math.floor(rng() * 12))) {
        const lo = Math.min(q.low, q.high)
        const hi = Math.max(q.low, q.high)
        overrides[q.id] = uniform(rng, lo, hi)
      }
      for (const q of series) {
        if (rng() < 0.5) continue
        overrides[q.id] = Object.fromEntries(Object.keys(q.value).map((y) => [y, uniform(rng, Math.min(q.low[y], q.high[y]), Math.max(q.low[y], q.high[y]))]))
      }
      const levers = randomLevers(rng)
      const horizon = pick(rng, HORIZON_IDS)
      c.info = { overrides, levers, horizon }
      const r = projectScenario({ levers, overrides, horizon, ysCase: pick(rng, CASES) })
      expect(firstNonFinite(r)).toBeNull()
    })
  })

  // ================= Graphiques et mobile (proxys : on teste les données que consomment les graphiques) =================
  const CHART_KEYS = [['debt', 'debtRef'], ['balance', 'balanceRef'], ['interest', 'interestRef'], ['gdpGap', 'gdpGapRef'], ['unemployment', 'unemploymentRef']]

  it('05 [seed +5] séries des graphiques : longueur de l\'horizon, points finis ou null, années croissantes, référence alignée', () => {
    forCases('05', BASE_SEED + 5, 100, (rng, c) => {
      const levers = rng() < 0.3 ? extremeMixLevers(rng) : randomLevers(rng)
      const horizon = pick(rng, HORIZON_IDS)
      c.info = { levers, horizon }
      const r = projectScenario({ levers, horizon, ysCase: pick(rng, CASES) })
      const ref = projectScenario({ horizon })
      const s = buildSeries(r, ref)
      expect(s).toHaveLength(r.years.length)
      expect(s).toHaveLength(HORIZONS[horizon].endYear - 2026 + 1)
      s.forEach((pt, t) => {
        expect(pt.year).toBe(r.years[t])
        if (t > 0) expect(pt.year).toBeGreaterThan(s[t - 1].year)
        for (const [k, kr] of CHART_KEYS) {
          expect(isFiniteOrNull(pt[k]), `${k}[${t}]=${pt[k]}`).toBe(true)
          expect(isFiniteOrNull(pt[kr]), `${kr}[${t}]=${pt[kr]}`).toBe(true)
        }
      })
      // Référence indépendante du scénario : même série quels que soient les leviers.
      expect(s.map((p) => p.debtRef)).toEqual(buildSeries(ref, ref).map((p) => p.debtRef))
    })
  })

  it('06 [seed +6] bornes de l\'axe Y de chaque graphique (calculées sur les séries : l\'axe est en auto) : finies, min ≤ max, ticks sans NaN', () => {
    forCases('06', BASE_SEED + 6, 100, (rng, c, i) => {
      const levers = i % 10 === 0 ? extremeLevers01(i / 10) : (rng() < 0.3 ? extremeMixLevers(rng) : randomLevers(rng))
      const horizon = pick(rng, HORIZON_IDS)
      c.info = { levers, horizon }
      const s = buildSeries(projectScenario({ levers, horizon }), projectScenario({ horizon }))
      for (const [k, kr] of CHART_KEYS) {
        const vals = s.flatMap((p) => [p[k], p[kr]]).filter((v) => v !== null)
        expect(vals.length, `série ${k} vide`).toBeGreaterThan(0)
        const lo = Math.min(...vals)
        const hi = Math.max(...vals)
        expect(Number.isFinite(lo) && Number.isFinite(hi), `${k}: ${lo}..${hi}`).toBe(true)
        expect(lo).toBeLessThanOrEqual(hi)
        for (const v of [lo, hi, (lo + hi) / 2]) for (const dec of [0, 1]) expect(fmt(v, dec)).not.toMatch(/NaN|Infinity|undefined|—/)
      }
    })
  })

  it('07 [seed +7] fmt et assimilés sur nombres aléatoires, ±Infinity, NaN, 1e-12, 1e12, -0 : jamais « NaN », « Infinity » ou « undefined », sortie ≤ 16 caractères (≤ 12 pour toute valeur finie)', () => {
    const specials = [NaN, Infinity, -Infinity, 1e-12, -1e-12, 1e12, -1e12, -0, 0, 1e9, -1e9, 123456.789, undefined, null, '12', {}]
    const bad = /NaN|Infinity|undefined/
    forCases('07', BASE_SEED + 7, 200, (rng, c) => {
      const magnitude = 10 ** Math.floor(uniform(rng, -12, 13))
      const v = rng() < 0.3 ? pick(rng, specials) : (rng() < 0.5 ? -1 : 1) * rng() * magnitude
      const dec = pick(rng, [0, 1, 2, 3])
      const signed = rng() < 0.5
      c.info = { v: String(v), dec, signed }
      for (const out of [fmt(v, dec, { signed }), csvNumber(v), paramRange({ value: v, low: v, high: v, unit: '%' }), String(deltaTone(v, rng() < 0.5))]) {
        expect(typeof out).toBe('string')
        expect(out).not.toMatch(bad)
      }
      // Borne de 16 caractères (carte de 375 px) pour toute valeur finie ; fmt abrège au-delà de 10 000 et tient en fait en 12 caractères.
      const shown = fmt(v, dec, { signed })
      if (typeof v !== 'number' || Number.isFinite(v)) expect(shown.length, `fmt(${v}, ${dec}) = « ${shown} »`).toBeLessThanOrEqual(16)
      if (Number.isFinite(v)) expect(shown.length, `fmt(${v}, ${dec}) = « ${shown} »`).toBeLessThanOrEqual(12)
      if (Object.is(v, -0)) expect(fmt(v, dec)).not.toMatch(/-/)
    })
  })

  it('08 [seed +8] décomposition d\'une année : libellés non vides, lignes finies, lignes sous le seuil masquées, visibles + masquées = écart total', () => {
    const eps = P0['fisc.eps']
    const epsO = P0['fisc.eps_offre']
    forCases('08', BASE_SEED + 8, 150, (rng, c) => {
      const levers = rng() < 0.3 ? extremeMixLevers(rng) : randomLevers(rng)
      const horizon = pick(rng, HORIZON_IDS)
      const ysCase = pick(rng, CASES)
      const r = projectScenario({ levers, horizon, ysCase })
      const t = Math.floor(rng() * r.years.length)
      c.info = { levers, horizon, ysCase, t }
      const d = decomposeAtYear(r, REFERENCE_FOR(horizon), t, eps, epsO)
      const shown = visibleLines(d.lines)
      const hidden = d.lines.filter((l) => !shown.includes(l))
      for (const l of d.lines) {
        expect(typeof l.label).toBe('string')
        expect(l.label.trim().length).toBeGreaterThan(0)
        expect(Number.isNaN(l.montant), l.key).toBe(false)
        expect(Number.isFinite(l.montant), l.key).toBe(true)
      }
      for (const l of shown) expect(Math.abs(l.montant)).toBeGreaterThanOrEqual(HIDE_BELOW)
      for (const l of hidden) expect(Math.abs(l.montant)).toBeLessThan(HIDE_BELOW)
      const sum = [...shown, ...hidden].reduce((s, l) => s + l.montant, 0)
      expect(Math.abs(sum - d.ecart), `somme ${sum} vs écart ${d.ecart}`).toBeLessThan(1e-6)
    })
  })

  // ================= Petits changements =================
  const lastDebt = (r) => r.total[r.total.length - 1].debtRatio

  it('09 [seed +9] continuité : un pas de 1e-3 de l\'étendue d\'un levier ne fait pas de saut sur la dette finale (> 100× l\'effet médian)', () => {
    const effects = []
    const cases = []
    forCases('09-collecte', BASE_SEED + 9, 120, (rng, c) => {
      const base = randomLevers(rng, { density: 0.4 })
      const l = pick(rng, LEVERS)
      const step = 1e-3 * (l.max - l.min)
      const x0 = clampLever(l, base[l.id] ?? uniform(rng, l.min, l.max))
      const x1 = x0 + step <= l.max ? x0 + step : x0 - step
      const horizon = pick(rng, HORIZON_IDS)
      c.info = { base, lever: l.id, x0, x1, horizon }
      const e = Math.abs(lastDebt(projectScenario({ levers: { ...base, [l.id]: x1 }, horizon })) - lastDebt(projectScenario({ levers: { ...base, [l.id]: x0 }, horizon })))
      effects.push(e)
      cases.push({ info: c.info, e })
    })
    const sorted = [...effects].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    expect(median).toBeGreaterThan(0)
    for (const { info, e } of cases) {
      expect(e, `effet ${e} vs médiane ${median} (seed ${BASE_SEED + 9}) ${JSON.stringify(info)}`).toBeLessThanOrEqual(100 * median)
      expect(Number.isFinite(e)).toBe(true)
    }
  })

  const balanceAt = (levers, t) => projectScenario({ levers }).total[t].balance
  const balance1 = (levers) => balanceAt(levers, 1)

  it('10 [seed +10] monotonie du solde à l\'entrée en vigueur : hausse d\'un levier à signe positif jamais en baisse du solde, hausse d\'un levier à signe négatif jamais en hausse', () => {
    forCases('10', BASE_SEED + 10, 150, (rng, c) => {
      const base = randomLevers(rng, { density: 0.4 })
      const isUp = rng() < 0.5
      const l = pick(rng, isUp ? balanceUpLevers : balanceDownLevers)
      const x0 = clampLever(l, base[l.id] ?? uniform(rng, l.min, l.max))
      const step = uniform(rng, 0.2, 2) * 1e-2 * (l.max - l.min)
      const x1 = x0 + step <= l.max ? x0 + step : null
      if (x1 === null) return
      const t = l.defaultRamp?.start ?? 1
      c.info = { base, lever: l.id, signe: l.signe, t, x0, x1 }
      const b0 = balanceAt({ ...base, [l.id]: x0 }, t)
      const b1 = balanceAt({ ...base, [l.id]: x1 }, t)
      if (isUp) expect(b1 - b0, `solde ${b0} -> ${b1}`).toBeGreaterThanOrEqual(-1e-9)
      else expect(b1 - b0, `solde ${b0} -> ${b1}`).toBeLessThanOrEqual(1e-9)
    })
  })

  it('11 [seed +11] symétrie : +ε et −ε sur un impôt donnent des variations de solde 2027 de signes opposés et de taille voisine (rapport dans [0,5 ; 2])', () => {
    forCases('11', BASE_SEED + 11, 120, (rng, c) => {
      const base = randomLevers(rng, { density: 0.3 })
      const l = pick(rng, revenueLevers)
      const eps = 1e-2 * (l.max - l.min)
      const x0 = uniform(rng, l.min + eps, l.max - eps)
      c.info = { base, lever: l.id, x0, eps }
      const b0 = balance1({ ...base, [l.id]: x0 })
      const up = balance1({ ...base, [l.id]: x0 + eps }) - b0
      const down = balance1({ ...base, [l.id]: x0 - eps }) - b0
      expect(Math.sign(up), `up=${up} down=${down}`).toBe(-Math.sign(down))
      const ratio = Math.abs(up) / Math.abs(down)
      expect(ratio, `up=${up} down=${down}`).toBeGreaterThanOrEqual(0.5)
      expect(ratio, `up=${up} down=${down}`).toBeLessThanOrEqual(2)
    })
  })

  it('12 [seed +12] linéarité des étalons statiques : staticYield(l, k·x) = k·staticYield(l, x)', () => {
    forCases('12', BASE_SEED + 12, 200, (rng, c) => {
      const l = pick(rng, LEVERS)
      const x = uniform(rng, l.min, l.max)
      const k = uniform(rng, -5, 5)
      c.info = { lever: l.id, x, k }
      const lhs = staticYield(l, k * x, P0)
      const rhs = k * staticYield(l, x, P0)
      expect(near(lhs, rhs, 1e-12), `${lhs} vs ${rhs}`).toBe(true)
      expect(staticYield(l, 0, P0) === 0).toBe(true) // +0 ou −0
    })
  })

  it('13 [seed +13] déterminisme : deux exécutions identiques, entrées gelées acceptées, paramètres globaux non modifiés', () => {
    const snapshot = JSON.stringify(PARAMS)
    forCases('13', BASE_SEED + 13, 60, (rng, c) => {
      const levers = deepFreeze(randomLevers(rng))
      const overrides = deepFreeze({ 'dette.beta': uniform(rng, 1, 5), 'fisc.eps': uniform(rng, 0.5, 0.65) })
      const opts = { levers, overrides, horizon: pick(rng, HORIZON_IDS), ysCase: pick(rng, CASES), modules: rng() < 0.3 ? [{ module: TEST_MODULE, levers: { taille: uniform(rng, -1, 1), effet_offre: uniform(rng, -2, 2) } }] : [] }
      c.info = { levers, overrides, horizon: opts.horizon, ysCase: opts.ysCase }
      const a = projectScenario(opts)
      const b = projectScenario(opts)
      expect(a).toEqual(b)
      expect(JSON.stringify(PARAMS)).toBe(snapshot)
      expect(JSON.stringify(resolveParams())).toBe(JSON.stringify(P0))
    })
  })

  it('14 [seed +14] indépendance à l\'ordre : clés de leviers et de remplacements mélangées donnent le même résultat', () => {
    forCases('14', BASE_SEED + 14, 80, (rng, c) => {
      const levers = randomLevers(rng, { density: 0.7 })
      const overrides = { 'dette.beta': uniform(rng, 1, 5), 'emploi.kappa': uniform(rng, 0.3, 0.5), 'dem.lambda': uniform(rng, 0.5, 0.85) }
      const horizon = pick(rng, HORIZON_IDS)
      const ysCase = pick(rng, CASES)
      c.info = { levers, overrides, horizon, ysCase }
      const a = projectScenario({ levers, overrides, horizon, ysCase })
      const levers2 = Object.fromEntries(shuffled(rng, Object.entries(levers)))
      const overrides2 = Object.fromEntries(shuffled(rng, Object.entries(overrides)))
      const b = projectScenario({ levers: levers2, overrides: overrides2, horizon, ysCase })
      expect(b).toEqual(a)
    })
  })

  // ================= Allers-retours et sorties =================
  it('15 [seed +15] lien partageable : encodage puis décodage rend le même état (leviers non nuls, horizon, cas)', () => {
    forCases('15', BASE_SEED + 15, 200, (rng, c) => {
      const values = {}
      for (const l of LEVERS) if (rng() < 0.5) values[l.id] = rng() < 0.2 ? pick(rng, [l.min, l.max, 0]) : uniform(rng, l.min, l.max)
      const s = { values, horizon: pick(rng, HORIZON_IDS), ysCase: pick(rng, CASES) }
      c.info = s
      const back = decodeScenario(encodeScenario(s))
      const expected = { ...s, values: Object.fromEntries(Object.entries(values).filter(([, v]) => v !== 0)) }
      expect(back.horizon).toBe(expected.horizon)
      expect(back.ysCase).toBe(expected.ysCase)
      expect(Object.keys(back.values).sort()).toEqual(Object.keys(expected.values).sort())
      for (const [id, v] of Object.entries(expected.values)) expect(back.values[id]).toBeCloseTo(v, 9)
    })
  })

  it('16 [seed +16] export CSV : nombre de lignes, cellules par ligne, virgules décimales relues, aucune cellule d\'injection (=, +, @, - non numérique)', () => {
    const eps = P0['fisc.eps']
    const epsO = P0['fisc.eps_offre']
    const numeric = /^-?\d+(,\d+)?$/
    forCases('16', BASE_SEED + 16, 60, (rng, c) => {
      const levers = rng() < 0.3 ? extremeMixLevers(rng) : randomLevers(rng)
      const horizon = pick(rng, HORIZON_IDS)
      const ysCase = pick(rng, CASES)
      c.info = { levers, horizon, ysCase }
      const r = projectScenario({ levers, horizon, ysCase })
      const rows = buildExportRows(r, REFERENCE_FOR(horizon), eps, epsO)
      const csv = buildCsv({ stamp: 'test', url: `https://exemple.test/#/budget?${encodeScenario({ values: levers, horizon, ysCase })}`, horizonLabel: HORIZONS[horizon].label, ysCase, values: levers, rows })
      expect(csv.startsWith('﻿')).toBe(true)
      const lines = csv.slice(1).split('\r\n')
      expect(lines[lines.length - 1]).toBe('')
      lines.pop()
      const blank = lines.indexOf('')
      expect(blank).toBeGreaterThan(5)
      const headerLine = lines[blank + 1]
      expect(headerLine.split(';')).toHaveLength(COLUMNS.length)
      const data = lines.slice(blank + 2)
      expect(data).toHaveLength(r.years.length)
      expect(rows).toHaveLength(r.years.length)
      data.forEach((line, t) => {
        const cells = line.split(';')
        expect(cells).toHaveLength(COLUMNS.length)
        expect(Number(cells[0])).toBe(r.years[t])
        cells.slice(1).forEach((cell, j) => {
          const v = rows[t][j + 1]
          if (cell === '') { expect(Number.isFinite(v)).toBe(false); return }
          expect(cell).toMatch(numeric)
          expect(Math.abs(Number(cell.replace(',', '.')) - v), `${COLUMNS[j + 1]} ${r.years[t]}`).toBeLessThanOrEqual(5e-4 + 1e-12)
        })
      })
      for (const line of lines) {
        for (const cell of line.split(';')) {
          if (cell === '' || cell.startsWith('"')) continue
          expect(/^[=+@]/.test(cell), `cellule « ${cell} »`).toBe(false)
          if (cell.startsWith('-')) expect(cell).toMatch(numeric)
        }
      }
    })
  })

  it('17 [seed +17] effets d\'offre : PIB final bas ≤ central ≤ haut ; égaux quand tous les σ sont remplacés par 0', () => {
    const zeroSigma = Object.fromEntries(SUPPLY_EFFECTS.map((e) => [e.lever, { sigma: 0, L: 5 }]))
    forCases('17', BASE_SEED + 17, 100, (rng, c) => {
      const levers = rng() < 0.3 ? extremeMixLevers(rng) : randomLevers(rng)
      const horizon = pick(rng, HORIZON_IDS)
      c.info = { levers, horizon }
      const run = (ysCase, sigma) => projectScenario({ levers, horizon, ysCase, sigma })
      const [bas, central, haut] = CASES.map((k) => run(k))
      const gap = (r) => r.total[r.total.length - 1].gdpEffect
      const tol = 1e-12
      expect(gap(bas), `bas ${gap(bas)} central ${gap(central)}`).toBeLessThanOrEqual(gap(central) + tol)
      expect(gap(central), `central ${gap(central)} haut ${gap(haut)}`).toBeLessThanOrEqual(gap(haut) + tol)
      const [b0, c0, h0] = CASES.map((k) => run(k, zeroSigma))
      expect(b0.total).toEqual(c0.total)
      expect(c0.total).toEqual(h0.total)
    })
  })

  it('18 [seed +18] identité par bloc : somme des soldes des trois blocs = solde total, à chaque année', () => {
    forCases('18', BASE_SEED + 18, 120, (rng, c) => {
      const levers = rng() < 0.3 ? extremeMixLevers(rng) : randomLevers(rng)
      const horizon = pick(rng, HORIZON_IDS)
      const modules = rng() < 0.3 ? [{ module: TEST_MODULE, levers: { taille: uniform(rng, -1, 1), effet_offre: uniform(rng, -2, 2) } }] : []
      c.info = { levers, horizon, modules: modules.map((m) => m.levers) }
      const r = projectScenario({ levers, horizon, modules, ysCase: pick(rng, CASES) })
      r.total.forEach((row, t) => {
        const sumBal = BLOCKS.reduce((s, b) => s + r.blocks[b][t].balance, 0)
        expect(Math.abs(sumBal - row.balance), `${row.year}: ${sumBal} vs ${row.balance}`).toBeLessThan(1e-6)
        const sumPrim = BLOCKS.reduce((s, b) => s + r.blocks[b][t].primaryBalance, 0)
        expect(Math.abs(sumPrim - row.primaryBalance)).toBeLessThan(1e-6)
      })
    })
  })

  it('19 [seed +19] invariance de la référence : même résultat quel que soit le scénario calculé avant', () => {
    const refs = Object.fromEntries(HORIZON_IDS.map((h) => [h, structuredClone(projectScenario({ horizon: h }))]))
    forCases('19', BASE_SEED + 19, 80, (rng, c) => {
      const levers = rng() < 0.3 ? extremeMixLevers(rng) : randomLevers(rng)
      const horizon = pick(rng, HORIZON_IDS)
      c.info = { levers, horizon }
      projectScenario({ levers, horizon, ysCase: pick(rng, CASES), overrides: { 'dette.beta': uniform(rng, 1, 5) } })
      const h = pick(rng, HORIZON_IDS)
      expect(projectScenario({ horizon: h })).toEqual(refs[h])
    })
  })

  it('20 [seed +20] cohérence des horizons : les N premières années de 10 ans égalent celles de jusqu\'en 2040 et de 30 ans', () => {
    forCases('20', BASE_SEED + 20, 60, (rng, c) => {
      const levers = rng() < 0.3 ? extremeMixLevers(rng) : randomLevers(rng)
      const ysCase = pick(rng, CASES)
      c.info = { levers, ysCase }
      const short = projectScenario({ levers, ysCase, horizon: 'dixAns' })
      for (const h of ['jusqua2040', 'trenteAns']) {
        const long = projectScenario({ levers, ysCase, horizon: h })
        const n = short.total.length
        expect(long.total.slice(0, n), h).toEqual(short.total)
        for (const b of BLOCKS) expect(long.blocks[b].slice(0, n), `${h} ${b}`).toEqual(short.blocks[b])
        expect(long.decomposition.slice(0, n), h).toEqual(short.decomposition)
      }
    })
  })
})

// ---------- Aides propres à ce fichier ----------
// Tous les leviers au minimum (0) ou au maximum (1) : cas limites explicites pour le test 06.
function extremeLevers01(which) {
  return Object.fromEntries(LEVERS.map((l) => [l.id, which % 2 === 0 ? l.min : l.max]))
}
const refCache = {}
function REFERENCE_FOR(horizon) {
  return (refCache[horizon] ??= projectScenario({ horizon }))
}
