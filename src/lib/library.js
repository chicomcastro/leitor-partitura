// Pure helpers for the library/playlist screen: score metadata normalization,
// search, tag filtering and sorting. Kept side-effect free so they can be unit
// tested and reused. See docs/adr/011-library-scaling.md.

export const SORT_OPTIONS = ['recent', 'added', 'name', 'pages']

// Playlist accent colors offered in the UI (CSS color strings).
export const PLAYLIST_COLORS = [
  '#E73B4C', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#64748B',
]

// Fill in defaults for the metadata fields added in the redesign so older
// persisted scores keep working without a migration step.
export function normalizeScore(s) {
  return {
    composer: '',
    favorite: false,
    lastOpenedAt: 0,
    ...s,
    tags: Array.isArray(s?.tags) ? s.tags : [],
  }
}

export function matchesQuery(score, query) {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    (score.name || '').toLowerCase().includes(q) ||
    (score.composer || '').toLowerCase().includes(q) ||
    (score.tags || []).some(tag => tag.toLowerCase().includes(q))
  )
}

// Filter by free-text query (name/composer/tag) and by a set of required tags.
export function filterScores(scores, { query = '', tags = [] } = {}) {
  return scores.filter(
    s => matchesQuery(s, query) && (tags.length === 0 || tags.every(t => (s.tags || []).includes(t)))
  )
}

export function sortScores(scores, sort) {
  const arr = [...scores]
  switch (sort) {
    case 'name':
      return arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    case 'added':
      return arr.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
    case 'pages':
      return arr.sort((a, b) => (b.pages || 0) - (a.pages || 0))
    case 'recent':
    default:
      return arr.sort(
        (a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0) || (b.addedAt || 0) - (a.addedAt || 0)
      )
  }
}

// All distinct tags across scores, alphabetically sorted.
export function collectTags(scores) {
  const set = new Set()
  for (const s of scores) for (const tag of s.tags || []) set.add(tag)
  return [...set].sort((a, b) => a.localeCompare(b))
}

export function searchPlaylists(playlists, query) {
  if (!query) return playlists
  const q = query.toLowerCase()
  return playlists.filter(p => (p.name || '').toLowerCase().includes(q))
}

// Parse a comma-separated tag input into a clean, de-duplicated list.
export function parseTags(input) {
  return [...new Set((input || '').split(',').map(t => t.trim()).filter(Boolean))]
}

export function recentScores(scores, limit = 12) {
  return scores
    .filter(s => s.lastOpenedAt)
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .slice(0, limit)
}

export function favoriteScores(scores) {
  return scores.filter(s => s.favorite)
}
