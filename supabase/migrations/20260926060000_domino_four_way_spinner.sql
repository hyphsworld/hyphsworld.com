-- Player-selected Domino placement with one four-way spinner.
-- Existing live tables are upgraded lazily from their legacy linear board.

create or replace function public.domino_layout_from_board(p_board jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_count integer := jsonb_array_length(coalesce(p_board, '[]'::jsonb));
  v_spinner_index integer := -1;
  v_spinner integer;
  v_index integer;
  v_tile jsonb;
  v_left jsonb := '[]'::jsonb;
  v_right jsonb := '[]'::jsonb;
begin
  if v_count = 0 then return null; end if;
  for v_index in 0..v_count - 1 loop
    v_tile := p_board->v_index;
    if (v_tile->>0)::integer = (v_tile->>1)::integer then
      v_spinner_index := v_index;
      exit;
    end if;
  end loop;

  if v_spinner_index < 0 then
    return jsonb_build_object(
      'mode', 'chain', 'chain', p_board,
      'openEnds', jsonb_build_object(
        'left', ((p_board->0)->>0)::integer,
        'right', ((p_board->(v_count - 1))->>1)::integer
      )
    );
  end if;

  v_spinner := ((p_board->v_spinner_index)->>0)::integer;
  if v_spinner_index > 0 then
    for v_index in reverse v_spinner_index - 1..0 loop
      v_tile := p_board->v_index;
      v_left := v_left || jsonb_build_array(jsonb_build_array((v_tile->>1)::integer, (v_tile->>0)::integer));
    end loop;
  end if;
  if v_spinner_index < v_count - 1 then
    for v_index in v_spinner_index + 1..v_count - 1 loop
      v_right := v_right || jsonb_build_array(p_board->v_index);
    end loop;
  end if;

  return jsonb_build_object(
    'mode', 'spinner',
    'spinnerTile', jsonb_build_array(v_spinner, v_spinner),
    'branches', jsonb_build_object('left', v_left, 'right', v_right, 'top', '[]'::jsonb, 'bottom', '[]'::jsonb),
    'openEnds', jsonb_build_object(
      'left', case when v_spinner_index > 0 then ((p_board->0)->>0)::integer else v_spinner end,
      'right', case when v_spinner_index < v_count - 1 then ((p_board->(v_count - 1))->>1)::integer else v_spinner end,
      'top', v_spinner,
      'bottom', v_spinner
    )
  );
end;
$$;

create or replace function public.domino_layout_sides(p_tile jsonb, p_layout jsonb, p_board jsonb, p_opening_tile jsonb default null)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_layout jsonb := coalesce(p_layout, public.domino_layout_from_board(p_board));
  v_sides text[] := array[]::text[];
  v_side text;
  v_end integer;
  v_a integer := (p_tile->>0)::integer;
  v_b integer := (p_tile->>1)::integer;
begin
  if jsonb_array_length(coalesce(p_board, '[]'::jsonb)) = 0 then
    if p_opening_tile is null or p_tile = p_opening_tile then return array['center']; end if;
    return v_sides;
  end if;
  if coalesce(v_layout->>'mode', 'chain') = 'spinner' then
    foreach v_side in array array['left','right','top','bottom'] loop
      v_end := ((v_layout->'openEnds')->>v_side)::integer;
      if v_a = v_end or v_b = v_end then v_sides := array_append(v_sides, v_side); end if;
    end loop;
  else
    foreach v_side in array array['left','right'] loop
      v_end := ((v_layout->'openEnds')->>v_side)::integer;
      if v_a = v_end or v_b = v_end then v_sides := array_append(v_sides, v_side); end if;
    end loop;
  end if;
  return v_sides;
end;
$$;

create or replace function public.domino_layout_has_playable(p_hand jsonb, p_layout jsonb, p_board jsonb, p_opening_tile jsonb default null)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1 from jsonb_array_elements(coalesce(p_hand, '[]'::jsonb)) as bones(tile)
    where cardinality(public.domino_layout_sides(tile, p_layout, p_board, p_opening_tile)) > 0
  );
