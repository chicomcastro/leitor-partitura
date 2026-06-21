import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { I18nProvider } from '../lib/i18n'
import { UIProvider } from '../lib/ui'
import Library from './Library'

// Avoid pulling the pdf.js worker into the test environment.
vi.mock('../lib/pdf', () => ({ getPdfDoc: vi.fn(() => new Promise(() => {})) }))

const baseScores = [
  { id: '1', name: 'Clair de Lune', composer: 'Debussy', tags: ['piano', 'romantic'], favorite: true, type: 'image', pages: 1, addedAt: 3, lastOpenedAt: 5 },
  { id: '2', name: 'Canon in D', composer: 'Pachelbel', tags: ['baroque'], type: 'image', pages: 1, addedAt: 2, lastOpenedAt: 0 },
  { id: '3', name: 'Fur Elise', composer: 'Beethoven', tags: ['piano'], type: 'image', pages: 1, addedAt: 1, lastOpenedAt: 9 },
]

function renderLibrary(overrides = {}) {
  const props = {
    scores: baseScores,
    setScores: vi.fn(),
    playlists: [],
    setPlaylists: vi.fn(),
    activePlaylist: null,
    setActivePlaylist: vi.fn(),
    onOpenScore: vi.fn(),
    onUpdateScore: vi.fn(),
    onImport: vi.fn(),
    onDelete: vi.fn(),
    onCreatePlaylist: vi.fn(),
    onDeletePlaylist: vi.fn(),
    onUpdatePlaylist: vi.fn(),
    onReorderPlaylists: vi.fn(),
    onAddToPlaylist: vi.fn(),
    onRemoveFromPlaylist: vi.fn(),
    onReorderPlaylist: vi.fn(),
    ...overrides,
  }
  render(<I18nProvider><UIProvider><Library {...props} /></UIProvider></I18nProvider>)
  return props
}

beforeEach(() => localStorage.clear())

describe('Library navigation', () => {
  it('shows nav sections with live counts', () => {
    renderLibrary()
    expect(screen.getByRole('button', { name: /todas as partituras\s*3/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /favoritas\s*1/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /recentes\s*2/i })).toBeTruthy()
  })

  it('filters scores by the global search (name/composer/tag)', () => {
    renderLibrary()
    const search = screen.getByPlaceholderText(/buscar partituras e playlists/i)
    fireEvent.change(search, { target: { value: 'canon' } })
    expect(screen.getByText('Canon in D')).toBeTruthy()
    expect(screen.queryByText('Clair de Lune')).toBeNull()
    expect(screen.queryByText('Fur Elise')).toBeNull()
  })

  it('filters by a tag chip', () => {
    renderLibrary()
    fireEvent.click(screen.getByRole('button', { name: 'baroque' }))
    expect(screen.getByText('Canon in D')).toBeTruthy()
    expect(screen.queryByText('Fur Elise')).toBeNull()
  })
})

describe('Library actions', () => {
  it('toggles favorite via the star button', () => {
    const props = renderLibrary()
    const favBtns = screen.getAllByLabelText('Favoritar', { exact: true })
    fireEvent.click(favBtns[0])
    expect(props.onUpdateScore).toHaveBeenCalledWith(expect.any(String), { favorite: true })
  })

  it('opens a score when its card is clicked', () => {
    const props = renderLibrary()
    fireEvent.click(screen.getByText('Clair de Lune'))
    expect(props.onOpenScore).toHaveBeenCalledWith('1')
  })

  it('creates a playlist through the new-playlist modal', () => {
    const props = renderLibrary()
    fireEvent.click(screen.getAllByRole('button', { name: /nova playlist/i })[0])
    const input = screen.getByPlaceholderText(/nome da playlist/i)
    fireEvent.change(input, { target: { value: 'Jazz' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(props.onCreatePlaylist).toHaveBeenCalledWith('Jazz')
  })
})
