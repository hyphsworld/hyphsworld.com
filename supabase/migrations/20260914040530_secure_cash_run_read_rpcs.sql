-- Cash Run leaderboard reads only access rows already exposed by game_scores RLS.
-- Run them with the caller's privileges instead of elevated owner privileges.
alter function public.get_cash_run_leaderboard(integer) security invoker;
alter function public.get_cash_run_rank(integer) security invoker;
