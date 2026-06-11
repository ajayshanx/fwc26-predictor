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
  return res.status(200).json({
    fdStatus:    fdRes.status,
    matchCount:  matches.length,
    firstMatch:  matches[0]  ? { date: matches[0].utcDate,  status: matches[0].status,  home: matches[0].homeTeam?.name,  away: matches[0].awayTeam?.name  } : null,
    latestMatch: matches.at(-1) ? { date: matches.at(-1).utcDate, status: matches.at(-1).status, home: matches.at(-1).homeTeam?.name, away: matches.at(-1).awayTeam?.name } : null,
    completedCount: matches.filter(m => m.status === 'FINISHED').length,
  })
}
