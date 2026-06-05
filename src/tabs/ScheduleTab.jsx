import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import MatchRow from '../components/MatchRow'

const MATCHDAYS = ['All Matches', 'Matchday 1', 'Matchday 2', 'Matchday 3']

export default function ScheduleTab() {
  const { matches, predictions } = useApp()
  const [matchday, setMatchday] = useState(0)  // 0 = all

  const filtered = useMemo(() => {
    if (matchday === 0) return matches
    return matches.filter(m => m.matchday === matchday)
  }, [matches, matchday])

  // Group by date
  const byDate = useMemo(() => {
    const map = {}
    filtered.forEach(m => {
      const d = new Date(m.kickoff_utc).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      }).toUpperCase()
      if (!map[d]) map[d] = []
      map[d].push(m)
    })
    return map
  }, [filtered])

  return (
    <div>
      {/* Matchday tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {MATCHDAYS.map((label, i) => (
          <button
            key={i}
            onClick={() => setMatchday(i)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors
              ${matchday === i
                ? 'bg-gold text-navy-900'
                : 'bg-navy-700 text-slate-400 hover:text-white border border-navy-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Matches grouped by date */}
      {Object.entries(byDate).map(([date, dayMatches]) => (
        <div key={date} className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gold font-bold text-sm tracking-widest">{date}</h3>
            <span className="text-slate-500 text-xs">{dayMatches.length} {dayMatches.length === 1 ? 'MATCH' : 'MATCHES'}</span>
          </div>
          {dayMatches.map(m => (
            <MatchRow
              key={m.id}
              match={m}
              prediction={predictions.find(p => p.match_id === m.id)}
              showPredInput={false}
              showActual={false}
            />
          ))}
        </div>
      ))}

      {Object.keys(byDate).length === 0 && (
        <div className="text-center text-slate-500 py-16">No matches found.</div>
      )}
    </div>
  )
}
