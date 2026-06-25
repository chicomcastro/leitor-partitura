import { idbGetAll, idbGet, idbPut } from './db'

const LS_KEYS = [
  'sp.scores', 'sp.playlists', 'sp.markers', 'sp.recordings',
  'sp.gestures', 'sp.bpm', 'sp.beats', 'sp.speed', 'sp.fit',
  'sp.anchors', 'sp.stats', 'sp.statsMilestones', 'sp.goalMin',
]

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBuf(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export async function exportBackup() {
  const localData = {}
  for (const key of LS_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw != null) localData[key] = raw
  }

  const pdfEntries = await idbGetAll('pdfs')
  const files = {}
  for (const { key, value } of pdfEntries) {
    files[key] = bufToBase64(value)
  }

  const recEntries = await idbGetAll('recordings')
  const recordings = {}
  for (const { key, value } of recEntries) {
    if (value instanceof ArrayBuffer) {
      recordings[key] = bufToBase64(value)
    } else if (value instanceof Blob) {
      const ab = await value.arrayBuffer()
      recordings[key] = bufToBase64(ab)
    } else {
      recordings[key] = bufToBase64(value)
    }
  }

  const backup = {
    version: 1,
    localStorage: localData,
    files,
    recordings,
  }

  return new Blob([JSON.stringify(backup)], { type: 'application/json' })
}

export async function importBackup(file) {
  const text = await file.text()
  const backup = JSON.parse(text)

  if (backup.type === 'playlist') {
    return importPlaylistData(backup)
  }

  if (!backup.version || !backup.localStorage) {
    throw new Error('Arquivo de backup inválido')
  }

  for (const [key, value] of Object.entries(backup.localStorage)) {
    localStorage.setItem(key, value)
  }

  if (backup.files) {
    for (const [key, b64] of Object.entries(backup.files)) {
      await idbPut('pdfs', key, base64ToBuf(b64))
    }
  }

  if (backup.recordings) {
    for (const [key, b64] of Object.entries(backup.recordings)) {
      await idbPut('recordings', key, base64ToBuf(b64))
    }
  }
}

export async function exportPlaylist(playlist, scores) {
  const scoreIds = new Set(playlist.items.map(item => item.scoreId || item))
  const relevantScores = scores.filter(s => scoreIds.has(s.id))

  const files = {}
  for (const id of scoreIds) {
    const buf = await idbGet('pdfs', id)
    if (buf) files[id] = bufToBase64(buf)
  }

  const data = {
    version: 1,
    type: 'playlist',
    playlist: { name: playlist.name, items: playlist.items },
    scores: relevantScores,
    files,
  }

  return new Blob([JSON.stringify(data)], { type: 'application/json' })
}

async function importPlaylistData(data) {
  const existingScores = JSON.parse(localStorage.getItem('sp.scores') || '[]')
  const existingPlaylists = JSON.parse(localStorage.getItem('sp.playlists') || '[]')
  const existingIds = new Set(existingScores.map(s => s.id))

  if (data.files) {
    for (const [key, b64] of Object.entries(data.files)) {
      await idbPut('pdfs', key, base64ToBuf(b64))
    }
  }

  const newScores = (data.scores || []).filter(s => !existingIds.has(s.id))
  const mergedScores = [...newScores, ...existingScores]
  localStorage.setItem('sp.scores', JSON.stringify(mergedScores))

  const newPlaylist = {
    id: 'pl' + Date.now(),
    name: data.playlist.name,
    items: data.playlist.items,
  }
  const mergedPlaylists = [...existingPlaylists, newPlaylist]
  localStorage.setItem('sp.playlists', JSON.stringify(mergedPlaylists))

  return { type: 'playlist', playlistName: data.playlist.name }
}
