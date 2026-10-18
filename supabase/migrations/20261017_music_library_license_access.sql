-- Allow buyers to access metadata for releases they already purchased.
-- Never grants access to private master object paths or storage objects.
create policy "Buyers read licensed releases"
on public.music_releases for select to authenticated
using (exists (
 select 1 from public.music_licenses l
 where l.release_id = music_releases.id
 and l.buyer_id = (select auth.uid())
 and l.status = 'active'
));
create policy "Buyers read licensed tracks"
on public.music_tracks for select to authenticated
using (exists (
 select 1 from public.music_licenses l
 where l.release_id = music_tracks.release_id
 and l.buyer_id = (select auth.uid())
 and l.status = 'active'
));
