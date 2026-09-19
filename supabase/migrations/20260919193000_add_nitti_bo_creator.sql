insert into public.creators
  (creator_number, slug, display_name, headline, bio, location, categories, image_url, profile_url, status, verification_level)
values
  (6, 'nitti-bo', 'NITTI BO', 'GTA Server Developer • Web Designer • Artist • Producer',
   'NITTI BO, also known as Dr. Muy Bueno, is a multidisciplinary creator from the Bronx, New York and one half of 01 BOYS. He builds GTA server experiences, websites, music, and production-driven creative worlds.',
   'Bronx, New York', array['developer','web designer','artist','producer','01 boys'], 'creator-nitti-bo-hero.jpeg', 'creator-nitti-bo.html', 'draft', 'featured')
on conflict (slug) do update set
  creator_number = excluded.creator_number, display_name = excluded.display_name,
  headline = excluded.headline, bio = excluded.bio, location = excluded.location,
  categories = excluded.categories, image_url = excluded.image_url,
  profile_url = excluded.profile_url, status = excluded.status,
  verification_level = excluded.verification_level;
