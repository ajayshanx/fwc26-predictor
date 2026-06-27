/**
 * GET /api/fd-check                — shows comparison (dry-run for pending matches)
 * GET /api/fd-check?run=1          — writes pending score updates
 * GET /api/fd-check?fix_completed=1 — dry-run: compares ALL completed DB matches against FD
 * GET /api/fd-check?fix_completed=1&run=1 — writes corrections for completed matches + re-scores
 *
 * Diagnostic endpoint.
 */
import { createClient } from '@supabase/supabase-js'

const STATUS_MAP = {
  SCHEDULED: 'scheduled', TIMED: 'scheduled',
  IN_PLAY: 'live', PAUSED: 'live', EXTRA_TIME: 'live', PENALTY_SHOOTOUT: 'live',
  FINISHED: 'completed', AWARDED: 'completed',
  POSTPONED: 'scheduled', CANCELLED: 'scheduled', SUSPENDED: 'scheduled',
}

const KO_STAGES = new Set(['LAST_32','LAST_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'])

export default async function handler(req, res) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'FOOTBALL_DATA_API_KEY not set' })

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const supabase    = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY)
  const doWrite        = req.query.run          === '1'
  const fixCompleted   = req.query.fix_completed === '1'

  // 1. Fetch from FD ────────────────────────────────────────────────────────
  const fdRes = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
    { headers: { 'X-Auth-Token': apiKey } }
  )
  const body = await fdRes.json()
  if (!fdRes.ok) return res.status(502).json({ fdStatus: fdRes.status, fdMessage: body.message })

  const fdMatches = body.matches ?? []
  const fdCompleted = fdMatches.filter(m => m.status === 'FINISHED' || m.status === 'AWARDED')

  // KO matches — shows whether FD has confirmed team TLAs yet
  const fdKoMatches = fdMatches
    .filter(m => KO_STAGES.has(m.stage))
    .map(m => ({
      stage:     m.stage,
      kickoff:   m.utcDate,
      home_tla:  m.homeTeam?.tla  ?? null,
      home_name: m.homeTeam?.name ?? null,
      away_tla:  m.awayTeam?.tla  ?? null,
      away_name: m.awayTeam?.name ?? null,
      fd_status: m.status,
      tbd:       !m.homeTeam?.tla || !m.awayTeam?.tla,
    }))

  // ── Helper: match FD row to DB row ────────────────────────────────────────
  function matchFd(fdm, dbRows) {
    const fdKickoffMs = new Date(fdm.utcDate).getTime()
    return dbRows?.find(d => {
      if (d.home_team && d.away_team && fdm.homeTeam?.tla && fdm.awayTeam?.tla)
        return d.home_team === fdm.homeTeam.tla && d.away_team === fdm.awayTeam.tla
      return Math.abs(new Date(d.kickoff_utc).getTime() - fdKickoffMs) < 90 * 60 * 1000
    })
  }

  // ── A: Standard pending-match sync check ─────────────────────────────────
  const { data: dbPending, error: dbErr } = await supabase
    .from('matches')
    .select('id, home_team, away_team, status, home_score, away_score, kickoff_utc')
    .neq('status', 'completed')

  if (dbErr) return res.status(200).json({ db_fetch_error: dbErr.message })

  const toUpdate = []
  const detail   = []

  for (const fdm of fdCompleted) {
    const dbRow    = matchFd(fdm, dbPending)
    const newStatus = STATUS_MAP[fdm.status] ?? 'scheduled'
    const newHome   = fdm.score?.fullTime?.home ?? null
    const newAway   = fdm.score?.fullTime?.away ?? null
    const changed   = dbRow && (
      newStatus !== dbRow.status     ||
      newHome   !== dbRow.home_score ||
      newAway   !== dbRow.away_score
    )

    detail.push({
      fd_tla:       `${fdm.homeTeam?.tla}-${fdm.awayTeam?.tla}`,
      fd_score:     `${newHome}-${newAway}`,
      fd_status:    fdm.status,
      db_found:     !!dbRow,
      db_status:    dbRow?.status    ?? 'NOT FOUND',
      db_score:     dbRow ? `${dbRow.home_score}-${dbRow.away_score}` : 'NOT FOUND',
      would_update: changed,
    })

    if (changed) toUpdate.push({ id: dbRow.id, status: newStatus, home_score: newHome, away_score: newAway })
  }

  let writeResult = null
  if (doWrite && !fixCompleted && toUpdate.length > 0) {
    const errors = []
    for (const { id, status, home_score, away_score } of toUpdate) {
      const { error } = await supabase.from('matches').update({ status, home_score, away_score }).eq('id', id)
      if (error) errors.push(error.message)
    }
    writeResult = errors.length ? { ok: false, errors } : { ok: true, updated: toUpdate.length }
  }

  // ── B: fix_completed — compare every completed DB match against FD ────────
  let completedCheck = null
  if (fixCompleted) {
    const { data: dbCompleted } = await supabase
      .from('matches')
      .select('id, home_team, away_team, status, home_score, away_score, kickoff_utc')
      .eq('status', 'completed')

    const mismatches = []
    const rescoreIds = []

    for (const fdm of fdCompleted) {
      const dbRow  = matchFd(fdm, dbCompleted)
      if (!dbRow) continue

      // For KO matches, combine fullTime + extraTime
      const dur    = fdm.score?.duration
      let fdHome, fdAway
      if (dur === 'EXTRA_TIME' || dur === 'PENALTY_SHOOTOUT') {
        fdHome = (fdm.score?.fullTime?.home ?? 0) + (fdm.score?.extraTime?.home ?? 0)
        fdAway = (fdm.score?.fullTime?.away ?? 0) + (fdm.score?.extraTime?.away ?? 0)
      } else {
        fdHome = fdm.score?.fullTime?.home ?? null
        fdAway = fdm.score?.fullTime?.away ?? null
      }

      const scoreMismatch = fdHome !== dbRow.home_score || fdAway !== dbRow.away_score
      if (!scoreMismatch) continue

      mismatches.push({
        match:    `${fdm.homeTeam?.tla}-${fdm.awayTeam?.tla}`,
        db_score: `${dbRow.home_score}-${dbRow.away_score}`,
        fd_score: `${fdHome}-${fdAway}`,
        id:       dbRow.id,
      })

      if (doWrite) {
        const { error } = await supabase
          .from('matches')
          .update({ home_score: fdHome, away_score: fdAway })
          .eq('id', dbRow.id)
        if (!error) rescoreIds.push(dbRow.id)
      }
    }

    // Re-run scoring for corrected matches
    const rescoreErrors = []
    for (const matchId of rescoreIds) {
      const { error } = await supabase.rpc('score_predictions_for_match', { match_id_in: matchId })
      if (error) rescoreErrors.push({ matchId, error: error.message })
    }

    completedCheck = {
      dbCompletedCount: dbCompleted?.length ?? 0,
      mismatches,
      corrected: doWrite ? rescoreIds.length : 0,
      rescoreErrors: rescoreErrors.length ? rescoreErrors : undefined,
    }
  }

  return res.status(200).json({
    fdMatchCount:   fdMatches.length,
    completedCount: fdCompleted.length,
    dbPendingCount: dbPending?.length ?? 0,
    pendingUpdates: toUpdate.length,
    doWrite,
    writeResult,
    detail,
    completedCheck,
    ko: {
      total:     fdKoMatches.length,
      confirmed: fdKoMatches.filter(m => !m.tbd).length,
      tbd:       fdKoMatches.filter(m => m.tbd).length,
      matches:   fdKoMatches,
    },
  })
}