$$;

drop function if exists public.domino_action(uuid, text, integer, integer);

create function public.domino_action(
  p_room_id uuid,
  p_action text,
  p_expected_version integer,
  p_tile_index integer default null,
  p_play_side text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_action text := lower(trim(coalesce(p_action, '')));
  v_side text := lower(trim(coalesce(p_play_side, '')));
  v_room public.game_rooms%rowtype;
  v_row public.game_state%rowtype;
  v_state jsonb; v_hands jsonb; v_hand jsonb; v_board jsonb; v_deck jsonb;
  v_tile jsonb; v_opening jsonb; v_new_hand jsonb; v_layout jsonb;
  v_branches jsonb; v_branch jsonb; v_ends jsonb; v_oriented jsonb;
  v_other uuid; v_a integer; v_b integer; v_end integer;
  v_passes integer; v_player_count integer; v_winner uuid; v_next_version integer;
  v_name text; v_message text; v_sides text[];
begin
  if v_user is null then raise exception 'LOGIN_REQUIRED'; end if;
  select * into v_room from public.game_rooms where id = p_room_id and game_type = 'dominos' for update;
  if v_room.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
  if not exists (select 1 from public.game_players where room_id = p_room_id and user_id = v_user and status <> 'left') then raise exception 'NOT_A_TABLE_MEMBER'; end if;
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
  v_layout := coalesce(v_state->'layout', public.domino_layout_from_board(v_board));
  select user_id into v_other from public.game_players where room_id = p_room_id and user_id <> v_user and status <> 'left' order by seat_number limit 1;
  if v_other is null then raise exception 'WAITING_FOR_PLAYER_TWO'; end if;

  if v_action = 'play' then
    if p_tile_index is null or p_tile_index < 0 or p_tile_index >= jsonb_array_length(v_hand) then raise exception 'TILE_MISSING'; end if;
    v_tile := v_hand->p_tile_index;
    v_sides := public.domino_layout_sides(v_tile, v_layout, v_board, v_opening);
    if cardinality(v_sides) = 0 then raise exception 'TILE_DOES_NOT_MATCH'; end if;
    if v_side = '' then v_side := v_sides[1]; end if;
    if not (v_side = any(v_sides)) then raise exception 'INVALID_PLAY_SIDE'; end if;
    select coalesce(jsonb_agg(value order by ordinality), '[]'::jsonb) into v_new_hand
      from jsonb_array_elements(v_hand) with ordinality where ordinality <> p_tile_index + 1;
    v_a := (v_tile->>0)::integer; v_b := (v_tile->>1)::integer;

    if jsonb_array_length(v_board) = 0 then
      v_board := jsonb_build_array(v_tile);
      v_layout := public.domino_layout_from_board(v_board);
    elsif coalesce(v_layout->>'mode', 'chain') = 'chain' then
      v_end := ((v_layout->'openEnds')->>v_side)::integer;
      v_oriented := case when v_a = v_end then jsonb_build_array(v_a, v_b) else jsonb_build_array(v_b, v_a) end;
      if v_side = 'left' then
        v_board := jsonb_build_array(jsonb_build_array(v_oriented->1, v_oriented->0)) || v_board;
      else
        v_board := v_board || jsonb_build_array(v_oriented);
      end if;
      v_layout := public.domino_layout_from_board(v_board);
    else
      v_end := ((v_layout->'openEnds')->>v_side)::integer;
      v_oriented := case when v_a = v_end then jsonb_build_array(v_a, v_b) else jsonb_build_array(v_b, v_a) end;
      v_branches := v_layout->'branches';
      v_branch := coalesce(v_branches->v_side, '[]'::jsonb) || jsonb_build_array(v_oriented);
      v_branches := jsonb_set(v_branches, array[v_side], v_branch, true);
      v_ends := jsonb_set(v_layout->'openEnds', array[v_side], to_jsonb((v_oriented->>1)::integer), true);
      v_layout := v_layout || jsonb_build_object('branches', v_branches, 'openEnds', v_ends);
      v_board := v_board || jsonb_build_array(v_tile);
    end if;

    v_hands := jsonb_set(v_hands, array[v_user::text], v_new_hand, false);
    if jsonb_array_length(v_new_hand) = 0 then v_winner := v_user; v_message := 'Winner detected. Submit the win.';
    else v_message := 'Bone played on the ' || v_side || ' branch.'; end if;
  elsif v_action = 'draw' then
    if public.domino_layout_has_playable(v_hand, v_layout, v_board, v_opening) then raise exception 'PLAYABLE_BONE_AVAILABLE'; end if;
    if jsonb_array_length(v_deck) = 0 then raise exception 'BONEYARD_EMPTY'; end if;
    v_tile := v_deck->0; v_hand := v_hand || jsonb_build_array(v_tile); v_deck := v_deck - 0;
    v_hands := jsonb_set(v_hands, array[v_user::text], v_hand, false);
    v_message := case when cardinality(public.domino_layout_sides(v_tile, v_layout, v_board, v_opening)) > 0 then 'Playable bone drawn. Choose a branch.' else 'No match. Draw again.' end;
  elsif v_action = 'pass' then
    if jsonb_array_length(v_deck) > 0 then raise exception 'DRAW_UNTIL_PLAYABLE'; end if;
    if public.domino_layout_has_playable(v_hand, v_layout, v_board, v_opening) then raise exception 'PLAYABLE_BONE_AVAILABLE'; end if;
    v_passes := coalesce((v_state->>'consecutivePasses')::integer, 0) + 1;
    select count(*)::integer into v_player_count from public.game_players where room_id = p_room_id and status <> 'left';
    if v_passes >= v_player_count then
      v_winner := case when public.domino_hand_score(v_hands->v_user::text) <= public.domino_hand_score(v_hands->v_other::text) then v_user else v_other end;
      v_message := 'Board blocked. Lowest pip hand wins.';
    else v_message := 'Pass accepted.'; end if;
  else raise exception 'INVALID_DOMINO_ACTION'; end if;

  select coalesce(nullif(display_name, ''), nullif(username, ''), 'Player') into v_name from public.profiles where id = v_user;
  v_next_version := v_row.version + 1;
  v_state := v_state || jsonb_build_object(
    'version', v_next_version, 'hands', v_hands, 'board', v_board, 'layout', v_layout, 'deck', v_deck,
    'turnUserId', case when v_winner is not null then v_winner when v_action in ('play','pass') then v_other else v_user end,
    'status', case when v_winner is null then 'playing' else 'finished' end, 'winnerUserId', v_winner,
    'finishReason', case when v_winner is null then null when v_action = 'play' then 'empty-hand' else 'blocked' end,
    'consecutivePasses', case when v_action = 'pass' then v_passes else 0 end, 'updatedAt', now(),
    'log', coalesce(v_state->'log', '[]'::jsonb) || jsonb_build_array(coalesce(v_name, 'Player') || ': ' || lower(v_message))
  );
  update public.game_state set state = v_state, version = v_next_version, updated_by = v_user, updated_at = now() where room_id = p_room_id;
  update public.game_rooms set status = v_state->>'status', current_turn_user_id = (v_state->>'turnUserId')::uuid, updated_at = now() where id = p_room_id;
  return jsonb_build_object('ok', true, 'message', v_message, 'room', to_jsonb(v_room), 'state', public.domino_safe_state(v_state, v_user), 'version', v_next_version);
end;
$$;

revoke execute on function public.domino_layout_from_board(jsonb) from public, anon, authenticated;
revoke execute on function public.domino_layout_sides(jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
revoke execute on function public.domino_layout_has_playable(jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
revoke execute on function public.domino_action(uuid,text,integer,integer,text) from public, anon;
grant execute on function public.domino_action(uuid,text,integer,integer,text) to authenticated;
