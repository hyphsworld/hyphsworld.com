-- Save one authenticated Cash Run score/name pair per completed submission.
create or replace function public.submit_cash_run_score(
  p_name text,
  p_score integer,
  p_level integer,
  p_character text,
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_name, '')));
  v_score integer := coalesce(p_score, -1);
  v_level integer := coalesce(p_level, -1);
  v_character text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_character, '')));
  v_existing public.game_scores;
begin
  if v_user_id is null then
    raise exception 'Login required to save a Cash Run score.';
  end if;
  if p_submission_id is null then
    raise exception 'Submission id required.';
  end if;
  if v_name !~ '^[A-Z0-9_]{3,12}$' then
    raise exception 'Name must contain 3 to 12 letters, numbers, or underscores.';
  end if;
  if v_score < 0 or v_score > 9999999 then
    raise exception 'Invalid Cash Run score.';
  end if;
  if v_level < 1 or v_level > 99 then
    raise exception 'Invalid Cash Run level.';
  end if;
  if v_character not in ('boy', 'girl') then
    raise exception 'Invalid Cash Run character.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':cash_run:' || p_submission_id::text, 0)
  );

  select gs.* into v_existing
  from public.game_scores gs
  where gs.user_id = v_user_id
    and gs.game_key = 'cash_run'
    and gs.submission_id = p_submission_id;

  if v_existing.id is not null then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'score_id', v_existing.id,
      'score', v_existing.score,
      'name', v_existing.metadata->>'name'
    );
  end if;

  if exists (
    select 1
    from public.game_scores gs
    where gs.user_id = v_user_id
      and gs.game_key = 'cash_run'
      and gs.created_at > pg_catalog.now() - interval '10 seconds'
  ) then
    raise exception 'Cash Run submission cooldown active.';
  end if;

  perform pg_catalog.set_config('app.server_write', 'on', true);

  insert into public.game_scores (
    user_id, game_key, score, points_delta, metadata, submission_id, created_at
  ) values (
    v_user_id,
    'cash_run',
    v_score,
    0,
    pg_catalog.jsonb_build_object(
      'name', v_name,
      'level', v_level,
      'character', v_character,
      'submission_id', p_submission_id,
      'version', 1
    ),
    p_submission_id,
    pg_catalog.now()
  )
  returning * into v_existing;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'score_id', v_existing.id,
    'score', v_existing.score,
    'name', v_name
  );
end;
$function$;

revoke all on function public.submit_cash_run_score(text, integer, integer, text, uuid)
  from public, anon;
grant execute on function public.submit_cash_run_score(text, integer, integer, text, uuid)
  to authenticated, service_role;

create or replace function public.get_cash_run_leaderboard(p_limit integer default 50)
returns table(
  id uuid,
  name text,
  score integer,
  level integer,
  "character" text,
  timestamp timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  with personal_bests as (
    select
      gs.id,
      coalesce(nullif(gs.metadata->>'name', ''), 'HUSTLER') as name,
      gs.score,
      greatest(1, least(99, coalesce((gs.metadata->>'level')::integer, 1))) as level,
      case when gs.metadata->>'character' = 'girl' then 'girl' else 'boy' end as "character",
      gs.created_at as timestamp,
      row_number() over (
        partition by gs.user_id
        order by gs.score desc, gs.created_at asc, gs.id
      ) as best_rank
    from public.game_scores gs
    where gs.game_key = 'cash_run'
  )
  select pb.id, pb.name, pb.score, pb.level, pb."character", pb.timestamp
  from personal_bests pb
  where pb.best_rank = 1
  order by pb.score desc, pb.timestamp asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$function$;

revoke all on function public.get_cash_run_leaderboard(integer) from public;
grant execute on function public.get_cash_run_leaderboard(integer)
  to anon, authenticated, service_role;

create or replace function public.get_cash_run_rank(p_score integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when coalesce(p_score, -1) < 0 then null
    else 1 + count(*)::integer
  end
  from (
    select max(gs.score) as best_score
    from public.game_scores gs
    where gs.game_key = 'cash_run'
    group by gs.user_id
  ) scores
  where scores.best_score > coalesce(p_score, -1);
$function$;

revoke all on function public.get_cash_run_rank(integer) from public;
grant execute on function public.get_cash_run_rank(integer)
  to anon, authenticated, service_role;

create index if not exists game_scores_cash_run_leaderboard_idx
  on public.game_scores (score desc, created_at asc, user_id)
  where game_key = 'cash_run';
