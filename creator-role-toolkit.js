(function () {
  'use strict';

  var target = document.getElementById('roleToolkit');
  var state = document.getElementById('roleToolkitState');
  if (!target || !state) return;

  var fallbackRoles = [
    { role_key: 'recording_artist', label: 'Recording Artist', short_mark: 'MIC', description: 'Release music, present the brand, and turn attention into opportunities.', aliases: ['artist','rapper','songwriter','performer','latin artist','independent entertainer'], accent: '#ff4dbe', sort_order: 10 },
    { role_key: 'producer', label: 'Producer', short_mark: 'BEAT', description: 'Organize beats, placements, collaborations, and performance data.', aliases: ['producer','beatmaker','audio engineer','engineer'], accent: '#a970ff', sort_order: 20 },
    { role_key: 'skater', label: 'Skater', short_mark: 'SK8', description: 'Build a trick reel, document progression, and attract sponsors.', aliases: ['skater','skateboarder','skateboarding'], accent: '#34eaff', sort_order: 30 },
    { role_key: 'baseball_player', label: 'Baseball Player', short_mark: 'BALL', description: 'Keep highlights, player identity, scouting contacts, and progress together.', aliases: ['baseball','baseball player','youth athlete','all-american'], accent: '#ff7657', sort_order: 40 },
    { role_key: 'dancer', label: 'Dancer', short_mark: 'MOVE', description: 'Present reels, choreography, auditions, and booking opportunities.', aliases: ['dancer','dance','choreographer','choreography'], accent: '#ffdb4d', sort_order: 50 },
    { role_key: 'dj_host', label: 'DJ / Host', short_mark: 'LIVE', description: 'Manage shows, mixes, guests, and audience momentum.', aliases: ['dj','radio','host','radio personality','podcaster'], accent: '#46ff67', sort_order: 60 },
    { role_key: 'developer', label: 'Developer', short_mark: 'DEV', description: 'Show projects, organize builds, and receive collaboration requests.', aliases: ['developer','web designer','website developer','game designer'], accent: '#34eaff', sort_order: 70 },
    { role_key: 'coach_mentor', label: 'Coach / Mentor', short_mark: 'COACH', description: 'Share programs, training media, player progress, and requests.', aliases: ['coach','mentor','trainer'], accent: '#ff9d3b', sort_order: 80 },
    { role_key: 'designer', label: 'Designer', short_mark: 'DESIGN', description: 'Build collections, present work, and manage commissions.', aliases: ['designer','creative director','fashion','artwork','visual artist'], accent: '#ff4dbe', sort_order: 90 },
    { role_key: 'filmmaker', label: 'Filmmaker', short_mark: 'FILM', description: 'Present reels, productions, pitches, and casting opportunities.', aliases: ['filmmaker','director','videographer','photographer'], accent: '#e6edf5', sort_order: 100 },
    { role_key: 'gamer', label: 'Gamer / Streamer', short_mark: 'PLAY', description: 'Publish clips, organize highlights, and grow teams or partnerships.', aliases: ['gamer','streamer','esports','gaming'], accent: '#8cff4a', sort_order: 110 },
    { role_key: 'entrepreneur', label: 'Entrepreneur', short_mark: 'BIZ', description: 'Present products, offers, brand identity, and partnership opportunities.', aliases: ['entrepreneur','ceo','founder','brand owner','business'], accent: '#ffd64a', sort_order: 120 },
    { role_key: 'original_creator', label: 'Original Creator', short_mark: 'HW', description: 'A universal toolkit for every approved Creator World.', aliases: [], accent: '#46ff67', sort_order: 999 }
  ];

  var fallbackTools = {
    recording_artist: [
      ['track_studio','Track Studio','Upload a private song or demo.','creator-dashboard.html?create=music#create','CREATE MUSIC'],
      ['release_vault','Release Vault','Organize masters, demos, and release assets.','creator-dashboard.html#library','OPEN LIBRARY'],
      ['feature_requests','Feature Requests','Review collaboration and verse opportunities.','creator-dashboard.html#inbox','OPEN INBOX'],
      ['artist_performance','Artist Performance','Track audience and Creator World activity.','creator-dashboard.html#overview','VIEW NUMBERS']
    ],
    producer: [
      ['beat_studio','Beat Studio','Upload beats and private production work.','creator-dashboard.html?create=music#create','CREATE AUDIO'],
      ['beat_vault','Beat Vault','Keep beats, packs, and placements organized.','creator-dashboard.html#library','OPEN LIBRARY'],
      ['placement_requests','Placement Requests','Review artist and licensing opportunities.','creator-dashboard.html#inbox','OPEN INBOX'],
      ['producer_analytics','Producer Analytics','Track profile, audience, and request activity.','creator-dashboard.html#overview','VIEW NUMBERS']
    ],
    skater: [
      ['clip_studio','Clip Studio','Upload a private trick or session clip.','creator-dashboard.html?create=video#create','CREATE VIDEO'],
      ['trick_reel','Trick Reel','Organize clips into a sponsor-ready body of work.','creator-dashboard.html#library','OPEN LIBRARY'],
      ['sponsor_profile','Sponsor Profile','Keep your identity, story, and links current.','creator-dashboard.html#profile','EDIT PROFILE'],
      ['session_requests','Session Requests','Receive collaborations, demos, and sponsor interest.','creator-dashboard.html#inbox','OPEN INBOX']
    ],
    baseball_player: [
      ['highlight_studio','Highlight Studio','Upload game clips and training video privately.','creator-dashboard.html?create=video#create','CREATE VIDEO'],
      ['player_card','Player Card','Maintain position, story, location, and identity.','creator-dashboard.html#profile','EDIT PROFILE'],
      ['scout_inbox','Scout Inbox','Keep serious coach, camp, and scout interest together.','creator-dashboard.html#inbox','OPEN INBOX'],
      ['season_progress','Season Progress','See Creator World attention and opportunity signals.','creator-dashboard.html#overview','VIEW NUMBERS']
    ],
    dancer: [
      ['reel_studio','Reel Studio','Upload audition, rehearsal, or performance video.','creator-dashboard.html?create=video#create','CREATE VIDEO'],
      ['choreography_vault','Choreography Vault','Organize routines, reels, and visual work.','creator-dashboard.html#library','OPEN LIBRARY'],
      ['audition_profile','Audition Profile','Keep your style, credits, and links presentation-ready.','creator-dashboard.html#profile','EDIT PROFILE'],
      ['booking_inbox','Booking Inbox','Receive auditions, bookings, and collaborations.','creator-dashboard.html#inbox','OPEN INBOX']
    ],
    dj_host: [
      ['show_upload','Show / Mix Upload','Upload mixes, episodes, or show assets.','creator-dashboard.html?create=music#create','CREATE AUDIO'],
      ['show_archive','Show Archive','Organize mixes, episodes, promos, and artwork.','creator-dashboard.html#library','OPEN LIBRARY'],
      ['guest_booking','Guest Booking','Manage guest, interview, and appearance requests.','creator-dashboard.html#inbox','OPEN INBOX'],
      ['audience_insights','Audience Insights','Track profile, follower, and link activity.','creator-dashboard.html#overview','VIEW NUMBERS']
    ],
    developer: [
      ['project_drop','Project Drop','Upload a private build, deck, or World update.','creator-dashboard.html?create=world#create','CREATE PROJECT'],
      ['build_library','Build Library','Organize releases, previews, and project files.','creator-dashboard.html#library','OPEN LIBRARY'],
      ['project_profile','Project Profile','Present capabilities, projects, and technical identity.','creator-dashboard.html#profile','EDIT PROFILE'],
      ['collaboration_inbox','Collaboration Inbox','Receive product, game, and website opportunities.','creator-dashboard.html#inbox','OPEN INBOX']
    ],
    coach_mentor: [
      ['training_drop','Training Drop','Upload private drills, sessions, and teaching media.','creator-dashboard.html?create=video#create','CREATE VIDEO'],
      ['program_library','Program Library','Organize programs, plans, and player resources.','creator-dashboard.html#library','OPEN LIBRARY'],
      ['coach_profile','Coach Profile','Present experience, focus, and program identity.','creator-dashboard.html#profile','EDIT PROFILE'],
      ['player_requests','Player Requests','Manage training, mentorship, and team inquiries.','creator-dashboard.html#inbox','OPEN INBOX']
    ],
    designer: [
      ['portfolio_drop','Portfolio Drop','Upload artwork, fashion, or design work privately.','creator-dashboard.html?create=artwork#create','CREATE ART'],
      ['collection_vault','Collection Vault','Organize collections, concepts, and client work.','creator-dashboard.html#library','OPEN LIBRARY'],
      ['commission_inbox','Commission Inbox','Receive serious design and commission requests.','creator-dashboard.html#inbox','OPEN INBOX'],
      ['design_profile','Design Profile','Present your visual identity and approved links.','creator-dashboard.html#profile','EDIT PROFILE']
    ],
    filmmaker: [
      ['reel_upload','Reel Upload','Upload private scenes, reels, and trailers.','creator-dashboard.html?create=video#create','CREATE VIDEO'],
      ['production_library','Production Library','Organize films, cuts, treatments, and artwork.','creator-dashboard.html#library','OPEN LIBRARY'],
      ['pitch_profile','Pitch Profile','Present your reel, roles, and production identity.','creator-dashboard.html#profile','EDIT PROFILE'],
      ['casting_inbox','Casting / Crew Inbox','Receive casting, crew, and production opportunities.','creator-dashboard.html#inbox','OPEN INBOX']
    ],
    gamer: [
      ['clip_upload','Clip Upload','Upload a private highlight or gameplay moment.','creator-dashboard.html?create=video#create','CREATE VIDEO'],
      ['highlight_vault','Highlight Vault','Organize clips, streams, and competitive moments.','creator-dashboard.html#library','OPEN LIBRARY'],
      ['squad_inbox','Squad / Brand Inbox','Receive team, event, and partnership requests.','creator-dashboard.html#inbox','OPEN INBOX'],
      ['player_performance','Player Performance','Track audience and Creator World momentum.','creator-dashboard.html#overview','VIEW NUMBERS']
    ],
    entrepreneur: [
      ['product_drop','Product Drop','Upload merchandise, offers, or product media.','creator-dashboard.html?create=merch#create','CREATE PRODUCT'],
      ['offer_library','Offer Library','Organize products, decks, and campaign assets.','creator-dashboard.html#library','OPEN LIBRARY'],
      ['brand_profile','Brand Profile','Keep the business story and links presentation-ready.','creator-dashboard.html#profile','EDIT PROFILE'],
      ['partnership_inbox','Partnership Inbox','Manage brand, wholesale, and collaboration interest.','creator-dashboard.html#inbox','OPEN INBOX']
    ],
    original_creator: [
      ['creator_studio','Creator Studio','Create music, video, art, merch, or a World update.','creator-dashboard.html?create=world#create','CREATE'],
      ['creation_library','My Creations','Manage private work and send it for owner review.','creator-dashboard.html#library','OPEN LIBRARY'],
      ['profile_builder','Profile Builder','Shape your Creator World identity and story.','creator-dashboard.html#profile','EDIT PROFILE'],
      ['opportunity_inbox','Opportunity Inbox','Keep collaborations and business requests together.','creator-dashboard.html#inbox','OPEN INBOX']
    ]
  };

  function fallbackRows() {
    var rows = [];
    Object.keys(fallbackTools).forEach(function (roleKey) {
      fallbackTools[roleKey].forEach(function (tool, index) {
        rows.push({
          role_key: roleKey,
          tool_key: tool[0],
          title: tool[1],
          summary: tool[2],
          route: tool[3],
          action_label: tool[4],
          sort_order: (index + 1) * 10,
          enabled: true
        });
      });
    });
    return rows;
  }

  function normalized(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function matchedRoles(creator, roles) {
    var source = normalized([].concat(creator.categories || [], creator.headline || '').join(' | '));
    var scored = roles
      .filter(function (role) { return role.role_key !== 'original_creator' && role.enabled !== false; })
      .map(function (role) {
        var score = (role.aliases || []).reduce(function (total, alias) {
          return total + (source.indexOf(normalized(alias)) > -1 ? 1 : 0);
        }, 0);
        return { role: role, score: score };
      })
      .filter(function (item) { return item.score > 0; })
      .sort(function (a, b) { return b.score - a.score || Number(a.role.sort_order || 999) - Number(b.role.sort_order || 999); })
      .slice(0, 3)
      .map(function (item) { return item.role; });
    if (scored.length) return scored;
    return roles.filter(function (role) { return role.role_key === 'original_creator'; }).slice(0, 1);
  }

  async function catalog() {
    try {
      var client = await window.HWAuth.getClient();
      if (!client) throw new Error('No secure client');
      var results = await Promise.all([
        client.from('creator_role_catalog').select('role_key,label,short_mark,description,aliases,accent,sort_order,enabled').eq('enabled', true).order('sort_order'),
        client.from('creator_role_tools').select('role_key,tool_key,title,summary,route,action_label,sort_order,enabled').eq('enabled', true).order('sort_order')
      ]);
      if (results[0].error || results[1].error || !(results[0].data || []).length) throw results[0].error || results[1].error || new Error('Empty role catalog');
      return { roles: results[0].data, tools: results[1].data };
    } catch (error) {
      console.info('Using versioned Creator Loadout catalog until the server catalog migration is active.');
      return { roles: fallbackRoles, tools: fallbackRows() };
    }
  }

  function renderLoadout(role, tools) {
    var section = document.createElement('section');
    var head = document.createElement('div');
    var mark = document.createElement('span');
    var identity = document.createElement('div');
    var title = document.createElement('h3');
    var description = document.createElement('p');
    var grid = document.createElement('div');

    section.className = 'role-loadout';
    section.style.setProperty('--loadout-accent', role.accent || '#46ff67');
    head.className = 'role-loadout-head';
    mark.className = 'role-loadout-mark';
    mark.textContent = role.short_mark || 'HW';
    title.textContent = role.label;
    description.textContent = role.description;
    grid.className = 'role-tool-grid';

    tools
      .filter(function (tool) { return tool.role_key === role.role_key && tool.enabled !== false; })
      .sort(function (a, b) { return Number(a.sort_order || 999) - Number(b.sort_order || 999); })
      .forEach(function (tool) {
        var link = document.createElement('a');
        var eyebrow = document.createElement('small');
        var name = document.createElement('strong');
        var summary = document.createElement('span');
        var action = document.createElement('b');
        link.className = 'role-tool';
        link.href = tool.route;
        eyebrow.textContent = role.label.toUpperCase();
        name.textContent = tool.title;
        summary.textContent = tool.summary;
        action.textContent = (tool.action_label || 'OPEN') + ' →';
        link.append(eyebrow, name, summary, action);
        grid.appendChild(link);
      });

    identity.append(title, description);
    head.append(mark, identity);
    section.append(head, grid);
    return section;
  }

  var latestCreatorId = '';
  async function render(creator) {
    if (!creator || !creator.id) return;
    latestCreatorId = creator.id;
    state.textContent = 'BUILDING LOADOUT…';
    target.replaceChildren();
    var data = await catalog();
    if (latestCreatorId !== creator.id) return;
    var roles = matchedRoles(creator, data.roles);
    roles.forEach(function (role) { target.appendChild(renderLoadout(role, data.tools)); });
    state.textContent = roles.length + (roles.length === 1 ? ' ROLE' : ' ROLES') + ' • ' +
      roles.reduce(function (count, role) {
        return count + data.tools.filter(function (tool) { return tool.role_key === role.role_key && tool.enabled !== false; }).length;
      }, 0) + ' TOOLS READY';
  }

  window.addEventListener('hw:creator-profile-ready', function (event) {
    render(event.detail && event.detail.creator).catch(function (error) {
      console.warn('Creator Loadout unavailable.', error);
      state.textContent = 'LOADOUT UNAVAILABLE';
      target.textContent = 'Your core Creator World tools are still available above.';
    });
  });
})();