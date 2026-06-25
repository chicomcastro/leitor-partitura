// Local, privacy-first practice statistics. All pure functions so they are
// easy to test; the persisted shape lives under localStorage `sp.stats`:
//
//   { days: { 'YYYY-MM-DD': { ms, byScore: { [id]: ms } } }, views: { [id]: n } }
//
// See docs/adr/020-practice-stats.md.

export const STREAK_MIN_MS = 60_000 // a day counts toward a streak after 1 min

export function emptyStats() {
  return { days: {}, views: {} }
}

// Local YYYY-MM-DD (not UTC) so "today" matches the user's calendar day.
export function dayKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

// Returns a new stats object with `ms` added to the given day + score.
export function addPractice(stats, { dateKey, ms, scoreId }) {
  if (!ms || ms <= 0) return stats || emptyStats()
  const base = stats && stats.days ? stats : emptyStats()
  const days = { ...base.days }
  const day = days[dateKey] ? { ms: days[dateKey].ms, byScore: { ...days[dateKey].byScore } } : { ms: 0, byScore: {} }
  day.ms += ms
  if (scoreId) day.byScore[scoreId] = (day.byScore[scoreId] || 0) + ms
  days[dateKey] = day
  return { ...base, days, views: base.views || {} }
}

export function registerView(stats, scoreId) {
  const base = stats && stats.days ? stats : emptyStats()
  const views = { ...(base.views || {}) }
  views[scoreId] = (views[scoreId] || 0) + 1
  return { ...base, views }
}

export function totalMs(stats) {
  if (!stats || !stats.days) return 0
  return Object.values(stats.days).reduce((sum, d) => sum + (d.ms || 0), 0)
}

// Sum of ms over the inclusive [fromDate, toDate] window.
export function rangeMs(stats, fromDate, toDate) {
  if (!stats || !stats.days) return 0
  let total = 0
  for (let d = new Date(fromDate); dayKey(d) <= dayKey(toDate); d = addDays(d, 1)) {
    total += stats.days[dayKey(d)]?.ms || 0
  }
  return total
}

export function rangeMsDays(stats, today, days) {
  return rangeMs(stats, addDays(today, -(days - 1)), today)
}

// Consecutive days with practice ≥ minMs, ending today (or yesterday if today
// has no practice yet, so an in-progress day doesn't read as a broken streak).
export function currentStreak(stats, today, minMs = STREAK_MIN_MS) {
  if (!stats || !stats.days) return 0
  const has = (d) => (stats.days[dayKey(d)]?.ms || 0) >= minMs
  let cursor = new Date(today)
  if (!has(cursor)) cursor = addDays(cursor, -1)
  let streak = 0
  while (has(cursor)) { streak++; cursor = addDays(cursor, -1) }
  return streak
}

export function activeDays(stats, minMs = STREAK_MIN_MS) {
  if (!stats || !stats.days) return 0
  return Object.values(stats.days).filter(d => (d.ms || 0) >= minMs).length
}

// Daily cells for the last `weeks*7` days ending today, oldest first.
export function heatmap(stats, today, weeks = 16) {
  const cells = []
  const start = addDays(today, -(weeks * 7 - 1))
  for (let d = new Date(start); dayKey(d) <= dayKey(today); d = addDays(d, 1)) {
    cells.push({ key: dayKey(d), ms: stats?.days?.[dayKey(d)]?.ms || 0 })
  }
  return cells
}

// Top scores by total practice time. `scores` is the library list (for names).
export function topScores(stats, scores, n = 5) {
  if (!stats || !stats.days) return []
  const byScore = {}
  for (const day of Object.values(stats.days)) {
    for (const [id, ms] of Object.entries(day.byScore || {})) {
      byScore[id] = (byScore[id] || 0) + ms
    }
  }
  const byId = new Map((scores || []).map(s => [s.id, s]))
  return Object.entries(byScore)
    .map(([id, ms]) => ({ id, ms, score: byId.get(id) }))
    .filter(x => x.score)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, n)
}

export function topComposers(stats, scores, n = 3) {
  if (!stats || !stats.days) return []
  const byId = new Map((scores || []).map(s => [s.id, s]))
  const byComposer = {}
  for (const day of Object.values(stats.days)) {
    for (const [id, ms] of Object.entries(day.byScore || {})) {
      const c = byId.get(id)?.composer
      if (!c) continue
      byComposer[c] = (byComposer[c] || 0) + ms
    }
  }
  return Object.entries(byComposer)
    .map(([composer, ms]) => ({ composer, ms }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, n)
}

export function todayMs(stats, now) {
  return stats?.days?.[dayKey(now)]?.ms || 0
}

// Monday (local) of the week containing `d`, at noon to avoid DST edges.
export function startOfWeek(d) {
  const r = new Date(d)
  r.setHours(12, 0, 0, 0)
  const offset = (r.getDay() + 6) % 7 // 0 = Monday
  r.setDate(r.getDate() - offset)
  return r
}

export function weekId(d) {
  return dayKey(startOfWeek(d))
}

// Summary for the 7 days starting at `weekStart` (a Monday).
export function weekSummary(stats, scores, weekStart) {
  const start = startOfWeek(weekStart)
  const end = addDays(start, 6)
  let activeDays = 0
  const byScore = {}
  for (let d = new Date(start); dayKey(d) <= dayKey(end); d = addDays(d, 1)) {
    const day = stats?.days?.[dayKey(d)]
    if (!day) continue
    if ((day.ms || 0) >= STREAK_MIN_MS) activeDays++
    for (const [id, ms] of Object.entries(day.byScore || {})) byScore[id] = (byScore[id] || 0) + ms
  }
  const byId = new Map((scores || []).map(s => [s.id, s]))
  const top = Object.entries(byScore).sort((a, b) => b[1] - a[1])[0]
  return {
    ms: rangeMs(stats, start, end),
    activeDays,
    topPiece: top ? (byId.get(top[0])?.name || null) : null,
  }
}

// Fraction (0..1) of today's practice toward a daily goal in minutes.
export function goalProgress(stats, now, goalMin) {
  if (!goalMin || goalMin <= 0) return 0
  return Math.min(1, todayMs(stats, now) / (goalMin * 60000))
}

// "1h 23min" / "23min" / "45s".
export function formatDuration(ms) {
  if (!ms || ms < 1000) return '0min'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const min = totalMin % 60
  if (h > 0) return min > 0 ? `${h}h ${min}min` : `${h}h`
  if (totalMin > 0) return `${totalMin}min`
  return `${Math.floor(ms / 1000)}s`
}
