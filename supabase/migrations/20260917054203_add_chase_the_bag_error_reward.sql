-- One-of-one CHASE THE BAG ERROR sweatsuit reward.
-- The claim, Cool Points debit, ledger entry, and lifetime VIP grant are atomic.

create table if not exists public.exclusive_reward_claims (
  reward_id text primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  claim_id uuid not null default gen_random_uuid() unique,
  reward_title text not null,
  points_spent integer not null check (points_spent > 0),
  item_size text not null,
  status text not null default 'claimed' check (status in ('claimed', 'shipping_submitted', 'fulfilled')),
  shipping_name text,
  shipping_email text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_region text,
  shipping_postal_code text,
  shipping_country text,
  claimed_at timestamptz not null default now(),
  shipping_submitted_at timestamptz,
  fulfilled_at timestamptz
);

create index if not exists exclusive_reward_claims_user_id_idx
  on public.exclusive_reward_claims (user_id);

alter table public.exclusive_reward_claims enable row level security;
revoke all on table public.exclusive_reward_claims from public, anon, authenticated;
grant all on table public.exclusive_reward_claims to service_role;

create table if not exists public.lifetime_access_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  access_key text not null,
  source_reward_id text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (user_id, access_key)
);

alter table public.lifetime_access_grants enable row level security;
revoke all on table public.lifetime_access_grants from public, anon, authenticated;
grant all on table public.lifetime_access_grants to service_role;

create or replace function public.get_my_chase_the_bag_error_claim()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_claim public.exclusive_reward_claims;
begin
  if v_user is null then raise exception 'Login required.'; end if;

  select * into v_claim
  from public.exclusive_reward_claims
  where reward_id = 'chase_the_bag_error_sweatsuit';

  if v_claim.reward_id is null then
    return jsonb_build_object('available', true, 'owned', false, 'cost', 20600, 'size', 'Large');
  end if;

  if v_claim.user_id <> v_user then
    return jsonb_build_object('available', false, 'owned', false, 'status', 'claimed');
  end if;

  return jsonb_build_object(
    'available', false,
    'owned', true,
    'claim_id', v_claim.claim_id,
    'status', v_claim.status,
    'size', v_claim.item_size,
    'shipping_submitted', v_claim.shipping_submitted_at is not null,
    'claimed_at', v_claim.claimed_at,
    'lifetime_access', 'VIP events and gated content'
  );
end;
$function$;

create or replace function public.redeem_chase_the_bag_error_reward()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_balance integer;
  v_new_balance integer;
  v_claim_id uuid;
begin
  if v_user is null then raise exception 'Login required.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('exclusive_reward:chase_the_bag_error_sweatsuit', 0)
  );

  if exists (
    select 1 from public.exclusive_reward_claims
    where reward_id = 'chase_the_bag_error_sweatsuit'
  ) then
    raise exception 'This one-of-one ERROR outfit has already been claimed.';
  end if;

  select coalesce(p.cool_points, p.points, 0) into v_balance
  from public.profiles p
  where p.id = v_user
  for update;

  if not found then raise exception 'Player profile not found.'; end if;
  if v_balance < 20600 then raise exception 'You need 20,600 Cool Points to claim this reward.'; end if;

  v_new_balance := v_balance - 20600;
  perform pg_catalog.set_config('app.server_write', 'on', true);

  update public.profiles p
  set cool_points = v_new_balance,
      points = v_new_balance,
      leaderboard_score = greatest(coalesce(p.leaderboard_score, 0) - 20600, 0),
      updated_at = now()
  where p.id = v_user;

  insert into public.exclusive_reward_claims (
    reward_id, user_id, reward_title, points_spent, item_size
  ) values (
    'chase_the_bag_error_sweatsuit', v_user,
    'Black CHASE THE BAG ERROR Sweatsuit', 20600, 'Large'
  ) returning claim_id into v_claim_id;

  insert into public.lifetime_access_grants (user_id, access_key, source_reward_id)
  values (v_user, 'vip_events_gated_content', 'chase_the_bag_error_sweatsuit')
  on conflict (user_id, access_key) do update
    set source_reward_id = excluded.source_reward_id,
        granted_at = now(),
        revoked_at = null;

  insert into public.cool_points_ledger (user_id, amount, reason, source, metadata, created_at)
  values (
    v_user, -20600, 'Claimed Black CHASE THE BAG ERROR Sweatsuit',
    'exclusive_reward_redemption',
    jsonb_build_object(
      'reward_id', 'chase_the_bag_error_sweatsuit',
      'claim_id', v_claim_id,
      'size', 'Large',
      'lifetime_access', 'vip_events_gated_content',
      'version', 1
    ), now()
  );

  return jsonb_build_object(
    'ok', true,
    'claim_id', v_claim_id,
    'balance', v_new_balance,
    'size', 'Large',
    'lifetime_access', 'VIP events and gated content'
  );
