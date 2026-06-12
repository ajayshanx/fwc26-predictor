import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import MatchRow from '../components/MatchRow'
import FlagIcon from '../components/FlagIcon'
import { aggregateStats } from '../utils/scoring'
import { computeStandings } from '../utils/standings'

const KNOCKOUT_DEADLINE = new Date('2026-06-25T00:00:00Z') // end of 24 June UTC
const SUB_TABS = ['Group Stage', 'Knockout Teams', 'Knockout Matches']

export default function PredictionsTab() {
  const [subTab, setSubTab] = useState('Group Stage')

  return (
    <div>
      {/* Sub-tab pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {SUB_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors
              ${subTab === tab
                ? 'bg-gold text-navy-900'
                : 'bg-navy-700 text-slate-400 hover:text-white border border-navy-500'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {subTab === 'Group Stage'      && <GroupStageContent />}
      {subTab === 'Knockout Teams'   && <KnockoutTeamsContent />}
      {subTab === 'Knockout Matches' && <KnockoutMatchesContent />}
    </div>
  )
}

// ── Group Stage ──────────────────────────────────────────────────────────────
function GroupStageContent() {
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

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatTile label="Predicted"  sub="matches"        value={`${stats.predicted}/${stats.total}`} />
        <StatTile label="Points"     sub="total earned"   value={stats.totalPoints} highlight />
        <StatTile label="Accuracy"   sub="result rate"    value={stats.accuracy  !== null ? `${stats.accuracy}%`  : '–'} />
        <StatTile label="Precision"  sub="exact score rate" value={stats.precision !== null ? `${stats.precision}%` : '–'} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-xs text-slate-500">
        <span><span className="text-slate-300 font-semibold">1 pt</span> — any prediction</span>
        <span><span className="text-gold font-semibold">3 pts</span> — correct result</span>
        <span><span className="text-green-400 font-semibold">5 pts</span> — exact score</span>
      </div>

      {Object.entries(byDate).map(([date, dayMatches]) => (
        <div key={date} className="mb-8">
          <h3 className="text-gold font-bold text-sm tracking-widest mb-3">{date}</h3>
          {dayMatches.map(m => (
            <MatchRow
              key={m.id}
              match={m}
              prediction={predictions.find(p => p.match_id === m.id)}
              onSave={(matchId, h, a) => savePrediction(matchId, h, a)}
              showPredInput
              showActual
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Knockout Teams ───────────────────────────────────────────────────────────
function KnockoutTeamsContent() {
  const { matches, predictions, teamsMap, knockoutPredictions, saveKnockoutPrediction } = useApp()
  const [selectedGroup, setSelectedGroup] = useState('A')

  const groups = [...new Set(
    matches.filter(m => m.group_letter).map(m => m.group_letter)
  )].sort()

  const deadlinePassed = new Date() > KNOCKOUT_DEADLINE
  const thirdCount = knockoutPredictions.filter(kp => kp.qualified_as === 3).length

  function getScore(match) {
    const pred = predictions.find(p => p.match_id === match.id)
    if (!pred || pred.home_score == null) return null
    return { home: pred.home_score, away: pred.away_score }
  }

  function getGroupTeams(groupLetter) {
    const gm = matches.filter(m => m.group_letter === groupLetter)
    return [...new Set(gm.flatMap(m => [m.home_team, m.away_team]))]
  }

  function getPick(groupLetter, qualifiedAs) {
    return knockoutPredictions.find(
      kp => kp.group_letter === groupLetter && kp.qualified_as === qualifiedAs
    )?.team_code ?? ''
  }

  async function handlePick(groupLetter, qualifiedAs, teamCode) {
    if (deadlinePassed) return
    if (qualifiedAs === 3 && thirdCount >= 8 && !getPick(groupLetter, 3)) return
    await saveKnockoutPrediction(groupLetter, qualifiedAs, teamCode || null)
  }

  const totalPicks = knockoutPredictions.length

  return (
    <div>
      {/* Info bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
        <p className="text-xs text-slate-400">
          {deadlinePassed
            ? '🔒 Predictions locked — deadline of 24 June has passed.'
            : 'Select 2 qualifiers per group + up to 8 third-place teams. Deadline: 24 June.'}
        </p>
        <div className="flex gap-2">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border
            ${thirdCount >= 8 ? 'border-gold text-gold bg-gold/10' : 'border-navy-500 text-slate-400'}`}>
            3rd-place: {thirdCount}/8
          </span>
          <span className="text-xs font-semibold px-3 py-1 rounded-full border border-navy-500 text-slate-400">
            {totalPicks}/32 picked
          </span>
        </div>
      </div>

      {/* Group buttons + All Qualified */}
      <div className="flex gap-2 flex-wrap mb-6">
        {groups.map(g => (
          <button
            key={g}
            onClick={() => setSelectedGroup(g)}
            className={`w-10 h-10 rounded-lg font-bold text-sm transition-colors
              ${selectedGroup === g
                ? 'bg-gold text-navy-900'
                : 'bg-navy-700 text-slate-400 hover:text-white border border-navy-500'}`}
          >
            {g}
          </button>
        ))}
        <button
          onClick={() => setSelectedGroup(null)}
          className={`px-3 h-10 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap
            ${selectedGroup === null
              ? 'bg-gold text-navy-900'
              : 'bg-navy-700 text-slate-400 hover:text-white border border-navy-500'}`}
        >
          All Qualified
        </button>
      </div>

      {selectedGroup !== null ? (
        <GroupQualifierPicker
          groupLetter={selectedGroup}
          teams={getGroupTeams(selectedGroup)}
          matches={matches}
          getScore={getScore}
          teamsMap={teamsMap}
          getPick={getPick}
          onPick={handlePick}
          thirdCount={thirdCount}
          deadlinePassed={deadlinePassed}
        />
      ) : (
        <AllQualifiedTeams
          groups={groups}
          getPick={getPick}
          teamsMap={teamsMap}
          onSelectGroup={setSelectedGroup}
        />
      )}
    </div>
  )
}

