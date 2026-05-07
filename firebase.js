import { useState } from 'react'
import Home from './components/Home.jsx'
import CreateSession from './components/CreateSession.jsx'
import JoinSession from './components/JoinSession.jsx'
import Lobby from './components/Lobby.jsx'
import Voting from './components/Voting.jsx'
import Results from './components/Results.jsx'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [sessionData, setSessionData] = useState(null) // { sessionId, teamName, memberName, role }

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
