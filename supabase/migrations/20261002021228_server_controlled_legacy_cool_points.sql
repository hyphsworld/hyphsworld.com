CREATE OR REPLACE FUNCTION public.earn_cool_points(
  p_amount integer, p_source text DEFAULT 'system',
  p_reason text DEFAULT 'Cool Points earned', p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_action text; v_source text := lower(trim(coalesce(p_source,'')));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login required.' USING ERRCODE='42501'; END IF;
  IF coalesce(p_amount,0) <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero.' USING ERRCODE='22023'; END IF;
  -- Compatibility only: never use client amounts or metadata to credit a wallet.
  v_action := CASE v_source
    WHEN 'site_action' THEN 'page_view'
    WHEN 'page_view' THEN 'page_view'
    WHEN 'daily_visit' THEN 'session_start'
    WHEN 'session_start' THEN 'session_start'
    WHEN 'navigation' THEN 'navigation'
    WHEN 'music_play' THEN 'music_start'
    WHEN 'music_start' THEN 'music_start'
    WHEN 'casino_play' THEN 'game_open'
    WHEN 'game_open' THEN 'game_open'
    WHEN 'profile_update' THEN 'profile_update'
    WHEN 'vault_unlock' THEN 'vault_visit'
    WHEN 'vault_visit' THEN 'vault_visit'
    WHEN 'shop_visit' THEN 'shop_visit'
    WHEN 'social_visit' THEN 'social_visit'
    WHEN 'share_action' THEN 'share'
    WHEN 'share' THEN 'share'
    WHEN 'helper_interaction' THEN 'helper_interaction'
    ELSE NULL END;
  IF v_action IS NULL THEN
    RAISE EXCEPTION 'This reward requires its verified reward endpoint.' USING ERRCODE='22023';
  END IF;
  -- Fixed context prevents caller-controlled cooldown buckets.
  RETURN public.award_engagement_action(v_action, 'legacy_earn_cool_points');
END;
$function$;
REVOKE ALL ON FUNCTION public.earn_cool_points(integer,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.earn_cool_points(integer,text,text,jsonb) TO authenticated,service_role;