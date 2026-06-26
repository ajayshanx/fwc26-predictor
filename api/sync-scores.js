/**
 * POST /api/sync-scores
 *
 * Fetches live/finished scores from football-data.org,
 * updates the Supabase `matches` table, and awards points
 * for any match that just completed.
 *
 * Also handles knockout-stage automation:
 *   A) Fills in confirmed team TLAs for R32 slots that were originally TBD
 *   B) Auto-inserts R16 / QF / SF / 3P / F matches when FD publishes them
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

// football-data.org stage → our round code
const STAGE_TO_ROUND = {
  LAST_32:        'R32',
  LAST_16:        'R16',
  QUARTER_FINALS: 'QF',
  SEMI_FINALS:    'SF',
  THIRD_PLACE:    '3P',
  FINAL:          'F',
}

// Venue lookup for auto-inserted KO matches.
// Keyed by kickoff UTC string (ISO, as returned by football-data.org).
// Add entries here if venue details matter — otherwise city/country will be null.
const VENUE_BY_KICKOFF = {}


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
      {
        signal:  fdAbort.signal,
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
  const fdMatches = fdBody.matches ?? []

  // 2. Fetch ALL matches from Supabase (needed for KO auto-insert dedup) ───
  const { data: allDbMatches, error: dbError } = await supabase
    .from('matches')
    .select('id, home_team, away_team, kickoff_utc, status, home_score, away_score, penalty_winner, round, matchday')

  if (dbError)
    return res.status(200).json({ skipped: true, reason: `db_fetch_error: ${dbError.message}`, ts: new Date().toISOString() })

  const dbMatches = allDbMatches ?? []

  // ── Helper: find an FD match for a DB row ────────────────────────────────
  function findFdMatch(dbMatch) {
    const dbKickoffMs = new Date(dbMatch.kickoff_utc).getTime()
    return fdMatches.find(m => {
      // Primary: TLA match (only when both sides are known)
      if (dbMatch.home_team && dbMatch.away_team && m.homeTeam?.tla && m.awayTeam?.tla) {
        return m.homeTeam.tla === dbMatch.home_team && m.awayTeam.tla === dbMatch.away_team
      }
      // Fallback: kickoff-time window ±90 min.
      // Use a wider window because FD's stored kickoff times can differ from our
      // seeded values by up to ~1 hour (timezone/DST edge cases in the source schedule).
      return Math.abs(new Date(m.utcDate).getTime() - dbKickoffMs) < 90 * 60 * 1000
    })
  }

  // 3. Diff scores for non-completed matches ───────────────────────────────
  const toUpdate      = []
  const newlyComplete = []

  for (const dbMatch of dbMatches.filter(m => m.status !== 'completed')) {
    const fdMatch = findFdMatch(dbMatch)
    if (!fdMatch) continue

    const newStatus = STATUS_MAP[fdMatch.status] ?? 'scheduled'
    const duration  = fdMatch.score?.duration  // REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
    const newMinute = fdMatch.minute ?? null

    // ET / pens: combine fullTime + extraTime goals
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

    toUpdate.push({
      id:             dbMatch.id,
      status:         newStatus,
      home_score:     newHome,
      away_score:     newAway,
      match_minute:   newMinute,
      penalty_winner: newPenaltyWinner ?? dbMatch.penalty_winner ?? null,
    })

    if (newStatus === 'completed' && dbMatch.status !== 'completed')
      newlyComplete.push(dbMatch.id)
  }

  // 4. Write score updates to Supabase ─────────────────────────────────────
  for (const { id, status, home_score, away_score, match_minute, penalty_winner } of toUpdate) {
    const { error: updateError } = await supabase
      .from('matches')
      .update({ status, home_score, away_score, match_minute, penalty_winner })
      .eq('id', id)
    if (updateError)
      return res.status(200).json({ skipped: true, reason: `db_update_error: ${updateError.message}`, updated: 0, ts: new Date().toISOString() })
  }

  // 5. Award points for newly completed matches ─────────────────────────────
  const scoringErrors = []
  for (const matchId of newlyComplete) {
    const { error: rpcError } = await supabase.rpc('score_predictions_for_match', {
      match_id_in: matchId,
    })
    if (rpcError) scoringErrors.push({ matchId, error: rpcError.message })
  }

  // ── A. Fill confirmed TLAs into TBD R32 slots ────────────────────────────
  // When the group stage ends, FD updates TBD team slots with real TLAs.
  // Find DB rows where home_team or away_team is null and update them.
  const tbdMatches = dbMatches.filter(m => !m.home_team || !m.away_team)
  let tbdUpdated = 0
  for (const dbMatch of tbdMatches) {
    const fdMatch = findFdMatch(dbMatch)
    if (!fdMatch) continue
    const update = {}
    if (!dbMatch.home_team && fdMatch.homeTeam?.tla) {
      update.home_team  = fdMatch.homeTeam.tla
      update.home_label = null
    }
    if (!dbMatch.away_team && fdMatch.awayTeam?.tla) {
      update.away_team  = fdMatch.awayTeam.tla
      update.away_label = null
    }
    if (!Object.keys(update).length) continue
    // Also correct the kickoff_utc to FD's value — our seeded times can be
    // up to ~1 hour off, which would break TLA-less score sync later.
    if (fdMatch.utcDate && fdMatch.utcDate !== dbMatch.kickoff_utc) {
      update.kickoff_utc = fdMatch.utcDate
    }
    const { error } = await supabase.from('matches').update(update).eq('id', dbMatch.id)
    if (!error) tbdUpdated++
  }

  // ── B. Auto-insert new KO rounds (R16, QF, SF, 3P, F) ───────────────────
  // FD publishes these as the tournament progresses. Insert any we don't have.
  const dbKickoffTimes = new Set(
    dbMatches.map(m => new Date(m.kickoff_utc).getTime())
  )

  const fdKoMatches = fdMatches.filter(m => {
    const round = STAGE_TO_ROUND[m.stage]
    return round && round !== 'R32'  // R32 already manually seeded
  })

  let koInserted = 0
  for (const fdm of fdKoMatches) {
    const kickoffMs = new Date(fdm.utcDate).getTime()
    // Skip if we already have a match within 30 min of this kickoff
    const alreadyExists = [...dbKickoffTimes].some(t => Math.abs(t - kickoffMs) < 30 * 60 * 1000)
    if (alreadyExists) continue

    const round  = STAGE_TO_ROUND[fdm.stage]
    const status = STATUS_MAP[fdm.status] ?? 'scheduled'
    const venue  = VENUE_BY_KICKOFF[fdm.utcDate] ?? {}

    // For ET/pens on auto-inserted matches that are already complete
    let home_score = fdm.score?.fullTime?.home ?? null
    let away_score = fdm.score?.fullTime?.away ?? null
    let penalty_winner = null
    const dur = fdm.score?.duration
    if (dur === 'EXTRA_TIME' || dur === 'PENALTY_SHOOTOUT') {
      home_score = (fdm.score?.fullTime?.home ?? 0) + (fdm.score?.extraTime?.home ?? 0)
      away_score = (fdm.score?.fullTime?.away ?? 0) + (fdm.score?.extraTime?.away ?? 0)
      if (dur === 'PENALTY_SHOOTOUT') {
        if (fdm.score?.winner === 'HOME_TEAM')  penalty_winner = fdm.homeTeam?.tla || null
        if (fdm.score?.winner === 'AWAY_TEAM')  penalty_winner = fdm.awayTeam?.tla || null
      }
    }

    const { error } = await supabase.from('matches').insert({
      home_team:       fdm.homeTeam?.tla  || null,
      away_team:       fdm.awayTeam?.tla  || null,
      home_label:      fdm.homeTeam?.tla  ? null : (fdm.homeTeam?.name  ?? null),
      away_label:      fdm.awayTeam?.tla  ? null : (fdm.awayTeam?.name  ?? null),
      kickoff_utc:     fdm.utcDate,
      venue_stadium:   venue.stadium ?? fdm.venue ?? null,
      venue_city:      venue.city    ?? null,
      venue_country:   venue.country ?? null,
      round,
      status,
      home_score,
      away_score,
      penalty_winner,
    })

    if (!error) {
      koInserted++
      dbKickoffTimes.add(kickoffMs)  // prevent re-inserting within this run
    }
  }

  return res.status(200).json({
    checked:        dbMatches.filter(m => m.status !== 'completed').length,
    updated:        toUpdate.length,
    newlyScored:    newlyComplete.length,
    scoredMatchIds: newlyComplete,
    scoringErrors:  scoringErrors.length ? scoringErrors : undefined,
    tbdSlotsFixed:  tbdUpdated,
    koRoundsAdded:  koInserted,
    fdMatchCount:   fdMatches.length,
    ts:             new Date().toISOString(),
  })
}
