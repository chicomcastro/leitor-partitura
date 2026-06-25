import { useRef } from 'react'
import { useI18n } from '../lib/i18n'
import { buildShareSummary, drawShareCard, shareOrDownloadCard } from '../lib/shareCard'
import { formatDuration, totalMs } from '../lib/stats'
import s from './MilestoneModal.module.css'

// Celebratory modal shown when a practice milestone is first reached, with a
// one-tap shareable card. See ADR 021.
export default function MilestoneModal({ milestone, stats, scores, onClose }) {
  const { t } = useI18n()
  const cardRef = useRef(null)

  const unit = milestone.kind === 'streak' ? t('milestone.streakUnit') : t('milestone.hoursUnit')
  const headline = milestone.kind === 'streak'
    ? `${milestone.value} ${unit}`
    : `${milestone.value}h ${unit}`

  const handleShare = async () => {
    const summary = buildShareSummary(stats, scores, new Date())
    summary.badge = `${milestone.emoji} ${headline}`
    const canvas = cardRef.current || document.createElement('canvas')
    drawShareCard(canvas, summary, {
      heroLabel: t('stats.heroLabel'),
      weekLabel: t('stats.week'),
      daysLabel: t('stats.days'),
      topPieceLabel: t('stats.topPiece'),
      topComposerLabel: t('stats.topComposer'),
    })
    await shareOrDownloadCard(canvas, 'tapscore-conquista.png')
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.panel} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={s.emoji}>{milestone.emoji}</div>
        <div className={s.label}>{t('milestone.title')}</div>
        <div className={s.headline}>{headline}</div>
        <div className={s.sub}>{t('stats.heroLabel')}: <strong>{formatDuration(totalMs(stats))}</strong></div>
        <div className={s.actions}>
          <button className={s.ghost} onClick={onClose}>{t('milestone.keepGoing')}</button>
          <button className={s.primary} onClick={handleShare}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19C20.92,17.39 19.61,16.08 18,16.08Z" /></svg>
          {t('stats.share')}
          </button>
        </div>
        <canvas ref={cardRef} style={{ display: 'none' }} />
      </div>
    </div>
  )
}
