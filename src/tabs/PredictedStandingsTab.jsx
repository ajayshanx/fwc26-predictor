import { useState } from 'react'
import { useApp } from '../context/AppContext'
import StandingsTable from '../components/StandingsTable'

export default function PredictedStandingsTab() {
  const { matches, predictions } = useApp()

  // Groups present in match data
  const groups = [...new Set(matches.map(m => m.group_letter))].sort()
  const [activeGroup, setActiveGroup] = useState(groups[0] || 'A')

  // Score resolver: use the user's predictions
  function getScore(match) {
    const pred = predictions.find(p => p.match_id === match.id)
    if (!pred) return null
    return { home: pred.home_score, away: pred.away_score }
  }

  if (predictions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">🔮</p>
        <p className="text-white font-semibold text-lg">No predictions yet</p>
        <p className="text-slate-400 mt-2">Head to My Predictions and enter some scores to see your projected standings here.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-gold font-bold text-lg tracking-widest uppercase mb-6">
        Predicted Group Standings
      </h2>

      {/* Group selector */}
      <div className="flex gap-2 flex-wrap mb-6">
        {groups.map(g => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`w-10 h-10 rounded-lg font-bold text-sm transition-colors
              ${activeGroup === g
                ? 'bg-gold text-navy-900'
                : 'bg-navy-700 text-slate-400 hover:text-white border border-navy-500'}`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Selected group full table */}
      <div className="card mb-8">
        <div className="px-4 pt-4 pb-1">
          <span className="badge bg-gold/20 text-gold">GROUP {activeGroup}</span>
        </div>
        <StandingsTable groupLetter={activeGroup} getScore={getScore} />
      </div>

      {/* All groups mini-tables */}
      <h3 className="text-slate-400 font-bold text-sm tracking-widest uppercase mb-4">
        All Groups Overview
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {groups.map(g => (
          <div key={g} className="card p-4 cursor-pointer hover:border-navy-400 transition-colors"
               onClick={() => setActiveGroup(g)}>
            <span className="badge bg-gold/20 text-gold mb-3 inline-block">GROUP {g}</span>
            <StandingsTable groupLetter={g} getScore={getScore} compact />
          </div>
        ))}
      </div>
    </div>
  )
}
