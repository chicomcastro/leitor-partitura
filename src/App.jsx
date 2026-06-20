import { useState, useCallback } from 'react'
import { usePersistedState } from './hooks/usePersistedState'
import { idbPut, idbDel } from './lib/db'
import { idbGet } from './lib/db'
import { loadPdfFromBuffer, evictDoc } from './lib/pdf'
import Library from './screens/Library'
import Reader from './screens/Reader'

export default function App() {
  const [view, setView] = useState('library')
  const [currentScoreId, setCurrentScoreId] = useState(null)
  const [activePlaylist, setActivePlaylist] = useState(null)

  const [scores, setScores] = usePersistedState('sp.scores', [])
  const [playlists, setPlaylists] = usePersistedState('sp.playlists', [])
  const [markersMap, setMarkersMap] = usePersistedState('sp.markers', {})
  const [recordingsMeta, setRecordingsMeta] = usePersistedState('sp.recordings', [])
  const [gestures, setGestures] = usePersistedState('sp.gestures', {
    tapLeft: 'prev', tapRight: 'next', swipeLeft: 'next', swipeRight: 'prev',
  })
  const [bpm, setBpm] = usePersistedState('sp.bpm', 90)
  const [beats, setBeats] = usePersistedState('sp.beats', 4)
  const [scrollSpeed, setScrollSpeed] = usePersistedState('sp.speed', 45)
  const [fitMode, setFitMode] = usePersistedState('sp.fit', 'page')

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
        const doc = await loadPdfFromBuffer(id, buf)
        updated = [{ id, name: f.name.replace(/\.pdf$/i, ''), pages: doc.numPages, addedAt: Date.now() }, ...updated]
      } catch (err) { console.error('import', err) }
    }
    setScores(updated)
  }, [scores, setScores])

  const deleteScore = useCallback((id) => {
    setScores(prev => prev.filter(s => s.id !== id))
    setPlaylists(prev => prev.map(p => ({ ...p, items: p.items.filter(x => x !== id) })))
    setMarkersMap(prev => { const next = { ...prev }; delete next[id]; return next })
    idbDel('pdfs', id)
    evictDoc(id)
  }, [setScores, setPlaylists, setMarkersMap])

  const createPlaylist = useCallback((name) => {
    setPlaylists(prev => [...prev, { id: 'pl' + Date.now(), name, items: [] }])
  }, [setPlaylists])

  const addToPlaylist = useCallback((plId, scoreId) => {
    setPlaylists(prev => prev.map(p =>
      p.id === plId
        ? (p.items.includes(scoreId) ? p : { ...p, items: [...p.items, scoreId] })
        : p
    ))
  }, [setPlaylists])

  const removeFromPlaylist = useCallback((plId, scoreId) => {
    setPlaylists(prev => prev.map(p =>
      p.id === plId ? { ...p, items: p.items.filter(x => x !== scoreId) } : p
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
    const pieceList = (() => {
      const pl = playlists.find(p => p.id === activePlaylist)
      if (pl) return pl.items.filter(id => scores.some(s => s.id === id))
      return null
    })()

    return (
      <Reader
        scoreId={currentScoreId}
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
        markers={markersMap[currentScoreId] || []}
        setMarkers={(markers) => setMarkersMap(prev => ({ ...prev, [currentScoreId]: markers }))}
        recordingsMeta={recordingsMeta}
        setRecordingsMeta={setRecordingsMeta}
        pieceList={pieceList}
        onOpenScore={openScore}
      />
    )
  }

  return (
    <Library
      scores={scores}
      playlists={playlists}
      activePlaylist={activePlaylist}
      setActivePlaylist={setActivePlaylist}
      onOpenScore={openScore}
      onImport={importFiles}
      onDelete={deleteScore}
      onCreatePlaylist={createPlaylist}
      onAddToPlaylist={addToPlaylist}
      onRemoveFromPlaylist={removeFromPlaylist}
      onReorderPlaylist={reorderPlaylist}
    />
  )
}
