begin;
-- Client profiles remain editable, but money, reward evidence and account state are server-owned.
-- Preserve existing profile upserts. A BEFORE INSERT guard covers protected initial values,
-- and existing-row upserts pass through the UPDATE guard below.
revoke all on public.game_scores, public.cool_points_ledger from public, anon, authenticated;
grant select on public.game_scores to authenticated;
grant select on public.cool_points_ledger to authenticated;
create or replace function public.guard_profile_protected_fields() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if current_setting('app.server_write',true)='on' then return new; end if;
 if (to_jsonb(new)-array['username','display_name','avatar_url','avatar_type','avatar_icon','avatar_style','email','updated_at'])
    is distinct from (to_jsonb(old)-array['username','display_name','avatar_url','avatar_type','avatar_icon','avatar_style','email','updated_at']) then
  raise exception 'Protected profile fields are server-owned.' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function public.guard_profile_protected_fields() from public,anon,authenticated;

create or replace function public.guard_profile_initial_fields() returns trigger
language plpgsql security definer set search_path='' as $$
declare n jsonb:=to_jsonb(new); key text; existing uuid;
begin
 if current_setting('app.server_write',true)='on' or
    (auth.uid() is null and coalesce(auth.jwt()->>'role','') not in('authenticated','anon')) then return new; end if;
 if auth.uid() is distinct from new.id then raise exception 'Profile owner mismatch.' using errcode='42501';end if;
 -- Lock existing identity against delete/reinsert races; conflict UPDATE validates its final row.
 select id into existing from public.profiles where id=new.id for key share;
 if existing is not null then return new;end if;
 foreach key in array array['points','cool_points','lifetime_points','leaderboard_score','daily_streak_count','daily_spin_streak'] loop
  if coalesce((n->>key)::numeric,0)<>0 then raise exception 'Protected initial profile fields are server-owned.' using errcode='42501';end if;
 end loop;
 if coalesce((n->>'level_1_unlocked')::boolean,false) or coalesce((n->>'level_2_unlocked')::boolean,false)
 or coalesce(n->>'account_status','active')<>'active' or coalesce((n->>'multiplier')::numeric,1)<>1
 or coalesce((n->>'vault_level')::integer,1)<>1 or coalesce(n->>'rank_title','Lobby Rookie')<>'Lobby Rookie'
 or n->>'deleted_at' is not null or n->>'vault_access_granted_at' is not null or n->>'last_daily_claim_at' is not null
 or n->>'last_daily_spin_at' is not null or n->>'hyphsworld_id' is not null
 or coalesce(n->>'duck_status','Duck Sauce is watching this account.')<>'Duck Sauce is watching this account.'
 or coalesce(n->>'buck_clearance','Lobby clearance only')<>'Lobby clearance only'
 or abs(extract(epoch from(clock_timestamp()-coalesce(new.created_at,clock_timestamp()))))>300 then
  raise exception 'Protected initial profile fields are server-owned.' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function public.guard_profile_initial_fields() from public,anon,authenticated;
create trigger guard_profile_initial_fields before insert on public.profiles for each row execute function public.guard_profile_initial_fields();

create table if not exists private.se_hustle_crews (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists private.se_hustle_runs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 crew_id uuid not null references private.se_hustle_crews(id) on delete cascade,
 status text not null default 'playing' check(status in ('playing','paused','complete')),
 revision integer not null default 0, created_at timestamptz not null default now(), anchor_at timestamptz not null default now(),
 paused_at timestamptz, elapsed_ms integer not null default 0 check(elapsed_ms>=0),
 cah text not null default 'grand_national', paint text not null default 'factory', cash integer not null default 600 check(cash>=0),
 business integer not null default 0 check(business between 0 and 3), deliveries integer not null default 0,
 job_id uuid, job_started timestamptz, route integer not null default 0, answers integer[] not null default '{}',
 last_job_at timestamptz, receipt jsonb, reward integer not null default 0 check(reward in(0,10)), completed_at timestamptz
);
create unique index if not exists se_hustle_one_active on private.se_hustle_runs(user_id) where status<>'complete';
create index if not exists se_hustle_user_created on private.se_hustle_runs(user_id,created_at desc);
create index if not exists se_hustle_crew on private.se_hustle_runs(crew_id);
create index if not exists se_hustle_crew_owner on private.se_hustle_crews(owner_id);
alter table private.se_hustle_runs enable row level security;
alter table private.se_hustle_crews enable row level security;
revoke all on private.se_hustle_runs,private.se_hustle_crews from public,anon,authenticated;

-- The caller sends commands, never scores, amounts, clocks or completion flags.
create or replace function private.se_quick_hustle(
 p_action text,p_run uuid,p_revision integer,p_cah text,p_paint text,p_step integer,p_choice integer,p_crew uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); r private.se_hustle_runs%rowtype; c uuid; t timestamptz:=clock_timestamp();
 elapsed integer; job_elapsed integer; correct integer:=0; amount integer:=0; balance integer:=0;
 crew jsonb; notice text:=''; i integer; crew_count integer;
