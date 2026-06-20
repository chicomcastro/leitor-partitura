import s from '../screens/Reader.module.css'

const CLOSE_ICON = 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'

export default function MetronomePanel({
  bpm, setBpm, beats, setBeats, accent, toggleAccent,
  tapTempo, running, currentBeat, toggle, onClose,
}) {
  const metroBeats = Array.from({ length: beats }, (_, i) => {
    const active = running && i === currentBeat
    const isAcc = i === 0 && accent
    const sz = active ? 16 : 10
    const col = active ? (isAcc ? 'var(--accent)' : '#fff') : 'var(--border-light)'
    return { sz, col }
  })

  return (
    <div className={s.panelBackdrop} onClick={onClose}>
      <div className={s.panel} onClick={e => e.stopPropagation()}>
        <div className={s.panelHeader}>
          <div className={s.panelTitle}>Metrônomo</div>
          <button className={s.panelClose} onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d={CLOSE_ICON} /></svg>
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{bpm}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1, marginTop: 2 }}>BPM</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '18px 0' }}>
          {metroBeats.map((b, i) => (
            <div key={i} style={{ width: b.sz, height: b.sz, borderRadius: '50%', background: b.col, transition: 'all .08s' }} />
          ))}
        </div>

        <input type="range" min="40" max="240" step="1" value={bpm} onChange={e => setBpm(+e.target.value)} style={{ width: '100%', marginBottom: 18 }} />

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={tapTempo} style={{ flex: 1, background: 'var(--surface-hover)', border: '1px solid var(--border-light)', color: 'var(--text)', padding: 11, borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Tap tempo
          </button>
          <button onClick={toggleAccent} style={{
            flex: 1, borderRadius: 'var(--radius-md)', padding: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: '1px solid var(--border-light)',
            ...(accent
              ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
              : { background: 'var(--surface-hover)', color: 'var(--text)' }),
          }}>
            Acento
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Compasso</span>
          <select value={beats} onChange={e => setBeats(+e.target.value)} style={{
            flex: 1, background: 'var(--surface-hover)', border: '1px solid var(--border-light)',
            color: 'var(--text-bright)', padding: '9px 10px', borderRadius: 9, fontSize: 13, fontWeight: 600,
          }}>
            <option value="2">2 / 4</option>
            <option value="3">3 / 4</option>
            <option value="4">4 / 4</option>
            <option value="5">5 / 4</option>
            <option value="6">6 / 8</option>
            <option value="7">7 / 8</option>
            <option value="9">9 / 8</option>
            <option value="12">12 / 8</option>
          </select>
        </div>

        <button onClick={toggle} style={{
          width: '100%', border: 'none', borderRadius: 11, padding: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          ...(running ? { background: 'var(--border-light)', color: '#fff' } : { background: 'var(--accent)', color: '#fff' }),
        }}>
          {running ? 'Parar' : 'Iniciar'}
        </button>
      </div>
    </div>
  )
}
