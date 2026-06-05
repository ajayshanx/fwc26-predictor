import { useState } from 'react'
import { useApp } from '../context/AppContext'
import StandingsTable from '../components/StandingsTable'

export default function StandingsTab() {
  const { matches } = useApp()

  const groups = [...new Set(matches.map(m => m.group_letter))].sort()
  const [activeGroup, setActiveGroup] = useState(groups[0] || 'A')

  // Score resolver: use actual match results
  function getScore(match) {
    if (match.status !== 'completed' && match.status !== 'live') return null
    if (match.home_score == null || match.away_score == null) return null
    return { home: match.home_score, away: match.away_score }
  }

  const anyCompleted = matches.some(m => m.status === 'completed' || m.status === 'live')

  if (!anyCompleted) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">⚽</p>
        <p className="text-white font-semibold text-lg">Tournament hasn't started yet</p>
        <p className="text-slate-400 mt-2">Standings will appear here once matches kick off on June 11.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-gold font-bold text-lg tracking-widest uppercase mb-6">
        Official Group Standings
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

      {/* Selected group — full table with conduct */}
      <div className="card mb-4">
        <div className="px-4 pt-4 pb-1">
          <span className="badge bg-gold/20 text-gold">GROUP {activeGroup}</span>
        </div>
        <StandingsTable groupLetter={activeGroup} getScore={getScore} withConduct />
      </div>
      <p className="text-slate-600 text-xs mb-8 px-1">
        Tiebreaker order: Points → Goal Difference → Goals Scored → Conduct Score (CS) → FIFA Ranking
      </p>

      {/* All groups mini-overview */}
      <h3 className="text-slate-400 font-bold text-sm tracking-widest uppercase mb-4">
        All Groups Overview
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {groups.map(g => (
          <div key={g} className="card p-4 cursor-pointer hover:border-navy-400 transition-colors"
               onClick={() => setActiveGroup(g)}>
            <span className="badge bg-gold/20 text-gold mb-3 inline-block">GROUP {g}</span>
            <StandingsTable groupLetter={g} getScore={getScore} withConduct compact />
          </div>
        ))}
      </div>
    </div>
  )
}