begin
 if u is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 or not exists(select 1 from public.profiles where id=u and deleted_at is null and account_status='active') then
  raise exception 'Sign in with an active HYPHSWORLD ID.' using errcode='42501';
 end if;
 if p_action is null or p_action not in('status','start','pause','resume','paint','delivery','answer','buy','build','finish') then
  raise exception 'Unknown hustle action.' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||':quick-hustle',0));
 if p_run is not null then
  select * into r from private.se_hustle_runs where id=p_run and user_id=u for update;
  if r.id is null then raise exception 'Hustle unavailable.' using errcode='42501'; end if;
 else
  select * into r from private.se_hustle_runs where user_id=u order by (status<>'complete') desc,created_at desc limit 1 for update;
 end if;
 if p_action='start' and (r.id is null or r.status='complete') then
  if p_cah is null or p_cah not in('grand_national','corvette','trackhawk','chevelle_70') or p_paint is null or p_paint not in('red','blue','purple','lime','gold','pearl','midnight') then
   raise exception 'Choose an available ride and candy paint.' using errcode='22023';
  end if;
  if (select count(*) from private.se_hustle_runs where user_id=u and created_at>t-interval '1 day')>=10 then
   raise exception 'Ten hustle sessions per day. Continue your empire game.' using errcode='54000';
  end if;
  if p_crew is null then insert into private.se_hustle_crews(owner_id) values(u) returning id into c;
  else
   select id into c from private.se_hustle_crews where id=p_crew and created_at>t-interval '24 hours' for update;
   if c is null then raise exception 'This crew invite expired.' using errcode='22023'; end if;
   if exists(select 1 from private.se_blocks b join private.se_hustle_crews h on h.id=c where
      (b.owner_id=u and b.peer_id=h.owner_id) or (b.peer_id=u and b.owner_id=h.owner_id)) then
    raise exception 'Crew unavailable.' using errcode='42501';
   end if;
   select count(distinct user_id) into crew_count from private.se_hustle_runs where crew_id=c;
   if crew_count>=4 and not exists(select 1 from private.se_hustle_runs where crew_id=c and user_id=u) then
    raise exception 'This crew is full.' using errcode='54000';
   end if;
  end if;
  insert into private.se_hustle_runs(user_id,crew_id,cah,paint) values(u,c,p_cah,p_paint) returning * into r;
 elsif r.id is null then
  return jsonb_build_object('run',null,'balance',(select coalesce(cool_points,points,0) from public.profiles where id=u));
 end if;
 elapsed:=least(180000,r.elapsed_ms+case when r.status='playing' then least(180000,greatest(0,floor(extract(epoch from(t-r.anchor_at))*1000)))::integer else 0 end);
 -- Catch up expired deliveries before taking another command; settlement is derived and replay-safe.
 job_elapsed:=case when r.job_started is null then 0 else least(20000,greatest(0,floor(extract(epoch from(coalesce(r.paused_at,t)-r.job_started))*1000)))::integer end;
 if r.status='playing' and r.job_id is not null and job_elapsed>=20000 then
  for i in 1..3 loop if coalesce(r.answers[i],-1)=mod(r.route+i-1,3) then correct:=correct+1; end if; end loop;
  amount:=case when correct=3 then 80 when correct=2 then 40 else 0 end;
  r.cash:=r.cash+amount; r.deliveries:=r.deliveries+case when amount>0 then 1 else 0 end;
  r.receipt:=jsonb_build_object('id',r.job_id,'cash',amount,'correct',correct,'confirmed',true);
  r.job_id:=null; r.job_started:=null; r.answers:='{}'; r.revision:=r.revision+1;
 end if;
 if p_action not in('status','start') and (p_revision is null or p_revision<>r.revision) then
  notice:='Session updated. Review it before choosing again.';
 elsif r.status='complete' then notice:='This hustle is complete. Its payout is already settled.';
 elsif p_action='pause' and r.status='playing' then
  r.status:='paused';r.elapsed_ms:=elapsed;r.paused_at:=t;r.revision:=r.revision+1;
 elsif p_action='resume' and r.status='paused' then
  if r.job_started is not null then r.job_started:=r.job_started+(t-r.paused_at); end if;
  r.status:='playing';r.anchor_at:=t;r.paused_at:=null;r.revision:=r.revision+1;
 elsif p_action='paint' and r.status='playing' and elapsed<180000 and r.job_id is null then
  if p_paint is null or p_paint not in('red','blue','purple','lime','gold','pearl','midnight') then raise exception 'Invalid paint.' using errcode='22023'; end if;
  r.paint:=p_paint;r.revision:=r.revision+1;
 elsif p_action='delivery' and r.status='playing' and elapsed<=160000 and r.job_id is null then
  if r.last_job_at is not null and t-r.last_job_at<interval '30 seconds' then raise exception 'Dispatch returns after 30 seconds.' using errcode='22023'; end if;
  r.job_id:=gen_random_uuid();r.job_started:=t;r.last_job_at:=t;r.answers:='{}';r.route:=floor(random()*3)::integer;r.revision:=r.revision+1;
 elsif p_action='answer' and r.status='playing' and r.job_id is not null then
  if p_step is null or p_choice is null or p_step not between 0 and 2 or p_choice not between 0 and 2 or
     job_elapsed<p_step*6000 or job_elapsed>=(case when p_step=2 then 20000 else (p_step+1)*6000+1500 end) or
     coalesce(array_length(r.answers,1),0)>p_step then raise exception 'That stop is unavailable.' using errcode='22023'; end if;
  while coalesce(array_length(r.answers,1),0)<p_step loop r.answers:=array_append(r.answers,-1);end loop;
  r.answers:=array_append(r.answers,p_choice);r.revision:=r.revision+1;
 elsif p_action='buy' and r.status='playing' and elapsed<180000 and r.job_id is null and r.business=0 then
  if r.deliveries<1 then raise exception 'Complete a paid delivery before opening your first block.' using errcode='22023'; end if;
  if r.cash<200 then raise exception 'This block costs $200 Quick Cash.' using errcode='22023'; end if;
  r.cash:=r.cash-200;r.business:=1;r.revision:=r.revision+1;
 elsif p_action='build' and r.status='playing' and elapsed<180000 and r.job_id is null and r.business between 1 and 2 then
  if r.cash<100 then raise exception 'This business upgrade costs $100 Quick Cash.' using errcode='22023'; end if;
  r.cash:=r.cash-100;r.business:=r.business+1;r.revision:=r.revision+1;
 elsif p_action not in('status','start','finish') then raise exception 'Finish the current action or resume your hustle.' using errcode='22023';
 end if;
 -- A finished 3-minute active session and observed business are mandatory for CP.
 if r.status<>'complete' and (elapsed>=180000 or (p_action='finish' and notice='')) then
  if r.job_id is not null then
   r.receipt:=jsonb_build_object('id',r.job_id,'cash',0,'correct',0,'confirmed',true);
   r.job_id:=null;r.job_started:=null;r.answers:='{}';
  end if;
  r.status:='complete';r.completed_at:=t;r.elapsed_ms:=elapsed;r.revision:=r.revision+1;
  perform id from public.profiles where id=u for update;
  if elapsed>=180000 and r.deliveries>=1 and r.business>=1 and r.paint<>'factory' and
     not exists(select 1 from private.se_hustle_runs where user_id=u and reward>0 and completed_at>t-interval '24 hours') then
   r.reward:=10;
   perform set_config('app.server_write','on',true);
   update public.profiles set cool_points=coalesce(cool_points,points,0)+10,points=coalesce(cool_points,points,0)+10,
    lifetime_points=coalesce(lifetime_points,0)+10,leaderboard_score=coalesce(leaderboard_score,0)+10,updated_at=t where id=u;
   insert into public.cool_points_ledger(user_id,amount,source,reason,metadata) values(u,10,'street_empire_verified_hustle','Verified Quick Hustle',jsonb_build_object('run_id',r.id,'verified',true));
  end if;
  perform set_config('app.server_write','on',true);
  insert into public.game_scores(user_id,game_key,score,points_delta,submission_id,metadata) values
   (u,'street_empire_quick_hustle',r.business*100+r.deliveries*40+r.cash,r.reward,r.id,jsonb_build_object('verified',true,'mode','quick_hustle','businesses',r.business,'deliveries',r.deliveries));
 end if;
 update private.se_hustle_runs set status=r.status,revision=r.revision,anchor_at=r.anchor_at,paused_at=r.paused_at,elapsed_ms=r.elapsed_ms,
  paint=r.paint,cash=r.cash,business=r.business,deliveries=r.deliveries,job_id=r.job_id,job_started=r.job_started,answers=r.answers,
  route=r.route,last_job_at=r.last_job_at,receipt=r.receipt,reward=r.reward,completed_at=r.completed_at where id=r.id;
 select coalesce(cool_points,points,0) into balance from public.profiles where id=u;
 select coalesce(jsonb_agg(jsonb_build_object('name',name,'deliveries',deliveries,'businesses',businesses)),'[]'::jsonb) into crew from (
  select left(coalesce(nullif(p.display_name,''),p.username,'Player'),24) name,sum(h.deliveries) deliveries,max(h.business) businesses
  from private.se_hustle_runs h join public.profiles p on p.id=h.user_id where h.crew_id=r.crew_id and p.deleted_at is null and p.account_status='active' and
  not exists(select 1 from private.se_blocks b where (b.owner_id=u and b.peer_id=p.id) or (b.peer_id=u and b.owner_id=p.id))
  group by p.id,p.display_name,p.username order by sum(h.deliveries) desc,p.id limit 4
 ) members;
 return jsonb_build_object('run',to_jsonb(r)||jsonb_build_object('active_elapsed_ms',elapsed,'job_elapsed_ms',case when r.job_id is null then 0 else job_elapsed end),
  'balance',balance,'crew',crew,'notice',notice,'server_time',t,'next_dispatch_seconds',greatest(0,30-ceil(extract(epoch from(t-coalesce(r.last_job_at,t-interval '1 minute')))))::integer);
