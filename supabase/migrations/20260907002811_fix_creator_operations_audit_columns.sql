create or replace function public.creator_admin_decide_verification(p_request_id uuid,p_decision text,p_notes text default '') returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_creator uuid; v_level text;
begin
  if not private.is_creator_admin() then raise exception 'admin access required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid decision'; end if;
  select creator_id,requested_level into v_creator,v_level from public.creator_verification_requests where id=p_request_id and status in ('pending','in_review') for update;
  if v_creator is null then raise exception 'request unavailable'; end if;
  update public.creator_verification_requests set status=p_decision,reviewer_id=auth.uid(),review_notes=left(coalesce(p_notes,''),2000),updated_at=now() where id=p_request_id;
  if p_decision='approved' then update public.creators set verification_level=v_level where id=v_creator; end if;
  insert into public.creator_audit_log(actor_id,creator_id,action,target_table,target_id,details) values(auth.uid(),v_creator,'verification_'||p_decision,'creator_verification_requests',p_request_id::text,jsonb_build_object('level',v_level));
end $$;

create or replace function public.creator_admin_set_entitlement(p_creator_id uuid,p_key text,p_status text,p_source text default 'admin',p_expires_at timestamptz default null) returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_entitlement_id uuid;
begin
  if not private.is_creator_admin() then raise exception 'admin access required'; end if;
  if p_status not in ('active','expired','revoked') then raise exception 'invalid status'; end if;
  if p_source not in ('earned','purchase','admin','promotion') then raise exception 'invalid source'; end if;
  insert into public.creator_entitlements(creator_id,entitlement_key,status,source,granted_by,expires_at) values(p_creator_id,left(p_key,80),p_status,p_source,auth.uid(),p_expires_at)
    on conflict(creator_id,entitlement_key) do update set status=excluded.status,source=excluded.source,granted_by=excluded.granted_by,expires_at=excluded.expires_at returning id into v_entitlement_id;
  insert into public.creator_audit_log(actor_id,creator_id,action,target_table,target_id,details) values(auth.uid(),p_creator_id,'entitlement_'||p_status,'creator_entitlements',v_entitlement_id::text,jsonb_build_object('key',left(p_key,80),'source',p_source));
end $$;
