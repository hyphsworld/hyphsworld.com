(function () {
  'use strict';
  var input = document.getElementById('creatorSearch');
  var buttons = Array.from(document.querySelectorAll('[data-filter]'));
  var grid = document.querySelector('.creator-grid');
  var result = document.getElementById('creatorResults');
  var empty = document.getElementById('emptyState');
  var filter = 'all';

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
    var link = document.createElement('a');
    card.className = 'creator-card';
    card.dataset.name = row.display_name.toLowerCase();
    card.dataset.tags = (row.categories || []).join(' ').toLowerCase() + ' ' + (row.location || '').toLowerCase();
    image.src = row.image_url;
    image.alt = row.display_name + ' creator profile';
    image.loading = 'lazy';
    small.textContent = (row.creator_number ? '#' + String(row.creator_number).padStart(3, '0') + ' • ' : '') + row.verification_level.replace('_', ' ').toUpperCase();
    name.textContent = row.display_name;
    roles.textContent = row.headline;
    link.href = row.profile_url;
    link.textContent = 'Enter creator world →';
    copy.append(small, name, roles, link);
    card.append(image, copy);
    return card;
  }

  async function loadDirectory() {
    try {
      if (!window.HWAuth) return;
      var client = await window.HWAuth.getClient();
      if (!client) return;
      var response = await client.from('creators')
        .select('creator_number,slug,display_name,headline,location,categories,image_url,profile_url,verification_level')
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
