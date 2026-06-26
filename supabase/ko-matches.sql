-- ============================================================
-- Knockout Stage: Schema changes + R32 match data
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Make group_letter and matchday nullable (required for KO matches)
ALTER TABLE matches ALTER COLUMN group_letter DROP NOT NULL;
ALTER TABLE matches ALTER COLUMN matchday     DROP NOT NULL;

-- 2. New columns on matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS round           text DEFAULT NULL;  -- GS | R32 | R16 | QF | SF | 3P | F
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_label      text DEFAULT NULL;  -- display text when home_team is TBD
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_label      text DEFAULT NULL;  -- display text when away_team is TBD
ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_winner  text DEFAULT NULL;  -- TLA of team that won on penalties

-- 3. tiebreak_winner on predictions (user's winner pick when they predict a draw in KO)
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS tiebreak_winner text DEFAULT NULL;

-- 4. Mark all existing group-stage matches
UPDATE matches SET round = 'GS' WHERE matchday IS NOT NULL AND (round IS NULL OR round = '');

-- 5. Insert all 16 Round of 32 matches
--    home_team / away_team = NULL when team is still TBD; home_label / away_label hold display text.
--    Kickoff times are in UTC.
INSERT INTO matches
  (home_team, home_label, away_team, away_label, kickoff_utc, group_letter, matchday, venue_city, venue_country, venue_stadium, round, status)
VALUES
  -- Sun 28 Jun
  ('RSA', NULL,                  'CAN', NULL,                  '2026-06-28T19:00:00Z', NULL, NULL, 'Los Angeles',  'USA',    'SoFi Stadium',            'R32', 'scheduled'),

  -- Mon 29 Jun
  ('BRA', NULL,                  'JPN', NULL,                  '2026-06-29T17:00:00Z', NULL, NULL, 'Houston',      'USA',    'NRG Stadium',             'R32', 'scheduled'),
  ('GER', NULL,                  NULL,  '3rd from A/B/C/D/F', '2026-06-29T20:30:00Z', NULL, NULL, 'Boston',       'USA',    'Gillette Stadium',        'R32', 'scheduled'),
  ('NED', NULL,                  'MAR', NULL,                  '2026-06-30T00:00:00Z', NULL, NULL, 'Monterrey',    'Mexico', 'Estadio BBVA',            'R32', 'scheduled'),

  -- Tue 30 Jun
  ('CIV', NULL,                  NULL,  'Runner-up Group I',  '2026-06-30T17:00:00Z', NULL, NULL, 'Dallas',       'USA',    'AT&T Stadium',            'R32', 'scheduled'),
  (NULL,  'Winner Group I',      NULL,  '3rd from C/D/F/G/H', '2026-06-30T21:00:00Z', NULL, NULL, 'New York',     'USA',    'MetLife Stadium',         'R32', 'scheduled'),
  ('MEX', NULL,                  NULL,  '3rd from C/E/F/H/I', '2026-07-01T01:00:00Z', NULL, NULL, 'Mexico City',  'Mexico', 'Estadio Azteca',          'R32', 'scheduled'),

  -- Wed 1 Jul
  (NULL,  'Winner Group L',      NULL,  '3rd from E/H/I/J/K', '2026-07-01T16:00:00Z', NULL, NULL, 'Atlanta',      'USA',    'Mercedes-Benz Stadium',  'R32', 'scheduled'),
  (NULL,  'Winner Group G',      NULL,  '3rd from A/E/H/I/J', '2026-07-01T20:00:00Z', NULL, NULL, 'Seattle',      'USA',    'Lumen Field',             'R32', 'scheduled'),
  ('USA', NULL,                  NULL,  '3rd from B/E/F/I/J', '2026-07-01T23:00:00Z', NULL, NULL, 'Santa Clara',  'USA',    'Levi''s Stadium',         'R32', 'scheduled'),

  -- Thu 2 Jul
  (NULL,  'Winner Group H',      NULL,  'Runner-up Group J',  '2026-07-02T19:00:00Z', NULL, NULL, 'Los Angeles',  'USA',    'SoFi Stadium',            'R32', 'scheduled'),
  (NULL,  'Runner-up Group K',   NULL,  'Runner-up Group L',  '2026-07-02T23:00:00Z', NULL, NULL, 'Toronto',      'Canada', 'BMO Field',               'R32', 'scheduled'),
  ('SUI', NULL,                  NULL,  '3rd from E/F/G/I/J', '2026-07-03T02:00:00Z', NULL, NULL, 'Vancouver',    'Canada', 'BC Place',                'R32', 'scheduled'),

  -- Fri 3 Jul
  ('AUS', NULL,                  NULL,  'Runner-up Group G',  '2026-07-03T18:00:00Z', NULL, NULL, 'Dallas',       'USA',    'AT&T Stadium',            'R32', 'scheduled'),
  ('ARG', NULL,                  NULL,  'Runner-up Group H',  '2026-07-03T22:00:00Z', NULL, NULL, 'Miami Gardens','USA',    'Hard Rock Stadium',       'R32', 'scheduled'),
  (NULL,  'Winner Group K',      NULL,  '3rd from D/E/I/J/L','2026-07-04T00:30:00Z', NULL, NULL, 'Kansas City',  'USA',    'Arrowhead Stadium',       'R32', 'scheduled');


-- ============================================================
-- Once teams are confirmed, update TBD slots with real TLAs.
-- Example (run after group stage ends June 27):
-- ============================================================
-- UPDATE matches SET away_team = 'ECU', away_label = NULL WHERE home_team = 'GER' AND round = 'R32';
-- UPDATE matches SET home_team = 'FRA', home_label = NULL WHERE home_label = 'Winner Group I';
-- UPDATE matches SET away_team = 'NOR', away_label = NULL WHERE away_label = 'Runner-up Group I';
-- etc.
