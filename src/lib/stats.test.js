import { describe, it, expect } from 'vitest'
import {
  emptyStats, dayKey, addPractice, registerView, totalMs, rangeMsDays,
  currentStreak, activeDays, heatmap, topScores, topComposers, formatDuration,
} from './stats'

const D = (s) => new Date(s + 'T12:00:00')

describe('dayKey', () => {
  it('formats local YYYY-MM-DD', () => {
    expect(dayKey(D('2026-06-25'))).toBe('2026-06-25')
  })
})

describe('addPractice', () => {
  it('accumulates ms per day and per score immutably', () => {
    const s1 = addPractice(emptyStats(), { dateKey: '2026-06-25', ms: 1000, scoreId: 'a' })
    const s2 = addPractice(s1, { dateKey: '2026-06-25', ms: 500, scoreId: 'a' })
    const s3 = addPractice(s2, { dateKey: '2026-06-25', ms: 2000, scoreId: 'b' })
    expect(s3.days['2026-06-25'].ms).toBe(3500)
    expect(s3.days['2026-06-25'].byScore).toEqual({ a: 1500, b: 2000 })
    expect(s1.days['2026-06-25'].ms).toBe(1000) // original untouched
  })
  it('ignores non-positive ms', () => {
    expect(addPractice(emptyStats(), { dateKey: '2026-06-25', ms: 0 }).days).toEqual({})
  })
})

describe('registerView', () => {
  it('counts opens per score', () => {
    let s = registerView(emptyStats(), 'a')
    s = registerView(s, 'a')
    s = registerView(s, 'b')
    expect(s.views).toEqual({ a: 2, b: 1 })
  })
})

describe('totals & ranges', () => {
  const stats = {
    days: {
      '2026-06-25': { ms: 3600000, byScore: { a: 3600000 } },
      '2026-06-24': { ms: 1800000, byScore: { b: 1800000 } },
      '2026-06-20': { ms: 600000, byScore: { a: 600000 } },
    },
    views: {},
  }
  it('totalMs sums all days', () => {
    expect(totalMs(stats)).toBe(6000000)
  })
  it('rangeMsDays sums the trailing window', () => {
    expect(rangeMsDays(stats, D('2026-06-25'), 7)).toBe(6000000)
    expect(rangeMsDays(stats, D('2026-06-25'), 2)).toBe(5400000) // 24th + 25th
  })
})

describe('currentStreak', () => {
  it('counts consecutive days ending today', () => {
    const stats = { days: {
      '2026-06-25': { ms: 120000 }, '2026-06-24': { ms: 120000 }, '2026-06-23': { ms: 120000 },
      '2026-06-21': { ms: 120000 },
    } }
    expect(currentStreak(stats, D('2026-06-25'))).toBe(3)
  })
  it('uses yesterday when today has no practice yet', () => {
    const stats = { days: { '2026-06-24': { ms: 120000 }, '2026-06-23': { ms: 120000 } } }
    expect(currentStreak(stats, D('2026-06-25'))).toBe(2)
  })
  it('ignores days below the minimum', () => {
    const stats = { days: { '2026-06-25': { ms: 1000 } } }
    expect(currentStreak(stats, D('2026-06-25'))).toBe(0)
  })
})

describe('activeDays & heatmap', () => {
  const stats = { days: { '2026-06-25': { ms: 120000 }, '2026-06-24': { ms: 1000 } } }
  it('activeDays counts days above threshold', () => {
    expect(activeDays(stats)).toBe(1)
  })
  it('heatmap returns weeks*7 cells ending today', () => {
    const cells = heatmap(stats, D('2026-06-25'), 2)
    expect(cells).toHaveLength(14)
    expect(cells[cells.length - 1]).toEqual({ key: '2026-06-25', ms: 120000 })
  })
})

describe('topScores & topComposers', () => {
  const scores = [
    { id: 'a', name: 'Clair de Lune', composer: 'Debussy' },
    { id: 'b', name: 'Canon', composer: 'Pachelbel' },
    { id: 'c', name: 'Air', composer: 'Bach' },
  ]
  const stats = { days: {
    d1: { byScore: { a: 3000, b: 1000 } },
    d2: { byScore: { a: 1000, c: 5000 } },
  } }
  it('ranks scores by total practice time', () => {
    expect(topScores(stats, scores, 2).map(x => x.id)).toEqual(['c', 'a'])
    expect(topScores(stats, scores).find(x => x.id === 'a').ms).toBe(4000)
  })
  it('ranks composers by total practice time', () => {
    expect(topComposers(stats, scores, 1)[0]).toEqual({ composer: 'Bach', ms: 5000 })
  })
})

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(3600000)).toBe('1h')
    expect(formatDuration(3600000 + 23 * 60000)).toBe('1h 23min')
    expect(formatDuration(23 * 60000)).toBe('23min')
    expect(formatDuration(5000)).toBe('5s')
    expect(formatDuration(0)).toBe('0min')
  })
})
