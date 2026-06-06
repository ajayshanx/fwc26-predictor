-- ============================================================
-- FWC 2026 Match Predictor — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  name        text not null,
  nickname    text,
  created_at  timestamptz default now()
);

-- ============================================================
-- GROUPS (player groups)
-- ============================================================
create table if not exists public.groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  admin_user_id uuid references public.users(id) on delete set null,
  invite_token  text unique default encode(gen_random_bytes(16), 'hex'),
  created_at    timestamptz default now()
);

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
create table if not exists public.group_members (
  group_id   uuid references public.groups(id) on delete cascade,
  user_id    uuid references public.users(id) on delete cascade,
  joined_at  timestamptz default now(),
  primary key (group_id, user_id)
);

-- ============================================================
-- TEAMS
-- ============================================================
create table if not exists public.teams (
  code            char(3) primary key,  -- FIFA 3-letter code e.g. ARG
  name            text not null,
  group_letter    char(1) not null,
  fifa_ranking    int,
  flag_code       text,                 -- ISO 3166-1 alpha-2 for flagcdn.com
  kit_home        text default '#ffffff',
  kit_away        text default '#000000',
  kit_home_alt    text default '#cccccc',
  -- Qualifying campaign record, e.g. {"played":6,"won":5,"drawn":0,"lost":1,"gd":13,"pts":15}
  -- null for tournament hosts (MEX/CAN/USA), who qualified automatically.
  qualifying_record jsonb
);

-- ============================================================
-- MATCHES
-- ============================================================
create table if not exists public.matches (
  id               serial primary key,
  home_team        char(3) references public.teams(code),
  away_team        char(3) references public.teams(code),
  kickoff_utc      timestamptz not null,
  group_letter     char(1) not null,
  matchday         int not null,        -- 1, 2, or 3
  venue_city       text,
  venue_country    text,
  venue_stadium    text,
  -- Live / final scores
  home_score       int,
  away_score       int,
  status           text default 'scheduled', -- scheduled | live | completed
  match_minute     int,
  -- Conduct (for tiebreaker)
  home_yellows     int default 0,
  home_indirect_reds int default 0,
  home_direct_reds   int default 0,
  away_yellows     int default 0,
  away_indirect_reds int default 0,
  away_direct_reds   int default 0
);

-- ============================================================
-- PREDICTIONS
-- ============================================================
create table if not exists public.predictions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.users(id) on delete cascade,
  match_id       int references public.matches(id) on delete cascade,
  home_score     int not null,
  away_score     int not null,
  points_awarded int,                   -- null = match not yet completed
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (user_id, match_id)
);

-- ============================================================
-- FUNCTION: auto-update predictions.updated_at
-- ============================================================
create or replace function public.handle_prediction_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger predictions_updated_at
  before update on public.predictions
  for each row execute procedure public.handle_prediction_updated_at();

-- ============================================================
-- FUNCTION: calculate and store points when a match completes
-- ============================================================
create or replace function public.score_predictions_for_match(match_id_in int)
returns void language plpgsql as $$
declare
  m record;
  actual_result int;
  pred_result   int;
  pts           int;
begin
  select home_score, away_score into m
  from public.matches where id = match_id_in;

  actual_result := sign(m.home_score - m.away_score);

  update public.predictions p set points_awarded = (
    case
      when p.home_score = m.home_score and p.away_score = m.away_score then 5
      when sign(p.home_score - p.away_score) = actual_result then 3
      else 1
    end
  )
  where p.match_id = match_id_in;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.users           enable row level security;
alter table public.groups          enable row level security;
alter table public.group_members   enable row level security;
alter table public.teams           enable row level security;
alter table public.matches         enable row level security;
alter table public.predictions     enable row level security;

-- Public read on teams and matches
create policy "Teams are public" on public.teams for select using (true);
create policy "Matches are public" on public.matches for select using (true);

-- Users: anyone can insert (sign up), select own row
create policy "Users can register" on public.users for insert with check (true);
create policy "Users can read all" on public.users for select using (true);

-- Groups: anyone can read (needed for invite flow), members can insert
create policy "Groups are readable" on public.groups for select using (true);
create policy "Anyone can create group" on public.groups for insert with check (true);
create policy "Admin can update group" on public.groups for update using (true);

-- Group members: readable by all, insertable by all (invite flow handles auth)
create policy "Group members readable" on public.group_members for select using (true);
create policy "Anyone can join group" on public.group_members for insert with check (true);

-- Predictions: anyone can read (for points table), users manage their own
create policy "Predictions are public" on public.predictions for select using (true);
create policy "Anyone can insert prediction" on public.predictions for insert with check (true);
create policy "Anyone can update prediction" on public.predictions for update using (true);

-- ============================================================
-- REALTIME: enable for live score and prediction updates
-- ============================================================
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table
    public.matches,
    public.predictions;
commit;
