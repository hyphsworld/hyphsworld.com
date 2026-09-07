insert into public.creators
  (creator_number, slug, display_name, headline, bio, location, categories, image_url, profile_url, status, verification_level)
values
  (4, 'young-tez', 'Young Tez', 'Artist • Songwriter • Collaborator',
   'Verified Chicago artist and longtime AMS WEST collaborator building an independent catalog around work, chemistry, and real-life pressure.',
   'Chicago, Illinois', array['artist','songwriter'], 'creator-young-tez-chicago.jpeg', 'creator-young-tez.html', 'published', 'professional')
on conflict (slug) do update set
  creator_number = excluded.creator_number, display_name = excluded.display_name,
  headline = excluded.headline, bio = excluded.bio, location = excluded.location,
  categories = excluded.categories, image_url = excluded.image_url,
  profile_url = excluded.profile_url, status = excluded.status,
  verification_level = excluded.verification_level;

insert into public.creator_entitlements (creator_id, entitlement_key, status, source, metadata)
select c.id, upgrades.entitlement_key, 'active', 'admin', jsonb_build_object('launch', c.slug || '-verified-suite')
from public.creators c
cross join (values ('advanced_analytics'),('priority_submissions'),('expanded_media'),('promotion_boosts'),('direct_booking'),('verified_discovery')) as upgrades(entitlement_key)
where c.slug in ('hyph-life', 'rojasonthebeat', 'young-tez')
on conflict (creator_id, entitlement_key) do update set
  status = 'active', source = 'admin', expires_at = null, metadata = excluded.metadata;
