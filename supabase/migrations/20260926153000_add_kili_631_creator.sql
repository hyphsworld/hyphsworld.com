insert into public.creators
  (creator_number, slug, display_name, headline, bio, location, categories, image_url, profile_url, status, verification_level)
values
  (10, 'kili-631', 'KILI 631', 'Artist • Songwriter • Collaborator',
   'KILI 631 is an artist from Bogotá, Colombia and a Hyph Life collaborator featured on MULA. His Creator World connects Colombian sound, independent music, and an international audience.',
   'Bogotá, Colombia', array['artist','songwriter','latin','colombia','international'], 'creator-kili-631.jpeg', 'creator-kili-631.html', 'published', 'featured')
on conflict (slug) do update set
  creator_number = excluded.creator_number, display_name = excluded.display_name,
  headline = excluded.headline, bio = excluded.bio, location = excluded.location,
  categories = excluded.categories, image_url = excluded.image_url,
  profile_url = excluded.profile_url, status = excluded.status,
  verification_level = excluded.verification_level;
