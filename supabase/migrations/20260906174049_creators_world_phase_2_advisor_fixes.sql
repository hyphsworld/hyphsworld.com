create index if not exists creator_audit_actor_idx on public.creator_audit_log (actor_id) where actor_id is not null;
create index if not exists creator_entitlements_granted_by_idx on public.creator_entitlements (granted_by) where granted_by is not null;
create index if not exists creator_verification_reviewer_idx on public.creator_verification_requests (reviewer_id) where reviewer_id is not null;

drop policy if exists "public creator links" on public.creator_links;
drop policy if exists "owners see all creator links" on public.creator_links;
create policy "published or owned creator links" on public.creator_links for select to anon, authenticated
using (
  (is_public and exists (select 1 from public.creators c where c.id = creator_id and c.status = 'published'))
  or exists (select 1 from public.creators c where c.id = creator_id and c.owner_user_id = (select auth.uid()))
);

drop policy if exists "senders read own submissions" on public.creator_submissions;
drop policy if exists "creator owners read inbox" on public.creator_submissions;
create policy "participants read submissions" on public.creator_submissions for select to authenticated
using (
  sender_id = (select auth.uid())
  or exists (select 1 from public.creators c where c.id = creator_id and c.owner_user_id = (select auth.uid()))
);

create policy "creator audit denied to clients" on public.creator_audit_log for select to authenticated using (false);
