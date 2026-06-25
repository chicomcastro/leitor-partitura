import { useState, useCallback, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { usePersistedState } from './hooks/usePersistedState'
import { idbPut, idbDel } from './lib/db'
import { idbGet } from './lib/db'
import { loadPdfFromBuffer, evictDoc } from './lib/pdf'
import { PLAYLIST_COLORS } from './lib/library'
import { addPractice, registerView, dayKey, weekId, weekSummary } from './lib/stats'
import { pickCelebration, achievedMilestones } from './lib/milestones'
import MilestoneModal from './components/MilestoneModal'
import RecapModal from './components/RecapModal'
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
  const [anchorsMap, setAnchorsMap] = usePersistedState('sp.anchors', {})
  const [recordingsMeta, setRecordingsMeta] = usePersistedState('sp.recordings', [])
  const [gestures, setGestures] = usePersistedState('sp.gestures', {
    tapLeft: 'prev', tapRight: 'next', tap2: 'metro', tap3: 'none',
    swipeLeft: 'next', swipeRight: 'prev',
  })
  const [bpm, setBpm] = usePersistedState('sp.bpm', 90)
  const [beats, setBeats] = usePersistedState('sp.beats', 4)
  const [scrollSpeed, setScrollSpeed] = usePersistedState('sp.speed', 45)
  const [fitMode, setFitMode] = usePersistedState('sp.fit', 'page')
  const [stats, setStats] = usePersistedState('sp.stats', { days: {}, views: {} })
  const [seenMilestones, setSeenMilestones] = usePersistedState('sp.statsMilestones', [])
  const [goalMin, setGoalMin] = usePersistedState('sp.goalMin', 0)
  const [lastRecapWeek, setLastRecapWeek] = usePersistedState('sp.lastRecapWeek', '')
  const [celebration, setCelebration] = useState(null)
  const [recap, setRecap] = useState(null)

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

  // Surface a milestone celebration when back in the library (never interrupt
  // practice in the Reader).
  useEffect(() => {
    if (view !== 'library') return
    const m = pickCelebration(stats, new Date(), seenMilestones)
    if (m) setCelebration(prev => prev || m)
  }, [view, stats, seenMilestones])

  const dismissCelebration = useCallback(() => {
    setSeenMilestones(prev => Array.from(new Set([...prev, ...achievedMilestones(stats, new Date())])))
    setCelebration(null)
  }, [stats, setSeenMilestones])

  // Weekly recap: once, at the start of a new week, summarize the previous week.
  useEffect(() => {
    if (view !== 'library') return
    const now = new Date()
    const wid = weekId(now)
    if (lastRecapWeek && lastRecapWeek !== wid) {
      const prevWeekDate = new Date(now)
      prevWeekDate.setDate(prevWeekDate.getDate() - 7)
      const summary = weekSummary(stats, scores, prevWeekDate)
      if (summary.ms > 0) setRecap(prev => prev || summary)
    }
    if (lastRecapWeek !== wid) setLastRecapWeek(wid)
  }, [view, stats, scores, lastRecapWeek, setLastRecapWeek])

  // Animate Library <-> Reader with the View Transitions API where available
  // (progressive enhancement; falls back to an instant swap otherwise).
  const navigate = useCallback((apply) => {
    if (typeof document !== 'undefined' && document.startViewTransition) {
      document.startViewTransition(() => flushSync(apply))
    } else {
      apply()
    }
  }, [])

  const openScore = useCallback((id) => {
    setScores(prev => prev.map(s => s.id === id ? { ...s, lastOpenedAt: Date.now() } : s))
    setStats(prev => registerView(prev, id))
    navigate(() => {
      setCurrentScoreId(id)
      setView('reader')
    })
  }, [setScores, setStats, navigate])

  // Stable so the practice tracker effect in Reader isn't reset on every render.
  const recordPractice = useCallback((ms, scoreId) => {
    if (!ms || ms < 1000) return
    setStats(prev => addPractice(prev, { dateKey: dayKey(new Date()), ms, scoreId }))
  }, [setStats])

  const updateScore = useCallback((id, patch) => {
    setScores(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }, [setScores])

  const backToLibrary = useCallback(() => {
    navigate(() => setView('library'))
  }, [navigate])

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
    setAnchorsMap(prev => { const next = { ...prev }; delete next[id]; return next })
    idbDel('pdfs', id)
    evictDoc(id)
  }, [setScores, setPlaylists, setMarkersMap, setAnchorsMap])

  const createPlaylist = useCallback((name) => {
    setPlaylists(prev => [...prev, {
      id: 'pl' + Date.now(),
      name,
      items: [],
      color: PLAYLIST_COLORS[prev.length % PLAYLIST_COLORS.length],
    }])
  }, [setPlaylists])

  const deletePlaylist = useCallback((plId) => {
    setPlaylists(prev => prev.filter(p => p.id !== plId))
    setActivePlaylist(prev => prev === plId ? null : prev)
  }, [setPlaylists, setActivePlaylist])

  const updatePlaylist = useCallback((plId, patch) => {
    setPlaylists(prev => prev.map(p => p.id === plId ? { ...p, ...patch } : p))
  }, [setPlaylists])

  const reorderPlaylists = useCallback((fromIndex, toIndex) => {
    setPlaylists(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(fromIndex, 1)
      arr.splice(toIndex, 0, moved)
      return arr
    })
  }, [setPlaylists])

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
        anchors={anchorsMap[markersKey] || []}
        setAnchors={(anchors) => setAnchorsMap(prev => ({ ...prev, [markersKey]: typeof anchors === 'function' ? anchors(prev[markersKey] || []) : anchors }))}
        recordingsMeta={recordingsMeta}
        setRecordingsMeta={setRecordingsMeta}
        playlistScores={playlistScores}
        playlists={playlists}
        onAddToPlaylist={addToPlaylist}
        onCreatePlaylist={createPlaylist}
        onRecordPractice={recordPractice}
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
    <>
      <Library
        scores={scores}
        setScores={setScores}
        playlists={playlists}
        setPlaylists={setPlaylists}
        activePlaylist={activePlaylist}
        setActivePlaylist={setActivePlaylist}
        onOpenScore={openScore}
        onUpdateScore={updateScore}
        onImport={importFiles}
        onDelete={deleteScore}
        onCreatePlaylist={createPlaylist}
        onDeletePlaylist={deletePlaylist}
        onUpdatePlaylist={updatePlaylist}
        onReorderPlaylists={reorderPlaylists}
        onAddToPlaylist={addToPlaylist}
        onRemoveFromPlaylist={removeFromPlaylist}
        onReorderPlaylist={reorderPlaylist}
        stats={stats}
        recordingsMeta={recordingsMeta}
        goalMin={goalMin}
        setGoalMin={setGoalMin}
      />
      {celebration ? (
        <MilestoneModal milestone={celebration} stats={stats} scores={scores} onClose={dismissCelebration} />
      ) : recap ? (
        <RecapModal summary={recap} onClose={() => setRecap(null)} />
      ) : null}
    </>
  )
}
