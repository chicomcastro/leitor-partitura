import { useEffect, useRef, useCallback } from 'react'

// Um canvas de anotação por página custa largura×altura×dpr²×4 bytes — numa
// página A4 em tablet isso passa de 10 MB. Alocá-los para a partitura inteira
// de uma vez estoura o orçamento de memória do Safari e derruba a aba, então
// eles são criados sob demanda (ensurePage) e liberados ao sair da tela
// (releasePage). O traço já é persistido em cada pointerup, portanto liberar
// um canvas nunca perde anotação: ele é redesenhado a partir do dataURL salvo.
export function useAnnotationLayer({ wrappers, scoreId, annotating, color, annotations, scoreRanges }) {
  const canvasMapRef = useRef(new Map())
  const drawingRef = useRef(false)
  const colorRef = useRef(color)
  const erasingRef = useRef(false)
  const annotatingRef = useRef(annotating)
  const wrappersRef = useRef(wrappers)
  const annotationsRef = useRef(annotations)

  colorRef.current = color
  annotatingRef.current = annotating
  wrappersRef.current = wrappers
  annotationsRef.current = annotations

  const getCanvasCoords = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  const scoreIdRef = useRef(scoreId)
  const scoreRangesRef = useRef(scoreRanges)
  scoreIdRef.current = scoreId
  scoreRangesRef.current = scoreRanges

  const savePageCanvas = useCallback((canvas) => {
    const pageNum = +canvas.dataset.annPage
    const dataUrl = canvas.toDataURL('image/png')
    const anns = annotationsRef.current
    anns.setPageAnnotation(pageNum, dataUrl)

    const ranges = scoreRangesRef.current
    if (ranges && ranges.length > 0) {
      const range = ranges.find(r => pageNum > r.offset && pageNum <= r.offset + r.count)
      if (range) anns.saveAnnotationsForRange(range.scoreId, range.offset, range.count)
    } else {
      anns.saveAnnotations(scoreIdRef.current)
    }
  }, [])

  // Os handlers são anexados na criação de cada canvas (não num efeito sobre a
  // lista inteira), já que os canvases passam a nascer e morrer com o scroll.
  // O modo de anotação é lido do ref no momento do evento.
  const handlersRef = useRef(null)
  if (!handlersRef.current) {
    handlersRef.current = {
      onPointerDown: (e) => {
        if (!annotatingRef.current) return
        const canvas = e.currentTarget
        canvas.setPointerCapture(e.pointerId)
        drawingRef.current = +canvas.dataset.annPage

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
      },
      onPointerMove: (e) => {
        if (!drawingRef.current) return
        const canvas = e.currentTarget
        const ctx = canvas.getContext('2d')
        const { x, y } = getCanvasCoords(e, canvas)
        ctx.lineTo(x, y)
        ctx.stroke()
      },
      onPointerUp: (e) => {
        if (!drawingRef.current) return
        drawingRef.current = false
        const canvas = e.currentTarget
        const ctx = canvas.getContext('2d')
        ctx.globalCompositeOperation = 'source-over'
        savePageCanvas(canvas)
      },
    }
  }

  const attach = useCallback((c) => {
    const h = handlersRef.current
    c.addEventListener('pointerdown', h.onPointerDown)
    c.addEventListener('pointermove', h.onPointerMove)
    c.addEventListener('pointerup', h.onPointerUp)
    c.addEventListener('pointercancel', h.onPointerUp)
  }, [])

  const detach = useCallback((c) => {
    const h = handlersRef.current
    c.removeEventListener('pointerdown', h.onPointerDown)
    c.removeEventListener('pointermove', h.onPointerMove)
    c.removeEventListener('pointerup', h.onPointerUp)
    c.removeEventListener('pointercancel', h.onPointerUp)
  }, [])

  const ensurePage = useCallback((i) => {
    const existing = canvasMapRef.current
    if (existing.has(i)) return
    const entry = (wrappersRef.current || []).find(o => o.i === i)
    if (!entry) return
    const wrap = entry.wrap
    const w = wrap.offsetWidth
    const h = wrap.offsetHeight
    // Páginas de imagem só têm tamanho depois que o <img> carrega.
    if (!w || !h) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const canvas = document.createElement('canvas')
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.cssText = `position:absolute;top:0;left:0;width:${w}px;height:${h}px;z-index:2;`
    canvas.dataset.annPage = i
    canvas.style.pointerEvents = annotatingRef.current ? 'auto' : 'none'
    canvas.style.touchAction = annotatingRef.current ? 'none' : 'auto'

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    wrap.appendChild(canvas)
    existing.set(i, canvas)
    attach(canvas)

    const saved = annotationsRef.current.getPageAnnotation(i)
    if (saved) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
      }
      img.src = saved
    }
  }, [attach])

  const releasePage = useCallback((i) => {
    const canvas = canvasMapRef.current.get(i)
    if (!canvas) return
    // Nunca puxar o canvas debaixo de um traço em andamento.
    if (drawingRef.current === i) return
    detach(canvas)
    // Zerar as dimensões devolve o buffer ao Safari na hora; só remover o nó
    // deixa a memória presa até o GC rodar, que é tarde demais num tablet.
    canvas.width = 0
    canvas.height = 0
    canvas.remove()
    canvasMapRef.current.delete(i)
  }, [detach])

  useEffect(() => {
    for (const canvas of canvasMapRef.current.values()) {
      canvas.style.pointerEvents = annotating ? 'auto' : 'none'
      canvas.style.touchAction = annotating ? 'none' : 'auto'
    }
  }, [annotating])

  const setErasing = useCallback((val) => {
    erasingRef.current = val
  }, [])

  // Ao trocar de partitura os wrappers antigos somem: descarta tudo.
  useEffect(() => {
    const map = canvasMapRef.current
    return () => {
      for (const canvas of map.values()) {
        detach(canvas)
        canvas.width = 0
        canvas.height = 0
        canvas.remove()
      }
      map.clear()
    }
  }, [scoreId, detach])

  return { setErasing, ensurePage, releasePage }
}
