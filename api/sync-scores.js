/**
 * POST /api/sync-scores
 *
 * Fetches live/finished scores from football-data.org,
 * updates the Supabase `matches` table, and awards points
 * for any match that just completed.
 *
 * Knockout automation:
 *   A) Fills confirmed team TLAs into TBD R32 slots from FD data
 *   B) Safety-net: auto-inserts R16+ matches from FD if not already in DB
 *   C) Bracket propagation: when a match completes, writes the winner's TLA
 *      directly into the next match's slot using the hardcoded bracket map
 *
 * Called by cron-job.org every 2 minutes.
 * Protected by CRON_SECRET header to block unauthorised calls.
 *
 * Required Vercel env vars:
 *   VITE_SUPABASE_URL       SUPABASE_SERVICE_KEY
 *   FOOTBALL_DATA_API_KEY   CRON_SECRET
 */

import { createClient } from '@supabase/supabase-js'

const STATUS_MAP = {
  SCHEDULED:        'scheduled',
  TIMED:            'scheduled',
  IN_PLAY:          'live',
  PAUSED:           'live',
  EXTRA_TIME:       'live',
  PENALTY_SHOOTOUT: 'live',
  FINISHED:         'completed',
  AWARDED:          'completed',
  POSTPONED:        'scheduled',
  CANCELLED:        'scheduled',
  SUSPENDED:        'scheduled',
}

const STAGE_TO_ROUND = {
  LAST_32:        'R32',
  LAST_16:        'R16',
  QUARTER_FINALS: 'QF',
  SEMI_FINALS:    'SF',
  THIRD_PLACE:    '3P',
  FINAL:          'F',
}

// ── Bracket map ───────────────────────────────────────────────────────────────
// For each match number, where does the winner (and loser for SF) go?
// pos: 'home' | 'away'   take: 'winner' | 'loser' (default: winner)
const BRACKET = {
  // R32 → R16
  73: { next: 90, pos: 'home' },   // W73 → M90 home (vs W75)
  74: { next: 89, pos: 'home' },   // W74 → M89 home (vs W77)
  75: { next: 90, pos: 'away' },   // W75 → M90 away
  76: { next: 91, pos: 'home' },   // W76 → M91 home (vs W78)
  77: { next: 89, pos: 'away' },   // W77 → M89 away
  78: { next: 91, pos: 'away' },   // W78 → M91 away
  79: { next: 92, pos: 'home' },   // W79 → M92 home (vs W80)
  80: { next: 92, pos: 'away' },   // W80 → M92 away
  81: { next: 94, pos: 'home' },   // W81 → M94 home (vs W82)
  82: { next: 94, pos: 'away' },   // W82 → M94 away
  83: { next: 93, pos: 'home' },   // W83 → M93 home (vs W84)
  84: { next: 93, pos: 'away' },   // W84 → M93 away
  85: { next: 96, pos: 'home' },   // W85 → M96 home (vs W87)
  86: { next: 95, pos: 'home' },   // W86 → M95 home (vs W88)
  87: { next: 96, pos: 'away' },   // W87 → M96 away
  88: { next: 95, pos: 'away' },   // W88 → M95 away
  // R16 → QF
  89: { next: 97, pos: 'home' },
  90: { next: 97, pos: 'away' },
  91: { next: 99, pos: 'home' },
  92: { next: 99, pos: 'away' },
  93: { next: 98, pos: 'home' },
  94: { next: 98, pos: 'away' },
  95: { next: 100, pos: 'home' },
  96: { next: 100, pos: 'away' },
  // QF → SF
  97:  { next: 101, pos: 'home' },
  98:  { next: 101, pos: 'away' },
  99:  { next: 102, pos: 'home' },
  100: { next: 102, pos: 'away' },
  // SF → Final (winner) + 3P (loser)
  101: [
    { next: 104, pos: 'home', take: 'winner' },
    { next: 103, pos: 'home', take: 'loser'  },
  ],
  102: [
    { next: 104, pos: 'away', take: 'winner' },
    { next: 103, pos: 'away', take: 'loser'  },
  ],
}

