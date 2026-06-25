import { describe, it, expect } from 'vitest'
import { achievedMilestones, pickCelebration, getMilestone } from './milestones'

const now = new Date('2026-06-25T12:00:00')
const HOUR = 3_600_000

function streakDays(n) {
  const days = {}
  for (let i = 0; i < n; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    days[key] = { ms: 120000 }
  }
  return { days, views: {} }
}

describe('achievedMilestones', () => {
  it('returns streak + hours milestones reached', () => {
    const stats = streakDays(7)
    // 7 days * 2 min = 14 min total → no hour milestones, streak 3 and 7
    const ids = achievedMilestones(stats, now)
    expect(ids).toContain('streak-3')
    expect(ids).toContain('streak-7')
    expect(ids).not.toContain('streak-14')
    expect(ids).not.toContain('hours-1')
  })
  it('reaches hour milestones by total time', () => {
    const stats = { days: { '2026-06-25': { ms: 6 * HOUR } }, views: {} }
    const ids = achievedMilestones(stats, now)
    expect(ids).toContain('hours-1')
    expect(ids).toContain('hours-5')
    expect(ids).not.toContain('hours-10')
  })
})

describe('pickCelebration', () => {
  it('returns the most significant unseen milestone', () => {
    const stats = streakDays(7)
    const m = pickCelebration(stats, now, [])
    expect(m.id).toBe('streak-7') // more significant than streak-3
  })
  it('skips already-seen milestones', () => {
    const stats = streakDays(7)
    const m = pickCelebration(stats, now, ['streak-7'])
    expect(m.id).toBe('streak-3')
  })
  it('returns null when nothing new', () => {
    const stats = streakDays(7)
    expect(pickCelebration(stats, now, ['streak-3', 'streak-7'])).toBeNull()
  })
})

describe('getMilestone', () => {
  it('looks up by id', () => {
    expect(getMilestone('hours-10')).toMatchObject({ kind: 'hours', value: 10 })
    expect(getMilestone('nope')).toBeNull()
  })
})
