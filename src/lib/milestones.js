// Practice milestones for celebratory, shareable moments. Pure + tested.
// See docs/adr/021-stats-milestones.md.
import { currentStreak, totalMs } from './stats'

const HOUR = 3_600_000

// Ordered by significance so the "most impressive" new one is celebrated.
export const MILESTONES = [
  { id: 'streak-3', kind: 'streak', value: 3, emoji: '🔥' },
  { id: 'hours-1', kind: 'hours', value: 1, emoji: '🎵' },
  { id: 'streak-7', kind: 'streak', value: 7, emoji: '🔥' },
  { id: 'hours-5', kind: 'hours', value: 5, emoji: '🎵' },
  { id: 'hours-10', kind: 'hours', value: 10, emoji: '🏅' },
  { id: 'streak-14', kind: 'streak', value: 14, emoji: '🔥' },
  { id: 'hours-25', kind: 'hours', value: 25, emoji: '🏅' },
  { id: 'streak-30', kind: 'streak', value: 30, emoji: '🏆' },
  { id: 'hours-50', kind: 'hours', value: 50, emoji: '🏆' },
  { id: 'streak-100', kind: 'streak', value: 100, emoji: '👑' },
  { id: 'hours-100', kind: 'hours', value: 100, emoji: '👑' },
]

function reached(m, stats, now) {
  if (m.kind === 'streak') return currentStreak(stats, now) >= m.value
  if (m.kind === 'hours') return totalMs(stats) >= m.value * HOUR
  return false
}

// Ids of all milestones currently achieved.
export function achievedMilestones(stats, now) {
  return MILESTONES.filter(m => reached(m, stats, now)).map(m => m.id)
}

// The single most significant milestone achieved but not yet seen (or null).
export function pickCelebration(stats, now, seen = []) {
  const seenSet = new Set(seen)
  const fresh = MILESTONES.filter(m => reached(m, stats, now) && !seenSet.has(m.id))
  if (!fresh.length) return null
  // MILESTONES is ordered ascending; the last fresh one is the most significant.
  return fresh[fresh.length - 1]
}

export function getMilestone(id) {
  return MILESTONES.find(m => m.id === id) || null
}
