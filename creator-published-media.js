(function () {
  'use strict';

  var file = (location.pathname.split('/').pop() || '').toLowerCase();
  var slugs = {
    'creators-world.html': 'hyph-life',
    'creator-rojas.html': 'rojasonthebeat',
    'creator-francoismusic47.html': 'francoismusic47',
    'creator-young-tez.html': 'young-tez',
    'creator-b3llygang-h3rsch.html': 'b3llygang-h3rsch',
    'creator-nitti-bo.html': 'nitti-bo',
    'creator-lil-g.html': 'lil-g',
    'creator-sixx-figgaz.html': 'sixx-figgaz'
  };
  var slug = slugs[file];
  if (!slug) return;

  function node(tag, className, text) {
    var item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }

  function mediaElement(row, url) {
    var frame = node('div', 'world-publication-media');
    var media;
    if (row.media_type === 'image') {
      media = node('img');
      media.src = url;
      media.alt = row.title;
      media.loading = 'lazy';
      media.decoding = 'async';
    } else if (row.media_type === 'video') {
      media = node('video');
      media.src = url;
      media.controls = true;
      media.preload = 'metadata';
      media.playsInline = true;
    } else if (row.media_type === 'audio') {
      media = node('audio');
      media.src = url;
      media.controls = true;
      media.preload = 'metadata';
    } else {
      media = node('a', 'world-publication-document', 'OPEN CREATION ↗');
      media.href = url;
      media.target = '_blank';
      media.rel = 'noopener';
    }
    frame.appendChild(media);
    return frame;
  }

  function render(client, rows) {
    if (!rows.length) return;
    var section = node('section', 'world-section world-publications');
    section.id = 'world-releases';
    var heading = node('div', 'section-heading');
    var titleBox = node('div');
    titleBox.append(node('p', '', 'LIVE FROM THIS WORLD'), node('h2', '', 'Fresh creations.'));
    heading.appendChild(titleBox);
    var live = node('span', 'world-live-label', 'OWNER APPROVED • LIVE');
    heading.appendChild(live);
    section.appendChild(heading);

    var grid = node('div', 'world-publication-grid');
    rows.forEach(function (row) {
      var publicData = client.storage.from('creator-world-public').getPublicUrl(row.public_path);
      var url = publicData && publicData.data && publicData.data.publicUrl;
      if (!url) return;
      var card = node('article', 'world-publication-card');
      card.appendChild(mediaElement(row, url));
      var copy = node('div', 'world-publication-copy');
      var kind = String(row.creation_kind || row.media_type || 'world').replaceAll('_', ' ').toUpperCase();
      copy.append(node('small', '', kind + ' • PUBLISHED'), node('h3', '', row.title));
      if (row.published_at) copy.appendChild(node('time', '', new Date(row.published_at).toLocaleDateString()));
      card.appendChild(copy);
      grid.appendChild(card);
    });
    if (!grid.children.length) return;
    section.appendChild(grid);

    var main = document.querySelector('main');
    var switcher = main && main.querySelector('.creator-switcher');
    if (switcher) main.insertBefore(section, switcher);
    else if (main) main.appendChild(section);
  }

  async function load() {
    try {
      if (!window.HWAuth) return;
      var client = await window.HWAuth.getClient();
      if (!client) return;
      var result = await client.from('creator_world_publications')
        .select('id,title,creation_kind,media_type,mime_type,file_size,public_path,published_at')
        .eq('creator_slug', slug)
        .order('published_at', { ascending: false })
        .limit(24);
      if (result.error) return;
      render(client, result.data || []);
    } catch (error) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
