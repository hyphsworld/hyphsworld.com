create or replace function private.protect_creator_follower_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.follower_count is distinct from old.follower_count
     and current_user in ('anon','authenticated') then
    raise exception 'follower_count is server managed';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_creator_follower_count() from public, anon, authenticated;

drop trigger if exists creators_protect_follower_count on public.creators;
create trigger creators_protect_follower_count
before update of follower_count on public.creators
for each row execute function private.protect_creator_follower_count();