end $$;
revoke all on function private.se_quick_hustle(text,uuid,integer,text,text,integer,integer,uuid) from public,anon,authenticated;
create or replace function public.street_empire_quick_hustle(
 p_action text,p_run uuid default null,p_revision integer default null,p_cah text default null,p_paint text default null,
 p_step integer default null,p_choice integer default null,p_crew uuid default null
) returns jsonb language sql security definer set search_path='' as $$
 select private.se_quick_hustle(p_action,p_run,p_revision,p_cah,p_paint,p_step,p_choice,p_crew)
$$;
revoke all on function public.street_empire_quick_hustle(text,uuid,integer,text,text,integer,integer,uuid) from public,anon;
grant execute on function public.street_empire_quick_hustle(text,uuid,integer,text,text,integer,integer,uuid) to authenticated;

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

  -- Client-reported results remain postable, but cannot credit a wallet.
  v_award := 0;
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
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('points_awarded', v_award, 'atomic', true, 'verified', false, 'player_reported', true),
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

-- Preserve this authenticated owner's legitimate server mutation under the strengthened guard.
CREATE OR REPLACE FUNCTION public.soft_delete_account()
 RETURNS TABLE(deleted boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  perform pg_catalog.set_config('app.server_write','on',true);
  update public.profiles
  set
    username = null,
    display_name = 'Deleted User',
    avatar_url = null,
    avatar_icon = '🚫',
    duck_status = null,
    buck_clearance = null,
    points = 0,
    cool_points = 0,
    lifetime_points = 0,
    leaderboard_score = 0,
    rank_title = 'Deleted Account',
    daily_streak_count = 0,
    last_daily_claim_at = null,
    account_status = 'deleted',
    deleted_at = now(),
    updated_at = now()
  where id = v_user_id;

  insert into public.points_ledger (user_id, amount, reason, metadata)
  values (
    v_user_id,
    0,
    'account_soft_deleted',
    jsonb_build_object('deleted_at', now())
  );

  return query select true;
end;
$function$;

-- Preserve this authenticated owner's legitimate server mutation under the strengthened guard.
CREATE OR REPLACE FUNCTION public.spend_cool_points(p_amount integer, p_source text DEFAULT 'system'::text, p_reason text DEFAULT 'Cool Points spent'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_amount integer := greatest(coalesce(p_amount, 0), 0);
  v_balance integer := 0;
  v_new_balance integer := 0;
begin
  if v_user_id is null then
    raise exception 'Login required.';
  end if;
  if v_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  insert into public.profiles (id, points, cool_points, lifetime_points, leaderboard_score, created_at, updated_at)
  values (v_user_id, 0, 0, 0, 0, now(), now())
  on conflict (id) do nothing;

  select coalesce(p.cool_points, p.points, 0) into v_balance
  from public.profiles p
  where p.id = v_user_id
  for update;

  if coalesce(v_balance, 0) < v_amount then
    return jsonb_build_object('ok', false, 'action', 'spend', 'message', 'Not enough Cool Points.', 'amount', v_amount, 'balance', coalesce(v_balance, 0), 'source', coalesce(p_source, 'system'));
  end if;

  perform pg_catalog.set_config('app.server_write','on',true);
  v_new_balance := v_balance - v_amount;

  update public.profiles p
  set cool_points = v_new_balance,
      points = v_new_balance,
      leaderboard_score = greatest(coalesce(p.leaderboard_score, 0) - v_amount, 0),
      updated_at = now()
  where p.id = v_user_id;

  insert into public.cool_points_ledger (user_id, amount, reason, source, metadata, created_at)
  values (v_user_id, -v_amount, coalesce(p_reason, 'Cool Points spent'), coalesce(p_source, 'system'), coalesce(p_metadata, '{}'::jsonb), now());

  return jsonb_build_object('ok', true, 'action', 'spend', 'amount', v_amount, 'balance', v_new_balance, 'source', coalesce(p_source, 'system'), 'wallet', 'profiles.cool_points', 'ledger', 'cool_points_ledger');
end;
$function$;

commit;
