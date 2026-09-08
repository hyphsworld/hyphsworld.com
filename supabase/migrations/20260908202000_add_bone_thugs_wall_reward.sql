insert into public.reward_definitions (
  reward_key,
  title,
  description,
  reward_type,
  point_cost,
  min_points_required,
  is_active,
  metadata
)
values (
  'bone_thugs_freestyle_video',
  'Hyph Life x Bone Thugs Legendary Freestyle',
  'Unlock the Wall of Fame video featuring Hyph Life with Bizzy Bone and Layzie Bone of Bone Thugs-N-Harmony, including a Bizzy Bone freestyle.',
  'legendary_video',
  0,
  7500,
  true,
  jsonb_build_object(
    'youtube_id', 'jy3mRy51qa8',
    'location', 'wall-of-fame',
    'physical_item', false
  )
)
on conflict (reward_key) do update set
  title = excluded.title,
  description = excluded.description,
  reward_type = excluded.reward_type,
  point_cost = excluded.point_cost,
  min_points_required = excluded.min_points_required,
  is_active = excluded.is_active,
  metadata = excluded.metadata;
