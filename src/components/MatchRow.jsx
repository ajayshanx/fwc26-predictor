import { useState } from 'react'
import KitIcon  from './KitIcon'
import FlagIcon from './FlagIcon'
import { resultColour, isPredictionOpen } from '../utils/scoring'
import { useApp } from '../context/AppContext'
import { getMatchKits } from '../data/kits'

/**
 * Shared match row for Schedule and My Predictions tabs.
 *
 * Props:
 *   match         — match object
 *   prediction    — current user's prediction for this match (or undefined)
 *   onSave        — (matchId, home, away) => void  (Predictions tab only)
 *   showPredInput — show score prediction inputs
 *   showActual    — show actual / live score on the right
 */
export default function MatchRow({ match, prediction, onSave, showPredInput = false, showActual = false }) {
  const { teamsMap } = useApp()
  const [expanded, setExpanded] = useState(false)
  const [inputHome, setInputHome] = useState(prediction?.home_score ?? '')
  const [inputAway, setInputAway] = useState(prediction?.away_score ?? '')
  const [saving, setSaving] = useState(false)

  const homeTeam = teamsMap[match.home_team] || {}
  const awayTeam = teamsMap[match.away_team] || {}
  const isOpen   = isPredictionOpen(match)
  const editable = showPredInput && isOpen

  const kickoff  = new Date(match.kickoff_utc)
  const timeStr  = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const colour   = resultColour(prediction, match)

  async function handleBlur() {
    if (!editable || !onSave) return
    const h = parseInt(inputHome, 10)
    const a = parseInt(inputAway, 10)
    if (isNaN(h) || isNaN(a)) return
    if (h === prediction?.home_score && a === prediction?.away_score) return
    setSaving(true)
    await onSave(match.id, h, a)
    setSaving(false)
  }

  // Score / time display in the centre
  function CentreDisplay() {
    if (match.status === 'live') {
      return (
        <div className="text-center">
          <span className={`font-bold text-base sm:text-xl ${colour || 'text-white'}`}>
            {match.home_score} – {match.away_score}
          </span>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <span className="live-dot w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span className="text-red-400 text-xs font-semibold">{match.match_minute}'</span>
          </div>
        </div>
      )
    }
    if (match.status === 'completed') {
      return (
        <span className={`font-bold text-base sm:text-xl ${colour || 'text-white'}`}>
          {match.home_score} – {match.away_score}
        </span>
      )
    }
    // Scheduled
    return (
      <div className="text-center leading-tight">
        <div className="text-white font-semibold text-xs sm:text-sm">{timeStr}</div>
        <div className="text-slate-400 text-[10px] sm:text-xs mt-0.5 truncate">
          Grp {match.group_letter} · MD{match.matchday}
        </div>
        <div className="text-slate-500 text-[10px] sm:text-xs truncate">{match.venue_city}</div>
      </div>
    )
  }

  // Per-match kit colours from FIFA document, fallback to team defaults
  const matchKits = getMatchKits(match.home_team, match.away_team)
  const homeKit = matchKits?.home ?? [homeTeam.kit_home ?? '#cccccc']
  const awayKit = matchKits?.away ?? [awayTeam.kit_home ?? '#cccccc']

  return (
    <div className="card mb-2 overflow-hidden">
      <div
        className="flex items-center px-2 sm:px-4 py-3 gap-1 sm:gap-2 cursor-pointer select-none hover:bg-navy-600/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Home team */}
        <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0 justify-end">
          <span className="text-white font-semibold text-xs sm:text-base text-right truncate">{homeTeam.name || match.home_team}</span>
          <FlagIcon flagCode={homeTeam.flag_code} size={16} className="flex-shrink-0" />
          <KitIcon colours={homeKit} size={22} className="flex-shrink-0 hidden sm:inline-block" />
        </div>

        {/* Centre: score inputs (predictions tab) OR score/time (schedule tab) */}
        <div className={`flex items-center justify-center flex-shrink-0 ${showPredInput ? 'w-24 sm:w-44' : 'w-20 sm:w-44'}`} onClick={e => e.stopPropagation()}>
          {showPredInput ? (
            <PredInputs
              homeVal={inputHome} awayVal={inputAway}
              setHome={setInputHome} setAway={setInputAway}
              onBlur={handleBlur} editable={editable} saving={saving}
              prediction={prediction} match={match}
              showActual={showActual}
            />
          ) : (
            <CentreDisplay />
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0 justify-start">
          <KitIcon colours={awayKit} size={22} className="flex-shrink-0 hidden sm:inline-block" />
          <FlagIcon flagCode={awayTeam.flag_code} size={16} className="flex-shrink-0" />
          <span className="text-white font-semibold text-xs sm:text-base truncate">{awayTeam.name || match.away_team}</span>
        </div>

        {/* Expand chevron */}
        <span className={`text-slate-500 text-xs ml-1 sm:ml-2 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <ExpandedPanel match={match} homeTeam={homeTeam} awayTeam={awayTeam} />
      )}
    </div>
  )
}

function PredInputs({ homeVal, awayVal, setHome, setAway, onBlur, editable, saving, prediction, match, showActual }) {
  const colour = resultColour(prediction, match)

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Prediction inputs */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        <input
          type="number" min="0" max="99"
          placeholder="–"
          value={homeVal} onChange={e => setHome(e.target.value)}
          onBlur={onBlur} disabled={!editable}
          className="input-score !w-8 !h-8 !text-sm sm:!w-12 sm:!h-10 sm:!text-xl"
        />
        <span className="text-slate-400 font-bold text-xs sm:text-base">–</span>
        <input
          type="number" min="0" max="99"
          placeholder="–"
          value={awayVal} onChange={e => setAway(e.target.value)}
          onBlur={onBlur} disabled={!editable}
          className="input-score !w-8 !h-8 !text-sm sm:!w-12 sm:!h-10 sm:!text-xl"
        />
      </div>

      {saving && <span className="text-slate-500 text-xs">…</span>}

      {/* Actual result / live score — only takes space when there's something to show */}
      {showActual && match.status !== 'scheduled' && (
        <div className="ml-1 sm:ml-2 text-right w-12 sm:w-16 flex-shrink-0">
          {match.status === 'completed' && (
            <span className={`font-bold text-xs sm:text-sm ${colour}`}>
              {match.home_score}–{match.away_score}
            </span>
          )}
          {match.status === 'live' && (
            <span className="text-red-400 text-xs sm:text-sm font-bold">
              {match.home_score}–{match.away_score}
              <span className="text-xs ml-1">{match.match_minute}'</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function ExpandedPanel({ match, homeTeam, awayTeam }) {
  return (
    <div className="border-t border-navy-500 px-4 py-4 bg-navy-800/50">
      {match.status === 'scheduled' && <PreMatchDetail match={match} homeTeam={homeTeam} awayTeam={awayTeam} />}
      {match.status === 'live'      && <LiveMatchDetail match={match} homeTeam={homeTeam} awayTeam={awayTeam} />}
      {match.status === 'completed' && <PostMatchDetail match={match} homeTeam={homeTeam} awayTeam={awayTeam} />}
    </div>
  )
}

// Renders a team's qualifying record as a compact stat grid (headers + values).
function QualifyingRecord({ team }) {
  const r = team?.qualifying_record

  if (!r) {
    return (
      <p className="text-slate-400 text-xs italic leading-relaxed">
        Qualified automatically as host — no qualifying campaign
      </p>
    )
  }

  const gdStr = r.gd > 0 ? `+${r.gd}` : `${r.gd}`
  const stats = [
    { label: 'P',   value: r.played },
    { label: 'W',   value: r.won    },
    { label: 'D',   value: r.drawn  },
    { label: 'L',   value: r.lost   },
    { label: 'GD',  value: gdStr    },
    { label: 'Pts', value: r.pts    },
  ]

  return (
    <div className="flex gap-3">
      {stats.map(({ label, value }) => (
        <div key={label} className="text-center">
          <p className="text-slate-500 text-[10px] uppercase leading-none">{label}</p>
          <p className="text-white text-sm font-semibold font-mono mt-0.5">{value}</p>
        </div>
      ))}
    </div>
  )
}

function PreMatchDetail({ match, homeTeam, awayTeam }) {
  return (
    <div className="space-y-4 text-sm text-slate-400">
      {/* Teams: side-by-side on sm+, stacked on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-white font-semibold mb-1">{homeTeam.name}</p>
          <p className="text-xs text-slate-500 mb-2">Qualifying record</p>
          <QualifyingRecord team={homeTeam} />
          {homeTeam.fifa_ranking && (
            <p className="mt-2 text-xs">FIFA Ranking: <span className="text-white">#{homeTeam.fifa_ranking}</span></p>
          )}
        </div>
        <div className="border-t border-navy-600 pt-3 sm:border-0 sm:pt-0">
          <p className="text-white font-semibold mb-1">{awayTeam.name}</p>
          <p className="text-xs text-slate-500 mb-2">Qualifying record</p>
          <QualifyingRecord team={awayTeam} />
          {awayTeam.fifa_ranking && (
            <p className="mt-2 text-xs">FIFA Ranking: <span className="text-white">#{awayTeam.fifa_ranking}</span></p>
          )}
        </div>
      </div>
      {/* Venue */}
      <div className="border-t border-navy-600 pt-3">
        <p className="text-xs text-slate-500">Venue</p>
        <p className="text-white text-sm">{match.venue_stadium}, {match.venue_city}, {match.venue_country}</p>
      </div>
    </div>
  )
}

function LiveMatchDetail({ match, homeTeam, awayTeam }) {
  return (
    <div className="text-sm text-slate-400">
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-white font-semibold mb-1">{homeTeam.name}</p></div>
        <div><p className="text-white font-semibold mb-1">{awayTeam.name}</p></div>
      </div>
      <div className="border-t border-navy-600 pt-3 mt-3">
        <p className="text-xs text-slate-500">Venue</p>
        <p className="text-white text-sm">{match.venue_stadium}, {match.venue_city}</p>
      </div>
    </div>
  )
}

function PostMatchDetail({ match, homeTeam, awayTeam }) {
  const kickoff = new Date(match.kickoff_utc)
  const dateStr = kickoff.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const homeName = homeTeam.name || match.home_team
  const awayName = awayTeam.name || match.away_team
  const homeWon  = match.home_score > match.away_score
  const awayWon  = match.away_score > match.home_score

  return (
    <div className="space-y-3 text-sm">
      {/* Teams & result */}
      <div className="flex items-center justify-between">
        <span className={`font-semibold text-xs sm:text-sm ${homeWon ? 'text-white' : 'text-slate-400'}`}>{homeName}</span>
        <span className="text-gold font-bold text-lg mx-3">{match.home_score} – {match.away_score}</span>
        <span className={`font-semibold text-xs sm:text-sm ${awayWon ? 'text-white' : 'text-slate-400'}`}>{awayName}</span>
      </div>

      {/* Venue & date */}
      <div className="border-t border-navy-600 pt-3 flex flex-col sm:flex-row sm:justify-between gap-1">
        <div>
          <p className="text-xs text-slate-500">Venue</p>
          <p className="text-white text-xs sm:text-sm">{match.venue_stadium}, {match.venue_city}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs text-slate-500">Played</p>
          <p className="text-white text-xs sm:text-sm">{dateStr}</p>
        </div>
      </div>
    </div>
  )
}
