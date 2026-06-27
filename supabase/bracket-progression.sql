-- ============================================================
-- Bracket progression: match numbers + pre-insert R16 onwards
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add match_number column (unique, nullable)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_number int DEFAULT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS matches_match_number_idx
  ON matches(match_number) WHERE match_number IS NOT NULL;

-- 2. Assign match numbers to R32 rows
--    Using home_team where confirmed; kickoff window for TBD-home matches.

UPDATE matches SET match_number = 73 WHERE round = 'R32' AND home_team = 'RSA';
UPDATE matches SET match_number = 74 WHERE round = 'R32' AND home_team = 'GER';
UPDATE matches SET match_number = 75 WHERE round = 'R32' AND home_team = 'NED';
UPDATE matches SET match_number = 76 WHERE round = 'R32' AND home_team = 'BRA';
UPDATE matches SET match_number = 77 WHERE round = 'R32' AND home_team = 'FRA';
UPDATE matches SET match_number = 78 WHERE round = 'R32' AND home_team = 'CIV';
UPDATE matches SET match_number = 79 WHERE round = 'R32' AND home_team = 'MEX';
-- Match 80: 1L vs 3EHIJK — kickoff ~16:00 UTC July 1
UPDATE matches SET match_number = 80
  WHERE round = 'R32'
    AND kickoff_utc BETWEEN '2026-07-01T14:30:00Z' AND '2026-07-01T17:30:00Z'
    AND match_number IS NULL;
UPDATE matches SET match_number = 81 WHERE round = 'R32' AND home_team = 'USA';
UPDATE matches SET match_number = 82 WHERE round = 'R32' AND home_team = 'BEL';
-- Match 83: 2K vs 2L — kickoff ~23:00 UTC July 2
UPDATE matches SET match_number = 83
  WHERE round = 'R32'
    AND kickoff_utc BETWEEN '2026-07-02T21:30:00Z' AND '2026-07-03T00:30:00Z'
    AND match_number IS NULL;
UPDATE matches SET match_number = 84 WHERE round = 'R32' AND home_team = 'ESP';
UPDATE matches SET match_number = 85 WHERE round = 'R32' AND home_team = 'SUI';
UPDATE matches SET match_number = 86 WHERE round = 'R32' AND home_team = 'ARG';
-- Match 87: 1K vs 3DEIJL — kickoff ~00:30–01:30 UTC July 4
UPDATE matches SET match_number = 87
  WHERE round = 'R32'
    AND kickoff_utc BETWEEN '2026-07-03T23:00:00Z' AND '2026-07-04T02:30:00Z'
    AND match_number IS NULL;
UPDATE matches SET match_number = 88 WHERE round = 'R32' AND home_team = 'AUS';


-- 3. Pre-insert Round of 16 (matches 89–96)
--    Teams are TBD — will be filled by bracket propagation in sync-scores.js.
--    Kickoff times converted from CET (UTC+2 in July).

INSERT INTO matches
  (home_team, home_label, away_team, away_label,
   kickoff_utc, venue_city, venue_country, venue_stadium,
   round, match_number, status)
SELECT * FROM (VALUES
  -- M89: W74 v W77 — Sat 4 Jul, 23:00 CET = 21:00 UTC
  (NULL, 'Winner Match 74', NULL, 'Winner Match 77',
   '2026-07-04T21:00:00Z'::timestamptz,
   'Philadelphia', 'USA', 'Lincoln Financial Field', 'R16', 89, 'scheduled'),

  -- M90: W73 v W75 — Sat 4 Jul, 19:00 CET = 17:00 UTC
  (NULL, 'Winner Match 73', NULL, 'Winner Match 75',
   '2026-07-04T17:00:00Z'::timestamptz,
   'Houston', 'USA', 'NRG Stadium', 'R16', 90, 'scheduled'),

  -- M91: W76 v W78 — Sun 5 Jul, 22:00 CET = 20:00 UTC
  (NULL, 'Winner Match 76', NULL, 'Winner Match 78',
   '2026-07-05T20:00:00Z'::timestamptz,
   'New York', 'USA', 'MetLife Stadium', 'R16', 91, 'scheduled'),

  -- M92: W79 v W80 — Sun 5 Jul, 02:00+1 CET = Mon 6 Jul 00:00 UTC
  (NULL, 'Winner Match 79', NULL, 'Winner Match 80',
   '2026-07-06T00:00:00Z'::timestamptz,
   'Mexico City', 'Mexico', 'Estadio Azteca', 'R16', 92, 'scheduled'),

  -- M93: W83 v W84 — Mon 6 Jul, 21:00 CET = 19:00 UTC
  (NULL, 'Winner Match 83', NULL, 'Winner Match 84',
   '2026-07-06T19:00:00Z'::timestamptz,
   'Dallas', 'USA', 'AT&T Stadium', 'R16', 93, 'scheduled'),

  -- M94: W81 v W82 — Mon 6 Jul, 02:00+1 CET = Tue 7 Jul 00:00 UTC
  (NULL, 'Winner Match 81', NULL, 'Winner Match 82',
   '2026-07-07T00:00:00Z'::timestamptz,
   'Seattle', 'USA', 'Lumen Field', 'R16', 94, 'scheduled'),

  -- M95: W86 v W88 — Tue 7 Jul, 18:00 CET = 16:00 UTC
  (NULL, 'Winner Match 86', NULL, 'Winner Match 88',
   '2026-07-07T16:00:00Z'::timestamptz,
   'Atlanta', 'USA', 'Mercedes-Benz Stadium', 'R16', 95, 'scheduled'),

  -- M96: W85 v W87 — Tue 7 Jul, 22:00 CET = 20:00 UTC
  (NULL, 'Winner Match 85', NULL, 'Winner Match 87',
   '2026-07-07T20:00:00Z'::timestamptz,
   'Vancouver', 'Canada', 'BC Place', 'R16', 96, 'scheduled')
) AS v(home_team, home_label, away_team, away_label, kickoff_utc, venue_city, venue_country, venue_stadium, round, match_number, status)
WHERE NOT EXISTS (SELECT 1 FROM matches WHERE match_number = v.match_number);


