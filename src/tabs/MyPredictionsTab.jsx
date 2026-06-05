import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import MatchRow from '../components/MatchRow'
import { aggregateStats } from '../utils/scoring'

export default function MyPredictionsTab() {
  const { matches, predictions, savePrediction } = useApp()
  const stats = aggregateStats(predictions, matches)

  const byDate = useMemo(() => {
    const map = {}
    matches.forEach(m => {
      const d = new Date(m.kickoff_utc).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      }).toUpperCase()
      if (!map[d]) map[d] = []
      map[d].push(m)
    })
    return map
  }, [matches])

  async function handleSave(matchId, homeScore, awayScore) {
    await savePrediction(matchId, homeScore, awayScore)
  }

  return (
    <div>
      {/* Stats tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatTile
          label="Predicted"
          sub="matches"
          value={`${stats.predicted}/${stats.total}`}
        />
        <StatTile
          label="Points"
          sub="total earned"
          value={stats.totalPoints}
          highlight
        />
        <StatTile
          label="Accuracy"
          sub="result rate"
          value={stats.accuracy !== null ? `${stats.accuracy}%` : '–'}
        />
        <StatTile
          label="Precision"
          sub="exact score rate"
          value={stats.precision !== null ? `${stats.precision}%` : '–'}
        />
      </div>

      {/* Scoring reminder */}
      <div className="flex gap-4 mb-6 text-xs text-slate-500">
        <span><span className="text-slate-300 font-semibold">1 pt</span> — any prediction</span>
        <span><span className="text-gold font-semibold">3 pts</span> — correct result</span>
        <span><span className="text-green-400 font-semibold">5 pts</span> — exact score</span>
      </div>

      {/* Match list */}
      {Object.entries(byDate).map(([date, dayMatches]) => (
        <div key={date} className="mb-8">
          <h3 className="text-gold font-bold text-sm tracking-widest mb-3">{date}</h3>
          {dayMatches.map(m => (
            <MatchRow
              key={m.id}
              match={m}
              prediction={predictions.find(p => p.match_id === m.id)}
              onSave={handleSave}
              showPredInput
              showActual
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function StatTile({ label, sub, value, highlight }) {
  return (
    <div className="card p-4 text-center">
      <div className={`text-2xl font-extrabold leading-tight ${highlight ? 'text-gold' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-white text-sm font-semibold mt-1">{label}</div>
      <div className="text-slate-500 text-xs">{sub}</div>
    </div>
  )
}
