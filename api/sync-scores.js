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

/** Fetch a single match detail from FD to get the goals array. */
async function fetchFdMatchGoals(fdMatchId, apiKey) {
  try {
    const res = await fetch(
      `https://api.football-data.org/v4/matches/${fdMatchId}`,
      { headers: { 'X-Auth-Token': apiKey } }
    )
    if (!res.ok) return null
    const body = await res.json()
    return body.goals ?? null
  } catch {
    return null
  }
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

  const supabase  = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY)
  const apiKey    = process.env.FOOTBALL_DATA_API_KEY

  // 1. Fetch all WC2026 matches from football-data.org ─────────────────────
  const fdAbort    = new AbortController()
  const fdTimeout  = setTimeout(() => fdAbort.abort(), 20_000)
  let fdResponse
  try {
    fdResponse = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      {
        signal: fdAbort.signal,
        headers: { 'X-Auth-Token': apiKey },
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

  // 2. Fetch pending matches + completed matches missing goals ─────────────
  const { data: dbMatches, error: dbError } = await supabase
    .from('matches')
    .select('id, home_team, away_team, kickoff_utc, status, home_score, away_score, goals_json, fd_match_id')
    .or('status.neq.completed,goals_json.is.null')

  if (dbError)
    return res.status(200).json({ skipped: true, reason: `db_fetch_error: ${dbError.message}`, ts: new Date().toISOString() })

  if (!dbMatches?.length)
    return res.status(200).json({ message: 'No pending matches to sync', ts: new Date().toISOString() })

  // 3. Diff against football-data.org results ──────────────────────────────
  const toUpdate      = []
  const newlyComplete = []

  for (const dbMatch of dbMatches) {
    const dbKickoffMs = new Date(dbMatch.kickoff_utc).getTime()

    const fdMatch = fdMatches?.find(m =>
      Math.abs(new Date(m.utcDate).getTime() - dbKickoffMs) < 30 * 60 * 1000
    )
    if (!fdMatch) continue

    const newStatus  = STATUS_MAP[fdMatch.status] ?? 'scheduled'
    const newHome    = fdMatch.score?.fullTime?.home ?? null
    const newAway    = fdMatch.score?.fullTime?.away ?? null
    const newMinute  = fdMatch.minute ?? null
    const fdMatchId  = fdMatch.id   // integer from FD

    const goalsEmpty = !dbMatch.goals_json || dbMatch.goals_json.length === 0
    const isComplete = newStatus === 'completed'

    const statusChanged =
      newStatus !== dbMatch.status ||
      newHome   !== dbMatch.home_score ||
      newAway   !== dbMatch.away_score

    // Fetch goals via individual match endpoint when:
    //   a) match is complete and goals are missing, OR
    //   b) match just transitioned to complete
    let newGoals = null
    if (isComplete && goalsEmpty) {
      newGoals = await fetchFdMatchGoals(fdMatchId, apiKey)
    }

    const changed = statusChanged || (newGoals && newGoals.length > 0)
    if (!changed) continue

    const row = {
      id:           dbMatch.id,
      status:       newStatus,
      home_score:   newHome,
      away_score:   newAway,
      match_minute: newMinute,
      fd_match_id:  fdMatchId,
    }
    if (newGoals !== null) row.goals_json = newGoals

    toUpdate.push(row)

    if (newStatus === 'completed' && dbMatch.status !== 'completed')
      newlyComplete.push(dbMatch.id)
  }

  // 4. Write updates to Supabase ───────────────────────────────────────────
  if (toUpdate.length > 0) {
    const { error: updateError } = await supabase
      .from('matches')
      .upsert(toUpdate, { onConflict: 'id' })
    if (updateError)
      return res.status(200).json({ skipped: true, reason: `db_upsert_error: ${updateError.message}`, updated: 0, ts: new Date().toISOString() })
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