const VENUE_BY_KICKOFF = {}  // optional venue override for FD auto-inserts


export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed — use POST' })

  const incomingSecret = req.headers['x-cron-secret']
  if (!incomingSecret || incomingSecret !== process.env.CRON_SECRET)
    return res.status(401).json({ error: 'Unauthorized' })

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  if (!supabaseUrl)
    return res.status(500).json({ error: 'VITE_SUPABASE_URL is not set' })

  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY)

  // 1. Fetch all WC2026 matches from football-data.org ─────────────────────
  const fdAbort   = new AbortController()
  const fdTimeout = setTimeout(() => fdAbort.abort(), 20_000)
  let fdResponse
  try {
    fdResponse = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { signal: fdAbort.signal, headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY } }
    )
  } catch (fetchErr) {
    clearTimeout(fdTimeout)
    return res.status(200).json({ skipped: true, reason: `fd_fetch_error: ${fetchErr.message}`, ts: new Date().toISOString() })
  }
  clearTimeout(fdTimeout)

  if (fdResponse.status === 429)
    return res.status(200).json({ skipped: true, reason: 'fd_rate_limited', ts: new Date().toISOString() })
  if (!fdResponse.ok)
    return res.status(200).json({ skipped: true, reason: `fd_error_${fdResponse.status}`, ts: new Date().toISOString() })

  let fdBody
  try { fdBody = await fdResponse.json() }
  catch (parseErr) {
    return res.status(200).json({ skipped: true, reason: `fd_parse_error: ${parseErr.message}`, ts: new Date().toISOString() })
  }
  const fdMatches = fdBody.matches ?? []

  // 2. Fetch ALL matches from Supabase ─────────────────────────────────────
  const { data: allDbMatches, error: dbError } = await supabase
    .from('matches')
    .select('id, home_team, away_team, kickoff_utc, status, home_score, away_score, penalty_winner, round, matchday, match_number')

  if (dbError)
    return res.status(200).json({ skipped: true, reason: `db_fetch_error: ${dbError.message}`, ts: new Date().toISOString() })

  const dbMatches = allDbMatches ?? []

  // Build a match_number → DB row map for fast bracket lookups
  const dbByMatchNum = Object.fromEntries(
    dbMatches.filter(m => m.match_number).map(m => [m.match_number, m])
  )

  // ── Helper: find FD match for a DB row ───────────────────────────────────
  function findFdMatch(dbMatch) {
    const dbKickoffMs = new Date(dbMatch.kickoff_utc).getTime()
    return fdMatches.find(m => {
      if (dbMatch.home_team && dbMatch.away_team && m.homeTeam?.tla && m.awayTeam?.tla)
        return m.homeTeam.tla === dbMatch.home_team && m.awayTeam.tla === dbMatch.away_team
      // Wider ±90 min window — FD times can differ by ~1 hour from seeded values
      return Math.abs(new Date(m.utcDate).getTime() - dbKickoffMs) < 90 * 60 * 1000
    })
  }

  // ── Helper: determine winner/loser TLA from scores ───────────────────────
  function getOutcome(home_team, away_team, home_score, away_score, penalty_winner) {
    if (penalty_winner) {
      const loser = penalty_winner === home_team ? away_team : home_team
      return { winner: penalty_winner, loser }
    }
    if (home_score > away_score) return { winner: home_team,  loser: away_team  }
    if (away_score > home_score) return { winner: away_team,  loser: home_team  }
    return null  // shouldn't occur in KO after ET
  }

  // 3. Diff scores for non-completed matches ───────────────────────────────
  const toUpdate       = []
  const newlyComplete  = []
  const bracketUpdates = []  // { matchNum, winner, loser } for completed KO matches

  for (const dbMatch of dbMatches.filter(m => m.status !== 'completed')) {
    const fdMatch = findFdMatch(dbMatch)
    if (!fdMatch) continue

    const newStatus = STATUS_MAP[fdMatch.status] ?? 'scheduled'
    const duration  = fdMatch.score?.duration
    const newMinute = fdMatch.minute ?? null

    let newHome, newAway, newPenaltyWinner
    if (duration === 'EXTRA_TIME' || duration === 'PENALTY_SHOOTOUT') {
      const ftHome = fdMatch.score?.fullTime?.home  ?? 0
      const ftAway = fdMatch.score?.fullTime?.away  ?? 0
      const etHome = fdMatch.score?.extraTime?.home ?? 0
      const etAway = fdMatch.score?.extraTime?.away ?? 0
      newHome = ftHome + etHome
      newAway = ftAway + etAway
      if (duration === 'PENALTY_SHOOTOUT') {
        if (fdMatch.score?.winner === 'HOME_TEAM')
          newPenaltyWinner = dbMatch.home_team || fdMatch.homeTeam?.tla || null
        else if (fdMatch.score?.winner === 'AWAY_TEAM')
          newPenaltyWinner = dbMatch.away_team || fdMatch.awayTeam?.tla || null
      }
    } else {
      newHome = fdMatch.score?.fullTime?.home ?? null
      newAway = fdMatch.score?.fullTime?.away ?? null
    }

    const changed =
      newStatus !== dbMatch.status     ||
      newHome   !== dbMatch.home_score ||
      newAway   !== dbMatch.away_score ||
      (newPenaltyWinner != null && newPenaltyWinner !== dbMatch.penalty_winner)

    if (!changed) continue

    toUpdate.push({ id: dbMatch.id, status: newStatus, home_score: newHome,
                    away_score: newAway, match_minute: newMinute,
                    penalty_winner: newPenaltyWinner ?? dbMatch.penalty_winner ?? null })

    if (newStatus === 'completed' && dbMatch.status !== 'completed') {
      newlyComplete.push(dbMatch.id)

      // Queue bracket propagation for KO matches with a match_number
      if (dbMatch.match_number && BRACKET[dbMatch.match_number]) {
        const outcome = getOutcome(
          dbMatch.home_team, dbMatch.away_team,
          newHome, newAway,
          newPenaltyWinner ?? dbMatch.penalty_winner
        )
        if (outcome) bracketUpdates.push({ matchNum: dbMatch.match_number, ...outcome })
      }
    }
  }

  // 4. Write score updates ──────────────────────────────────────────────────
  for (const { id, status, home_score, away_score, match_minute, penalty_winner } of toUpdate) {
    const { error: updateError } = await supabase
      .from('matches')
      .update({ status, home_score, away_score, match_minute, penalty_winner })
      .eq('id', id)
    if (updateError)
      return res.status(200).json({ skipped: true, reason: `db_update_error: ${updateError.message}`, ts: new Date().toISOString() })
  }

  // 5. Award points for newly completed matches ─────────────────────────────
  const scoringErrors = []
  for (const matchId of newlyComplete) {
    const { error: rpcError } = await supabase.rpc('score_predictions_for_match', { match_id_in: matchId })
    if (rpcError) scoringErrors.push({ matchId, error: rpcError.message })
  }

  // ── A. Fill confirmed TLAs into TBD slots from FD ────────────────────────
  const tbdMatches = dbMatches.filter(m => !m.home_team || !m.away_team)
  let tbdUpdated = 0
  for (const dbMatch of tbdMatches) {
    const fdMatch = findFdMatch(dbMatch)
    if (!fdMatch) continue
    const update = {}
    if (!dbMatch.home_team && fdMatch.homeTeam?.tla) { update.home_team = fdMatch.homeTeam.tla; update.home_label = null }
    if (!dbMatch.away_team && fdMatch.awayTeam?.tla) { update.away_team = fdMatch.awayTeam.tla; update.away_label = null }
    if (!Object.keys(update).length) continue
    // Correct kickoff_utc to FD's value to avoid ±1h drift issues
    if (fdMatch.utcDate && fdMatch.utcDate !== dbMatch.kickoff_utc) update.kickoff_utc = fdMatch.utcDate
    const { error } = await supabase.from('matches').update(update).eq('id', dbMatch.id)
    if (!error) tbdUpdated++
  }

  // ── B. Safety-net: auto-insert R16+ matches from FD if not in DB ─────────
  const dbKickoffMs = new Set(dbMatches.map(m => new Date(m.kickoff_utc).getTime()))
  const fdKoMatches = fdMatches.filter(m => { const r = STAGE_TO_ROUND[m.stage]; return r && r !== 'R32' })
  let koInserted = 0
  for (const fdm of fdKoMatches) {
    const kickMs = new Date(fdm.utcDate).getTime()
    if ([...dbKickoffMs].some(t => Math.abs(t - kickMs) < 90 * 60 * 1000)) continue
    const round  = STAGE_TO_ROUND[fdm.stage]
    const status = STATUS_MAP[fdm.status] ?? 'scheduled'
    const venue  = VENUE_BY_KICKOFF[fdm.utcDate] ?? {}
    let home_score = fdm.score?.fullTime?.home ?? null
    let away_score = fdm.score?.fullTime?.away ?? null
    let penalty_winner = null
    const dur = fdm.score?.duration
    if (dur === 'EXTRA_TIME' || dur === 'PENALTY_SHOOTOUT') {
      home_score = (fdm.score?.fullTime?.home ?? 0) + (fdm.score?.extraTime?.home ?? 0)
      away_score = (fdm.score?.fullTime?.away ?? 0) + (fdm.score?.extraTime?.away ?? 0)
      if (dur === 'PENALTY_SHOOTOUT') {
        if (fdm.score?.winner === 'HOME_TEAM') penalty_winner = fdm.homeTeam?.tla || null
        if (fdm.score?.winner === 'AWAY_TEAM') penalty_winner = fdm.awayTeam?.tla || null
      }
    }
    const { error } = await supabase.from('matches').insert({
      home_team: fdm.homeTeam?.tla || null, home_label: fdm.homeTeam?.tla ? null : (fdm.homeTeam?.name ?? null),
      away_team: fdm.awayTeam?.tla || null, away_label: fdm.awayTeam?.tla ? null : (fdm.awayTeam?.name ?? null),
      kickoff_utc: fdm.utcDate, venue_stadium: venue.stadium ?? null,
      venue_city: venue.city ?? null, venue_country: venue.country ?? null,
      round, status, home_score, away_score, penalty_winner,
    })
    if (!error) { koInserted++; dbKickoffMs.add(kickMs) }
  }

  // ── C. Bracket propagation ────────────────────────────────────────────────
  // For each newly completed KO match, write the winner's TLA into the next
  // match's home_team or away_team slot. Uses the pre-seeded match_number column.
  const bracketErrors = []
  let bracketPropagated = 0
  for (const { matchNum, winner, loser } of bracketUpdates) {
    const entries = Array.isArray(BRACKET[matchNum])
      ? BRACKET[matchNum]
      : [{ ...BRACKET[matchNum], take: 'winner' }]

    for (const { next, pos, take } of entries) {
      const tla = take === 'loser' ? loser : winner
      if (!tla) continue

      const col      = pos === 'home' ? 'home_team'  : 'away_team'
      const labelCol = pos === 'home' ? 'home_label' : 'away_label'

      // Only update if the slot is still empty (don't overwrite manual corrections)
      const targetMatch = dbByMatchNum[next]
      if (!targetMatch) { bracketErrors.push({ matchNum, next, reason: 'target match not found' }); continue }
      if (targetMatch[col]) continue  // already filled

      const { error } = await supabase
        .from('matches')
        .update({ [col]: tla, [labelCol]: null })
        .eq('match_number', next)

      if (error) bracketErrors.push({ matchNum, next, error: error.message })
      else bracketPropagated++
    }
  }

  return res.status(200).json({
    checked:            dbMatches.filter(m => m.status !== 'completed').length,
    updated:            toUpdate.length,
    newlyScored:        newlyComplete.length,
    scoredMatchIds:     newlyComplete,
    scoringErrors:      scoringErrors.length      ? scoringErrors      : undefined,
    tbdSlotsFixed:      tbdUpdated,
    koInserted,
    bracketPropagated,
    bracketErrors:      bracketErrors.length       ? bracketErrors      : undefined,
    fdMatchCount:       fdMatches.length,
    ts:                 new Date().toISOString(),
  })
}
