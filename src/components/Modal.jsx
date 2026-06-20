import { useState } from 'react'
import s from './Modal.module.css'

export default function Modal({ title, onClose, onConfirm, placeholder, list, onSelect, emptyText, markerMode, totalPages }) {
  const [text, setText] = useState('')
  const [page, setPage] = useState(markerMode?.currentPage || 1)

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.panel} onClick={e => e.stopPropagation()}>
        <div className={s.title}>{title}</div>

        {onConfirm && !markerMode && (
          <>
            <input
              className={s.input}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={placeholder}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && onConfirm(text)}
            />
            <div className={s.footer}>
              <button className={s.btnCancel} onClick={onClose}>Cancelar</button>
              <button className={s.btnSave} onClick={() => onConfirm(text)}>Salvar</button>
            </div>
          </>
        )}

        {markerMode && (
          <>
            <input
              className={s.input}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Nome do salto (ex.: Coda, Letra C)"
              autoFocus
            />
            <div className={s.row}>
              <span className={s.label}>Pula para a página</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                className={s.pageInput}
                value={page}
                onChange={e => setPage(e.target.value)}
              />
            </div>
            <div className={s.footer}>
              <button className={s.btnCancel} onClick={onClose}>Cancelar</button>
              <button className={s.btnSave} onClick={() => {
                const p = Math.max(1, Math.min(totalPages || 999, +page || 1))
                onConfirm(text.trim() || ('Pág. ' + p), p)
              }}>Salvar</button>
            </div>
          </>
        )}

        {list && (
          list.length > 0 ? (
            <div className={s.listWrap}>
              {list.map(item => (
                <button
                  key={item.id}
                  className={item.active ? s.listBtnActive : s.listBtn}
                  onClick={() => onSelect(item.id)}
                >
                  {item.label}{item.active ? '  ✓' : ''}
                </button>
              ))}
            </div>
          ) : (
            <div className={s.emptyText}>{emptyText}</div>
          )
        )}
      </div>
    </div>
  )
}
