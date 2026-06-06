-- ============================================================
-- FWC 2026 — Qualifying campaign records for all 48 teams
-- Format: P (played) - W (won) - D (drawn) - L (lost) - GD (goal diff) - Pts
-- Cumulative across all qualifying rounds (group stage + play-offs +
-- inter-confederation play-offs where applicable).
-- Hosts (MEX/CAN/USA) qualified automatically — qualifying_record left null.
--
-- Run after schema.sql + seed.sql in Supabase SQL Editor.
-- Safe to re-run — each statement is an idempotent UPDATE.
--
-- NOTE: if your teams table was created before this column existed,
-- run this first (schema.sql's `create table if not exists` won't
-- retroactively add columns to an existing table):
--   alter table public.teams add column if not exists qualifying_record jsonb;
-- ============================================================

alter table public.teams add column if not exists qualifying_record jsonb;

-- ── UEFA (16) ──────────────────────────────────────────────
update public.teams set qualifying_record = '{"played":6,"won":5,"drawn":0,"lost":1,"gd":13,"pts":15}' where code = 'GER';
update public.teams set qualifying_record = '{"played":6,"won":4,"drawn":2,"lost":0,"gd":12,"pts":14}' where code = 'SUI';
update public.teams set qualifying_record = '{"played":6,"won":4,"drawn":1,"lost":1,"gd":6,"pts":13}'  where code = 'SCO';
update public.teams set qualifying_record = '{"played":8,"won":6,"drawn":1,"lost":1,"gd":7,"pts":19}'  where code = 'TUR';
update public.teams set qualifying_record = '{"played":6,"won":5,"drawn":1,"lost":0,"gd":19,"pts":16}' where code = 'ESP';
update public.teams set qualifying_record = '{"played":6,"won":5,"drawn":1,"lost":0,"gd":12,"pts":16}' where code = 'FRA';
update public.teams set qualifying_record = '{"played":8,"won":6,"drawn":2,"lost":0,"gd":23,"pts":20}' where code = 'NED';
update public.teams set qualifying_record = '{"played":8,"won":5,"drawn":3,"lost":0,"gd":22,"pts":18}' where code = 'BEL';
update public.teams set qualifying_record = '{"played":8,"won":6,"drawn":1,"lost":1,"gd":18,"pts":19}' where code = 'AUT';
update public.teams set qualifying_record = '{"played":8,"won":8,"drawn":0,"lost":0,"gd":32,"pts":24}' where code = 'NOR';
update public.teams set qualifying_record = '{"played":6,"won":4,"drawn":1,"lost":1,"gd":13,"pts":13}' where code = 'POR';
update public.teams set qualifying_record = '{"played":8,"won":8,"drawn":0,"lost":0,"gd":22,"pts":24}' where code = 'ENG';
update public.teams set qualifying_record = '{"played":8,"won":7,"drawn":1,"lost":0,"gd":22,"pts":22}' where code = 'CRO';
update public.teams set qualifying_record = '{"played":10,"won":5,"drawn":4,"lost":1,"gd":10,"pts":19}' where code = 'BIH';
update public.teams set qualifying_record = '{"played":10,"won":5,"drawn":3,"lost":2,"gd":10,"pts":18}' where code = 'CZE';
update public.teams set qualifying_record = '{"played":8,"won":1,"drawn":3,"lost":4,"gd":-5,"pts":6}'   where code = 'SWE';

