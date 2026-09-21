alter table public.creator_entitlements
  drop constraint if exists creator_entitlements_source_check;

alter table public.creator_entitlements
  add constraint creator_entitlements_source_check
  check (source in ('earned', 'purchase', 'admin', 'promotion'));

create or replace function public.creator_admin_decide_verification(
  p_request_id uuid,
  p_decision text,
  p_notes text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_creator uuid;
  v_level text;
  v_status text;
begin
  if not private.is_creator_admin() then
    raise exception 'creator admin required' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'rejected', 'declined') then
    raise exception 'invalid verification decision' using errcode = '22023';
  end if;

  v_status := case when p_decision = 'approved' then 'approved' else 'declined' end;

  select creator_id, requested_level
  into v_creator, v_level
  from public.creator_verification_requests
  where id = p_request_id
    and status in ('pending', 'in_review')
  for update;

  if v_creator is null then
    raise exception 'verification request unavailable' using errcode = 'P0002';
  end if;

  update public.creator_verification_requests
  set status = v_status,
      reviewer_id = (select auth.uid()),
      review_notes = left(trim(coalesce(p_notes, '')), 2000),
      reviewed_at = now()
  where id = p_request_id;

  if p_decision = 'approved' then
    update public.creators
    set verification_level = v_level,
        updated_at = now()
    where id = v_creator;
  end if;

  insert into public.creator_audit_log
    (actor_id, creator_id, action, target_table, target_id, details)
  values
    ((select auth.uid()), v_creator, 'verification_' || p_decision,
     'creator_verification_requests', p_request_id::text,
     jsonb_build_object('level', v_level, 'stored_status', v_status));
end;
$function$;

revoke all on function public.creator_admin_decide_verification(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.creator_admin_decide_verification(uuid, text, text)
  to authenticated, service_role;
