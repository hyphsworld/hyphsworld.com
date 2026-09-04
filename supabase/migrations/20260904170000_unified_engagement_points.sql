-- Server-owned Cool Points awards for meaningful site engagement.
-- The browser selects an action; PostgreSQL owns amounts, cooldowns, and caps.

create index if not exists cool_points_ledger_user_source_created_idx
  on public.cool_points_ledger (user_id, source, created_at desc);

create or replace function public.award_engagement_action(
  p_action text,
  p_context text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_action text := lower(trim(coalesce(p_action, '')));
  v_context text := left(lower(trim(coalesce(p_context, ''))), 120);
  v_source text;
  v_amount integer;
  v_daily_cap integer;
  v_cooldown interval;
  v_last_award timestamptz;
  v_today_points integer := 0;
  v_balance integer := 0;
begin
  if v_user_id is null then
    raise exception 'Login required.';
  end if;

  select amount, daily_cap, cooldown
  into v_amount, v_daily_cap, v_cooldown
  from (values
    ('session_start',       3,  3, interval '1 day'),
    ('page_view',           1, 10, interval '30 minutes'),
    ('navigation',          1, 15, interval '5 minutes'),
    ('music_start',         1,  5, interval '30 minutes'),
    ('video_progress',      3,  9, interval '1 day'),
    ('game_open',           2, 10, interval '30 minutes'),
    ('profile_update',      5,  5, interval '1 day'),
    ('vault_visit',         2,  4, interval '6 hours'),
    ('shop_visit',          2,  4, interval '6 hours'),
    ('social_visit',        2,  6, interval '1 day'),
    ('share',               5, 10, interval '1 day'),
    ('helper_interaction',  1,  5, interval '1 hour'),
    ('form_submit',         3,  6, interval '1 day')
  ) as catalog(action_key, amount, daily_cap, cooldown)
  where action_key = v_action;

  if v_amount is null then
    raise exception 'Unknown engagement action.';
  end if;

  v_source := 'engagement_' || v_action;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':engagement:' || v_action, 0)
  );

  select max(l.created_at)
  into v_last_award
  from public.cool_points_ledger l
  where l.user_id = v_user_id
    and l.source = v_source
    and coalesce(l.metadata ->> 'context', '') = v_context;

  select coalesce(sum(greatest(l.amount, 0)), 0)::integer
  into v_today_points
  from public.cool_points_ledger l
  where l.user_id = v_user_id
    and l.source = v_source
    and l.created_at >= date_trunc('day', now());

  insert into public.profiles (
    id, points, cool_points, lifetime_points, leaderboard_score,
    created_at, updated_at
  ) values (
    v_user_id, 0, 0, 0, 0, now(), now()
  ) on conflict (id) do nothing;

  select coalesce(p.cool_points, p.points, 0)
  into v_balance
  from public.profiles p
  where p.id = v_user_id;

  if v_last_award is not null and v_last_award > now() - v_cooldown then
    return jsonb_build_object(
      'ok', true, 'awarded', false, 'reason', 'cooldown',
      'action', v_action, 'amount', 0, 'balance', v_balance
    );
  end if;

  if v_today_points + v_amount > v_daily_cap then
    return jsonb_build_object(
      'ok', true, 'awarded', false, 'reason', 'daily_cap',
      'action', v_action, 'amount', 0, 'balance', v_balance
    );
  end if;

  perform set_config('app.server_write', 'on', true);

  update public.profiles p
  set cool_points = coalesce(p.cool_points, p.points, 0) + v_amount,
      points = coalesce(p.cool_points, p.points, 0) + v_amount,
      lifetime_points = coalesce(p.lifetime_points, 0) + v_amount,
      leaderboard_score = coalesce(p.leaderboard_score, 0) + v_amount,
      updated_at = now()
  where p.id = v_user_id
  returning coalesce(p.cool_points, p.points, 0) into v_balance;

  insert into public.cool_points_ledger (
    user_id, amount, reason, source, metadata, created_at
  ) values (
    v_user_id,
    v_amount,
    'Engagement: ' || replace(v_action, '_', ' '),
    v_source,
    jsonb_build_object('action', v_action, 'context', v_context, 'version', 1),
    now()
  );

  return jsonb_build_object(
    'ok', true, 'awarded', true, 'action', v_action,
    'amount', v_amount, 'balance', v_balance,
    'daily_earned', v_today_points + v_amount, 'daily_cap', v_daily_cap
  );
end;
$function$;

revoke all on function public.award_engagement_action(text, text) from public, anon;
grant execute on function public.award_engagement_action(text, text) to authenticated, service_role;

