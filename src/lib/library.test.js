import { describe, it, expect } from 'vitest'
import {
  normalizeScore, matchesQuery, filterScores, sortScores,
  collectTags, searchPlaylists, parseTags, recentScores, favoriteScores,
} from './library'

const scores = [
  { id: '1', name: 'Clair de Lune', composer: 'Debussy', tags: ['romantic', 'piano'], pages: 4, addedAt: 100, lastOpenedAt: 500, favorite: true },
  { id: '2', name: 'Für Elise', composer: 'Beethoven', tags: ['piano'], pages: 2, addedAt: 300, lastOpenedAt: 0 },
  { id: '3', name: 'Canon in D', composer: 'Pachelbel', tags: ['baroque'], pages: 1, addedAt: 200, lastOpenedAt: 900 },
]

describe('normalizeScore', () => {
  it('fills defaults for legacy scores', () => {
    expect(normalizeScore({ id: 'x', name: 'A' })).toMatchObject({
      composer: '', favorite: false, lastOpenedAt: 0, tags: [],
    })
  })
  it('coerces a non-array tags field to []', () => {
    expect(normalizeScore({ id: 'x', name: 'A', tags: 'oops' }).tags).toEqual([])
  })
  it('keeps existing values', () => {
    expect(normalizeScore({ id: 'x', name: 'A', favorite: true, tags: ['t'] })).toMatchObject({
      favorite: true, tags: ['t'],
    })
  })
})

describe('matchesQuery', () => {
  it('matches name, composer and tag, case-insensitively', () => {
    expect(matchesQuery(scores[0], 'lune')).toBe(true)
    expect(matchesQuery(scores[0], 'debussy')).toBe(true)
    expect(matchesQuery(scores[0], 'ROMANTIC')).toBe(true)
    expect(matchesQuery(scores[0], 'baroque')).toBe(false)
  })
  it('matches everything for empty query', () => {
    expect(matchesQuery(scores[1], '')).toBe(true)
  })
})

describe('filterScores', () => {
  it('filters by query', () => {
    expect(filterScores(scores, { query: 'piano' }).map(s => s.id)).toEqual(['1', '2'])
  })
  it('requires all selected tags (AND)', () => {
    expect(filterScores(scores, { tags: ['piano', 'romantic'] }).map(s => s.id)).toEqual(['1'])
  })
  it('combines query and tags', () => {
    expect(filterScores(scores, { query: 'elise', tags: ['piano'] }).map(s => s.id)).toEqual(['2'])
  })
})

describe('sortScores', () => {
  it('sorts by name', () => {
    expect(sortScores(scores, 'name').map(s => s.name)[0]).toBe('Canon in D')
  })
  it('sorts by added (newest first)', () => {
    expect(sortScores(scores, 'added').map(s => s.id)).toEqual(['2', '3', '1'])
  })
  it('sorts by pages (most first)', () => {
    expect(sortScores(scores, 'pages').map(s => s.id)).toEqual(['1', '2', '3'])
  })
  it('sorts by recent (lastOpenedAt), defaulting to addedAt', () => {
    expect(sortScores(scores, 'recent').map(s => s.id)).toEqual(['3', '1', '2'])
  })
  it('does not mutate the input', () => {
    const copy = [...scores]
    sortScores(scores, 'name')
    expect(scores).toEqual(copy)
  })
})

describe('collectTags', () => {
  it('returns distinct sorted tags', () => {
    expect(collectTags(scores)).toEqual(['baroque', 'piano', 'romantic'])
  })
})

describe('searchPlaylists', () => {
  const pls = [{ id: 'a', name: 'Jazz' }, { id: 'b', name: 'Casamentos' }]
  it('filters by name', () => {
    expect(searchPlaylists(pls, 'jazz').map(p => p.id)).toEqual(['a'])
  })
  it('returns all for empty query', () => {
    expect(searchPlaylists(pls, '')).toHaveLength(2)
  })
})

describe('parseTags', () => {
  it('splits, trims, drops empties and de-duplicates', () => {
    expect(parseTags(' piano,  jazz , piano, ')).toEqual(['piano', 'jazz'])
  })
  it('handles empty input', () => {
    expect(parseTags('')).toEqual([])
  })
})

describe('recentScores', () => {
  it('returns only opened scores, most recent first', () => {
    expect(recentScores(scores).map(s => s.id)).toEqual(['3', '1'])
  })
  it('respects the limit', () => {
    expect(recentScores(scores, 1).map(s => s.id)).toEqual(['3'])
  })
})

describe('favoriteScores', () => {
  it('returns only favorites', () => {
    expect(favoriteScores(scores).map(s => s.id)).toEqual(['1'])
  })
})
