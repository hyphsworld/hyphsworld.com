-- Atomic, idempotent game score submission and Cool Points award.
-- Apply to production only after this pull request is merged and explicitly authorized.

alter table public.game_scores
  add column if not exists submission_id uuid;

create unique index if not exists game_scores_user_game_submission_uidx
  on public.game_scores (user_id, game_key, submission_id)
  where submission_id is not null;

comment on column public.game_scores.submission_id is
  'Client-generated idempotency key. A retry returns the original result without another score or Cool Points award.';

create or replace function public.submit_game_run(
  p_game_key text,
  p_score integer,
  p_points_delta integer,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_game_key text := pg_catalog.lower(pg_catalog.trim(coalesce(p_game_key, '')));
  v_score integer := coalesce(p_score, -1);
  v_mode text := pg_catalog.lower(coalesce(p_metadata->>'mode', 'solo'));
  v_submission_text text := nullif(pg_catalog.trim(coalesce(p_metadata->>'submission_id', '')), '');
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
    where r.room_code = pg_catalog.upper(pg_catalog.trim(coalesce(p_metadata->>'room_code', '')))
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
      v_user_id::text || ':game_run:' || v_game_key || ':' || coalesce(v_submission_id::text, 'legacy'),
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
  else
    select count(*) into v_recent_count
    from public.game_scores gs
    where gs.user_id = v_user_id
      and gs.game_key = v_game_key
      and gs.created_at > now() - interval '15 seconds';
    if v_recent_count > 0 then raise exception 'Game submission cooldown active.'; end if;
  end if;

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

revoke all on function public.submit_game_run(text, integer, integer, jsonb)
  from public, anon;
grant execute on function public.submit_game_run(text, integer, integer, jsonb)
  to authenticated, service_role;
