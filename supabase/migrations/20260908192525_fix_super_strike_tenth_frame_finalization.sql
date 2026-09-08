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
  v_effective_frame integer;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_score is null or p_score < 0 or p_score > 300 then raise exception 'invalid_score'; end if;
  if p_current_frame is null or p_current_frame < 0 or p_current_frame > 10 then raise exception 'invalid_frame'; end if;

  v_effective_frame := case
    when coalesce(p_finished, false) and p_current_frame = 9 then 10
    else p_current_frame
  end;

  if coalesce(p_finished,false) and v_effective_frame < 10 then raise exception 'cannot_finish_early'; end if;

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
  if v_effective_frame < v_old_frame then raise exception 'frame_regression'; end if;

  update public.game_players
  set score=p_score,
      status=case when coalesce(p_finished,false) then 'ready' else 'playing' end
  where room_id=v_room.id and user_id=v_user;

  v_state := jsonb_set(
    coalesce(v_state,'{}'::jsonb),
    array['progress',v_user::text],
    jsonb_build_object(
      'current_frame',v_effective_frame,
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

revoke all on function public.update_super_strike_room(text, integer, integer, boolean) from public, anon;
grant execute on function public.update_super_strike_room(text, integer, integer, boolean) to authenticated;
