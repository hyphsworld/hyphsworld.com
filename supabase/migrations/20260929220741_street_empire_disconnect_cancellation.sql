CREATE OR REPLACE FUNCTION street_empire_private.leave_room(p_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_room public.street_empire_rooms%rowtype;
begin
  if v_uid is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  select * into v_room from public.street_empire_rooms
    where code=upper(trim(p_code)) for update;
  if not found then return; end if;
  if not exists (select 1 from public.street_empire_members
                 where room_code=v_room.code and user_id=v_uid) then
    raise exception 'NOT_A_ROOM_MEMBER';
  end if;
  if v_room.host_id=v_uid or v_room.phase='playing' then
    delete from public.street_empire_rooms where code=v_room.code;
  else
    delete from public.street_empire_members where room_code=v_room.code and user_id=v_uid;
  end if;
end $function$;

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
  if v_room.phase='playing' and exists (
    select 1 from public.street_empire_members where room_code=v_room.code
      and user_id <> v_room.host_id and last_seen_at < now() - interval '90 seconds'
  ) then
    delete from public.street_empire_rooms where code=v_room.code;
    return jsonb_build_object('closed',true);
  end if;
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
