-- Security-first containment for legacy point awards and Super Strike scores.
-- Applied to production project yuhxtdkhsltaqiagrtys on 2026-09-07.

create or replace function public.award_points(
  p_amount integer,
  p_reason text default 'site_action',
  p_metadata jsonb default '{}'::jsonb
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_action text;
  v_result jsonb;
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Keep the legacy signature working, but never trust a browser-selected amount.
  v_action := case lower(trim(coalesce(p_reason, 'site_action')))
    when 'site_action' then 'page_view'
    when 'daily_visit' then 'session_start'
    when 'music_play' then 'music_start'
    when 'vault_unlock' then 'vault_visit'
    when 'casino_play' then 'game_open'
    when 'game_score' then 'game_open'
    when 'profile_update' then 'profile_update'
    when 'share_action' then 'share'
    else null
  end;

  if v_action is null then
    raise exception 'invalid_points_reason';
  end if;

  v_result := public.award_engagement_action(v_action, 'legacy_award_points');

  select p.*
  into v_profile
  from public.profiles p
  where p.id = v_user_id;

  return v_profile;
end;
$function$;

revoke all on function public.award_points(integer, text, jsonb) from public, anon;
grant execute on function public.award_points(integer, text, jsonb) to authenticated, service_role;

create or replace function public.submit_game_run(
  p_game_key text,
  p_score integer,
  p_points_delta integer,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_game_key text := lower(trim(coalesce(p_game_key, ''));
  v_score integer := coalesce(p_score, -1);
  v_recent_count integer := 0;
  v_balance integer := 0;
begin
  if v_user_id is null then
    raise exception 'Login required to submit game run.';
  end if;

  if v_game_key <> 'super_strike' then
    raise exception 'Unsupported game submission.';
  end if;

  if v_score < 0 or v_score > 300 then
    raise exception 'Invalid Super Strike score.';
  end if;

  if coalesce(p_points_delta, 0) <> 0 then
    raise exception 'Game submissions cannot change Cool Points.';
  end if;

  if pg_catalog.octet_length(coalesce(p_metadata, '{}'::jsonb)::text) > 2048 then
    raise exception 'Game metadata is too large.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':game_run:' || v_game_key, 0)
  );

  select count(*)
  into v_recent_count
  from public.game_scores gs
  where gs.user_id = v_user_id
    and gs.game_key = v_game_key
    and gs.created_at > now() - interval '15 seconds';

  if v_recent_count > 0 then
    raise exception 'Game submission cooldown active.';
  end if;

  insert into public.profiles (
    id, points, cool_points, lifetime_points, leaderboard_score,
    created_at, updated_at
  )
  values (v_user_id, 0, 0, 0, 0, now(), now())
  on conflict (id) do nothing;

  insert into public.game_scores (
    user_id, game_key, score, points_delta, metadata, created_at
  )
  values (
    v_user_id, v_game_key, v_score, 0, coalesce(p_metadata, '{}'::jsonb), now()
  );

  select coalesce(p.cool_points, p.points, 0)
  into v_balance
  from public.profiles p
  where p.id = v_user_id;

  return jsonb_build_object(
    'ok', true,
    'game_key', v_game_key,
    'score', v_score,
    'points_delta', 0,
    'balance', v_balance,
    'wallet', 'profiles.cool_points',
    'ledger', 'cool_points_ledger'
  );
end;
$function$;

revoke all on function public.submit_game_run(text, integer, integer, jsonb) from public, anon;
grant execute on function public.submit_game_run(text, integer, integer, jsonb) to authenticated, service_role;

-- These compatibility overloads have no repository callers. Keep them for
-- trusted service work while removing direct browser execution.
revoke all on function public.earn_cool_points(integer, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.earn_cool_points(integer, text, jsonb)
  to service_role;

revoke all on function public.spend_cool_points(integer, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.spend_cool_points(integer, text, jsonb)
  to service_role;

-- Equivalent indexes add write cost without changing query coverage.
drop index if exists public.idx_points_ledger_user_created;
drop index if exists public.idx_vault_unlocks_user_level;
drop index if exists public.vault_unlocks_user_level_idx;
drop index if exists public.vault_unlocks_user_level_uidx;
