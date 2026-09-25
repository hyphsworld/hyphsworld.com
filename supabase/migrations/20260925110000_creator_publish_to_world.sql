begin;

alter table public.creator_media_uploads
  add column if not exists public_path text,
  add column if not exists published_at timestamptz;

alter table public.creator_media_uploads
  drop constraint if exists creator_media_uploads_status_check,
  add constraint creator_media_uploads_status_check
    check (status in ('private', 'ready_for_review', 'approved', 'changes_requested', 'published'));

create unique index if not exists creator_media_uploads_public_path_uidx
  on public.creator_media_uploads (public_path)
  where public_path is not null;

create index if not exists creator_media_uploads_public_world_idx
  on public.creator_media_uploads (creator_id, published_at desc)
  where status = 'published';

drop policy if exists "owners delete own creator uploads" on public.creator_media_uploads;
create policy "owners delete own creator uploads"
on public.creator_media_uploads for delete
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
);

grant select (id, creator_id, title, creation_kind, media_type, mime_type, file_size, status, public_path, published_at)
  on table public.creator_media_uploads to anon;

drop policy if exists "public reads published creation metadata" on public.creator_media_uploads;
create policy "public reads published creation metadata"
on public.creator_media_uploads for select
to anon, authenticated
using (
  status = 'published'
  and public_path is not null
  and exists (
    select 1
    from public.creators c
    where c.id = creator_id
      and c.status = 'published'
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creator-world-public',
  'creator-world-public',
  true,
  52428800,
  array['image/jpeg','image/png','image/webp','audio/mpeg','audio/wav','audio/x-wav','audio/mp4','video/mp4','application/pdf']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "creator admins add published world media" on storage.objects;
create policy "creator admins add published world media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'creator-world-public'
  and owner_id = (select auth.uid())::text
  and (select private.is_creator_admin())
);

drop policy if exists "creator admins inspect published world media" on storage.objects;
create policy "creator admins inspect published world media"
on storage.objects for select
to authenticated
using (
  bucket_id = 'creator-world-public'
  and (select private.is_creator_admin())
);

drop policy if exists "creator admins update published world media" on storage.objects;
create policy "creator admins update published world media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'creator-world-public'
  and (select private.is_creator_admin())
)
with check (
  bucket_id = 'creator-world-public'
  and owner_id = (select auth.uid())::text
  and (select private.is_creator_admin())
);

drop policy if exists "creator admins remove published world media" on storage.objects;
create policy "creator admins remove published world media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'creator-world-public'
  and (select private.is_creator_admin())
);

create or replace view public.creator_world_publications
with (security_invoker = true)
as
select
  m.id,
  m.creator_id,
  c.slug as creator_slug,
  m.title,
  m.creation_kind,
  m.media_type,
  m.mime_type,
  m.file_size,
  m.public_path,
  m.published_at
from public.creator_media_uploads m
join public.creators c on c.id = m.creator_id
where m.status = 'published'
  and m.public_path is not null
  and c.status = 'published';

revoke all on table public.creator_world_publications from public;
grant select on table public.creator_world_publications to anon, authenticated, service_role;

create or replace function public.creator_admin_publish_creation(
  p_creation_id uuid,
  p_public_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_creator_id uuid;
begin
  if not private.is_creator_admin() then
    raise exception 'creator admin required' using errcode = '42501';
  end if;

  select creator_id
  into v_creator_id
  from public.creator_media_uploads
  where id = p_creation_id
    and status = 'approved'
  for update;

  if v_creator_id is null then
    raise exception 'approved creation unavailable' using errcode = 'P0002';
  end if;

  if p_public_path is null
     or char_length(p_public_path) > 500
     or p_public_path not like v_creator_id::text || '/' || p_creation_id::text || '/%' then
    raise exception 'invalid public creation path' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'creator-world-public'
      and o.name = p_public_path
  ) then
    raise exception 'public creation file unavailable' using errcode = 'P0002';
  end if;

  update public.creator_media_uploads
  set status = 'published',
      public_path = p_public_path,
      published_at = now(),
      updated_at = now()
  where id = p_creation_id;

  insert into public.creator_audit_log
    (actor_id, creator_id, action, target_table, target_id, details)
  values
    ((select auth.uid()), v_creator_id, 'creation_published',
     'creator_media_uploads', p_creation_id::text,
     jsonb_build_object('public_path', p_public_path));
end;
$function$;

revoke all on function public.creator_admin_publish_creation(uuid, text)
  from public, anon, authenticated;
grant execute on function public.creator_admin_publish_creation(uuid, text)
  to authenticated, service_role;

commit;
