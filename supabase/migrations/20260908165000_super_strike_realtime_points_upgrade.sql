-- Super Strike multiplayer + Cool Points upgrade.
-- Applied to production project yuhxtdkhsltaqiagrtys on 2026-09-08.
-- Rewards are server-owned, capped, idempotent, and never trust a browser-selected amount.

create or replace function private.award_super_strike_points(
  p_user_id uuid,
  p_amount integer,
  p_source text,
  p_context text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_daily_cap integer := case p_source when 'super_strike_multiplayer' then 40 else 30 end;
  v_today integer := 0;
  v_last timestamptz;
  v_balance integer := 0;
begin
  if p_user_id is null or p_amount <= 0 or p_amount > 20 then
    raise exception 'invalid_super_strike_reward';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text || ':' || p_source, 0)
  );

  insert into public.profiles (
    id, points, cool_points, lifetime_points, leaderboard_score, created_at, updated_at
  ) values (
    p_user_id, 0, 0, 0, 0, now(), now()
  ) on conflict (id) do nothing;

  select coalesce(sum(greatest(l.amount, 0)), 0)::integer,
         max(l.created_at)
  into v_today, v_last
  from public.cool_points_ledger l
  where l.user_id = p_user_id
    and l.source = p_source
    and l.created_at >= pg_catalog.date_trunc('day', now());

  if exists (
    select 1 from public.cool_points_ledger l
    where l.user_id = p_user_id
      and l.source = p_source
      and coalesce(l.metadata ->> 'context', '') = coalesce(p_context, '')
  ) then
    select coalesce(p.cool_points, p.points, 0) into v_balance
    from public.profiles p where p.id = p_user_id;
    return jsonb_build_object('awarded', false, 'amount', 0, 'balance', v_balance, 'reason', 'duplicate');
  end if;

  if p_source = 'super_strike_complete'
     and v_last is not null
     and v_last > now() - interval '90 seconds' then
    select coalesce(p.cool_points, p.points, 0) into v_balance
    from public.profiles p where p.id = p_user_id;
    return jsonb_build_object('awarded', false, 'amount', 0, 'balance', v_balance, 'reason', 'cooldown');
  end if;

  if v_today + p_amount > v_daily_cap then
    select coalesce(p.cool_points, p.points, 0) into v_balance
    from public.profiles p where p.id = p_user_id;
    return jsonb_build_object('awarded', false, 'amount', 0, 'balance', v_balance, 'reason', 'daily_cap');
  end if;

  perform set_config('app.server_write', 'on', true);

  update public.profiles p
  set cool_points = coalesce(p.cool_points, p.points, 0) + p_amount,
      points = coalesce(p.cool_points, p.points, 0) + p_amount,
      lifetime_points = coalesce(p.lifetime_points, 0) + p_amount,
      leaderboard_score = coalesce(p.leaderboard_score, 0) + p_amount,
      updated_at = now()
  where p.id = p_user_id
  returning coalesce(p.cool_points, p.points, 0) into v_balance;

  insert into public.cool_points_ledger (
    user_id, amount, reason, source, metadata, created_at
  ) values (
    p_user_id,
    p_amount,
    p_reason,
    p_source,
    jsonb_build_object('context', coalesce(p_context, ''), 'game_key', 'super_strike', 'version', 2),
    now()
  );

  return jsonb_build_object('awarded', true, 'amount', p_amount, 'balance', v_balance);
end;
$function$;

revoke all on function private.award_super_strike_points(uuid, integer, text, text, text)
  from public, anon, authenticated;

create or replace function public.super_strike_room_payload(p_room_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'id', r.id::text,
    'code', r.room_code,
    'status', r.status,
    'winner', case
      when r.status <> 'finished' then null
      when (select count(*) from public.game_players gp where gp.room_id=r.id and gp.status<>'left') < 2 then null
      when (select max(gp.score) from public.game_players gp where gp.room_id=r.id and gp.status<>'left') =
           (select min(gp.score) from public.game_players gp where gp.room_id=r.id and gp.status<>'left') then 'tie'
      else (select gp.user_id::text from public.game_players gp where gp.room_id=r.id and gp.status<>'left' order by gp.score desc, gp.joined_at limit 1)
    end,
    'reward_amount', coalesce((
      select sum(l.amount)::integer from public.cool_points_ledger l
      where l.user_id=(select auth.uid())
        and l.source='super_strike_multiplayer'
        and coalesce(l.metadata->>'context','')=r.id::text
    ),0),
    'balance', coalesce((select p.cool_points from public.profiles p where p.id=(select auth.uid())),0),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',gp.user_id::text,
        'name',coalesce(p.display_name,'HYPHSWORLD Bowler'),
        'score',gp.score,
        'current_frame',coalesce((s.state->'progress'->gp.user_id::text->>'current_frame')::integer,0),
        'finished',coalesce((s.state->'progress'->gp.user_id::text->>'finished')::boolean,false),
        'is_host',gp.user_id=r.host_id
      ) order by gp.seat_number)
      from public.game_players gp
      left join public.profiles p on p.id=gp.user_id
      left join public.game_state s on s.room_id=r.id
      where gp.room_id=r.id and gp.status<>'left'
    ), '[]'::jsonb)
  )
  from public.game_rooms r
  where r.id=p_room_id
    and r.game_type='super_strike'
    and exists(
      select 1 from public.game_players me
      where me.room_id=r.id and me.user_id=(select auth.uid()) and me.status<>'left'
    );
$function$;

