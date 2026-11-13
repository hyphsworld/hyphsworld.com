-- Synthetic schema snapshot of affected tables and profile guards, 2026-11-01.
-- Local disposable database ONLY. No production records or reward codes.
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;
grant usage on schema public,auth to anon,authenticated,service_role;
grant execute on all functions in schema auth to anon,authenticated,service_role;
create table public.profiles (
id uuid not null,
username text,
display_name text,
avatar_url text,
points integer not null default 0,
lifetime_points integer not null default 0,
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now(),
duck_status text,
buck_clearance text,
level_1_unlocked boolean not null default false,
level_2_unlocked boolean not null default false,
vault_access_granted_at timestamp with time zone,
avatar_type text not null default 'boy'::text,
avatar_icon text not null default '🧢'::text,
daily_streak_count integer not null default 0,
last_daily_claim_at timestamp with time zone,
rank_title text not null default 'Lobby Rookie'::text,
multiplier numeric(4,2) not null default 1.00,
leaderboard_score integer not null default 0,
deleted_at timestamp with time zone,
account_status text not null default 'active'::text,
email text,
hyphsworld_id text,
avatar_style text default 'duck_sauce_default'::text,
cool_points integer not null default 0,
daily_spin_streak integer not null default 0,
last_daily_spin_at timestamp with time zone,
vault_level integer not null default 1
);
create table public.reward_definitions (
id uuid not null default gen_random_uuid(),
reward_key text not null,
title text not null,
description text,
reward_type text not null default 'badge'::text,
point_cost integer not null default 0,
min_points_required integer not null default 0,
is_active boolean not null default true,
metadata jsonb not null default '{}'::jsonb,
created_at timestamp with time zone not null default now()
);
create table public.user_rewards (
id uuid not null default gen_random_uuid(),
user_id uuid not null,
reward_key text not null,
source text not null default 'system'::text,
claimed_at timestamp with time zone not null default now(),
metadata jsonb not null default '{}'::jsonb
);
create table public.reward_codes (
id uuid not null default gen_random_uuid(),
code text not null,
title text not null,
reward_type text not null default 'points'::text,
points integer not null default 0,
hint text,
unlock_key text,
starts_at timestamp with time zone,
ends_at timestamp with time zone,
max_global_redemptions integer,
is_active boolean not null default true,
created_at timestamp with time zone not null default now()
);
create table public.reward_code_redemptions (
id uuid not null default gen_random_uuid(),
user_id uuid not null,
reward_code_id uuid not null,
code text not null,
points_awarded integer not null default 0,
redeemed_at timestamp with time zone not null default now()
);
create table public.cool_points_ledger (
id uuid not null default gen_random_uuid(),
user_id uuid not null,
amount integer not null,
reason text not null,
source text default 'system'::text,
metadata jsonb not null default '{}'::jsonb,
created_at timestamp with time zone not null default now()
);
alter table public.profiles add primary key(id);
alter table public.profiles add foreign key(id) references auth.users(id);
alter table public.reward_codes add primary key(id), add unique(code);
alter table public.reward_definitions add primary key(id), add unique(reward_key);
alter table public.user_rewards add primary key(id), add unique(user_id,reward_key),
 add foreign key(user_id) references public.profiles(id),
 add foreign key(reward_key) references public.reward_definitions(reward_key);
alter table public.reward_code_redemptions add primary key(id), add unique(user_id,reward_code_id),
 add foreign key(user_id) references auth.users(id), add foreign key(reward_code_id) references public.reward_codes(id);
alter table public.cool_points_ledger add primary key(id), add foreign key(user_id) references auth.users(id);
CREATE OR REPLACE FUNCTION public.guard_profile_initial_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n jsonb:=to_jsonb(new); key text; existing uuid;
begin
 if current_setting('app.server_write',true)='on' or
    (auth.uid() is null and coalesce(auth.jwt()->>'role','') not in('authenticated','anon')) then return new; end if;
 if auth.uid() is distinct from new.id then raise exception 'Profile owner mismatch.' using errcode='42501';end if;
 -- Lock existing identity against delete/reinsert races; conflict UPDATE validates its final row.
 select id into existing from public.profiles where id=new.id for key share;
 if existing is not null then return new;end if;
 foreach key in array array['points','cool_points','lifetime_points','leaderboard_score','daily_streak_count','daily_spin_streak'] loop
  if coalesce((n->>key)::numeric,0)<>0 then raise exception 'Protected initial profile fields are server-owned.' using errcode='42501';end if;
 end loop;
 if coalesce((n->>'level_1_unlocked')::boolean,false) or coalesce((n->>'level_2_unlocked')::boolean,false)
 or coalesce(n->>'account_status','active')<>'active' or coalesce((n->>'multiplier')::numeric,1)<>1
 or coalesce((n->>'vault_level')::integer,1)<>1 or coalesce(n->>'rank_title','Lobby Rookie')<>'Lobby Rookie'
 or n->>'deleted_at' is not null or n->>'vault_access_granted_at' is not null or n->>'last_daily_claim_at' is not null
 or n->>'last_daily_spin_at' is not null or n->>'hyphsworld_id' is not null
 or coalesce(n->>'duck_status','Duck Sauce is watching this account.')<>'Duck Sauce is watching this account.'
 or coalesce(n->>'buck_clearance','Lobby clearance only')<>'Lobby clearance only'
 or abs(extract(epoch from(clock_timestamp()-coalesce(new.created_at,clock_timestamp()))))>300 then
  raise exception 'Protected initial profile fields are server-owned.' using errcode='42501';
 end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.guard_profile_protected_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if current_setting('app.server_write',true)='on' then return new; end if;
 if (to_jsonb(new)-array['username','display_name','avatar_url','avatar_type','avatar_icon','avatar_style','email','updated_at'])
    is distinct from (to_jsonb(old)-array['username','display_name','avatar_url','avatar_type','avatar_icon','avatar_style','email','updated_at']) then
  raise exception 'Protected profile fields are server-owned.' using errcode='42501';
 end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.protect_profile_vault_flags()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if auth.role() = 'authenticated' and (
    new.level_1_unlocked is distinct from old.level_1_unlocked or
    new.level_2_unlocked is distinct from old.level_2_unlocked or
    new.vault_access_granted_at is distinct from old.vault_access_granted_at
  ) then
    raise exception 'Vault access fields are server-managed';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create trigger guard_profile_initial_fields before insert on public.profiles for each row execute function public.guard_profile_initial_fields();
create trigger guard_profile_protected_fields before update on public.profiles for each row execute function public.guard_profile_protected_fields();
create trigger protect_profile_vault_flags_trigger before update on public.profiles for each row execute function public.protect_profile_vault_flags();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
alter table public.reward_codes enable row level security;
create policy reward_codes_select_active on public.reward_codes for select to authenticated using (is_active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()));
grant select on public.reward_codes to anon,authenticated;
