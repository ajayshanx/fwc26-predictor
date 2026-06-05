/**
 * Per-match outfield kit colours — sourced from FIFA official
 * Match Colour Designation document (FWC26 MatchKits.pdf, Version 2, 27 May 2026).
 *
 * Key:   `${homeTeamCode}_${awayTeamCode}`
 * Value: { home: [primaryHex, secondaryHex?], away: [...] }
 *         Two colours → vertical stripes rendered in KitIcon.
 */

export const MATCH_KITS = {

  // ── Matchday 1 ──────────────────────────────────────────────────────────
  'MEX_RSA': { home: ['#006847', '#ffffff'], away: ['#ffd700'] },                  // M01
  'KOR_CZE': { home: ['#cc0000'],            away: ['#ffffff', '#cd7f32'] },        // M02
  'CAN_BIH': { home: ['#cc0000'],            away: ['#ffffff'] },                   // M03
  'USA_PAR': { home: ['#ffffff', '#cc0000'], away: ['#001f5b'] },                  // M04
  'HAI_SCO': { home: ['#ffffff'],            away: ['#cc0000'] },                   // M05
  'AUS_TUR': { home: ['#ffa500'],            away: ['#8b1a2f', '#cc0000'] },        // M06
  'BRA_MAR': { home: ['#ffd700', '#0055a4'], away: ['#cc0000', '#006847'] },        // M07
  'QAT_SUI': { home: ['#800020'],            away: ['#cccccc', '#90ee90'] },        // M08
  'CIV_ECU': { home: ['#ff6200', '#006847'], away: ['#001f5b'] },                  // M09
  'GER_CUW': { home: ['#ffffff', '#1a1a1a'], away: ['#0055a4'] },                  // M10
  'NED_JPN': { home: ['#ff6200'],            away: ['#001f5b', '#ffffff'] },        // M11
  'SWE_TUN': { home: ['#ffd700', '#0055a4'], away: ['#cc0000'] },                  // M12
  'KSA_URU': { home: ['#006400'],            away: ['#75aadb'] },                   // M13
  'ESP_CPV': { home: ['#cc0000', '#001f5b'], away: ['#ffffff'] },                  // M14
  'IRN_NZL': { home: ['#ffffff'],            away: ['#1a1a1a'] },                   // M15
  'BEL_EGY': { home: ['#cc0000', '#ffd700'], away: ['#ffffff'] },                  // M16
  'FRA_SEN': { home: ['#001f5b'],            away: ['#ffffff'] },                   // M17
  'IRQ_NOR': { home: ['#ffffff'],            away: ['#cc0000'] },                   // M18
  'ARG_ALG': { home: ['#ffffff', '#75aadb'], away: ['#006400'] },                  // M19
  'AUT_JOR': { home: ['#cc0000', '#1a1a1a'], away: ['#ffffff'] },                  // M20
  'GHA_PAN': { home: ['#ffd700'],            away: ['#cc0000', '#ffffff'] },        // M21
  'ENG_CRO': { home: ['#ffffff', '#cc0000'], away: ['#0055a4', '#001f5b'] },        // M22
  'POR_COD': { home: ['#8b1a2f', '#6b7c45'], away: ['#0055a4'] },                  // M23
  'UZB_COL': { home: ['#ffffff'],            away: ['#001f5b', '#ffd700'] },        // M24

  // ── Matchday 2 ──────────────────────────────────────────────────────────
  'CZE_RSA': { home: ['#cc0000', '#001f5b'], away: ['#ffd700', '#006847'] },        // M25
  'SUI_BIH': { home: ['#cc0000', '#ffffff'], away: ['#ffffff'] },                   // M26
  'CAN_QAT': { home: ['#1a1a1a'],            away: ['#ffffff'] },                   // M27
  'MEX_KOR': { home: ['#1a1a1a', '#ffffff'], away: ['#c3006b'] },                   // M28
  'BRA_HAI': { home: ['#001f5b'],            away: ['#ffffff'] },                   // M29
  'SCO_MAR': { home: ['#001f5b'],            away: ['#ffffff'] },                   // M30
  'TUR_PAR': { home: ['#ffffff', '#8b1a2f'], away: ['#001f5b'] },                   // M31
  'USA_AUS': { home: ['#ffffff', '#cc0000'], away: ['#ffa500'] },                   // M32
  'GER_CIV': { home: ['#ffffff', '#1a1a1a'], away: ['#ff6200', '#006847'] },        // M33
  'ECU_CUW': { home: ['#ffd700', '#001f5b'], away: ['#001f5b', '#40e0d0'] },        // M34
  'NED_SWE': { home: ['#ff6200', '#1a1a1a'], away: ['#0055a4', '#ffd700'] },        // M35
  'TUN_JPN': { home: ['#ffffff'],            away: ['#001f5b', '#ffffff'] },        // M36
  'URU_CPV': { home: ['#75aadb'],            away: ['#cc0000'] },                   // M37
  'ESP_KSA': { home: ['#cc0000', '#001f5b'], away: ['#ffffff', '#cd7f32'] },        // M38
  'BEL_IRN': { home: ['#cc0000', '#ffd700'], away: ['#ffffff'] },                   // M39
  'NZL_EGY': { home: ['#ffffff'],            away: ['#cc0000'] },                   // M40
  'NOR_SEN': { home: ['#1a1a1a'],            away: ['#ffffff'] },                   // M41
  'FRA_IRQ': { home: ['#001f5b'],            away: ['#ffffff'] },                   // M42
  'ARG_AUT': { home: ['#ffffff', '#75aadb'], away: ['#cc0000', '#1a1a1a'] },        // M43
  'JOR_ALG': { home: ['#cc0000'],            away: ['#ffffff'] },                   // M44
  'ENG_GHA': { home: ['#ffffff', '#cc0000'], away: ['#ffd700'] },                   // M45
  'PAN_CRO': { home: ['#001f5b'],            away: ['#ffffff', '#cc0000'] },        // M46
  'POR_UZB': { home: ['#8b1a2f', '#6b7c45'], away: ['#ffffff'] },                   // M47
  'COL_COD': { home: ['#ffd700', '#cc0000'], away: ['#0055a4'] },                   // M48

  // ── Matchday 3 ──────────────────────────────────────────────────────────
  'SCO_BRA': { home: ['#001f5b'],            away: ['#ffd700', '#ffffff'] },        // M49
  'MAR_HAI': { home: ['#cc0000'],            away: ['#0055a4'] },                   // M50
  'SUI_CAN': { home: ['#cc0000', '#ffffff'], away: ['#ffffff'] },                   // M51
  'BIH_QAT': { home: ['#0055a4', '#ffd700'], away: ['#ffffff'] },                   // M52
  'CZE_MEX': { home: ['#cc0000', '#001f5b'], away: ['#ffffff', '#006400'] },        // M53
  'RSA_KOR': { home: ['#ffd700'],            away: ['#cc0000'] },                   // M54
  'CUW_CIV': { home: ['#0055a4'],            away: ['#ff6200', '#006847'] },        // M55
  'ECU_GER': { home: ['#ffd700', '#001f5b'], away: ['#001f5b', '#40e0d0'] },        // M56
  'JPN_SWE': { home: ['#001f5b', '#ffffff'], away: ['#ffd700', '#0055a4'] },        // M57
  'TUN_NED': { home: ['#ffffff'],            away: ['#ff6200'] },                   // M58
  'TUR_USA': { home: ['#ffffff', '#8b1a2f'], away: ['#001f5b'] },                   // M59
  'PAR_AUS': { home: ['#cc0000', '#ffffff'], away: ['#ffa500'] },                   // M60
  'NOR_FRA': { home: ['#cc0000'],            away: ['#90ee90'] },                   // M61
  'SEN_IRQ': { home: ['#ffffff'],            away: ['#006400'] },                   // M62
  'EGY_IRN': { home: ['#cc0000'],            away: ['#ffffff'] },                   // M63
  'NZL_BEL': { home: ['#ffffff'],            away: ['#cc0000', '#ffd700'] },        // M64
  'CPV_KSA': { home: ['#001f5b', '#0055a4'], away: ['#ffffff', '#cd7f32'] },        // M65
  'URU_ESP': { home: ['#001f5b'],            away: ['#ffffff', '#800020'] },        // M66
  'PAN_ENG': { home: ['#ffffff'],            away: ['#cc0000', '#001f5b'] },        // M67
  'CRO_GHA': { home: ['#ffffff', '#cc0000'], away: ['#ffd700'] },                   // M68
  'ALG_AUT': { home: ['#ffffff'],            away: ['#cc0000', '#1a1a1a'] },        // M69
  'JOR_ARG': { home: ['#ffffff'],            away: ['#001f5b'] },                   // M70
  'COL_POR': { home: ['#ffd700', '#cc0000'], away: ['#8b1a2f', '#6b7c45'] },        // M71
  'COD_UZB': { home: ['#cc0000'],            away: ['#ffffff'] },                   // M72
}

export function getMatchKits(homeCode, awayCode) {
  return MATCH_KITS[`${homeCode}_${awayCode}`] || null
}
