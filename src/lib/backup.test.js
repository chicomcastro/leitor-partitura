import { describe, it, expect, beforeEach } from 'vitest'
import { exportBackup, importBackup, exportPlaylist } from './backup'
import { idbPut, idbGet } from './db'

beforeEach(() => {
  localStorage.clear()
})

describe('exportBackup', () => {
  it('serializes localStorage keys and pdf files as base64', async () => {
    localStorage.setItem('sp.scores', JSON.stringify([{ id: 's1', name: 'A' }]))
    localStorage.setItem('sp.bpm', '120')
    await idbPut('pdfs', 's1', new Uint8Array([72, 73]).buffer) // "HI"

    const blob = await exportBackup()
    const backup = JSON.parse(await blob.text())

    expect(backup.version).toBe(1)
    expect(backup.localStorage['sp.scores']).toContain('s1')
    expect(backup.localStorage['sp.bpm']).toBe('120')
    expect(backup.files.s1).toBe(btoa('HI'))
  })
})

describe('importBackup', () => {
  it('restores localStorage and pdf files', async () => {
    const backup = {
      version: 1,
      localStorage: { 'sp.scores': JSON.stringify([{ id: 'x', name: 'Z' }]) },
      files: { x: btoa('PDF') },
      recordings: {},
    }
    const file = new Blob([JSON.stringify(backup)], { type: 'application/json' })

    await importBackup(file)

    expect(localStorage.getItem('sp.scores')).toContain('Z')
    const buf = await idbGet('pdfs', 'x')
    expect(String.fromCharCode(...new Uint8Array(buf))).toBe('PDF')
  })

  it('rejects an invalid backup file', async () => {
    const file = new Blob([JSON.stringify({ nope: true })], { type: 'application/json' })
    await expect(importBackup(file)).rejects.toThrow()
  })

  it('round-trips an exported playlist into a new playlist', async () => {
    await idbPut('pdfs', 'sc1', new Uint8Array([1, 2]).buffer)
    const playlist = { name: 'Recital', items: [{ scoreId: 'sc1' }] }
    const scores = [{ id: 'sc1', name: 'Score 1', pages: 2, type: 'pdf' }]

    const blob = await exportPlaylist(playlist, scores)
    const file = new Blob([await blob.text()], { type: 'application/json' })

    const result = await importBackup(file)
    expect(result).toEqual({ type: 'playlist', playlistName: 'Recital' })

    const storedPlaylists = JSON.parse(localStorage.getItem('sp.playlists'))
    expect(storedPlaylists).toHaveLength(1)
    expect(storedPlaylists[0].name).toBe('Recital')
    const storedScores = JSON.parse(localStorage.getItem('sp.scores'))
    expect(storedScores.some(s => s.id === 'sc1')).toBe(true)
  })
})
