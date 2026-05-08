import { useState, useEffect } from 'react'
import Home from './Home.jsx'
import CreateSession from './CreateSession.jsx'
import JoinSession from './JoinSession.jsx'
import Lobby from './Lobby.jsx'
import Voting from './Voting.jsx'
import Results from './Results.jsx'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [sessionData, setSessionData] = useState(null)

  // Handle ?join=CODE in URL for direct session links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join')
    if (joinCode) {
      setSessionData(prev => ({ ...prev, prefillCode: joinCode.toUpperCase() }))
      setScreen('join')
    }
  }, [])

  function go(screen, data = {}) {
    setSessionData(prev => ({ ...prev, ...data }))
    setScreen(screen)
  }

  const props = { sessionData, go }

  return (
    <>
      {screen === 'home'    && <Home {...props} />}
      {screen === 'create'  && <CreateSession {...props} />}
      {screen === 'join'    && <JoinSession {...props} />}
      {screen === 'lobby'   && <Lobby {...props} />}
      {screen === 'voting'  && <Voting {...props} />}
      {screen === 'results' && <Results {...props} />}
    </>
  )
}
