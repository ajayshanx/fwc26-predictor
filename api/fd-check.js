/**
 * GET /api/fd-check
 * Diagnostic endpoint — compares FD completed matches against the DB.
 * No auth required (read-only, no DB writes).
 * DELETE this file once you've confirmed the API is working.
 */
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'FOOTBALL_DATA_API_KEY not set' })

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY)

  // 1. Fetch from FD
  const fdRes = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
    { headers: { 'X-Auth-Token': apiKey } }
  )
  const body = await fdRes.json()
  if (!fdRes.ok) return res.status(502).json({ fdStatus: fdRes.status, fdMessage: body.message })

  const matches = body.matches ?? []
  const completed = matches.filter(m => m.status === 'FINISHED')

  // 2. Fetch matching DB rows (look up by both TLAs)
  const homeTlas = completed.map(m => m.homeTeam?.tla).filter(Boolean)
  const awayTlas = completed.map(m => m.awayTeam?.tla).filter(Boolean)
  const allTlas  = [...new Set([...homeTlas, ...awayTlas])]

  const { data: dbMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, status, home_score, away_score, kickoff_utc')
    .in('home_team', allTlas)

  // 3. Cross-reference
  const comparison = completed.map(m => {
    const dbRow = dbMatches?.find(
      d => d.home_team === m.homeTeam?.tla && d.away_team === m.awayTeam?.tla
    )
    return {
      fd_home_tla: m.homeTeam?.tla,
      fd_away_tla: m.awayTeam?.tla,
      fd_score:    `${m.score?.fullTime?.home}-${m.score?.fullTime?.away}`,
      fd_date:     m.utcDate,
      db_found:    !!dbRow,
      db_status:   dbRow?.status   ?? 'NOT FOUND',
      db_score:    dbRow ? `${dbRow.home_score}-${dbRow.away_score}` : 'NOT FOUND',
      db_kickoff:  dbRow?.kickoff_utc ?? 'NOT FOUND',
    }
  })

  return res.status(200).json({
    fdStatus:       fdRes.status,
    matchCount:     matches.length,
    completedCount: completed.length,
    comparison,
  })
}
