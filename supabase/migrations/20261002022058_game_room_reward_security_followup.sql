CREATE OR REPLACE FUNCTION public.cpu_hand_action(p_room_id uuid DEFAULT NULL::uuid, p_player_action text DEFAULT 'stay'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_action text := lower(trim(coalesce(p_player_action, 'stay')));
  v_roll integer;
  v_cpu_action text;
  v_cpu_card text;
  v_cpu_mood text;
  v_cards text[] := array['2♣','3♦','4♥','5♠','6♣','7♦','8♥','9♠','10♣','J♦','Q♥','K♠','A♣'];
  v_meta jsonb;
begin
  if v_user_id is null then
    raise exception 'Login required for CPU action.' using errcode = '28000';
  end if;

  if p_room_id is not null then
    perform 1 from public.game_rooms r
    join public.game_players gp on gp.room_id=r.id
    where r.id=p_room_id and gp.user_id=v_user_id and gp.status <> 'left'
      and r.game_type not in ('dominos','super_strike')
    for share of r, gp;
    if not found then raise exception 'not_room_player_or_protected_game' using errcode='42501'; end if;
  end if;

  if v_action not in ('start_hand','hold','hit','stay') then
    raise exception 'Unsupported player action.' using errcode = '22023';
  end if;

  v_roll := floor(random() * 100)::integer;
  v_cpu_card := v_cards[1 + floor(random() * array_length(v_cards, 1))::integer];

  if v_action = 'hit' then
    if v_roll < 65 then
      v_cpu_action := 'hit';
      v_cpu_mood := 'CPU 01 matched your pressure and drew a card.';
    else
      v_cpu_action := 'stay';
      v_cpu_mood := 'CPU 01 stayed and watched your move.';
    end if;
  elsif v_action = 'hold' then
    if v_roll < 55 then
      v_cpu_action := 'hold';
      v_cpu_mood := 'CPU 01 held position and stared across the felt.';
    else
      v_cpu_action := 'hit';
      v_cpu_mood := 'CPU 01 broke patience and pulled a card.';
    end if;
  elsif v_action = 'stay' then
    if v_roll < 70 then
      v_cpu_action := 'stay';
      v_cpu_mood := 'CPU 01 stayed. The hand is locked in preview mode.';
    else
      v_cpu_action := 'hit';
      v_cpu_mood := 'CPU 01 squeezed one more card before locking.';
    end if;
  else
    v_cpu_action := 'wait';
    v_cpu_mood := 'CPU 01 is waiting for your first move.';
  end if;

  v_meta := jsonb_build_object(
    'source', 'cpu_hand_action_rpc',
    'roomId', p_room_id,
    'playerAction', v_action,
    'cpuAction', v_cpu_action,
    'cpuCard', v_cpu_card,
    'cpuMood', v_cpu_mood
  );

  if p_room_id is not null then
    update public.game_state
    set state = coalesce(state, '{}'::jsonb) || v_meta,
        version = version + 1,
        updated_by = v_user_id,
        updated_at = now()
    where room_id = p_room_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'playerAction', v_action,
    'cpuAction', v_cpu_action,
    'cpuCard', case when v_cpu_action = 'hit' then v_cpu_card else null end,
    'cpuMood', v_cpu_mood
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_domino_win(p_room_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := (select auth.uid());
  v_room public.game_rooms%rowtype;
  v_row public.game_state%rowtype;
  v_score integer;
  v_balance integer;
  v_existing boolean;
begin
  if v_user is null then raise exception 'LOGIN_REQUIRED'; end if;
  select * into v_room from public.game_rooms where id = p_room_id and game_type = 'dominos' for update;
  select * into v_row from public.game_state where room_id = p_room_id for update;
  if v_room.id is null or v_row.room_id is null then raise exception 'TABLE_NOT_FOUND'; end if;
  if v_row.state->>'status' IS DISTINCT FROM 'finished'
     or v_row.state->>'winnerUserId' IS DISTINCT FROM v_user::text
     or not exists (select 1 from public.game_players gp
       where gp.room_id=p_room_id and gp.user_id=v_user and gp.status <> 'left')
  then raise exception 'WIN_NOT_VERIFIED'; end if;

  select exists(select 1 from public.game_scores where game_key = '01_dominos' and metadata->>'room_id' = p_room_id::text) into v_existing;
  if not v_existing then
    v_score := 100 + jsonb_array_length(coalesce(v_row.state->'board', '[]'::jsonb)) * 5;
    perform set_config('app.server_write', 'on', true);
    insert into public.game_scores(user_id, game_key, score, points_delta, metadata)
    values(v_user, '01_dominos', v_score, 100, jsonb_build_object('room_id', p_room_id, 'room_code', v_room.room_code, 'source', '01_domino_room'));

    insert into public.profiles(id, points, cool_points, lifetime_points, leaderboard_score, created_at, updated_at)
    values(v_user, 0, 0, 0, 0, now(), now()) on conflict(id) do nothing;
    update public.profiles
    set points = coalesce(cool_points, points, 0) + 100,
        cool_points = coalesce(cool_points, points, 0) + 100,
        lifetime_points = coalesce(lifetime_points, 0) + 100,
        leaderboard_score = coalesce(leaderboard_score, 0) + 100,
        updated_at = now()
    where id = v_user
    returning cool_points into v_balance;
    insert into public.cool_points_ledger(user_id, amount, reason, source, metadata)
    values(v_user, 100, '01 Domino Room verified win', '01_dominos', jsonb_build_object('room_id', p_room_id, 'room_code', v_room.room_code));
  else
    select coalesce(cool_points, points, 0) into v_balance from public.profiles where id = v_user;
  end if;

  return jsonb_build_object('ok', true, 'already_claimed', v_existing, 'points_awarded', case when v_existing then 0 else 100 end, 'balance', coalesce(v_balance, 0));
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_chase_the_bag_error_shipping(p_name text, p_email text, p_address_line1 text, p_address_line2 text, p_city text, p_region text, p_postal_code text, p_country text DEFAULT 'United States'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    and user_id = v_user
    and status in ('claimed','shipping_submitted');

  if not found then raise exception 'Only the verified winner can submit shipping details.'; end if;

  return jsonb_build_object('ok', true, 'status', 'shipping_submitted', 'size', 'Large');
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_game_state(p_room_id uuid, p_state jsonb)
 RETURNS game_state
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_state public.game_state;
  v_last_update timestamptz;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from public.game_rooms r
    where r.id=p_room_id and r.game_type in ('dominos','super_strike')) then
    raise exception 'Use the protected game action endpoint.' using errcode='42501';
  end if;

  if p_state is null or pg_column_size(p_state) > 65536 then
    raise exception 'invalid_game_state_size';
  end if;

  if not exists (
    select 1 from public.game_players
    where room_id = p_room_id
      and user_id = v_user
      and status <> 'left'
  ) then
    raise exception 'not_room_player';
  end if;

  select updated_at into v_last_update
  from public.game_state
  where room_id = p_room_id
    and updated_by = v_user;

  if v_last_update is not null and v_last_update > now() - interval '1 second' then
    raise exception 'game_state_rate_limited';
  end if;

  insert into public.game_state (room_id, state, updated_by)
  values (p_room_id, coalesce(p_state, '{}'::jsonb), v_user)
  on conflict (room_id) do update
  set state = excluded.state,
      updated_by = excluded.updated_by,
      updated_at = now(),
      version = public.game_state.version + 1
  returning * into v_state;

  return v_state;
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_game_run(p_game_key text, p_score integer, p_points_delta integer, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_game_key text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_game_key, '')));
  v_score integer := coalesce(p_score, -1);
  v_mode text := pg_catalog.lower(coalesce(p_metadata->>'mode', 'solo'));
  v_submission_text text := nullif(pg_catalog.btrim(coalesce(p_metadata->>'submission_id', '')), '');
  v_submission_id uuid;
  v_room public.game_rooms;
  v_existing public.game_scores;
  v_award integer := 0;
  v_balance integer := 0;
  v_recent_count integer := 0;
  v_source text;
  v_reason text;
