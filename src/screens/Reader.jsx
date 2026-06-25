import { useState, useRef, useEffect, useCallback } from 'react'
import { idbGet } from '../lib/db'
import { getPdfDoc } from '../lib/pdf'
import { useI18n } from '../lib/i18n'
import { useMetronome } from '../hooks/useMetronome'
import { useRecorder } from '../hooks/useRecorder'
import { useAnnotations } from '../hooks/useAnnotations'
import { useAnnotationLayer } from '../components/AnnotationLayer'
import MetronomePanel from '../components/MetronomePanel'
import GesturesPanel from '../components/GesturesPanel'
import RecordingsPanel from '../components/RecordingsPanel'
import Modal from '../components/Modal'
import s from './Reader.module.css'

export default function Reader({
  scoreId, scoreType, scoreName, onBack, fitMode, setFitMode,
  scrollSpeed, setScrollSpeed, bpm, setBpm, beats, setBeats,
  gestures, setGestures, markers, setMarkers,
  anchors, setAnchors,
  recordingsMeta, setRecordingsMeta, playlistScores,
  playlists, onAddToPlaylist, onCreatePlaylist,
}) {
  const { t } = useI18n()
  const viewerRef = useRef(null)
  const wrappersRef = useRef([])
  const ioRef = useRef(null)
  const builtKeyRef = useRef(null)
  const jumpStackRef = useRef([])
  const rafRef = useRef(null)
  const lastTsRef = useRef(null)
  const pointerRef = useRef(null)
  const scoreRangesRef = useRef([])
  const anchorLayerRef = useRef(null)
  const anchorsRef = useRef(anchors)
  anchorsRef.current = anchors

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPieceName, setCurrentPieceName] = useState(scoreName)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [autoscroll, setAutoscroll] = useState(false)
  const [showMetro, setShowMetro] = useState(false)
  const [showGestures, setShowGestures] = useState(false)
  const [showRecordings, setShowRecordings] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const [modal, setModal] = useState(null)
  const [accent, setAccent] = useState(true)
  const [pageMode, setPageMode] = useState('full')
  const [editingAnchors, setEditingAnchors] = useState(false)
  const [annotating, setAnnotating] = useState(false)
  const [annotColor, setAnnotColor] = useState('#E73B4C')
  const [erasing, setErasingState] = useState(false)
  const [annWrappers, setAnnWrappers] = useState([])
  const [turnFlash, setTurnFlash] = useState(0)

  const metro = useMetronome({ bpm, beats, accent })
  const annotations = useAnnotations()
  const { setErasing } = useAnnotationLayer({
    wrappers: annWrappers,
    scoreId,
    annotating,
    color: annotColor,
    annotations,
    scoreRanges: scoreRangesRef.current,
  })
  const scoreRecs = recordingsMeta.filter(r => {
    if (playlistScores) return playlistScores.some(ps => ps.id === r.scoreId)
    return r.scoreId === scoreId
  })
  const recorder = useRecorder({ scoreId, scoreName, recordingsMeta, setRecordingsMeta })

  const getBuffer = useCallback((id) => idbGet('pdfs', id), [])

  const isPlaylist = playlistScores && playlistScores.length > 0

  // build viewer
  useEffect(() => {
    const v = viewerRef.current
    if (!v) return

    const buildKey = isPlaylist
      ? 'pl|' + playlistScores.map(ps => ps.id).join(',') + '|' + fitMode
      : scoreId + '|' + fitMode + '|' + (scoreType || 'pdf')
    if (builtKeyRef.current === buildKey) return
    builtKeyRef.current = buildKey

    let cancelled = false
    ;(async () => {
      try {
        v.innerHTML = ''
        wrappersRef.current = []
        scoreRangesRef.current = []
        if (ioRef.current) ioRef.current.disconnect()

        ioRef.current = new IntersectionObserver((entries) => {
          entries.forEach(en => { if (en.isIntersecting) renderPage(+en.target.dataset.page) })
        }, { root: v, rootMargin: '300px 0px' })

        const cw = v.clientWidth - 24
        const ch = v.clientHeight - 32
        const isDual = fitMode === 'dual'

        const scoresToRender = isPlaylist ? playlistScores : [{ id: scoreId, type: scoreType || 'pdf', name: scoreName }]
        let globalPage = 0
        let initialScrollTarget = null

        for (let si = 0; si < scoresToRender.length; si++) {
          const ps = scoresToRender[si]
          if (cancelled) return
          const resolvedType = ps.type || 'pdf'
          const offset = globalPage

          if (isPlaylist) {
            const divider = document.createElement('div')
            divider.className = 'piece-divider'
            divider.style.cssText = 'display:flex;align-items:center;gap:12px;padding:16px 12px;color:var(--text-secondary);font-size:13px;font-weight:600;'
            const line1 = document.createElement('div')
            line1.style.cssText = 'flex:1;height:1px;background:var(--border-light);'
            const label = document.createElement('span')
            const rangeStr = (ps.fromPage || ps.toPage) ? ` (p. ${ps.fromPage || 1}–${ps.toPage || '∞'})` : ''
            label.textContent = ps.name + rangeStr
            const line2 = document.createElement('div')
            line2.style.cssText = 'flex:1;height:1px;background:var(--border-light);'
            divider.appendChild(line1)
            divider.appendChild(label)
            divider.appendChild(line2)
            v.appendChild(divider)
          }

          if (resolvedType === 'image') {
            globalPage++
            const buf = await getBuffer(ps.id)
            if (cancelled || !buf) continue
            const url = URL.createObjectURL(new Blob([buf]))
            const wrap = document.createElement('div')
            wrap.dataset.page = globalPage
            wrap.style.cssText = 'width:100%;max-width:100%;margin:0 auto 16px auto;background:var(--paper);border-radius:4px;box-shadow:0 8px 28px rgba(0,0,0,.5);position:relative;overflow:hidden;display:flex;justify-content:center;'
            const img = document.createElement('img')
            img.src = url
            img.style.cssText = 'max-width:100%;height:auto;display:block;'
            wrap.appendChild(img)
            v.appendChild(wrap)
            wrappersRef.current.push({ i: globalPage, wrap, page: null, scale: 1 })
            scoreRangesRef.current.push({ scoreId: ps.id, offset, count: 1, name: ps.name })
            if (ps.id === scoreId) initialScrollTarget = globalPage
          } else {
            const doc = await getPdfDoc(ps.id, getBuffer)
            if (cancelled) return
            const pFrom = ps.fromPage || 1
            const pTo = ps.toPage || doc.numPages
            let currentRow = null
            let localIdx = 0

            for (let p = pFrom; p <= pTo; p++) {
              localIdx++
              globalPage++
              const page = await doc.getPage(p)
              const vp = page.getViewport({ scale: 1 })
              let scale
              if (isDual) {
                scale = Math.min((cw / 2 - 12) / vp.width, ch / vp.height)
              } else {
                scale = fitMode === 'width' ? cw / vp.width : Math.min(cw / vp.width, ch / vp.height)
              }
              const w = Math.round(vp.width * scale)
              const h = Math.round(vp.height * scale)
              const wrap = document.createElement('div')
              wrap.dataset.page = globalPage
              wrap.style.cssText = `width:${w}px;height:${h}px;background:var(--paper);border-radius:4px;box-shadow:0 8px 28px rgba(0,0,0,.5);position:relative;overflow:hidden;`

              if (isDual) {
                const needsNewRow = localIdx === 1 || localIdx % 2 === 0
                if (needsNewRow) {
                  currentRow = document.createElement('div')
                  currentRow.style.cssText = 'display:flex;justify-content:center;gap:16px;margin:0 auto 16px auto;'
                  v.appendChild(currentRow)
                }
                currentRow.appendChild(wrap)
                ioRef.current.observe(wrap)
              } else {
                wrap.style.margin = '0 auto 16px auto'
                v.appendChild(wrap)
                ioRef.current.observe(wrap)
              }

              wrappersRef.current.push({ i: globalPage, wrap, page, scale })
            }
            scoreRangesRef.current.push({ scoreId: ps.id, offset, count: pTo - pFrom + 1, name: ps.name })
            if (ps.id === scoreId) initialScrollTarget = offset + 1
          }
        }

        setTotalPages(globalPage)
        setCurrentPage(1)
        setCurrentPieceName(scoresToRender[0]?.name || scoreName)
        setAnnWrappers([...wrappersRef.current])

        // Load annotations
        if (isPlaylist) {
          annotations.clearMap()
          for (const range of scoreRangesRef.current) {
            await annotations.loadAnnotationsWithOffset(range.scoreId, range.offset)
          }
        } else {
          annotations.loadAnnotations(scoreId)
        }

        // Render first pages
        renderPage(1)
        renderPage(2)

        // Scroll to the initially opened score
        if (isPlaylist && initialScrollTarget && initialScrollTarget > 1) {
          const target = wrappersRef.current[initialScrollTarget - 1]
          if (target) {
            requestAnimationFrame(() => {
              v.scrollTo({ top: target.wrap.offsetTop - 16, behavior: 'instant' })
            })
          }
        }
      } catch (e) {
        console.error('buildViewer', e)
        builtKeyRef.current = null
      }
    })()

    return () => { cancelled = true }
  }, [scoreId, scoreType, fitMode, getBuffer, isPlaylist, playlistScores])

  function renderPage(i) {
    const obj = wrappersRef.current[i - 1]
    if (!obj || obj.wrap.dataset.rendered || !obj.page) return
    obj.wrap.dataset.rendered = '1'
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const vp = obj.page.getViewport({ scale: obj.scale * dpr })
    const canvas = document.createElement('canvas')
    canvas.width = vp.width
    canvas.height = vp.height
    canvas.style.cssText = 'width:100%;height:100%;display:block;'
    obj.wrap.appendChild(canvas)
    obj.page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
      .catch(() => { obj.wrap.dataset.rendered = '' })
  }

  // scroll tracking
  useEffect(() => {
    const v = viewerRef.current
    if (!v) return
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        const center = v.scrollTop + v.clientHeight * 0.35
        let cur = 1
        for (const o of wrappersRef.current) {
          if (o.wrap.offsetTop <= center) cur = o.i
          else break
        }
        setCurrentPage(cur)

        // Update current piece name
        const ranges = scoreRangesRef.current
        if (ranges.length > 0) {
          for (let r = ranges.length - 1; r >= 0; r--) {
            if (cur > ranges[r].offset) {
              setCurrentPieceName(ranges[r].name)
              break
            }
          }
        }
      })
    }
    v.addEventListener('scroll', onScroll, { passive: true })
    return () => v.removeEventListener('scroll', onScroll)
  }, [scoreId, fitMode])

  // navigation
  const gotoPage = useCallback((i, push) => {
    const v = viewerRef.current
    if (!v || !wrappersRef.current.length) return
    i = Math.max(1, Math.min(wrappersRef.current.length, i))
    if (push) jumpStackRef.current.push(currentPage)
    const o = wrappersRef.current[i - 1]
    if (o) v.scrollTo({ top: o.wrap.offsetTop - 16, behavior: 'smooth' })
  }, [currentPage])

  // --- custom anchors ---
  // An anchor is { id, page, frac } where page is the 1-based global page index
  // and frac (0..1) is the vertical position within that page wrapper. Storing it
  // relative to the page keeps anchors stable across re-renders (resize, fit mode).
  const ANCHOR_OFFSET = 16

  const getWrapBox = useCallback((wrap) => {
    const v = viewerRef.current
    if (!v || !wrap) return null
    const top = wrap.getBoundingClientRect().top - v.getBoundingClientRect().top + v.scrollTop
    return { top, height: wrap.getBoundingClientRect().height }
  }, [])

  // Absolute scroll position (content space) for an anchor, or null if its page is gone.
  const anchorY = useCallback((a) => {
    const obj = wrappersRef.current[a.page - 1]
    if (!obj) return null
    const box = getWrapBox(obj.wrap)
    if (!box) return null
    return box.top + a.frac * box.height
  }, [getWrapBox])

  // Convert an absolute content-space Y into the nearest { page, frac }.
  const yToAnchor = useCallback((absY) => {
    const list = wrappersRef.current
    if (!list.length) return null
    let best = null
    for (const obj of list) {
      const box = getWrapBox(obj.wrap)
      if (!box) continue
      if (absY >= box.top && absY <= box.top + box.height) {
        return { page: obj.i, frac: box.height ? (absY - box.top) / box.height : 0 }
      }
      const dist = absY < box.top ? box.top - absY : absY - (box.top + box.height)
      if (!best || dist < best.dist) {
        best = { dist, page: obj.i, frac: absY < box.top ? 0 : 1 }
      }
    }
    return best ? { page: best.page, frac: best.frac } : null
  }, [getWrapBox])

  const buildAutoAnchors = useCallback(() => {
    const list = []
    for (const obj of wrappersRef.current) {
      list.push({ id: `a${obj.i}t`, page: obj.i, frac: 0 })
      list.push({ id: `a${obj.i}m`, page: obj.i, frac: 0.5 })
    }
    return list
  }, [])

  const addAnchorHere = useCallback(() => {
    const v = viewerRef.current
    if (!v) return
    const a = yToAnchor(v.scrollTop + ANCHOR_OFFSET)
    if (!a) return
    setAnchors(prev => [...prev, { id: 'a' + Date.now() + Math.floor(Math.random() * 1000), ...a }])
  }, [yToAnchor, setAnchors])

  // Scroll to the next/previous anchor relative to the current scroll position.
  const gotoAnchor = useCallback((dir) => {
    const v = viewerRef.current
    if (!v) return false
    const ys = anchorsRef.current
      .map(anchorY)
      .filter(y => y != null)
      .sort((a, b) => a - b)
    if (!ys.length) return false
    const cur = v.scrollTop
    let target = null
    if (dir > 0) {
      for (const y of ys) { if (y - ANCHOR_OFFSET > cur + 2) { target = y; break } }
    } else {
      for (let i = ys.length - 1; i >= 0; i--) { if (ys[i] - ANCHOR_OFFSET < cur - 2) { target = ys[i]; break } }
    }
    if (target == null) return false
    v.scrollTo({ top: Math.max(0, target - ANCHOR_OFFSET), behavior: 'smooth' })
    return true
  }, [anchorY])

  const nextPage = useCallback(() => {
    if (pageMode === 'anchor') { if (gotoAnchor(1)) return }
    if (pageMode === 'half') {
      const v = viewerRef.current
      if (!v) return
      const landscape = v.clientWidth > v.clientHeight
      v.scrollBy({ top: v.clientHeight * (landscape ? 1 : 0.5), behavior: 'smooth' })
    } else gotoPage(currentPage + 1)
  }, [gotoPage, currentPage, pageMode, gotoAnchor])
  const prevPage = useCallback(() => {
    if (pageMode === 'anchor') { if (gotoAnchor(-1)) return }
    if (pageMode === 'half') {
      const v = viewerRef.current
      if (!v) return
      const landscape = v.clientWidth > v.clientHeight
      v.scrollBy({ top: -v.clientHeight * (landscape ? 1 : 0.5), behavior: 'smooth' })
    } else gotoPage(currentPage - 1)
  }, [gotoPage, currentPage, pageMode, gotoAnchor])
  const goBackJump = useCallback(() => {
    if (jumpStackRef.current.length) gotoPage(jumpStackRef.current.pop(), false)
  }, [gotoPage])

  // autoscroll
  const autoTick = useCallback((ts) => {
    const v = viewerRef.current
    if (!v) return
    if (lastTsRef.current == null) lastTsRef.current = ts
    const dt = (ts - lastTsRef.current) / 1000
    lastTsRef.current = ts
    v.scrollTop += scrollSpeed * dt
    if (v.scrollTop + v.clientHeight >= v.scrollHeight - 1) {
      setAutoscroll(false)
      return
    }
    rafRef.current = requestAnimationFrame(autoTick)
  }, [scrollSpeed])

  useEffect(() => {
    if (autoscroll) {
      lastTsRef.current = null
      rafRef.current = requestAnimationFrame(autoTick)
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [autoscroll, autoTick])

  const toggleAutoscroll = useCallback(() => setAutoscroll(a => !a), [])

  // Seed top + middle anchors the first time anchor mode is used (or after a rebuild
  // while still empty), so the user always has something to act on.
  useEffect(() => {
    if (pageMode === 'anchor' && wrappersRef.current.length && anchorsRef.current.length === 0) {
      setAnchors(buildAutoAnchors())
    }
  }, [pageMode, annWrappers, buildAutoAnchors, setAnchors])

  // Render the anchor overlay (dashed lines) directly inside the scroll container so
  // the lines scroll with the pages. When editing, lines become draggable and gain a
  // delete button.
  useEffect(() => {
    const v = viewerRef.current
    if (!v) return
    if (anchorLayerRef.current) { anchorLayerRef.current.remove(); anchorLayerRef.current = null }
    if (pageMode !== 'anchor' || !wrappersRef.current.length) return

    const layer = document.createElement('div')
    layer.style.cssText = 'position:absolute;top:0;left:0;right:0;height:0;z-index:6;pointer-events:none;'
    v.appendChild(layer)
    anchorLayerRef.current = layer

    anchors.forEach((a, idx) => {
      const y = anchorY(a)
      if (y == null) return
      const line = document.createElement('div')
      line.style.cssText = `position:absolute;left:8px;right:8px;top:${y}px;height:0;border-top:2px dashed ${editingAnchors ? 'rgba(231,59,76,.95)' : 'rgba(231,59,76,.4)'};`
      layer.appendChild(line)

      const badge = document.createElement('div')
      badge.textContent = idx + 1
      badge.style.cssText = 'position:absolute;left:0;top:-9px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:var(--accent);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;'
      line.appendChild(badge)

      if (!editingAnchors) return

      line.style.borderTopWidth = '3px'
      line.style.cursor = 'ns-resize'
      line.style.pointerEvents = 'auto'

      const del = document.createElement('button')
      del.setAttribute('aria-label', t('reader.anchorRemove'))
      del.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>'
      del.style.cssText = 'position:absolute;right:0;top:-13px;width:26px;height:26px;border:none;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;'
      line.appendChild(del)
      del.addEventListener('pointerdown', e => e.stopPropagation())
      del.addEventListener('click', e => {
        e.stopPropagation()
        setAnchors(prev => prev.filter(x => x.id !== a.id))
      })

      let dragging = null
      line.addEventListener('pointerdown', e => {
        if (del.contains(e.target)) return
        e.stopPropagation()
        e.preventDefault()
        dragging = { startClientY: e.clientY, startTop: y }
        line.setPointerCapture?.(e.pointerId)
      })
      line.addEventListener('pointermove', e => {
        if (!dragging) return
        e.stopPropagation()
        line.style.top = Math.max(0, dragging.startTop + (e.clientY - dragging.startClientY)) + 'px'
      })
      line.addEventListener('pointerup', e => {
        if (!dragging) return
        e.stopPropagation()
        const nt = Math.max(0, dragging.startTop + (e.clientY - dragging.startClientY))
        dragging = null
        const na = yToAnchor(nt)
        if (na) setAnchors(prev => prev.map(x => x.id === a.id ? { ...x, page: na.page, frac: na.frac } : x))
      })
    })

    return () => { if (anchorLayerRef.current) { anchorLayerRef.current.remove(); anchorLayerRef.current = null } }
  }, [anchors, annWrappers, pageMode, editingAnchors, anchorY, yToAnchor, setAnchors, t])

  // gesture actions
  const doAction = useCallback((action) => {
    switch (action) {
      case 'next': nextPage(); setTurnFlash(f => f + 1); break
      case 'prev': prevPage(); setTurnFlash(f => f + 1); break
      case 'autoscroll': toggleAutoscroll(); break
      case 'metro': metro.toggle(); break
      case 'record': recorder.toggleRec(); break
      case 'back': goBackJump(); break
    }
  }, [nextPage, prevPage, toggleAutoscroll, metro, recorder, goBackJump])

  // touch + pointer gestures
  useEffect(() => {
    const v = viewerRef.current
    if (!v) return
    let touchState = null

    const onTouchStart = (e) => {
      if (annotating) return
      const t = e.touches
      if (!touchState) {
        touchState = {
          startX: t[0].clientX, startY: t[0].clientY,
          t0: Date.now(), maxFingers: t.length,
        }
      }
      if (t.length > touchState.maxFingers) touchState.maxFingers = t.length
    }

    const onTouchEnd = (e) => {
      if (!touchState || annotating) return
      if (e.touches.length > 0) return
      const { startX, startY, t0, maxFingers } = touchState
      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const dx = endX - startX
      const dy = endY - startY
      const dt = Date.now() - t0
      touchState = null

      if (maxFingers >= 3 && Math.abs(dx) < 40 && Math.abs(dy) < 40 && dt < 500) {
        doAction(gestures.tap3 || 'none'); return
      }
      if (maxFingers === 2 && Math.abs(dx) < 40 && Math.abs(dy) < 40 && dt < 500) {
        doAction(gestures.tap2 || 'none'); return
      }
      if (maxFingers === 1 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.2 && dt < 700) {
        doAction(gestures[dx < 0 ? 'swipeLeft' : 'swipeRight']); return
      }
      if (maxFingers === 1 && Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 400) {
        const rect = v.getBoundingClientRect()
        const rx = (endX - rect.left) / rect.width
        if (rx < 0.30) doAction(gestures.tapLeft)
        else if (rx > 0.70) doAction(gestures.tapRight)
        else setChromeVisible(c => !c)
      }
    }

    const onDown = (e) => {
      if (annotating && e.target.dataset.annPage) return
      if (e.pointerType === 'touch') return
      pointerRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
    }
    const onUp = (e) => {
      if (!pointerRef.current) return
      if (annotating && e.target.dataset.annPage) return
      if (e.pointerType === 'touch') { pointerRef.current = null; return }
      const dx = e.clientX - pointerRef.current.x
      const dy = e.clientY - pointerRef.current.y
      const dt = Date.now() - pointerRef.current.t
      pointerRef.current = null

      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.2 && dt < 700) {
        doAction(gestures[dx < 0 ? 'swipeLeft' : 'swipeRight']); return
      }
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 400) {
        const rect = v.getBoundingClientRect()
        const rx = (e.clientX - rect.left) / rect.width
        if (rx < 0.30) doAction(gestures.tapLeft)
        else if (rx > 0.70) doAction(gestures.tapRight)
        else setChromeVisible(c => !c)
      }
    }

    v.addEventListener('touchstart', onTouchStart, { passive: true })
    v.addEventListener('touchend', onTouchEnd)
    v.addEventListener('pointerdown', onDown)
    v.addEventListener('pointerup', onUp)
    return () => {
      v.removeEventListener('touchstart', onTouchStart)
      v.removeEventListener('touchend', onTouchEnd)
      v.removeEventListener('pointerdown', onDown)
      v.removeEventListener('pointerup', onUp)
    }
  }, [gestures, doAction, annotating])

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (/INPUT|SELECT|TEXTAREA/.test(e.target?.tagName)) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); nextPage() }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prevPage() }
      else if (e.key === ' ') { e.preventDefault(); toggleAutoscroll() }
      else if (e.key === 'm' || e.key === 'M') metro.toggle()
      else if (e.key === 'r' || e.key === 'R') recorder.toggleRec()
      else if (e.key === 'Escape') { setShowMetro(false); setShowGestures(false); setShowRecordings(false); setShowTools(false); setModal(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nextPage, prevPage, toggleAutoscroll, metro, recorder])

  // resize
  useEffect(() => {
    let timer
    const onResize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => { builtKeyRef.current = null; setCurrentPage(p => p) }, 250)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      metro.stop()
    }
  }, [])

  const handleBack = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setAutoscroll(false)
    metro.stop()
    onBack()
  }

  const cycleScrollMode = () => setPageMode(m => {
    const next = m === 'full' ? 'half' : m === 'half' ? 'anchor' : 'full'
    if (next !== 'anchor') setEditingAnchors(false)
    return next
  })
  const scrollModeLabel = pageMode === 'full' ? t('reader.fullPage') : pageMode === 'half' ? t('reader.halfPage') : t('reader.anchorScroll')

  const displayName = isPlaylist ? currentPieceName : scoreName

  return (
    <div className={s.root}>
      <div ref={viewerRef} className={s.viewer} role="document" aria-label={displayName} />
      {turnFlash > 0 && <div key={turnFlash} className={s.turnFlash} />}

      {metro.running && metro.currentBeat >= 0 && (
        <div key={`beat-${metro.currentBeat}-${Date.now()}`} className={metro.currentBeat === 0 && accent ? s.beatFlash : s.beatFlashNormal} />
      )}

      {metro.running && (
        <div className={s.beatDots}>
          {Array.from({ length: beats }, (_, i) => {
            const active = i === metro.currentBeat
            const isAccent = i === 0 && accent
            return <div key={i} className={`${s.beatDot} ${active ? (isAccent ? s.beatDotAccent : s.beatDotActive) : ''}`} />
          })}
        </div>
      )}

      {chromeVisible && (
        <>
          <div className={s.hintLeft}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="rgba(255,255,255,.28)"><path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" /></svg>
          </div>
          <div className={s.hintRight}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="rgba(255,255,255,.28)"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg>
          </div>
        </>
      )}

      {chromeVisible && (
        <div className={s.topBar}>
          <div className={s.topRow}>
            <button className={s.backBtn} onClick={handleBack} aria-label={t('reader.back')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" /></svg>
            </button>
            <div className={s.titleWrap}>
              <div className={s.title}>{displayName}</div>
              <div className={s.pageLabel} aria-live="polite">{t('reader.page')} {currentPage} {t('reader.pageOf')} {totalPages}</div>
            </div>
            <button className={s.fitBtn} onClick={() => setFitMode(fitMode === 'page' ? 'dual' : fitMode === 'dual' ? 'width' : 'page')} aria-label={`${t('reader.fitModeLabel')}: ${fitMode === 'page' ? t('reader.fitPage') : fitMode === 'dual' ? t('reader.fitDual') : t('reader.fitWidth')}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z" /></svg>
              {fitMode === 'page' ? t('reader.fitPage') : fitMode === 'dual' ? t('reader.fitDual') : t('reader.fitWidth')}
            </button>
            <button className={s.fitBtn} onClick={cycleScrollMode} aria-label={`${t('reader.scrollModeLabel')}: ${scrollModeLabel}`}>
              {pageMode === 'anchor' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H16V9H13V17.9C15.28,17.44 17,15.42 17,13H19A7,7 0 0,1 12,20A7,7 0 0,1 5,13H7C7,15.42 8.72,17.44 11,17.9V9H8V7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2Z" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z" /></svg>
              )}
              {scrollModeLabel}
            </button>
          </div>

          <div className={s.markersRow}>
            <button
              className={`${s.backJumpBtn} ${jumpStackRef.current.length ? s.backJumpActive : s.backJumpDisabled}`}
              onClick={goBackJump}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z" /></svg>
              {t('reader.jumpBack')}
            </button>
            <div className={s.markersScroll}>
              {markers.map(m => (
                <div key={m.id} className={s.marker}>
                  <button className={s.markerGoBtn} onClick={() => gotoPage(m.page, true)} aria-label={`${t('reader.goTo')} ${m.label}, ${t('reader.page').toLowerCase()} ${m.page}`}>{m.label} · p.{m.page}</button>
                  <button className={s.markerDelBtn} onClick={() => setMarkers(markers.filter(x => x.id !== m.id))} aria-label={`${t('reader.removeMarker')} ${m.label}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <button className={s.addMarkerBtn} onClick={() => setModal({ type: 'marker' })} aria-label={t('reader.createJumpMarker')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17,18L12,15.82L7,18V5H17M17,3H7A2,2 0 0,0 5,5V21L12,18L19,21V5C19,3.89 18.1,3 17,3Z" /></svg>
              {t('reader.addMarker')}
            </button>
          </div>
        </div>
      )}

      {chromeVisible && annotating && (
        <div className={s.annotBar}>
          {['#E73B4C', '#3B82F6', '#1a1a1a'].map(c => {
            const colorKey = c === '#E73B4C' ? 'reader.colorRed' : c === '#3B82F6' ? 'reader.colorBlue' : 'reader.colorBlack'
            return (
              <button
                key={c}
                className={`${s.colorSwatch} ${annotColor === c && !erasing ? s.colorSwatchActive : ''}`}
                style={{ background: c }}
                onClick={() => { setAnnotColor(c); setErasingState(false); setErasing(false) }}
                aria-label={t(colorKey)}
                aria-pressed={annotColor === c && !erasing}
              />
            )
          })}
          <button
            className={`${s.colorSwatch} ${s.eraserSwatch} ${erasing ? s.colorSwatchActive : ''}`}
            onClick={() => { setErasingState(true); setErasing(true) }}
            title={t('reader.eraser')}
            aria-label={t('reader.eraser')}
            aria-pressed={erasing}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.24,3.56L21.19,8.5C21.97,9.29 21.97,10.55 21.19,11.34L12,20.53C10.44,22.09 7.91,22.09 6.34,20.53L2.81,17C2.03,16.21 2.03,14.95 2.81,14.16L13.41,3.56C14.2,2.78 15.46,2.78 16.24,3.56M4.22,15.58L7.76,19.11C8.54,19.9 9.8,19.9 10.59,19.11L14.12,15.58L9.17,10.63L4.22,15.58Z" /></svg>
          </button>
        </div>
      )}

      {chromeVisible && pageMode === 'anchor' && editingAnchors && (
        <div className={s.anchorEditBar} style={{ gap: 8 }}>
          <button className={s.colorSwatch} style={{ background: 'var(--accent)', color: '#fff' }} onClick={addAnchorHere} title={t('reader.anchorAddHere')} aria-label={t('reader.anchorAddHere')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" /></svg>
          </button>
          <button className={`${s.colorSwatch} ${s.eraserSwatch}`} onClick={() => setAnchors(buildAutoAnchors())} title={t('reader.anchorAuto')} aria-label={t('reader.anchorAuto')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7.5,5.6L10,7L8.6,4.5L10,2L7.5,3.4L5,2L6.4,4.5L5,7L7.5,5.6M19.5,15.4L17,14L18.4,16.5L17,19L19.5,17.6L22,19L20.6,16.5L22,14L19.5,15.4M22,2L19.5,3.4L17,2L18.4,4.5L17,7L19.5,5.6L22,7L20.6,4.5L22,2M13.34,12.78L15.78,10.34L13.66,8.22L11.22,10.66L13.34,12.78M14.37,7.29L16.71,9.63C17.1,10 17.1,10.65 16.71,11.04L5.04,22.71C4.65,23.1 4,23.1 3.63,22.71L1.29,20.37C0.9,20 0.9,19.35 1.29,18.96L12.96,7.29C13.35,6.9 14,6.9 14.37,7.29Z" /></svg>
          </button>
          <button className={`${s.colorSwatch} ${s.eraserSwatch}`} onClick={() => setAnchors([])} title={t('reader.anchorClear')} aria-label={t('reader.anchorClear')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, minWidth: 22, textAlign: 'center' }}>{anchors.length}</span>
          <button onClick={() => setEditingAnchors(false)} style={{ border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'var(--accent)', color: '#fff' }}>
            {t('reader.anchorDone')}
          </button>
        </div>
      )}

      {chromeVisible && pageMode === 'anchor' && editingAnchors && anchors.length === 0 && (
        <div className={s.anchorHint}>{t('reader.anchorHint')}</div>
      )}

      {chromeVisible && (
        <div className={s.bottomBar}>
          <div className={s.toolbar}>
            <button className={autoscroll ? s.toolBtnActive : s.toolBtnInactive} onClick={toggleAutoscroll} aria-label={autoscroll ? t('reader.scrollStop') : t('reader.scrollStart')} aria-pressed={autoscroll}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d={autoscroll ? 'M14,19H18V5H14M6,19H10V5H6V19Z' : 'M8,5.14V19.14L19,12.14L8,5.14Z'} />
              </svg>
            </button>
            <div className={s.speedGroup}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-muted)" style={{ flex: 'none' }} aria-hidden="true"><path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" /></svg>
              <input type="range" min="8" max="280" step="1" value={scrollSpeed} onChange={e => setScrollSpeed(+e.target.value)} style={{ flex: 1 }} aria-label={`${t('reader.scrollSpeed')}: ${scrollSpeed} ${t('reader.speed')}`} />
              <span className={s.speedLabel}>{scrollSpeed} {t('reader.speed')}</span>
            </div>
            <div className={s.divider} />
            <button className={metro.running ? s.toolBtnActive : s.toolBtnGhost} onClick={() => setShowMetro(true)} title={t('reader.metronome')} aria-label={t('reader.metronome')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12,1.75L8.57,2.67L4.07,19.5C3.9,20.15 4.05,20.84 4.46,21.37C4.87,21.91 5.5,22.21 6.17,22.21H17.83C18.5,22.21 19.13,21.91 19.54,21.37C19.95,20.84 20.1,20.15 19.93,19.5L15.43,2.67L12,1.75M10.29,4.6L11.27,4.07H12.73L13.71,4.6L17.65,19.4C17.71,19.62 17.65,19.79 17.5,19.97C17.35,20.15 17.16,20.21 16.95,20.21H7.05C6.84,20.21 6.65,20.15 6.5,19.97C6.35,19.79 6.29,19.62 6.35,19.4L10.29,4.6Z" /></svg>
            </button>
            <button className={recorder.recording ? s.toolBtnRec : s.toolBtnGhost} onClick={recorder.toggleRec} title={t('reader.record')} aria-label={recorder.recording ? t('reader.stopRecording') : t('reader.record')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d={recorder.recording ? 'M18,18H6V6H18V18Z' : 'M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z'} />
              </svg>
            </button>
            {pageMode === 'anchor' && (
              <button className={editingAnchors ? s.toolBtnActive : s.toolBtnGhost} onClick={() => setEditingAnchors(e => !e)} title={t('reader.editAnchors')} aria-label={t('reader.editAnchors')} aria-pressed={editingAnchors}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H16V9H13V17.9C15.28,17.44 17,15.42 17,13H19A7,7 0 0,1 12,20A7,7 0 0,1 5,13H7C7,15.42 8.72,17.44 11,17.9V9H8V7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2Z" /></svg>
              </button>
            )}
            <div className={s.moreWrap}>
              <button className={(showTools || annotating) ? s.toolBtnActive : s.toolBtnGhost} onClick={() => setShowTools(v => !v)} title={t('reader.moreTools')} aria-label={t('reader.moreTools')} aria-expanded={showTools} aria-haspopup="menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z" /></svg>
              </button>
              {showTools && (
                <>
                  <div className={s.toolMenuScrim} onClick={() => setShowTools(false)} />
                  <div className={s.toolMenu} role="menu">
                    <button className={`${s.toolMenuItem} ${annotating ? s.toolMenuItemActive : ''}`} role="menuitem" onClick={() => { setShowTools(false); setAnnotating(a => !a) }} aria-pressed={annotating}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" /></svg>
                      {t('reader.annotate')}
                    </button>
                    <button className={s.toolMenuItem} role="menuitem" onClick={() => { setShowTools(false); setShowRecordings(true) }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9,3V15.5A3.5,3.5 0 0,1 5.5,19A3.5,3.5 0 0,1 2,15.5A3.5,3.5 0 0,1 5.5,12C6.04,12 6.55,12.12 7,12.34V6.47L9,6.06M15,3V15.5A3.5,3.5 0 0,1 11.5,19A3.5,3.5 0 0,1 8,15.5A3.5,3.5 0 0,1 11.5,12C12.04,12 12.55,12.12 13,12.34V3H15M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V3H21Z" /></svg>
                      {t('reader.recordings')}
                    </button>
                    <button className={s.toolMenuItem} role="menuitem" onClick={() => { setShowTools(false); setShowGestures(true) }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" /></svg>
                      {t('reader.gestures')}
                    </button>
                    {playlists && playlists.length > 0 && (
                      <button className={s.toolMenuItem} role="menuitem" onClick={() => { setShowTools(false); setModal({ type: 'addToPlaylist' }) }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2,16H10V18H2V16M2,11H14V13H2V11M2,6H14V8H2V6M16,11V14H13V16H16V19H18V16H21V14H18V11H16Z" /></svg>
                        {t('library.addToPlaylist')}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showMetro && (
        <MetronomePanel
          bpm={bpm} setBpm={setBpm} beats={beats} setBeats={setBeats}
          accent={accent} toggleAccent={() => setAccent(a => !a)}
          tapTempo={() => {
            const now = Date.now()
            if (!window._taps) window._taps = []
            window._taps = window._taps.filter(t => now - t < 3000)
            window._taps.push(now)
            if (window._taps.length >= 2) {
              let sum = 0
              for (let i = 1; i < window._taps.length; i++) sum += window._taps[i] - window._taps[i - 1]
              setBpm(Math.max(40, Math.min(240, Math.round(60000 / (sum / (window._taps.length - 1))))))
            }
          }}
          running={metro.running} currentBeat={metro.currentBeat} toggle={metro.toggle}
          onClose={() => setShowMetro(false)}
        />
      )}

      {showGestures && (
        <GesturesPanel
          gestures={gestures}
          onChange={setGestures}
          onClose={() => setShowGestures(false)}
        />
      )}

      {showRecordings && (
        <RecordingsPanel
          recordings={scoreRecs}
          playingId={recorder.playingId}
          onPlay={recorder.playRec}
          onDownload={recorder.downloadRec}
          onDelete={recorder.delRec}
          onClose={() => setShowRecordings(false)}
        />
      )}

      {modal?.type === 'addToPlaylist' && playlists && (
        <ReaderAddToPlaylistPanel
          playlists={playlists}
          scoreId={scoreId}
          currentPage={currentPage}
          totalPages={totalPages}
          onAdd={(plId, from, to) => onAddToPlaylist(plId, scoreId, from || undefined, to || undefined)}
          onCreatePlaylist={onCreatePlaylist}
          onClose={() => setModal(null)}
          t={t}
        />
      )}

      {modal?.type === 'marker' && (
        <Modal
          title={t('reader.createMarker')}
          onClose={() => setModal(null)}
          markerMode={{ currentPage }}
          totalPages={totalPages}
          onConfirm={(label, page) => {
            const list = [...markers, { id: 'm' + Date.now(), label, page }].sort((a, b) => a.page - b.page)
            setMarkers(list)
            setModal(null)
          }}
        />
      )}
    </div>
  )
}

function ReaderAddToPlaylistPanel({ playlists, scoreId, currentPage, totalPages, onAdd, onCreatePlaylist, onClose, t }) {
  const [selectedPls, setSelectedPls] = useState(new Set())
  const [fromPage, setFromPage] = useState(String(currentPage))
  const [toPage, setToPage] = useState(String(currentPage))
  const [newName, setNewName] = useState('')

  const toggle = (id) => {
    setSelectedPls(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    onCreatePlaylist(name)
    setNewName('')
  }

  return (
    <div className={s.panelBackdrop} onClick={onClose}>
      <div className={s.panel} onClick={e => e.stopPropagation()}>
        <div className={s.panelHeader}>
          <div className={s.panelTitle}>{t('library.addToPlaylist')}</div>
          <button className={s.panelClose} onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', marginBottom: 10 }}>
          {playlists.map(p => (
            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: selectedPls.has(p.id) ? 'rgba(231,59,76,.1)' : 'var(--surface-hover)', border: `1px solid ${selectedPls.has(p.id) ? 'var(--accent)' : 'var(--border-light)'}`, padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-bright)' }}>
              <input type="checkbox" checked={selectedPls.has(p.id)} onChange={() => toggle(p.id)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
              {p.name}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            placeholder={t('library.playlistName')}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            style={{ flex: 1, background: '#0F1422', border: '1px solid var(--border-light)', color: 'var(--text-bright)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: 13 }}
          />
          <button disabled={!newName.trim()} onClick={handleCreate} style={{ background: 'var(--accent)', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: newName.trim() ? 1 : .4 }}>+</button>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{t('library.fromPage')}</span>
            <input type="number" min="1" max={totalPages} value={fromPage} onChange={e => setFromPage(e.target.value)} style={{ width: 60, background: '#0F1422', border: '1px solid var(--border-light)', color: 'var(--text-bright)', padding: 10, borderRadius: 9, fontSize: 14, textAlign: 'center' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{t('library.toPage')}</span>
            <input type="number" min={fromPage || 1} max={totalPages} value={toPage} onChange={e => setToPage(e.target.value)} style={{ width: 60, background: '#0F1422', border: '1px solid var(--border-light)', color: 'var(--text-bright)', padding: 10, borderRadius: 9, fontSize: 14, textAlign: 'center' }} />
          </div>
        )}

        <button
          disabled={selectedPls.size === 0}
          onClick={() => {
            const from = fromPage ? Math.max(1, Math.min(totalPages, +fromPage)) : null
            const to = toPage ? Math.max(from || 1, Math.min(totalPages, +toPage)) : null
            for (const plId of selectedPls) onAdd(plId, from, to)
            onClose()
          }}
          style={{ width: '100%', border: 'none', borderRadius: 11, padding: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: selectedPls.size > 0 ? 'var(--accent)' : 'var(--border-light)', color: '#fff', opacity: selectedPls.size > 0 ? 1 : .4 }}
        >
          {t('library.add')} {selectedPls.size > 0 ? `(${selectedPls.size})` : ''}
        </button>
      </div>
    </div>
  )
}
