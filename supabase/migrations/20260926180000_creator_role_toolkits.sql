-- Reusable Creator World role loadouts.
-- Intentionally read-only to browser clients; server migrations own the catalog.

create table if not exists public.creator_role_catalog (
  role_key text primary key check (role_key ~ '^[a-z0-9_]{2,40}$'),
  label text not null check (char_length(label) between 2 and 60),
  short_mark text not null check (char_length(short_mark) between 1 and 8),
  description text not null check (char_length(description) between 10 and 240),
  aliases text[] not null default '{}',
  accent text not null default '#46ff67' check (accent ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order smallint not null default 100,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_role_tools (
  role_key text not null references public.creator_role_catalog(role_key) on delete cascade,
  tool_key text not null check (tool_key ~ '^[a-z0-9_]{2,60}$'),
  title text not null check (char_length(title) between 2 and 80),
  summary text not null check (char_length(summary) between 10 and 240),
  route text not null check (route ~ '^creator-dashboard\.html'),
  action_label text not null check (char_length(action_label) between 2 and 30),
  sort_order smallint not null default 100,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role_key, tool_key)
);

create index if not exists creator_role_catalog_enabled_order_idx
  on public.creator_role_catalog (enabled, sort_order, role_key);

create index if not exists creator_role_tools_enabled_order_idx
  on public.creator_role_tools (role_key, enabled, sort_order, tool_key);

alter table public.creator_role_catalog enable row level security;
alter table public.creator_role_tools enable row level security;

revoke all on table public.creator_role_catalog from anon, authenticated;
revoke all on table public.creator_role_tools from anon, authenticated;
grant select on table public.creator_role_catalog to authenticated;
grant select on table public.creator_role_tools to authenticated;

drop policy if exists "authenticated read creator role catalog" on public.creator_role_catalog;
create policy "authenticated read creator role catalog"
  on public.creator_role_catalog for select
  to authenticated
  using (enabled = true);

drop policy if exists "authenticated read creator role tools" on public.creator_role_tools;
create policy "authenticated read creator role tools"
  on public.creator_role_tools for select
  to authenticated
  using (
    enabled = true
    and exists (
      select 1
      from public.creator_role_catalog role
      where role.role_key = creator_role_tools.role_key
        and role.enabled = true
    )
  );

insert into public.creator_role_catalog
  (role_key,label,short_mark,description,aliases,accent,sort_order,enabled)
values
  ('recording_artist','Recording Artist','MIC','Release music, present the brand, and turn attention into opportunities.',array['artist','rapper','songwriter','performer','latin artist','independent entertainer' ]::text[],'#ff4dbe',10,true),
  ('producer','Producer','BEAT','Organize beats, placements, collaborations, and performance data.',array['producer','beatmaker','audio engineer','engineer' ]::text[],'#a970ff',20,true),
  ('skater','Skater','SK8','Build a trick reel, document progression, and attract sponsors.',array['skater','skateboarder','skateboarding' ]::text[],'#34eaff',30,true),
  ('baseball_player','Baseball Player','BALL','Keep highlights, player identity, scouting contacts, and progress together.',array['baseball','baseball player','youth athlete','all-american' ]::text[],'#ff7657',40,true),
  ('dancer','Dancer','MOVE','Present reels, choreography, auditions, and booking opportunities.',array['dancer','dance','choreographer','choreography' ]::text[],'#ffdb4d',50,true),
  ('dj_host','DJ / Host','LIVE','Manage shows, mixes, guests, and audience momentum.',array['dj','radio','host','radio personality','podcaster' ]::text[],'#46ff67',60,true),
  ('developer','Developer','DEV','Show projects, organize builds, and receive collaboration requests.',array['developer','web designer','website developer','game designer' ]::text[],'#34eaff',70,true),
  ('coach_mentor','Coach / Mentor','COACH','Share programs, training media, player progress, and requests.',array['coach','mentor','trainer' ]::text[],'#ff9d3b',80,true),
  ('designer','Designer','DESIGN','Build collections, present work, and manage commissions.',array['designer','creative director','fashion','artwork','visual artist' ]::text[],'#ff4dbe',90,true),
  ('filmmaker','Filmmaker','FILM','Present reels, productions, pitches, and casting opportunities.',array['filmmaker','director','videographer','photographer' ]::text[],'#e6edf5',100,true),
  ('gamer','Gamer / Streamer','PLAY','Publish clips, organize highlights, and grow teams or partnerships.',array['gamer','streamer','esports','gaming' ]::text[],'#8cff4a',110,true),
  ('entrepreneur','Entrepreneur','BIZ','Present products, offers, brand identity, and partnership opportunities.',array['entrepreneur','ceo','founder','brand owner','business' ]::text[],'#ffd64a',120,true),
  ('original_creator','Original Creator','HW','A universal toolkit for every approved Creator World.',array[ ]::text[],'#46ff67',999,true)
on conflict (role_key) do update set
  label = excluded.label,
  short_mark = excluded.short_mark,
  description = excluded.description,
  aliases = excluded.aliases,
  accent = excluded.accent,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled,
  updated_at = now();

insert into public.creator_role_tools
  (role_key,tool_key,title,summary,route,action_label,sort_order,enabled)
values
  ('recording_artist','track_studio','Track Studio','Upload a private song or demo.','creator-dashboard.html?create=music#create','CREATE MUSIC',10,true),
  ('recording_artist','release_vault','Release Vault','Organize masters, demos, and release assets.','creator-dashboard.html#library','OPEN LIBRARY',20,true),
  ('recording_artist','feature_requests','Feature Requests','Review collaboration and verse opportunities.','creator-dashboard.html#inbox','OPEN INBOX',30,true),
  ('recording_artist','artist_performance','Artist Performance','Track audience and Creator World activity.','creator-dashboard.html#overview','VIEW NUMBERS',40,true),
  ('producer','beat_studio','Beat Studio','Upload beats and private production work.','creator-dashboard.html?create=music#create','CREATE AUDIO',10,true),
  ('producer','beat_vault','Beat Vault','Keep beats, packs, and placements organized.','creator-dashboard.html#library','OPEN LIBRARY',20,true),
  ('producer','placement_requests','Placement Requests','Review artist and licensing opportunities.','creator-dashboard.html#inbox','OPEN INBOX',30,true),
  ('producer','producer_analytics','Producer Analytics','Track profile, audience, and request activity.','creator-dashboard.html#overview','VIEW NUMBERS',40,true),
  ('skater','clip_studio','Clip Studio','Upload a private trick or session clip.','creator-dashboard.html?create=video#create','CREATE VIDEO',10,true),
  ('skater','trick_reel','Trick Reel','Organize clips into a sponsor-ready body of work.','creator-dashboard.html#library','OPEN LIBRARY',20,true),
  ('skater','sponsor_profile','Sponsor Profile','Keep your identity, story, and links current.','creator-dashboard.html#profile','EDIT PROFILE',30,true),
  ('skater','session_requests','Session Requests','Receive collaborations, demos, and sponsor interest.','creator-dashboard.html#inbox','OPEN INBOX',40,true),
  ('baseball_player','highlight_studio','Highlight Studio','Upload game clips and training video privately.','creator-dashboard.html?create=video#create','CREATE VIDEO',10,true),
  ('baseball_player','player_card','Player Card','Maintain position, story, location, and identity.','creator-dashboard.html#profile','EDIT PROFILE',20,true),
  ('baseball_player','scout_inbox','Scout Inbox','Keep serious coach, camp, and scout interest together.','creator-dashboard.html#inbox','OPEN INBOX',30,true),
  ('baseball_player','season_progress','Season Progress','See Creator World attention and opportunity signals.','creator-dashboard.html#overview','VIEW NUMBERS',40,true),
  ('dancer','reel_studio','Reel Studio','Upload audition, rehearsal, or performance video.','creator-dashboard.html?create=video#create','CREATE VIDEO',10,true),
  ('dancer','choreography_vault','Choreography Vault','Organize routines, reels, and visual work.','creator-dashboard.html#library','OPEN LIBRARY',20,true),
  ('dancer','audition_profile','Audition Profile','Keep your style, credits, and links presentation-ready.','creator-dashboard.html#profile','EDIT PROFILE',30,true),
  ('dancer','booking_inbox','Booking Inbox','Receive auditions, bookings, and collaborations.','creator-dashboard.html#inbox','OPEN INBOX',40,true),
  ('dj_host','show_upload','Show / Mix Upload','Upload mixes, episodes, or show assets.','creator-dashboard.html?create=music#create','CREATE AUDIO',10,true),
  ('dj_host','show_archive','Show Archive','Organize mixes, episodes, promos, and artwork.','creator-dashboard.html#library','OPEN LIBRARY',20,true),
  ('dj_host','guest_booking','Guest Booking','Manage guest, interview, and appearance requests.','creator-dashboard.html#inbox','OPEN INBOX',30,true),
  ('dj_host','audience_insights','Audience Insights','Track profile, follower, and link activity.','creator-dashboard.html#overview','VIEW NUMBERS',40,true),
  ('developer','project_drop','Project Drop','Upload a private build, deck, or World update.','creator-dashboard.html?create=world#create','CREATE PROJECT',10,true),
  ('developer','build_library','Build Library','Organize releases, previews, and project files.','creator-dashboard.html#library','OPEN LIBRARY',20,true),
  ('developer','project_profile','Project Profile','Present capabilities, projects, and technical identity.','creator-dashboard.html#profile','EDIT PROFILE',30,true),
  ('developer','collaboration_inbox','Collaboration Inbox','Receive product, game, and website opportunities.','creator-dashboard.html#inbox','OPEN INBOX',40,true),
  ('coach_mentor','training_drop','Training Drop','Upload private drills, sessions, and teaching media.','creator-dashboard.html?create=video#create','CREATE VIDEO',10,true),
  ('coach_mentor','program_library','Program Library','Organize programs, plans, and player resources.','creator-dashboard.html#library','OPEN LIBRARY',20,true),
  ('coach_mentor','coach_profile','Coach Profile','Present experience, focus, and program identity.','creator-dashboard.html#profile','EDIT PROFILE',30,true),
  ('coach_mentor','player_requests','Player Requests','Manage training, mentorship, and team inquiries.','creator-dashboard.html#inbox','OPEN INBOX',40,true),
  ('designer','portfolio_drop','Portfolio Drop','Upload artwork, fashion, or design work privately.','creator-dashboard.html?create=artwork#create','CREATE ART',10,true),
  ('designer','collection_vault','Collection Vault','Organize collections, concepts, and client work.','creator-dashboard.html#library','OPEN LIBRARY',20,true),
  ('designer','commission_inbox','Commission Inbox','Receive serious design and commission requests.','creator-dashboard.html#inbox','OPEN INBOX',30,true),
  ('designer','design_profile','Design Profile','Present your visual identity and approved links.','creator-dashboard.html#profile','EDIT PROFILE',40,true),
  ('filmmaker','reel_upload','Reel Upload','Upload private scenes, reels, and trailers.','creator-dashboard.html?create=video#create','CREATE VIDEO',10,true),
  ('filmmaker','production_library','Production Library','Organize films, cuts, treatments, and artwork.','creator-dashboard.html#library','OPEN LIBRARY',20,true),
  ('filmmaker','pitch_profile','Pitch Profile','Present your reel, roles, and production identity.','creator-dashboard.html#profile','EDIT PROFILE',30,true),
  ('filmmaker','casting_inbox','Casting / Crew Inbox','Receive casting, crew, and production opportunities.','creator-dashboard.html#inbox','OPEN INBOX',40,true),
  ('gamer','clip_upload','Clip Upload','Upload a private highlight or gameplay moment.','creator-dashboard.html?create=video#create','CREATE VIDEO',10,true),
  ('gamer','highlight_vault','Highlight Vault','Organize clips, streams, and competitive moments.','creator-dashboard.html#library','OPEN LIBRARY',20,true),
  ('gamer','squad_inbox','Squad / Brand Inbox','Receive team, event, and partnership requests.','creator-dashboard.html#inbox','OPEN INBOX',30,true),
  ('gamer','player_performance','Player Performance','Track audience and Creator World momentum.','creator-dashboard.html#overview','VIEW NUMBERS',40,true),
  ('entrepreneur','product_drop','Product Drop','Upload merchandise, offers, or product media.','creator-dashboard.html?create=merch#create','CREATE PRODUCT',10,true),
  ('entrepreneur','offer_library','Offer Library','Organize products, decks, and campaign assets.','creator-dashboard.html#library','OPEN LIBRARY',20,true),
  ('entrepreneur','brand_profile','Brand Profile','Keep the business story and links presentation-ready.','creator-dashboard.html#profile','EDIT PROFILE',30,true),
  ('entrepreneur','partnership_inbox','Partnership Inbox','Manage brand, wholesale, and collaboration interest.','creator-dashboard.html#inbox','OPEN INBOX',40,true),
  ('original_creator','creator_studio','Creator Studio','Create music, video, art, merch, or a World update.','creator-dashboard.html?create=world#create','CREATE',10,true),
  ('original_creator','creation_library','My Creations','Manage private work and send it for owner review.','creator-dashboard.html#library','OPEN LIBRARY',20,true),
  ('original_creator','profile_builder','Profile Builder','Shape your Creator World identity and story.','creator-dashboard.html#profile','EDIT PROFILE',30,true),
  ('original_creator','opportunity_inbox','Opportunity Inbox','Keep collaborations and business requests together.','creator-dashboard.html#inbox','OPEN INBOX',40,true)
on conflict (role_key,tool_key) do update set
  title = excluded.title,
  summary = excluded.summary,
  route = excluded.route,
  action_label = excluded.action_label,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled,
  updated_at = now();

notify pgrst, 'reload schema';
