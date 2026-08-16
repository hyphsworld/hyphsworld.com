-- HYPHSWORLD auth + Cool Points lockdown.
-- Review before running. This script deletes no accounts, profiles, balances, unlocks, or ledger rows.
begin;

alter table public.profiles enable row level security;
alter table public.cool_points_ledger enable row level security;

-- Remove the cross-account profile read path. Self-only SELECT policies remain.
drop policy if exists profiles_select_authenticated on public.profiles;

-- Remove duplicate broad UPDATE policies and replace them with one self-only row policy.
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update_own_safe_columns on public.profiles;
create policy profiles_update_own_safe_columns
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- RLS controls rows; privileges below control sensitive columns.
revoke update on table public.profiles from authenticated;
revoke insert on table public.profiles from authenticated;

-- Browsers may read their ledger but may not mint ledger entries directly.
drop policy if exists "Users can add own points ledger entries" on public.cool_points_ledger;
revoke insert, update, delete, truncate, trigger, references on table public.cool_points_ledger from authenticated;
grant select on table public.cool_points_ledger to authenticated;

-- Profile and wallet APIs used by auth-client.js. Each function checks auth.uid().
revoke execute on function public.update_my_profile(text, text, text, text, boolean, boolean) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text, boolean, boolean) to authenticated;
revoke execute on function public.get_my_points() from public, anon;
grant execute on function public.get_my_points() to authenticated;

commit;

-- Verification queries (read-only):
select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('profiles', 'cool_points_ledger')
order by tablename, cmd, policyname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profiles', 'cool_points_ledger')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