function GroupQualifierPicker({ groupLetter, teams, matches, getScore, teamsMap, getPick, onPick, thirdCount, deadlinePassed }) {
  const groupMatches = matches.filter(m => m.group_letter === groupLetter)
  const standings = computeStandings(teams, groupMatches, getScore, teamsMap)
  const hasAnyPred = groupMatches.some(m => getScore(m) !== null)

  const pick1 = getPick(groupLetter, 1)
  const pick2 = getPick(groupLetter, 2)
  const pick3 = getPick(groupLetter, 3)
  const canPickThird = !!pick3 || thirdCount < 8

  const POSITIONS = [
    { pos: 1, label: '1st place qualifier', pick: pick1 },
    { pos: 2, label: '2nd place qualifier', pick: pick2 },
    { pos: 3, label: '3rd place qualifier', pick: pick3, conditional: true },
  ]

  return (
    <div className="space-y-4">
      {/* Reference standings */}
      <div className="card p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
          Group {groupLetter} — predicted standings (reference only)
        </p>
        {hasAnyPred ? (
          <div className="space-y-2">
            {standings.map((row, i) => {
              const team = teamsMap[row.code] || {}
              return (
                <div key={row.code} className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs w-4 text-right">{i + 1}</span>
                  <FlagIcon flagCode={team.flag_code} size={14} className="flex-shrink-0" />
                  <span className="text-white text-xs sm:text-sm flex-1 truncate">
                    {team.name || row.code}
                    {team.fifa_ranking && (
                      <span className="text-slate-500 ml-1 font-normal">(#{team.fifa_ranking})</span>
                    )}
                  </span>
                  <span className="text-slate-500 text-xs font-mono">{row.PTS}p {row.GD >= 0 ? `+${row.GD}` : row.GD}gd</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-slate-600 text-xs italic">No match predictions yet — make predictions in Group Stage to see projected standings.</p>
        )}
      </div>

      {/* Qualifier selectors */}
      <div className="card p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
          Your qualifier picks — Group {groupLetter}
        </p>
        <div className="space-y-3">
          {POSITIONS.map(({ pos, label, pick, conditional }) => {
            const disabled = deadlinePassed || (conditional && !canPickThird)
            const otherPicks = POSITIONS.filter(p => p.pos !== pos).map(p => p.pick).filter(Boolean)
            const options = teams.filter(tc => !otherPicks.includes(tc))

            return (
              <div key={pos} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className={`text-xs font-semibold sm:w-36 flex-shrink-0
                  ${disabled && conditional ? 'text-slate-600' : 'text-slate-300'}`}>
                  {label}
                  {conditional && !pick && thirdCount < 8 && (
                    <span className="text-slate-600 font-normal ml-1">({8 - thirdCount} left)</span>
                  )}
                  {conditional && thirdCount >= 8 && !pick && (
                    <span className="text-red-500 font-normal ml-1">(full)</span>
                  )}
                </span>
                <select
                  value={pick}
                  onChange={e => onPick(groupLetter, pos, e.target.value)}
                  disabled={disabled}
                  className={`flex-1 bg-navy-600 border rounded-lg px-3 py-2 text-sm
                    focus:outline-none focus:border-gold transition-colors
                    ${pick ? 'border-gold/50 text-white' : 'border-navy-400 text-slate-400'}
                    disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <option value="">— select team —</option>
                  {options.map(tc => {
                    const team = teamsMap[tc] || {}
                    return <option key={tc} value={tc}>{team.name || tc}</option>
                  })}
                </select>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-slate-600 mt-4 italic">
          Independent from your match predictions — pick whoever you think will actually qualify.
        </p>
      </div>
    </div>
  )
}

function AllQualifiedTeams({ groups, getPick, teamsMap, onSelectGroup }) {
  const picks = []
  groups.forEach(g => {
    [1, 2, 3].forEach(pos => {
      const tc = getPick(g, pos)
      if (tc) picks.push({ groupLetter: g, qualifiedAs: pos, teamCode: tc })
    })
  })
  picks.sort((a, b) =>
    a.groupLetter !== b.groupLetter
      ? a.groupLetter.localeCompare(b.groupLetter)
      : a.qualifiedAs - b.qualifiedAs
  )

  if (picks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">🏆</p>
        <p className="text-white font-semibold">No qualifiers predicted yet</p>
        <p className="text-slate-400 text-sm mt-2">Select a group above to start picking.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="text-gold font-bold text-sm">{picks.length} / 32 qualifiers predicted</span>
        {picks.length < 32 && (
          <span className="text-slate-500 text-xs">{32 - picks.length} remaining</span>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 text-xs uppercase tracking-wide border-b border-navy-600">
            <th className="text-left py-2 px-4">Team</th>
            <th className="text-right py-2 px-4">Qualifies as</th>
          </tr>
        </thead>
        <tbody>
          {picks.map(({ groupLetter, qualifiedAs, teamCode }) => {
            const team = teamsMap[teamCode] || {}
            const label = `${groupLetter}${qualifiedAs}`
            const colour =
              qualifiedAs === 1 ? 'bg-gold/20 text-gold' :
              qualifiedAs === 2 ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-slate-500/20 text-slate-300'
            return (
              <tr
                key={`${groupLetter}-${qualifiedAs}`}
                className="border-t border-navy-700 hover:bg-navy-700/30 cursor-pointer transition-colors"
                onClick={() => onSelectGroup(groupLetter)}
              >
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <FlagIcon flagCode={team.flag_code} size={14} className="flex-shrink-0" />
                    <span className="text-white text-xs sm:text-sm">{team.name || teamCode}</span>
                  </div>
                </td>
                <td className="py-2.5 px-4 text-right">
                  <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${colour}`}>
                    {label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Knockout Matches (placeholder) ───────────────────────────────────────────
function KnockoutMatchesContent() {
  return (
    <div className="text-center py-20">
      <p className="text-5xl mb-4">⚔️</p>
      <p className="text-white font-semibold text-lg">Coming Soon</p>
      <p className="text-slate-400 mt-2 text-sm max-w-sm mx-auto">
        Once the group stage ends and knockout matchups are confirmed, you'll be able to predict scores and winners here.
      </p>
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────
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
