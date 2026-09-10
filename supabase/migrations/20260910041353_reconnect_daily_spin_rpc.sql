-- Reconnect the Daily Spin to the protected, server-owned Cool Points wallet.

create or replace function public.claim_daily_spin()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_last_spin timestamptz;
  v_points integer;
  v_prize_label text;
  v_new_balance integer;
  v_new_streak integer;
begin
  if v_user_id is null then
    raise exception 'Login required to spin.';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  select p.last_daily_spin_at
  into v_last_spin
  from public.profiles p
  where p.id = v_user_id
  for update;

  if v_last_spin is not null and v_last_spin::date = now()::date then
    select coalesce(p.cool_points, p.points, 0)
    into v_new_balance
    from public.profiles p
    where p.id = v_user_id;

    return jsonb_build_object(
      'ok', false,
      'already_spun', true,
      'message', 'Duck Sauce said you already spun today. Come back tomorrow.',
      'points_awarded', 0,
      'balance', coalesce(v_new_balance, 0),
      'last_spin_at', v_last_spin
    );
  end if;

  v_points := case floor(random() * 10)::int
    when 0 then 5
    when 1 then 10
    when 2 then 15
    when 3 then 20
    when 4 then 25
    when 5 then 30
    when 6 then 40
    when 7 then 50
    when 8 then 75
    else 100
  end;

  v_prize_label := case
    when v_points >= 100 then 'Duck Sauce Bonus'
    when v_points >= 75 then 'Vault Bonus'
    when v_points >= 50 then 'Big Spin Bonus'
    when v_points >= 25 then 'Cool Points Boost'
    else 'Daily Spin Reward'
  end;

  perform set_config('app.server_write', 'on', true);

  update public.profiles p
  set
    points = coalesce(p.points, 0) + v_points,
    lifetime_points = coalesce(p.lifetime_points, 0) + v_points,
    cool_points = coalesce(p.cool_points, 0) + v_points,
    leaderboard_score = coalesce(p.leaderboard_score, 0) + v_points,
    daily_streak_count = case
      when p.last_daily_spin_at is not null
       and p.last_daily_spin_at::date = (now()::date - 1)
      then coalesce(p.daily_streak_count, 0) + 1
      else 1
    end,
    daily_spin_streak = case
      when p.last_daily_spin_at is not null
       and p.last_daily_spin_at::date = (now()::date - 1)
      then coalesce(p.daily_spin_streak, 0) + 1
      else 1
    end,
    last_daily_claim_at = now(),
    last_daily_spin_at = now(),
    updated_at = now()
  where p.id = v_user_id
  returning
    coalesce(p.cool_points, p.points, 0),
    coalesce(p.daily_spin_streak, p.daily_streak_count, 1)
  into v_new_balance, v_new_streak;

  insert into public.daily_spin_logs (user_id, points_awarded, prize_label)
  values (v_user_id, v_points, v_prize_label);

  insert into public.cool_points_ledger (user_id, amount, reason, source, metadata)
  values (
    v_user_id,
    v_points,
    'Daily Spin reward',
    'daily_spin',
    jsonb_build_object('prize_label', v_prize_label, 'streak', v_new_streak)
  );

  insert into public.user_badges (user_id, badge_id)
  values (v_user_id, 'daily_spinner')
  on conflict (user_id, badge_id) do nothing;

  return jsonb_build_object(
    'ok', true,
    'already_spun', false,
    'message', 'Daily Spin paid out. Duck Sauce approves.',
    'points_awarded', v_points,
    'prize_label', v_prize_label,
    'balance', v_new_balance,
    'streak', v_new_streak
  );
end;
$function$;

revoke all on function public.claim_daily_spin() from public, anon;
grant execute on function public.claim_daily_spin() to authenticated;

