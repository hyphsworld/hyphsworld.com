create or replace function public.creator_admin_assign_owner(
  p_creator_id uuid,
  p_owner_email text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_owner_id uuid;
  v_email text := lower(trim(coalesce(p_owner_email, '')));
begin
  if not private.is_creator_admin() then
    raise exception 'creator admin required' using errcode = '42501';
  end if;

  if v_email = '' then
    raise exception 'creator email required' using errcode = '22023';
  end if;

  select id into v_owner_id
  from auth.users
  where lower(email) = v_email
  order by created_at
  limit 1;

  if v_owner_id is null then
    raise exception 'No HYPHSWORLD ID found for that email' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.creators
    where owner_user_id = v_owner_id and id <> p_creator_id
  ) then
    raise exception 'That HYPHSWORLD ID is already connected to another Creator World' using errcode = '23505';
  end if;

  update public.creators
  set owner_user_id = v_owner_id,
      updated_at = now()
  where id = p_creator_id;

  if not found then
    raise exception 'Creator not found' using errcode = 'P0002';
  end if;

  insert into public.creator_audit_log
    (actor_id, creator_id, action, target_table, target_id, details)
  values
    (auth.uid(), p_creator_id, 'owner_assigned', 'creators', p_creator_id::text,
     jsonb_build_object('owner_user_id', v_owner_id));

  return v_owner_id;
end;
$$;

revoke all on function public.creator_admin_assign_owner(uuid, text) from public;
revoke all on function public.creator_admin_assign_owner(uuid, text) from anon;
grant execute on function public.creator_admin_assign_owner(uuid, text) to authenticated;
