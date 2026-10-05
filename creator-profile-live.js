/* Display creator-owned public fields. Saving and authorization remain in the dashboard. */
(function () {
  'use strict';
  var slugs = {
    'creators-world.html': 'hyph-life', 'creator-rojas.html': 'rojasonthebeat',
    'creator-francoismusic47.html': 'francoismusic47', 'creator-young-tez.html': 'young-tez',
    'creator-b3llygang-h3rsch.html': 'b3llygang-h3rsch', 'creator-nitti-bo.html': 'nitti-bo',
    'creator-lil-g.html': 'lil-g', 'creator-sixx-figgaz.html': 'sixx-figgaz',
    'creator-ykomusic.html': 'ykomusic', 'creator-kili-631.html': 'kili-631'
  };
  var slug = slugs[(location.pathname.split('/').pop() || '').toLowerCase()];
  if (!slug) return;

  function ownedText(element, value) {
    if (!element || typeof value !== 'string' || !value.trim()) return;
    element.textContent = value.trim();
    // The creator's saved copy takes precedence over the editorial translations.
    element.removeAttribute('data-es');
    element.removeAttribute('data-en');
  }
  async function load() {
    try {
      if (!window.HWAuth) return;
      var client = await window.HWAuth.getClient();
      if (!client) return;
      var response = await client.from('creators')
        .select('display_name,headline,location,bio,image_url')
        .eq('slug', slug).eq('status', 'published').maybeSingle();
      if (response.error || !response.data) return;
      var row = response.data;
      var name = document.getElementById('creator-name') || document.querySelector('.creator-hero h1');
      // Retain the published AW ENTERPRISES rebrand while its legacy DB label is still Nitti Bo.
      var legacyNittiLabel = slug === 'nitti-bo' && /^nitti bo$/i.test(row.display_name || '');
      if (name && !legacyNittiLabel && typeof row.display_name === 'string' && row.display_name.trim()) {
        var label = name.querySelector('.creator-name-text');
        if (!label) {
          label = document.createElement('span');
          label.className = 'creator-name-text';
          var badge = name.querySelector('.world-verification-badge');
          name.replaceChildren(label);
          if (badge) name.appendChild(badge);
        }
        ownedText(label, row.display_name);
      }
      ownedText(document.querySelector('.creator-roles'), row.headline);
      ownedText(document.querySelector('.creator-hero .location'), row.location);
      ownedText(document.querySelector('.hero-story'), row.bio);
      var image = document.querySelector('.creator-hero .hero-image');
      if (image && typeof row.image_url === 'string' && row.image_url.trim()) {
        var url = new URL(row.image_url, location.href);
        if (url.protocol === 'https:' || url.origin === location.origin) {
          // Keep existing artwork if a creator's new image cannot be loaded.
          var preview = new Image();
          preview.onload = function () { image.src = url.href; image.alt = (row.display_name || 'Creator') + ' profile artwork'; };
          preview.src = url.href;
        }
      }
    } catch (error) { /* Keep the complete editorial profile available offline. */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
