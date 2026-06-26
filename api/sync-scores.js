/**
 * POST /api/sync-scores
 *
 * Fetches live/finished scores from football-data.org,
 * updates the Supabase `matches` table, and awards points
 * for any match that just completed.
 *
 * Called by cron-job.org every 2 minutes.
 * Protected by CRON_SECRET header to block unauthorised calls.
 *
 * IMPORTANT: transient errors (FD timeout, rate-limit, network blip) return
 * HTTP 200 with an `error` field so cron-job.org does NOT retry and does NOT
 * disable the job. Only hard config errors (missing env vars, bad secret)
 * return 4xx/5xx.
 *
 * Required Vercel env vars:
 *   VITE_SUPABASE_URL         — bare project URL, no trailing slash
 *   SUPABASE_SERVICE_KEY      — Supabase service_role key (Settings → API)
 *   FOOTBALL_DATA_API_KEY     — free key from football-data.org
 *   CRON_SECRET               — random secret shared with cron-job.org
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
  const fdAbort    = new AbortController()
  const fdTimeout  = setTimeout(() => fdAbort.abort(), 20_000)
  let fdResponse
  try {
    fdResponse = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      {
        signal: fdAbort.signal,
        headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY },
      }
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
  try {
    fdBody = await fdResponse.json()
  } catch (parseErr) {
    return res.status(200).json({ skipped: true, reason: `fd_parse_error: ${parseErr.message}`, ts: new Date().toISOString() })
  }
  const fdMatches = fdBody.matches

  // 2. Fetch all non-completed matches from Supabase ───────────────────────
  const { data: dbMatches, error: dbError } = await supabase
    .from('matches')
    .select('id, home_team, away_team, kickoff_utc, status, home_score, away_score, penalty_winner')
    .neq('status', 'completed')

  if (dbError)
    return res.status(200).json({ skipped: true, reason: `db_fetch_error: ${dbError.message}`, ts: new Date().toISOString() })

  if (!dbMatches?.length)
    return res.status(200).json({ message: 'No pending matches to sync', ts: new Date().toISOString() })

  // 3. Diff against football-data.org results ──────────────────────────────
  const toUpdate      = []
  const newlyComplete = []

  for (const dbMatch of dbMatches) {
    const dbKickoffMs = new Date(dbMatch.kickoff_utc).getTime()

    // Match by TLA (primary) — same FIFA 3-letter codes used in both systems.
    // For KO matches with TBD slots (null home/away_team), fall back to kickoff-time window.
    const fdMatch = fdMatches?.find(m => {
      if (dbMatch.home_team && dbMatch.away_team && m.homeTeam?.tla && m.awayTeam?.tla) {
        return m.homeTeam.tla === dbMatch.home_team && m.awayTeam.tla === dbMatch.away_team
      }
      return Math.abs(new Date(m.utcDate).getTime() - dbKickoffMs) < 30 * 60 * 1000
    })
    if (!fdMatch) continue

    const newStatus   = STATUS_MAP[fdMatch.status] ?? 'scheduled'
    const duration    = fdMatch.score?.duration   // REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
    const newMinute   = fdMatch.minute ?? null

    // For ET and pens: goals = fullTime + extraTime combined.
    // football-data.org stores the *added* extra-time goals in score.extraTime.
    let newHome, newAway, newPenaltyWinner
    if (duration === 'EXTRA_TIME' || duration === 'PENALTY_SHOOTOUT') {
      const ftHome = fdMatch.score?.fullTime?.home  ?? 0
      const ftAway = fdMatch.score?.fullTime?.away  ?? 0
      const etHome = fdMatch.score?.extraTime?.home ?? 0
      const etAway = fdMatch.score?.extraTime?.away ?? 0
      newHome = ftHome + etHome
      newAway = ftAway + etAway
      if (duration === 'PENALTY_SHOOTOUT') {
        // score.winner = 'HOME_TEAM' | 'AWAY_TEAM'
        if (fdMatch.score?.winner === 'HOME_TEAM') {
          newPenaltyWinner = dbMatch.home_team || fdMatch.homeTeam?.tla || null
        } else if (fdMatch.score?.winner === 'AWAY_TEAM') {
          newPenaltyWinner = dbMatch.away_team || fdMatch.awayTeam?.tla || null
        }
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

    toUpdate.push({
      id: dbMatch.id,
      status:         newStatus,
      home_score:     newHome,
      away_score:     newAway,
      match_minute:   newMinute,
      penalty_winner: newPenaltyWinner ?? dbMatch.penalty_winner ?? null,
    })

    if (newStatus === 'completed' && dbMatch.status !== 'completed')
      newlyComplete.push(dbMatch.id)
  }

  // 4. Write updates to Supabase ───────────────────────────────────────────
  // Use .update() not .upsert() — rows always exist, upsert would try INSERT
  // first which hits NOT NULL on kickoff_utc before the conflict check fires.
  for (const { id, status, home_score, away_score, match_minute, penalty_winner } of toUpdate) {
    const { error: updateError } = await supabase
      .from('matches')
      .update({ status, home_score, away_score, match_minute, penalty_winner })
      .eq('id', id)
    if (updateError)
      return res.status(200).json({ skipped: true, reason: `db_update_error: ${updateError.message}`, updated: 0, ts: new Date().toISOString() })
  }

  // 5. Award points for newly completed matches ────────────────────────────
  const scoringErrors = []
  for (const matchId of newlyComplete) {
    const { error: rpcError } = await supabase.rpc('score_predictions_for_match', {
      match_id_in: matchId,
    })
    if (rpcError) scoringErrors.push({ matchId, error: rpcError.message })
  }

  return res.status(200).json({
    checked:        dbMatches.length,
    updated:        toUpdate.length,
    newlyScored:    newlyComplete.length,
    scoredMatchIds: newlyComplete,
    scoringErrors:  scoringErrors.length ? scoringErrors : undefined,
    fdMatchCount:   fdMatches?.length ?? 0,
    ts:             new Date().toISOString(),
  })
}
