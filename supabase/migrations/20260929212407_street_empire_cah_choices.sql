-- Player Cah selection; no rewards or gameplay advantage.
alter table public.street_empire_members
  add column cah_id text not null default 'grand_national'
  check (cah_id in ('grand_national','corvette','trackhawk','chevelle_70'));

create or replace function street_empire_private.choose_cah(p_code text,p_cah text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_room public.street_empire_rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  if p_cah is null or p_cah not in ('grand_national','corvette','trackhawk','chevelle_70')
    then raise exception 'INVALID_CAH'; end if;
  select * into v_room from public.street_empire_rooms where code=upper(trim(p_code)) for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.phase <> 'lobby' then raise exception 'GAME_ALREADY_STARTED'; end if;
  update public.street_empire_members set cah_id=p_cah,last_seen_at=now()
    where room_code=v_room.code and user_id=auth.uid();
  if not found then raise exception 'NOT_A_ROOM_MEMBER'; end if;
end $$;

create or replace function public.choose_street_empire_cah(p_code text,p_cah text) returns void
language sql security invoker set search_path = '' as $$ select street_empire_private.choose_cah(p_code,p_cah) $$;
revoke all on function street_empire_private.choose_cah(text,text), public.choose_street_empire_cah(text,text) from public,anon;
grant execute on function street_empire_private.choose_cah(text,text), public.choose_street_empire_cah(text,text) to authenticated;

CREATE OR REPLACE FUNCTION street_empire_private.room_status(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_room public.street_empire_rooms%rowtype; v_members jsonb;
        v_payload jsonb; v_seq bigint;
begin
  if v_uid is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  select * into v_room from public.street_empire_rooms
    where code=upper(trim(p_code)) for update;
  if not found then return jsonb_build_object('closed',true); end if;
  if not exists (select 1 from public.street_empire_members where room_code=v_room.code and user_id=v_uid)
    then raise exception 'NOT_A_ROOM_MEMBER'; end if;
  if not exists (select 1 from public.street_empire_members
                 where room_code=v_room.code and user_id=v_room.host_id
                   and last_seen_at > now() - interval '45 seconds') then
    delete from public.street_empire_rooms where code=v_room.code;
    return jsonb_build_object('closed',true);
  end if;
  update public.street_empire_members set last_seen_at=now()
    where room_code=v_room.code and user_id=v_uid;
  delete from public.street_empire_members where room_code=v_room.code
    and user_id <> v_room.host_id and last_seen_at < now() - interval '90 seconds';
  select coalesce(jsonb_agg(jsonb_build_object('userId',user_id,'name',name,'cahId',cah_id)
                             order by joined_at),'[]'::jsonb) into v_members
    from public.street_empire_members where room_code=v_room.code;
  select payload,seq into v_payload,v_seq from public.street_empire_state where room_code=v_room.code;
  return jsonb_build_object('code',v_room.code,'host',v_room.host_id,
                            'phase',v_room.phase,'members',v_members,
                            'payload',v_payload,'seq',v_seq);
end $function$
;

CREATE OR REPLACE FUNCTION street_empire_private.start_room(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_room public.street_empire_rooms%rowtype; v_members jsonb;
begin
  if auth.uid() is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  select * into v_room from public.street_empire_rooms where code=upper(trim(p_code)) for update;
  if not found or v_room.host_id <> auth.uid() then raise exception 'HOST_REQUIRED'; end if;
  if v_room.phase <> 'lobby' then raise exception 'GAME_ALREADY_STARTED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('userId',user_id,'name',name,'cahId',cah_id)
                            order by joined_at,user_id),'[]'::jsonb) into v_members
    from public.street_empire_members where room_code=v_room.code;
  update public.street_empire_rooms set phase='playing',updated_at=now() where code=v_room.code;
  return v_members;
end $function$
;
