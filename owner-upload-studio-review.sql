-- REVIEW ONLY. Do not execute on production without separate approval.
-- Grant owner role via trusted auth.users.raw_app_meta_data (never user_metadata).
create table public.owner_media_drafts (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id),
 title text not null check (char_length(title) between 1 and 120),
 description text not null default '' check (char_length(description)<=1000),
 content_type text not null check (content_type='video'),
 destination text not null check(destination in ('homepage','podcast','creator-world')),
 visibility text not null default 'draft' check(visibility='draft'),
 storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.mp4$'),
 mime_type text not null check(mime_type='video/mp4'),
 file_size bigint not null check(file_size between 1 and 52428800),
 created_at timestamptz not null default now()
);
alter table public.owner_media_drafts enable row level security;
revoke all on public.owner_media_drafts from anon;
grant select,insert on public.owner_media_drafts to authenticated;
create policy owner_drafts_read on public.owner_media_drafts for select to authenticated
 using (owner_user_id=(select auth.uid()) and ((select auth.jwt())->'app_metadata'->>'role'='owner' or (select auth.jwt())->'app_metadata'->>'hw_owner'='true'));
create policy owner_drafts_insert on public.owner_media_drafts for insert to authenticated
 with check (owner_user_id=(select auth.uid()) and split_part(storage_path,'/',1)=(select auth.uid())::text and visibility='draft' and ((select auth.jwt())->'app_metadata'->>'role'='owner' or (select auth.jwt())->'app_metadata'->>'hw_owner'='true'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('owner-upload-drafts','owner-upload-drafts',false,52428800,array['video/mp4']);
create policy owner_draft_storage_insert on storage.objects for insert to authenticated
 with check (bucket_id='owner-upload-drafts' and (storage.foldername(name))[1]=(select auth.uid())::text and ((select auth.jwt())->'app_metadata'->>'role'='owner' or (select auth.jwt())->'app_metadata'->>'hw_owner'='true'));
create policy owner_draft_storage_read on storage.objects for select to authenticated
 using (bucket_id='owner-upload-drafts' and (storage.foldername(name))[1]=(select auth.uid())::text and ((select auth.jwt())->'app_metadata'->>'role'='owner' or (select auth.jwt())->'app_metadata'->>'hw_owner'='true'));
create policy owner_draft_storage_delete on storage.objects for delete to authenticated
 using (bucket_id='owner-upload-drafts' and (storage.foldername(name))[1]=(select auth.uid())::text and ((select auth.jwt())->'app_metadata'->>'role'='owner' or (select auth.jwt())->'app_metadata'->>'hw_owner'='true'));
