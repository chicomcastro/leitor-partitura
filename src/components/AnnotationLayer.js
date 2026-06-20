import { useEffect, useRef, useCallback } from 'react'

/**
 * Imperatively creates transparent canvases over each page wrapper div
 * for drawing annotations. Works with the DOM-based wrapper approach.
 */
export function useAnnotationLayer({ wrappers, scoreId, annotating, color, annotations }) {
  const canvasMapRef = useRef(new Map())   // pageNum -> canvas
  const drawingRef = useRef(false)
  const colorRef = useRef(color)
  const erasingRef = useRef(false)

  colorRef.current = color

  // Ensure each wrapper has an annotation canvas
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

      // Restore saved annotation if any
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

  // Toggle pointer-events based on annotating state
  useEffect(() => {
    for (const canvas of canvasMapRef.current.values()) {
      canvas.style.pointerEvents = annotating ? 'auto' : 'none'
      canvas.style.touchAction = annotating ? 'none' : 'auto'
    }
  }, [annotating])

  // Drawing handlers
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
    annotations.saveAnnotations(scoreId)
  }, [annotations, scoreId])

  // Attach/detach drawing event listeners
  useEffect(() => {
    if (!annotating) return

    const onPointerDown = (e) => {
      const canvas = e.currentTarget
      canvas.setPointerCapture(e.pointerId)
      drawingRef.current = true

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
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

  // Cleanup canvases on unmount or score change
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
