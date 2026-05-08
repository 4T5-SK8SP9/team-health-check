import { useState } from 'react'
import { CATEGORIES, ALL_QUESTIONS } from './questions.js'
import { getFinalScore } from './firebaseHelpers.js'

function computeCategoryScores(session) {
  const results = {}
  CATEGORIES.forEach(cat => {
    const scores = cat.questions.map(q => {
      const qIdx = ALL_QUESTIONS.findIndex(aq => aq.id === q.id)
      return getFinalScore(session, qIdx)
    }).filter(s => s !== null)
    results[cat.id] = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  })
  return results
}

function ScoreBar({ value, color, showLabel = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 7, background: '#E5E5E5', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${(value / 5) * 100}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      {showLabel && <span style={{ fontSize: 14, fontWeight: 500, minWidth: 28 }}>{value.toFixed(1)}</span>}
    </div>
  )
}

export default function Results({ sessionData, go }) {
  const session = sessionData?.finalSession
  const [showAllVotes, setShowAllVotes] = useState(false)

  const allSessions = (() => { try { return JSON.parse(localStorage.getItem('thc-sessions') || '[]') } catch { return [] } })()
  const prevSession = allSessions.length > 0 ? allSessions[allSessions.length - 1] : null

  useState(() => {
    if (!session) return
    const toSave = { ...session, date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), savedAt: Date.now() }
    const updated = [...allSessions.filter(s => s.savedAt !== toSave.savedAt), toSave].slice(-10)
    localStorage.setItem('thc-sessions', JSON.stringify(updated))
  })

  if (!session) return null

  const catScores = computeCategoryScores(session)
  const allVals = Object.values(catScores).filter(s => s !== null)
  const overall = allVals.length ? allVals.reduce((a, b) => a + b, 0) / allVals.length : null
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const members = Object.values(session.members || {}).map(m => m.name)

  const allQuestionScores = ALL_QUESTIONS.map((q, qIdx) => ({
    ...q,
    score: getFinalScore(session, qIdx),
    round1Votes: session.votes?.[qIdx]?.round1 || {},
    round2Votes: session.votes?.[qIdx]?.round2 || {}
  }))

  const lowScores = allQuestionScores.filter(q => q.score !== null && q.score <= 2)

  function getDelta(q) {
    if (!prevSession) return null
    const pIdx = ALL_QUESTIONS.findIndex(aq => aq.id === q.id)
    const prev = getFinalScore(prevSession, pIdx)
    if (prev === null || q.score === null) return null
    return q.score - prev
  }

  function getCatDelta(cat) {
    if (!prevSession) return null
    const prevCat = computeCategoryScores(prevSession)
    const curr = catScores[cat.id]; const prev = prevCat[cat.id]
    if (curr === null || prev === null) return null
    return curr - prev
  }

  function exportPDF() {
    const printWindow = window.open('', '_blank')
    const html = generatePrintHTML(session, catScores, allQuestionScores, overall, dateStr, members, prevSession, lowScores, getDelta, getCatDelta)
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 600)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{session.teamName}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{dateStr} · {members.length} members</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={exportPDF} style={{ fontSize: 12, padding: '7px 14px' }}>↓ Export PDF</button>
            <button className="btn-primary" onClick={() => go('home')} style={{ fontSize: 12, padding: '7px 14px' }}>New session</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }}>

        {/* Overall */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '1.25rem' }}>
          <div style={{ textAlign: 'center', minWidth: 64 }}>
            <div style={{ fontSize: 42, fontWeight: 600, lineHeight: 1 }}>{overall?.toFixed(1)}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>/ 5.0</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Overall team health</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {CATEGORIES.map(cat => {
                const delta = getCatDelta(cat)
                return catScores[cat.id] !== null && (
                  <div key={cat.id}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{cat.name}</span>
                      {delta !== null && <span style={{ color: delta > 0 ? '#16A34A' : delta < 0 ? '#DC2626' : 'var(--text3)', fontWeight: 500 }}>{delta > 0 ? `▲${delta.toFixed(1)}` : delta < 0 ? `▼${Math.abs(delta).toFixed(1)}` : '—'}</span>}
                    </div>
                    <ScoreBar value={catScores[cat.id]} color={cat.color} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Focus areas */}
        {lowScores.length > 0 && (
          <div style={{ padding: '14px 18px', background: '#FEF9EC', border: '1px solid #FDE68A', borderRadius: 'var(--radius)', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#92400E', marginBottom: 8 }}>🎯 {lowScores.length} area{lowScores.length > 1 ? 's' : ''} to focus on (score ≤ 2)</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {lowScores.map(q => (
                <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ lineHeight: 1.3 }}>{q.title}</span>
                  <span style={{ fontWeight: 600, color: '#DC2626', marginLeft: 12 }}>{q.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Questions */}
        {CATEGORIES.map(cat => (
          <div key={cat.id} style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: cat.color }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{cat.name}</span>
              {catScores[cat.id] !== null && <span style={{ fontSize: 12, color: 'var(--text3)' }}>avg {catScores[cat.id].toFixed(1)}</span>}
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {cat.questions.map(q => {
                const qData = allQuestionScores.find(aq => aq.id === q.id)
                const delta = getDelta(qData)
                const isLow = qData?.score !== null && qData?.score <= 2
                const hasRound2 = qData && Object.keys(qData.round2Votes).length > 0
                return (
                  <div key={q.id} style={{ padding: '10px 14px', background: isLow ? '#FEF2F2' : 'var(--surface)', border: `1px solid ${isLow ? '#FECACA' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.3 }}>{q.title}</div>
                      {delta !== null && <span style={{ fontSize: 11, color: delta > 0 ? '#16A34A' : delta < 0 ? '#DC2626' : 'var(--text3)', fontWeight: 500 }}>{delta > 0 ? `▲${delta.toFixed(1)}` : delta < 0 ? `▼${Math.abs(delta).toFixed(1)}` : '—'}</span>}
                      <div style={{ display: 'flex', gap: 3 }}>
                        {[1,2,3,4,5].map(v => <div key={v} style={{ width: 14, height: 14, borderRadius: 3, background: v <= (qData?.score || 0) ? cat.color : 'var(--surface2)' }} />)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 16, color: isLow ? '#DC2626' : 'var(--text)' }}>{qData?.score ?? '—'}</span>
                    </div>
                    {hasRound2 && showAllVotes && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text3)' }}>
                        <span style={{ fontWeight: 500 }}>R1:</span> {Object.values(qData.round1Votes).map(v => `${v.name} ${v.score}`).join(' · ')} &nbsp;
                        <span style={{ fontWeight: 500 }}>R2:</span> {Object.values(qData.round2Votes).map(v => `${v.name} ${v.score}`).join(' · ')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <button className="btn-secondary" onClick={() => setShowAllVotes(v => !v)} style={{ width: '100%', marginTop: '0.5rem', fontSize: 13 }}>
          {showAllVotes ? 'Hide' : 'Show'} individual votes per question
        </button>

        {prevSession && (
          <div style={{ marginTop: '1rem', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text3)' }}>
            Compared to: {prevSession.teamName} · {prevSession.date || 'previous session'}
          </div>
        )}
      </div>
    </div>
  )
}

function generatePrintHTML(session, catScores, allQuestionScores, overall, dateStr, members, prevSession, lowScores, getDelta, getCatDelta) {
  const cats = CATEGORIES

  function scoreBlocks(score) {
    return [1,2,3,4,5].map(v =>
      `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${v <= score ? '#374151' : '#E5E7EB'};margin-right:2px;"></span>`
    ).join('')
  }

  function deltaHtml(delta) {
    if (delta === null) return ''
    if (delta > 0) return `<span style="color:#16A34A;font-weight:600;font-size:11px;"> ▲${delta.toFixed(1)}</span>`
    if (delta < 0) return `<span style="color:#DC2626;font-weight:600;font-size:11px;"> ▼${Math.abs(delta).toFixed(1)}</span>`
    return ''
  }

  const catRows = cats.map(cat => {
    const avg = catScores[cat.id]
    const delta = getCatDelta(cat)
    const pct = avg ? (avg / 5) * 100 : 0
    return `
      <div style="margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
          <span style="font-size:12px;color:#6B7280;">${cat.name}</span>
          <span style="font-size:12px;font-weight:600;">${avg?.toFixed(1) ?? '—'}${deltaHtml(delta)}</span>
        </div>
        <div style="height:8px;background:#E5E7EB;border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${cat.color};border-radius:4px;"></div>
        </div>
      </div>`
  }).join('')

  const questionRows = cats.map(cat => {
    const avg = catScores[cat.id]
    const qs = cat.questions.map(q => {
      const qData = allQuestionScores.find(aq => aq.id === q.id)
      const delta = getDelta(qData)
      const isLow = qData?.score !== null && qData?.score <= 2
      return `
        <tr style="border-bottom:1px solid #F3F4F6;">
          <td style="padding:8px 10px;font-size:12px;color:${isLow ? '#DC2626' : '#374151'};line-height:1.4;">${q.title}</td>
          <td style="padding:8px 10px;text-align:center;">${scoreBlocks(qData?.score || 0)}</td>
          <td style="padding:8px 10px;text-align:center;font-size:13px;font-weight:600;color:${isLow ? '#DC2626' : '#111827'};">${qData?.score ?? '—'}${deltaHtml(delta)}</td>
        </tr>`
    }).join('')
    return `
      <div style="margin-bottom:20px;break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#F9FAFB;border-radius:6px 6px 0 0;border:1px solid #E5E7EB;border-bottom:none;">
          <div style="width:10px;height:10px;border-radius:2px;background:${cat.color};"></div>
          <span style="font-size:13px;font-weight:600;">${cat.name}</span>
          <span style="font-size:12px;color:#9CA3AF;margin-left:auto;">avg ${avg?.toFixed(1) ?? '—'}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 6px 6px;overflow:hidden;">
          ${qs}
        </table>
      </div>`
  }).join('')

  const focusHtml = lowScores.length > 0 ? `
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:14px 16px;margin-bottom:20px;break-inside:avoid;">
      <div style="font-size:13px;font-weight:600;color:#92400E;margin-bottom:8px;">Focus areas (score 2 or below)</div>
      ${lowScores.map(q => `
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
          <span style="color:#374151;">${q.title}</span>
          <span style="font-weight:700;color:#DC2626;">${q.score}</span>
        </div>`).join('')}
    </div>` : ''

  const comparedTo = prevSession ? `<div style="font-size:11px;color:#9CA3AF;margin-top:16px;">Compared to: ${prevSession.teamName} · ${prevSession.date || 'previous session'}</div>` : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Team Health Check — ${session.teamName} — ${dateStr}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: white; padding: 32px; }
  @media print {
    body { padding: 0; }
    @page { margin: 20mm 16mm; size: A4; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #111827;">
    <div>
      <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:#9CA3AF;text-transform:uppercase;margin-bottom:4px;">Team Health Check</div>
      <div style="font-size:24px;font-weight:700;">${session.teamName}</div>
      <div style="font-size:13px;color:#6B7280;margin-top:4px;">${dateStr} · ${members.join(', ')}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#9CA3AF;margin-bottom:2px;">Overall score</div>
      <div style="font-size:40px;font-weight:700;line-height:1;">${overall?.toFixed(1) ?? '—'}</div>
      <div style="font-size:13px;color:#9CA3AF;">/ 5.0</div>
    </div>
  </div>

  <!-- Category summary -->
  <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:20px;break-inside:avoid;">
    <div style="font-size:13px;font-weight:600;margin-bottom:12px;">Category Summary</div>
    ${catRows}
  </div>

  ${focusHtml}

  <!-- Questions -->
  ${questionRows}

  ${comparedTo}

  <div class="no-print" style="margin-top:24px;text-align:center;">
    <button onclick="window.print()" style="padding:10px 24px;background:#111827;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;">Print / Save as PDF</button>
  </div>
</body>
</html>`
}
