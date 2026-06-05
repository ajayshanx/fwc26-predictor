import { useState } from 'react'
import KitIcon  from './KitIcon'
import FlagIcon from './FlagIcon'
import { resultColour, isPredictionOpen } from '../utils/scoring'
import { useApp } from '../context/AppContext'

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
          <span className={`font-bold text-xl ${colour || 'text-white'}`}>
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
        <span className={`font-bold text-xl ${colour || 'text-white'}`}>
          {match.home_score} – {match.away_score}
        </span>
      )
    }
    // Scheduled
    return (
      <div className="text-center">
        <div className="text-white font-semibold text-sm">{timeStr}</div>
        <div className="text-slate-400 text-xs mt-0.5">
          Group {match.group_letter} · MD{match.matchday}
        </div>
        <div className="text-slate-500 text-xs">{match.venue_city}</div>
      </div>
    )
  }

  return (
    <div className="card mb-2 overflow-hidden">
      <div
        className="flex items-center px-4 py-3 gap-2 cursor-pointer select-none hover:bg-navy-600/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-white font-semibold text-sm sm:text-base text-right">{homeTeam.name || match.home_team}</span>
          <FlagIcon flagCode={homeTeam.flag_code} size={18} />
          <KitIcon color={homeTeam.kit_home} size={26} />
        </div>

        {/* Centre: score inputs (predictions tab) OR score/time (schedule tab) */}
        <div className="flex items-center justify-center w-44 flex-shrink-0" onClick={e => e.stopPropagation()}>
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
        <div className="flex items-center gap-2 flex-1 justify-start">
          <KitIcon color={awayTeam.kit_home} size={26} />
          <FlagIcon flagCode={awayTeam.flag_code} size={18} />
          <span className="text-white font-semibold text-sm sm:text-base">{awayTeam.name || match.away_team}</span>
        </div>

        {/* Expand chevron */}
        <span className={`text-slate-500 text-xs ml-2 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
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
    <div className="flex items-center gap-2">
      {/* Prediction inputs */}
      <div className="flex items-center gap-1">
        <input
          type="number" min="0" max="99"
          value={homeVal} onChange={e => setHome(e.target.value)}
          onBlur={onBlur} disabled={!editable}
          className="input-score"
        />
        <span className="text-slate-400 font-bold">–</span>
        <input
          type="number" min="0" max="99"
          value={awayVal} onChange={e => setAway(e.target.value)}
          onBlur={onBlur} disabled={!editable}
          className="input-score"
        />
      </div>

      {saving && <span className="text-slate-500 text-xs">…</span>}

      {/* Actual result / live score */}
      {showActual && (
        <div className="ml-2 text-right w-16">
          {match.status === 'completed' && (
            <span className={`font-bold text-sm ${colour}`}>
              {match.home_score}–{match.away_score}
            </span>
          )}
          {match.status === 'live' && (
            <span className="text-red-400 text-sm font-bold">
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
  const isPreMatch = match.status === 'scheduled'

  return (
    <div className="border-t border-navy-500 px-4 py-4 bg-navy-800/50">
      {isPreMatch ? (
        <PreMatchDetail match={match} homeTeam={homeTeam} awayTeam={awayTeam} />
      ) : (
        <LiveMatchDetail match={match} homeTeam={homeTeam} awayTeam={awayTeam} />
      )}
    </div>
  )
}

function PreMatchDetail({ match, homeTeam, awayTeam }) {
  return (
    <div className="grid grid-cols-2 gap-6 text-sm text-slate-400">
      <div>
        <p className="text-white font-semibold mb-2">{homeTeam.name}</p>
        <p className="text-xs text-slate-500 mb-1">Qualifying record</p>
        <p className="text-slate-400 text-xs italic">Data loading — connect football-data.org API</p>
        {homeTeam.fifa_ranking && (
          <p className="mt-2 text-xs">FIFA Ranking: <span className="text-white">#{homeTeam.fifa_ranking}</span></p>
        )}
      </div>
      <div>
        <p className="text-white font-semibold mb-2">{awayTeam.name}</p>
        <p className="text-xs text-slate-500 mb-1">Qualifying record</p>
        <p className="text-slate-400 text-xs italic">Data loading — connect football-data.org API</p>
        {awayTeam.fifa_ranking && (
          <p className="mt-2 text-xs">FIFA Ranking: <span className="text-white">#{awayTeam.fifa_ranking}</span></p>
        )}
      </div>
      <div className="col-span-2">
        <p className="text-xs text-slate-500">Venue</p>
        <p className="text-white text-sm">{match.venue_stadium}, {match.venue_city}, {match.venue_country}</p>
      </div>
    </div>
  )
}

function LiveMatchDetail({ match, homeTeam, awayTeam }) {
  return (
    <div className="text-sm text-slate-400">
      <p className="text-xs text-slate-500 mb-2">Lineups & scorers updated via football-data.org</p>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-white font-semibold mb-1">{homeTeam.name}</p></div>
        <div><p className="text-white font-semibold mb-1">{awayTeam.name}</p></div>
      </div>
      <p className="text-slate-500 text-xs italic mt-2">
        Full lineup data requires football-data.org API integration.
      </p>
    </div>
  )
}
