import { db } from './firebase.js'
import { ref, set, get, update, onValue, push, serverTimestamp } from 'firebase/database'

// Generate a readable 6-char session code
export function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Create a new session
export async function createSession({ teamName, facilitatorName }) {
  const code = generateCode()
  const sessionRef = ref(db, `sessions/${code}`)
  await set(sessionRef, {
    teamName,
    facilitator: facilitatorName,
    status: 'lobby',       // lobby | voting | reveal | complete
    currentQuestion: 0,
    createdAt: serverTimestamp(),
    members: {
      [sanitizeName(facilitatorName)]: {
        name: facilitatorName,
        joinedAt: serverTimestamp()
      }
    }
  })
  return code
}

// Join a session
export async function joinSession({ code, memberName }) {
  const sessionRef = ref(db, `sessions/${code}`)
  const snap = await get(sessionRef)
  if (!snap.exists()) throw new Error('Session not found')
  const session = snap.val()
  if (session.status === 'complete') throw new Error('This session has already ended')

  const key = sanitizeName(memberName)
  await update(ref(db, `sessions/${code}/members/${key}`), {
    name: memberName,
    joinedAt: serverTimestamp()
  })
  return session
}

// Submit a vote
export async function submitVote({ code, memberName, questionIndex, score }) {
  const key = sanitizeName(memberName)
  await update(ref(db, `sessions/${code}/votes/${questionIndex}/${key}`), {
    score,
    name: memberName,
    submittedAt: serverTimestamp()
  })
}

// Advance to next question (facilitator / auto)
export async function advanceQuestion({ code, nextIndex, totalQuestions }) {
  if (nextIndex >= totalQuestions) {
    await update(ref(db, `sessions/${code}`), { status: 'complete', currentQuestion: nextIndex })
  } else {
    await update(ref(db, `sessions/${code}`), { currentQuestion: nextIndex, status: 'voting' })
  }
}

// Start the session (move from lobby to voting)
export async function startSession(code) {
  await update(ref(db, `sessions/${code}`), { status: 'voting', currentQuestion: 0 })
}

// Listen to session changes
export function listenSession(code, callback) {
  const sessionRef = ref(db, `sessions/${code}`)
  return onValue(sessionRef, snap => {
    if (snap.exists()) callback(snap.val())
  })
}

export function sanitizeName(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
}
