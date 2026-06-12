import FlagIcon from './FlagIcon'
import KitIcon  from './KitIcon'
import { useApp } from '../context/AppContext'
import { computeStandings } from '../utils/standings'

/**
 * Renders a standings table for one group.
 *
 * Props:
 *   groupLetter  — 'A'…'L'
 *   getScore     — (match) => { home, away } | null
 *   withConduct  — show CS column (Standings tab)
 *   compact      — show fewer columns (All Groups overview)
 */
export default function StandingsTable({ groupLetter, getScore, withConduct = false, compact = false }) {
  const { matches, teams, teamsMap } = useApp()

  const groupMatches = matches.filter(m => m.group_letter === groupLetter)
  const teamCodes    = [...new Set(groupMatches.flatMap(m => [m.home_team, m.away_team]))]
  const rows         = computeStandings(teamCodes, groupMatches, getScore, teamsMap, withConduct)

  if (compact) {
    return (
      <div className="text-sm">
        {rows.map((row, i) => (
          <div
            key={row.code}
            className={`flex items-center justify-between py-1.5 px-3 rounded-lg mb-1
              ${i < 2 ? 'bg-navy-500/40' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs w-4">{i + 1}</span>
              <TeamCell code={row.code} />
            </div>
            <div className="flex gap-4 text-right">
              <ColVal label="GD" val={row.GD >= 0 ? `+${row.GD}` : row.GD} />
              <ColVal label="PTS" val={row.PTS} highlight />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const cols = withConduct
    ? ['P','W','D','L','GF','GA','GD','CS','PTS']
    : ['P','W','D','L','GF','GA','GD','PTS']

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: withConduct ? 480 : 420 }}>
        <thead>
          <tr className="text-slate-400 text-xs uppercase tracking-wide">
            <th className="text-left py-2 px-2 w-5">#</th>
            <th className="text-left py-2 px-2">Team</th>
            {cols.map(c => (
              <th key={c} className={`py-2 px-1.5 text-right ${c === 'PTS' ? 'text-gold' : ''}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.code}
              className={`border-t border-navy-600
                ${i < 2 ? 'bg-navy-600/30' : 'hover:bg-navy-700/30'}
                transition-colors`}
            >
              <td className="py-2 px-2 text-slate-500 text-xs">{i + 1}</td>
              <td className="py-2 px-2">
                <TeamCell code={row.code} />
              </td>
              {cols.map(c => (
                <td key={c} className={`py-2 px-1.5 text-right
                  ${c === 'PTS' ? 'text-gold font-bold text-base' : 'text-slate-300'}`}>
                  {c === 'GD' && row[c] > 0 ? `+${row[c]}` : row[c]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-slate-600 text-xs px-3 py-2">Top 2 qualify — shaded rows</p>
    </div>
  )
}

function TeamCell({ code }) {
  const { teamsMap } = useApp()
  const team = teamsMap[code] || {}
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <FlagIcon flagCode={team.flag_code} size={14} className="flex-shrink-0" />
      <KitIcon  colours={[team.kit_home ?? '#cccccc']} size={16} className="flex-shrink-0 hidden sm:inline-block" />
      <span className="text-white truncate text-xs sm:text-sm">
        {team.name || code}
        {team.fifa_ranking && (
          <span className="text-slate-500 font-normal ml-1">(#{team.fifa_ranking})</span>
        )}
      </span>
    </div>
  )
}

function ColVal({ label, val, highlight }) {
  return (
    <div className="text-right w-10">
      <div className={`font-bold ${highlight ? 'text-gold text-base' : 'text-white'}`}>{val}</div>
      <div className="text-slate-600 text-xs">{label}</div>
    </div>
  )
}
