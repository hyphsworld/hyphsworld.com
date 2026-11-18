-- REVIEW ONLY: apply after isolated SQL/concurrency and signed-in UI verification.
-- Future transactions only: no reconciliation of existing wallet offsets/history.
begin;

alter table public.reward_codes enable row level security;
drop policy if exists reward_codes_select_active on public.reward_codes;
revoke all on table public.reward_codes from public, anon, authenticated;
grant all on table public.reward_codes to service_role;

create or replace function public.redeem_reward_code(p_code text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
  v_reward public.reward_codes%rowtype;
  v_amount integer;
  v_balance integer;
  v_previous_write text := current_setting('app.server_write', true);
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'LOGIN_REQUIRED');
  end if;
  -- Every redemption for a code takes the same lock before checking its cap.
  select * into v_reward from public.reward_codes
  where upper(code) = v_code and is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  order by id limit 1 for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'INVALID_OR_EXPIRED_CODE');
  end if;
  if exists (select 1 from public.reward_code_redemptions
             where user_id = v_user and reward_code_id = v_reward.id) then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_REDEEMED');
  end if;
  if v_reward.max_global_redemptions is not null and
     (select count(*) from public.reward_code_redemptions where reward_code_id = v_reward.id)
       >= v_reward.max_global_redemptions then
    return jsonb_build_object('ok', false, 'error', 'CODE_LIMIT_REACHED');
  end if;
  v_amount := greatest(v_reward.points, 0);
  perform set_config('app.server_write', 'on', true);
  insert into public.profiles(id) values(v_user) on conflict(id) do nothing;
  -- Atomic arithmetic locks the wallet and preserves any preexisting points offset.
  update public.profiles p set
    cool_points = p.cool_points + v_amount,
    points = p.points + v_amount,
    lifetime_points = p.lifetime_points + v_amount,
    leaderboard_score = p.leaderboard_score + v_amount,
    updated_at = now()
  where p.id = v_user returning p.cool_points into v_balance;
  insert into public.reward_code_redemptions(user_id, reward_code_id, code, points_awarded)
  values(v_user, v_reward.id, v_reward.code, v_amount);
  if v_amount > 0 then
    insert into public.cool_points_ledger(user_id, amount, reason, source, metadata)
    values(v_user, v_amount, 'Reward code redeemed', 'reward_code',
      jsonb_build_object('reward_code_id', v_reward.id));
  end if;
  perform set_config('app.server_write', coalesce(v_previous_write, ''), true);
  return jsonb_build_object('ok', true, 'code', v_reward.code,
    'title', v_reward.title, 'reward_type', v_reward.reward_type,
    'points', v_amount, 'hint', v_reward.hint, 'unlock_key', v_reward.unlock_key,
    'award_result', jsonb_build_object('ok', true, 'amount', v_amount,
      'points', v_amount, 'balance', v_balance));
exception
  -- The exception subtransaction rolls wallet, ledger and redemption back together.
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_REDEEMED');
  when others then
    return jsonb_build_object('ok', false, 'error', SQLERRM);
end;
$function$;

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
      cool_points = p.cool_points - v_reward.point_cost,
      points = p.points - v_reward.point_cost,
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

revoke all on function public.redeem_reward_code(text) from public, anon;
revoke all on function public.claim_reward(text, jsonb) from public, anon;
grant execute on function public.redeem_reward_code(text) to authenticated, service_role;
grant execute on function public.claim_reward(text, jsonb) to authenticated, service_role;
commit;
