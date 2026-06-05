-- ============================================================
-- FWC 2026 — Official Teams & Match Schedule
-- Source: NBC Sports / FIFA (verified June 2026)
-- All kickoff times converted from ET (EDT = UTC−4)
--
-- Run after schema.sql in Supabase SQL Editor.
-- Safe to re-run: TRUNCATE clears old data first.
-- ============================================================

TRUNCATE public.predictions, public.matches, public.teams
  RESTART IDENTITY CASCADE;

-- ============================================================
-- TEAMS
-- (code, name, group_letter, fifa_ranking, flag_code, kit_home, kit_away)
-- kit colours are approximate — update from official FWC26 kit guide
-- ============================================================
INSERT INTO public.teams
  (code, name, group_letter, fifa_ranking, flag_code, kit_home, kit_away)
VALUES
-- ── Group A ──────────────────────────────────────────────────
('MEX', 'Mexico',              'A', 13, 'mx', '#006847', '#ffffff'),
('RSA', 'South Africa',        'A', 66, 'za', '#007a4d', '#ffb612'),
('KOR', 'South Korea',         'A', 22, 'kr', '#c60c30', '#ffffff'),
('CZE', 'Czechia',             'A', 38, 'cz', '#d7141a', '#ffffff'),

-- ── Group B ──────────────────────────────────────────────────
('CAN', 'Canada',              'B', 43, 'ca', '#ff0000', '#ffffff'),
('BIH', 'Bosnia & Herzegovina','B', 65, 'ba', '#002395', '#ffffff'),
('QAT', 'Qatar',               'B', 37, 'qa', '#8d1b3d', '#ffffff'),
('SUI', 'Switzerland',         'B', 19, 'ch', '#ff0000', '#ffffff'),

-- ── Group C ──────────────────────────────────────────────────
('BRA', 'Brazil',              'C', 4,  'br', '#ffdf00', '#009c3b'),
('MAR', 'Morocco',             'C', 14, 'ma', '#c1272d', '#006233'),
('HAI', 'Haiti',               'C', 82, 'ht', '#00209f', '#d21034'),
('SCO', 'Scotland',            'C', 29, 'gb-sct', '#003380', '#ffffff'),

-- ── Group D ──────────────────────────────────────────────────
('USA', 'United States',       'D', 12, 'us', '#ffffff', '#002868'),
('PAR', 'Paraguay',            'D', 53, 'py', '#d52b1e', '#ffffff'),
('AUS', 'Australia',           'D', 24, 'au', '#ffcd00', '#00843d'),
('TUR', 'Türkiye',             'D', 28, 'tr', '#e30a17', '#ffffff'),

-- ── Group E ──────────────────────────────────────────────────
('GER', 'Germany',             'E', 6,  'de', '#ffffff', '#000000'),
('CUW', 'Curaçao',             'E', 85, 'cw', '#002b7f', '#f9d616'),
('CIV', 'Ivory Coast',         'E', 32, 'ci', '#f77f00', '#009a44'),
('ECU', 'Ecuador',             'E', 44, 'ec', '#ffdd00', '#003580'),

-- ── Group F ──────────────────────────────────────────────────
('NED', 'Netherlands',         'F', 8,  'nl', '#ff6200', '#ffffff'),
('JPN', 'Japan',               'F', 17, 'jp', '#003087', '#ffffff'),
('SWE', 'Sweden',              'F', 25, 'se', '#006aa7', '#fecc02'),
('TUN', 'Tunisia',             'F', 30, 'tn', '#e70013', '#ffffff'),

-- ── Group G ──────────────────────────────────────────────────
('BEL', 'Belgium',             'G', 7,  'be', '#000000', '#ffd900'),
('EGY', 'Egypt',               'G', 36, 'eg', '#c8102e', '#ffffff'),
('IRN', 'Iran',                'G', 27, 'ir', '#239f40', '#ffffff'),
('NZL', 'New Zealand',         'G', 94, 'nz', '#000000', '#ffffff'),

