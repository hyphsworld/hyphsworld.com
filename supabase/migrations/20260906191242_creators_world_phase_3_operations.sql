create table public.creator_events (
  id bigint generated always as identity primary key,
  creator_id uuid not null references public.creators(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('profile_view','share','link_click')),
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
create index creator_events_creator_time_idx on public.creator_events (creator_id, occurred_at desc);
create index creator_events_actor_time_idx on public.creator_events (actor_id, occurred_at desc);
alter table public.creator_events enable row level security;
revoke all on public.creator_events from anon, authenticated;
grant insert (creator_id, actor_id, event_type, metadata) on public.creator_events to authenticated;
create policy "members record own creator events" on public.creator_events for insert to authenticated
with check (actor_id = (select auth.uid()) and exists (select 1 from public.creators c where c.id = creator_id and c.status = 'published'));

create or replace function public.get_my_creator_metrics()
returns table(profile_views bigint, shares bigint, link_clicks bigint, followers bigint, submissions bigint)
language sql stable security definer set search_path = pg_catalog, public as $$
  with mine as (select id from public.creators where owner_user_id = auth.uid() order by created_at limit 1)
  select count(*) filter (where e.event_type = 'profile_view'), count(*) filter (where e.event_type = 'share'),
    count(*) filter (where e.event_type = 'link_click'),
    (select count(*) from public.creator_follows f join mine m on m.id=f.creator_id),
    (select count(*) from public.creator_submissions s join mine m on m.id=s.creator_id)
  from mine m left join public.creator_events e on e.creator_id=m.id
$$;
revoke all on function public.get_my_creator_metrics() from public, anon;
grant execute on function public.get_my_creator_metrics() to authenticated;

create or replace function public.creator_admin_decide_verification(p_request_id uuid,p_decision text,p_notes text default '')
returns void language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare v_creator uuid; v_level text;
begin
  if not private.is_creator_admin() then raise exception 'admin access required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid decision'; end if;
  select creator_id,requested_level into v_creator,v_level from public.creator_verification_requests
    where id=p_request_id and status in ('pending','in_review') for update;
  if v_creator is null then raise exception 'request unavailable'; end if;
  update public.creator_verification_requests set status=p_decision,reviewer_id=auth.uid(),review_notes=left(coalesce(p_notes,''),2000),updated_at=now() where id=p_request_id;
  if p_decision='approved' then update public.creators set verification_level=v_level where id=v_creator; end if;
  insert into public.creator_audit_log(actor_id,creator_id,event_type,payload) values(auth.uid(),v_creator,'verification_'||p_decision,jsonb_build_object('request_id',p_request_id,'level',v_level));
end $$;
revoke all on function public.creator_admin_decide_verification(uuid,text,text) from public, anon;
grant execute on function public.creator_admin_decide_verification(uuid,text,text) to authenticated;

create or replace function public.creator_admin_set_entitlement(p_creator_id uuid,p_key text,p_status text,p_source text default 'admin',p_expires_at timestamptz default null)
returns void language plpgsql security definer set search_path = pg_catalog, public, private as $$
begin
  if not private.is_creator_admin() then raise exception 'admin access required'; end if;
  if p_status not in ('active','expired','revoked') then raise exception 'invalid status'; end if;
  if p_source not in ('earned','purchase','admin','promotion') then raise exception 'invalid source'; end if;
  insert into public.creator_entitlements(creator_id,entitlement_key,status,source,granted_by,expires_at)
    values(p_creator_id,left(p_key,80),p_status,p_source,auth.uid(),p_expires_at)
    on conflict(creator_id,entitlement_key) do update set status=excluded.status,source=excluded.source,granted_by=excluded.granted_by,expires_at=excluded.expires_at;
  insert into public.creator_audit_log(actor_id,creator_id,event_type,payload) values(auth.uid(),p_creator_id,'entitlement_'||p_status,jsonb_build_object('key',left(p_key,80),'source',p_source));
end $$;
revoke all on function public.creator_admin_set_entitlement(uuid,text,text,text,timestamptz) from public, anon;
grant execute on function public.creator_admin_set_entitlement(uuid,text,text,text,timestamptz) to authenticated;

grant select on public.creator_verification_requests,public.creator_audit_log to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_creator_admin() to authenticated;
create policy "creator admins read all creators" on public.creators for select to authenticated using ((select private.is_creator_admin()));
create policy "creator admins read verification queue" on public.creator_verification_requests for select to authenticated using ((select private.is_creator_admin()));
create policy "creator admins read audit log" on public.creator_audit_log for select to authenticated using ((select private.is_creator_admin()));
create policy "creator events denied direct reads" on public.creator_events for select to authenticated using (false);
