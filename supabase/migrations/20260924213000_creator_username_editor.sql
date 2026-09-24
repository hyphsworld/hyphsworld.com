begin;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null and btrim(username) <> '';

create or replace function public.update_my_username(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Login required.';
  end if;

  if v_username !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'Username must be 3-30 lowercase letters, numbers, or underscores.';
  end if;

  begin
    update public.profiles
       set username = v_username,
           updated_at = now()
     where id = v_user_id
     returning * into v_profile;
  exception
    when unique_violation then
      raise exception 'USERNAME_TAKEN';
  end;

  if v_profile.id is null then
    raise exception 'Profile not found.';
  end if;

  return jsonb_build_object(
    'ok', true,
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'username', v_profile.username,
      'display_name', v_profile.display_name
    )
  );
end;
$function$;

revoke all on function public.update_my_username(text) from public, anon;
grant execute on function public.update_my_username(text) to authenticated, service_role;

commit;
