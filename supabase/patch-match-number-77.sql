-- Fix: ensure the France vs Sweden R32 match has match_number = 77
-- This is needed so the bracket tab can look it up by match_number
-- and display the kickoff date/time between their flag positions.
--
-- Run in Supabase Dashboard → SQL Editor

UPDATE matches
SET match_number = 77
WHERE round = 'R32'
  AND match_number IS NULL
  AND (
    (home_team = 'FRA' AND away_team = 'SWE')
    OR (home_team = 'SWE' AND away_team = 'FRA')
  );

-- Verify
SELECT id, match_number, home_team, away_team, kickoff_utc, status
FROM matches
WHERE (home_team IN ('FRA','SWE') OR away_team IN ('FRA','SWE'))
  AND round = 'R32';
