/**
 * Compute group standings from a list of matches and a score-resolver function.
 *
 * @param {string[]}  teamCodes   - Array of team codes in this group
 * @param {object[]}  matches     - All matches in this group
 * @param {function}  getScore    - (match) => { home, away } | null
 * @param {object}    teamsMap    - Map of code → team object (for rankings)
 * @param {boolean}   withConduct - Include conduct tiebreaker (Standings tab only)
 * @returns {object[]} Sorted standings rows
 */
export function computeStandings(teamCodes, matches, getScore, teamsMap = {}, withConduct = false) {
  const table = {}
  teamCodes.forEach(code => {
    table[code] = { code, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, PTS: 0, CS: 0 }
  })

  matches.forEach(m => {
    const score = getScore(m)
    if (!score) return

    const h = score.home
    const a = score.away
    const ht = table[m.home_team]
    const at = table[m.away_team]
    if (!ht || !at) return

    ht.P++;  at.P++
    ht.GF += h; ht.GA += a
    at.GF += a; at.GA += h
    ht.GD = ht.GF - ht.GA
    at.GD = at.GF - at.GA

    if (h > a) {
      ht.W++; ht.PTS += 3; at.L++
    } else if (a > h) {
      at.W++; at.PTS += 3; ht.L++
    } else {
      ht.D++; ht.PTS++; at.D++; at.PTS++
    }

    if (withConduct) {
      ht.CS += conductScore(m, 'home')
      at.CS += conductScore(m, 'away')
    }
  })

  return Object.values(table).sort((a, b) => {
    if (b.PTS !== a.PTS) return b.PTS - a.PTS
    if (b.GD  !== a.GD)  return b.GD  - a.GD
    if (b.GF  !== a.GF)  return b.GF  - a.GF
    if (withConduct && b.CS !== a.CS) return b.CS - a.CS  // higher (less negative) is better
    const ra = teamsMap[a.code]?.fifa_ranking ?? 999
    const rb = teamsMap[b.code]?.fifa_ranking ?? 999
    return ra - rb  // lower ranking number is better
  })
}

function conductScore(match, side) {
  const prefix = side === 'home' ? 'home' : 'away'
  const y  = match[`${prefix}_yellows`]          || 0
  const ir = match[`${prefix}_indirect_reds`]    || 0
  const dr = match[`${prefix}_direct_reds`]      || 0
  return (-1 * y) + (-3 * ir) + (-4 * dr)
}
