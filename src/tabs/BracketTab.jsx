import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'

// ── Constants ─────────────────────────────────────────────────────────────────
const S = 800, CX = 400, CY = 400

// Radii for each bracket ring
const R_OUTER = 336  // team flag circles
const R_PAIR  = 268  // R32 result nodes
const R_R16   = 204  // R16 result nodes
const R_QF    = 144  // QF result nodes
const R_SF    = 88   // SF result nodes
// Final is at center (CX, CY)

const FR       = 18   // outer flag radius
const R_LABEL  = 298  // radius for R32 kickoff labels (between outer flags and pair nodes)
const R_LABEL_R16 = 234  // between pair nodes and R16 nodes
const R_LABEL_QF  = 172  // between R16 and QF nodes
const R_LABEL_SF  = 114  // between QF and SF nodes

// ISO flag codes (flagcdn.com)
const FC = {
  RSA:'za', GER:'de', NED:'nl', BRA:'br', FRA:'fr', CIV:'ci',
  MEX:'mx', USA:'us', BEL:'be', POR:'pt', ESP:'es', SUI:'ch',
  AUS:'au', ARG:'ar', COL:'co', ENG:'gb-eng', CAN:'ca', JPN:'jp',
  MAR:'ma', PAR:'py', CPV:'cv', COD:'cd', EGY:'eg', SWE:'se',
  NOR:'no', ECU:'ec', SEN:'sn', ALG:'dz', GHA:'gh', BIH:'ba',
  CRO:'hr', AUT:'at',
}

// 32 outer positions in clockwise order from top.
// Pairs at positions [2k, 2k+1] play each other in R32.
// Each group of 4 feeds one R16 match; group of 8 → QF; 16 → SF.
const OUTER = [
  [74,'home'],[74,'away'], [77,'home'],[77,'away'],  // group 0-3  → R16 M89 → QF M97 → SF M101
  [73,'home'],[73,'away'], [75,'home'],[75,'away'],  // group 4-7
  [81,'home'],[81,'away'], [82,'home'],[82,'away'],  // group 8-11 → R16 M94 → QF M98 → SF M101
  [83,'home'],[83,'away'], [84,'home'],[84,'away'],  // group 12-15
  [76,'home'],[76,'away'], [78,'home'],[78,'away'],  // group 16-19 → R16 M91 → QF M99 → SF M102
  [79,'home'],[79,'away'], [80,'home'],[80,'away'],  // group 20-23
  [86,'home'],[86,'away'], [88,'home'],[88,'away'],  // group 24-27 → R16 M95 → QF M100 → SF M102
  [85,'home'],[85,'away'], [87,'home'],[87,'away'],  // group 28-31
]

// Match numbers at each ring (in same circular order as OUTER positions)
const R32_MNS = [74, 77, 73, 75,  81, 82, 83, 84,  76, 78, 79, 80,  86, 88, 85, 87]
const R16_MNS = [89, 90, 94, 93,  91, 92, 95, 96]
const QF_MNS  = [97, 98, 99, 100]
const SF_MNS  = [101, 102]

// ── Time formatting ────────────────────────────────────────────────────────────
function fmtKickoff(utcStr) {
  if (!utcStr) return { time: '', date: '' }
  const d = new Date(utcStr)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  const date = d.toLocaleDateString([], { day: 'numeric', month: 'short' })
  return { time, date }
}

// ── Geometry helpers ──────────────────────────────────────────────────────────
const toRad   = n  => (n / 32) * 2 * Math.PI - Math.PI / 2
const polar   = (r, a) => [CX + r * Math.cos(a), CY + r * Math.sin(a)]
const midAngle = (a, b) => (a + b) / 2

// Angle at each ring level
const pairAngle = k => toRad(k * 2 + 0.5)   // k 0-15 → R32 match midpoints
const r16Angle  = j => toRad(j * 4 + 1.5)   // j 0-7  → R16 match midpoints
const qfAngle   = i => toRad(i * 8 + 3.5)   // i 0-3  → QF midpoints
const sfAngle   = i => toRad(i * 16 + 7.5)  // i 0-1  → SF midpoints

