-- Permanent Super Strike cosmetic ownership and a fixed-price Cool Points purchase.
-- Apply to production before enabling the Graffiti Bomb purchase button.

create table if not exists public.super_strike_skin_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  skin_id text not null,
  points_spent integer not null default 0 check (points_spent >= 0),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, skin_id),
  constraint super_strike_skin_unlocks_catalog_check
    check (skin_id in ('graffiti_bomb'))
);

alter table public.super_strike_skin_unlocks enable row level security;

revoke all on table public.super_strike_skin_unlocks from public, anon, authenticated;
grant select on table public.super_strike_skin_unlocks to authenticated, service_role;

drop policy if exists "Players read own Super Strike skins" on public.super_strike_skin_unlocks;
create policy "Players read own Super Strike skins"
on public.super_strike_skin_unlocks
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.purchase_super_strike_skin(p_skin_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_skin_id text := lower(trim(coalesce(p_skin_id, '')));
  v_cost integer;
  v_balance integer;
begin
  if v_user_id is null then
    raise exception 'Login required to purchase a ball skin.';
  end if;

  select price into v_cost
  from (values ('graffiti_bomb'::text, 1500::integer)) as catalog(skin_id, price)
  where skin_id = v_skin_id;

  if v_cost is null then
    raise exception 'Unknown Super Strike ball skin.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':super_strike_skin:' || v_skin_id, 0)
  );

  if exists (
    select 1 from public.super_strike_skin_unlocks u
    where u.user_id = v_user_id and u.skin_id = v_skin_id
  ) then
    select coalesce(p.cool_points, p.points, 0)
      into v_balance
    from public.profiles p
    where p.id = v_user_id;

    return jsonb_build_object(
      'ok', true, 'skin_id', v_skin_id, 'points_spent', 0,
      'balance', coalesce(v_balance, 0), 'already_owned', true
    );
  end if;

  select coalesce(p.cool_points, p.points, 0)
    into v_balance
  from public.profiles p
  where p.id = v_user_id
  for update;

  if not found then
    raise exception 'Player profile not found.';
  end if;

  if v_balance < v_cost then
    raise exception 'You need 1,500 Cool Points to unlock Graffiti Bomb.';
  end if;

  perform pg_catalog.set_config('app.server_write', 'on', true);

  update public.profiles p
  set cool_points = v_balance - v_cost,
      points = v_balance - v_cost,
      updated_at = now()
  where p.id = v_user_id
  returning p.cool_points into v_balance;

  insert into public.super_strike_skin_unlocks (user_id, skin_id, points_spent)
  values (v_user_id, v_skin_id, v_cost);

  insert into public.cool_points_ledger (
    user_id, amount, reason, source, metadata, created_at
  ) values (
    v_user_id, -v_cost, 'Unlocked Super Strike Graffiti Bomb',
    'super_strike_skin_purchase',
    jsonb_build_object('skin_id', v_skin_id, 'price', v_cost, 'version', 1),
    now()
  );

  return jsonb_build_object(
    'ok', true, 'skin_id', v_skin_id, 'points_spent', v_cost,
    'balance', v_balance, 'already_owned', false
  );
end;
$function$;

revoke all on function public.purchase_super_strike_skin(text)
  from public, anon;
grant execute on function public.purchase_super_strike_skin(text)
  to authenticated, service_role;
