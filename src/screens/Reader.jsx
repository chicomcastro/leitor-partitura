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
  recordingsMeta, setRecordingsMeta, pieceList, onOpenScore,
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

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [autoscroll, setAutoscroll] = useState(false)
  const [showMetro, setShowMetro] = useState(false)
  const [showGestures, setShowGestures] = useState(false)
  const [showRecordings, setShowRecordings] = useState(false)
  const [modal, setModal] = useState(null)
  const [accent, setAccent] = useState(true)
  const [pageMode, setPageMode] = useState('full')
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
  })
  const scoreRecs = recordingsMeta.filter(r => r.scoreId === scoreId)
  const recorder = useRecorder({ scoreId, scoreName, recordingsMeta, setRecordingsMeta })

  const getBuffer = useCallback((id) => idbGet('pdfs', id), [])

  // build viewer
  useEffect(() => {
    const v = viewerRef.current
    if (!v) return
    const resolvedType = scoreType || 'pdf'
    const key = scoreId + '|' + fitMode + '|' + resolvedType
    if (builtKeyRef.current === key) return
    builtKeyRef.current = key

    let cancelled = false
    ;(async () => {
      try {
        if (resolvedType === 'image') {
          const buf = await getBuffer(scoreId)
          if (cancelled || !buf) return
          v.innerHTML = ''
          wrappersRef.current = []
          if (ioRef.current) ioRef.current.disconnect()

          const url = URL.createObjectURL(new Blob([buf]))
          const wrap = document.createElement('div')
          wrap.dataset.page = 1
          wrap.style.cssText = 'width:100%;max-width:100%;margin:0 auto 16px auto;background:var(--paper);border-radius:4px;box-shadow:0 8px 28px rgba(0,0,0,.5);position:relative;overflow:hidden;display:flex;justify-content:center;'
          const img = document.createElement('img')
          img.src = url
          img.style.cssText = 'max-width:100%;height:auto;display:block;'
          img.onload = () => {
            wrap.style.height = 'auto'
          }
          wrap.appendChild(img)
          v.appendChild(wrap)

          wrappersRef.current.push({ i: 1, wrap, page: null, scale: 1 })
          setTotalPages(1)
          setCurrentPage(1)
          setAnnWrappers([...wrappersRef.current])
          annotations.loadAnnotations(scoreId)
          return
        }

        const doc = await getPdfDoc(scoreId, getBuffer)
        if (cancelled) return
        v.innerHTML = ''
        wrappersRef.current = []
        if (ioRef.current) ioRef.current.disconnect()

        ioRef.current = new IntersectionObserver((entries) => {
          entries.forEach(en => { if (en.isIntersecting) renderPage(+en.target.dataset.page) })
        }, { root: v, rootMargin: '300px 0px' })

        const cw = v.clientWidth - 24
        const ch = v.clientHeight - 32
        const n = doc.numPages
        const isLandscape = cw > ch * 1.3
        const isDual = isLandscape && fitMode === 'page'
        let currentRow = null

        for (let i = 1; i <= n; i++) {
          const page = await doc.getPage(i)
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
          wrap.dataset.page = i
          wrap.style.cssText = `width:${w}px;height:${h}px;background:var(--paper);border-radius:4px;box-shadow:0 8px 28px rgba(0,0,0,.5);position:relative;overflow:hidden;`

          if (isDual) {
            const needsNewRow = i === 1 || (i > 1 && i % 2 === 0)
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

          wrappersRef.current.push({ i, wrap, page, scale })
        }

        setTotalPages(n)
        setCurrentPage(1)
        setAnnWrappers([...wrappersRef.current])
        annotations.loadAnnotations(scoreId)
        renderPage(1)
        renderPage(2)
      } catch (e) {
        console.error('buildViewer', e)
        builtKeyRef.current = null
      }
    })()

    return () => { cancelled = true }
  }, [scoreId, scoreType, fitMode, getBuffer])

  function renderPage(i) {
    const obj = wrappersRef.current[i - 1]
    if (!obj || obj.wrap.dataset.rendered) return
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

  const nextPage = useCallback(() => {
    if (pageMode === 'half') {
      const v = viewerRef.current
      if (v) v.scrollBy({ top: v.clientHeight * 0.5, behavior: 'smooth' })
    } else gotoPage(currentPage + 1)
  }, [gotoPage, currentPage, pageMode])
  const prevPage = useCallback(() => {
    if (pageMode === 'half') {
      const v = viewerRef.current
      if (v) v.scrollBy({ top: -v.clientHeight * 0.5, behavior: 'smooth' })
    } else gotoPage(currentPage - 1)
  }, [gotoPage, currentPage, pageMode])
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

    // mouse fallback for desktop
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
      else if (e.key === 'Escape') { setShowMetro(false); setShowGestures(false); setShowRecordings(false); setModal(null) }
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

  // piece nav
  const hasPieceNav = pieceList && pieceList.indexOf(scoreId) >= 0 && pieceList.length > 1
  const prevPiece = () => { if (!pieceList) return; const i = pieceList.indexOf(scoreId); if (i > 0) onOpenScore(pieceList[i - 1]) }
  const nextPiece = () => { if (!pieceList) return; const i = pieceList.indexOf(scoreId); if (i >= 0 && i < pieceList.length - 1) onOpenScore(pieceList[i + 1]) }

  const handleBack = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setAutoscroll(false)
    metro.stop()
    onBack()
  }

  return (
    <div className={s.root}>
      <div ref={viewerRef} className={s.viewer} role="document" aria-label={scoreName} />
      {turnFlash > 0 && <div key={turnFlash} className={s.turnFlash} />}

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
              <div className={s.title}>{scoreName}</div>
              <div className={s.pageLabel} aria-live="polite">{t('reader.page')} {currentPage} {t('reader.pageOf')} {totalPages}</div>
            </div>
            {hasPieceNav && (
              <div className={s.pieceNav}>
                <button className={s.chromeBtn} onClick={prevPiece} title={t('reader.prevPiece')} aria-label={t('reader.prevPiece')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6,18V6H8V18H6M9.5,12L18,6V18L9.5,12Z" /></svg>
                </button>
                <button className={s.chromeBtn} onClick={nextPiece} title={t('reader.nextPiece')} aria-label={t('reader.nextPiece')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16,18H18V6H16M6,18L14.5,12L6,6V18Z" /></svg>
                </button>
              </div>
            )}
            <button className={s.fitBtn} onClick={() => setFitMode(fitMode === 'page' ? 'width' : 'page')} aria-label={`${t('reader.fitModeLabel')}: ${fitMode === 'page' ? t('reader.fitPage') : t('reader.fitWidth')}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z" /></svg>
              {fitMode === 'page' ? t('reader.fitPage') : t('reader.fitWidth')}
            </button>
            <button className={s.fitBtn} onClick={() => setPageMode(m => m === 'full' ? 'half' : 'full')} aria-label={`${t('reader.scrollModeLabel')}: ${pageMode === 'full' ? t('reader.fullPage') : t('reader.halfPage')}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z" /></svg>
              {pageMode === 'full' ? t('reader.fullPage') : t('reader.halfPage')}
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
            <button className={s.toolBtnGhost} onClick={() => setShowRecordings(true)} title={t('reader.recordings')} aria-label={t('reader.recordings')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9,3V15.5A3.5,3.5 0 0,1 5.5,19A3.5,3.5 0 0,1 2,15.5A3.5,3.5 0 0,1 5.5,12C6.04,12 6.55,12.12 7,12.34V6.47L9,6.06M15,3V15.5A3.5,3.5 0 0,1 11.5,19A3.5,3.5 0 0,1 8,15.5A3.5,3.5 0 0,1 11.5,12C12.04,12 12.55,12.12 13,12.34V3H15M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V3H21Z" /></svg>
            </button>
            <button className={annotating ? s.toolBtnActive : s.toolBtnGhost} onClick={() => setAnnotating(a => !a)} title={t('reader.annotate')} aria-label={t('reader.annotate')} aria-pressed={annotating}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" /></svg>
            </button>
            <button className={s.toolBtnGhost} onClick={() => setShowGestures(true)} title={t('reader.gestures')} aria-label={t('reader.gestures')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" /></svg>
            </button>
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
