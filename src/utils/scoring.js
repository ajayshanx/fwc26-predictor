/**
 * Calculate points for a single prediction against a completed match result.
 *
 * MD1 & MD2:  Exact score = 5 | Correct result = 3 | Participated = 1
 * MD3+:       Exact score = 5 | Correct GD = 4 | Correct result = 3 | Participated = 1
 *
 * KO penalty shootout:
 *   5 = exact AET score + right penalty winner
 *   4 = right GD + predicted draw + right penalty winner
 *   3 = exact AET score (wrong winner) OR predicted right team outright (non-draw)
 *   1 = wrong winner or wrong draw pick
 *
 * "MD3+" includes matchday >= 3 AND knockout matches (matchday null).
 */
export function calcPoints(prediction, match) {
  if (!prediction) return 0
  if (match.status !== 'completed') return null  // pending

  const { home_score: ph, away_score: pa, tiebreak_winner: tw } = prediction
  const { home_score: mh, away_score: ma, matchday, penalty_winner } = match
  const isKO = matchday === null || matchday === undefined

  // ── Knockout penalty scenario ────────────────────────────────────────────
  if (isKO && penalty_winner) {
    const { home_team, away_team } = match
    const predictedDraw = ph === pa
    const exactScore    = ph === mh && pa === ma
    const correctGD     = (ph - pa) === (mh - ma)  // for draws: 0 === 0
    const rightWinner   = tw === penalty_winner
    // Non-draw prediction: did they implicitly pick the right team?
    const impliedWinner = !predictedDraw ? (ph > pa ? home_team : away_team) : null
    const rightDirection = impliedWinner === penalty_winner
    if (exactScore && rightWinner) return 5    // exact score + right winner
    if (correctGD && rightWinner && predictedDraw) return 4  // e.g. predict 2-2, match 1-1, right winner
    if (exactScore || (!predictedDraw && rightDirection)) return 3  // exact score OR right team outright
    return 1                                   // wrong winner or wrong draw pick
  }

  // ── Normal match (90-min or ET goal result) ──────────────────────────────
  if (ph === mh && pa === ma) return 5

  const correctResult = Math.sign(ph - pa) === Math.sign(mh - ma)
  const md3plus       = isKO || matchday >= 3

  if (correctResult && md3plus && (ph - pa) === (mh - ma)) return 4
  if (correctResult) return 3
  return 1
}

/**
 * Determine result colour class for a completed match row.
 * White   = no prediction
 * Gold    = correct result, wrong score
 * Blue    = correct goal difference (MD3+)
 * Red     = wrong result
 * Green   = exact score
 */
export function resultColour(prediction, match) {
  if (match.status !== 'completed') return ''
  if (!prediction) return 'text-white'

  const pts = calcPoints(prediction, match)
  if (pts === 5) return 'text-green-400'
  if (pts === 4) return 'text-blue-400'
  if (pts === 3) return 'text-gold'
  return 'text-red-400'
}

/**
 * Is this match still open for predictions? (>1 hour before kickoff)
 */
export function isPredictionOpen(match) {
  if (match.status !== 'scheduled') return false
  const kickoff = new Date(match.kickoff_utc)
  const cutoff  = new Date(kickoff.getTime() - 60 * 60 * 1000)
  return new Date() < cutoff
}

/**
 * Aggregate total points, predictions count, accuracy, precision for a user.
 */
export function aggregateStats(predictions, matches) {
  let totalPoints   = 0
  let predicted     = 0
  let correctResult = 0
  let exactScore    = 0
  let completed     = 0

  matches.forEach(m => {
    const pred = predictions.find(p => p.match_id === m.id)
    if (pred) predicted++

    if (m.status === 'completed') {
      completed++
      const pts = calcPoints(pred, m)
      if (pts !== null && pts > 0) {
        totalPoints += pts
        if (pts >= 3) correctResult++
        if (pts === 5) exactScore++
      }
    }
  })

  const completedPredicted = predictions.filter(p => {
    const m = matches.find(x => x.id === p.match_id)
    return m && m.status === 'completed'
  }).length

  const accuracy  = completedPredicted > 0 ? Math.round((correctResult / completedPredicted) * 100) : null
  const precision = completedPredicted > 0 ? Math.round((exactScore    / completedPredicted) * 100) : null

  return { totalPoints, predicted, total: matches.length, accuracy, precision }
}
