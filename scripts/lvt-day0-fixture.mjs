// Génère src/engine/__tests__/fixtures/lvt-day0-outputs.json : sorties du module LVT (a par bloc, yS haut, composantes, flux).
// Référence de non-régression de src/engine/__tests__/lvt-yields.test.js, figée avant l'import de yields.json (Day 0).
// À ne régénérer que dans une PR qui change volontairement les sorties (nouvel import de yields.json, par exemple) et en documente
// l'écart : node scripts/lvt-day0-fixture.mjs > src/engine/__tests__/fixtures/lvt-day0-outputs.json
import { LVT_MODULE, lvtComponents } from '../src/engine/lvt-module.js'
import { LVT_PROVENANCE } from '../src/engine/lvt-snapshot.js'
import { runModule } from '../src/engine/modules.js'
import { resolveParams, PARAM_BY_ID } from '../src/engine/params.js'
import { START_YEAR } from '../src/engine/project.js'

const nYears = 30
const YEARS = [0, 1, 2, 5, 10, 30]
const ctx = (P) => ({ startYear: START_YEAR, endYear: START_YEAR + nYears, nYears, years: Array.from({ length: nYears + 1 }, (_, t) => START_YEAR + t), gdpBase2025: P['base.pib.2025'], params: P })
const q = (id) => PARAM_BY_ID[id]
const cases = { central: {} }
for (const [id, k] of [['lvt.capi.part', 'part'], ['lvt.capi.taux_actualisation', 'taux'], ['lvt.capi.part_sol', 'sol']]) {
  cases[`${k}_bas`] = { [id]: q(id).low }
  cases[`${k}_haut`] = { [id]: q(id).high }
}
cases.capi_nulle = { 'lvt.capi.part': 0 }
cases.plancher = { 'lvt.capi.part_sol': 1 }
const pick = (arr) => YEARS.map((t) => arr[t])
const out = {
  note: `Sorties du module LVT (scripts/lvt-day0-fixture.mjs ; yields.json LVTShift ${LVT_PROVENANCE.commit}), identiques à celles du Day 0 (review/day0 4b17162, instantané recopié à la main). Années t = ${YEARS.join(', ')} (2026 + t). Référence de non-régression : ne régénérer que dans une PR qui documente l'écart.`,
  years: YEARS, cases, runs: {},
}
for (const [cid, overrides] of Object.entries(cases)) {
  const P = resolveParams(overrides)
  for (const scenario of [0, 1, 2, 3, 4, 5]) {
    const inst = runModule(LVT_MODULE, { scenario, offre_ocde: 1 }, ctx(P))
    const k = lvtComponents(scenario, P)
    out.runs[`${cid}|${scenario}`] = {
      centrales: pick(inst.aBlocks.centrales), securiteSociale: pick(inst.aBlocks.securiteSociale), locales: pick(inst.aBlocks.locales),
      ysHaut: pick(inst.yS.haut),
      ...(k ? { totalNouvelle: k.totalNouvelle, secuPerte: k.secuPerte, capiBrute: k.capiBrute, capiInverse: k.capiInverse, capitalisation: k.capitalisation } : {}),
      ...(cid === 'central' ? { flux: inst.flux.map((f) => [f.bloc, f.montant]) } : {}),
    }
  }
}
process.stdout.write(JSON.stringify(out, null, 1) + '\n')
