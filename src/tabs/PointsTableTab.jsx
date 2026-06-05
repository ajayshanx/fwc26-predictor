import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts'
import { useApp } from '../context/AppContext'
import { calcPoints } from '../utils/scoring'

// Palette for player worm lines
const LINE_COLOURS = [
  '#f59e0b', '#22c55e', '#3b82f6', '#ec4899',
  '#a855f7', '#f97316', '#06b6d4', '#84cc16',
]

export default function PointsTableTab() {
  const { groupMembers, allPredictions, matches, user, activeGroup } = useApp()

  const completedMatches = useMemo(
    () => matches.filter(m => m.status === 'completed'),
    [matches]
  )

  // For each member, compute per-match points and cumulative totals
  const memberStats = useMemo(() => {
    return groupMembers.map(member => {
      const preds = allPredictions.filter(p => p.user_id === member.id)
      let cumulative = 0
      const perMatch = completedMatches.map(m => {
        const pred = preds.find(p => p.match_id === m.id)
        const pts  = calcPoints(pred, m) ?? 0
        cumulative += pts
        return { matchId: m.id, prediction: pred, points: pts, cumulative }
      })
      return {
        member,
        perMatch,
        total: cumulative,
        isMe: member.id === user?.id,
      }
    }).sort((a, b) => b.total - a.total)
  }, [groupMembers, allPredictions, completedMatches, user])

  // Worm chart data: one entry per completed match
  const wormData = useMemo(() => {
    return completedMatches.map((m, idx) => {
      const entry = {
        name: `${m.home_team}v${m.away_team}`,
        matchIdx: idx + 1,
      }
      memberStats.forEach(({ member, perMatch }) => {
        entry[member.id] = perMatch[idx]?.cumulative ?? 0
      })
      return entry
    })
  }, [completedMatches, memberStats])

  const displayName = (member) =>
    member.nickname || member.name.split(' ')[0]

  if (!activeGroup) {
    return (
      <div className="text-center py-20 text-slate-500">
        Join or create a group in Share &amp; Play to see the Points Table.
      </div>
    )
  }

  if (completedMatches.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">🏅</p>
        <p className="text-white font-semibold text-lg">No completed matches yet</p>
        <p className="text-slate-400 mt-2">The leaderboard will populate as matches finish.</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">

      {/* ── Leaderboard ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-gold font-bold text-lg tracking-widest uppercase mb-4">
          Predictor Leaderboard
        </h2>
        <p className="text-slate-500 text-xs mb-4">
          Exact score = 5 pts · Correct result = 3 pts · Participated = 1 pt · No prediction = 0 pts
        </p>
        <div className="flex flex-wrap gap-3">
          {memberStats.map(({ member, total, isMe }, i) => (
            <div
              key={member.id}
              className={`card p-4 flex items-center gap-3 min-w-[160px]
                ${isMe ? 'border-gold/50 bg-gold/5' : ''}`}
            >
              <span className="text-gold font-extrabold text-2xl w-8">#{i + 1}</span>
              <div>
                <div className={`font-bold text-sm ${isMe ? 'text-gold' : 'text-white'}`}>
                  {displayName(member)}{isMe ? ' (You)' : ''}
                </div>
                <div className="text-gold text-xl font-extrabold">{total} pts</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Match-by-match breakdown ─────────────────────────────────────── */}
      <section>
        <h2 className="text-gold font-bold text-lg tracking-widest uppercase mb-4">
          Match-by-Match Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="text-sm w-full min-w-[600px]">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-wide border-b border-navy-500">
                <th className="text-left py-2 px-3">Match</th>
                <th className="py-2 px-3 text-center">Result</th>
                {memberStats.map(({ member, isMe }) => (
                  <th key={member.id} className={`py-2 px-3 text-center ${isMe ? 'text-gold' : ''}`}>
                    {displayName(member)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {completedMatches.map((m, idx) => (
                <tr key={m.id} className="border-b border-navy-600 hover:bg-navy-700/30 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="text-white font-semibold text-xs">{m.home_team} vs {m.away_team}</div>
                    <div className="text-slate-500 text-xs">{m.home_team} v {m.away_team}</div>
                  </td>
                  <td className="py-2.5 px-3 text-center text-white font-bold">
                    {m.home_score}–{m.away_score}
                  </td>
                  {memberStats.map(({ member, perMatch }) => {
                    const { prediction: pred, points: pts } = perMatch[idx] || {}
                    return (
                      <td key={member.id} className="py-2.5 px-3 text-center">
                        {pred ? (
                          <div>
                            <div className="text-slate-300 text-xs">{pred.home_score}–{pred.away_score}</div>
                            <div className={`font-bold text-sm ${
                              pts === 5 ? 'text-green-400' :
                              pts === 3 ? 'text-gold' :
                              pts === 1 ? 'text-slate-300' : 'text-red-400'
                            }`}>
                              {pts > 0 ? `+${pts}` : '+0'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-navy-400">
                <td className="py-3 px-3 text-slate-400 font-semibold text-sm" colSpan={2}>
                  Total
                </td>
                {memberStats.map(({ member, total, isMe }) => (
                  <td key={member.id} className={`py-3 px-3 text-center font-extrabold text-base
                    ${isMe ? 'text-gold' : 'text-white'}`}>
                    {total}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ── Worm graph ──────────────────────────────────────────────────── */}
      {wormData.length > 1 && (
        <section>
          <h2 className="text-gold font-bold text-lg tracking-widest uppercase mb-4">
            Points Worm
          </h2>
          <div className="card p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={wormData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis
                  dataKey="matchIdx"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  label={{ value: 'Match', position: 'insideBottom', fill: '#64748b', dy: 12 }}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#101928', border: '1px solid #1e2d45', borderRadius: 8 }}
                  labelStyle={{ color: '#f59e0b' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(val, name) => {
                    const member = groupMembers.find(m => m.id === name)
                    return [val, member ? displayName(member) : name]
                  }}
                />
                <Legend
                  formatter={(value) => {
                    const member = groupMembers.find(m => m.id === value)
                    return member ? displayName(member) : value
                  }}
                  wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
                />
                {memberStats.map(({ member }, i) => (
                  <Line
                    key={member.id}
                    type="monotone"
                    dataKey={member.id}
                    stroke={LINE_COLOURS[i % LINE_COLOURS.length]}
                    strokeWidth={member.id === user?.id ? 3 : 1.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  )
}
