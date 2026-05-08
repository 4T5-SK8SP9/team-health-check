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

function ScoreBar({ value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 7, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${(value / 5) * 100}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 500, minWidth: 28 }}>{value.toFixed(1)}</span>
    </div>
  )
}

function exportReport(session, catScores, allQuestionScores, prevSession) {
  const lines = []
  lines.push(`TEAM HEALTH CHECK REPORT`)
  lines.push(`Team: ${session.teamName}`)
  lines.push(`Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`)
  lines.push(`Members: ${Object.values(session.members || {}).map(m => m.name).join(', ')}`)
  lines.push(``)

  const allVals = Object.values(catScores).filter(s => s !== null)
  const overall = allVals.length ? allVals.reduce((a, b) => a + b, 0) / allVals.length : null
  lines.push(`OVERALL SCORE: ${overall?.toFixed(1) ?? '—'} / 5.0`)
  lines.push(``)

  CATEGORIES.forEach(cat => {
    lines.push(`── ${cat.name.toUpperCase()} (avg: ${catScores[cat.id]?.toFixed(1) ?? '—'})`)
    cat.questions.forEach(q => {
      const qData = allQuestionScores.find(aq => aq.id === q.id)
      const prev = prevSession ? (() => {
        const pIdx = ALL_QUESTIONS.findIndex(aq => aq.id === q.id)
        return getFinalScore(prevSession, pIdx)
      })() : null
      const delta = prev !== null && qData?.score !== null ? qData.score - prev : null
      const deltaStr = delta !== null ? (delta > 0 ? ` ▲${delta.toFixed(1)}` : delta < 0 ? ` ▼${Math.abs(delta).toFixed(1)}` : ' —') : ''
      lines.push(`   [${qData?.score ?? '—'}${deltaStr}] ${q.title}`)
    })
    lines.push(``)
  })

  if (prevSession) {
    lines.push(`Compared to: ${prevSession.teamName} — ${prevSession.date || 'previous session'}`)
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `team-health-${session.teamName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Results({ sessionData, go }) {
  const session = sessionData?.finalSession
  const [showAllVotes, setShowAllVotes] = useState(false)

  // Load previous sessions from localStorage for comparison
  const allSessions = (() => { try { return JSON.parse(localStorage.getItem('thc-sessions') || '[]') } catch { return [] } })()
  const prevSession = allSessions.length > 0 ? allSessions[allSessions.length - 1] : null

  // Save this session
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
    const prevCatScores = computeCategoryScores(prevSession)
    const curr = catScores[cat.id]
    const prev = prevCatScores[cat.id]
    if (curr === null || prev === null) return null
    return curr - prev
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{session.teamName}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {Object.values(session.members || {}).length} members
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={() => exportReport(session, catScores, allQuestionScores, prevSession)} style={{ fontSize: 12, padding: '7px 14px' }}>
              ↓ Export report
            </button>
            <button className="btn-primary" onClick={() => go('home')} style={{ fontSize: 12, padding: '7px 14px' }}>
              New session
            </button>
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
            <div style={{ fontSize: 13, fontWeight: 500, color: '#92400E', marginBottom: 8 }}>
              🎯 {lowScores.length} area{lowScores.length > 1 ? 's' : ''} to focus on (score ≤ 2)
            </div>
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

        {/* Questions by category */}
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
                      {delta !== null && (
                        <span style={{ fontSize: 11, color: delta > 0 ? '#16A34A' : delta < 0 ? '#DC2626' : 'var(--text3)', fontWeight: 500 }}>
                          {delta > 0 ? `▲${delta.toFixed(1)}` : delta < 0 ? `▼${Math.abs(delta).toFixed(1)}` : '—'}
                        </span>
                      )}
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
