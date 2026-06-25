import { describe, it, expect } from 'vitest'
import { buildShareSummary } from './shareCard'

const now = new Date('2026-06-25T12:00:00')
const scores = [
  { id: 'a', name: 'Clair de Lune', composer: 'Debussy' },
  { id: 'b', name: 'Canon', composer: 'Pachelbel' },
]
const stats = {
  days: {
    '2026-06-25': { ms: 3600000, byScore: { a: 3600000 } },
    '2026-06-23': { ms: 1800000, byScore: { b: 1800000 } },
  },
  views: {},
}

describe('buildShareSummary', () => {
  it('summarizes totals, week, streak and tops with formatted labels', () => {
    const s = buildShareSummary(stats, scores, now)
    expect(s.total).toBe(5400000)
    expect(s.week).toBe(5400000)
    expect(s.streak).toBe(1) // only the 25th meets the 1-min threshold consecutively
    expect(s.topPiece).toBe('Clair de Lune')
    expect(s.topComposer).toBe('Debussy')
    expect(s.totalLabel).toBe('1h 30min')
    expect(s.weekLabel).toBe('1h 30min')
  })

  it('handles empty stats gracefully', () => {
    const s = buildShareSummary({ days: {}, views: {} }, scores, now)
    expect(s.total).toBe(0)
    expect(s.topPiece).toBeNull()
    expect(s.totalLabel).toBe('0min')
  })
})
