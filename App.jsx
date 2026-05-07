import { useState, useEffect, useRef } from 'react'
import { listenSession, submitVote, advanceQuestion, sanitizeName } from '../firebaseHelpers.js'
import { ALL_QUESTIONS, TOTAL_QUESTIONS, CATEGORIES } from '../questions.js'

export default function Voting({ sessionData, go }) {
  const { sessionId, memberName } = sessionData
  const [session, setSession] = useState(null)
  const [myVote, setMyVote] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const prevQuestionRef = useRef(null)

  useEffect(() => {
    const unsub = listenSession(sessionId, data => {
      setSession(data)

      if (data.status === 'complete') {
        go('results', { finalSession: data })
        return
      }

      const qIdx = data.currentQuestion ?? 0

      // Reset vote state when question changes
      if (prevQuestionRef.current !== qIdx) {
        prevQuestionRef.current = qIdx
        setMyVote(null)
        setRevealed(false)
        setAdvancing(false)
      }

      // Check if all members voted on this question
      const votes = data.votes?.[qIdx] || {}
      const members = Object.keys(data.members || {})
      const votedKeys = Object.keys(votes)
      const allVoted = members.length > 0 && members.every(mk => votedKeys.includes(mk))

      if (allVoted && !revealed) {
        setRevealed(true)
        // Auto-advance after 3s
        if (!advancing) {
          setAdvancing(true)
          setTimeout(() => {
            advanceQuestion({ code: sessionId, nextIndex: qIdx + 1, totalQuestions: TOTAL_QUESTIONS })
          }, 3500)
        }
      }
    })
    return () => unsub()
  }, [sessionId, revealed, advancing])

  if (!session) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ color: 'var(--text3)', fontSize: 14 }}>Connecting…</div>
    </div>
  )

  const qIdx = session.currentQuestion ?? 0
  const question = ALL_QUESTIONS[qIdx]
  const votes = session.votes?.[qIdx] || {}
  const members = Object.values(session.members || {})
  const votedCount = Object.keys(votes).length
  const totalCount = members.length
  const myKey = sanitizeName(memberName)
  const hasVoted = !!votes[myKey]

  // Compute lowest score
  const allScores = Object.values(votes).map(v => v.score)
  const lowestScore = allScores.length ? Math.min(...allScores) : null
  const lowestVoters = revealed ? Object.values(votes).filter(v => v.score === lowestScore).map(v => v.name) : []

  const cat = CATEGORIES.find(c => c.id === question.categoryId)

  // Progress per category
  const catProgress = CATEGORIES.map(c => {
    const catQs = c.questions
    const answered = catQs.filter((_, i) => {
      const globalIdx = ALL_QUESTIONS.findIndex(q => q.id === catQs[i].id)
      return globalIdx < qIdx
    }).length
    return { ...c, answered, total: catQs.length }
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 20px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{session.teamName}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{memberName}</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            {qIdx + 1} / {TOTAL_QUESTIONS}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--border)' }}>
        <div style={{ height: '100%', background: cat?.color || 'var(--accent)', width: `${((qIdx) / TOTAL_QUESTIONS) * 100}%`, transition: 'width 0.4s ease' }} />
      </div>

      <div style={{ flex: 1, maxWidth: 640, margin: '0 auto', width: '100%', padding: '1.5rem 1.25rem' }}>

        {/* Category label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: cat?.color }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {question.categoryName}
          </span>
        </div>

        {/* Question */}
        <h2 style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.35, marginBottom: '1.5rem', color: 'var(--text)' }}>
          {question.title}
        </h2>

        {/* Extremes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.5rem' }}>
          <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', fontSize: 12, color: '#7F1D1D', lineHeight: 1.5 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: '#DC2626', marginBottom: 4 }}>SCORE 1</div>
            {question.negative}
          </div>
          <div style={{ padding: '12px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-sm)', fontSize: 12, color: '#14532D', lineHeight: 1.5 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: '#16A34A', marginBottom: 4 }}>SCORE 5</div>
            {question.positive}
          </div>
        </div>

        {/* Voting buttons */}
        {!revealed && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10, textAlign: 'center' }}>
              {hasVoted ? 'Your vote is in — waiting for others' : 'Select your score'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(v => {
                const isSelected = myVote === v
                const colors = ['#DC2626', '#EA580C', '#CA8A04', '#16A34A', '#15803D']
                const bgs = ['#FEF2F2', '#FFF7ED', '#FEFCE8', '#F0FDF4', '#DCFCE7']
                return (
                  <button
                    key={v}
                    onClick={() => {
                      if (hasVoted) return
                      setMyVote(v)
                      submitVote({ code: sessionId, memberName, questionIndex: qIdx, score: v })
                    }}
                    disabled={hasVoted}
                    style={{
                      flex: 1,
                      height: 64,
                      border: isSelected ? `2px solid ${colors[v - 1]}` : '1.5px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? bgs[v - 1] : 'var(--surface)',
                      color: isSelected ? colors[v - 1] : 'var(--text2)',
                      fontSize: 22,
                      fontWeight: 600,
                      transition: 'all 0.15s',
                      transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                      cursor: hasVoted ? 'default' : 'pointer'
                    }}
                  >
                    {v}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Waiting indicator */}
        {!revealed && (
          <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              {votedCount} of {totalCount} voted
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
              {members.map((m, i) => {
                const voted = !!votes[sanitizeName(m.name)]
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: voted ? 'var(--accent)' : 'var(--text3)' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: voted ? 'var(--accent)' : 'var(--border)' }} />
                    {m.name}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Reveal */}
        {revealed && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem', padding: '16px 20px', background: 'var(--surface)', border: `2px solid ${cat?.color}`, borderRadius: 'var(--radius)' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>Final score (lowest)</div>
                <div style={{ fontSize: 36, fontWeight: 600, color: cat?.color }}>{lowestScore}</div>
                {lowestVoters.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>from {lowestVoters.join(', ')}</div>
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {Object.values(votes).sort((a, b) => a.score - b.score).map((v, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', minWidth: 52 }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{v.score}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{v.name}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
              Next question in a moment…
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
