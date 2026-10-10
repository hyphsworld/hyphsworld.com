CREATE OR REPLACE FUNCTION private.is_server_game_room(p_room_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
 SELECT EXISTS(SELECT 1 FROM public.game_rooms r WHERE r.id=p_room_id AND r.game_type IN ('dominos','super_strike'));
$function$;
REVOKE ALL ON FUNCTION private.is_server_game_room(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.is_server_game_room(uuid) TO authenticated,service_role;

DROP POLICY game_state_domino_server_write ON public.game_state;
CREATE POLICY game_state_server_insert ON public.game_state AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (NOT private.is_server_game_room(room_id));
CREATE POLICY game_state_server_update ON public.game_state AS RESTRICTIVE FOR UPDATE TO authenticated
USING (NOT private.is_server_game_room(room_id)) WITH CHECK (NOT private.is_server_game_room(room_id));
CREATE POLICY game_state_server_delete ON public.game_state AS RESTRICTIVE FOR DELETE TO authenticated
USING (NOT private.is_server_game_room(room_id));

DROP POLICY game_players_domino_server_insert ON public.game_players;
DROP POLICY game_players_domino_server_update ON public.game_players;
CREATE POLICY game_players_server_insert ON public.game_players AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (NOT private.is_server_game_room(room_id));
CREATE POLICY game_players_server_update ON public.game_players AS RESTRICTIVE FOR UPDATE TO authenticated
USING (NOT private.is_server_game_room(room_id)) WITH CHECK (NOT private.is_server_game_room(room_id));
CREATE POLICY game_players_server_delete ON public.game_players AS RESTRICTIVE FOR DELETE TO authenticated
USING (NOT private.is_server_game_room(room_id));

DROP POLICY game_rooms_domino_server_insert ON public.game_rooms;
DROP POLICY game_rooms_domino_server_update ON public.game_rooms;
CREATE POLICY game_rooms_server_insert ON public.game_rooms AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (game_type NOT IN ('dominos','super_strike'));
CREATE POLICY game_rooms_server_update ON public.game_rooms AS RESTRICTIVE FOR UPDATE TO authenticated
USING (game_type NOT IN ('dominos','super_strike')) WITH CHECK (game_type NOT IN ('dominos','super_strike'));
CREATE POLICY game_rooms_server_delete ON public.game_rooms AS RESTRICTIVE FOR DELETE TO authenticated
USING (game_type NOT IN ('dominos','super_strike'));