// ── Flag node (SVG circle with cropped flag image) ────────────────────────────
function FlagNode({ cx, cy, r, tla, dim = false, glow = false }) {
  const id  = `fn-${Math.round(cx * 10)}-${Math.round(cy * 10)}`
  const url = tla && FC[tla] ? `https://flagcdn.com/w40/${FC[tla]}.png` : null
  return (
    <g>
      <defs><clipPath id={id}><circle cx={cx} cy={cy} r={r} /></clipPath></defs>
      {glow && <circle cx={cx} cy={cy} r={r + 4} fill="#f59e0b" opacity={0.25} />}
      <circle cx={cx} cy={cy} r={r} fill="#0d1117" />
      {url && (
        <image
          href={url}
          x={cx - r * 1.6} y={cy - r}
          width={r * 3.2} height={r * 2}
          clipPath={`url(#${id})`}
          opacity={dim ? 0.18 : 1}
          preserveAspectRatio="xMidYMid slice"
        />
      )}
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={tla && !dim ? 'rgba(255,255,255,0.3)' : '#1a2535'}
        strokeWidth={tla ? 1.5 : 1}
      />
    </g>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BracketTab() {
  const { matches } = useApp()
  const [hoveredLabel, setHoveredLabel] = useState(null)

  const byNum = useMemo(() => {
    const m = {}
    matches.forEach(x => { if (x.match_number) m[x.match_number] = x })
    return m
  }, [matches])

  const getWinner = mn => {
    const m = byNum[mn]
    if (!m || m.status !== 'completed') return null
    if (m.penalty_winner) return m.penalty_winner
    if ((m.home_score ?? -1) > (m.away_score ?? -1)) return m.home_team
    if ((m.away_score ?? -1) > (m.home_score ?? -1)) return m.away_team
    return null
  }

  const getTeam = (mn, side) => {
    const m = byNum[mn]
    if (!m) return null
    return side === 'home' ? m.home_team : m.away_team
  }

  const isElim = (mn, side) => {
    const m = byNum[mn]
    if (!m || m.status !== 'completed') return false
    const tla = side === 'home' ? m.home_team : m.away_team
    return !!(tla && getWinner(mn) !== tla)
  }

  // ── Lines ───────────────────────────────────────────────────────────────────
  const LSTYLE = { stroke: '#1e3356', strokeWidth: 1.5, strokeLinecap: 'round' }
  const WSTYLE = { stroke: '#f59e0b55', strokeWidth: 1.5, strokeLinecap: 'round' }

  // Determine if a connection is on the winner's path
  const wonPath = (fromTla, toMatchNum) =>
    fromTla && getWinner(toMatchNum) === fromTla

  const lines = []

  // R32 teams → Pair nodes
  for (let k = 0; k < 16; k++) {
    const mn   = R32_MNS[k]
    const won  = getWinner(mn)
    const tla0 = getTeam(mn, 'home')
    const tla1 = getTeam(mn, 'away')
    const [mx, my] = polar(R_PAIR, pairAngle(k))
    const [x0, y0] = polar(R_OUTER, toRad(k * 2))
    const [x1, y1] = polar(R_OUTER, toRad(k * 2 + 1))
    lines.push(
      <line key={`p0-${k}`} x1={x0} y1={y0} x2={mx} y2={my}
        {...(won === tla0 ? WSTYLE : LSTYLE)} />,
      <line key={`p1-${k}`} x1={x1} y1={y1} x2={mx} y2={my}
        {...(won === tla1 ? WSTYLE : LSTYLE)} />,
    )
  }

  // Pair nodes → R16 nodes
  for (let j = 0; j < 8; j++) {
    const mn16 = R16_MNS[j]
    const [rx, ry] = polar(R_R16, r16Angle(j))
    for (let p = 0; p < 2; p++) {
      const k    = j * 2 + p
      const pairW = getWinner(R32_MNS[k])
      const [px, py] = polar(R_PAIR, pairAngle(k))
      lines.push(
        <line key={`r16-${j}-${p}`} x1={px} y1={py} x2={rx} y2={ry}
          {...(wonPath(pairW, mn16) ? WSTYLE : LSTYLE)} />,
      )
    }
  }

  // R16 nodes → QF nodes
  for (let i = 0; i < 4; i++) {
    const mnQF = QF_MNS[i]
    const [qx, qy] = polar(R_QF, qfAngle(i))
    for (let p = 0; p < 2; p++) {
      const j    = i * 2 + p
      const r16W = getWinner(R16_MNS[j])
      const [rx, ry] = polar(R_R16, r16Angle(j))
      lines.push(
        <line key={`qf-${i}-${p}`} x1={rx} y1={ry} x2={qx} y2={qy}
          {...(wonPath(r16W, mnQF) ? WSTYLE : LSTYLE)} />,
      )
    }
  }

  // QF nodes → SF nodes
  for (let i = 0; i < 2; i++) {
    const mnSF = SF_MNS[i]
    const [sx, sy] = polar(R_SF, sfAngle(i))
    for (let p = 0; p < 2; p++) {
      const qi   = i * 2 + p
      const qfW  = getWinner(QF_MNS[qi])
      const [qx, qy] = polar(R_QF, qfAngle(qi))
      lines.push(
        <line key={`sf-${i}-${p}`} x1={qx} y1={qy} x2={sx} y2={sy}
          {...(wonPath(qfW, mnSF) ? WSTYLE : LSTYLE)} />,
      )
    }
  }

  // SF nodes → Final
  const wonFinal = getWinner(104)
  for (let i = 0; i < 2; i++) {
    const sfW  = getWinner(SF_MNS[i])
    const [sx, sy] = polar(R_SF, sfAngle(i))
    lines.push(
      <line key={`fin-${i}`} x1={sx} y1={sy} x2={CX} y2={CY}
        {...(wonFinal && wonFinal === sfW ? WSTYLE : LSTYLE)} />,
    )
  }

  return (
    <div className="flex flex-col items-center px-2 pt-3 pb-6">
      <div className="w-full" style={{ maxWidth: 600 }}>
        <svg viewBox={`0 0 ${S} ${S}`} className="w-full h-auto">
          {/* Circular background */}
          <circle cx={CX} cy={CY} r={R_OUTER + FR + 14} fill="#0d1117" />

          {/* All bracket lines */}
          {lines}

          {/* Final — center */}
          {wonFinal
            ? <FlagNode cx={CX} cy={CY} r={24} tla={wonFinal} glow />
            : <>
                <circle cx={CX} cy={CY} r={24} fill="#0d1117" stroke="#1e3356" strokeWidth={1} />
                <text x={CX} y={CY + 8} textAnchor="middle" fontSize={22}>🏆</text>
              </>
          }

          {/* SF nodes */}
          {SF_MNS.map((mn, i) => {
            const [sx, sy] = polar(R_SF, sfAngle(i))
            return <FlagNode key={`sfn-${i}`} cx={sx} cy={sy} r={FR} tla={getWinner(mn)} />
          })}

          {/* QF nodes */}
          {QF_MNS.map((mn, i) => {
            const [qx, qy] = polar(R_QF, qfAngle(i))
            return <FlagNode key={`qfn-${i}`} cx={qx} cy={qy} r={FR} tla={getWinner(mn)} />
          })}

          {/* R16 nodes */}
          {R16_MNS.map((mn, j) => {
            const [rx, ry] = polar(R_R16, r16Angle(j))
            return <FlagNode key={`r16n-${j}`} cx={rx} cy={ry} r={FR} tla={getWinner(mn)} />
          })}

          {/* Pair (R32 result) nodes */}
          {R32_MNS.map((mn, k) => {
            const [px, py] = polar(R_PAIR, pairAngle(k))
            return <FlagNode key={`pn-${k}`} cx={px} cy={py} r={FR} tla={getWinner(mn)} />
          })}

          {/* Outer team flags */}
          {OUTER.map(([mn, side], idx) => {
            const [fx, fy] = polar(R_OUTER, toRad(idx))
            return (
              <FlagNode
                key={`o-${idx}`}
                cx={fx} cy={fy} r={FR}
                tla={getTeam(mn, side)}
                dim={isElim(mn, side)}
              />
            )
          })}

          {/* Kickoff date/time labels for all bracket rings — rendered last so they sit above flags */}
          {[
            { mns: R32_MNS, angleOf: k => pairAngle(k), radius: R_LABEL,       prefix: 'r32' },
            { mns: R16_MNS, angleOf: j => r16Angle(j),  radius: R_LABEL_R16,   prefix: 'r16' },
            { mns: QF_MNS,  angleOf: i => qfAngle(i),   radius: R_LABEL_QF,    prefix: 'qf'  },
            { mns: SF_MNS,  angleOf: i => sfAngle(i),   radius: R_LABEL_SF,    prefix: 'sf'  },
          ].flatMap(({ mns, angleOf, radius, prefix }) =>
            mns.map((mn, idx) => {
              const m = byNum[mn]
              if (!m) return null
              const { time, date } = fmtKickoff(m.kickoff_utc)
              if (!time && !date) return null
              const key  = `${prefix}-${idx}`
              const a    = angleOf(idx)
              const aDeg = a * 180 / Math.PI
              const [lx, ly] = polar(radius, a)
              const rot  = (aDeg >= 0 && aDeg <= 180) ? aDeg - 90 : aDeg + 90
              const isHovered = hoveredLabel === key
              const done = m.status === 'completed'
              return (
                <g key={`lbl-${key}`} transform={`translate(${lx},${ly}) rotate(${rot})`}
                  style={{ cursor: 'default' }}
                  onMouseEnter={() => setHoveredLabel(key)}
                  onMouseLeave={() => setHoveredLabel(null)}
                >
                  <rect x={-24} y={-14} width={48} height={28} fill="transparent" />
                  <g style={{
                    transform: isHovered ? 'scale(2.4)' : 'scale(1)',
                    transformOrigin: '0px 0px',
                    transition: 'transform 0.15s ease',
                  }}>
                    {isHovered && (
                      <rect x={-26} y={-14} width={52} height={28} rx={5}
                        fill="#0a0f1c" stroke="#334155" strokeWidth={0.6} opacity={0.95} />
                    )}
                    <text textAnchor="middle" fontSize={8.5} fontWeight="600"
                      fill={done ? '#6b7280' : '#f1f5f9'} y={-3}>
                      {time}
                    </text>
                    <text textAnchor="middle" fontSize={7}
                      fill={done ? '#4b5563' : '#cbd5e1'} y={7}>
                      {date}
                    </text>
                  </g>
                </g>
              )
            })
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-6 text-xs text-gray-500 mt-1">
        <span className="flex items-center gap-1.5">
          <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#f59e0b" strokeWidth="2" /></svg>
          Winner path
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#1e3356" strokeWidth="2" /></svg>
          Upcoming
        </span>
      </div>
    </div>
  )
}
