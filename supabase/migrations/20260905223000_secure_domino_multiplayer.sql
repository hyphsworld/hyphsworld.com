-- Secure, atomic multiplayer operations for the 01 Domino Room.
-- The browser sends intentions only; Postgres owns seating, turns, state, and rewards.

create or replace function public.domino_hand_rank(p_hand jsonb)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(max(
    case
      when (tile->>0)::integer = (tile->>1)::integer then 100 + (tile->>0)::integer
      else (tile->>0)::integer + (tile->>1)::integer
    end
  ), -1)
  from jsonb_array_elements(coalesce(p_hand, '[]'::jsonb)) as bones(tile);
$$;

create or replace function public.domino_hand_score(p_hand jsonb)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(sum((tile->>0)::integer + (tile->>1)::integer), 0)::integer
  from jsonb_array_elements(coalesce(p_hand, '[]'::jsonb)) as bones(tile);
$$;

create or replace function public.domino_opening_tile(p_hand jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select tile
  from jsonb_array_elements(coalesce(p_hand, '[]'::jsonb)) as bones(tile)
  order by
    case
      when (tile->>0)::integer = (tile->>1)::integer then 100 + (tile->>0)::integer
      else (tile->>0)::integer + (tile->>1)::integer
    end desc
  limit 1;
$$;

create or replace function public.domino_tile_playable(p_tile jsonb, p_board jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_array_length(coalesce(p_board, '[]'::jsonb)) = 0 then true
    else
      (p_tile->>0)::integer in (
        ((p_board->0)->>0)::integer,
        ((p_board->(jsonb_array_length(p_board) - 1))->>1)::integer
      )
      or
      (p_tile->>1)::integer in (
        ((p_board->0)->>0)::integer,
        ((p_board->(jsonb_array_length(p_board) - 1))->>1)::integer
      )
  end;
$$;

create or replace function public.domino_has_playable(p_hand jsonb, p_board jsonb, p_opening_tile jsonb default null)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(p_hand, '[]'::jsonb)) as bones(tile)
    where public.domino_tile_playable(tile, p_board)
      and (
        jsonb_array_length(coalesce(p_board, '[]'::jsonb)) > 0
        or p_opening_tile is null
        or tile = p_opening_tile
      )
  );
$$;