create or replace function public.update_super_strike_room(
  p_room_code text,
  p_score integer,
  p_current_frame integer,
  p_finished boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_room public.game_rooms;
  v_state jsonb;
  v_old_score integer := 0;
  v_old_frame integer := 0;
  v_finished_now uuid;
  v_max_score integer;
  v_min_score integer;
  v_player record;
  v_reward integer;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_score is null or p_score < 0 or p_score > 300 then raise exception 'invalid_score'; end if;
  if p_current_frame is null or p_current_frame < 0 or p_current_frame > 10 then raise exception 'invalid_frame'; end if;
  if coalesce(p_finished,false) and p_current_frame < 10 then raise exception 'cannot_finish_early'; end if;

  select * into v_room
  from public.game_rooms
  where room_code=upper(trim(p_room_code)) and game_type='super_strike';

  if v_room.id is null or not exists(
    select 1 from public.game_players
    where room_id=v_room.id and user_id=v_user and status<>'left'
  ) then raise exception 'not_room_player'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_room.id::text || ':' || v_user::text, 0)
  );

  select gp.score into v_old_score
  from public.game_players gp
  where gp.room_id=v_room.id and gp.user_id=v_user
  for update;

  select state into v_state
  from public.game_state
  where room_id=v_room.id
  for update;

  v_old_frame := coalesce((v_state->'progress'->v_user::text->>'current_frame')::integer,0);

  if p_score < coalesce(v_old_score,0) then raise exception 'score_regression'; end if;
  if p_current_frame < v_old_frame then raise exception 'frame_regression'; end if;

  update public.game_players
  set score=p_score,
      status=case when coalesce(p_finished,false) then 'ready' else 'playing' end
  where room_id=v_room.id and user_id=v_user;

  v_state := jsonb_set(
    coalesce(v_state,'{}'::jsonb),
    array['progress',v_user::text],
    jsonb_build_object(
      'current_frame',p_current_frame,
      'finished',coalesce(p_finished,false),
      'updated_at',now()
    ),
    true
  );

  update public.game_state
  set state=v_state, updated_by=v_user, updated_at=now(), version=version+1
  where room_id=v_room.id;

  if (select count(*) from public.game_players where room_id=v_room.id and status='ready')=2 then
    update public.game_rooms
    set status='finished', updated_at=now()
    where id=v_room.id and status<>'finished'
    returning id into v_finished_now;

    if v_finished_now is not null then
      select max(score), min(score)
      into v_max_score, v_min_score
      from public.game_players
      where room_id=v_room.id and status<>'left';

      for v_player in
        select user_id, score from public.game_players
        where room_id=v_room.id and status<>'left'
      loop
        v_reward := 5;
        if v_max_score <> v_min_score and v_player.score = v_max_score then
          v_reward := 8;
        end if;
        perform private.award_super_strike_points(
          v_player.user_id,
          v_reward,
          'super_strike_multiplayer',
          v_room.id::text,
          case when v_reward=8 then 'Super Strike multiplayer win' else 'Super Strike multiplayer match' end
        );
      end loop;
    end if;
  end if;

  return public.super_strike_room_payload(v_room.id);
end;
$function$;

revoke all on function public.update_super_strike_room(text, integer, integer, boolean)
  from public, anon;
grant execute on function public.update_super_strike_room(text, integer, integer, boolean)
  to authenticated;

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
  v_game_key text := lower(trim(coalesce(p_game_key, '')));
  v_score integer := coalesce(p_score, -1);
  v_recent_count integer := 0;
  v_balance integer := 0;
  v_mode text := lower(coalesce(p_metadata->>'mode','solo'));
  v_award jsonb := '{}'::jsonb;
  v_points integer := 0;
  v_context text;
begin
  if v_user_id is null then raise exception 'Login required to submit game run.'; end if;
  if v_game_key <> 'super_strike' then raise exception 'Unsupported game submission.'; end if;
  if v_score < 0 or v_score > 300 then raise exception 'Invalid Super Strike score.'; end if;
  if coalesce(p_points_delta, 0) <> 0 then raise exception 'Game submissions cannot choose Cool Points.'; end if;
  if v_mode not in ('solo','cpu','multiplayer') then raise exception 'Invalid Super Strike mode.'; end if;
  if pg_catalog.octet_length(coalesce(p_metadata, '{}'::jsonb)::text) > 2048 then raise exception 'Game metadata is too large.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':game_run:' || v_game_key, 0)
  );

  select count(*) into v_recent_count
  from public.game_scores gs
  where gs.user_id=v_user_id
    and gs.game_key=v_game_key
    and gs.created_at > now() - interval '15 seconds';

  if v_recent_count > 0 then raise exception 'Game submission cooldown active.'; end if;

  insert into public.profiles (
    id, points, cool_points, lifetime_points, leaderboard_score, created_at, updated_at
  ) values (
    v_user_id,0,0,0,0,now(),now()
  ) on conflict(id) do nothing;

  if v_mode in ('solo','cpu') then
    v_context := gen_random_uuid()::text;
    v_award := private.award_super_strike_points(
      v_user_id, 3, 'super_strike_complete', v_context, 'Super Strike game complete'
    );
    v_points := coalesce((v_award->>'amount')::integer,0);
  end if;

  insert into public.game_scores (
    user_id, game_key, score, points_delta, metadata, created_at
  ) values (
    v_user_id,
    v_game_key,
    v_score,
    v_points,
    coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('points_awarded',v_points),
    now()
  );

  select coalesce(p.cool_points,p.points,0) into v_balance
  from public.profiles p where p.id=v_user_id;

  return jsonb_build_object(
    'ok',true,
    'game_key',v_game_key,
    'score',v_score,
    'points_delta',v_points,
    'balance',v_balance,
    'wallet','profiles.cool_points',
    'ledger','cool_points_ledger'
  );
end;
$function$;

revoke all on function public.submit_game_run(text, integer, integer, jsonb)
  from public, anon;
grant execute on function public.submit_game_run(text, integer, integer, jsonb)
  to authenticated, service_role;
