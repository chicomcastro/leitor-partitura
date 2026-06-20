import { useRef, useEffect, useCallback, useState } from 'react'
import { idbGet } from '../lib/db'
import { getPdfDoc } from '../lib/pdf'
import Modal from '../components/Modal'
import s from './Library.module.css'

function ScoreCard({ score, inPlaylist, onOpen, onDelete, onAddOpen, onRemove }) {
  const canvasRef = useRef(null)
  const drawnRef = useRef(null)

  useEffect(() => {
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
  }, [score.id])

  return (
    <div className={s.card}>
      <div className={s.cardThumb} onClick={() => onOpen(score.id)}>
        <div className={s.thumbWrap}>
          <canvas ref={canvasRef} className={s.thumbCanvas} />
        </div>
        <div className={s.cardName}>{score.name}</div>
        <div className={s.cardPages}>{score.pages} {score.pages === 1 ? 'página' : 'páginas'}</div>
      </div>
      <div className={s.cardActions}>
        <button className={s.iconBtnPlaylist} onClick={(e) => { e.stopPropagation(); onAddOpen(score.id) }} title="Adicionar à playlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2,16H10V18H2V16M2,11H14V13H2V11M2,6H14V8H2V6M16,11V14H13V16H16V19H18V16H21V14H18V11H16Z" /></svg>
        </button>
        {inPlaylist && (
          <button className={s.iconBtnRemove} onClick={(e) => { e.stopPropagation(); onRemove(score.id) }} title="Remover da playlist">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19,13H5V11H19V13Z" /></svg>
          </button>
        )}
        <button className={s.iconBtnDelete} onClick={(e) => { e.stopPropagation(); onDelete(score.id) }} title="Excluir">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>
        </button>
      </div>
    </div>
  )
}

export default function Library({
  scores, playlists, activePlaylist, setActivePlaylist,
  onOpenScore, onImport, onDelete, onCreatePlaylist, onAddToPlaylist, onRemoveFromPlaylist,
}) {
  const fileRef = useRef(null)
  const [modal, setModal] = useState(null)

  const inPlaylist = activePlaylist != null
  const activePl = playlists.find(p => p.id === activePlaylist)
  const visibleIds = inPlaylist
    ? (activePl ? activePl.items.filter(id => scores.some(s => s.id === id)) : [])
    : scores.map(s => s.id)
  const visibleScores = visibleIds.map(id => scores.find(s => s.id === id)).filter(Boolean)

  const handleFiles = useCallback(async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length) onImport(files)
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
          <button className={s.btnSecondary} onClick={() => setModal({ type: 'playlist' })}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2,16H10V18H2V16M2,11H14V13H2V11M2,6H14V8H2V6M16,11V14H13V16H16V19H18V16H21V14H18V11H16Z" /></svg>
            Nova playlist
          </button>
          <button className={s.btnPrimary} onClick={() => fileRef.current?.click()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M11,15V12H9V15H6V17H9V20H11V17H14V15H11Z" /></svg>
            Importar PDF
          </button>
          <input type="file" accept="application/pdf" multiple ref={fileRef} onChange={handleFiles} style={{ display: 'none' }} />
        </div>
      </div>

      <div className={s.tabs}>
        {tabs.map(t => (
          <button
            key={t.id ?? '__all'}
            className={`${s.tab} ${activePlaylist === t.id ? s.tabActive : s.tabInactive}`}
            onClick={() => setActivePlaylist(t.id)}
          >
            {t.name} &middot; {t.count}
          </button>
        ))}
      </div>

      <div className={s.content}>
        {visibleScores.length > 0 ? (
          <div className={s.grid}>
            {visibleScores.map(score => (
              <ScoreCard
                key={score.id}
                score={score}
                inPlaylist={inPlaylist}
                onOpen={onOpenScore}
                onDelete={onDelete}
                onAddOpen={(id) => setModal({ type: 'add', scoreId: id })}
                onRemove={(id) => onRemoveFromPlaylist(activePlaylist, id)}
              />
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
                : 'Importe os PDFs das suas partituras. Eles ficam salvos neste dispositivo, prontos para o ensaio.'}
            </div>
            {!inPlaylist && (
              <button className={s.emptyBtn} onClick={() => fileRef.current?.click()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M11,15V12H9V15H6V17H9V20H11V17H14V15H11Z" /></svg>
                Importar PDF
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
    </div>
  )
}
