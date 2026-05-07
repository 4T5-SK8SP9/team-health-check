import { useState } from 'react'
import Home from './Home.jsx'
import CreateSession from './CreateSession.jsx'
import JoinSession from './JoinSession.jsx'
import Lobby from './Lobby.jsx'
import Voting from './Voting.jsx'
import Results from './Results.jsx'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [sessionData, setSessionData] = useState(null)

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
