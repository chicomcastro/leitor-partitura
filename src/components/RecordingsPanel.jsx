import { useI18n } from '../lib/i18n'
import s from '../screens/Reader.module.css'

const CLOSE_ICON = 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'

function fmtDur(sec) {
  sec = sec || 0
  const m = Math.floor(sec / 60)
  const ss = sec % 60
  return m + ':' + (ss < 10 ? '0' : '') + ss
}

export default function RecordingsPanel({ recordings, playingId, onPlay, onDownload, onDelete, onClose }) {
  const { t, locale } = useI18n()

  return (
    <div className={s.panelBackdrop} onClick={onClose}>
      <div className={s.panelWide} onClick={e => e.stopPropagation()}>
        <div className={s.panelHeader}>
          <div className={s.panelTitle}>{t('recordings.title')}</div>
          <button className={s.panelClose} onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d={CLOSE_ICON} /></svg>
          </button>
        </div>

        {recordings.length > 0 ? (
          recordings.map(rec => (
            <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', background: 'var(--surface-hover)', borderRadius: 11, marginBottom: 9 }}>
              <button
                onClick={() => onPlay(rec)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer', flex: 'none',
                  ...(playingId === rec.id
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { background: 'var(--border-light)', color: 'var(--text-bright)' }),
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d={playingId === rec.id ? 'M14,19H18V5H14M6,19H10V5H6V19Z' : 'M8,5.14V19.14L19,12.14L8,5.14Z'} />
                </svg>
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                  {new Date(rec.createdAt).toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {fmtDur(rec.dur)}
                </div>
              </div>
              <button onClick={() => onDownload(rec)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: 6 }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" /></svg>
              </button>
              <button onClick={() => onDelete(rec)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 6 }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>
              </button>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.5 }}>
            {t('recordings.empty')}<br />{t('recordings.emptyHint')}
          </div>
        )}
      </div>
    </div>
  )
}