-- ── Group H ──────────────────────────────────────────────────
('ESP', 'Spain',               'H', 3,  'es', '#aa151b', '#0039a6'),
('CPV', 'Cape Verde',          'H', 72, 'cv', '#003893', '#f7d116'),
('KSA', 'Saudi Arabia',        'H', 55, 'sa', '#165016', '#ffffff'),
('URU', 'Uruguay',             'H', 11, 'uy', '#5aaee4', '#ffffff'),

-- ── Group I ──────────────────────────────────────────────────
('FRA', 'France',              'I', 2,  'fr', '#003189', '#ffffff'),
('SEN', 'Senegal',             'I', 20, 'sn', '#00853f', '#fcd116'),
('IRQ', 'Iraq',                'I', 68, 'iq', '#007a3d', '#ffffff'),
('NOR', 'Norway',              'I', 23, 'no', '#ef2b2d', '#ffffff'),

-- ── Group J ──────────────────────────────────────────────────
('ARG', 'Argentina',           'J', 1,  'ar', '#74acdf', '#ffffff'),
('ALG', 'Algeria',             'J', 34, 'dz', '#006233', '#ffffff'),
('AUT', 'Austria',             'J', 21, 'at', '#ed2939', '#ffffff'),
('JOR', 'Jordan',              'J', 79, 'jo', '#007a3d', '#ffffff'),

-- ── Group K ──────────────────────────────────────────────────
('POR', 'Portugal',            'K', 5,  'pt', '#006600', '#ff0000'),
('COD', 'DR Congo',            'K', 60, 'cd', '#007fff', '#ce1126'),
('UZB', 'Uzbekistan',          'K', 74, 'uz', '#1eb53a', '#ffffff'),
('COL', 'Colombia',            'K', 10, 'co', '#fcd116', '#003087'),

-- ── Group L ──────────────────────────────────────────────────
('ENG', 'England',             'L', 5,  'gb-eng', '#ffffff', '#cc0000'),
('CRO', 'Croatia',             'L', 9,  'hr', '#cc0000', '#ffffff'),
('GHA', 'Ghana',               'L', 58, 'gh', '#006b3f', '#fcd116'),
('PAN', 'Panama',              'L', 49, 'pa', '#da121a', '#ffffff');


-- ============================================================
-- MATCHES — all kickoff times in UTC (source times are EDT = UTC−4)
-- Format: 'YYYY-MM-DD HH:MM:SS+00'
-- ============================================================

-- ── GROUP A ──────────────────────────────────────────────────
INSERT INTO public.matches
  (home_team, away_team, kickoff_utc, group_letter, matchday, venue_city, venue_country, venue_stadium)
VALUES
-- MD1
('MEX', 'RSA', '2026-06-11 19:00:00+00', 'A', 1, 'Mexico City',   'Mexico', 'Estadio Azteca'),
('KOR', 'CZE', '2026-06-12 02:00:00+00', 'A', 1, 'Guadalajara',   'Mexico', 'Estadio Akron'),
-- MD2
('CZE', 'RSA', '2026-06-18 16:00:00+00', 'A', 2, 'Atlanta',       'USA', 'Mercedes-Benz Stadium'),
('MEX', 'KOR', '2026-06-19 01:00:00+00', 'A', 2, 'Guadalajara',   'Mexico', 'Estadio Akron'),
-- MD3 (simultaneous)
('CZE', 'MEX', '2026-06-25 01:00:00+00', 'A', 3, 'Mexico City',   'Mexico', 'Estadio Azteca'),
('RSA', 'KOR', '2026-06-25 01:00:00+00', 'A', 3, 'Monterrey',     'Mexico', 'Estadio BBVA');

-- ── GROUP B ──────────────────────────────────────────────────
INSERT INTO public.matches
  (home_team, away_team, kickoff_utc, group_letter, matchday, venue_city, venue_country, venue_stadium)
