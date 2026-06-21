import { useState, useCallback, useEffect } from 'react'
import { usePersistedState } from './hooks/usePersistedState'
import { idbPut, idbDel } from './lib/db'
import { idbGet } from './lib/db'
import { loadPdfFromBuffer, evictDoc } from './lib/pdf'
import Landing from './screens/Landing'
import Library from './screens/Library'
import Reader from './screens/Reader'

export default function App() {
  const [landingSeen, setLandingSeen] = useState(() => localStorage.getItem('sp.landing') === '1')
  const [view, setView] = useState('library')
  const [currentScoreId, setCurrentScoreId] = useState(null)
  const [activePlaylist, setActivePlaylist] = useState(null)

  const [scores, setScores] = usePersistedState('sp.scores', [])
  const [playlists, setPlaylists] = usePersistedState('sp.playlists', [])
  const [markersMap, setMarkersMap] = usePersistedState('sp.markers', {})
  const [recordingsMeta, setRecordingsMeta] = usePersistedState('sp.recordings', [])
  const [gestures, setGestures] = usePersistedState('sp.gestures', {
    tapLeft: 'prev', tapRight: 'next', tap2: 'metro', tap3: 'none',
    swipeLeft: 'next', swipeRight: 'prev',
  })
  const [bpm, setBpm] = usePersistedState('sp.bpm', 90)
  const [beats, setBeats] = usePersistedState('sp.beats', 4)
  const [scrollSpeed, setScrollSpeed] = usePersistedState('sp.speed', 45)
  const [fitMode, setFitMode] = usePersistedState('sp.fit', 'page')

  // Migrate old string-based playlist items to objects
  useEffect(() => {
    const needs = playlists.some(p => p.items.some(item => typeof item === 'string'))
    if (needs) {
      setPlaylists(playlists.map(p => ({
        ...p,
        items: p.items.map(item => typeof item === 'string' ? { scoreId: item } : item)
      })))
    }
  }, [])

  const openScore = useCallback((id) => {
    setCurrentScoreId(id)
    setView('reader')
  }, [])

  const backToLibrary = useCallback(() => {
    setView('library')
  }, [])

  const importFiles = useCallback(async (files) => {
    let updated = scores.slice()
    for (const f of files) {
      try {
        const buf = await f.arrayBuffer()
        const id = 'sc' + Date.now() + Math.floor(Math.random() * 1000)
        await idbPut('pdfs', id, buf)
        if (f.type.startsWith('image/')) {
          const cleanName = f.name.replace(/\.(jpe?g|png|webp|gif|bmp|svg)$/i, '')
          updated = [{ id, name: cleanName, pages: 1, type: 'image', addedAt: Date.now() }, ...updated]
        } else {
          const doc = await loadPdfFromBuffer(id, buf)
          updated = [{ id, name: f.name.replace(/\.pdf$/i, ''), pages: doc.numPages, type: 'pdf', addedAt: Date.now() }, ...updated]
        }
      } catch (err) { console.error('import', err) }
    }
    setScores(updated)
  }, [scores, setScores])

  const deleteScore = useCallback((id) => {
    setScores(prev => prev.filter(s => s.id !== id))
    setPlaylists(prev => prev.map(p => ({
      ...p,
      items: p.items.filter(item => (item.scoreId || item) !== id)
    })))
    setMarkersMap(prev => { const next = { ...prev }; delete next[id]; return next })
    idbDel('pdfs', id)
    evictDoc(id)
  }, [setScores, setPlaylists, setMarkersMap])

  const createPlaylist = useCallback((name) => {
    setPlaylists(prev => [...prev, { id: 'pl' + Date.now(), name, items: [] }])
  }, [setPlaylists])

  const deletePlaylist = useCallback((plId) => {
    setPlaylists(prev => prev.filter(p => p.id !== plId))
    setActivePlaylist(prev => prev === plId ? null : prev)
  }, [setPlaylists, setActivePlaylist])

  const addToPlaylist = useCallback((plId, scoreId, fromPage, toPage) => {
    const item = { scoreId }
    if (fromPage != null) item.fromPage = fromPage
    if (toPage != null) item.toPage = toPage
    setPlaylists(prev => prev.map(p =>
      p.id === plId ? { ...p, items: [...p.items, item] } : p
    ))
  }, [setPlaylists])

  const removeFromPlaylist = useCallback((plId, itemIndex) => {
    setPlaylists(prev => prev.map(p =>
      p.id === plId ? { ...p, items: p.items.filter((_, i) => i !== itemIndex) } : p
    ))
  }, [setPlaylists])

  const reorderPlaylist = useCallback((plId, fromIndex, toIndex) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id !== plId) return p
      const items = [...p.items]
      const [moved] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, moved)
      return { ...p, items }
    }))
  }, [setPlaylists])

  const currentScore = scores.find(s => s.id === currentScoreId)

  if (view === 'reader' && currentScoreId) {
    const pl = playlists.find(p => p.id === activePlaylist)
    const playlistScores = pl
      ? pl.items.map(item => {
          const score = scores.find(s => s.id === item.scoreId)
          if (!score) return null
          return { ...score, fromPage: item.fromPage, toPage: item.toPage }
        }).filter(Boolean)
      : null
    const markersKey = pl ? `pl_${pl.id}` : currentScoreId

    return (
      <Reader
        scoreId={currentScoreId}
        scoreType={currentScore?.type || 'pdf'}
        scoreName={currentScore?.name || ''}
        onBack={backToLibrary}
        fitMode={fitMode}
        setFitMode={setFitMode}
        scrollSpeed={scrollSpeed}
        setScrollSpeed={setScrollSpeed}
        bpm={bpm}
        setBpm={setBpm}
        beats={beats}
        setBeats={setBeats}
        gestures={gestures}
        setGestures={setGestures}
        markers={markersMap[markersKey] || []}
        setMarkers={(markers) => setMarkersMap(prev => ({ ...prev, [markersKey]: markers }))}
        recordingsMeta={recordingsMeta}
        setRecordingsMeta={setRecordingsMeta}
        playlistScores={playlistScores}
        playlists={playlists}
        onAddToPlaylist={addToPlaylist}
        onCreatePlaylist={createPlaylist}
      />
    )
  }

  if (scores.length === 0 && !landingSeen) {
    return (
      <Landing onEnter={() => {
        localStorage.setItem('sp.landing', '1')
        localStorage.setItem('sp.onboarding', '1')
        setLandingSeen(true)
      }} />
    )
  }

  return (
    <Library
      scores={scores}
      setScores={setScores}
      playlists={playlists}
      setPlaylists={setPlaylists}
      activePlaylist={activePlaylist}
      setActivePlaylist={setActivePlaylist}
      onOpenScore={openScore}
      onImport={importFiles}
      onDelete={deleteScore}
      onCreatePlaylist={createPlaylist}
      onDeletePlaylist={deletePlaylist}
      onAddToPlaylist={addToPlaylist}
      onRemoveFromPlaylist={removeFromPlaylist}
      onReorderPlaylist={reorderPlaylist}
    />
  )
}
