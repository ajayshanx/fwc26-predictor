-- ============================================================
-- Update R32 TBD slots with confirmed team TLAs
-- Run in Supabase Dashboard → SQL Editor
-- (Run bracket-progression.sql first if you haven't already)
-- ============================================================

-- M79: Mexico vs Ecuador
UPDATE matches SET away_team = 'ECU', away_label = NULL
WHERE home_team = 'MEX' AND round = 'R32';

-- M80: England vs DR Congo  (was "Winner Group L vs 3rd from E/H/I/J/K")
UPDATE matches SET home_team = 'ENG', home_label = NULL,
                   away_team = 'COD', away_label = NULL
WHERE home_label = 'Winner Group L' AND round = 'R32';

-- M82: Belgium vs Senegal   (was "Winner Group G vs 3rd from A/E/H/I/J")
UPDATE matches SET away_team = 'SEN', away_label = NULL
WHERE home_team = 'BEL' AND round = 'R32';

-- M83: Portugal vs Croatia  (was "Runner-up Group K vs Runner-up Group L")
UPDATE matches SET home_team = 'POR', home_label = NULL,
                   away_team = 'CRO', away_label = NULL
WHERE home_label = 'Runner-up Group K' AND round = 'R32';

-- M84: Spain vs Austria     (was "Winner Group H vs Runner-up Group J")
UPDATE matches SET away_team = 'AUT', away_label = NULL
WHERE home_team = 'ESP' AND round = 'R32';

-- M85: Switzerland vs Algeria  (was "SUI vs 3rd from E/F/G/I/J")
UPDATE matches SET away_team = 'ALG', away_label = NULL
WHERE home_team = 'SUI' AND round = 'R32';

-- M87: Colombia vs Ghana    (was "Winner Group K vs 3rd from D/E/I/J/L")
UPDATE matches SET home_team = 'COL', home_label = NULL,
                   away_team = 'GHA', away_label = NULL
WHERE home_label = 'Winner Group K' AND round = 'R32';
