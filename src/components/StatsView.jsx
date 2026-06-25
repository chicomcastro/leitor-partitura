import { useMemo, useRef } from 'react'
import {
  totalMs, rangeMsDays, currentStreak, activeDays, heatmap, topScores, topComposers, formatDuration,
  todayMs, goalProgress,
} from '../lib/stats'
import { buildShareSummary, drawShareCard, shareOrDownloadCard } from '../lib/shareCard'
import s from './StatsView.module.css'

function heatColor(ms) {
  const min = ms / 60000
  if (min <= 0) return 'var(--surface-hover)'
  if (min < 10) return 'rgba(231,59,76,.35)'
  if (min < 30) return 'rgba(231,59,76,.6)'
  if (min < 60) return 'rgba(231,59,76,.8)'
  return '#E73B4C'
}

const GOAL_OPTIONS = [0, 15, 30, 45, 60]

export default function StatsView({ stats, scores, playlists, recordingsMeta, goalMin = 0, setGoalMin, t }) {
  const cardRef = useRef(null)
  const now = useMemo(() => new Date(), [])
  const todayPracticed = todayMs(stats, now)
  const progress = goalProgress(stats, now, goalMin)
  const goalReached = goalMin > 0 && progress >= 1

  const total = totalMs(stats)
  const week = rangeMsDays(stats, now, 7)
  const streak = currentStreak(stats, now)
  const days = activeDays(stats)
  const cells = heatmap(stats, now, 16)
  const top = topScores(stats, scores, 5)
  const composer = topComposers(stats, scores, 1)[0]
  const recordedMs = (recordingsMeta || []).reduce((sum, r) => sum + (r.dur || 0), 0) * 1000

  // group heatmap cells into week columns (7 rows each)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const maxTop = top[0]?.ms || 1

  const hasData = total > 0

  const handleShare = async () => {
    const summary = buildShareSummary(stats, scores, now)
    const canvas = cardRef.current || document.createElement('canvas')
    drawShareCard(canvas, summary, {
      heroLabel: t('stats.heroLabel'),
      weekLabel: t('stats.week'),
      daysLabel: t('stats.days'),
      topPieceLabel: t('stats.topPiece'),
      topComposerLabel: t('stats.topComposer'),
    })
    await shareOrDownloadCard(canvas, 'tapscore-pratica.png')
  }

  if (!hasData) {
    return (
      <div className={s.empty}>
        <div className={s.emptyIcon}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="#3C4860"><path d="M3,13H7V21H3V13M10,8H14V21H10V8M17,3H21V21H17V3Z" /></svg>
        </div>
        <div className={s.emptyTitle}>{t('stats.emptyTitle')}</div>
        <div className={s.emptyText}>{t('stats.emptyText')}</div>
      </div>
    )
  }

  return (
    <div className={s.root}>
      <div className={s.head}>
        <h2 className={s.title}>{t('stats.title')}</h2>
        <button className={s.shareBtn} onClick={handleShare}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19C20.92,17.39 19.61,16.08 18,16.08Z" /></svg>
          {t('stats.share')}
        </button>
      </div>

      <div className={s.hero}>
        <div className={s.heroLabel}>{t('stats.heroLabel')}</div>
        <div className={s.heroValue}>{formatDuration(total)}</div>
        <div className={s.heroSub}>{t('stats.week')}: <strong>{formatDuration(week)}</strong></div>
      </div>

      <div className={s.goalCard}>
        <div className={s.goalTop}>
          <div className={s.goalLabel}>{t('stats.goal')}</div>
          <div className={s.goalOpts}>
            {GOAL_OPTIONS.map(g => (
              <button
                key={g}
                className={`${s.goalOpt} ${goalMin === g ? s.goalOptActive : ''}`}
                onClick={() => setGoalMin?.(g)}
              >
                {g === 0 ? t('stats.goalOff') : `${g}min`}
              </button>
            ))}
          </div>
        </div>
        {goalMin > 0 && (
          <div className={s.goalProgressRow}>
            <div className={s.goalBarWrap}><div className={s.goalBar} style={{ width: `${progress * 100}%` }} /></div>
            <div className={s.goalText}>
              {goalReached ? t('stats.goalMet') : `${t('stats.today')}: ${formatDuration(todayPracticed)} / ${goalMin}min`}
            </div>
          </div>
        )}
      </div>

      <div className={s.statRow}>
        <div className={s.statCard}><div className={s.statNum}>🔥 {streak}</div><div className={s.statLabel}>{t('stats.streakLabel')}</div></div>
        <div className={s.statCard}><div className={s.statNum}>{days}</div><div className={s.statLabel}>{t('stats.activeDays')}</div></div>
        <div className={s.statCard}><div className={s.statNum}>{scores.length}</div><div className={s.statLabel}>{t('library.allScores')}</div></div>
        <div className={s.statCard}><div className={s.statNum}>{formatDuration(recordedMs)}</div><div className={s.statLabel}>{t('stats.recorded')}</div></div>
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>{t('stats.activity')}</div>
        <div className={s.heatmap}>
          {weeks.map((wk, i) => (
            <div key={i} className={s.heatCol}>
              {wk.map(c => <div key={c.key} className={s.heatCell} style={{ background: heatColor(c.ms) }} title={`${c.key}: ${formatDuration(c.ms)}`} />)}
            </div>
          ))}
        </div>
      </div>

      {top.length > 0 && (
        <div className={s.section}>
          <div className={s.sectionTitle}>{t('stats.topPieces')}</div>
          <div className={s.topList}>
            {top.map(item => (
              <div key={item.id} className={s.topRow}>
                <div className={s.topName}>{item.score.name}</div>
                <div className={s.topBarWrap}><div className={s.topBar} style={{ width: `${Math.max(6, (item.ms / maxTop) * 100)}%` }} /></div>
                <div className={s.topVal}>{formatDuration(item.ms)}</div>
              </div>
            ))}
          </div>
          {composer && <div className={s.composer}>{t('stats.topComposer')}: <strong>{composer.composer}</strong></div>}
        </div>
      )}

      <canvas ref={cardRef} style={{ display: 'none' }} />
    </div>
  )
}