-- ── AFC + OFC (10) ─────────────────────────────────────────
update public.teams set qualifying_record = '{"played":10,"won":6,"drawn":4,"lost":0,"gd":13,"pts":22}' where code = 'KOR';
update public.teams set qualifying_record = '{"played":12,"won":5,"drawn":2,"lost":5,"gd":-6,"pts":17}' where code = 'QAT';
update public.teams set qualifying_record = '{"played":10,"won":5,"drawn":4,"lost":1,"gd":9,"pts":19}'  where code = 'AUS';
update public.teams set qualifying_record = '{"played":10,"won":7,"drawn":2,"lost":1,"gd":27,"pts":23}' where code = 'JPN';
update public.teams set qualifying_record = '{"played":10,"won":7,"drawn":2,"lost":1,"gd":11,"pts":23}' where code = 'IRN';
update public.teams set qualifying_record = '{"played":12,"won":4,"drawn":5,"lost":3,"gd":0,"pts":17}'  where code = 'KSA';
-- Iraq: includes inter-confederation play-off final win vs Bolivia (2-1, Mar 31 2026) — their 48th & final qualifying spot
update public.teams set qualifying_record = '{"played":15,"won":7,"drawn":5,"lost":3,"gd":3,"pts":26}'  where code = 'IRQ';
update public.teams set qualifying_record = '{"played":10,"won":4,"drawn":4,"lost":2,"gd":8,"pts":16}'  where code = 'JOR';
update public.teams set qualifying_record = '{"played":10,"won":6,"drawn":3,"lost":1,"gd":7,"pts":21}'  where code = 'UZB';
update public.teams set qualifying_record = '{"played":5,"won":5,"drawn":0,"lost":0,"gd":28,"pts":15}'  where code = 'NZL';

-- ── CAF (10) ───────────────────────────────────────────────
update public.teams set qualifying_record = '{"played":10,"won":5,"drawn":3,"lost":2,"gd":6,"pts":18}'  where code = 'RSA';
update public.teams set qualifying_record = '{"played":8,"won":8,"drawn":0,"lost":0,"gd":20,"pts":24}'  where code = 'MAR';
update public.teams set qualifying_record = '{"played":10,"won":8,"drawn":2,"lost":0,"gd":25,"pts":26}' where code = 'CIV';
update public.teams set qualifying_record = '{"played":10,"won":9,"drawn":1,"lost":0,"gd":22,"pts":28}' where code = 'TUN';
update public.teams set qualifying_record = '{"played":10,"won":8,"drawn":2,"lost":0,"gd":18,"pts":26}' where code = 'EGY';
update public.teams set qualifying_record = '{"played":10,"won":7,"drawn":2,"lost":1,"gd":8,"pts":23}'  where code = 'CPV';
update public.teams set qualifying_record = '{"played":10,"won":7,"drawn":3,"lost":0,"gd":19,"pts":24}' where code = 'SEN';
update public.teams set qualifying_record = '{"played":10,"won":8,"drawn":1,"lost":1,"gd":16,"pts":25}' where code = 'ALG';
update public.teams set qualifying_record = '{"played":13,"won":9,"drawn":2,"lost":2,"gd":11,"pts":29}' where code = 'COD';
update public.teams set qualifying_record = '{"played":10,"won":8,"drawn":1,"lost":1,"gd":17,"pts":25}' where code = 'GHA';

-- ── CONCACAF + CONMEBOL (12) ───────────────────────────────
-- Hosts — qualified automatically, no qualifying campaign
update public.teams set qualifying_record = null where code in ('MEX', 'CAN', 'USA');

update public.teams set qualifying_record = '{"played":10,"won":6,"drawn":2,"lost":2,"gd":7,"pts":20}'  where code = 'HAI';
update public.teams set qualifying_record = '{"played":10,"won":7,"drawn":3,"lost":0,"gd":23,"pts":24}' where code = 'CUW';
update public.teams set qualifying_record = '{"played":10,"won":7,"drawn":3,"lost":0,"gd":14,"pts":24}' where code = 'PAN';
update public.teams set qualifying_record = '{"played":18,"won":12,"drawn":2,"lost":4,"gd":21,"pts":38}' where code = 'ARG';
-- Ecuador: points already reflect a CAS-imposed 3-point deduction
update public.teams set qualifying_record = '{"played":18,"won":8,"drawn":8,"lost":2,"gd":9,"pts":29}'  where code = 'ECU';
update public.teams set qualifying_record = '{"played":18,"won":7,"drawn":7,"lost":4,"gd":10,"pts":28}' where code = 'COL';
update public.teams set qualifying_record = '{"played":18,"won":7,"drawn":7,"lost":4,"gd":10,"pts":28}' where code = 'URU';
update public.teams set qualifying_record = '{"played":18,"won":8,"drawn":4,"lost":6,"gd":7,"pts":28}'  where code = 'BRA';
update public.teams set qualifying_record = '{"played":18,"won":7,"drawn":7,"lost":4,"gd":4,"pts":28}'  where code = 'PAR';
