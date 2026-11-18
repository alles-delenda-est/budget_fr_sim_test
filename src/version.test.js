import { describe, it, expect } from 'vitest'
import { versionStamp, APP_VERSION } from './version.js'

describe('empreinte de version', () => {
  it('formate version, commit et date', () => {
    expect(versionStamp('1.2.3', 'abc1234', '2026-12-01')).toBe('v1.2.3 · abc1234 · 2026-12-01')
    expect(versionStamp('1.2.3', 'dev', 'dev')).toBe('v1.2.3 · dev')
  })
  it('la version injectée vient de package.json', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/)
  })
})
