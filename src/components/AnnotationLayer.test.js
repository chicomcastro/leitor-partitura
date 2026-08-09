import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnnotationLayer } from './AnnotationLayer'

// jsdom não implementa layout, então offsetWidth/offsetHeight ficam em 0 e o
// hook recusaria criar o canvas. Estes helpers fixam um tamanho de página.
function makeWrap() {
  const wrap = document.createElement('div')
  Object.defineProperty(wrap, 'offsetWidth', { value: 700, configurable: true })
  Object.defineProperty(wrap, 'offsetHeight', { value: 990, configurable: true })
  document.body.appendChild(wrap)
  return wrap
}

function makeAnnotations(saved = {}) {
  return {
    getPageAnnotation: (i) => saved[i] ?? null,
    setPageAnnotation: vi.fn(),
    saveAnnotations: vi.fn(),
    saveAnnotationsForRange: vi.fn(),
  }
}

function setup({ pages = 3, annotations = makeAnnotations(), annotating = false } = {}) {
  const wrappers = Array.from({ length: pages }, (_, n) => ({ i: n + 1, wrap: makeWrap() }))
  const hook = renderHook(() => useAnnotationLayer({
    wrappers,
    scoreId: 's1',
    annotating,
    color: '#E73B4C',
    annotations,
    scoreRanges: [],
  }))
  return { wrappers, hook, annotations }
}

const canvasesIn = (wrap) => wrap.querySelectorAll('canvas')

// jsdom não traz um contexto 2D: getContext devolve null sem o pacote `canvas`.
const fakeCtx = () => ({
  scale: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn(), beginPath: vi.fn(),
  moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
})

beforeEach(() => {
  document.body.innerHTML = ''
  HTMLCanvasElement.prototype.getContext = vi.fn(fakeCtx)
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,ZZZ')
})

describe('useAnnotationLayer — alocação sob demanda', () => {
  it('não cria nenhum canvas só por montar', () => {
    const { wrappers } = setup({ pages: 40 })
    for (const { wrap } of wrappers) expect(canvasesIn(wrap).length).toBe(0)
  })

  it('cria o canvas apenas da página pedida', () => {
    const { wrappers, hook } = setup({ pages: 3 })
    act(() => { hook.result.current.ensurePage(2) })
    expect(canvasesIn(wrappers[0].wrap).length).toBe(0)
    expect(canvasesIn(wrappers[1].wrap).length).toBe(1)
    expect(canvasesIn(wrappers[2].wrap).length).toBe(0)
  })

  it('ensurePage é idempotente', () => {
    const { wrappers, hook } = setup({ pages: 2 })
    act(() => {
      hook.result.current.ensurePage(1)
      hook.result.current.ensurePage(1)
    })
    expect(canvasesIn(wrappers[0].wrap).length).toBe(1)
  })

  it('releasePage remove o canvas e zera o buffer', () => {
    const { wrappers, hook } = setup({ pages: 2 })
    act(() => { hook.result.current.ensurePage(1) })
    const canvas = canvasesIn(wrappers[0].wrap)[0]
    act(() => { hook.result.current.releasePage(1) })
    expect(canvasesIn(wrappers[0].wrap).length).toBe(0)
    expect(canvas.width).toBe(0)
    expect(canvas.height).toBe(0)
  })

  it('recria a página depois de liberada, restaurando o traço salvo', () => {
    const annotations = makeAnnotations({ 1: 'data:image/png;base64,AAA' })
    const { wrappers, hook } = setup({ pages: 2, annotations })
    act(() => { hook.result.current.ensurePage(1) })
    act(() => { hook.result.current.releasePage(1) })
    act(() => { hook.result.current.ensurePage(1) })
    const canvas = canvasesIn(wrappers[0].wrap)[0]
    expect(canvas).toBeTruthy()
    expect(canvas.width).toBeGreaterThan(0)
  })

  it('ignora páginas sem layout ainda (imagem não carregada)', () => {
    const wrap = document.createElement('div')
    Object.defineProperty(wrap, 'offsetHeight', { value: 0, configurable: true })
    document.body.appendChild(wrap)
    const hook = renderHook(() => useAnnotationLayer({
      wrappers: [{ i: 1, wrap }],
      scoreId: 's1',
      annotating: false,
      color: '#000',
      annotations: makeAnnotations(),
      scoreRanges: [],
    }))
    act(() => { hook.result.current.ensurePage(1) })
    expect(canvasesIn(wrap).length).toBe(0)
  })

  it('desmontar descarta todos os canvases vivos', () => {
    const { wrappers, hook } = setup({ pages: 3 })
    act(() => {
      hook.result.current.ensurePage(1)
      hook.result.current.ensurePage(2)
    })
    hook.unmount()
    for (const { wrap } of wrappers) expect(canvasesIn(wrap).length).toBe(0)
  })

  it('o canvas só captura ponteiro quando o modo de anotação está ligado', () => {
    const { wrappers, hook } = setup({ pages: 1, annotating: false })
    act(() => { hook.result.current.ensurePage(1) })
    expect(canvasesIn(wrappers[0].wrap)[0].style.pointerEvents).toBe('none')

    const { wrappers: w2, hook: h2 } = setup({ pages: 1, annotating: true })
    act(() => { h2.result.current.ensurePage(1) })
    expect(canvasesIn(w2[0].wrap)[0].style.pointerEvents).toBe('auto')
  })
})
