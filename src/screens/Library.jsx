import { useRef, useEffect, useCallback, useState } from 'react'
import { idbGet } from '../lib/db'
import { getPdfDoc } from '../lib/pdf'
import { exportBackup, importBackup, exportPlaylist } from '../lib/backup'
import { useI18n } from '../lib/i18n'
import Modal from '../components/Modal'
import Onboarding from '../components/Onboarding'
import s from './Library.module.css'

const VIEW_MODES = ['grid-sm', 'grid-md', 'grid-lg', 'list']

function ScoreCard({ score, inPlaylist, pageRange, onOpen, onDelete, onAddOpen, onRemove, t, viewMode }) {
  const canvasRef = useRef(null)
  const drawnRef = useRef(null)
  const [imgUrl, setImgUrl] = useState(null)

  useEffect(() => {
    if ((score.type || 'pdf') !== 'pdf') return
    const canvas = canvasRef.current
    if (!canvas || drawnRef.current === score.id) return
    drawnRef.current = score.id
    getPdfDoc(score.id, (id) => idbGet('pdfs', id))
      .then(async doc => {
        const page = await doc.getPage(1)
        const vp0 = page.getViewport({ scale: 1 })
        const w = 300
        const scale = w / vp0.width
        const vp = page.getViewport({ scale })
        canvas.width = vp.width
        canvas.height = vp.height
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
      })
      .catch(() => { drawnRef.current = null })
  }, [score.id, score.type])

  useEffect(() => {
    if (score.type !== 'image') return
    let url = null
    idbGet('pdfs', score.id).then(buf => {
      if (buf) {
        url = URL.createObjectURL(new Blob([buf]))
        setImgUrl(url)
      }
    })
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [score.id, score.type])

  const isList = viewMode === 'list'
  const thumb = (
    <div className={s.thumbWrap}>
      {score.type === 'image'
        ? <img src={imgUrl} className={s.thumbCanvas} alt={score.name} />
        : <canvas ref={canvasRef} className={s.thumbCanvas} />
      }
    </div>
  )

  const pagesLabel = pageRange
    ? `p. ${pageRange.from}–${pageRange.to}`
    : `${score.pages} ${score.pages === 1 ? t('library.page') : t('library.pages')}`

  const actions = (
    <>
      <button className={s.iconBtnPlaylist} onClick={(e) => { e.stopPropagation(); onAddOpen(score.id) }} title={t('library.addToPlaylist')} aria-label={t('library.addToPlaylist')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2,16H10V18H2V16M2,11H14V13H2V11M2,6H14V8H2V6M16,11V14H13V16H16V19H18V16H21V14H18V11H16Z" /></svg>
      </button>
      {inPlaylist && onRemove && (
        <button className={s.iconBtnRemove} onClick={(e) => { e.stopPropagation(); onRemove() }} title={t('library.removeFromPlaylist')} aria-label={t('library.removeFromPlaylist')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19,13H5V11H19V13Z" /></svg>
        </button>
      )}
      <button className={s.iconBtnDelete} onClick={(e) => { e.stopPropagation(); onDelete(score.id) }} title={t('library.delete')} aria-label={`${t('library.delete')} ${score.name}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>
      </button>
    </>
  )

  if (isList) {
    return (
      <div className={s.listItem} onClick={() => onOpen(score.id)}>
        <div className={s.listThumb}>{thumb}</div>
        <div className={s.listInfo}>
          <div className={s.listName}>{score.name}</div>
          <div className={s.cardPages}>{pagesLabel}</div>
        </div>
        <div className={s.listActions} onClick={e => e.stopPropagation()}>{actions}</div>
      </div>
    )
  }

  return (
    <div className={s.card}>
      <div className={s.cardThumb} onClick={() => onOpen(score.id)}>
        {thumb}
        <div className={s.cardName}>{score.name}</div>
        <div className={s.cardPages}>{pagesLabel}</div>
      </div>
      <div className={s.cardActions}>{actions}</div>
    </div>
  )
}

export default function Library({
  scores, setScores, playlists, setPlaylists, activePlaylist, setActivePlaylist,
  onOpenScore, onImport, onDelete, onCreatePlaylist, onDeletePlaylist,
  onAddToPlaylist, onRemoveFromPlaylist, onReorderPlaylist,
}) {
  const { t, locale, changeLocale, LOCALES } = useI18n()
  const fileRef = useRef(null)
  const [modal, setModal] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [onboardingSeen, setOnboardingSeen] = useState(() => localStorage.getItem('sp.onboarding') === '1')
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('sp.viewMode') || 'grid-md')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const dragRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menuOpen])

  const cycleView = useCallback(() => {
    setViewMode(prev => {
      const i = VIEW_MODES.indexOf(prev)
      const next = VIEW_MODES[(i + 1) % VIEW_MODES.length]
      localStorage.setItem('sp.viewMode', next)
      return next
    })
  }, [])

  const showOnboarding = scores.length === 0 && !onboardingSeen
  const dismissOnboarding = useCallback(() => {
    localStorage.setItem('sp.onboarding', '1')
    setOnboardingSeen(true)
  }, [])

  const inPlaylist = activePlaylist != null
  const activePl = playlists.find(p => p.id === activePlaylist)

  // Build visible items — in playlist mode, one entry per playlist item (supports page ranges + duplicates)
  const visibleItems = inPlaylist
    ? (activePl ? activePl.items.map((item, idx) => {
        const score = scores.find(s => s.id === item.scoreId)
        if (!score) return null
        const pageRange = (item.fromPage || item.toPage)
          ? { from: item.fromPage || 1, to: item.toPage || score.pages }
          : null
        return { score, pageRange, itemIndex: idx }
      }).filter(Boolean) : [])
    : scores.map(s => ({ score: s, pageRange: null, itemIndex: null }))

  const filteredItems = visibleItems.filter(v =>
    v.score.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleBackup = useCallback(async () => {
    try {
      const blob = await exportBackup()
      const date = new Date().toISOString().slice(0, 10)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `estante-backup-${date}.estante`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('backup export failed', err)
      alert(t('library.backupExportError'))
    }
  }, [t])

  const handleFiles = useCallback(async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    const estanteFile = files.find(f => f.name.endsWith('.estante'))
    if (estanteFile) {
      try {
        const result = await importBackup(estanteFile)
        if (result?.type === 'playlist') {
          alert(t('library.playlistImported'))
        }
        window.location.reload()
      } catch (err) {
        console.error('backup import failed', err)
        alert(t('library.backupImportError'))
      }
      return
    }
    onImport(files)
  }, [onImport, t])

  const toggleLocale = useCallback(() => {
    const currentIdx = LOCALES.findIndex(l => l.code === locale)
    const nextIdx = (currentIdx + 1) % LOCALES.length
    changeLocale(LOCALES[nextIdx].code)
  }, [locale, changeLocale, LOCALES])

  const playPlaylist = useCallback((plId) => {
    setActivePlaylist(plId)
    const pl = playlists.find(p => p.id === plId)
    if (pl && pl.items.length > 0) {
      onOpenScore(pl.items[0].scoreId || pl.items[0])
    }
  }, [playlists, setActivePlaylist, onOpenScore])

  const downloadBlob = useCallback((blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const sharePlaylist = useCallback(async (plId) => {
    const pl = playlists.find(p => p.id === plId)
    if (!pl) return
    try {
      const blob = await exportPlaylist(pl, scores)
      const filename = `${pl.name}.estante`

      let canShare = false
      try {
        const file = new File([blob], filename, { type: 'application/octet-stream' })
        canShare = navigator.canShare && navigator.canShare({ files: [file] })
        if (canShare) {
          await navigator.share({ files: [file], title: pl.name })
          return
        }
      } catch (_) {}

      downloadBlob(blob, filename)
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('share failed', err)
        alert(t('library.shareError'))
      }
    }
  }, [playlists, scores, t, downloadBlob])

  const tabs = [
    { id: null, name: t('library.allScores'), count: scores.length },
    ...playlists.map(p => ({ id: p.id, name: p.name, count: p.items.length })),
  ]

  return (
    <div className={s.root}>
      <div className={s.header}>
        <div className={s.brand}>
          <div className={s.logo}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z" /></svg>
          </div>
          <div>
            <div className={s.brandTitle}>{t('library.title')}</div>
            <div className={s.brandSub}>{t('library.subtitle')}</div>
          </div>
        </div>
        <div className={s.actions}>
          <button className={s.btnSecondary} onClick={() => setModal({ type: 'playlist' })}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2,16H10V18H2V16M2,11H14V13H2V11M2,6H14V8H2V6M16,11V14H13V16H16V19H18V16H21V14H18V11H16Z" /></svg>
            {t('library.newPlaylist')}
          </button>
          <button className={s.btnPrimary} onClick={() => fileRef.current?.click()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M11,15V12H9V15H6V17H9V20H11V17H14V15H11Z" /></svg>
            {t('library.import')}
          </button>
          <div className={s.menuWrap} ref={menuRef}>
            <button className={s.menuBtn} onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg>
            </button>
            {menuOpen && (
              <div className={s.menuDropdown}>
                <button className={s.menuItem} onClick={() => { handleBackup(); setMenuOpen(false) }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" /></svg>
                  {t('library.backup')}
                </button>
                <button className={s.menuItem} onClick={() => { toggleLocale(); setMenuOpen(false) }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.87,15.07L10.33,12.56L10.36,12.53C12.1,10.59 13.34,8.36 14.07,6H17V4H10V2H8V4H1V6H12.17C11.5,7.92 10.44,9.75 9,11.35C8.07,10.32 7.3,9.19 6.69,8H4.69C5.42,9.63 6.42,11.17 7.67,12.56L2.58,17.58L4,19L9,14L12.11,17.11L12.87,15.07M18.5,10H16.5L12,22H14L15.12,19H19.87L21,22H23L18.5,10M15.88,17L17.5,12.67L19.12,17H15.88Z" /></svg>
                  {t('language')}: {LOCALES.find(l => l.code === locale)?.flag || 'PT'}
                </button>
              </div>
            )}
          </div>
          <input type="file" accept="application/pdf,image/*,.estante" multiple ref={fileRef} onChange={handleFiles} style={{ display: 'none' }} />
        </div>
      </div>

      <div className={s.tabs} role="tablist" aria-label={t('library.filterByPlaylist')}>
        {tabs.map(tab => (
          <button
            key={tab.id ?? '__all'}
            className={`${s.tab} ${activePlaylist === tab.id ? s.tabActive : s.tabInactive}`}
            onClick={() => setActivePlaylist(tab.id)}
            role="tab"
            aria-selected={activePlaylist === tab.id}
          >
            {tab.name} &middot; {tab.count}
          </button>
        ))}
      </div>

      {inPlaylist && activePl && (
        <div className={s.playlistBar}>
          <button className={s.playBtn} onClick={() => playPlaylist(activePl.id)} disabled={activePl.items.length === 0}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>
            {t('library.play')}
          </button>
          <button className={s.bulkAddBtn} onClick={() => setModal({ type: 'bulk' })}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2,16H10V18H2V16M2,11H14V13H2V11M2,6H14V8H2V6M16,11V14H13V16H16V19H18V16H21V14H18V11H16Z" /></svg>
            {t('library.bulkAdd')}
          </button>
          <button className={s.shareBtn} onClick={() => sharePlaylist(activePl.id)} disabled={activePl.items.length === 0}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19C20.92,17.39 19.61,16.08 18,16.08Z" /></svg>
            {t('library.share')}
          </button>
          <button className={s.deletePlaylistBtn} onClick={() => { if (confirm(t('library.deletePlaylist') + '?')) onDeletePlaylist(activePl.id) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>
          </button>
        </div>
      )}

      <div className={s.content} role="main">
        <div className={s.searchWrap}>
          <div style={{ position: 'relative', flex: 1 }}>
            <svg className={s.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
            </svg>
            <input
              className={s.searchInput}
              type="text"
              placeholder={t('library.search')}
              aria-label={t('library.searchLabel')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchQuery && (
            <button className={s.searchClear} onClick={() => setSearchQuery('')} title={t('library.clearSearch')} aria-label={t('library.clearSearch')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
              </svg>
            </button>
          )}
          <button className={s.viewToggle} onClick={cycleView} aria-label={t('library.viewMode')}>
            {viewMode === 'list' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3,4H7V8H3V4M9,5V7H21V5H9M3,10H7V14H3V10M9,11V13H21V11H9M3,16H7V20H3V16M9,17V19H21V17H9Z" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3,11H11V3H3M3,21H11V13H3M13,21H21V13H13M13,3V11H21V3" /></svg>
            )}
          </button>
        </div>

        {filteredItems.length > 0 ? (
          <div className={`${viewMode === 'list' ? s.list : s.grid} ${s[viewMode.replace('-', '')]}`} role="list" aria-label={t('library.scores')}>
            {filteredItems.map((item, idx) => (
              <div
                key={inPlaylist ? `${item.score.id}_${item.itemIndex}` : item.score.id}
                role="listitem"
                draggable={inPlaylist}
                onDragStart={() => { dragRef.current = item.itemIndex ?? idx }}
                onDragOver={(e) => { if (inPlaylist) e.preventDefault() }}
                onDrop={() => {
                  const fromIdx = dragRef.current
                  const toIdx = item.itemIndex ?? idx
                  if (inPlaylist && fromIdx !== null && fromIdx !== toIdx) {
                    onReorderPlaylist(activePlaylist, fromIdx, toIdx)
                  }
                  dragRef.current = null
                }}
                onDragEnd={() => { dragRef.current = null }}
                style={inPlaylist ? { cursor: 'grab' } : undefined}
              >
                <ScoreCard
                  score={item.score}
                  inPlaylist={inPlaylist}
                  pageRange={item.pageRange}
                  onOpen={onOpenScore}
                  onDelete={onDelete}
                  onAddOpen={(id) => setModal({ type: 'add', scoreId: id, totalPages: item.score.pages })}
                  onRemove={item.itemIndex != null ? () => onRemoveFromPlaylist(activePlaylist, item.itemIndex) : null}
                  t={t}
                  viewMode={viewMode}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={s.empty}>
            <div className={s.emptyIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#3C4860"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,8L14,2M18,20H6V4H13V9H18V20Z" /></svg>
            </div>
            <div className={s.emptyTitle}>{inPlaylist ? t('library.emptyPlaylist') : t('library.emptyTitle')}</div>
            <div className={s.emptyText}>
              {inPlaylist ? t('library.emptyPlaylistText') : t('library.emptyText')}
            </div>
            {!inPlaylist && (
              <button className={s.emptyBtn} onClick={() => fileRef.current?.click()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M11,15V12H9V15H6V17H9V20H11V17H14V15H11Z" /></svg>
                {t('library.import')}
              </button>
            )}
          </div>
        )}
      </div>

      {modal?.type === 'playlist' && (
        <Modal
          title={t('library.newPlaylist')}
          onClose={() => setModal(null)}
          onConfirm={(text) => { if (text.trim()) { onCreatePlaylist(text.trim()); setModal(null) } }}
          placeholder={t('library.playlistName')}
        />
      )}

      {modal?.type === 'add' && (
        <AddToPlaylistModal
          playlists={playlists}
          scoreId={modal.scoreId}
          totalPages={modal.totalPages || 1}
          onAdd={(plId, from, to) => {
            onAddToPlaylist(plId, modal.scoreId, from || undefined, to || undefined)
          }}
          onDone={() => setModal(null)}
          onCreatePlaylist={onCreatePlaylist}
          onClose={() => setModal(null)}
          t={t}
        />
      )}

      {modal?.type === 'bulk' && (
        <BulkAddModal
          scores={scores}
          onAdd={(ids) => { ids.forEach(id => onAddToPlaylist(activePlaylist, id)) }}
          onClose={() => setModal(null)}
          t={t}
        />
      )}

      {showOnboarding && (
        <Onboarding
          onDismiss={dismissOnboarding}
          onImport={() => { dismissOnboarding(); fileRef.current?.click() }}
        />
      )}
    </div>
  )
}

function AddToPlaylistModal({ playlists, scoreId, totalPages, onAdd, onDone, onCreatePlaylist, onClose, t }) {
  const [selectedPls, setSelectedPls] = useState(new Set())
  const [fromPage, setFromPage] = useState('')
  const [toPage, setToPage] = useState('')
  const [newName, setNewName] = useState('')
  const hasRange = totalPages > 1

  const toggle = (id) => {
    setSelectedPls(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    onCreatePlaylist(name)
    setNewName('')
  }

  return (
    <div className={s.modalBackdrop} onClick={onClose}>
      <div className={s.modalPanel} onClick={e => e.stopPropagation()}>
        <div className={s.modalTitle}>{t('library.addToPlaylist')}</div>

        <div className={s.modalList}>
          {playlists.length === 0 && (
            <div className={s.modalEmpty}>{t('library.noPlaylists')}</div>
          )}
          {playlists.map(p => (
            <label key={p.id} className={s.checkboxLabel}>
              <input
                type="checkbox"
                checked={selectedPls.has(p.id)}
                onChange={() => toggle(p.id)}
              />
              {p.name}
              {p.items.some(item => (item.scoreId || item) === scoreId) ? ' ✓' : ''}
            </label>
          ))}
        </div>

        <div className={s.createInlineRow}>
          <input
            className={s.createInlineInput}
            type="text"
            placeholder={t('library.playlistName')}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          />
          <button className={s.createInlineBtn} disabled={!newName.trim()} onClick={handleCreate}>
            +
          </button>
        </div>

        {hasRange && selectedPls.size > 0 && (
          <div className={s.pageRangeRow}>
            <span className={s.pageRangeLabel}>{t('library.fromPage')}</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              placeholder="1"
              className={s.pageRangeInput}
              value={fromPage}
              onChange={e => setFromPage(e.target.value)}
            />
            <span className={s.pageRangeLabel}>{t('library.toPage')}</span>
            <input
              type="number"
              min={fromPage || 1}
              max={totalPages}
              placeholder={String(totalPages)}
              className={s.pageRangeInput}
              value={toPage}
              onChange={e => setToPage(e.target.value)}
            />
          </div>
        )}

        <div className={s.modalFooter}>
          <button className={s.modalCancelBtn} onClick={onClose}>{t('modal.cancel')}</button>
          <button
            className={s.modalSaveBtn}
            disabled={selectedPls.size === 0}
            onClick={() => {
              if (selectedPls.size === 0) return
              const from = fromPage ? Math.max(1, Math.min(totalPages, +fromPage)) : null
              const to = toPage ? Math.max(from || 1, Math.min(totalPages, +toPage)) : null
              for (const plId of selectedPls) onAdd(plId, from, to)
              onDone()
            }}
          >
            {t('library.add')} {selectedPls.size > 0 ? `(${selectedPls.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

function BulkAddModal({ scores, onAdd, onClose, t }) {
  const [selected, setSelected] = useState(new Set())
  const [query, setQuery] = useState('')

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = scores.filter(sc => sc.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className={s.modalBackdrop} onClick={onClose}>
      <div className={s.modalPanel} onClick={e => e.stopPropagation()}>
        <div className={s.modalTitle}>{t('library.bulkAdd')}</div>
        <input
          className={s.createInlineInput}
          type="text"
          placeholder={t('library.search')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ marginBottom: 10, width: '100%' }}
        />
        <div className={s.bulkList}>
          {filtered.map(sc => (
            <label key={sc.id} className={s.checkboxLabel}>
              <input
                type="checkbox"
                checked={selected.has(sc.id)}
                onChange={() => toggle(sc.id)}
              />
              {sc.name}
            </label>
          ))}
        </div>
        <div className={s.modalFooter}>
          <button className={s.modalCancelBtn} onClick={onClose}>{t('modal.cancel')}</button>
          <button
            className={s.modalSaveBtn}
            disabled={selected.size === 0}
            onClick={() => { onAdd([...selected]); onClose() }}
          >
            {t('library.add')} ({selected.size})
          </button>
        </div>
      </div>
    </div>
  )
}
