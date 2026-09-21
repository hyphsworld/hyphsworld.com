create table if not exists public.creator_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  categories text[] not null default '{}' check (cardinality(categories) between 1 and 8),
  city text not null check (char_length(trim(city)) between 2 and 120),
  bio text not null check (char_length(trim(bio)) between 40 and 2000),
  portfolio_url text not null check (portfolio_url ~ '^https://'),
  contact_email text not null check (contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
  status text not null default 'pending' check (status in ('pending','in_review','needs_info','approved','rejected')),
  reviewer_id uuid references auth.users(id) on delete set null,
  review_notes text not null default '' check (char_length(review_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index if not exists creator_applications_one_active_per_user_idx
  on public.creator_applications (applicant_id)
  where status in ('pending','in_review','needs_info','approved');
create index if not exists creator_applications_queue_idx
  on public.creator_applications (status, created_at);

alter table public.creator_applications enable row level security;
revoke all on table public.creator_applications from public, anon, authenticated;
grant select, insert on table public.creator_applications to authenticated;
grant all on table public.creator_applications to service_role;

create policy "applicants submit own creator application"
on public.creator_applications for insert to authenticated
with check (applicant_id = (select auth.uid()) and status = 'pending');

create policy "applicants read own creator application"
on public.creator_applications for select to authenticated
using (applicant_id = (select auth.uid()));

create policy "creator admins read application queue"
on public.creator_applications for select to authenticated
using ((select private.is_creator_admin()));

create or replace function public.creator_admin_decide_application(
  p_application_id uuid,
  p_decision text,
  p_notes text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not private.is_creator_admin() then
    raise exception 'creator admin required' using errcode = '42501';
  end if;
  if p_decision not in ('in_review','needs_info','approved','rejected') then
    raise exception 'invalid application decision' using errcode = '22023';
  end if;

  update public.creator_applications
  set status = p_decision,
      reviewer_id = (select auth.uid()),
      review_notes = left(trim(coalesce(p_notes, '')), 2000),
      reviewed_at = case when p_decision in ('approved','rejected') then now() else reviewed_at end,
      updated_at = now()
  where id = p_application_id
    and status in ('pending','in_review','needs_info');

  if not found then raise exception 'application unavailable' using errcode = 'P0002'; end if;
end;
$function$;

revoke all on function public.creator_admin_decide_application(uuid,text,text) from public, anon, authenticated;
grant execute on function public.creator_admin_decide_application(uuid,text,text) to authenticated;
