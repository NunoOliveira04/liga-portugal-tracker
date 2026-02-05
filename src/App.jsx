import { useState, useEffect, useCallback } from 'react'
import './App.css'

const API_KEY = import.meta.env.VITE_API_KEY
const TOTAL_MATCHES = 34
const IS_DEV = import.meta.env.DEV

const fetchAPI = async (endpoint) => {
  const headers = IS_DEV ? { 'X-Auth-Token': API_KEY } : {}
  const response = await fetch(`/api/${endpoint}`, { headers })
  if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`)
  return response.json()
}

function App() {
  const [view, setView] = useState('menu')
  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [nextMatch, setNextMatch] = useState(null)
  const [standings, setStandings] = useState([])
  const [relegationData, setRelegationData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const navigateTo = useCallback((newView) => {
    setView(newView)
    window.history.pushState({ view: newView }, '', '')
  }, [])

  useEffect(() => {
    window.history.replaceState({ view: 'menu' }, '', '')
    
    const handlePopState = (event) => {
      if (event.state?.view) {
        setView(event.state.view)
      } else {
        setView('menu')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const fetchTeams = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAPI('v4/competitions/PPL/teams')
      setTeams(data.teams)
      navigateTo('selectTeam')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchNextMatch = async (team) => {
    setLoading(true)
    setError(null)
    setSelectedTeam(team)
    try {
      const data = await fetchAPI(`v4/teams/${team.id}/matches?status=SCHEDULED&limit=50`)
      const now = new Date()
      const ligaMatches = data.matches
        .filter((match) => match.competition.code === 'PPL' && new Date(match.utcDate) >= now)
        .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))
      setNextMatch(ligaMatches[0] || null)
      navigateTo('nextMatch')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStandings = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAPI('v4/competitions/PPL/standings')
      setStandings(data.standings[0].table)
      navigateTo('standings')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamsForRelegation = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAPI('v4/competitions/PPL/standings')
      setStandings(data.standings[0].table)
      navigateTo('selectTeamRelegation')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const analyzeRelegation = (team) => {
    const teamData = standings.find(t => t.team.id === team.team.id)
    const relegationZoneTeam = standings.find(t => t.position === 17)
    
    if (!teamData || !relegationZoneTeam) return

    const teamPoints = teamData.points
    const teamGamesPlayed = teamData.playedGames
    const teamGamesRemaining = TOTAL_MATCHES - teamGamesPlayed
    const teamPosition = teamData.position

    const relegationPoints = relegationZoneTeam.points
    const relegationGamesPlayed = relegationZoneTeam.playedGames
    const relegationGamesRemaining = TOTAL_MATCHES - relegationGamesPlayed
    const relegationMaxPoints = relegationPoints + (relegationGamesRemaining * 3)

    const isMathematicallySafe = teamPoints > relegationMaxPoints
    const pointsNeededForSafety = Math.max(0, relegationMaxPoints + 1 - teamPoints)
    const winsNeeded = Math.ceil(pointsNeededForSafety / 3)
    const teamMaxPoints = teamPoints + (teamGamesRemaining * 3)
    const canStillBeRelegated = teamMaxPoints >= relegationPoints && teamPosition > 16
    const isInRelegationZone = teamPosition >= 17

    setRelegationData({
      team: teamData,
      relegationZoneTeam,
      teamPoints,
      teamGamesRemaining,
      teamPosition,
      relegationPoints,
      relegationMaxPoints,
      relegationGamesRemaining,
      isMathematicallySafe,
      pointsNeededForSafety,
      winsNeeded,
      canStillBeRelegated,
      isInRelegationZone,
      teamMaxPoints
    })
    setSelectedTeam(teamData)
    navigateTo('relegationAnalysis')
  }

  const goToMenu = () => {
    navigateTo('menu')
    setSelectedTeam(null)
    setNextMatch(null)
    setStandings([])
    setRelegationData(null)
    setError(null)
  }

  const goBack = () => {
    window.history.back()
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-PT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPositionClass = (position) => {
    if (position <= 2) return 'champions-league'
    if (position === 3) return 'europa-league'
    if (position === 4) return 'conference-league'
    if (position === 16) return 'playoff'
    if (position >= 17) return 'relegation'
    return ''
  }

  if (loading) {
    return (
      <div className="container">
        <h1>⏳ A carregar...</h1>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <h1>❌ Erro</h1>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={goToMenu} className="btn">Voltar ao Menu</button>
      </div>
    )
  }

  // Menu Principal
  if (view === 'menu') {
    return (
      <div className="container">
        <h1>⚽ Liga Portugal</h1>
        <div className="menu">
          <button onClick={fetchTeams} className="btn btn-primary">
            📅 Ver o próximo jogo
          </button>
          <button onClick={fetchStandings} className="btn btn-primary">
            🏆 Tabela Classificativa
          </button>
          <button onClick={fetchTeamsForRelegation} className="btn btn-primary">
            📉 Análise de Despromoção
          </button>
        </div>
      </div>
    )
  }

  // Selecionar Equipa
  if (view === 'selectTeam') {
    return (
      <div className="container">
        <h1>⚽ Escolhe a equipa</h1>
        <div className="teams-grid">
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => fetchNextMatch(team)}
              className="team-card"
            >
              <img src={team.crest} alt={team.name} className="team-crest" />
              <span>{team.shortName || team.name}</span>
            </button>
          ))}
        </div>
        <button onClick={goToMenu} className="btn btn-secondary">
          ← Voltar ao Menu
        </button>
      </div>
    )
  }

  // Mostrar Próximo Jogo
  if (view === 'nextMatch') {
    return (
      <div className="container">
        <h1>📅 Próximo Jogo</h1>
        
        {nextMatch ? (
          <div className="match-card">
            <div className="match-teams">
              <div className="match-team">
                <img src={nextMatch.homeTeam.crest} alt={nextMatch.homeTeam.name} className="match-crest" />
                <span className={nextMatch.homeTeam.id === selectedTeam.id ? 'highlight' : ''}>
                  {nextMatch.homeTeam.shortName || nextMatch.homeTeam.name}
                </span>
              </div>
              <span className="vs">VS</span>
              <div className="match-team">
                <img src={nextMatch.awayTeam.crest} alt={nextMatch.awayTeam.name} className="match-crest" />
                <span className={nextMatch.awayTeam.id === selectedTeam.id ? 'highlight' : ''}>
                  {nextMatch.awayTeam.shortName || nextMatch.awayTeam.name}
                </span>
              </div>
            </div>
            
            <div className="match-info">
              <p><strong>📆 Data:</strong> {formatDate(nextMatch.utcDate)}</p>
              <p><strong>🏟️ Local:</strong> {nextMatch.homeTeam.id === selectedTeam.id ? '🏠 Casa' : '✈️ Fora'}</p>
              <p><strong>🏆 Jornada:</strong> {nextMatch.matchday}</p>
            </div>
          </div>
        ) : (
          <div className="card">
            <p>Não há jogos agendados para {selectedTeam.name} na Liga Portugal.</p>
          </div>
        )}

        <div className="btn-group">
          <button onClick={goBack} className="btn btn-secondary">
            ← Escolher outra equipa
          </button>
          <button onClick={goToMenu} className="btn btn-secondary">
            🏠 Menu Principal
          </button>
        </div>
      </div>
    )
  }

  // Tabela Classificativa
  if (view === 'standings') {
    return (
      <div className="container">
        <h1>🏆 Tabela Classificativa</h1>
        
        <div className="standings-table">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Equipa</th>
                <th>J</th>
                <th>V</th>
                <th>E</th>
                <th>D</th>
                <th>GM</th>
                <th>GS</th>
                <th>DG</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team) => (
                <tr key={team.team.id} className={getPositionClass(team.position)}>
                  <td className="position">{team.position}</td>
                  <td className="team-name">
                    <img src={team.team.crest} alt={team.team.name} />
                    <span>{team.team.shortName || team.team.name}</span>
                  </td>
                  <td>{team.playedGames}</td>
                  <td>{team.won}</td>
                  <td>{team.draw}</td>
                  <td>{team.lost}</td>
                  <td>{team.goalsFor}</td>
                  <td>{team.goalsAgainst}</td>
                  <td>{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                  <td className="points">{team.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="standings-legend">
          <span className="legend-item"><span className="dot champions-league-dot"></span> Liga dos Campeões</span>
          <span className="legend-item"><span className="dot europa-league-dot"></span> Liga Europa</span>
          <span className="legend-item"><span className="dot conference-league-dot"></span> Liga Conferência</span>
          <span className="legend-item"><span className="dot playoff-dot"></span> Playoff Desprom.</span>
          <span className="legend-item"><span className="dot relegation-dot"></span> Despromoção</span>
        </div>

        <button onClick={goToMenu} className="btn btn-secondary">
          🏠 Menu Principal
        </button>
      </div>
    )
  }

  // Selecionar Equipa para Análise de Despromoção
  if (view === 'selectTeamRelegation') {
    return (
      <div className="container">
        <h1>📉 Análise de Despromoção</h1>
        <p className="subtitle">Escolhe uma equipa para analisar</p>
        <div className="teams-grid">
          {standings.map(team => (
            <button
              key={team.team.id}
              onClick={() => analyzeRelegation(team)}
              className={`team-card ${team.position >= 17 ? 'relegation-zone' : ''}`}
            >
              <img src={team.team.crest} alt={team.team.name} className="team-crest" />
              <span>{team.team.shortName || team.team.name}</span>
              <span className="team-position">{team.position}º - {team.points}pts</span>
            </button>
          ))}
        </div>
        <button onClick={goToMenu} className="btn btn-secondary">
          ← Voltar ao Menu
        </button>
      </div>
    )
  }

  // Análise de Despromoção
  if (view === 'relegationAnalysis' && relegationData) {
    const { 
      team, relegationZoneTeam, teamPoints, teamGamesRemaining, teamPosition,
      relegationPoints, relegationMaxPoints, isMathematicallySafe,
      pointsNeededForSafety, winsNeeded, isInRelegationZone, teamMaxPoints
    } = relegationData

    return (
      <div className="container">
        <h1>📉 Análise de Despromoção</h1>
        
        <div className="relegation-card">
          <div className="relegation-team-header">
            <img src={team.team.crest} alt={team.team.name} className="relegation-crest" />
            <div>
              <h2>{team.team.name}</h2>
              <p>{teamPosition}º lugar • {teamPoints} pontos • {teamGamesRemaining} jogos restantes</p>
            </div>
          </div>

          {isInRelegationZone ? (
            <div className="relegation-status danger">
              <h3>⚠️ EM ZONA DE DESPROMOÇÃO</h3>
              <p>A equipa está atualmente em posição de descida de divisão.</p>
            </div>
          ) : isMathematicallySafe ? (
            <div className="relegation-status safe">
              <h3>✅ MATEMATICAMENTE SEGURO</h3>
              <p>A equipa já não pode descer de divisão esta temporada!</p>
            </div>
          ) : (
            <div className="relegation-status warning">
              <h3>⚡ AINDA PODE DESCER</h3>
              <p>A equipa ainda não está matematicamente segura.</p>
            </div>
          )}

          <div className="relegation-details">
            <div className="detail-box">
              <span className="detail-label">Pontos Atuais</span>
              <span className="detail-value">{teamPoints}</span>
            </div>
            <div className="detail-box">
              <span className="detail-label">Máximo Possível</span>
              <span className="detail-value">{teamMaxPoints}</span>
            </div>
            <div className="detail-box">
              <span className="detail-label">17º Lugar ({relegationZoneTeam.team.shortName})</span>
              <span className="detail-value">{relegationPoints} pts</span>
            </div>
            <div className="detail-box">
              <span className="detail-label">Máx. do 17º</span>
              <span className="detail-value">{relegationMaxPoints}</span>
            </div>
          </div>

          {!isMathematicallySafe && !isInRelegationZone && (
            <div className="relegation-safety">
              <h3>🎯 Para garantir a manutenção:</h3>
              <div className="safety-info">
                <div className="safety-box">
                  <span className="safety-number">{pointsNeededForSafety}</span>
                  <span className="safety-label">pontos necessários</span>
                </div>
                <div className="safety-box">
                  <span className="safety-number">{winsNeeded}</span>
                  <span className="safety-label">{winsNeeded === 1 ? 'vitória necessária' : 'vitórias necessárias'}</span>
                </div>
              </div>
              <p className="safety-note">
                * Considerando que o 17º lugar ({relegationZoneTeam.team.shortName}) ganha todos os {TOTAL_MATCHES - relegationZoneTeam.playedGames} jogos restantes
              </p>
            </div>
          )}

          {isInRelegationZone && (
            <div className="relegation-safety">
              <h3>🎯 Para sair da zona de despromoção:</h3>
              <p>Precisa ultrapassar o {16}º lugar na tabela classificativa.</p>
              <p>Diferença atual para o 16º: {standings.find(t => t.position === 16)?.points - teamPoints} pontos</p>
            </div>
          )}
        </div>

        <div className="btn-group">
          <button onClick={goBack} className="btn btn-secondary">
            ← Escolher outra equipa
          </button>
          <button onClick={goToMenu} className="btn btn-secondary">
            🏠 Menu Principal
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default App