create or replace function public.domino_safe_state(p_state jsonb, p_user_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_key text;
  v_hand jsonb;
  v_safe_hands jsonb := '{}'::jsonb;
  v_hidden jsonb;
begin
  for v_key, v_hand in
    select key, value from jsonb_each(coalesce(p_state->'hands', '{}'::jsonb))
  loop
    if v_key = p_user_id::text then
      v_safe_hands := jsonb_set(v_safe_hands, array[v_key], v_hand, true);
    else
      select coalesce(jsonb_agg('null'::jsonb order by ordinality), '[]'::jsonb)
      into v_hidden
      from jsonb_array_elements(coalesce(v_hand, '[]'::jsonb)) with ordinality;
      v_safe_hands := jsonb_set(v_safe_hands, array[v_key], v_hidden, true);
    end if;
  end loop;

  return jsonb_set(p_state, '{hands}', v_safe_hands, true);
end;
$$;

create or replace function public.is_domino_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(select 1 from public.game_rooms where id = p_room_id and game_type = 'dominos');
$$;

create or replace function public.get_domino_state(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_room public.game_rooms%rowtype;
  v_state public.game_state%rowtype;
begin
  if v_user is null then raise exception 'LOGIN_REQUIRED'; end if;

  select * into v_room from public.game_rooms where id = p_room_id and game_type = 'dominos';
  if v_room.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
  if not exists (select 1 from public.game_players where room_id = p_room_id and user_id = v_user and status <> 'left') then
    raise exception 'NOT_A_TABLE_MEMBER';
  end if;

  select * into v_state from public.game_state where room_id = p_room_id;
  return jsonb_build_object(
    'ok', true,
    'room', to_jsonb(v_room),
    'state', public.domino_safe_state(v_state.state, v_user),
    'version', v_state.version
  );
end;
$$;

create or replace function public.list_domino_rooms()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_rooms jsonb;
begin
  if v_user is null then raise exception 'LOGIN_REQUIRED'; end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
  into v_rooms
  from (
    select gr.id, gr.room_code, gr.game_type, gr.status, gr.max_players, gr.created_at,
      (select count(*)::integer from public.game_players gp where gp.room_id = gr.id and gp.status <> 'left') as player_count
    from public.game_rooms gr
    where gr.game_type = 'dominos'
      and gr.status in ('waiting', 'playing')
      and (
        gr.status = 'waiting'
        or gr.host_id = v_user
        or exists (select 1 from public.game_players gp where gp.room_id = gr.id and gp.user_id = v_user and gp.status <> 'left')
      )
    order by gr.created_at desc
    limit 10
  ) r;

  return jsonb_build_object('ok', true, 'rooms', v_rooms);
end;
$$;

create or replace function public.join_domino_room(p_room_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_code text := upper(left(regexp_replace(coalesce(p_room_code, ''), '[^A-Za-z0-9]', '', 'g'), 10));
  v_room public.game_rooms%rowtype;
  v_state public.game_state%rowtype;
  v_hand jsonb;
  v_deck jsonb;
  v_remaining jsonb;
  v_hands jsonb;
  v_host_hand jsonb;
  v_starter uuid;
  v_next_version integer;
begin
  if v_user is null then raise exception 'LOGIN_REQUIRED'; end if;
  if v_code = '' then raise exception 'ROOM_CODE_REQUIRED'; end if;

  select * into v_room
  from public.game_rooms
  where room_code = v_code and game_type = 'dominos'
  for update;

  if v_room.id is null then raise exception 'TABLE_NOT_FOUND'; end if;

  select * into v_state from public.game_state where room_id = v_room.id for update;
  if v_state.room_id is null then raise exception 'TABLE_STATE_MISSING'; end if;

  if not exists (select 1 from public.game_players where room_id = v_room.id and user_id = v_user and status <> 'left') then
    if v_room.status <> 'waiting' then raise exception 'TABLE_ALREADY_STARTED'; end if;
    if (select count(*) from public.game_players where room_id = v_room.id and status <> 'left') >= 2 then
      raise exception 'TABLE_FULL';
    end if;

    insert into public.game_players (room_id, user_id, seat_number, status, score, bet)
    values (v_room.id, v_user, 2, 'ready', 0, 0);

    v_deck := coalesce(v_state.state->'deck', '[]'::jsonb);
    if jsonb_array_length(v_deck) < 7 then raise exception 'BONEYARD_STATE_INVALID'; end if;

    select
      coalesce(jsonb_agg(value order by ordinality) filter (where ordinality <= 7), '[]'::jsonb),
      coalesce(jsonb_agg(value order by ordinality) filter (where ordinality > 7), '[]'::jsonb)
    into v_hand, v_remaining
    from jsonb_array_elements(v_deck) with ordinality;

    v_hands := coalesce(v_state.state->'hands', '{}'::jsonb) || jsonb_build_object(v_user::text, v_hand);
    v_host_hand := coalesce(v_hands->v_room.host_id::text, '[]'::jsonb);
    v_starter := case
      when public.domino_hand_rank(v_hand) > public.domino_hand_rank(v_host_hand) then v_user
      else v_room.host_id
    end;
    v_next_version := v_state.version + 1;

    v_state.state := v_state.state || jsonb_build_object(
      'version', v_next_version,
      'status', 'playing',
      'hands', v_hands,
      'deck', v_remaining,
      'turnUserId', v_starter,
      'openingTile', public.domino_opening_tile(v_hands->v_starter::text),
      'consecutivePasses', 0,
      'winnerUserId', null,
      'finishReason', null,
      'updatedAt', now(),
      'log', coalesce(v_state.state->'log', '[]'::jsonb) || jsonb_build_array('Buck: Player two cleared. High bone opens.')
    );

    update public.game_state
    set state = v_state.state, version = v_next_version, updated_by = v_user, updated_at = now()
    where room_id = v_room.id;
    update public.game_rooms
    set status = 'playing', current_turn_user_id = v_starter, updated_at = now()
    where id = v_room.id;
    v_room.status := 'playing';
    v_room.current_turn_user_id := v_starter;
  end if;

  return jsonb_build_object(
    'ok', true,
    'room', to_jsonb(v_room),
    'state', public.domino_safe_state(v_state.state, v_user),
    'version', coalesce(v_next_version, v_state.version)
  );
end;
$$;

create or replace function public.domino_action(
  p_room_id uuid,
  p_action text,
  p_expected_version integer,
  p_tile_index integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_action text := lower(trim(coalesce(p_action, '')));
  v_room public.game_rooms%rowtype;
  v_row public.game_state%rowtype;
  v_state jsonb;
  v_hands jsonb;
  v_hand jsonb;
  v_board jsonb;
  v_deck jsonb;
  v_tile jsonb;
  v_opening jsonb;
  v_new_hand jsonb;
  v_other uuid;
  v_left integer;
  v_right integer;
  v_a integer;
  v_b integer;
  v_passes integer;
  v_player_count integer;
  v_winner uuid;
  v_next_version integer;
  v_name text;
  v_message text;
begin
  if v_user is null then raise exception 'LOGIN_REQUIRED'; end if;

  select * into v_room from public.game_rooms where id = p_room_id and game_type = 'dominos' for update;
  if v_room.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
  if not exists (select 1 from public.game_players where room_id = p_room_id and user_id = v_user and status <> 'left') then
    raise exception 'NOT_A_TABLE_MEMBER';
  end if;

  select * into v_row from public.game_state where room_id = p_room_id for update;
  if v_row.version <> p_expected_version then raise exception 'STATE_CHANGED_REFRESH'; end if;

  v_state := v_row.state;
  if coalesce(v_state->>'status', '') <> 'playing' then raise exception 'TABLE_NOT_PLAYING'; end if;
  if coalesce(v_state->>'turnUserId', '') <> v_user::text then raise exception 'NOT_YOUR_TURN'; end if;

  v_hands := coalesce(v_state->'hands', '{}'::jsonb);
  v_hand := coalesce(v_hands->v_user::text, '[]'::jsonb);
  v_board := coalesce(v_state->'board', '[]'::jsonb);
  v_deck := coalesce(v_state->'deck', '[]'::jsonb);
  v_opening := v_state->'openingTile';
  select user_id into v_other
  from public.game_players
  where room_id = p_room_id and user_id <> v_user and status <> 'left'
  order by seat_number limit 1;
  if v_other is null then raise exception 'WAITING_FOR_PLAYER_TWO'; end if;

  if v_action = 'play' then
    if p_tile_index is null or p_tile_index < 0 or p_tile_index >= jsonb_array_length(v_hand) then raise exception 'TILE_MISSING'; end if;
    v_tile := v_hand->p_tile_index;
    if not public.domino_tile_playable(v_tile, v_board) then raise exception 'TILE_DOES_NOT_MATCH'; end if;
    if jsonb_array_length(v_board) = 0 and v_opening is not null and v_tile <> v_opening then raise exception 'HIGH_BONE_MUST_OPEN'; end if;

    select coalesce(jsonb_agg(value order by ordinality), '[]'::jsonb)
    into v_new_hand
    from jsonb_array_elements(v_hand) with ordinality
    where ordinality <> p_tile_index + 1;

    if jsonb_array_length(v_board) = 0 then
      v_board := jsonb_build_array(v_tile);
    else
      v_left := ((v_board->0)->>0)::integer;
      v_right := ((v_board->(jsonb_array_length(v_board) - 1))->>1)::integer;
      v_a := (v_tile->>0)::integer;
      v_b := (v_tile->>1)::integer;
      if v_b = v_left then v_board := jsonb_build_array(v_tile) || v_board;
      elsif v_a = v_left then v_board := jsonb_build_array(jsonb_build_array(v_b, v_a)) || v_board;
      elsif v_a = v_right then v_board := v_board || jsonb_build_array(v_tile);
      else v_board := v_board || jsonb_build_array(jsonb_build_array(v_b, v_a));
      end if;
    end if;

    v_hands := jsonb_set(v_hands, array[v_user::text], v_new_hand, false);
    if jsonb_array_length(v_new_hand) = 0 then
      v_winner := v_user;
      v_message := 'Winner detected. Submit the win.';
    else
      v_message := 'Tile played.';
    end if;
  elsif v_action = 'draw' then
    if public.domino_has_playable(v_hand, v_board, v_opening) then raise exception 'PLAYABLE_BONE_AVAILABLE'; end if;
    if jsonb_array_length(v_deck) = 0 then raise exception 'BONEYARD_EMPTY'; end if;
    v_tile := v_deck->0;
    v_hand := v_hand || jsonb_build_array(v_tile);
    v_deck := v_deck - 0;
    v_hands := jsonb_set(v_hands, array[v_user::text], v_hand, false);
    v_message := case when public.domino_tile_playable(v_tile, v_board) then 'Playable bone drawn. Slap it down.' else 'No match. Draw again.' end;
  elsif v_action = 'pass' then
    if jsonb_array_length(v_deck) > 0 then raise exception 'DRAW_UNTIL_PLAYABLE'; end if;
    if public.domino_has_playable(v_hand, v_board, v_opening) then raise exception 'PLAYABLE_BONE_AVAILABLE'; end if;
    v_passes := coalesce((v_state->>'consecutivePasses')::integer, 0) + 1;
    select count(*)::integer into v_player_count from public.game_players where room_id = p_room_id and status <> 'left';
    if v_passes >= v_player_count then
      v_winner := case
        when public.domino_hand_score(v_hands->v_user::text) <= public.domino_hand_score(v_hands->v_other::text) then v_user
        else v_other
      end;
      v_message := 'Board blocked. Lowest pip hand wins.';
    else
      v_message := 'Pass accepted.';
    end if;
  else
    raise exception 'INVALID_DOMINO_ACTION';
  end if;

  select coalesce(nullif(display_name, ''), nullif(username, ''), 'Player') into v_name from public.profiles where id = v_user;
  v_next_version := v_row.version + 1;
  v_state := v_state || jsonb_build_object(
    'version', v_next_version,
    'hands', v_hands,
    'board', v_board,
    'deck', v_deck,
    'turnUserId', case when v_winner is not null then v_winner when v_action in ('play', 'pass') then v_other else v_user end,
    'status', case when v_winner is null then 'playing' else 'finished' end,
    'winnerUserId', v_winner,
    'finishReason', case when v_winner is null then null when v_action = 'play' then 'empty-hand' else 'blocked' end,
    'consecutivePasses', case when v_action = 'pass' then v_passes else 0 end,
    'updatedAt', now(),
    'log', (coalesce(v_state->'log', '[]'::jsonb) || jsonb_build_array(coalesce(v_name, 'Player') || ': ' || lower(v_message)))
  );

  update public.game_state set state = v_state, version = v_next_version, updated_by = v_user, updated_at = now() where room_id = p_room_id;
  update public.game_rooms set status = v_state->>'status', current_turn_user_id = (v_state->>'turnUserId')::uuid, updated_at = now() where id = p_room_id;

  return jsonb_build_object('ok', true, 'message', v_message, 'room', to_jsonb(v_room), 'state', public.domino_safe_state(v_state, v_user), 'version', v_next_version);
end;
$$;

create unique index if not exists game_scores_domino_room_winner_uidx
on public.game_scores ((metadata->>'room_id'))
where game_key = '01_dominos' and metadata ? 'room_id';

create or replace function public.claim_domino_win(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_room public.game_rooms%rowtype;
  v_row public.game_state%rowtype;
  v_score integer;
  v_balance integer;
  v_existing boolean;
begin
  if v_user is null then raise exception 'LOGIN_REQUIRED'; end if;
  select * into v_room from public.game_rooms where id = p_room_id and game_type = 'dominos' for update;
  select * into v_row from public.game_state where room_id = p_room_id for update;
  if v_room.id is null or v_row.room_id is null then raise exception 'TABLE_NOT_FOUND'; end if;
  if v_row.state->>'status' <> 'finished' or v_row.state->>'winnerUserId' <> v_user::text then raise exception 'WIN_NOT_VERIFIED'; end if;

  select exists(select 1 from public.game_scores where game_key = '01_dominos' and metadata->>'room_id' = p_room_id::text) into v_existing;
  if not v_existing then
    v_score := 100 + jsonb_array_length(coalesce(v_row.state->'board', '[]'::jsonb)) * 5;
    perform set_config('app.server_write', 'on', true);
    insert into public.game_scores(user_id, game_key, score, points_delta, metadata)
    values(v_user, '01_dominos', v_score, 100, jsonb_build_object('room_id', p_room_id, 'room_code', v_room.room_code, 'source', '01_domino_room'));

    insert into public.profiles(id, points, cool_points, lifetime_points, leaderboard_score, created_at, updated_at)
    values(v_user, 0, 0, 0, 0, now(), now()) on conflict(id) do nothing;
    update public.profiles
    set points = coalesce(cool_points, points, 0) + 100,
        cool_points = coalesce(cool_points, points, 0) + 100,
        lifetime_points = coalesce(lifetime_points, 0) + 100,
        leaderboard_score = coalesce(leaderboard_score, 0) + 100,
        updated_at = now()
    where id = v_user
    returning cool_points into v_balance;
    insert into public.cool_points_ledger(user_id, amount, reason, source, metadata)
    values(v_user, 100, '01 Domino Room verified win', '01_dominos', jsonb_build_object('room_id', p_room_id, 'room_code', v_room.room_code));
  else
    select coalesce(cool_points, points, 0) into v_balance from public.profiles where id = v_user;
  end if;

  return jsonb_build_object('ok', true, 'already_claimed', v_existing, 'points_awarded', case when v_existing then 0 else 100 end, 'balance', coalesce(v_balance, 0));
end;
$$;

create or replace function public.get_game_leaderboard(p_limit integer default 8, p_game_key text default null)
returns table(id uuid, user_id uuid, display_name text, avatar_icon text, game_key text, score integer, points_delta integer, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select gs.id, gs.user_id,
    coalesce(nullif(p.display_name, ''), nullif(p.username, ''), 'HYPHSWORLD Player'),
    coalesce(nullif(p.avatar_icon, ''), '🧢'), gs.game_key, gs.score, gs.points_delta, gs.created_at
  from public.game_scores gs join public.profiles p on p.id = gs.user_id
  where p_game_key is null or gs.game_key = p_game_key
  order by gs.score desc, gs.created_at desc
  limit least(greatest(coalesce(p_limit, 8), 1), 100);
$$;

create or replace function public.get_cool_points_leaderboard(p_limit integer default 8)
returns table(user_id uuid, display_name text, username text, avatar_icon text, points integer, lifetime_points integer, level_1_unlocked boolean, level_2_unlocked boolean, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, coalesce(nullif(p.display_name, ''), nullif(p.username, ''), 'HYPHSWORLD Player'),
    coalesce(nullif(p.username, ''), 'player'), coalesce(nullif(p.avatar_icon, ''), '🧢'),
    coalesce(p.cool_points, p.points, 0), coalesce(p.lifetime_points, 0), p.level_1_unlocked, p.level_2_unlocked, p.updated_at
  from public.profiles p
  where coalesce(p.cool_points, p.points, 0) > 0 or coalesce(p.lifetime_points, 0) > 0
  order by coalesce(p.cool_points, p.points, 0) desc, coalesce(p.lifetime_points, 0) desc, p.updated_at
  limit least(greatest(coalesce(p_limit, 8), 1), 100);
$$;

revoke execute on function public.domino_hand_rank(jsonb) from public, anon, authenticated;
revoke execute on function public.domino_hand_score(jsonb) from public, anon, authenticated;
revoke execute on function public.domino_opening_tile(jsonb) from public, anon, authenticated;
revoke execute on function public.domino_tile_playable(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.domino_has_playable(jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.domino_safe_state(jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.is_domino_room(uuid) from public, anon;
grant execute on function public.is_domino_room(uuid) to authenticated;

revoke execute on function public.get_domino_state(uuid) from public, anon;
revoke execute on function public.list_domino_rooms() from public, anon;
revoke execute on function public.join_domino_room(text) from public, anon;
revoke execute on function public.domino_action(uuid, text, integer, integer) from public, anon;
revoke execute on function public.claim_domino_win(uuid) from public, anon;
grant execute on function public.get_domino_state(uuid) to authenticated;
grant execute on function public.list_domino_rooms() to authenticated;
grant execute on function public.join_domino_room(text) to authenticated;
grant execute on function public.domino_action(uuid, text, integer, integer) to authenticated;
grant execute on function public.claim_domino_win(uuid) to authenticated;

revoke execute on function public.get_game_leaderboard(integer, text) from public;
revoke execute on function public.get_cool_points_leaderboard(integer) from public;
grant execute on function public.get_game_leaderboard(integer, text) to anon, authenticated;
grant execute on function public.get_cool_points_leaderboard(integer) to anon, authenticated;

-- Direct browser writes may continue for legacy games, but Domino mutations must use the validated RPCs above.
drop policy if exists game_state_domino_server_write on public.game_state;
create policy game_state_domino_server_write on public.game_state as restrictive for all to authenticated
using (
  not public.is_domino_room(room_id)
  or current_setting('app.server_write', true) = 'on'
)
with check (
  not public.is_domino_room(room_id)
  or current_setting('app.server_write', true) = 'on'
);

drop policy if exists game_players_domino_server_insert on public.game_players;
create policy game_players_domino_server_insert on public.game_players as restrictive for insert to authenticated
with check (
  not public.is_domino_room(room_id)
  or current_setting('app.server_write', true) = 'on'
);

drop policy if exists game_players_domino_server_update on public.game_players;
create policy game_players_domino_server_update on public.game_players as restrictive for update to authenticated
using (not public.is_domino_room(room_id) or current_setting('app.server_write', true) = 'on')
with check (not public.is_domino_room(room_id) or current_setting('app.server_write', true) = 'on');

drop policy if exists game_rooms_domino_server_insert on public.game_rooms;
create policy game_rooms_domino_server_insert on public.game_rooms as restrictive for insert to authenticated
with check (game_type <> 'dominos' or current_setting('app.server_write', true) = 'on');

drop policy if exists game_rooms_domino_server_update on public.game_rooms;
create policy game_rooms_domino_server_update on public.game_rooms as restrictive for update to authenticated
using (game_type <> 'dominos' or current_setting('app.server_write', true) = 'on')
with check (game_type <> 'dominos' or current_setting('app.server_write', true) = 'on');

drop policy if exists game_scores_domino_server_insert on public.game_scores;
create policy game_scores_domino_server_insert on public.game_scores as restrictive for insert to authenticated
with check (game_key <> '01_dominos' or current_setting('app.server_write', true) = 'on');

notify pgrst, 'reload schema';
