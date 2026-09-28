-- Rolling Chase the Bag boards. Filter runs before selecting each player's best score.
-- Returns only the same public display fields as get_cash_run_leaderboard.
create or replace function public.get_cash_run_leaderboard_period(
  p_period text,
  p_limit integer default 50
)
returns table(
  id uuid,
  name text,
  score integer,
  level integer,
  character text,
  timestamp timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if p_period is null or p_period not in ('day', 'week') then
    raise exception 'invalid_period' using errcode = '22023';
  end if;

  return query
    with personal_bests as (
      select
        gs.id,
        coalesce(nullif(gs.metadata->>'name', ''), 'HUSTLER') as name,
        gs.score,
        greatest(1, least(99, coalesce((gs.metadata->>'level')::integer, 1))) as level,
        case when gs.metadata->>'character' = 'girl' then 'girl' else 'boy' end as character,
        gs.created_at as timestamp,
        row_number() over (
          partition by gs.user_id
          order by gs.score desc, gs.created_at asc, gs.id
        ) as best_rank
      from public.game_scores gs
      where gs.game_key = 'cash_run'
        and gs.created_at >= now() - case p_period
          when 'day' then interval '24 hours'
          else interval '7 days'
        end
    )
    select pb.id, pb.name, pb.score, pb.level, pb.character, pb.timestamp
    from personal_bests pb
    where pb.best_rank = 1
    order by pb.score desc, pb.timestamp asc, pb.id
    limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;
$function$;

revoke all on function public.get_cash_run_leaderboard_period(text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.get_cash_run_leaderboard_period(text, integer)
  to anon, authenticated, service_role;