VALUES
-- MD1
('CAN', 'BIH', '2026-06-12 19:00:00+00', 'B', 1, 'Toronto',              'Canada', 'BMO Field'),
('QAT', 'SUI', '2026-06-13 19:00:00+00', 'B', 1, 'San Francisco Bay Area','USA',    'Levi''s Stadium'),
-- MD2
('SUI', 'BIH', '2026-06-18 19:00:00+00', 'B', 2, 'Los Angeles',          'USA',    'SoFi Stadium'),
('CAN', 'QAT', '2026-06-18 22:00:00+00', 'B', 2, 'Vancouver',            'Canada', 'BC Place'),
-- MD3 (simultaneous)
('SUI', 'CAN', '2026-06-24 19:00:00+00', 'B', 3, 'Vancouver',            'Canada', 'BC Place'),
('BIH', 'QAT', '2026-06-24 19:00:00+00', 'B', 3, 'Seattle',              'USA',    'Lumen Field');

-- ── GROUP C ──────────────────────────────────────────────────
INSERT INTO public.matches
  (home_team, away_team, kickoff_utc, group_letter, matchday, venue_city, venue_country, venue_stadium)
VALUES
-- MD1
('BRA', 'MAR', '2026-06-13 22:00:00+00', 'C', 1, 'New York/New Jersey', 'USA', 'MetLife Stadium'),
('HAI', 'SCO', '2026-06-14 01:00:00+00', 'C', 1, 'Boston',              'USA', 'Gillette Stadium'),
-- MD2
('SCO', 'MAR', '2026-06-19 22:00:00+00', 'C', 2, 'Boston',              'USA', 'Gillette Stadium'),
('BRA', 'HAI', '2026-06-20 01:00:00+00', 'C', 2, 'Philadelphia',        'USA', 'Lincoln Financial Field'),
-- MD3 (simultaneous)
('SCO', 'BRA', '2026-06-24 22:00:00+00', 'C', 3, 'Miami',               'USA', 'Hard Rock Stadium'),
('MAR', 'HAI', '2026-06-24 22:00:00+00', 'C', 3, 'Atlanta',             'USA', 'Mercedes-Benz Stadium');

-- ── GROUP D ──────────────────────────────────────────────────
INSERT INTO public.matches
  (home_team, away_team, kickoff_utc, group_letter, matchday, venue_city, venue_country, venue_stadium)
VALUES
-- MD1
('USA', 'PAR', '2026-06-13 01:00:00+00', 'D', 1, 'Los Angeles',          'USA',    'SoFi Stadium'),
('AUS', 'TUR', '2026-06-14 04:00:00+00', 'D', 1, 'Vancouver',            'Canada', 'BC Place'),
-- MD2
('USA', 'AUS', '2026-06-19 19:00:00+00', 'D', 2, 'Seattle',              'USA',    'Lumen Field'),
('TUR', 'PAR', '2026-06-20 04:00:00+00', 'D', 2, 'San Francisco Bay Area','USA',   'Levi''s Stadium'),
-- MD3 (simultaneous)
('TUR', 'USA', '2026-06-26 02:00:00+00', 'D', 3, 'Los Angeles',          'USA',    'SoFi Stadium'),
('PAR', 'AUS', '2026-06-26 02:00:00+00', 'D', 3, 'San Francisco Bay Area','USA',   'Levi''s Stadium');

-- ── GROUP E ──────────────────────────────────────────────────
INSERT INTO public.matches
  (home_team, away_team, kickoff_utc, group_letter, matchday, venue_city, venue_country, venue_stadium)
VALUES
-- MD1
('GER', 'CUW', '2026-06-14 17:00:00+00', 'E', 1, 'Houston',      'USA', 'NRG Stadium'),
('CIV', 'ECU', '2026-06-14 23:00:00+00', 'E', 1, 'Philadelphia', 'USA', 'Lincoln Financial Field'),
-- MD2
('GER', 'CIV', '2026-06-20 20:00:00+00', 'E', 2, 'Toronto',      'Canada', 'BMO Field'),
('ECU', 'CUW', '2026-06-21 00:00:00+00', 'E', 2, 'Kansas City',  'USA', 'Arrowhead Stadium'),
-- MD3 (simultaneous)
('ECU', 'GER', '2026-06-25 20:00:00+00', 'E', 3, 'New York/New Jersey','USA', 'MetLife Stadium'),
('CUW', 'CIV', '2026-06-25 20:00:00+00', 'E', 3, 'Philadelphia', 'USA', 'Lincoln Financial Field');

