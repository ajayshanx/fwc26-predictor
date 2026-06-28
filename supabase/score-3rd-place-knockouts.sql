-- ============================================================
-- Award knockout prediction points for 3rd-place qualifiers
-- The 8 teams that qualified as top-8 3rd place teams:
--   BIH (Group B), PAR (Group D), ECU (Group E), SWE (Group F),
--   SEN (Group I), ALG (Group J), COD (Group K), GHA (Group L)
--
-- Scoring:
--   3 pts → predicted team as 3rd (correct qualifier + correct position)
--   2 pts → predicted team as 1st or 2nd (correct qualifier, wrong position)
--   0 pts → predicted team didn't make the top 8
-- ============================================================

-- 3 pts: correct 3rd-place team predicted in correct position
UPDATE knockout_predictions
SET points_awarded = 3
WHERE qualified_as = 3
  AND team_code IN ('BIH', 'PAR', 'ECU', 'SWE', 'SEN', 'ALG', 'COD', 'GHA')
  AND points_awarded IS NULL;

-- 2 pts: predicted a qualifying 3rd-place team as 1st or 2nd from their group
--   (team qualified, but not in the predicted position)
--   Uses IS NULL OR = 0 since 1st/2nd scoring may have already set these to 0
UPDATE knockout_predictions
SET points_awarded = 2
WHERE qualified_as IN (1, 2)
  AND team_code IN ('BIH', 'PAR', 'ECU', 'SWE', 'SEN', 'ALG', 'COD', 'GHA')
  AND (points_awarded IS NULL OR points_awarded = 0);

-- 0 pts: incorrect 3rd-place pick (team didn't make the top 8)
UPDATE knockout_predictions
SET points_awarded = 0
WHERE qualified_as = 3
  AND team_code NOT IN ('BIH', 'PAR', 'ECU', 'SWE', 'SEN', 'ALG', 'COD', 'GHA')
  AND points_awarded IS NULL;
