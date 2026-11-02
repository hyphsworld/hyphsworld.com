-- Member posts are independent of the reviewed professional creator releases.
create table public.creator_member_posts (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 caption text not null default '' check (length(caption) <= 1500),
 mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','video/mp4','video/quicktime','audio/mpeg','audio/mp4','audio/wav','audio/x-wav')),
 file_size bigint not null check (file_size between 1 and 52428800),
 storage_path text not null unique,
 status text not null default 'uploading' check (status in ('uploading','published','removed')),
 created_at timestamptz not null default clock_timestamp(),
 published_at timestamptz
);
create index creator_member_posts_feed on public.creator_member_posts(published_at desc,id desc) where status='published';
create index creator_member_posts_owner on public.creator_member_posts(owner_id,created_at desc);
alter table public.creator_member_posts enable row level security;
revoke all on public.creator_member_posts from anon, authenticated;
grant select on public.creator_member_posts to authenticated;
create policy member_posts_owner_read on public.creator_member_posts for select to authenticated
 using (owner_id=(select auth.uid()) or (select private.is_creator_admin()));

create table public.creator_member_reports (
 post_id uuid not null references public.creator_member_posts(id) on delete cascade,
 reporter_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check (reason in ('spam','rights','unsafe','other')),
 created_at timestamptz not null default now(),
 primary key(post_id,reporter_id)
);
create index creator_member_reports_reporter on public.creator_member_reports(reporter_id,created_at desc);
alter table public.creator_member_reports enable row level security;
revoke all on public.creator_member_reports from anon, authenticated;
grant select on public.creator_member_reports to authenticated;
create policy member_reports_owner_read on public.creator_member_reports for select to authenticated
 using (reporter_id=(select auth.uid()) or (select private.is_creator_admin()));

-- Privileged implementations stay outside the Data API, with fixed search paths,
-- explicit caller checks and narrow grants. Public RPCs below are invokers.
create function private.member_can_post() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 and exists (select 1 from public.profiles where id=auth.uid() and account_status='active' and deleted_at is null)
 and exists (select 1 from auth.users where id=auth.uid() and deleted_at is null and (banned_until is null or banned_until<=now()) and (email_confirmed_at is not null or phone_confirmed_at is not null));
$$;

