create or replace function public.create_super_strike_room()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_room public.game_rooms;
  v_code text;
  v_attempt integer := 0;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  insert into public.profiles(id) values(v_user) on conflict(id) do nothing;
  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 40 then raise exception 'room_code_generation_failed'; end if;
    v_code := pg_catalog.lpad((pg_catalog.floor(pg_catalog.random() * 10000))::integer::text, 4, '0');
    begin
      insert into public.game_rooms(game_type,host_id,max_players,room_code)
      values('super_strike',v_user,2,v_code) returning * into v_room;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  insert into public.game_players(room_id,user_id,seat_number,status) values(v_room.id,v_user,1,'joined');
  insert into public.game_state(room_id,state,updated_by) values(v_room.id,'{"progress":{}}'::jsonb,v_user);
  return public.super_strike_room_payload(v_room.id);
end;
$function$;

revoke all on function public.create_super_strike_room() from public, anon;
grant execute on function public.create_super_strike_room() to authenticated;
