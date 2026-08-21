-- HYPHSWORLD Supabase setup
-- Run this once inside Supabase SQL Editor.
-- It creates the profile/points table used by the front end.

create table if not exists public.hw_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  duck_status text,
  buck_clearance text,
  cool_points integer not null default 0 check (cool_points >= 0),
  level_1_unlocked boolean not null default false,
  level_2_unlocked boolean not null default false,
  vault_access_granted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hw_profiles enable row level security;

drop policy if exists "Users can read their own HYPHSWORLD profile" on public.hw_profiles;
create policy "Users can read their own HYPHSWORLD profile"
on public.hw_profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can insert their own HYPHSWORLD profile" on public.hw_profiles;
create policy "Users can insert their own HYPHSWORLD profile"
on public.hw_profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update their own HYPHSWORLD profile" on public.hw_profiles;
create policy "Users can update their own HYPHSWORLD profile"
on public.hw_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.hw_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- This function is trigger-only.  Reject an accidental attachment to any
  -- other table or operation before changing the row supplied by PostgreSQL.
  if tg_op <> 'UPDATE'
     or tg_table_schema <> 'public'
     or tg_table_name <> 'hw_profiles' then
    raise exception 'hw_touch_updated_at may only update public.hw_profiles';
  end if;

  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

-- Neither trigger function is part of the client RPC API.  PUBLIC receives
-- EXECUTE on new functions by default, so revoke it explicitly (PUBLIC also
-- covers anon and authenticated) and name the API roles for audit clarity.
revoke all on function public.hw_touch_updated_at() from public;
revoke all on function public.hw_touch_updated_at() from anon, authenticated;

drop trigger if exists hw_profiles_touch_updated_at on public.hw_profiles;
create trigger hw_profiles_touch_updated_at
before update on public.hw_profiles
for each row
execute function public.hw_touch_updated_at();

create or replace function public.hw_create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- SECURITY DEFINER is required because auth.users is outside the client's
  -- RLS context.  Only rows emitted by the auth.users INSERT trigger are
  -- accepted; callers cannot choose an account id or create another tenant's
  -- profile through this function.
  if tg_op <> 'INSERT'
     or tg_table_schema <> 'auth'
     or tg_table_name <> 'users'
     or new.id is null then
    raise exception 'hw_create_profile_for_new_user may only handle auth.users inserts';
  end if;

  insert into public.hw_profiles (
    id,
    email,
    display_name,
    duck_status,
    buck_clearance,
    cool_points
  )
  values (
    new.id,
    new.email,
    left(
      coalesce(
        nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'displayName'), ''),
        pg_catalog.split_part(new.email, '@', 1),
        'player'
      ),
      80
    ),
    'Duck Sauce has not fined this account yet.',
    'Lobby clearance only',
    0
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.hw_create_profile_for_new_user() from public;
revoke all on function public.hw_create_profile_for_new_user() from anon, authenticated;

drop trigger if exists hw_create_profile_after_signup on auth.users;
create trigger hw_create_profile_after_signup
after insert on auth.users
for each row
execute function public.hw_create_profile_for_new_user();
