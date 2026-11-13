-- Synthetic rows only, run after fixtures/atomic_rewards_schema.sql + candidate.
begin;
insert into auth.users values ('00000000-0000-4000-8000-000000000001');
insert into public.profiles(id,points,cool_points,lifetime_points,leaderboard_score)
values('00000000-0000-4000-8000-000000000001',130,100,200,200);
insert into public.reward_codes(code,title,points,hint,unlock_key,max_global_redemptions)
values('SYNTHETIC25','Fixture',25,'Fixture hint','fixture_unlock',1);
insert into public.reward_codes(code,title,points,ends_at)
values('EXPIRED','Fixture',25,now()-interval '1 day');
insert into public.reward_codes(code,title,points,starts_at)
values('FUTURE','Fixture',25,now()+interval '1 day');
insert into public.reward_codes(code,title,points,is_active)
values('INACTIVE','Fixture',25,false);
insert into public.reward_codes(code,title,points) values('ZERO','Fixture',0);
insert into public.reward_definitions(reward_key,title,point_cost,min_points_required)
values('paid','Fixture',30,50),('free','Fixture',0,0),('expensive','Fixture',1000,0);
do $test$
declare r jsonb; p public.profiles; c record;
begin
 if has_table_privilege('anon','public.reward_codes','select') or
    has_any_column_privilege('authenticated','public.reward_codes','select') then
   raise exception 'Codes discoverable'; end if;
 if not has_table_privilege('service_role','public.reward_codes','select') then
   raise exception 'Admin access lost'; end if;
 if has_function_privilege('anon','public.redeem_reward_code(text)','execute') or
    has_function_privilege('anon','public.claim_reward(text,jsonb)','execute') then
   raise exception 'Anonymous RPC access'; end if;
 r:=public.redeem_reward_code('SYNTHETIC25');
 if r->>'error'<>'LOGIN_REQUIRED' then raise exception 'Anonymous redemption'; end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 r:=public.redeem_reward_code('synthetic-25');
 if r->>'ok'<>'true' or (r->>'points')::int<>25 or r->>'hint'<>'Fixture hint'
 or r->>'unlock_key'<>'fixture_unlock' or (r->'award_result'->>'balance')::int<>125 then
   raise exception 'Legitimate redemption contract: %',r; end if;
 if current_setting('app.server_write',true)='on' then raise exception 'Write flag leaked'; end if;
 r:=public.redeem_reward_code('SYNTHETIC25');
 if r->>'error'<>'ALREADY_REDEEMED' then raise exception 'Duplicate at cap: %',r; end if;
 foreach r in array array[public.redeem_reward_code('INVALID'),public.redeem_reward_code('EXPIRED'),
 public.redeem_reward_code('FUTURE'),public.redeem_reward_code('INACTIVE')] loop
   if r->>'error'<>'INVALID_OR_EXPIRED_CODE' then raise exception 'Invalid code accepted'; end if;
 end loop;
 r:=public.redeem_reward_code('ZERO');
 if r->>'ok'<>'true' or (r->>'points')::int<>0 then raise exception 'Zero reward broken'; end if;
 select * into c from public.claim_reward('paid','{"reward_key":"forged"}');
 if not c.claimed or c.points<>95 then raise exception 'Paid claim broken'; end if;
 select * into c from public.claim_reward('paid');
 if not c.claimed or c.points<>95 then raise exception 'Duplicate charged'; end if;
 select * into c from public.claim_reward('free');
 if not c.claimed or c.points<>95 then raise exception 'Free claim broken'; end if;
 select * into c from public.claim_reward('expensive');
 if c.claimed or c.points<>95 then raise exception 'Overdraft allowed'; end if;
 select * into p from public.profiles where id=auth.uid();
 if p.cool_points<>95 or p.points<>125 or p.lifetime_points<>225 or p.leaderboard_score<>195 then
   raise exception 'Wallet/history mismatch'; end if;
 if (select count(*) from public.cool_points_ledger)<>2 or
    (select sum(amount) from public.cool_points_ledger)<>-5 or
    (select count(*) from public.user_rewards)<>2 or
    (select count(*) from public.reward_code_redemptions)<>2 then
   raise exception 'Ledger/state mismatch'; end if;
 if (select metadata->>'reward_key' from public.cool_points_ledger where amount=-30)<>'paid' then
   raise exception 'Caller replaced audit identity'; end if;
 -- A wallet failure must roll back the inserted reward too.
 begin
   update public.profiles set cool_points=999 where id=auth.uid();
   raise exception 'Profile guard bypass';
 exception when insufficient_privilege then null; end;
end;
$test$;
-- Exercise actual restricted-role execution, not merely an owner calling RPC.
set local role authenticated;
select public.redeem_reward_code('INVALID');
do $$ begin
 begin perform code from public.reward_codes; raise exception 'Direct discovery allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into public.reward_codes(code,title,points) values('ROLLBACK','Fixture',25);
insert into public.reward_definitions(reward_key,title,point_cost) values('rollback','Fixture',10);
create function public.test_reject_ledger() returns trigger language plpgsql as $$
begin raise exception 'synthetic_ledger_failure'; end $$;
create trigger reject_ledger before insert on public.cool_points_ledger
for each row execute function public.test_reject_ledger();
do $$ declare r jsonb; begin
 r:=public.redeem_reward_code('ROLLBACK');
 if r->>'ok'<>'false' then raise exception 'Ledger failure credited'; end if;
 begin
   perform public.claim_reward('rollback');
   raise exception 'Ledger failure claimed';
 exception when raise_exception then
   if SQLERRM<>'synthetic_ledger_failure' then raise; end if;
 end;
 if exists(select 1 from public.reward_code_redemptions where code='ROLLBACK') or
    exists(select 1 from public.user_rewards where reward_key='rollback') or
    (select cool_points from public.profiles where id=auth.uid())<>95 then
   raise exception 'Partial transaction survived ledger failure'; end if;
 if current_setting('app.server_write',true)='on' then raise exception 'Failed write flag leaked'; end if;
end $$;
rollback;
select 'PASS: contracts, duplicates, caps, invalid codes, wallet offsets, ledger and privileges';
