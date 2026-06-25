import { useApp } from '../context/AppContext'
import { aggregateStats } from '../utils/scoring'

export default function Header({ activeTab, setActiveTab, tabs }) {
  const { user, groups, activeGroup, setActiveGroup, predictions, matches, knockoutPredictions } = useApp()

  const stats = aggregateStats(predictions, matches)
  const koPoints = knockoutPredictions
    .filter(kp => kp.points_awarded !== null)
    .reduce((s, kp) => s + kp.points_awarded, 0)
  const totalPoints = stats.totalPoints + koPoints

  function handleGroupChange(e) {
    const group = groups.find(g => g.id === e.target.value)
    if (group) setActiveGroup(group)
  }

  return (
    <header className="bg-navy-800 border-b border-navy-500 sticky top-0 z-50">
      {/* Top bar: branding + group selector + stats */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Branding */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl sm:text-2xl">🏆</span>
          <div className="min-w-0">
            <div className="text-white font-extrabold text-xs sm:text-base leading-tight tracking-tight">
              FIFA WORLD CUP 2026
            </div>
            <div className="text-gold text-[10px] sm:text-xs font-semibold tracking-widest hidden sm:block">
              MATCH PREDICTOR · USA · CANADA · MEXICO
            </div>
          </div>
        </div>

        {/* Right side: group + stats */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Group selector */}
          {groups.length > 0 && (
            <select
              value={activeGroup?.id || ''}
              onChange={handleGroupChange}
              className="bg-navy-600 border border-navy-400 rounded-lg px-2 py-1.5 text-xs sm:text-sm
                         text-white focus:outline-none focus:border-gold max-w-[90px] sm:max-w-[180px]"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
          {groups.length === 0 && (
            <span className="text-slate-500 text-xs italic hidden sm:inline">No group yet</span>
          )}

          {/* Predictions count */}
          <StatChip
            label="Predictions"
            value={`${stats.predicted}/${stats.total}`}
          />

          {/* Total points */}
          <StatChip
            label="Points"
            value={totalPoints}
            highlight
          />
        </div>
      </div>

      {/* Tab bar */}
      <nav className="max-w-5xl mx-auto px-4 overflow-x-auto flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  )
}

function StatChip({ label, value, highlight }) {
  return (
    <div className={`rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-center min-w-[52px] sm:min-w-[64px] border
      ${highlight
        ? 'bg-navy-700 border-gold/40 text-gold'
        : 'bg-navy-700 border-navy-500 text-white'}`}>
      <div className="text-sm sm:text-lg font-bold leading-tight">{value}</div>
      <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wide">{label}</div>
    </div>
  )
}
