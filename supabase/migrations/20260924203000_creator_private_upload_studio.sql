begin;

create table if not exists public.creator_media_uploads (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  media_type text not null check (media_type in ('image','audio','video','document')),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','audio/mpeg','audio/wav','audio/x-wav','audio/mp4','video/mp4','application/pdf')),
  file_size bigint not null check (file_size > 0 and file_size <= 52428800),
  storage_path text not null unique,
  status text not null default 'private' check (status = 'private'),
  created_at timestamptz not null default now()
);

alter table public.creator_media_uploads enable row level security;
revoke all on table public.creator_media_uploads from public, anon, authenticated;
grant select, insert, delete on table public.creator_media_uploads to authenticated;

drop policy if exists "owners read own creator uploads" on public.creator_media_uploads;
create policy "owners read own creator uploads" on public.creator_media_uploads for select to authenticated
using (owner_user_id = (select auth.uid()) and exists (
  select 1 from public.creators c where c.id = creator_id and c.owner_user_id = (select auth.uid())
));

drop policy if exists "owners add own creator uploads" on public.creator_media_uploads;
create policy "owners add own creator uploads" on public.creator_media_uploads for insert to authenticated
with check (owner_user_id = (select auth.uid()) and status = 'private' and exists (
  select 1 from public.creators c where c.id = creator_id and c.owner_user_id = (select auth.uid())
));

drop policy if exists "owners delete own creator uploads" on public.creator_media_uploads;
create policy "owners delete own creator uploads" on public.creator_media_uploads for delete to authenticated
using (owner_user_id = (select auth.uid()) and exists (
  select 1 from public.creators c where c.id = creator_id and c.owner_user_id = (select auth.uid())
));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('creator-world-uploads','creator-world-uploads',false,52428800,array['image/jpeg','image/png','image/webp','audio/mpeg','audio/wav','audio/x-wav','audio/mp4','video/mp4','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "creator owners upload private world media" on storage.objects;
create policy "creator owners upload private world media" on storage.objects for insert to authenticated
with check (bucket_id='creator-world-uploads' and owner_id=(select auth.uid())::text and exists (
  select 1 from public.creators c where c.id::text=split_part(name,'/',1) and c.owner_user_id=(select auth.uid())
));

drop policy if exists "creator owners read private world media" on storage.objects;
create policy "creator owners read private world media" on storage.objects for select to authenticated
using (bucket_id='creator-world-uploads' and owner_id=(select auth.uid())::text and exists (
  select 1 from public.creators c where c.id::text=split_part(name,'/',1) and c.owner_user_id=(select auth.uid())
));

drop policy if exists "creator owners delete private world media" on storage.objects;
create policy "creator owners delete private world media" on storage.objects for delete to authenticated
using (bucket_id='creator-world-uploads' and owner_id=(select auth.uid())::text and exists (
  select 1 from public.creators c where c.id::text=split_part(name,'/',1) and c.owner_user_id=(select auth.uid())
));

commit;
