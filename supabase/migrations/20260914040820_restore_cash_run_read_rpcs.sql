-- Keep game_scores unavailable for direct anonymous reads while exposing only
-- the clamped, field-limited Cash Run leaderboard and rank responses.
alter function public.get_cash_run_leaderboard(integer) security definer;
alter function public.get_cash_run_rank(integer) security definer;
