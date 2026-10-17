-- Additive only. No existing tables or storage objects are changed.
create table if not exists public.music_releases (
 id uuid primary key default gen_random_uuid(),
 creator_id uuid not null references public.creators(id),
 title text not null check (char_length(title) between 1 and 180),
 description text,
 artwork_url text,
 price_cents integer not null default 999 check (price_cents between 99 and 100000),
 currency text not null default 'usd' check (currency = 'usd'),
 status text not null default 'draft' check (status in ('draft','review','published','archived')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.music_tracks (
 id uuid primary key default gen_random_uuid(),
 release_id uuid not null references public.music_releases(id) on delete cascade,
 title text not null,
 track_number integer not null check(track_number > 0),
 private_storage_path text not null,
 preview_url text,
 unique(release_id,track_number)
);
create table if not exists public.music_orders (
 id uuid primary key default gen_random_uuid(),
 buyer_id uuid not null references auth.users(id),
 release_id uuid not null references public.music_releases(id),
 stripe_session_id text unique,
 stripe_payment_intent_id text,
 amount_cents integer not null check(amount_cents >= 0),
 currency text not null default 'usd',
 status text not null default 'pending' check(status in ('pending','paid','refunded','disputed')),
 created_at timestamptz not null default now(),
 paid_at timestamptz
);
create table if not exists public.music_licenses (
 id uuid primary key default gen_random_uuid(),
 buyer_id uuid not null references auth.users(id),
 release_id uuid not null references public.music_releases(id),
 order_id uuid not null unique references public.music_orders(id),
 status text not null default 'active' check(status in ('active','revoked')),
 created_at timestamptz not null default now()
);
create index if not exists music_orders_buyer_idx on public.music_orders(buyer_id);
create index if not exists music_licenses_buyer_idx on public.music_licenses(buyer_id);
create index if not exists music_releases_creator_idx on public.music_releases(creator_id);
alter table public.music_releases enable row level security;
alter table public.music_tracks enable row level security;
alter table public.music_orders enable row level security;
alter table public.music_licenses enable row level security;
create policy "Public can browse published releases" on public.music_releases for select using (status='published');
create policy "Creators can read their own releases" on public.music_releases for select to authenticated using (exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=(select auth.uid())));
create policy "Creators can create draft releases" on public.music_releases for insert to authenticated with check (status='draft' and exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=(select auth.uid()) and c.status='published'));
create policy "Creators can edit drafts" on public.music_releases for update to authenticated using (status='draft' and exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=(select auth.uid()))) with check(status='draft' and exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=(select auth.uid())));
create policy "Published track metadata" on public.music_tracks for select using (exists(select 1 from public.music_releases r where r.id=release_id and r.status='published'));
create policy "Creator track metadata" on public.music_tracks for select to authenticated using (exists(select 1 from public.music_releases r join public.creators c on c.id=r.creator_id where r.id=release_id and c.owner_user_id=(select auth.uid())));
create policy "Buyers read their orders" on public.music_orders for select to authenticated using (buyer_id=(select auth.uid()));
create policy "Buyers read their licenses" on public.music_licenses for select to authenticated using (buyer_id=(select auth.uid()));
-- Never expose paid master storage paths through public metadata reads in production.
-- Before applying migration: move master paths to a separate service-only table or use a secure RPC view.
