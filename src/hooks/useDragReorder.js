import { useRef, useState, useCallback } from 'react'
import { indexFromPoint } from '../lib/dragReorder'

// Pointer-based drag reordering that works on touch and mouse. Attach
// `containerRef` to the list/grid, mark each reorderable child with
// `data-reorder`, and spread `handleProps(index)` onto a drag handle inside
// each child. `active` ({ from, over }) is exposed for visual feedback.
export function useDragReorder(onReorder) {
  const containerRef = useRef(null)
  const stateRef = useRef(null)
  const [active, setActive] = useState(null)

  const begin = useCallback((index) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    stateRef.current = { from: index, over: index }
    setActive({ from: index, over: index })
  }, [])

  const move = useCallback((e) => {
    const st = stateRef.current
    if (!st || !containerRef.current) return
    const els = [...containerRef.current.querySelectorAll('[data-reorder]')]
    const over = indexFromPoint(e.clientX, e.clientY, els.map(el => el.getBoundingClientRect()))
    if (over != null && over !== st.over) {
      st.over = over
      setActive({ from: st.from, over })
    }
  }, [])

  const end = useCallback(() => {
    const st = stateRef.current
    stateRef.current = null
    setActive(null)
    if (st && st.over !== st.from) onReorder(st.from, st.over)
  }, [onReorder])

  const handleProps = useCallback((index) => ({
    onPointerDown: begin(index),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
    style: { touchAction: 'none' },
  }), [begin, move, end])

  return { containerRef, handleProps, active }
}
