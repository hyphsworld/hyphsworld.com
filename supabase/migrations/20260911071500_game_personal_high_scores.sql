-- Show one personal best per player and game without exposing private profile fields.
create or replace function public.get_game_leaderboard(
  p_limit integer default 8,
  p_game_key text default null
)
returns table(
  id uuid,
  user_id uuid,
  display_name text,
  avatar_icon text,
  game_key text,
  score integer,
  points_delta integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  with ranked_scores as (
    select
      gs.id,
      gs.user_id,
      coalesce(nullif(p.display_name, ''), nullif(p.username, ''), 'HYPHSWORLD Player') as display_name,
      coalesce(nullif(p.avatar_icon, ''), '🧢') as avatar_icon,
      gs.game_key,
      gs.score,
      gs.points_delta,
      gs.created_at,
      row_number() over (
        partition by gs.user_id, gs.game_key
        order by gs.score desc, gs.created_at asc, gs.id
      ) as best_rank
    from public.game_scores gs
    join public.profiles p on p.id = gs.user_id
    where p_game_key is null or gs.game_key = p_game_key
  )
  select
    ranked_scores.id,
    ranked_scores.user_id,
    ranked_scores.display_name,
    ranked_scores.avatar_icon,
    ranked_scores.game_key,
    ranked_scores.score,
    ranked_scores.points_delta,
    ranked_scores.created_at
  from ranked_scores
  where ranked_scores.best_rank = 1
  order by ranked_scores.score desc, ranked_scores.created_at asc
  limit least(greatest(coalesce(p_limit, 8), 1), 100);
$function$;

-- This RPC is intentionally public: it returns only scoreboard-safe fields,
-- clamps output to 100 rows, and does not expose email or private profile data.
revoke all on function public.get_game_leaderboard(integer, text) from public;
grant execute on function public.get_game_leaderboard(integer, text) to anon, authenticated, service_role;
