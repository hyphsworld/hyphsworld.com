-- Production reconciliation: this obsolete NOT VALID constraint still rejected
-- new Super Strike rooms even though game_rooms_game_type_check already allows
-- and validates the same game types plus super_strike.
alter table public.game_rooms
  drop constraint if exists game_rooms_game_type_guard;
