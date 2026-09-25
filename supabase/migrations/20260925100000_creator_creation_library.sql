begin;

alter table public.creator_media_uploads
  add column if not exists creation_kind text not null default 'world',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz;

alter table public.creator_media_uploads
  drop constraint if exists creator_media_uploads_creation_kind_check,
  add constraint creator_media_uploads_creation_kind_check
    check (creation_kind in ('music', 'video', 'artwork', 'merch', 'world')),
  drop constraint if exists creator_media_uploads_status_check,
  add constraint creator_media_uploads_status_check
    check (status in ('private', 'ready_for_review', 'approved', 'changes_requested'));

create index if not exists creator_media_uploads_creator_created_idx
  on public.creator_media_uploads (creator_id, created_at desc);

create index if not exists creator_media_uploads_review_queue_idx
  on public.creator_media_uploads (created_at)
  where status = 'ready_for_review';

grant update (title, creation_kind, status, updated_at)
  on table public.creator_media_uploads to authenticated;

drop policy if exists "owners update own creator creations" on public.creator_media_uploads;
create policy "owners update own creator creations"
on public.creator_media_uploads for update
to authenticated
using (
  owner_user_id = (select auth.uid())
  and status in ('private', 'ready_for_review', 'changes_requested')
  and exists (
    select 1
    from public.creators c
    where c.id = creator_id
      and c.owner_user_id = (select auth.uid())
  )
)
with check (
  owner_user_id = (select auth.uid())
  and status in ('private', 'ready_for_review')
  and creation_kind in ('music', 'video', 'artwork', 'merch', 'world')
  and exists (
    select 1
    from public.creators c
    where c.id = creator_id
      and c.owner_user_id = (select auth.uid())
  )
);

drop policy if exists "creator admins review creation metadata" on public.creator_media_uploads;
create policy "creator admins review creation metadata"
on public.creator_media_uploads for select
to authenticated
using ((select private.is_creator_admin()));

drop policy if exists "creator admins preview private world media" on storage.objects;
create policy "creator admins preview private world media"
on storage.objects for select
to authenticated
using (
  bucket_id = 'creator-world-uploads'
  and (select private.is_creator_admin())
);

create or replace function public.creator_admin_decide_creation(
  p_creation_id uuid,
  p_decision text,
  p_notes text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_creator_id uuid;
  v_status text;
begin
  if not private.is_creator_admin() then
    raise exception 'creator admin required' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'invalid creation decision' using errcode = '22023';
  end if;

  select creator_id
  into v_creator_id
  from public.creator_media_uploads
  where id = p_creation_id
    and status = 'ready_for_review'
  for update;

  if v_creator_id is null then
    raise exception 'creation unavailable for review' using errcode = 'P0002';
  end if;

  v_status := p_decision;

  update public.creator_media_uploads
  set status = v_status,
      review_note = nullif(left(trim(coalesce(p_notes, '')), 2000), ''),
      reviewed_at = now(),
      updated_at = now()
  where id = p_creation_id;

  insert into public.creator_audit_log
    (actor_id, creator_id, action, target_table, target_id, details)
  values
    ((select auth.uid()), v_creator_id, 'creation_' || v_status,
     'creator_media_uploads', p_creation_id::text,
     jsonb_build_object('decision', v_status));
end;
$function$;

revoke all on function public.creator_admin_decide_creation(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.creator_admin_decide_creation(uuid, text, text)
  to authenticated, service_role;

commit;
