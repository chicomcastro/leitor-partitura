import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useI18n } from './i18n'
import s from '../components/Toast.module.css'

// App-level UI affordances that should feel native rather than relying on the
// browser's blocking confirm()/alert(): transient toasts and a promise-based
// confirmation dialog. See docs/adr/014-toasts-and-confirm-dialog.md.
const UIContext = createContext(null)

let counter = 0

export function UIProvider({ children }) {
  const { t } = useI18n()
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts(list => list.filter(x => x.id !== id))
    if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id] }
  }, [])

  const toast = useCallback((message, opts = {}) => {
    const id = ++counter
    setToasts(list => [...list, { id, message, type: opts.type || 'info' }])
    timers.current[id] = setTimeout(() => dismiss(id), opts.duration || 3200)
    return id
  }, [dismiss])

  // Returns a promise that resolves true (confirmed) or false (cancelled).
  const confirm = useCallback((opts = {}) => new Promise(resolve => {
    setConfirmState({ ...opts, resolve })
  }), [])

  const closeConfirm = useCallback((result) => {
    setConfirmState(cs => { cs?.resolve(result); return null })
  }, [])

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      <div className={s.toastHost} role="status" aria-live="polite">
        {toasts.map(tt => (
          <button key={tt.id} className={`${s.toast} ${s['toast_' + tt.type] || ''}`} onClick={() => dismiss(tt.id)}>
            {tt.message}
          </button>
        ))}
      </div>

      {confirmState && (
        <div className={s.confirmBackdrop} onClick={() => closeConfirm(false)}>
          <div className={s.confirmPanel} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            {confirmState.title && <div className={s.confirmTitle}>{confirmState.title}</div>}
            {confirmState.message && <div className={s.confirmMessage}>{confirmState.message}</div>}
            <div className={s.confirmFooter}>
              <button className={s.confirmCancel} onClick={() => closeConfirm(false)} autoFocus>
                {confirmState.cancelLabel || t('modal.cancel')}
              </button>
              <button
                className={`${s.confirmOk} ${confirmState.danger ? s.confirmDanger : ''}`}
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmLabel || t('modal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(UIContext)
  return ctx ? ctx.toast : () => {}
}

export function useConfirm() {
  const ctx = useContext(UIContext)
  // Fallback to the native confirm if used outside the provider (e.g. tests).
  return ctx ? ctx.confirm : (opts = {}) => Promise.resolve(window.confirm(opts.message || opts.title || ''))
}
