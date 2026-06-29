-- ============================================================
-- Remove duplicate R16+ rows inserted by sync-scores.js Section B
-- before bracket-progression.sql was run.
--
-- Logic: delete any R16/QF/SF/3P/F match that has NO match_number
-- AND has a counterpart WITH a match_number within 90 minutes.
-- The match_number rows are the authoritative ones from bracket-progression.sql.
-- ============================================================

DELETE FROM matches a
WHERE a.round IN ('R16', 'QF', 'SF', '3P', 'F')
  AND a.match_number IS NULL
  AND EXISTS (
    SELECT 1 FROM matches b
    WHERE b.match_number IS NOT NULL
      AND b.round = a.round
      AND ABS(EXTRACT(EPOCH FROM (b.kickoff_utc - a.kickoff_utc))) < 5400  -- within 90 min
  );