end;
$function$;

create or replace function public.submit_chase_the_bag_error_shipping(
  p_name text,
  p_email text,
  p_address_line1 text,
  p_address_line2 text,
  p_city text,
  p_region text,
  p_postal_code text,
  p_country text default 'United States'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Login required.'; end if;
  if pg_catalog.length(trim(coalesce(p_name, ''))) not between 2 and 100 then raise exception 'Enter the shipping name.'; end if;
  if trim(coalesce(p_email, '')) !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Enter a valid email.'; end if;
  if pg_catalog.length(trim(coalesce(p_address_line1, ''))) not between 4 and 160 then raise exception 'Enter the shipping address.'; end if;
  if pg_catalog.length(trim(coalesce(p_address_line2, ''))) > 160 then raise exception 'Address line 2 is too long.'; end if;
  if pg_catalog.length(trim(coalesce(p_city, ''))) not between 2 and 100 then raise exception 'Enter the city.'; end if;
  if pg_catalog.length(trim(coalesce(p_region, ''))) not between 2 and 100 then raise exception 'Enter the state or region.'; end if;
  if pg_catalog.length(trim(coalesce(p_postal_code, ''))) not between 3 and 20 then raise exception 'Enter the postal code.'; end if;
  if pg_catalog.length(trim(coalesce(p_country, 'United States'))) not between 2 and 100 then raise exception 'Enter the country.'; end if;

  update public.exclusive_reward_claims
  set shipping_name = trim(p_name),
      shipping_email = lower(trim(p_email)),
      shipping_address_line1 = trim(p_address_line1),
      shipping_address_line2 = nullif(trim(coalesce(p_address_line2, '')), ''),
      shipping_city = trim(p_city),
      shipping_region = trim(p_region),
      shipping_postal_code = trim(p_postal_code),
      shipping_country = trim(coalesce(p_country, 'United States')),
      status = 'shipping_submitted',
      shipping_submitted_at = now()
  where reward_id = 'chase_the_bag_error_sweatsuit'
    and user_id = v_user;

  if not found then raise exception 'Only the verified winner can submit shipping details.'; end if;

  return jsonb_build_object('ok', true, 'status', 'shipping_submitted', 'size', 'Large');
end;
$function$;

create or replace function public.has_my_lifetime_vip_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when (select auth.uid()) is null then false
    else exists (
      select 1
      from public.lifetime_access_grants lag
      where lag.user_id = (select auth.uid())
        and lag.access_key = 'vip_events_gated_content'
        and lag.revoked_at is null
    )
  end;
$function$;

revoke all on function public.get_my_chase_the_bag_error_claim() from public, anon, authenticated;
revoke all on function public.redeem_chase_the_bag_error_reward() from public, anon, authenticated;
revoke all on function public.submit_chase_the_bag_error_shipping(text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.has_my_lifetime_vip_access() from public, anon, authenticated;

grant execute on function public.get_my_chase_the_bag_error_claim() to authenticated;
grant execute on function public.redeem_chase_the_bag_error_reward() to authenticated;
grant execute on function public.submit_chase_the_bag_error_shipping(text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.has_my_lifetime_vip_access() to authenticated;
