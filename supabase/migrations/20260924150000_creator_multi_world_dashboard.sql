begin;
revoke update on table public.creators from authenticated;
grant update (display_name, headline, bio, location, categories, image_url, profile_url) on table public.creators to authenticated;
create or replace function public.get_my_creator_metrics(p_creator_id uuid)
returns table(profile_views bigint, shares bigint, link_clicks bigint, followers bigint, submissions bigint)
language sql stable security definer set search_path = pg_catalog, public
as $$
  with mine as (select id from public.creators where id = p_creator_id and owner_user_id = auth.uid())
  select count(*) filter (where e.event_type = 'profile_view'), count(*) filter (where e.event_type = 'share'), count(*) filter (where e.event_type = 'link_click'),
    (select count(*) from public.creator_follows f join mine m on m.id = f.creator_id),
    (select count(*) from public.creator_submissions s join mine m on m.id = s.creator_id)
  from mine m left join public.creator_events e on e.creator_id = m.id;
$$;
revoke all on function public.get_my_creator_metrics(uuid) from public, anon, authenticated;
grant execute on function public.get_my_creator_metrics(uuid) to authenticated, service_role;
update public.creators
set image_url = 'https://hyphsworld.com/creator-nitti-bo-profile.png', updated_at = now()
where slug = 'nitti-bo';
commit;