-- ── GROUP F ──────────────────────────────────────────────────
INSERT INTO public.matches
  (home_team, away_team, kickoff_utc, group_letter, matchday, venue_city, venue_country, venue_stadium)
VALUES
-- MD1
('NED', 'JPN', '2026-06-14 20:00:00+00', 'F', 1, 'Dallas',    'USA',    'AT&T Stadium'),
('SWE', 'TUN', '2026-06-15 02:00:00+00', 'F', 1, 'Monterrey', 'Mexico', 'Estadio BBVA'),
-- MD2
('NED', 'SWE', '2026-06-20 17:00:00+00', 'F', 2, 'Houston',   'USA',    'NRG Stadium'),
('TUN', 'JPN', '2026-06-21 04:00:00+00', 'F', 2, 'Monterrey', 'Mexico', 'Estadio BBVA'),
-- MD3 (simultaneous)
('JPN', 'SWE', '2026-06-25 23:00:00+00', 'F', 3, 'Dallas',    'USA',    'AT&T Stadium'),
('TUN', 'NED', '2026-06-25 23:00:00+00', 'F', 3, 'Kansas City','USA',   'Arrowhead Stadium');

-- ── GROUP G ──────────────────────────────────────────────────
INSERT INTO public.matches
  (home_team, away_team, kickoff_utc, group_letter, matchday, venue_city, venue_country, venue_stadium)
VALUES
-- MD1
('BEL', 'EGY', '2026-06-15 19:00:00+00', 'G', 1, 'Seattle',     'USA', 'Lumen Field'),
('IRN', 'NZL', '2026-06-16 01:00:00+00', 'G', 1, 'Los Angeles', 'USA', 'SoFi Stadium'),
-- MD2
('BEL', 'IRN', '2026-06-21 19:00:00+00', 'G', 2, 'Los Angeles', 'USA', 'SoFi Stadium'),
('NZL', 'EGY', '2026-06-22 01:00:00+00', 'G', 2, 'Vancouver',   'Canada', 'BC Place'),
-- MD3 (simultaneous)
('EGY', 'IRN', '2026-06-27 03:00:00+00', 'G', 3, 'Seattle',     'USA', 'Lumen Field'),
('NZL', 'BEL', '2026-06-27 03:00:00+00', 'G', 3, 'Vancouver',   'Canada', 'BC Place');

-- ── GROUP H ──────────────────────────────────────────────────
INSERT INTO public.matches
  (home_team, away_team, kickoff_utc, group_letter, matchday, venue_city, venue_country, venue_stadium)
VALUES
-- MD1
('ESP', 'CPV', '2026-06-15 16:00:00+00', 'H', 1, 'Atlanta', 'USA', 'Mercedes-Benz Stadium'),
('KSA', 'URU', '2026-06-15 22:00:00+00', 'H', 1, 'Miami',   'USA', 'Hard Rock Stadium'),
-- MD2
('ESP', 'KSA', '2026-06-21 16:00:00+00', 'H', 2, 'Atlanta', 'USA', 'Mercedes-Benz Stadium'),
('URU', 'CPV', '2026-06-21 22:00:00+00', 'H', 2, 'Miami',   'USA', 'Hard Rock Stadium'),
-- MD3 (simultaneous)
('CPV', 'KSA', '2026-06-27 00:00:00+00', 'H', 3, 'Houston',       'USA',    'NRG Stadium'),
('URU', 'ESP', '2026-06-27 00:00:00+00', 'H', 3, 'Guadalajara',   'Mexico', 'Estadio Akron');

-- ── GROUP I ──────────────────────────────────────────────────
INSERT INTO public.matches
  (home_team, away_team, kickoff_utc, group_letter, matchday, venue_city, venue_country, venue_stadium)
