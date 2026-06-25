// Builds and renders the shareable "practice card" — a square, branded image
// generated entirely on-device (Canvas) and shared via the Web Share API with a
// download fallback. See docs/adr/020-practice-stats.md.
import {
  totalMs, rangeMsDays, currentStreak, topScores, topComposers, formatDuration,
} from './stats'

// Pure summary used by the card and easy to unit test.
export function buildShareSummary(stats, scores, now) {
  const top = topScores(stats, scores, 1)[0]
  const comp = topComposers(stats, scores, 1)[0]
  return {
    total: totalMs(stats),
    week: rangeMsDays(stats, now, 7),
    streak: currentStreak(stats, now),
    topPiece: top?.score?.name || null,
    topComposer: comp?.composer || null,
    totalLabel: formatDuration(totalMs(stats)),
    weekLabel: formatDuration(rangeMsDays(stats, now, 7)),
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Draws the TapScore tile mark (red square + staff lines + note) at (x,y,size).
function drawMark(ctx, x, y, size) {
  const s = size / 512
  const grad = ctx.createLinearGradient(x, y, x + size, y + size)
  grad.addColorStop(0, '#F2495A')
  grad.addColorStop(1, '#D63344')
  ctx.fillStyle = grad
  roundRect(ctx, x, y, size, size, 116 * s)
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 28 * s
  ctx.lineCap = 'round'
  const line = (x1, y1, x2) => { ctx.beginPath(); ctx.moveTo(x + x1 * s, y + y1 * s); ctx.lineTo(x + x2 * s, y + y1 * s); ctx.stroke() }
  line(156, 158, 356); line(156, 226, 356); line(156, 294, 300); line(156, 362, 356)
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(x + 338 * s, y + 300 * s, 40 * s, 0, Math.PI * 2); ctx.fill()
}

// Renders the card onto a 1080x1080 canvas and returns it. `labels` are the
// localized strings; `summary` comes from buildShareSummary.
export function drawShareCard(canvas, summary, labels) {
  const W = 1080, H = 1080
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#161C2A')
  bg.addColorStop(1, '#0A0E16')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const font = (w, px) => `${w} ${px}px Montserrat, system-ui, -apple-system, sans-serif`

  // brand row
  drawMark(ctx, 96, 96, 108)
  ctx.fillStyle = '#fff'
  ctx.font = font(700, 52)
  ctx.textBaseline = 'middle'
  ctx.fillText('TapScore', 228, 152)

  // hero: practice time
  ctx.fillStyle = '#8A93A6'
  ctx.font = font(600, 34)
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(labels.heroLabel, 96, 380)
  ctx.fillStyle = '#fff'
  ctx.font = font(700, 150)
  ctx.fillText(summary.totalLabel, 92, 520)

  // secondary row: week + streak
  let y = 660
  ctx.font = font(600, 40)
  ctx.fillStyle = '#E73B4C'
  ctx.fillText(`${labels.weekLabel}: `, 96, y)
  const ww = ctx.measureText(`${labels.weekLabel}: `).width
  ctx.fillStyle = '#fff'
  ctx.fillText(summary.weekLabel, 96 + ww, y)
  if (summary.streak > 0) {
    ctx.fillStyle = '#F5B301'
    ctx.fillText(`🔥 ${summary.streak} ${labels.daysLabel}`, 620, y)
  }

  // top piece / composer
  y = 760
  ctx.font = font(600, 36)
  if (summary.topPiece) {
    ctx.fillStyle = '#8A93A6'; ctx.fillText(labels.topPieceLabel, 96, y)
    ctx.fillStyle = '#fff'; ctx.font = font(700, 44)
    ctx.fillText(truncate(ctx, summary.topPiece, W - 192), 96, y + 56)
  }
  if (summary.topComposer) {
    y += 140
    ctx.font = font(600, 36); ctx.fillStyle = '#8A93A6'; ctx.fillText(labels.topComposerLabel, 96, y)
    ctx.fillStyle = '#fff'; ctx.font = font(700, 44)
    ctx.fillText(truncate(ctx, summary.topComposer, W - 192), 96, y + 56)
  }

  // watermark
  ctx.fillStyle = '#5A6478'
  ctx.font = font(500, 30)
  ctx.fillText('chicomcastro.github.io/leitor-partitura', 96, H - 72)
  return canvas
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}

// Generates the PNG and shares it (Web Share API) or downloads it as a fallback.
export async function shareOrDownloadCard(canvas, filename = 'tapscore.png') {
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
  if (!blob) return
  try {
    const file = new File([blob], filename, { type: 'image/png' })
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'TapScore' })
      return
    }
  } catch (e) {
    if (e.name === 'AbortError') return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
