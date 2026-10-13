begin;
-- Profile pictures are public; private creations keep their separate bucket and review flow.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('creator-profile-pictures', 'creator-profile-pictures', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "creator owners upload profile pictures"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'creator-profile-pictures'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (select 1 from public.creators c
    where c.id::text = (storage.foldername(name))[1]
      and c.owner_user_id = (select auth.uid()))
);
create policy "creator owners inspect profile pictures"
on storage.objects for select to authenticated
using (
  bucket_id = 'creator-profile-pictures'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (select 1 from public.creators c
    where c.id::text = (storage.foldername(name))[1]
      and c.owner_user_id = (select auth.uid()))
);
-- Only unsaved pictures can be discarded. A lost save response cannot delete a live picture.
create policy "creator owners discard unused profile pictures"
on storage.objects for delete to authenticated
using (
  bucket_id = 'creator-profile-pictures'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (select 1 from public.creators c
    where c.id::text = (storage.foldername(name))[1]
      and c.owner_user_id = (select auth.uid()))
  and not exists (select 1 from public.creators c
    where right(c.image_url, length('/creator-profile-pictures/' || storage.objects.name))
      = '/creator-profile-pictures/' || storage.objects.name)
);
-- No UPDATE policy: files get unique names and cannot overwrite an existing picture.
commit;
