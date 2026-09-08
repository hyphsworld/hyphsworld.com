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
    if v_attempt > 20 then raise exception 'room_code_generation_failed'; end if;
    v_code := upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 4));
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

create or replace function public.join_super_strike_room(p_room_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_room public.game_rooms;
  v_count integer;
  v_code text := upper(trim(coalesce(p_room_code,'')));
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select * into v_room
  from public.game_rooms
  where game_type='super_strike'
    and status in ('waiting','playing')
    and (
      room_code = v_code
      or (
        length(v_code)=4 and length(room_code)>4 and room_code like v_code || '%'
        and 1 = (
          select count(*) from public.game_rooms r2
          where r2.game_type='super_strike' and r2.status in ('waiting','playing') and r2.room_code like v_code || '%'
        )
      )
    )
  order by case when room_code=v_code then 0 else 1 end, created_at desc
  limit 1;
  if v_room.id is null then raise exception 'room_not_found'; end if;
  select count(*) into v_count from public.game_players where room_id=v_room.id and status<>'left';
  if v_count>=2 and not exists(select 1 from public.game_players where room_id=v_room.id and user_id=v_user) then raise exception 'room_full'; end if;
  insert into public.profiles(id) values(v_user) on conflict(id) do nothing;
  insert into public.game_players(room_id,user_id,seat_number,status)
  values(v_room.id,v_user,2,'joined') on conflict(room_id,user_id) do update set status='joined';
  update public.game_rooms set status='playing',updated_at=now() where id=v_room.id;
  return public.super_strike_room_payload(v_room.id);
end;
$function$;

revoke all on function public.create_super_strike_room() from public, anon;
revoke all on function public.join_super_strike_room(text) from public, anon;
grant execute on function public.create_super_strike_room() to authenticated;
grant execute on function public.join_super_strike_room(text) to authenticated;
