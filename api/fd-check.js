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

  // Fetch individual match detail for the first completed match to check goals
  let matchDetail = null
  if (first?.id) {
    const detailRes = await fetch(
      `https://api.football-data.org/v4/matches/${first.id}`,
      { headers: { 'X-Auth-Token': apiKey } }
    )
    if (detailRes.ok) {
      const detailBody = await detailRes.json()
      matchDetail = {
        fdMatchId: first.id,
        status:    detailBody.status,
        goals:     detailBody.goals ?? 'FIELD_MISSING',
        detailKeys: Object.keys(detailBody),
      }
    } else {
      matchDetail = { error: detailRes.status }
    }
  }

  return res.status(200).json({
    fdStatus:       fdRes.status,
    matchCount:     matches.length,
    completedCount: completed.length,
    completed: completed.map(m => ({
      fdId:    m.id,
      date:    m.utcDate,
      homeTla: m.homeTeam?.tla,
      awayTla: m.awayTeam?.tla,
      home:    m.homeTeam?.name,
      away:    m.awayTeam?.name,
      score:   `${m.score?.fullTime?.home}-${m.score?.fullTime?.away}`,
    })),
    firstMatchDetail: matchDetail,
  })
}
