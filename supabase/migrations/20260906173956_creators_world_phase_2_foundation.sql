-- Creators World Phase 2: profiles, follows, verification, entitlements,
-- submissions, and an append-only audit trail.
create schema if not exists private;

create or replace function private.is_creator_admin()
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'creator_admin')::boolean, false)
$$;
revoke all on function private.is_creator_admin() from public, anon, authenticated;

create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  creator_number integer unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  headline text not null default '' check (char_length(headline) <= 160),
  bio text not null default '' check (char_length(bio) <= 3000),
  location text not null default '' check (char_length(location) <= 120),
  categories text[] not null default '{}',
  image_url text not null default '',
  profile_url text not null default '',
  status text not null default 'draft' check (status in ('draft','review','published','suspended')),
  verification_level text not null default 'unverified' check (verification_level in ('unverified','identity','featured','professional','partner','organization')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_links (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  url text not null check (url ~ '^https://'),
  link_type text not null default 'website',
  sort_order integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_follows (
  creator_id uuid not null references public.creators(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (creator_id, user_id)
);

create table if not exists public.creator_verification_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  requested_level text not null check (requested_level in ('identity','professional','partner','organization')),
  evidence_summary text not null check (char_length(evidence_summary) between 20 and 2000),
  status text not null default 'pending' check (status in ('pending','in_review','approved','rejected','withdrawn')),
  reviewer_id uuid references auth.users(id) on delete set null,
  review_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_entitlements (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  entitlement_key text not null,
  status text not null default 'active' check (status in ('active','expired','revoked')),
  source text not null check (source in ('earned','purchase','admin','promotion')),
  granted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (creator_id, entitlement_key)
);

create table if not exists public.creator_submissions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  submission_type text not null check (submission_type in ('music','booking','collaboration','press','partnership')),
  title text not null check (char_length(title) between 2 and 120),
  message text not null check (char_length(message) between 10 and 3000),
  submission_url text not null default '' check (submission_url = '' or submission_url ~ '^https://'),
  status text not null default 'new' check (status in ('new','reviewing','accepted','declined','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  creator_id uuid references public.creators(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function private.prepare_creator()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := trim(both '-' from regexp_replace(lower(new.display_name), '[^a-z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8);
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists creators_prepare on public.creators;
create trigger creators_prepare before insert or update on public.creators for each row execute function private.prepare_creator();

create index if not exists creators_owner_idx on public.creators(owner_user_id);
create index if not exists creators_directory_idx on public.creators(status, display_name);
create index if not exists creator_links_creator_idx on public.creator_links(creator_id, sort_order);
create index if not exists creator_follows_user_idx on public.creator_follows(user_id);
create index if not exists creator_verification_creator_idx on public.creator_verification_requests(creator_id, created_at desc);
create index if not exists creator_entitlements_creator_idx on public.creator_entitlements(creator_id, status);
create index if not exists creator_submissions_creator_idx on public.creator_submissions(creator_id, created_at desc);
create index if not exists creator_submissions_sender_idx on public.creator_submissions(sender_id, created_at desc);
create index if not exists creator_audit_creator_idx on public.creator_audit_log(creator_id, created_at desc);

alter table public.creators enable row level security;
alter table public.creator_links enable row level security;
alter table public.creator_follows enable row level security;
alter table public.creator_verification_requests enable row level security;
alter table public.creator_entitlements enable row level security;
alter table public.creator_submissions enable row level security;
alter table public.creator_audit_log enable row level security;

revoke all on public.creators, public.creator_links, public.creator_follows,
  public.creator_verification_requests, public.creator_entitlements,
  public.creator_submissions, public.creator_audit_log from anon, authenticated;
grant select on public.creators, public.creator_links to anon, authenticated;
grant insert (owner_user_id, display_name, headline, bio, location, categories, image_url, profile_url),
  update (display_name, headline, bio, location, categories, image_url, profile_url) on public.creators to authenticated;
grant insert, delete, select on public.creator_follows to authenticated;
grant insert (creator_id, requester_id, requested_level, evidence_summary), select on public.creator_verification_requests to authenticated;
grant select on public.creator_entitlements to authenticated;
grant insert (creator_id, sender_id, submission_type, title, message, submission_url), select,
  update (status, updated_at) on public.creator_submissions to authenticated;

create policy "published creators are public" on public.creators for select to anon, authenticated using (status = 'published');
create policy "owners read own creator" on public.creators for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "owners create private drafts" on public.creators for insert to authenticated with check (owner_user_id = (select auth.uid()) and status = 'draft' and verification_level = 'unverified' and creator_number is null);
create policy "owners update own creator" on public.creators for update to authenticated using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy "public creator links" on public.creator_links for select to anon, authenticated using (is_public and exists (select 1 from public.creators c where c.id = creator_id and c.status = 'published'));
create policy "owners see all creator links" on public.creator_links for select to authenticated using (exists (select 1 from public.creators c where c.id = creator_id and c.owner_user_id = (select auth.uid())));
create policy "users manage own follows" on public.creator_follows for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "requesters create verification requests" on public.creator_verification_requests for insert to authenticated with check (requester_id = (select auth.uid()) and exists (select 1 from public.creators c where c.id = creator_id and c.owner_user_id = (select auth.uid())));
create policy "requesters read verification requests" on public.creator_verification_requests for select to authenticated using (requester_id = (select auth.uid()));
create policy "owners read entitlements" on public.creator_entitlements for select to authenticated using (exists (select 1 from public.creators c where c.id = creator_id and c.owner_user_id = (select auth.uid())));
create policy "senders create submissions" on public.creator_submissions for insert to authenticated with check (sender_id = (select auth.uid()) and exists (select 1 from public.creators c where c.id = creator_id and c.status = 'published'));
create policy "senders read own submissions" on public.creator_submissions for select to authenticated using (sender_id = (select auth.uid()));
create policy "creator owners read inbox" on public.creator_submissions for select to authenticated using (exists (select 1 from public.creators c where c.id = creator_id and c.owner_user_id = (select auth.uid())));
create policy "creator owners update inbox status" on public.creator_submissions for update to authenticated using (exists (select 1 from public.creators c where c.id = creator_id and c.owner_user_id = (select auth.uid()))) with check (exists (select 1 from public.creators c where c.id = creator_id and c.owner_user_id = (select auth.uid())));

insert into public.creators (creator_number, slug, display_name, headline, bio, location, categories, image_url, profile_url, status, verification_level)
values
  (1, 'hyph-life', 'Hyph Life', 'Artist • Entrepreneur • World Builder', '', 'United States', array['artist','entrepreneur'], 'creator-hyph-life-hero.jpg', 'creators-world.html', 'published', 'professional'),
  (2, 'rojasonthebeat', 'RojasOnTheBeat', 'Producer • Songwriter • DJ • Label Founder • Entrepreneur', '', 'South Florida', array['producer','dj','songwriter'], 'creator-rojas-awards.jpeg', 'creator-rojas.html', 'published', 'professional'),
  (3, 'francoismusic47', 'Francoismusic47', 'Radio Personality • DJ • Host of WeUp Smackn Show', '', 'KUTZ FM 95.7', array['dj','radio','host'], 'creator-francoismusic47-kutz.jpeg', 'creator-francoismusic47.html', 'published', 'featured')
on conflict (slug) do update set display_name = excluded.display_name, headline = excluded.headline,
  location = excluded.location, categories = excluded.categories, image_url = excluded.image_url,
  profile_url = excluded.profile_url, status = excluded.status, verification_level = excluded.verification_level;

insert into public.creator_links (creator_id, label, url, link_type, sort_order)
select id, 'Listen Live', 'https://live365.com/station/KUTZ-FM-a55539', 'radio', 10
from public.creators where slug = 'francoismusic47'
and not exists (select 1 from public.creator_links l where l.creator_id = creators.id and l.url = 'https://live365.com/station/KUTZ-FM-a55539');
