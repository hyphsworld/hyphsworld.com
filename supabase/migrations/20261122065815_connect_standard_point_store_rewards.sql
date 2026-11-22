-- Keep the prices shown on the existing Point Store cards.
insert into public.reward_definitions (reward_key, title, reward_type, point_cost, min_points_required, is_active)
values
  ('level-skip', 'Level Skip Pass', 'unlock', 250, 0, true),
  ('secret-room', 'Secret Room Access', 'unlock', 500, 0, true),
  ('early-drop', 'Early Drop Access', 'unlock', 750, 0, true),
  ('snippet', 'Exclusive Snippet', 'music', 200, 0, true),
  ('preview', 'Unreleased Preview', 'music', 300, 0, true),
  ('download-pack', 'Download Pack', 'music', 600, 0, true),
  ('discount10', '10% Off Code', 'merch', 800, 0, true),
  ('shipping', 'Free Shipping', 'merch', 1200, 0, true),
  ('legend-badge', 'Major Motion Badge', 'badge', 2500, 0, true)
on conflict (reward_key) do nothing;

create or replace function public.claim_reward(p_reward_key text, p_metadata jsonb default '{}'::jsonb)
returns table(points integer, claimed boolean)
language plpgsql security definer set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_reward public.reward_definitions%rowtype;
  v_balance integer;
  v_inserted uuid;
  v_previous_write text := current_setting('app.server_write', true);
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  -- Limited-stock merchandise must go through its stock and fulfillment RPC.
  if p_reward_key in ('all_the_squadds_red_set', 'chase-the-bag-error-sweatsuit') then
    raise exception 'reward_requires_dedicated_claim';
  end if;
  select * into v_reward from public.reward_definitions
    where reward_key = p_reward_key and is_active for share;
  if not found then raise exception 'reward_not_found'; end if;
  if v_reward.point_cost < 0 or v_reward.min_points_required < 0 then
    raise exception 'invalid_reward_configuration';
  end if;
  perform set_config('app.server_write', 'on', true);
  insert into public.profiles(id) values(v_user) on conflict(id) do nothing;
  select p.cool_points into v_balance from public.profiles p
    where p.id = v_user for update;
  if exists (select 1 from public.user_rewards
             where user_id = v_user and reward_key = p_reward_key) then
    perform set_config('app.server_write', coalesce(v_previous_write, ''), true);
    return query select v_balance, true;
    return;
  end if;
  if v_balance < v_reward.min_points_required or v_balance < v_reward.point_cost then
    perform set_config('app.server_write', coalesce(v_previous_write, ''), true);
    return query select v_balance, false;
    return;
  end if;
  -- Reserve ownership before any debit, with the unique constraint as a backstop.
  insert into public.user_rewards(user_id, reward_key, source, metadata)
  values(v_user, p_reward_key, 'claim_reward', coalesce(p_metadata, '{}'::jsonb))
  on conflict(user_id, reward_key) do nothing returning id into v_inserted;
  if v_inserted is not null and v_reward.point_cost > 0 then
    update public.profiles p set
      cool_points = v_balance - v_reward.point_cost,
      points = v_balance - v_reward.point_cost,
      leaderboard_score = greatest(p.leaderboard_score - v_reward.point_cost, 0),
      updated_at = now()
    where p.id = v_user returning p.cool_points into v_balance;
    insert into public.cool_points_ledger(user_id, amount, reason, source, metadata)
    values(v_user, -v_reward.point_cost, 'Reward claim cost', 'reward_claim',
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('reward_key', p_reward_key));
  end if;
  perform set_config('app.server_write', coalesce(v_previous_write, ''), true);
  return query select v_balance, true;
end;
$function$;

revoke all on function public.claim_reward(text, jsonb) from public, anon;
grant execute on function public.claim_reward(text, jsonb) to authenticated, service_role;
