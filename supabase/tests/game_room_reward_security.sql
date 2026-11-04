BEGIN;
DO $setup$
DECLARE actor uuid; outsider uuid; d uuid; b uuid; s uuid; o uuid; claim_owner uuid;
BEGIN
SELECT u.id INTO actor FROM auth.users u JOIN public.profiles p ON p.id=u.id
WHERE NOT EXISTS(SELECT 1 FROM public.game_scores g WHERE g.user_id=u.id AND g.created_at>now()-interval '1 minute') LIMIT 1;
SELECT id INTO outsider FROM auth.users WHERE id<>actor LIMIT 1;
IF actor IS NULL OR outsider IS NULL THEN RAISE EXCEPTION 'Two test accounts required'; END IF;
INSERT INTO public.game_rooms(game_type,host_id) VALUES('dominos',actor) RETURNING id INTO d;
INSERT INTO public.game_rooms(game_type,host_id) VALUES('dice',actor) RETURNING id INTO b;
INSERT INTO public.game_rooms(game_type,host_id) VALUES('super_strike',actor) RETURNING id INTO s;
INSERT INTO public.game_rooms(game_type,host_id) VALUES('dice',outsider) RETURNING id INTO o;
INSERT INTO public.game_players(room_id,user_id,seat_number) VALUES(d,actor,1),(b,actor,1),(s,actor,1),(o,outsider,1);
INSERT INTO public.game_state(room_id,state,updated_by) VALUES(d,'{}',actor),(b,'{}',actor),(s,'{}',actor),(o,'{}',outsider);
PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor::text,'role','authenticated','app_metadata','{}'::jsonb)::text,true);
PERFORM set_config('task.security_fixture',jsonb_build_object('actor',actor,'domino',d,'dice',b,'bowling',s,'other',o)::text,true);

-- Verify completed prize shipping cannot be downgraded, without retaining changes.
SELECT user_id INTO claim_owner FROM public.exclusive_reward_claims WHERE reward_id='chase_the_bag_error_sweatsuit';
IF claim_owner IS NULL THEN
 claim_owner:=actor;
 INSERT INTO public.exclusive_reward_claims(reward_id,user_id,reward_title,points_spent,item_size,status)
 VALUES('chase_the_bag_error_sweatsuit',actor,'Rollback-only security test',20600,'Large','fulfilled');
ELSE UPDATE public.exclusive_reward_claims SET status='fulfilled' WHERE reward_id='chase_the_bag_error_sweatsuit';
END IF;
PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',claim_owner::text,'role','authenticated')::text,true);
BEGIN
 PERFORM public.submit_chase_the_bag_error_shipping('Test User','test@example.com','123 Test Road','','Test City','CA','90000','United States');
 RAISE EXCEPTION 'Fulfilled shipping accepted overwrite';
EXCEPTION WHEN raise_exception THEN
 IF SQLERRM <> 'Only the verified winner can submit shipping details.' THEN RAISE; END IF;
END;
PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor::text,'role','authenticated','app_metadata','{}'::jsonb)::text,true);
END;$setup$;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE f jsonb := current_setting('task.security_fixture')::jsonb; room uuid; result jsonb; sid uuid:=gen_random_uuid(); rows_changed integer; visible integer;
BEGIN
IF has_function_privilege('authenticated','public.preview_hand_reward(uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Preview grant remains'; END IF;
BEGIN PERFORM public.cpu_hand_action((f->>'other')::uuid,'hit'); RAISE EXCEPTION 'Outsider CPU write accepted';
EXCEPTION WHEN insufficient_privilege THEN NULL; END;
SELECT count(*) INTO visible FROM public.game_state WHERE room_id=(f->>'other')::uuid;
IF visible<>0 THEN RAISE EXCEPTION 'Outsider state readable'; END IF;
result:=public.cpu_hand_action((f->>'dice')::uuid,'hit');
IF (result->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Member CPU action failed'; END IF;
FOREACH room IN ARRAY ARRAY[(f->>'domino')::uuid,(f->>'bowling')::uuid] LOOP
 SELECT count(*) INTO visible FROM public.game_state WHERE room_id=room;
 IF visible<>1 THEN RAISE EXCEPTION 'Member cannot read protected room'; END IF;
 UPDATE public.game_state SET state='{"status":"finished"}' WHERE room_id=room;
 GET DIAGNOSTICS rows_changed=ROW_COUNT;
 IF rows_changed<>0 THEN RAISE EXCEPTION 'Direct protected state write allowed'; END IF;
 UPDATE public.game_players SET score=999 WHERE room_id=room;
 GET DIAGNOSTICS rows_changed=ROW_COUNT;
 IF rows_changed<>0 THEN RAISE EXCEPTION 'Direct protected player write allowed'; END IF;
 UPDATE public.game_rooms SET game_type='dice' WHERE id=room;
 GET DIAGNOSTICS rows_changed=ROW_COUNT;
 IF rows_changed<>0 THEN RAISE EXCEPTION 'Protected room type overwrite allowed'; END IF;
 BEGIN PERFORM public.update_game_state(room,'{}'); RAISE EXCEPTION 'Generic protected state write allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END LOOP;
BEGIN PERFORM public.claim_domino_win((f->>'domino')::uuid); RAISE EXCEPTION 'Empty state win allowed';
EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'WIN_NOT_VERIFIED' THEN RAISE; END IF; END;
result:=public.submit_game_run('01_dice',1,0,jsonb_build_object('room_code',(select room_code from public.game_rooms where id=(f->>'dice')::uuid),'submission_id',sid));
IF (result->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Valid seated submission failed'; END IF;
result:=public.submit_game_run('01_dice',1,0,jsonb_build_object('room_code',(select room_code from public.game_rooms where id=(f->>'dice')::uuid),'submission_id',sid));
IF (result->>'duplicate')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Duplicate did not remain idempotent'; END IF;
BEGIN
 PERFORM public.submit_game_run('01_dice',1,0,jsonb_build_object('room_code',(select room_code from public.game_rooms where id=(f->>'dice')::uuid),'submission_id',gen_random_uuid()));
 RAISE EXCEPTION 'Fresh ID bypassed cooldown';
EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Game submission cooldown active.' THEN RAISE; END IF; END;
result:=public.create_super_strike_room();
IF result IS NULL THEN RAISE EXCEPTION 'Protected bowling creation failed'; END IF;
result:=public.create_domino_room();
IF result IS NULL THEN RAISE EXCEPTION 'Protected domino creation failed'; END IF;
END;$test$;
ROLLBACK;
SELECT 'PASS: authenticated room access, protected direct-write rejection, CPU membership, null win rejection, shipping freeze, cooldown, idempotency, and server game creation; fixtures rolled back' AS result;