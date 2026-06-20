import { useRef, useEffect, useCallback, useState } from 'react'
import { idbGet } from '../lib/db'
import { getPdfDoc } from '../lib/pdf'
import { exportBackup, importBackup } from '../lib/backup'
import Modal from '../components/Modal'
import Onboarding from '../components/Onboarding'
import s from './Library.module.css'

function ScoreCard({ score, inPlaylist, onOpen, onDelete, onAddOpen, onRemove }) {
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

  return (
    <div className={s.card}>
      <div className={s.cardThumb} onClick={() => onOpen(score.id)}>
        <div className={s.thumbWrap}>
          {score.type === 'image'
            ? <img src={imgUrl} className={s.thumbCanvas} alt={score.name} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
            : <canvas ref={canvasRef} className={s.thumbCanvas} />
          }
        </div>
        <div className={s.cardName}>{score.name}</div>
        <div className={s.cardPages}>{score.pages} {score.pages === 1 ? 'página' : 'páginas'}</div>
      </div>
      <div className={s.cardActions}>
        <button className={s.iconBtnPlaylist} onClick={(e) => { e.stopPropagation(); onAddOpen(score.id) }} title="Adicionar à playlist" aria-label="Adicionar à playlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2,16H10V18H2V16M2,11H14V13H2V11M2,6H14V8H2V6M16,11V14H13V16H16V19H18V16H21V14H18V11H16Z" /></svg>
        </button>
        {inPlaylist && (
          <button className={s.iconBtnRemove} onClick={(e) => { e.stopPropagation(); onRemove(score.id) }} title="Remover da playlist" aria-label="Remover da playlist">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19,13H5V11H19V13Z" /></svg>
          </button>
        )}
        <button className={s.iconBtnDelete} onClick={(e) => { e.stopPropagation(); onDelete(score.id) }} title="Excluir" aria-label={`Excluir ${score.name}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>
        </button>
      </div>
    </div>
  )
}

export default function Library({
  scores, playlists, activePlaylist, setActivePlaylist,
  onOpenScore, onImport, onDelete, onCreatePlaylist, onAddToPlaylist, onRemoveFromPlaylist,
  onReorderPlaylist,
}) {
  const fileRef = useRef(null)
  const [modal, setModal] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [onboardingSeen, setOnboardingSeen] = useState(() => localStorage.getItem('sp.onboarding') === '1')
  const dragRef = useRef(null)

  const showOnboarding = scores.length === 0 && !onboardingSeen
  const dismissOnboarding = useCallback(() => {
    localStorage.setItem('sp.onboarding', '1')
    setOnboardingSeen(true)
  }, [])

  const inPlaylist = activePlaylist != null
  const activePl = playlists.find(p => p.id === activePlaylist)
  const visibleIds = inPlaylist
    ? (activePl ? activePl.items.filter(id => scores.some(s => s.id === id)) : [])
    : scores.map(s => s.id)
  const visibleScores = visibleIds
    .map(id => scores.find(s => s.id === id))
    .filter(Boolean)
    .filter(score => score.name.toLowerCase().includes(searchQuery.toLowerCase()))

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
      alert('Erro ao exportar backup.')
    }
  }, [])

  const handleFiles = useCallback(async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    const estanteFile = files.find(f => f.name.endsWith('.estante'))
    if (estanteFile) {
      try {
        await importBackup(estanteFile)
        window.location.reload()
      } catch (err) {
        console.error('backup import failed', err)
        alert('Erro ao importar backup.')
      }
      return
    }
    onImport(files)
  }, [onImport])

  const tabs = [
    { id: null, name: 'Todas as partituras', count: scores.length },
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
            <div className={s.brandTitle}>Estante</div>
            <div className={s.brandSub}>Leitor de partituras</div>
          </div>
        </div>
        <div className={s.actions}>
          <button className={s.btnSecondary} onClick={handleBackup}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" /></svg>
            Backup
          </button>
          <button className={s.btnSecondary} onClick={() => setModal({ type: 'playlist' })}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2,16H10V18H2V16M2,11H14V13H2V11M2,6H14V8H2V6M16,11V14H13V16H16V19H18V16H21V14H18V11H16Z" /></svg>
            Nova playlist
          </button>
          <button className={s.btnPrimary} onClick={() => fileRef.current?.click()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M11,15V12H9V15H6V17H9V20H11V17H14V15H11Z" /></svg>
            Importar
          </button>
          <input type="file" accept="application/pdf,image/*,.estante" multiple ref={fileRef} onChange={handleFiles} style={{ display: 'none' }} />
        </div>
      </div>

      <div className={s.tabs} role="tablist" aria-label="Filtrar por playlist">
        {tabs.map(t => (
          <button
            key={t.id ?? '__all'}
            className={`${s.tab} ${activePlaylist === t.id ? s.tabActive : s.tabInactive}`}
            onClick={() => setActivePlaylist(t.id)}
            role="tab"
            aria-selected={activePlaylist === t.id}
          >
            {t.name} &middot; {t.count}
          </button>
        ))}
      </div>

      <div className={s.content} role="main">
        <div className={s.searchWrap}>
          <div style={{ position: 'relative', flex: 1 }}>
            <svg className={s.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
            </svg>
            <input
              className={s.searchInput}
              type="text"
              placeholder="Buscar partitura..."
              aria-label="Buscar partitura"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchQuery && (
            <button className={s.searchClear} onClick={() => setSearchQuery('')} title="Limpar busca" aria-label="Limpar busca">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
              </svg>
            </button>
          )}
        </div>

        {visibleScores.length > 0 ? (
          <div className={s.grid} role="list" aria-label="Partituras">
            {visibleScores.map((score, idx) => (
              <div
                key={score.id}
                role="listitem"
                draggable={inPlaylist}
                onDragStart={() => { dragRef.current = idx }}
                onDragOver={(e) => { if (inPlaylist) e.preventDefault() }}
                onDrop={() => {
                  if (inPlaylist && dragRef.current !== null && dragRef.current !== idx) {
                    onReorderPlaylist(activePlaylist, dragRef.current, idx)
                  }
                  dragRef.current = null
                }}
                onDragEnd={() => { dragRef.current = null }}
                style={inPlaylist ? { cursor: 'grab' } : undefined}
              >
                <ScoreCard
                  score={score}
                  inPlaylist={inPlaylist}
                  onOpen={onOpenScore}
                  onDelete={onDelete}
                  onAddOpen={(id) => setModal({ type: 'add', scoreId: id })}
                  onRemove={(id) => onRemoveFromPlaylist(activePlaylist, id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={s.empty}>
            <div className={s.emptyIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#3C4860"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,8L14,2M18,20H6V4H13V9H18V20Z" /></svg>
            </div>
            <div className={s.emptyTitle}>{inPlaylist ? 'Playlist vazia' : 'Sua estante está vazia'}</div>
            <div className={s.emptyText}>
              {inPlaylist
                ? 'Adicione partituras a esta playlist pela aba "Todas as partituras".'
                : 'Importe PDFs ou imagens das suas partituras. Eles ficam salvos neste dispositivo, prontos para o ensaio.'}
            </div>
            {!inPlaylist && (
              <button className={s.emptyBtn} onClick={() => fileRef.current?.click()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M11,15V12H9V15H6V17H9V20H11V17H14V15H11Z" /></svg>
                Importar
              </button>
            )}
          </div>
        )}
      </div>

      {modal?.type === 'playlist' && (
        <Modal
          title="Nova playlist"
          onClose={() => setModal(null)}
          onConfirm={(text) => { if (text.trim()) { onCreatePlaylist(text.trim()); setModal(null) } }}
          placeholder="Nome da playlist"
        />
      )}

      {modal?.type === 'add' && (
        <Modal
          title="Adicionar à playlist"
          onClose={() => setModal(null)}
          list={playlists.map(p => ({
            id: p.id,
            label: p.name,
            active: p.items.includes(modal.scoreId),
          }))}
          onSelect={(plId) => { onAddToPlaylist(plId, modal.scoreId) }}
          emptyText="Você ainda não tem playlists. Crie uma na tela inicial primeiro."
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
