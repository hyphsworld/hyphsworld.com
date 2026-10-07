(function () {
  'use strict';
  var portraits = {
    'hyph-life': 'creator-hyph-life-hero.jpg',
    'rojasonthebeat': 'creator-rojas-awards.jpeg',
    'francoismusic47': 'creator-francoismusic47-kutz.jpeg',
    'young-tez': 'creator-young-tez-chicago.jpeg',
    'b3llygang-h3rsch': 'creator-b3llygang-h3rsch.jpg',
    'nitti-bo': 'creator-nitti-bo-profile.png',
    'lil-g': 'creator-lil-g-hero.jpeg',
    'sixx-figgaz': 'creator-sixx-figgaz-hero.jpeg',
    'ykomusic': 'creator-ykomusic.svg',
    'kili-631': 'creator-kili-631.jpeg'
  };
  var culture = 'assets/creator-world/urban-culture.webp';
  var hero = document.querySelector('.creator-hero .hero-image');
  var profileArt = hero ? hero.getAttribute('src') : culture;
  var selectors = '.project-grid > *, .suite-grid > article, .trust-grid > article, .atl-grid > article, .build-grid > article, .career-grid > article, .lane-grid > article, .clubhouse-grid > article, .scouting-grid > article, .music-card, .frequency-card, .mission-card, .reel-card, .world-publication-empty';

  function image(src) {
    var img = document.createElement('img');
    img.className = 'creator-card-art';
    img.src = src;
    img.alt = ''; // Decorative artwork; the existing card heading supplies its name.
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 640;
    img.height = 360;
    img.addEventListener('error', function () {
      if (img.dataset.artFallback) { img.remove(); return; }
      img.dataset.artFallback = 'true';
      img.src = culture;
    });
    return img;
  }

  function cardArt(card) {
    if (card.classList.contains('music')) return 'hyphsworld-5-cover.png';
    if (card.classList.contains('show') || /01 show|o1 show|animation/i.test(card.textContent)) return 'duck-sauce.jpg';
    if (card.classList.contains('games') || /server development|gaming/i.test(card.textContent)) return 'assets/images/street-empire-home.webp';
    if (card.classList.contains('fashion')) return 'chase-the-bag-green-tshirts.jpeg';
    return profileArt;
  }

  function fill() {
    document.querySelectorAll(selectors).forEach(function (card) {
      if (card.querySelector('img, video, iframe, canvas, svg')) return;
      card.insertBefore(image(cardArt(card)), card.firstChild);
    });
    document.querySelectorAll('.creator-card > img').forEach(function (img) {
      if (img.dataset.cardFallback) return;
      img.dataset.cardFallback = 'ready';
      img.addEventListener('error', function () {
        if (img.dataset.cardFallback === 'done') return;
        img.dataset.cardFallback = 'done';
        var card = img.closest('.creator-card');
        img.src = portraits[card.dataset.creatorSlug] || culture;
      });
      if (img.complete && !img.naturalWidth) img.dispatchEvent(new Event('error'));
    });
    document.querySelectorAll('.discovery-creation-media, .world-publication-media').forEach(function (frame) {
      if (frame.querySelector('img')) return;
      var video = frame.querySelector('video');
      var card = frame.closest('article');
      var author = card && card.dataset.creatorSlug;
      var art = portraits[author] || profileArt;
      if (video) { if (!video.getAttribute('poster')) video.poster = art; return; }
      frame.insertBefore(image(art), frame.firstChild);
    });
    document.querySelectorAll('.show-card video').forEach(function (video) {
      if (!video.getAttribute('poster')) video.poster = 'duck-sauce.jpg';
    });
  }

  fill();
  var main = document.querySelector('main');
  if (main) new MutationObserver(fill).observe(main, { childList: true, subtree: true });
})();
