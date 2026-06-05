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

  // Guard against malformed Supabase URL (strip accidental trailing slash)
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  if (!supabaseUrl)
    return res.status(500).json({ error: 'VITE_SUPABASE_URL is not set' })

  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY)

  try {
    // 1. Fetch all WC2026 matches from football-data.org ─────────────────────
    const fdResponse = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      {
        headers: {
          'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    )
    if (!fdResponse.ok) {
      return res.status(502).json({
        error: `football-data.org returned ${fdResponse.status} ${fdResponse.statusText}`,
      })
    }
    const { matches: fdMatches } = await fdResponse.json()

    // 2. Fetch all non-completed matches from Supabase ───────────────────────
    const { data: dbMatches, error: dbError } = await supabase
      .from('matches')
      .select('id, home_team, away_team, kickoff_utc, status, home_score, away_score')
      .neq('status', 'completed')

    if (dbError) return res.status(500).json({ error: dbError.message })
    if (!dbMatches?.length)
      return res.status(200).json({ message: 'No pending matches to sync', ts: new Date().toISOString() })

    // 3. Diff against football-data.org results ──────────────────────────────
    const toUpdate      = []
    const newlyComplete = []

    for (const dbMatch of dbMatches) {
      const dbKickoffMs = new Date(dbMatch.kickoff_utc).getTime()

      // Match by kickoff time within a ±30-minute window
      const fdMatch = fdMatches?.find(m =>
        Math.abs(new Date(m.utcDate).getTime() - dbKickoffMs) < 30 * 60 * 1000
      )
      if (!fdMatch) continue

      const newStatus = STATUS_MAP[fdMatch.status] ?? 'scheduled'
      const newHome   = fdMatch.score?.fullTime?.home ?? null
      const newAway   = fdMatch.score?.fullTime?.away ?? null
      const newMinute = fdMatch.minute                ?? null

      const changed =
        newStatus !== dbMatch.status     ||
        newHome   !== dbMatch.home_score ||
        newAway   !== dbMatch.away_score

      if (!changed) continue

      toUpdate.push({ id: dbMatch.id, status: newStatus, home_score: newHome, away_score: newAway, match_minute: newMinute })

      if (newStatus === 'completed' && dbMatch.status !== 'completed')
        newlyComplete.push(dbMatch.id)
    }

    // 4. Write updates to Supabase ───────────────────────────────────────────
    if (toUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from('matches')
        .upsert(toUpdate, { onConflict: 'id' })
      if (updateError) return res.status(500).json({ error: updateError.message })
    }

    // 5. Award points for newly completed matches ─────────────────────────────
    for (const matchId of newlyComplete) {
      const { error: rpcError } = await supabase.rpc('score_predictions_for_match', {
        match_id_in: matchId,
      })
      if (rpcError) console.error(`Scoring failed for match ${matchId}:`, rpcError.message)
    }

    return res.status(200).json({
      checked:        dbMatches.length,
      updated:        toUpdate.length,
      newlyScored:    newlyComplete.length,
      scoredMatchIds: newlyComplete,
      ts:             new Date().toISOString(),
    })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
