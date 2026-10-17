-- Music commerce v1. Additive schema; production migration requires review.
create table if not exists public.music_releases (
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.creators(id),
 title text not null check(length(title) between 1 and 180),
 featured_artist text, producer_credit text, artwork_url text,
 price_cents integer not null default 199 check(price_cents between 99 and 100000),
 currency text not null default 'usd' check(currency='usd'),
 status text not null default 'draft' check(status in ('draft','review','published','archived')),
 created_at timestamptz not null default now()
);
create table if not exists public.music_tracks (
 id uuid primary key default gen_random_uuid(), release_id uuid not null references public.music_releases(id) on delete cascade,
 title text not null, track_number integer not null check(track_number>0), preview_url text,
 unique(release_id,track_number)
);
-- This table must not be granted to anon/authenticated.
create table if not exists public.music_master_files (
 track_id uuid primary key references public.music_tracks(id) on delete cascade,
 bucket text not null default 'music-paid-masters' check(bucket='music-paid-masters'),
 object_path text not null
);
create table if not exists public.music_orders (
 id uuid primary key default gen_random_uuid(), buyer_id uuid not null references auth.users(id),
 release_id uuid not null references public.music_releases(id),
 stripe_session_id text unique, stripe_payment_intent_id text,
 amount_cents integer not null check(amount_cents>=0), currency text not null default 'usd',
 status text not null default 'pending' check(status in ('pending','paid','refunded','disputed')),
 created_at timestamptz not null default now(), paid_at timestamptz
);
create table if not exists public.music_licenses (
 id uuid primary key default gen_random_uuid(), buyer_id uuid not null references auth.users(id),
 release_id uuid not null references public.music_releases(id),
 order_id uuid not null unique references public.music_orders(id),
 status text not null default 'active' check(status in ('active','revoked')),
 created_at timestamptz not null default now()
);
create index if not exists music_orders_buyer_idx on public.music_orders(buyer_id);
create index if not exists music_licenses_buyer_idx on public.music_licenses(buyer_id);
alter table public.music_releases enable row level security;
alter table public.music_tracks enable row level security;
alter table public.music_master_files enable row level security;
alter table public.music_orders enable row level security;
alter table public.music_licenses enable row level security;
revoke all on public.music_master_files from anon,authenticated;
create policy "Browse published music" on public.music_releases for select using(status='published');
create policy "Read published track previews" on public.music_tracks for select using(exists(select 1 from public.music_releases r where r.id=release_id and r.status='published'));
create policy "Read own music orders" on public.music_orders for select to authenticated using(buyer_id=(select auth.uid()));
create policy "Read own purchased music" on public.music_licenses for select to authenticated using(buyer_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('music-paid-masters','music-paid-masters',false,104857600,array['audio/wav','audio/x-wav','audio/mpeg','audio/flac'])
on conflict(id) do nothing;
-- No public storage.objects policies for paid masters. Only service-role backend may access them.
