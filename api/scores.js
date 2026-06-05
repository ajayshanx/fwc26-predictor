/**
 * Vercel serverless function — proxies football-data.org live scores.
 * The client polls GET /api/scores every 60s.
 *
 * Vercel environment variable required:
 *   FOOTBALL_DATA_API_KEY  — get a free key at https://www.football-data.org/client/register
 */
export default async function handler(req, res) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'FOOTBALL_DATA_API_KEY not configured' })
  }

  try {
    const response = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      {
        headers: {
          'X-Auth-Token': apiKey,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream API error' })
    }

    const data = await response.json()

    // Cache for 45 seconds (CDN / browser)
    res.setHeader('Cache-Control', 's-maxage=45, stale-while-revalidate=60')
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
