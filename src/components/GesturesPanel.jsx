import s from '../screens/Reader.module.css'

const CLOSE_ICON = 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'

const GESTURE_DEFS = [
  { key: 'tapLeft', label: 'Toque esquerda', icon: 'M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z' },
  { key: 'tapRight', label: 'Toque direita', icon: 'M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z' },
  { key: 'swipeLeft', label: 'Deslizar ←', icon: 'M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z' },
  { key: 'swipeRight', label: 'Deslizar →', icon: 'M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z' },
]

const ACTIONS = [
  { value: 'next', label: 'Próxima página' },
  { value: 'prev', label: 'Página anterior' },
  { value: 'autoscroll', label: 'Liga/desliga autoscroll' },
  { value: 'metro', label: 'Liga/desliga metrônomo' },
  { value: 'record', label: 'Inicia/para gravação' },
  { value: 'back', label: 'Voltar do salto' },
  { value: 'none', label: 'Nada' },
]

export default function GesturesPanel({ gestures, onChange, onClose }) {
  return (
    <div className={s.panelBackdrop} onClick={onClose}>
      <div className={s.panelWide} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div className={s.panelTitle}>Gestos</div>
          <button className={s.panelClose} onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d={CLOSE_ICON} /></svg>
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 18 }}>
          Programe o que cada gesto faz. O toque no centro da tela mostra/esconde os controles.
        </div>

        {GESTURE_DEFS.map(g => (
          <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, width: 150, flex: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={g.icon} /></svg>
              </div>
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{g.label}</span>
            </div>
            <select
              value={gestures[g.key] || 'none'}
              onChange={e => onChange({ ...gestures, [g.key]: e.target.value })}
              style={{ flex: 1, background: 'var(--surface-hover)', border: '1px solid var(--border-light)', color: 'var(--text-bright)', padding: '9px 10px', borderRadius: 9, fontSize: 13, fontWeight: 600 }}
            >
              {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        ))}

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <div style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6 }}>Teclado / pedal</div>
          → próxima · ← anterior · espaço autoscroll · M metrônomo · R gravar · Esc fecha
        </div>
      </div>
    </div>
  )
}
