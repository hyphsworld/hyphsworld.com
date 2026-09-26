insert into public.creators
  (creator_number, slug, display_name, headline, bio, location, categories, image_url, profile_url, status, verification_level)
values
  (9, 'ykomusic', 'YKOMUSIC', 'Latin Pop • R&B • Artist • Songwriter',
   'YKOMUSIC, formerly known as JCrown, is a Venezuelan Latin Pop and R&B artist building a new international chapter inside HYPHSWORLD.',
   'Venezuela', array['artist','songwriter','latin pop','r&b','venezuela','international'], 'creator-ykomusic.svg', 'creator-ykomusic.html', 'published', 'featured')
on conflict (slug) do update set
  creator_number = excluded.creator_number, display_name = excluded.display_name,
  headline = excluded.headline, bio = excluded.bio, location = excluded.location,
  categories = excluded.categories, image_url = excluded.image_url,
  profile_url = excluded.profile_url, status = excluded.status,
  verification_level = excluded.verification_level;
