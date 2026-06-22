// Pure helpers for pointer-based drag reordering (touch + mouse).
// See docs/adr/016-touch-drag-reorder.md.

// Move an item from one index to another, returning a new array.
export function reorder(list, from, to) {
  const arr = [...list]
  const [moved] = arr.splice(from, 1)
  arr.splice(to, 0, moved)
  return arr
}

// Index of the rect whose center is closest to (x, y). Works for both vertical
// lists and wrapping grids. Returns null for an empty list.
export function indexFromPoint(x, y, rects) {
  let best = null
  let bestDist = Infinity
  rects.forEach((r, i) => {
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const d = (x - cx) ** 2 + (y - cy) ** 2
    if (d < bestDist) { bestDist = d; best = i }
  })
  return best
}
