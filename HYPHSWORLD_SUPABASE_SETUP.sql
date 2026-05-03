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
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hw_profiles_touch_updated_at on public.hw_profiles;
create trigger hw_profiles_touch_updated_at
before update on public.hw_profiles
for each row
execute function public.hw_touch_updated_at();

create or replace function public.hw_create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
    coalesce(new.raw_user_meta_data ->> 'displayName', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'duckStatus', 'Duck Sauce has not fined this account yet.'),
    coalesce(new.raw_user_meta_data ->> 'buckClearance', 'Lobby clearance only'),
    coalesce((new.raw_user_meta_data ->> 'coolPoints')::integer, 0)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists hw_create_profile_after_signup on auth.users;
create trigger hw_create_profile_after_signup
after insert on auth.users
for each row
execute function public.hw_create_profile_for_new_user();
