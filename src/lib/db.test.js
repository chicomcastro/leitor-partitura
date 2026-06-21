import { describe, it, expect } from 'vitest'
import { idbPut, idbGet, idbGetAll, idbDel } from './db'

describe('db (IndexedDB wrapper)', () => {
  it('stores and retrieves a value by key', async () => {
    const buf = new Uint8Array([1, 2, 3, 4]).buffer
    await idbPut('pdfs', 'k1', buf)
    const got = await idbGet('pdfs', 'k1')
    expect(new Uint8Array(got)).toEqual(new Uint8Array([1, 2, 3, 4]))
  })

  it('returns undefined for a missing key', async () => {
    const got = await idbGet('pdfs', 'does-not-exist')
    expect(got).toBeUndefined()
  })

  it('lists all entries with key + value', async () => {
    await idbPut('recordings', 'r1', new Uint8Array([9]).buffer)
    await idbPut('recordings', 'r2', new Uint8Array([8]).buffer)
    const all = await idbGetAll('recordings')
    const keys = all.map(e => e.key).sort()
    expect(keys).toContain('r1')
    expect(keys).toContain('r2')
    expect(all.every(e => 'value' in e)).toBe(true)
  })

  it('deletes a value', async () => {
    await idbPut('pdfs', 'todelete', new Uint8Array([5]).buffer)
    expect(await idbGet('pdfs', 'todelete')).toBeDefined()
    await idbDel('pdfs', 'todelete')
    expect(await idbGet('pdfs', 'todelete')).toBeUndefined()
  })
})
