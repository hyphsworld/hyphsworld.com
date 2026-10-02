BEGIN;
DO $test$
DECLARE claims jsonb; r record; result jsonb; repeat_result jsonb; balance_before integer; balance_after integer;
v_id uuid; ordinary uuid := '00000000-0000-4000-8000-000000000001';
cases jsonb[] := ARRAY['{}'::jsonb,'{"app_metadata":{}}'::jsonb,
'{"app_metadata":{"creator_admin":false}}'::jsonb,
'{"user_metadata":{"creator_admin":true,"role":"admin"}}'::jsonb];
BEGIN
FOREACH claims IN ARRAY cases LOOP
  PERFORM set_config('request.jwt.claims',(claims||jsonb_build_object('sub',ordinary::text,'role','authenticated'))::text,true);
  IF private.is_creator_admin() IS DISTINCT FROM false THEN RAISE EXCEPTION 'Non-admin allowed'; END IF;
  FOR r IN SELECT unnest(ARRAY[
    'SELECT public.creator_admin_assign_owner($1, '''')',
    'SELECT public.creator_admin_decide_application($1, ''invalid'', '''')',
    'SELECT public.creator_admin_decide_creation($1, ''invalid'', '''')',
    'SELECT public.creator_admin_decide_verification($1, ''invalid'', '''')',
    'SELECT public.creator_admin_publish_creation($1, '''')',
    'SELECT public.creator_admin_set_entitlement($1, ''invalid'', ''invalid'', ''admin'', null)'
  ]) AS statement LOOP
    BEGIN
      EXECUTE r.statement USING ordinary;
      RAISE EXCEPTION 'Admin RPC accepted non-admin';
    EXCEPTION
      WHEN insufficient_privilege THEN NULL;
      WHEN raise_exception THEN
        IF SQLERRM <> 'admin access required' THEN RAISE; END IF;
    END;
  END LOOP;
END LOOP;
PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ordinary::text,'app_metadata',jsonb_build_object('creator_admin',true))::text,true);
IF private.is_creator_admin() IS DISTINCT FROM true THEN RAISE EXCEPTION 'Admin flag rejected'; END IF;
PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ordinary::text,'app_metadata',jsonb_build_object('role','admin'))::text,true);
IF private.is_creator_admin() IS DISTINCT FROM true THEN RAISE EXCEPTION 'Admin role rejected'; END IF;
PERFORM set_config('request.jwt.claims','{}',true);
IF private.is_creator_admin() IS DISTINCT FROM false THEN RAISE EXCEPTION 'Anonymous admin allowed'; END IF;
BEGIN PERFORM public.earn_cool_points(999999,'site_action','test','{}'); RAISE EXCEPTION 'Anonymous earn allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL; END;
IF has_function_privilege('anon','public.earn_cool_points(integer,text,text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous has earn grant'; END IF;
IF NOT has_function_privilege('authenticated','public.earn_cool_points(integer,text,text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Compatibility grant missing'; END IF;
SELECT id INTO v_id FROM auth.users ORDER BY created_at LIMIT 1;
IF v_id IS NULL THEN RAISE EXCEPTION 'No user available for rollback-only reward check'; END IF;
PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_id::text,'role','authenticated','app_metadata','{}'::jsonb)::text,true);
SELECT coalesce(cool_points,points,0) INTO balance_before FROM public.profiles WHERE id=v_id;
BEGIN PERFORM public.earn_cool_points(10,'unverified_reward','test','{}'); RAISE EXCEPTION 'Arbitrary source accepted';
EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
result := public.earn_cool_points(999999,'site_action','test','{"context":"caller-chosen","amount":999999}');
IF (result->>'amount')::integer NOT BETWEEN 0 AND 1 THEN RAISE EXCEPTION 'Client-selected amount credited'; END IF;
repeat_result := public.earn_cool_points(999999,'site_action','test','{"context":"another-context"}');
IF (repeat_result->>'amount')::integer <> 0 THEN RAISE EXCEPTION 'Caller context bypassed cooldown'; END IF;
SELECT coalesce(cool_points,points,0) INTO balance_after FROM public.profiles WHERE id=v_id;
IF balance_after-coalesce(balance_before,0) NOT BETWEEN 0 AND 1 THEN RAISE EXCEPTION 'Unexpected wallet delta'; END IF;
END;$test$;
ROLLBACK;
SELECT 'PASS: 24 admin rejection checks; trusted admin cases; anonymous restrictions; fixed reward amounts; cooldown; wallet rollback' AS result;
