CREATE OR REPLACE FUNCTION private.is_creator_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    COALESCE(auth.jwt()->'app_metadata'->>'creator_admin' = 'true', false)
    OR COALESCE(auth.jwt()->'app_metadata'->>'role' = 'admin', false)
  );
$function$;

DO $block$
DECLARE r record; definition text; fixed integer := 0;
BEGIN
  FOR r IN
    SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (
      'creator_admin_assign_owner','creator_admin_decide_application',
      'creator_admin_decide_creation','creator_admin_decide_verification',
      'creator_admin_publish_creation','creator_admin_set_entitlement')
  LOOP
    definition := pg_get_functiondef(r.oid);
    IF position('if not private.is_creator_admin() then' in definition)=0 THEN
      RAISE EXCEPTION 'Unexpected creator admin guard; migration aborted';
    END IF;
    EXECUTE replace(definition, 'if not private.is_creator_admin() then',
      'if private.is_creator_admin() IS NOT TRUE then');
    fixed := fixed + 1;
  END LOOP;
  IF fixed <> 6 THEN RAISE EXCEPTION 'Expected six creator admin functions, found %',fixed; END IF;
END;
$block$;