(function () {
  'use strict';
  var input = document.getElementById('creatorSearch');
  var buttons = Array.from(document.querySelectorAll('[data-filter]'));
  var grid = document.querySelector('.creator-grid');
  var result = document.getElementById('creatorResults');
  var empty = document.getElementById('emptyState');
  var filter = 'all';

  function text(value, fallback) {
    return typeof value === 'string' && value.trim() ? value.trim() : (fallback || '');
  }

  function safeUrl(value, fallback) {
    var candidate = text(value, fallback);
    try {
      var parsed = new URL(candidate, location.href);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
    } catch (error) {}
    return fallback;
  }

  function followerLabel(value) {
    var count = Math.max(0, Number(value) || 0);
    return count.toLocaleString() + ' follower' + (count === 1 ? '' : 's');
  }

  function renderFilter() {
    var term = input.value.trim().toLowerCase();
    var count = 0;
    Array.from(grid.querySelectorAll('.creator-card')).forEach(function (card) {
      var show = (!term || (card.dataset.name + ' ' + card.dataset.tags).indexOf(term) > -1) &&
        (filter === 'all' || card.dataset.tags.indexOf(filter) > -1);
      card.hidden = !show;
      if (show) count += 1;
    });
    result.textContent = count + ' creator' + (count === 1 ? '' : 's') + ' • Alphabetical';
    empty.hidden = count !== 0;
  }

  function creatorCard(row) {
    var card = document.createElement('article');
    var image = document.createElement('img');
    var copy = document.createElement('div');
    var small = document.createElement('small');
    var name = document.createElement('h3');
    var roles = document.createElement('p');
    var followers = document.createElement('span');
    var link = document.createElement('a');
    card.className = 'creator-card';
    var displayName = text(row.display_name, 'Creator');
    var categories = Array.isArray(row.categories) ? row.categories : [];
    var verification = text(row.verification_level, 'unverified').replaceAll('_', ' ');
    var isVerified = ['professional', 'partner', 'organization'].indexOf(verification) > -1;
    card.dataset.name = displayName.toLowerCase();
    card.dataset.tags = categories.join(' ').toLowerCase() + ' ' + text(row.location).toLowerCase();
    card.dataset.creatorSlug = text(row.slug).toLowerCase();
    image.src = safeUrl(row.image_url, 'creator-hyph-life-hero.jpg');
    image.alt = displayName + ' creator profile';
    image.loading = 'lazy';
    small.textContent = (Number.isFinite(Number(row.creator_number)) ? '#' + String(row.creator_number).padStart(3, '0') + ' • ' : '') + verification.toUpperCase();
    name.textContent = displayName;
    roles.textContent = text(row.headline, 'Independent Creator');
    followers.className = 'creator-follow-count';
    followers.textContent = followerLabel(row.follower_count);
    followers.setAttribute('aria-label', displayName + ' ' + followers.textContent);
    link.href = safeUrl(row.profile_url, 'creators.html');
    link.textContent = 'Enter creator world →';
    if (isVerified) {
      var verificationBadge = document.createElement('div');
      var seal = document.createElement('i');
      var verifiedLabel = document.createElement('span');
      card.classList.add('is-verified');
      verificationBadge.className = 'world-verification-badge directory-verification-badge';
      verificationBadge.setAttribute('aria-label', 'HYPHSWORLD Verified Creator');
      seal.className = 'world-seal directory-world-seal';
      seal.title = 'HYPHSWORLD World Seal — Verified Creator';
      seal.setAttribute('aria-hidden', 'true');
      verifiedLabel.className = 'world-verified-label';
      verifiedLabel.textContent = 'VERIFIED';
      verificationBadge.append(seal, verifiedLabel);
      card.append(verificationBadge);
    }
    copy.append(small, name, roles, followers, link);
    card.append(image, copy);
    return card;
  }

  async function loadDirectory() {
    try {
      if (!window.HWAuth) return;
      var client = await window.HWAuth.getClient();
      if (!client) return;
      var response = await client.from('creators')
        .select('creator_number,slug,display_name,headline,location,categories,image_url,profile_url,verification_level,follower_count')
        .eq('status', 'published').order('display_name');
      if (response.error || !response.data || !response.data.length) return;
      grid.replaceChildren(...response.data.map(creatorCard));
      renderFilter();
    } catch (error) {
      console.warn('Using static creator directory fallback.');
    }
  }

  input.addEventListener('input', renderFilter);
  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      filter = button.dataset.filter;
      buttons.forEach(function (item) { item.classList.toggle('active', item === button); });
      renderFilter();
    });
  });
  document.getElementById('year').textContent = new Date().getFullYear();
  window.addEventListener('load', loadDirectory);
})();
