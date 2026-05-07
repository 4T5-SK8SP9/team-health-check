import { useState, useEffect } from 'react'
import { listenSession, startSession } from './firebaseHelpers.js'

export default function Lobby({ sessionData, go }) {
  const { sessionId, teamName, memberName, role } = sessionData
  const [session, setSession] = useState(null)

  useEffect(() => {
    const unsub = listenSession(sessionId, data => {
      setSession(data)
      if (data.status === 'voting') {
        go('voting')
      }
    })
    return () => unsub()
  }, [sessionId])

  const members = session ? Object.values(session.members || {}) : []
  const isFacilitator = role === 'facilitator'

  return (
    <div className="page" style={{ paddingTop: '2.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="label" style={{ marginBottom: 8 }}>Session code</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 42, fontWeight: 500, letterSpacing: '0.12em', color: 'var(--text)' }}>
          {sessionId}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>
          Share this code with your team
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 12 }}>
          {members.length} {members.length === 1 ? 'person' : 'people'} in the lobby
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {members.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>
                {m.name?.[0]?.toUpperCase() || '?'}
              </div>
              <span style={{ fontSize: 14, color: 'var(--text)' }}>{m.name}</span>
              {m.name === memberName && <span style={{ fontSize: 11, color: 'var(--text3)' }}>(you)</span>}
            </div>
          ))}
        </div>
      </div>

      {isFacilitator ? (
        <>
          <button
            className="btn-primary"
            onClick={() => startSession(sessionId)}
            disabled={members.length < 1}
            style={{ width: '100%', marginBottom: 10 }}
          >
            Start assessment →
          </button>
          <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>
            All members will move to voting simultaneously
          </p>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 6 }}>Waiting for facilitator to start…</div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)', animation: `pulse 1.4s ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
