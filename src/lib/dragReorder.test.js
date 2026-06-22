import { describe, it, expect } from 'vitest'
import { reorder, indexFromPoint } from './dragReorder'

describe('reorder', () => {
  it('moves an item forward', () => {
    expect(reorder(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })
  it('moves an item backward', () => {
    expect(reorder(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })
  it('does not mutate the input', () => {
    const src = ['a', 'b', 'c']
    reorder(src, 0, 2)
    expect(src).toEqual(['a', 'b', 'c'])
  })
})

describe('indexFromPoint', () => {
  const rects = [
    { left: 0, top: 0, width: 100, height: 40 },   // center 50,20
    { left: 0, top: 40, width: 100, height: 40 },  // center 50,60
    { left: 0, top: 80, width: 100, height: 40 },  // center 50,100
  ]
  it('returns the closest rect index', () => {
    expect(indexFromPoint(50, 18, rects)).toBe(0)
    expect(indexFromPoint(50, 62, rects)).toBe(1)
    expect(indexFromPoint(50, 95, rects)).toBe(2)
  })
  it('clamps to nearest when point is past the ends', () => {
    expect(indexFromPoint(50, -100, rects)).toBe(0)
    expect(indexFromPoint(50, 999, rects)).toBe(2)
  })
  it('returns null for empty list', () => {
    expect(indexFromPoint(0, 0, [])).toBeNull()
  })
})
