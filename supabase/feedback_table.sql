-- Feedback table — run this once in the Supabase SQL editor to add the
-- "Send Feedback" feature. Safe to re-run (uses IF NOT EXISTS guards).

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete set null,
  message     text not null,
  created_at  timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Anyone (including anonymous app users) can submit feedback.
-- No select policy is added on purpose — feedback stays private and is
-- only visible via the Supabase dashboard (Table Editor), which uses the
-- service role and bypasses RLS.
drop policy if exists "Anyone can submit feedback" on public.feedback;
create policy "Anyone can submit feedback" on public.feedback for insert with check (true);

commit;