create function private.member_reserve_post(p_id uuid,p_caption text,p_mime text,p_size bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.creator_member_posts; ext text;
begin
 if not private.member_can_post() then raise exception 'Sign in with an active, confirmed member account to post.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,4021));
 select * into r from public.creator_member_posts where id=p_id;
 if found then
  if r.owner_id<>auth.uid() or r.status='removed' then raise exception 'Post is unavailable.'; end if;
  if r.caption<>trim(coalesce(p_caption,'')) or r.mime_type<>p_mime or r.file_size<>p_size then raise exception 'Choose a new post for changed media or caption.'; end if;
  return to_jsonb(r);
 end if;
 if p_id is null or p_size is null or p_mime is null or p_size not between 1 and 52428800 or length(coalesce(p_caption,''))>1500 then raise exception 'Choose a supported file up to 50 MB and a caption up to 1,500 characters.'; end if;
 ext := case p_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'video/mp4' then 'mp4' when 'video/quicktime' then 'mov' when 'audio/mpeg' then 'mp3' when 'audio/mp4' then 'm4a' when 'audio/wav' then 'wav' when 'audio/x-wav' then 'wav' end;
 if ext is null then raise exception 'This media type is not supported.'; end if;
 if (select count(*) from public.creator_member_posts where owner_id=auth.uid() and created_at>now()-interval '24 hours')>=20
 or (select coalesce(sum(file_size),0) from public.creator_member_posts where owner_id=auth.uid() and created_at>now()-interval '24 hours')+p_size>524288000
 then raise exception 'Daily upload limit reached. Try again tomorrow.'; end if;
 insert into public.creator_member_posts(id,owner_id,caption,mime_type,file_size,storage_path)
 values(p_id,auth.uid(),trim(coalesce(p_caption,'')),p_mime,p_size,auth.uid()::text||'/'||p_id::text||'/media.'||ext) returning * into r;
 return to_jsonb(r);
end $$;

create function private.member_publish_post(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.creator_member_posts; obj storage.objects;
begin
 if not private.member_can_post() then raise exception 'An active member account is required.'; end if;
 select * into r from public.creator_member_posts where id=p_id and owner_id=auth.uid() for update;
 if not found or r.status='removed' then raise exception 'Post is unavailable.'; end if;
 if r.status='published' then return jsonb_build_object('id',r.id,'status',r.status); end if;
 select * into obj from storage.objects where bucket_id='creator-member-media' and name=r.storage_path;
 if not found then raise exception 'Upload is not complete. Retry posting when the upload finishes.'; end if;
 if obj.owner_id is distinct from auth.uid()::text or (obj.metadata->>'size')::bigint is distinct from r.file_size
 or split_part(obj.metadata->>'mimetype',';',1) is distinct from r.mime_type then raise exception 'Uploaded media does not match this post.'; end if;
 update public.creator_member_posts set status='published',published_at=clock_timestamp() where id=r.id;
 return jsonb_build_object('id',r.id,'status','published');
end $$;

create function private.member_remove_post(p_id uuid) returns text
language plpgsql security definer set search_path='' as $$
declare path text;
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 update public.creator_member_posts set status='removed' where id=p_id and
 (owner_id=auth.uid() or private.is_creator_admin()) returning storage_path into path;
 if path is null then raise exception 'Post is unavailable.'; end if;
 return path;
end $$;

create function private.member_report_post(p_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.member_can_post() then raise exception 'Sign in with an active account to report a post.'; end if;
 if p_reason is null or p_reason not in ('spam','rights','unsafe','other') then raise exception 'Choose a report reason.'; end if;
 if not exists(select 1 from public.creator_member_posts where id=p_id and status='published') then raise exception 'Post is unavailable.'; end if;
 if (select count(*) from public.creator_member_reports where reporter_id=auth.uid() and created_at>now()-interval '24 hours')>=50 then raise exception 'Daily report limit reached.'; end if;
 insert into public.creator_member_reports values(p_id,auth.uid(),p_reason,now()) on conflict do nothing;
end $$;

create function private.member_feed(p_before timestamptz,p_before_id uuid,p_reported boolean) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if p_reported and not private.is_creator_admin() then raise exception 'Moderator access required.'; end if;
 return coalesce((select jsonb_agg(to_jsonb(f) order by f.published_at desc,f.id desc) from (
 select p.id,p.owner_id,p.caption,p.mime_type,p.storage_path,p.published_at,
 left(coalesce(nullif(trim(pr.display_name),''),nullif(trim(pr.username),''),'HYPHSWORLD Member'),80) author_name,
 case when p_reported then (select count(*) from public.creator_member_reports r where r.post_id=p.id) else null end report_count
 from public.creator_member_posts p join public.profiles pr on pr.id=p.owner_id
 where p.status='published' and pr.account_status='active' and pr.deleted_at is null
 and (p_before is null or (p.published_at,p.id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
 and (not p_reported or exists(select 1 from public.creator_member_reports r where r.post_id=p.id))
 order by p.published_at desc,p.id desc limit 20
 ) f),'[]'::jsonb);
end $$;

create function private.member_media_access(p_path text,p_action text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.creator_member_posts p join public.profiles pr on pr.id=p.owner_id
 where p.storage_path=p_path and case p_action
 when 'insert' then p.owner_id=auth.uid() and p.status='uploading' and p.created_at>now()-interval '24 hours' and private.member_can_post()
 when 'read' then (p.status='published' and pr.account_status='active' and pr.deleted_at is null)
 or (p.owner_id=auth.uid() and p.status in ('uploading','removed')) or private.is_creator_admin()
 when 'delete' then p.status='removed' and (p.owner_id=auth.uid() or private.is_creator_admin())
 else false end);
$$;

create function public.member_reserve_post(p_id uuid,p_caption text,p_mime text,p_size bigint) returns jsonb language sql security invoker set search_path='' as $$ select private.member_reserve_post(p_id,p_caption,p_mime,p_size) $$;
create function public.member_publish_post(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.member_publish_post(p_id) $$;
create function public.member_remove_post(p_id uuid) returns text language sql security invoker set search_path='' as $$ select private.member_remove_post(p_id) $$;
create function public.member_report_post(p_id uuid,p_reason text) returns void language sql security invoker set search_path='' as $$ select private.member_report_post(p_id,p_reason) $$;
create function public.member_feed(p_before timestamptz default null,p_before_id uuid default null,p_reported boolean default false) returns jsonb language sql security invoker set search_path='' as $$ select private.member_feed(p_before,p_before_id,p_reported) $$;

revoke all on function private.member_can_post(),private.member_reserve_post(uuid,text,text,bigint),private.member_publish_post(uuid),private.member_remove_post(uuid),private.member_report_post(uuid,text),private.member_feed(timestamptz,uuid,boolean),private.member_media_access(text,text) from public,anon,authenticated;
revoke all on function public.member_reserve_post(uuid,text,text,bigint),public.member_publish_post(uuid),public.member_remove_post(uuid),public.member_report_post(uuid,text),public.member_feed(timestamptz,uuid,boolean) from public,anon,authenticated;
grant usage on schema private to anon,authenticated;
grant execute on function private.member_can_post(),private.member_reserve_post(uuid,text,text,bigint),private.member_publish_post(uuid),private.member_remove_post(uuid),private.member_report_post(uuid,text),public.member_reserve_post(uuid,text,text,bigint),public.member_publish_post(uuid),public.member_remove_post(uuid),public.member_report_post(uuid,text) to authenticated;
grant execute on function private.member_feed(timestamptz,uuid,boolean),private.member_media_access(text,text),public.member_feed(timestamptz,uuid,boolean) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('creator-member-media','creator-member-media',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','audio/mpeg','audio/mp4','audio/wav','audio/x-wav']);
create policy member_media_insert on storage.objects for insert to authenticated with check
 (bucket_id='creator-member-media' and owner_id=(select auth.uid())::text and private.member_media_access(name,'insert'));
create policy member_media_read on storage.objects for select to anon,authenticated using
 (bucket_id='creator-member-media' and private.member_media_access(name,'read'));
create policy member_media_delete on storage.objects for delete to authenticated using
 (bucket_id='creator-member-media' and private.member_media_access(name,'delete'));
-- No UPDATE policy: uploaded objects are immutable, including after publication.
