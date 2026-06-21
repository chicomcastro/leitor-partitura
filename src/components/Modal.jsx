import { useState, useEffect, useRef } from 'react'
import { useI18n } from '../lib/i18n'
import s from './Modal.module.css'

export default function Modal({ title, onClose, onConfirm, placeholder, initialValue, list, onSelect, emptyText, markerMode, totalPages }) {
  const { t } = useI18n()
  const [text, setText] = useState(initialValue || '')
  const [page, setPage] = useState(markerMode?.currentPage || 1)
  const panelRef = useRef(null)

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const focusable = panel.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])')
    if (focusable) focusable.focus()
  }, [])

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.panel} ref={panelRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className={s.title} id="modal-title">{title}</div>

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
              <button className={s.btnCancel} onClick={onClose}>{t('modal.cancel')}</button>
              <button className={s.btnSave} onClick={() => onConfirm(text)}>{t('modal.save')}</button>
            </div>
          </>
        )}

        {markerMode && (
          <>
            <input
              className={s.input}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={t('reader.markerName')}
              autoFocus
            />
            <div className={s.row}>
              <span className={s.label}>{t('reader.jumpToPage')}</span>
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
              <button className={s.btnCancel} onClick={onClose}>{t('modal.cancel')}</button>
              <button className={s.btnSave} onClick={() => {
                const p = Math.max(1, Math.min(totalPages || 999, +page || 1))
                onConfirm(text.trim() || (t('reader.markerDefaultName') + ' ' + p), p)
              }}>{t('modal.save')}</button>
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