begin
  if v_user_id is null then
    raise exception 'Login required to submit game run.';
  end if;
  if coalesce(p_points_delta, 0) <> 0 then
    raise exception 'Game submissions cannot choose Cool Points.';
  end if;
  if pg_catalog.octet_length(coalesce(p_metadata, '{}'::jsonb)::text) > 2048 then
    raise exception 'Game metadata is too large.';
  end if;

  if v_submission_text is not null then
    begin
      v_submission_id := v_submission_text::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid submission id.';
    end;
  end if;

  if v_game_key = 'super_strike' then
    if v_score < 0 or v_score > 300 then raise exception 'Invalid Super Strike score.'; end if;
    if v_mode not in ('solo', 'cpu', 'multiplayer') then raise exception 'Invalid Super Strike mode.'; end if;
    v_award := case when v_mode in ('solo', 'cpu') then 3 else 0 end;
    v_source := 'super_strike_complete';
    v_reason := 'Super Strike game complete';
  elsif v_game_key in ('01_dice', '01_blackjack', '01_poker_beta', '01_spades_beta') then
    if v_submission_id is null then raise exception 'Submission id required.'; end if;
    if v_score < 1 or
       (v_game_key = '01_dice' and v_score > 150) or
       (v_game_key = '01_blackjack' and v_score > 210) or
       (v_game_key = '01_poker_beta' and v_score > 300) or
       (v_game_key = '01_spades_beta' and v_score > 400) then
      raise exception 'Invalid table game score.';
    end if;

    select r.* into v_room
    from public.game_rooms r
    where r.room_code = pg_catalog.upper(pg_catalog.btrim(coalesce(p_metadata->>'room_code', '')))
      and r.game_type = case v_game_key
        when '01_dice' then 'dice'
        when '01_blackjack' then 'blackjack'
        when '01_poker_beta' then 'poker'
        when '01_spades_beta' then 'spades'
      end;

    if v_room.id is null or not exists (
      select 1
      from public.game_players gp
      where gp.room_id = v_room.id
        and gp.user_id = v_user_id
        and gp.status <> 'left'
    ) then
      raise exception 'You must be seated at this table to submit.';
    end if;

    v_award := case v_game_key
      when '01_dice' then 75
      when '01_blackjack' then 100
      when '01_poker_beta' then 125
      when '01_spades_beta' then 125
    end;
    v_source := 'table_game_complete';
    v_reason := case v_game_key
      when '01_dice' then 'Craps table score'
      when '01_blackjack' then 'Blackjack table score'
      when '01_poker_beta' then 'Poker table score'
      when '01_spades_beta' then 'Spades table score'
    end;
  else
    raise exception 'Unsupported game submission.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_user_id::text || ':game_run:' || v_game_key,
      0
    )
  );

  if v_submission_id is not null then
    select gs.* into v_existing
    from public.game_scores gs
    where gs.user_id = v_user_id
      and gs.game_key = v_game_key
      and gs.submission_id = v_submission_id;

    if v_existing.id is not null then
      select coalesce(p.cool_points, p.points, 0) into v_balance
      from public.profiles p where p.id = v_user_id;
      return jsonb_build_object(
        'ok', true, 'duplicate', true, 'submission_id', v_submission_id,
        'score_id', v_existing.id, 'game_key', v_existing.game_key,
        'score', v_existing.score, 'points_delta', v_existing.points_delta,
        'balance', v_balance, 'wallet', 'profiles.cool_points',
        'ledger', 'cool_points_ledger'
      );
    end if;
  end if;

  -- Every new submission observes the cooldown; duplicate IDs still return above.
    select count(*) into v_recent_count
    from public.game_scores gs
    where gs.user_id = v_user_id
      and gs.game_key = v_game_key
      and gs.created_at > now() - interval '15 seconds';
    if v_recent_count > 0 then raise exception 'Game submission cooldown active.'; end if;

  insert into public.profiles (
    id, points, cool_points, lifetime_points, leaderboard_score, created_at, updated_at
  ) values (
    v_user_id, 0, 0, 0, 0, now(), now()
  ) on conflict (id) do nothing;

  perform set_config('app.server_write', 'on', true);

  if v_award > 0 then
    update public.profiles p
    set cool_points = coalesce(p.cool_points, p.points, 0) + v_award,
        points = coalesce(p.cool_points, p.points, 0) + v_award,
        lifetime_points = coalesce(p.lifetime_points, 0) + v_award,
        leaderboard_score = coalesce(p.leaderboard_score, 0) + v_award,
        updated_at = now()
    where p.id = v_user_id
    returning coalesce(p.cool_points, p.points, 0) into v_balance;

    insert into public.cool_points_ledger (
      user_id, amount, reason, source, metadata, created_at
    ) values (
      v_user_id, v_award, v_reason, v_source,
      jsonb_build_object(
        'context', coalesce(v_submission_id::text, ''),
        'submission_id', v_submission_id,
        'game_key', v_game_key,
        'room_code', p_metadata->>'room_code',
        'version', 3
      ),
      now()
    );
  else
    select coalesce(p.cool_points, p.points, 0) into v_balance
    from public.profiles p where p.id = v_user_id;
  end if;

  insert into public.game_scores (
    user_id, game_key, score, points_delta, metadata, submission_id, created_at
  ) values (
    v_user_id, v_game_key, v_score, v_award,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('points_awarded', v_award, 'atomic', true),
    v_submission_id, now()
  )
  returning * into v_existing;

  return jsonb_build_object(
    'ok', true, 'duplicate', false, 'submission_id', v_submission_id,
    'score_id', v_existing.id, 'game_key', v_game_key,
    'score', v_score, 'points_delta', v_award, 'balance', v_balance,
    'wallet', 'profiles.cool_points', 'ledger', 'cool_points_ledger'
  );
end;
$function$;

-- Unused browser preview RPC awarded points without completion proof and wrote arbitrary rooms.
REVOKE ALL ON FUNCTION public.preview_hand_reward(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.preview_hand_reward(uuid,text) TO service_role;