-- ============================================================
-- Patch: update score_predictions_for_match to handle:
--   1. MD3+ goal-difference bonus (4 pts)
--   2. KO penalty shootout scoring rules
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

create or replace function public.score_predictions_for_match(match_id_in int)
returns void language plpgsql as $$
declare
  m record;
begin
  select home_score, away_score, matchday, penalty_winner
    into m
  from public.matches
  where id = match_id_in;

  update public.predictions p set points_awarded = (
    case
      -- ── KO match that went to penalties ──────────────────────────────
      when m.matchday is null and m.penalty_winner is not null then (
        case
          -- Exact score + correct penalty winner = 5  (e.g. predict 1-1, pick right winner)
          when p.home_score = m.home_score
           and p.away_score = m.away_score
           and p.tiebreak_winner = m.penalty_winner         then 5
          -- Correct GD + correct winner + predicted draw = 4  (e.g. predict 2-2 when match was 1-1, right winner)
          when p.home_score = p.away_score
           and (p.home_score - p.away_score) = (m.home_score - m.away_score)
           and p.tiebreak_winner = m.penalty_winner         then 4
          -- Exact score + wrong winner = 3  (correct result, wrong coin flip)
          when p.home_score = m.home_score
           and p.away_score = m.away_score                  then 3
          -- Everything else = 1 (wrong-score draw + wrong winner, or predicted outright winner)
          else 1
        end
      )

      -- ── Normal / ET match (result decided in 90 or 120 min) ─────────
      -- Exact score = 5
      when p.home_score = m.home_score
       and p.away_score = m.away_score                      then 5
      -- Correct result + correct goal difference (MD3 or KO) = 4
      when sign(p.home_score - p.away_score) = sign(m.home_score - m.away_score)
       and (p.home_score - p.away_score) = (m.home_score - m.away_score)
       and (m.matchday >= 3 or m.matchday is null)          then 4
      -- Correct result = 3
      when sign(p.home_score - p.away_score) = sign(m.home_score - m.away_score)
                                                             then 3
      -- Participated = 1
      else 1
    end
  )
  where p.match_id = match_id_in
    and p.home_score is not null
    and p.away_score is not null;
end;
$$;