VALUES
-- MD1
('FRA', 'SEN', '2026-06-16 19:00:00+00', 'I', 1, 'New York/New Jersey', 'USA', 'MetLife Stadium'),
('IRQ', 'NOR', '2026-06-16 22:00:00+00', 'I', 1, 'Boston',              'USA', 'Gillette Stadium'),
-- MD2
('FRA', 'IRQ', '2026-06-22 21:00:00+00', 'I', 2, 'Philadelphia', 'USA', 'Lincoln Financial Field'),
('NOR', 'SEN', '2026-06-23 00:00:00+00', 'I', 2, 'New York/New Jersey', 'USA', 'MetLife Stadium'),
-- MD3 (simultaneous)
('NOR', 'FRA', '2026-06-26 19:00:00+00', 'I', 3, 'Boston',  'USA',    'Gillette Stadium'),
('SEN', 'IRQ', '2026-06-26 19:00:00+00', 'I', 3, 'Toronto', 'Canada', 'BMO Field');

-- ── GROUP J ──────────────────────────────────────────────────
INSERT INTO public.matches
  (home_team, away_team, kickoff_utc, group_letter, matchday, venue_city, venue_country, venue_stadium)
VALUES
-- MD1
('ARG', 'ALG', '2026-06-17 01:00:00+00', 'J', 1, 'Kansas City',          'USA', 'Arrowhead Stadium'),
('AUT', 'JOR', '2026-06-17 04:00:00+00', 'J', 1, 'San Francisco Bay Area','USA', 'Levi''s Stadium'),
-- MD2
('ARG', 'AUT', '2026-06-22 17:00:00+00', 'J', 2, 'Dallas',               'USA', 'AT&T Stadium'),
('JOR', 'ALG', '2026-06-23 03:00:00+00', 'J', 2, 'San Francisco Bay Area','USA', 'Levi''s Stadium'),
-- MD3 (simultaneous)
('ALG', 'AUT', '2026-06-28 02:00:00+00', 'J', 3, 'Kansas City',          'USA', 'Arrowhead Stadium'),
('JOR', 'ARG', '2026-06-28 02:00:00+00', 'J', 3, 'Dallas',               'USA', 'AT&T Stadium');

-- ── GROUP K ──────────────────────────────────────────────────
INSERT INTO public.matches
  (home_team, away_team, kickoff_utc, group_letter, matchday, venue_city, venue_country, venue_stadium)
VALUES
-- MD1
('POR', 'COD', '2026-06-17 17:00:00+00', 'K', 1, 'Houston',      'USA',    'NRG Stadium'),
('UZB', 'COL', '2026-06-18 02:00:00+00', 'K', 1, 'Mexico City',  'Mexico', 'Estadio Azteca'),
-- MD2
('POR', 'UZB', '2026-06-23 17:00:00+00', 'K', 2, 'Houston',      'USA',    'NRG Stadium'),
('COL', 'COD', '2026-06-24 02:00:00+00', 'K', 2, 'Guadalajara',  'Mexico', 'Estadio Akron'),
-- MD3 (simultaneous)
('COL', 'POR', '2026-06-27 23:30:00+00', 'K', 3, 'Miami',        'USA',    'Hard Rock Stadium'),
('COD', 'UZB', '2026-06-27 23:30:00+00', 'K', 3, 'Atlanta',      'USA',    'Mercedes-Benz Stadium');

-- ── GROUP L ──────────────────────────────────────────────────
INSERT INTO public.matches
  (home_team, away_team, kickoff_utc, group_letter, matchday, venue_city, venue_country, venue_stadium)
VALUES
-- MD1
('ENG', 'CRO', '2026-06-17 20:00:00+00', 'L', 1, 'Dallas',       'USA',    'AT&T Stadium'),
('GHA', 'PAN', '2026-06-17 23:00:00+00', 'L', 1, 'Toronto',      'Canada', 'BMO Field'),
-- MD2
('ENG', 'GHA', '2026-06-23 20:00:00+00', 'L', 2, 'Boston',       'USA',    'Gillette Stadium'),
('PAN', 'CRO', '2026-06-23 23:00:00+00', 'L', 2, 'Toronto',      'Canada', 'BMO Field'),
-- MD3 (simultaneous)
('PAN', 'ENG', '2026-06-27 21:00:00+00', 'L', 3, 'New York/New Jersey', 'USA', 'MetLife Stadium'),
('CRO', 'GHA', '2026-06-27 21:00:00+00', 'L', 3, 'Philadelphia', 'USA',    'Lincoln Financial Field');
