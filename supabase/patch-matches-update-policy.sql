-- Run this once in Supabase → SQL Editor
-- Allows the sync-scores server function to write match results.
-- The service_role key bypasses RLS entirely, so this is belt-and-braces
-- but good practice to have explicitly.

CREATE POLICY "Service can update matches"
  ON public.matches FOR UPDATE
  USING (true);
