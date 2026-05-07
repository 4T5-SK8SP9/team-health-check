import { CATEGORIES, ALL_QUESTIONS } from '../questions.js'

function computeCategoryScores(session) {
  const results = {}
  CATEGORIES.forEach(cat => {
    const scores = cat.questions.map(q => {
      const qIdx = ALL_QUESTIONS.findIndex(aq => aq.id === q.id)
      const votes = session.votes?.[qIdx] || {}
      const vals = Object.values(votes).map(v => v.score)
      return vals.length ? Math.min(...vals) : null
    }).filter(s => s !== null)
    results[cat.id] = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  })
  return results
}

function ScoreBar({ value, color, max = 5 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 7, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 500, minWidth: 28, color: 'var(--text)' }}>{value.toFixed(1)}</span>
    </div>
  )
}

export default function Results({ sessionData, go }) {
  const session = sessionData?.finalSession
  if (!session) return null

  const catScores = computeCategoryScores(session)
  const allVals = Object.values(catScores).filter(s => s !== null)
  const overall = allVals.length ? allVals.reduce((a, b) => a + b, 0) / allVals.length : null

  const allQuestionScores = ALL_QUESTIONS.map((q, qIdx) => {
    const votes = session.votes?.[qIdx] || {}
    const vals = Object.values(votes).map(v => v.score)
    return { ...q, score: vals.length ? Math.min(...vals) : null, votes }
  })

  const lowScores = allQuestionScores.filter(q => q.score !== null && q.score <= 2)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{session.teamName}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Assessment complete · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
          <button className="btn-secondary" onClick={() => go('home')} style={{ fontSize: 12, padding: '7px 14px' }}>
            New session
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }}>

        {/* Overall */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '1.25rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 42, fontWeight: 600, lineHeight: 1, color: 'var(--text)' }}>{overall?.toFixed(1)}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>out of 5.0</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Overall team health</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {CATEGORIES.map(cat => catScores[cat.id] !== null && (
                <div key={cat.id}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>{cat.name}</div>
                  <ScoreBar value={catScores[cat.id]} color={cat.color} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Focus areas */}
        {lowScores.length > 0 && (
          <div style={{ padding: '14px 18px', background: '#FEF9EC', border: '1px solid #FDE68A', borderRadius: 'var(--radius)', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#92400E', marginBottom: 8 }}>
              {lowScores.length} area{lowScores.length > 1 ? 's' : ''} to focus on (score ≤ 2)
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {lowScores.map(q => (
                <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: 'var(--text)', lineHeight: 1.3 }}>{q.title}</span>
                  <span style={{ fontWeight: 600, color: '#DC2626', marginLeft: 12, minWidth: 16 }}>{q.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All questions by category */}
        {CATEGORIES.map(cat => (
          <div key={cat.id} style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: cat.color }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{cat.name}</span>
              {catScores[cat.id] !== null && (
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>avg {catScores[cat.id].toFixed(1)}</span>
              )}
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {cat.questions.map(q => {
                const qData = allQuestionScores.find(aq => aq.id === q.id)
                const isLow = qData?.score !== null && qData?.score <= 2
                return (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: isLow ? '#FEF2F2' : 'var(--surface)', border: `1px solid ${isLow ? '#FECACA' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ flex: 1, fontSize: 13, color: 'var(--text)', lineHeight: 1.3 }}>{q.title}</div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[1,2,3,4,5].map(v => (
                        <div key={v} style={{ width: 14, height: 14, borderRadius: 3, background: v <= (qData?.score || 0) ? cat.color : 'var(--surface2)' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, minWidth: 16, color: isLow ? '#DC2626' : 'var(--text)', textAlign: 'right' }}>
                      {qData?.score ?? '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* All member votes detail */}
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ fontSize: 13, color: 'var(--text2)', cursor: 'pointer', padding: '10px 0', userSelect: 'none' }}>
            View all individual votes
          </summary>
          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
            {allQuestionScores.filter(q => Object.keys(q.votes).length > 0).map(q => (
              <div key={q.id} style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{q.title}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.values(q.votes).sort((a, b) => a.score - b.score).map((v, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {v.name}: <strong style={{ color: 'var(--text)' }}>{v.score}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>

      </div>
    </div>
  )
}
