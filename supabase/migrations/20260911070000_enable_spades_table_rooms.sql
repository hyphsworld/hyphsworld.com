-- Enable the existing Spades client to create standard four-seat partner rooms.
alter table public.game_rooms
  drop constraint if exists game_rooms_game_type_check;

alter table public.game_rooms
  add constraint game_rooms_game_type_check
  check (game_type = any (array['blackjack'::text, 'dice'::text, 'poker'::text, 'dominos'::text, 'spades'::text, 'super_strike'::text]));

create or replace function public.create_table_game_room(
  requested_code text default null::text,
  requested_game_type text default 'dice'::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller uuid := auth.uid();
  clean_code text;
  clean_game text;
  room_row public.game_rooms%rowtype;
  state_payload jsonb;
  display_name_value text;
  username_value text;
  attempt integer := 0;
  recent_count integer;
begin
  if caller is null then
    raise exception 'LOGIN_REQUIRED';
  end if;

  select count(*) into recent_count
  from public.game_rooms
  where host_id = caller
    and created_at > now() - interval '10 minutes';

  if recent_count >= 5 then
    raise exception 'ROOM_CREATION_RATE_LIMITED';
  end if;

  clean_game := lower(regexp_replace(coalesce(requested_game_type, 'dice'), '[^a-z0-9_]', '', 'g'));
  if clean_game not in ('dice', 'blackjack', 'poker', 'dominos', 'spades') then
    raise exception 'UNSUPPORTED_GAME_TYPE';
  end if;

  if clean_game = 'dominos' then
    return public.create_domino_room(requested_code);
  end if;

  select
    coalesce(nullif(display_name, ''), nullif(username, ''), 'HYPHSWORLD Player'),
    coalesce(nullif(username, ''), 'player_' || left(caller::text, 6))
  into display_name_value, username_value
  from public.profiles
  where id = caller;

  if display_name_value is null then
    display_name_value := 'HYPHSWORLD Player';
    username_value := 'player_' || left(caller::text, 6);
    insert into public.profiles (id, username, display_name, avatar_icon, avatar_type, updated_at)
    values (caller, username_value, display_name_value, '🧢', 'boy', now())
    on conflict (id) do nothing;
  end if;

  loop
    clean_code := upper(regexp_replace(coalesce(requested_code, ''), '[^A-Za-z0-9]', '', 'g'));
    clean_code := left(clean_code, 10);
    if clean_code = '' or attempt > 0 then
      clean_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    end if;

    begin
      insert into public.game_rooms (room_code, game_type, host_id, status, max_players, current_turn_user_id)
      values (
        clean_code,
        clean_game,
        caller,
        'waiting',
        case when clean_game = 'spades' then 4 when clean_game = 'poker' then 6 else 2 end,
        caller
      )
      returning * into room_row;
      exit;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt > 5 then
        raise exception 'ROOM_CODE_COLLISION';
      end if;
    end;
  end loop;

  state_payload := jsonb_build_object(
    'version', 1,
    'game', clean_game,
    'status', 'waiting',
    'turnUserId', caller,
    'players', jsonb_build_array(jsonb_build_object('userId', caller, 'name', display_name_value, 'seat', 1)),
    'round', 1,
    'pot', 0,
    'bets', '{}'::jsonb,
    'hands', '{}'::jsonb,
    'rolls', '{}'::jsonb,
    'dealer', '{}'::jsonb,
    'log', jsonb_build_array(display_name_value || ': opened the ' || clean_game || ' table.', 'Duck Sauce: Table live. Buck watching the points.'),
    'winnerUserId', null,
    'createdAt', now(),
    'updatedAt', now()
  );

  insert into public.game_players (room_id, user_id, seat_number, status, score, bet)
  values (room_row.id, caller, 1, 'ready', 0, 0);

  insert into public.game_state (room_id, state, updated_by)
  values (room_row.id, state_payload, caller);

  return jsonb_build_object('ok', true, 'room', to_jsonb(room_row), 'state', state_payload);
end;
$function$;

revoke all on function public.create_table_game_room(text, text) from public, anon;
grant execute on function public.create_table_game_room(text, text) to authenticated, service_role;
