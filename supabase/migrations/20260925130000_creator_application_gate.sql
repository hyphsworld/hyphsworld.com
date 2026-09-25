begin;

-- Creator World is curated: an authenticated account must be approved before
-- it can create its first private Creator World draft.
drop policy if exists "owners create private drafts" on public.creators;
create policy "approved applicants create one private draft"
on public.creators for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and status = 'draft'
  and verification_level = 'unverified'
  and creator_number is null
  and exists (
    select 1
    from public.creator_applications application
    where application.applicant_id = (select auth.uid())
      and application.status = 'approved'
  )
  and not exists (
    select 1
    from public.creators existing
    where existing.owner_user_id = (select auth.uid())
  )
);

-- A request for more information must have a real applicant-controlled return
-- path, while reviewer notes and ownership fields remain protected.
revoke update on table public.creator_applications from authenticated;
grant update (
  display_name,
  categories,
  city,
  bio,
  portfolio_url,
  contact_email,
  status,
  updated_at
) on table public.creator_applications to authenticated;

drop policy if exists "applicants resubmit requested application info"
  on public.creator_applications;
create policy "applicants resubmit requested application info"
on public.creator_applications for update
to authenticated
using (
  applicant_id = (select auth.uid())
  and status = 'needs_info'
)
with check (
  applicant_id = (select auth.uid())
  and status = 'pending'
);

commit;
