/**
 * GET /api/fd-check
 * Diagnostic endpoint — returns what football-data.org has for WC2026.
 * No auth required (read-only, no DB writes).
 * DELETE this file once you've confirmed the API is working.
 */
export default async function handler(req, res) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'FOOTBALL_DATA_API_KEY not set' })

  const fdRes = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
    { headers: { 'X-Auth-Token': apiKey } }
  )

  const body = await fdRes.json()

  if (!fdRes.ok) {
    return res.status(502).json({ fdStatus: fdRes.status, fdMessage: body.message })
  }

  const matches = body.matches ?? []
  const completed = matches.filter(m => m.status === 'FINISHED')
  const first = completed[0]
  return res.status(200).json({
    fdStatus:       fdRes.status,
    matchCount:     matches.length,
    completedCount: completed.length,
    completed: completed.map(m => ({
      date:  m.utcDate,
      home:  m.homeTeam?.name,
      away:  m.awayTeam?.name,
      score: `${m.score?.fullTime?.home}-${m.score?.fullTime?.away}`,
      goals: m.goals ?? 'FIELD_MISSING',
    })),
    // Raw keys on first match so we can see what fields FD sends
    firstMatchKeys: first ? Object.keys(first) : [],
  })
}
