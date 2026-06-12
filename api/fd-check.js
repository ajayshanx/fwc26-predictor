/**
 * GET /api/fd-check          — shows comparison + sync dry-run
 * GET /api/fd-check?run=1    — actually executes the sync writes
 *
 * Diagnostic endpoint. DELETE once sync is confirmed working.
 */
import { createClient } from '@supabase/supabase-js'

const STATUS_MAP = {
  SCHEDULED: 'scheduled', TIMED: 'scheduled',
  IN_PLAY: 'live', PAUSED: 'live', EXTRA_TIME: 'live', PENALTY_SHOOTOUT: 'live',
  FINISHED: 'completed', AWARDED: 'completed',
  POSTPONED: 'scheduled', CANCELLED: 'scheduled', SUSPENDED: 'scheduled',
}

export default async function handler(req, res) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'FOOTBALL_DATA_API_KEY not set' })

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY)
  const doWrite  = req.query.run === '1'

  // 1. Fetch from FD ──────────────────────────────────────────────────────────
  const fdRes = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
    { headers: { 'X-Auth-Token': apiKey } }
  )
  const body = await fdRes.json()
  if (!fdRes.ok) return res.status(502).json({ fdStatus: fdRes.status, fdMessage: body.message })

  const fdMatches = body.matches ?? []
  const completed = fdMatches.filter(m => m.status === 'FINISHED')

  // 2. Fetch all non-completed DB matches ────────────────────────────────────
  const { data: dbMatches, error: dbErr } = await supabase
    .from('matches')
    .select('id, home_team, away_team, status, home_score, away_score, kickoff_utc')
    .neq('status', 'completed')

  if (dbErr) return res.status(200).json({ db_fetch_error: dbErr.message })

  // 3. Build toUpdate list (same logic as sync-scores) ───────────────────────
  const toUpdate = []
  const detail   = []

  for (const fdm of completed) {
    const dbRow = dbMatches?.find(
      d => d.home_team === fdm.homeTeam?.tla && d.away_team === fdm.awayTeam?.tla
    )
    const newStatus = STATUS_MAP[fdm.status] ?? 'scheduled'
    const newHome   = fdm.score?.fullTime?.home ?? null
    const newAway   = fdm.score?.fullTime?.away ?? null

    const changed = dbRow && (
      newStatus !== dbRow.status   ||
      newHome   !== dbRow.home_score ||
      newAway   !== dbRow.away_score
    )

    detail.push({
      fd_tla:    `${fdm.homeTeam?.tla}-${fdm.awayTeam?.tla}`,
      fd_score:  `${newHome}-${newAway}`,
      fd_status: fdm.status,
      db_found:  !!dbRow,
      db_status: dbRow?.status   ?? 'NOT FOUND',
      db_score:  dbRow ? `${dbRow.home_score}-${dbRow.away_score}` : 'NOT FOUND',
      would_update: changed,
    })

    if (changed) toUpdate.push({
      id: dbRow.id, status: newStatus,
      home_score: newHome, away_score: newAway, match_minute: null,
    })
  }

  // 4. Optionally execute writes ──────────────────────────────────────────────
  let writeResult = null
  if (doWrite && toUpdate.length > 0) {
    const { error: upsertErr } = await supabase
      .from('matches')
      .upsert(toUpdate, { onConflict: 'id' })
    writeResult = upsertErr
      ? { ok: false, error: upsertErr.message }
      : { ok: true,  updated: toUpdate.length }
  }

  return res.status(200).json({
    fdMatchCount:   fdMatches.length,
    completedCount: completed.length,
    dbPendingCount: dbMatches?.length ?? 0,
    pendingUpdates: toUpdate.length,
    doWrite,
    writeResult,
    detail,
  })
}
