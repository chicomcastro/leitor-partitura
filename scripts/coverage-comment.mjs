// Builds a Markdown coverage report for the sticky PR comment.
// Reads coverage/coverage-summary.json (current) and, when present,
// base-coverage/coverage-summary.json (latest main) to show the delta.
//
// Writes coverage-comment.md and, if running in CI, appends to the job summary.
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'

const MARKER = '<!-- coverage-report -->'
const CURRENT = 'coverage/coverage-summary.json'
const BASE = 'base-coverage/coverage-summary.json'

function readTotal(path) {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')).total
  } catch {
    return null
  }
}

const cur = readTotal(CURRENT)
if (!cur) {
  console.error(`No coverage summary found at ${CURRENT}`)
  process.exit(1)
}
const base = readTotal(BASE)

const METRICS = [
  ['Linhas', 'lines'],
  ['Statements', 'statements'],
  ['Funções', 'functions'],
  ['Branches', 'branches'],
]

function fmtDelta(curPct, basePct) {
  if (basePct == null) return '—'
  const d = curPct - basePct
  if (Math.abs(d) < 0.005) return '→ 0.00%'
  const arrow = d > 0 ? '🟢 +' : '🔴 '
  return `${arrow}${d.toFixed(2)}%`
}

const rows = METRICS.map(([label, key]) => {
  const m = cur[key]
  const b = base?.[key]
  return `| ${label} | ${m.pct.toFixed(2)}% (${m.covered}/${m.total}) | ${fmtDelta(m.pct, b?.pct)} |`
}).join('\n')

const baseNote = base
  ? '<sub>Δ comparado à branch `main`. Comentário atualizado a cada push.</sub>'
  : '<sub>Sem base em `main` ainda — o Δ aparece a partir do próximo merge. Atualizado a cada push.</sub>'

const body = `${MARKER}
## 🧪 Cobertura de testes

| Métrica | Cobertura | Δ vs base |
|---------|-----------|-----------|
${rows}

${baseNote}
`

writeFileSync('coverage-comment.md', body)
console.log(body)

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, body)
}
