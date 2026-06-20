import { useEffect, useRef, useCallback } from 'react'

export function useAnnotationLayer({ wrappers, scoreId, annotating, color, annotations, scoreRanges }) {
  const canvasMapRef = useRef(new Map())
  const drawingRef = useRef(false)
  const colorRef = useRef(color)
  const erasingRef = useRef(false)

  colorRef.current = color

  useEffect(() => {
    if (!wrappers || !wrappers.length) return

    const existing = canvasMapRef.current

    for (const { i, wrap } of wrappers) {
      if (existing.has(i)) continue

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = wrap.offsetWidth
      const h = wrap.offsetHeight

      const canvas = document.createElement('canvas')
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.cssText = `position:absolute;top:0;left:0;width:${w}px;height:${h}px;z-index:2;`
      canvas.dataset.annPage = i

      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)

      wrap.appendChild(canvas)
      existing.set(i, canvas)

      const saved = annotations.getPageAnnotation(i)
      if (saved) {
        const img = new Image()
        img.onload = () => {
          ctx.clearRect(0, 0, w, h)
          ctx.drawImage(img, 0, 0, w, h)
        }
        img.src = saved
      }
    }
  }, [wrappers, annotations])

  useEffect(() => {
    for (const canvas of canvasMapRef.current.values()) {
      canvas.style.pointerEvents = annotating ? 'auto' : 'none'
      canvas.style.touchAction = annotating ? 'none' : 'auto'
    }
  }, [annotating])

  const getCanvasCoords = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  const savePageCanvas = useCallback((canvas) => {
    const pageNum = +canvas.dataset.annPage
    const dataUrl = canvas.toDataURL('image/png')
    annotations.setPageAnnotation(pageNum, dataUrl)

    if (scoreRanges && scoreRanges.length > 0) {
      const range = scoreRanges.find(r => pageNum > r.offset && pageNum <= r.offset + r.count)
      if (range) annotations.saveAnnotationsForRange(range.scoreId, range.offset, range.count)
    } else {
      annotations.saveAnnotations(scoreId)
    }
  }, [annotations, scoreId, scoreRanges])

  useEffect(() => {
    if (!annotating) return

    const onPointerDown = (e) => {
      const canvas = e.currentTarget
      canvas.setPointerCapture(e.pointerId)
      drawingRef.current = true

      const ctx = canvas.getContext('2d')
      const { x, y } = getCanvasCoords(e, canvas)

      if (erasingRef.current) {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = 20
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = colorRef.current
        ctx.lineWidth = 2
      }
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(x, y)
    }

    const onPointerMove = (e) => {
      if (!drawingRef.current) return
      const canvas = e.currentTarget
      const ctx = canvas.getContext('2d')
      const { x, y } = getCanvasCoords(e, canvas)
      ctx.lineTo(x, y)
      ctx.stroke()
    }

    const onPointerUp = (e) => {
      if (!drawingRef.current) return
      drawingRef.current = false
      const canvas = e.currentTarget
      const ctx = canvas.getContext('2d')
      ctx.globalCompositeOperation = 'source-over'
      savePageCanvas(canvas)
    }

    const canvases = Array.from(canvasMapRef.current.values())
    for (const c of canvases) {
      c.addEventListener('pointerdown', onPointerDown)
      c.addEventListener('pointermove', onPointerMove)
      c.addEventListener('pointerup', onPointerUp)
      c.addEventListener('pointercancel', onPointerUp)
    }

    return () => {
      for (const c of canvases) {
        c.removeEventListener('pointerdown', onPointerDown)
        c.removeEventListener('pointermove', onPointerMove)
        c.removeEventListener('pointerup', onPointerUp)
        c.removeEventListener('pointercancel', onPointerUp)
      }
    }
  }, [annotating, getCanvasCoords, savePageCanvas])

  const setErasing = useCallback((val) => {
    erasingRef.current = val
  }, [])

  useEffect(() => {
    return () => {
      for (const canvas of canvasMapRef.current.values()) {
        canvas.remove()
      }
      canvasMapRef.current.clear()
    }
  }, [scoreId])

  return { setErasing }
}
