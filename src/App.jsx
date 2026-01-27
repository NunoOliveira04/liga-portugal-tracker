import { useState, useEffect } from 'react'
import './App.css'

const API_KEY = import.meta.env.VITE_API_KEY

function App() {
  const [view, setView] = useState('menu') // menu, selectTeam, nextMatch, standings
  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [nextMatch, setNextMatch] = useState(null)
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Buscar equipas da Liga Portugal
  const fetchTeams = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/v4/competitions/PPL/teams', {
        headers: { 'X-Auth-Token': API_KEY }
      })
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`)
      const data = await response.json()
      setTeams(data.teams)
      setView('selectTeam')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Buscar próximo jogo de uma equipa
  const fetchNextMatch = async (team) => {
    setLoading(true)
    setError(null)
    setSelectedTeam(team)
    try {
      const response = await fetch(`/api/v4/teams/${team.id}/matches?status=SCHEDULED&limit=5`, {
        headers: { 'X-Auth-Token': API_KEY }
      })
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`)
      const data = await response.json()
      
      // Encontrar o próximo jogo na Liga Portugal
      const ligaMatch = data.matches.find(m => m.competition.code === 'PPL')
      setNextMatch(ligaMatch || null)
      setView('nextMatch')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Buscar tabela classificativa
  const fetchStandings = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/v4/competitions/PPL/standings', {
        headers: { 'X-Auth-Token': API_KEY }
      })
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`)
      const data = await response.json()
      setStandings(data.standings[0].table)
      setView('standings')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const goToMenu = () => {
    setView('menu')
    setSelectedTeam(null)
    setNextMatch(null)
    setStandings([])
    setError(null)
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
          <button onClick={() => setView('selectTeam')} className="btn btn-secondary">
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
                <tr key={team.team.id} className={team.position <= 4 ? 'champions' : team.position >= 17 ? 'relegation' : ''}>
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
          <span className="legend-item"><span className="dot champions-dot"></span> Liga dos Campeões</span>
          <span className="legend-item"><span className="dot relegation-dot"></span> Despromoção</span>
        </div>

        <button onClick={goToMenu} className="btn btn-secondary">
          🏠 Menu Principal
        </button>
      </div>
    )
  }

  return null
}

export default App
