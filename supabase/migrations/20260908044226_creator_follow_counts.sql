alter table public.creators
  add column if not exists follower_count bigint not null default 0;

alter table public.creators
  drop constraint if exists creators_follower_count_nonnegative;

alter table public.creators
  add constraint creators_follower_count_nonnegative check (follower_count >= 0);

update public.creators c
set follower_count = counts.followers
from (
  select c2.id, count(f.user_id)::bigint as followers
  from public.creators c2
  left join public.creator_follows f on f.creator_id = c2.id
  group by c2.id
) counts
where counts.id = c.id;

create or replace function private.sync_creator_follower_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.creators
    set follower_count = follower_count + 1
    where id = new.creator_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.creators
    set follower_count = greatest(follower_count - 1, 0)
    where id = old.creator_id;
    return old;
  end if;
  return null;
end;
$$;

revoke all on function private.sync_creator_follower_count() from public, anon, authenticated;

drop trigger if exists creator_follows_sync_count on public.creator_follows;
create trigger creator_follows_sync_count
after insert or delete on public.creator_follows
for each row execute function private.sync_creator_follower_count();

alter table public.creator_follows enable row level security;

grant select, insert, delete on table public.creator_follows to authenticated;
revoke update on table public.creator_follows from authenticated;
revoke all on table public.creator_follows from anon;

drop policy if exists "users read own follows" on public.creator_follows;
drop policy if exists "users follow creators" on public.creator_follows;
drop policy if exists "users unfollow creators" on public.creator_follows;

create policy "users read own follows"
on public.creator_follows for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users follow creators"
on public.creator_follows for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users unfollow creators"
on public.creator_follows for delete
to authenticated
using ((select auth.uid()) = user_id);