-- 4. Pre-insert Quarterfinals (matches 97–100)

INSERT INTO matches
  (home_team, home_label, away_team, away_label,
   kickoff_utc, venue_city, venue_country, venue_stadium,
   round, match_number, status)
SELECT * FROM (VALUES
  -- M97: W89 v W90 — Thu 9 Jul, 22:00 CET = 20:00 UTC
  (NULL, 'Winner Match 89', NULL, 'Winner Match 90',
   '2026-07-09T20:00:00Z'::timestamptz,
   'Boston', 'USA', 'Gillette Stadium', 'QF', 97, 'scheduled'),

  -- M98: W93 v W94 — Fri 10 Jul, 21:00 CET = 19:00 UTC
  (NULL, 'Winner Match 93', NULL, 'Winner Match 94',
   '2026-07-10T19:00:00Z'::timestamptz,
   'Los Angeles', 'USA', 'SoFi Stadium', 'QF', 98, 'scheduled'),

  -- M99: W91 v W92 — Sat 11 Jul, 23:00 CET = 21:00 UTC
  (NULL, 'Winner Match 91', NULL, 'Winner Match 92',
   '2026-07-11T21:00:00Z'::timestamptz,
   'Miami Gardens', 'USA', 'Hard Rock Stadium', 'QF', 99, 'scheduled'),

  -- M100: W95 v W96 — Sat 11 Jul, 03:00+1 CET = Sun 12 Jul 01:00 UTC
  (NULL, 'Winner Match 95', NULL, 'Winner Match 96',
   '2026-07-12T01:00:00Z'::timestamptz,
   'Kansas City', 'USA', 'Arrowhead Stadium', 'QF', 100, 'scheduled')
) AS v(home_team, home_label, away_team, away_label, kickoff_utc, venue_city, venue_country, venue_stadium, round, match_number, status)
WHERE NOT EXISTS (SELECT 1 FROM matches WHERE match_number = v.match_number);


-- 5. Pre-insert Semifinals (matches 101–102)
--    Note: Excel shows "Tue July 12 / Wed July 13" but July 12 is a Sunday.
--    Corrected to Tue 14 Jul / Wed 15 Jul (consistent with day labels and 3P/Final on Jul 18/19).

INSERT INTO matches
  (home_team, home_label, away_team, away_label,
   kickoff_utc, venue_city, venue_country, venue_stadium,
   round, match_number, status)
SELECT * FROM (VALUES
  -- M101: W97 v W98 — Tue 14 Jul, 21:00 CET = 19:00 UTC
  (NULL, 'Winner Match 97', NULL, 'Winner Match 98',
   '2026-07-14T19:00:00Z'::timestamptz,
   'Dallas', 'USA', 'AT&T Stadium', 'SF', 101, 'scheduled'),

  -- M102: W99 v W100 — Wed 15 Jul, 21:00 CET = 19:00 UTC
  (NULL, 'Winner Match 99', NULL, 'Winner Match 100',
   '2026-07-15T19:00:00Z'::timestamptz,
   'Atlanta', 'USA', 'Mercedes-Benz Stadium', 'SF', 102, 'scheduled')
) AS v(home_team, home_label, away_team, away_label, kickoff_utc, venue_city, venue_country, venue_stadium, round, match_number, status)
WHERE NOT EXISTS (SELECT 1 FROM matches WHERE match_number = v.match_number);


-- 6. Pre-insert Third-place play-off and Final

INSERT INTO matches
  (home_team, home_label, away_team, away_label,
   kickoff_utc, venue_city, venue_country, venue_stadium,
   round, match_number, status)
SELECT * FROM (VALUES
  -- M103: Runner-up 101 v Runner-up 102 — Sat 18 Jul, 23:00 CET = 21:00 UTC
  (NULL, 'Loser Semi-final 1', NULL, 'Loser Semi-final 2',
   '2026-07-18T21:00:00Z'::timestamptz,
   'Miami Gardens', 'USA', 'Hard Rock Stadium', '3P', 103, 'scheduled'),

  -- M104: W101 v W102 — Sun 19 Jul, 21:00 CET = 19:00 UTC
  (NULL, 'Winner Semi-final 1', NULL, 'Winner Semi-final 2',
   '2026-07-19T19:00:00Z'::timestamptz,
   'New York', 'USA', 'MetLife Stadium', 'F', 104, 'scheduled')
) AS v(home_team, home_label, away_team, away_label, kickoff_utc, venue_city, venue_country, venue_stadium, round, match_number, status)
WHERE NOT EXISTS (SELECT 1 FROM matches WHERE match_number = v.match_number);
