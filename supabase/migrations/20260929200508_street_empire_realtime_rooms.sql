-- Street Empire friendly rooms: Supabase Auth + private Realtime transport.
-- Match results remain unranked and never write to the Cool Points wallet.
create schema if not exists street_empire_private;
revoke all on schema street_empire_private from public, anon;
grant usage on schema street_empire_private to authenticated;

create table if not exists public.street_empire_rooms (
  code text primary key check (code ~ '^[A-F0-9]{6}$'),
  host_id uuid not null references auth.users(id),
  phase text not null default 'lobby' check (phase in ('lobby','playing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.street_empire_members (
  room_code text not null references public.street_empire_rooms(code) on delete cascade,
  user_id uuid not null references auth.users(id),
  name text not null check (char_length(name) between 1 and 24),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_code, user_id)
);
create index if not exists street_empire_members_user_idx on public.street_empire_members(user_id);
alter table public.street_empire_rooms enable row level security;
alter table public.street_empire_members enable row level security;
revoke all on public.street_empire_rooms, public.street_empire_members from anon, authenticated;

create or replace function street_empire_private.create_room(p_name text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_code text; v_try integer;
begin
  if v_uid is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  delete from public.street_empire_rooms r
    where r.updated_at < now() - interval '20 minutes'
      and not exists (select 1 from public.street_empire_members m
                      where m.room_code = r.code and m.last_seen_at > now() - interval '45 seconds');
  select r.code into v_code from public.street_empire_rooms r
    where r.host_id = v_uid and r.updated_at > now() - interval '20 minutes'
    order by r.created_at desc limit 1;
  if v_code is not null then return v_code; end if;
  for v_try in 1..12 loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into public.street_empire_rooms(code, host_id) values (v_code, v_uid);
      insert into public.street_empire_members(room_code,user_id,name)
        values (v_code,v_uid,left(coalesce(nullif(trim(p_name),''),'Player'),24));
      return v_code;
    exception when unique_violation then null;
    end;
  end loop;
  raise exception 'ROOM_CODE_UNAVAILABLE';
end $$;

create or replace function street_empire_private.join_room(p_code text, p_name text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_room public.street_empire_rooms%rowtype;
begin
  if v_uid is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  select * into v_room from public.street_empire_rooms
    where code = upper(trim(p_code)) for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.phase <> 'lobby' and not exists
    (select 1 from public.street_empire_members where room_code=v_room.code and user_id=v_uid)
    then raise exception 'GAME_ALREADY_STARTED'; end if;
  if not exists (select 1 from public.street_empire_members where room_code=v_room.code and user_id=v_uid) then
    if (select count(*) from public.street_empire_members where room_code=v_room.code) >= 4
      then raise exception 'ROOM_FULL'; end if;
    insert into public.street_empire_members(room_code,user_id,name)
      values (v_room.code,v_uid,left(coalesce(nullif(trim(p_name),''),'Player'),24));
  else
    update public.street_empire_members set last_seen_at=now()
      where room_code=v_room.code and user_id=v_uid;
  end if;
  return v_room.code;
end $$;

create or replace function street_empire_private.room_status(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_room public.street_empire_rooms%rowtype; v_members jsonb;
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
  select coalesce(jsonb_agg(jsonb_build_object('userId',user_id,'name',name)
                             order by joined_at),'[]'::jsonb) into v_members
    from public.street_empire_members where room_code=v_room.code;
  return jsonb_build_object('code',v_room.code,'host',v_room.host_id,
                            'phase',v_room.phase,'members',v_members);
end $$;

create or replace function street_empire_private.start_room(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_room public.street_empire_rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  select * into v_room from public.street_empire_rooms where code=upper(trim(p_code)) for update;
  if not found or v_room.host_id <> auth.uid() then raise exception 'HOST_REQUIRED'; end if;
  if v_room.phase <> 'lobby' then raise exception 'GAME_ALREADY_STARTED'; end if;
  update public.street_empire_rooms set phase='playing',updated_at=now() where code=v_room.code;
end $$;

create or replace function street_empire_private.finish_room(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  update public.street_empire_rooms set phase='lobby',updated_at=now()
    where code=upper(trim(p_code)) and host_id=auth.uid();
  if not found then raise exception 'HOST_REQUIRED'; end if;
end $$;

create or replace function street_empire_private.leave_room(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  if exists (select 1 from public.street_empire_rooms where code=upper(trim(p_code)) and host_id=v_uid) then
    delete from public.street_empire_rooms where code=upper(trim(p_code));
  else
    delete from public.street_empire_members where room_code=upper(trim(p_code)) and user_id=v_uid;
  end if;
end $$;

-- A private authorization helper is used by Realtime's channel policy checks.
create or replace function street_empire_private.channel_role(p_topic text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare v_kind text := split_part(p_topic,':',2);
        v_code text := split_part(p_topic,':',3);
        v_sender text := split_part(p_topic,':',4);
        v_uid uuid := auth.uid(); v_host uuid;
begin
  if v_uid is null or split_part(p_topic,':',1) <> 'street-empire'
     or v_code !~ '^[A-F0-9]{6}$' then return null; end if;
  if v_kind='state' and v_sender <> '' then return null; end if;
  if v_kind='input' and v_sender <> v_uid::text and not exists
      (select 1 from public.street_empire_rooms where code=v_code and host_id=v_uid)
      then return null; end if;
  if v_kind not in ('state','input') then return null; end if;
  select r.host_id into v_host from public.street_empire_rooms r
    join public.street_empire_members m on m.room_code=r.code
    where r.code=v_code and m.user_id=v_uid;
  if v_host is null then return null; end if;
  if v_host=v_uid then return 'host'; end if;
  if v_kind='input' and v_sender <> v_uid::text then return null; end if;
  return 'member';
end $$;

-- Keep privileged functions outside exposed schemas; public RPCs are invokers.
create or replace function public.create_street_empire_room(p_name text) returns text
language sql security invoker set search_path = '' as $$ select street_empire_private.create_room(p_name) $$;
create or replace function public.join_street_empire_room(p_code text,p_name text) returns text
language sql security invoker set search_path = '' as $$ select street_empire_private.join_room(p_code,p_name) $$;
create or replace function public.get_street_empire_room(p_code text) returns jsonb
language sql security invoker set search_path = '' as $$ select street_empire_private.room_status(p_code) $$;
create or replace function public.start_street_empire_room(p_code text) returns void
language sql security invoker set search_path = '' as $$ select street_empire_private.start_room(p_code) $$;
create or replace function public.finish_street_empire_room(p_code text) returns void
language sql security invoker set search_path = '' as $$ select street_empire_private.finish_room(p_code) $$;
create or replace function public.leave_street_empire_room(p_code text) returns void
language sql security invoker set search_path = '' as $$ select street_empire_private.leave_room(p_code) $$;

revoke all on function street_empire_private.create_room(text),street_empire_private.join_room(text,text),
  street_empire_private.room_status(text),street_empire_private.start_room(text),
  street_empire_private.finish_room(text),street_empire_private.leave_room(text),
  street_empire_private.channel_role(text) from public,anon;
grant execute on function street_empire_private.create_room(text),street_empire_private.join_room(text,text),
  street_empire_private.room_status(text),street_empire_private.start_room(text),
  street_empire_private.finish_room(text),street_empire_private.leave_room(text),
  street_empire_private.channel_role(text) to authenticated;
revoke all on function public.create_street_empire_room(text),public.join_street_empire_room(text,text),
  public.get_street_empire_room(text),public.start_street_empire_room(text),
  public.finish_street_empire_room(text),public.leave_street_empire_room(text) from public,anon;
grant execute on function public.create_street_empire_room(text),public.join_street_empire_room(text,text),
  public.get_street_empire_room(text),public.start_street_empire_room(text),
  public.finish_street_empire_room(text),public.leave_street_empire_room(text) to authenticated;

create policy street_empire_receive on realtime.messages for select to authenticated
using (extension='broadcast' and private and
       street_empire_private.channel_role(realtime.topic()) is not null);
create policy street_empire_send on realtime.messages for insert to authenticated
with check (extension='broadcast' and private and (
  (split_part(realtime.topic(),':',2)='state' and street_empire_private.channel_role(realtime.topic())='host')
  or (split_part(realtime.topic(),':',2)='input' and split_part(realtime.topic(),':',4)=auth.uid()::text
      and street_empire_private.channel_role(realtime.topic()) is not null)
));
