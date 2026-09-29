-- Street Empire friendly rooms: Supabase Auth + private Realtime transport.
-- Match results remain unranked and never write to the Cool Points wallet.
create schema if not exists street_empire_private;
revoke all on schema street_empire_private from public, anon;
grant usage on schema street_empire_private to authenticated;

create table if not exists public.street_empire_rooms (
  code text primary key check (code ~ '^[A-F0-9]{6}$'),
  host_id uuid not null references auth.users(id) on delete cascade,
  phase text not null default 'lobby' check (phase in ('lobby','playing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.street_empire_members (
  room_code text not null references public.street_empire_rooms(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_code, user_id)
);
create index if not exists street_empire_members_user_idx on public.street_empire_members(user_id);
create table if not exists public.street_empire_state (
  room_code text primary key references public.street_empire_rooms(code) on delete cascade,
  seq bigint not null default 0,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.street_empire_inputs (
  id bigint generated always as identity primary key,
  room_code text not null references public.street_empire_rooms(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists street_empire_inputs_room_id_idx on public.street_empire_inputs(room_code,id);
alter table public.street_empire_rooms enable row level security;
alter table public.street_empire_members enable row level security;
alter table public.street_empire_state enable row level security;
alter table public.street_empire_inputs enable row level security;
revoke all on public.street_empire_rooms, public.street_empire_members from anon, authenticated;
revoke all on public.street_empire_state, public.street_empire_inputs from anon, authenticated;

create or replace function street_empire_private.create_room(p_name text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_code text; v_try integer;
begin
  if v_uid is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 54163));
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
      insert into public.street_empire_state(room_code) values (v_code);
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
  select coalesce(jsonb_agg(jsonb_build_object('userId',user_id,'name',name)
                             order by joined_at),'[]'::jsonb) into v_members
    from public.street_empire_members where room_code=v_room.code;
  select payload,seq into v_payload,v_seq from public.street_empire_state where room_code=v_room.code;
  return jsonb_build_object('code',v_room.code,'host',v_room.host_id,
                            'phase',v_room.phase,'members',v_members,
                            'payload',v_payload,'seq',v_seq);
end $$;

create or replace function street_empire_private.start_room(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.street_empire_rooms%rowtype; v_members jsonb;
begin
  if auth.uid() is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  select * into v_room from public.street_empire_rooms where code=upper(trim(p_code)) for update;
  if not found or v_room.host_id <> auth.uid() then raise exception 'HOST_REQUIRED'; end if;
  if v_room.phase <> 'lobby' then raise exception 'GAME_ALREADY_STARTED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('userId',user_id,'name',name)
                            order by joined_at,user_id),'[]'::jsonb) into v_members
    from public.street_empire_members where room_code=v_room.code;
  update public.street_empire_rooms set phase='playing',updated_at=now() where code=v_room.code;
  return v_members;
end $$;

create or replace function street_empire_private.finish_room(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  update public.street_empire_rooms set phase='lobby',updated_at=now()
    where code=upper(trim(p_code)) and host_id=auth.uid();
  if not found then raise exception 'HOST_REQUIRED'; end if;
  delete from public.street_empire_inputs where room_code=upper(trim(p_code));
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

-- Private helpers allow RLS to check membership without exposing room tables.
create or replace function street_empire_private.is_member(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.street_empire_members
    where room_code=p_code and user_id=auth.uid()
  )
$$;
create or replace function street_empire_private.is_host(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.street_empire_rooms
    where code=p_code and host_id=auth.uid()
  )
$$;

create or replace function street_empire_private.push_state(p_code text,p_payload jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_seq bigint;
begin
  if auth.uid() is null or not street_empire_private.is_host(upper(trim(p_code)))
    then raise exception 'HOST_REQUIRED'; end if;
  if jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 150000
    then raise exception 'INVALID_STATE'; end if;
  update public.street_empire_state set seq=seq+1,payload=p_payload,updated_at=now()
    where room_code=upper(trim(p_code)) returning seq into v_seq;
  return v_seq;
end $$;

create or replace function street_empire_private.send_input(p_code text,p_action jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_id bigint; v_code text := upper(trim(p_code));
begin
  if auth.uid() is null or not street_empire_private.is_member(v_code)
    then raise exception 'NOT_A_ROOM_MEMBER'; end if;
  if not exists (select 1 from public.street_empire_rooms where code=v_code and phase='playing')
    then raise exception 'GAME_NOT_STARTED'; end if;
  if jsonb_typeof(p_action) <> 'object' or octet_length(p_action::text) > 8000
    then raise exception 'INVALID_INPUT'; end if;
  insert into public.street_empire_inputs(room_code,user_id,action)
    values (v_code,auth.uid(),p_action) returning id into v_id;
  return v_id;
end $$;

create or replace function street_empire_private.get_inputs(p_code text,p_after bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_rows jsonb;
begin
  if auth.uid() is null or not street_empire_private.is_host(upper(trim(p_code)))
    then raise exception 'HOST_REQUIRED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'from',q.user_id,'action',q.action)
                            order by q.id),'[]'::jsonb) into v_rows
    from (select id,user_id,action from public.street_empire_inputs
          where room_code=upper(trim(p_code)) and id > greatest(coalesce(p_after,0),0)
          order by id limit 100) q;
  return v_rows;
end $$;

-- Privileged code stays outside exposed schemas; public RPCs are invokers.
create or replace function public.create_street_empire_room(p_name text) returns text
language sql security invoker set search_path = '' as $$ select street_empire_private.create_room(p_name) $$;
create or replace function public.join_street_empire_room(p_code text,p_name text) returns text
language sql security invoker set search_path = '' as $$ select street_empire_private.join_room(p_code,p_name) $$;
create or replace function public.get_street_empire_room(p_code text) returns jsonb
language sql security invoker set search_path = '' as $$ select street_empire_private.room_status(p_code) $$;
create or replace function public.start_street_empire_room(p_code text) returns jsonb
language sql security invoker set search_path = '' as $$ select street_empire_private.start_room(p_code) $$;
create or replace function public.finish_street_empire_room(p_code text) returns void
language sql security invoker set search_path = '' as $$ select street_empire_private.finish_room(p_code) $$;
create or replace function public.leave_street_empire_room(p_code text) returns void
language sql security invoker set search_path = '' as $$ select street_empire_private.leave_room(p_code) $$;
create or replace function public.push_street_empire_state(p_code text,p_payload jsonb) returns bigint
language sql security invoker set search_path = '' as $$ select street_empire_private.push_state(p_code,p_payload) $$;
create or replace function public.send_street_empire_input(p_code text,p_action jsonb) returns bigint
language sql security invoker set search_path = '' as $$ select street_empire_private.send_input(p_code,p_action) $$;
create or replace function public.get_street_empire_inputs(p_code text,p_after bigint) returns jsonb
language sql security invoker set search_path = '' as $$ select street_empire_private.get_inputs(p_code,p_after) $$;

revoke all on function street_empire_private.create_room(text),street_empire_private.join_room(text,text),
  street_empire_private.room_status(text),street_empire_private.start_room(text),
  street_empire_private.finish_room(text),street_empire_private.leave_room(text),
  street_empire_private.is_member(text),street_empire_private.is_host(text),
  street_empire_private.push_state(text,jsonb),street_empire_private.send_input(text,jsonb),
  street_empire_private.get_inputs(text,bigint) from public,anon;
grant execute on function street_empire_private.create_room(text),street_empire_private.join_room(text,text),
  street_empire_private.room_status(text),street_empire_private.start_room(text),
  street_empire_private.finish_room(text),street_empire_private.leave_room(text),
  street_empire_private.is_member(text),street_empire_private.is_host(text),
  street_empire_private.push_state(text,jsonb),street_empire_private.send_input(text,jsonb),
  street_empire_private.get_inputs(text,bigint) to authenticated;
revoke all on function public.create_street_empire_room(text),public.join_street_empire_room(text,text),
  public.get_street_empire_room(text),public.start_street_empire_room(text),
  public.finish_street_empire_room(text),public.leave_street_empire_room(text),
  public.push_street_empire_state(text,jsonb),public.send_street_empire_input(text,jsonb),
  public.get_street_empire_inputs(text,bigint) from public,anon;
grant execute on function public.create_street_empire_room(text),public.join_street_empire_room(text,text),
  public.get_street_empire_room(text),public.start_street_empire_room(text),
  public.finish_street_empire_room(text),public.leave_street_empire_room(text),
  public.push_street_empire_state(text,jsonb),public.send_street_empire_input(text,jsonb),
  public.get_street_empire_inputs(text,bigint) to authenticated;

grant select on public.street_empire_state,public.street_empire_inputs to authenticated;
create policy street_empire_state_member_read on public.street_empire_state
  for select to authenticated using (street_empire_private.is_member(room_code));
create policy street_empire_inputs_host_read on public.street_empire_inputs
  for select to authenticated using (street_empire_private.is_host(room_code));

alter publication supabase_realtime add table public.street_empire_state,public.street_empire_inputs;
