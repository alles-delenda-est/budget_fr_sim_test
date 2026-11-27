import { describe, it, expect } from 'vitest'
import { projectScenario } from '../../engine/project.js'
import { resolveParams } from '../../engine/params.js'
import { LVT_MODULE } from '../../engine/lvt-module.js'
import { LVT_SCENARIO_BY_CODE } from '../../engine/lvt-snapshot.js'
import { versionStamp } from '../../version.js'
import { NEUTRAL_SCENARIOS } from './presets.js'
import { evaluateWarnings } from './warnings.js'
import { evaluateFiscalTargets, paramIdsFor } from './helpers.js'
import { computeIncidenceAtYear } from './incidence.js'
import { STRESS_TEST_BY_ID, resolveStressConfig } from './stressTests.js'
import {
  sanitizeBriefUrl,
  mdCell,
  safeFilename,
  buildBriefData,
  formatBriefMarkdown,
  buildBriefMarkdown,
} from './exportBrief.js'

const P = resolveParams()
const EPS = P['fisc.eps']
const EPS_OFFRE = P['fisc.eps_offre']

describe('export « Note de synthèse » (exportBrief.js)', () => {
  it('produit les 5 sections, versionStamp, jalons, somme exacte, blocs APU, incidence G1–G5 et statut provisoire', () => {
    const eq = NEUTRAL_SCENARIOS.find((s) => s.id === 'equilibre')
    const values = { ...eq.levers, ir: -10 }
    const lvtSetting = { scenario: 4, ocde: 1 }
    const lvtScenario = LVT_SCENARIO_BY_CODE[4]
    const modules = [{ module: LVT_MODULE, levers: { scenario: 4, offre_ocde: 1 } }]

    const ref = projectScenario({ levers: {}, horizon: 'trenteAns', ysCase: 'central' })
    const res = projectScenario({ levers: values, horizon: 'trenteAns', ysCase: 'central', phasingYears: 3, modules })
    const targets = evaluateFiscalTargets(res, P)
    const warnings = evaluateWarnings(res)
    const inc = computeIncidenceAtYear(res, 10, P, { lvtScenario, lvtCompanyShiftMd: lvtScenario.companyLandMd })
    const pIds = paramIdsFor(values, res)

    const data = buildBriefData({
      result: res,
      reference: ref,
      values,
      horizon: 'trenteAns',
      ysCase: 'central',
      phasingYears: 3,
      lvtSetting,
      lvtScenario,
      targets,
      incidence: inc,
      warnings,
      paramIds: pIds,
      P,
      eps: EPS,
      epsOffre: EPS_OFFRE,
      url: 'https://budget-fr.test/#/budget?h=trenteAns&cas=central&ir=-10',
      stamp: 'v0.9.0 · abc1234 · 2026-11-27',
      dateIso: '2026-11-27',
      appVersion: '0.9.0',
    })

    // Exactitude mathématique de la décomposition conservée dans les données
    const sumEnd = data.decomposition.end.lines.reduce((s, l) => s + l.montant, 0)
    expect(sumEnd).toBeCloseTo(data.decomposition.end.ecart, 8)
    expect(data.trajectory.map((r) => r.year)).toEqual([2026, 2027, 2031, 2036, 2056])

    const md = formatBriefMarkdown(data)
    expect(md).toContain('# Note de synthèse — Simulation budgétaire')
    expect(md).toContain('v0.9.0 · abc1234 · 2026-11-27')
    expect(md).toContain('Version provisoire (< 1.0)')
    expect(md).toContain('## 1. Mesures retenues')
    expect(md).toContain('## 2. Trajectoire budgétaire et macroéconomique')
    expect(md).toContain('## 3. Décomposition de l\'écart de solde')
    expect(md).toContain('## 4. Répartition par sous-secteur APU et incidence statutaire')
    expect(md).toContain('## 5. Hypothèses clés et paramètres à vérifier')
    expect(md).toContain('Effet d\'offre de l\'IR')
    expect(md).toContain('non validé — avis demandé')
    expect(md).toContain('État et ODAC')
    expect(md).toContain('Sécurité sociale')
    expect(md).toContain('Collectivités locales')
    expect(md).toContain('G1')
    expect(md).toContain('comp.tau0.ir')
  })

  it('inclut le sous-tableau de résilience à 3 points en présence d\'un stress-test et signale les cumuls d\'assiette', () => {
    const cfg = resolveStressConfig('taux_100pb', 10, P)
    const activeP = resolveParams(cfg.overrides)
    const values = { tva_normal: 2, tva_tous_taux: 1 }
    const res = projectScenario({ levers: values, overrides: cfg.overrides, horizon: 'dixAns' })
    const ref = projectScenario({ levers: {}, overrides: cfg.overrides, horizon: 'dixAns' })
    const unshocked = projectScenario({ levers: values, horizon: 'dixAns' })
    const centralRef = projectScenario({ levers: {}, horizon: 'dixAns' })

    const md = buildBriefMarkdown({
      result: res,
      reference: ref,
      unshockedResult: unshocked,
      centralReference: centralRef,
      values,
      horizon: 'dixAns',
      stressTest: STRESS_TEST_BY_ID.taux_100pb,
      targets: evaluateFiscalTargets(res, activeP),
      warnings: evaluateWarnings(res),
      paramIds: paramIdsFor(values, res, null, 'taux_100pb'),
      overrides: cfg.overrides,
      P: activeP,
      eps: EPS,
      epsOffre: EPS_OFFRE,
      stamp: versionStamp(),
      dateIso: '2026-11-27',
    })

    expect(md).toContain('Résistance au choc macroéconomique (Choc de taux (+100 pb))')
    expect(md).toContain('Cumul d\'assiette détecté')
    expect(md).toContain('dette.y_btf = 3,79 %')
  })

  it('neutralise strictement les injections Markdown via loc.search, protocoles dangereux, cellules GFM et noms de fichier (CWE-74)', () => {
    // Vecteur via ?evil= avant le hash : supprimé par u.search = '' et caractères spéciaux neutralisés
    const evilSearch = 'https://budget.test/?evil=)[Phish](https://evil.test)|col\n#/budget?h=dixAns&tva_normal=2'
    const clean = sanitizeBriefUrl(evilSearch)
    expect(clean).toBe('https://budget.test/#/budget?h=dixAns&tva_normal=2')
    expect(clean).not.toContain('Phish')
    expect(clean).not.toContain('\n')

    const evilFrag = sanitizeBriefUrl('https://budget.test/# Fake\n(x)[y]|<>`')
    expect(evilFrag).not.toMatch(/[\s()[\]|<>`]/)

    expect(sanitizeBriefUrl('javascript:alert(1)')).toBe('')
    expect(sanitizeBriefUrl('data:text/html,<script>alert(1)</script>')).toBe('')
    expect(sanitizeBriefUrl('https://x.test/#/budget?a.lbl=(bad)[link]|<script>`')).not.toMatch(/[()[\]|<>`]/)

    expect(mdCell('A | B <script>\r\n# Fake [x]`y`')).toBe('A \\| B \\<script\\> # Fake \\[x\\]\\`y\\`')
    expect(mdCell('# Titre injecté')).toBe('\\# Titre injecté')
    expect(safeFilename('../../etc/passwd?a=1')).toBe('etc-passwd-a-1')
  })
})
