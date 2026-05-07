(function () {
  'use strict';

  var DUCK_POS_KEY = 'hyphsworld.duckHelper.position.v1';
  var REWARDS = [
    { title: 'Hidden Track Clue', detail: 'Clear Hidden Arcade runs to unlock track clues.', status: 'Locked' },
    { title: 'Backroom Code', detail: 'Stack Cool Points to reveal private code hints.', status: 'Locked' },
    { title: 'Vault Bonus', detail: 'Daily check-ins and arcade runs move the vault meter.', status: 'Locked' },
    { title: 'Secret Drop Trigger', detail: 'Reach higher reward levels to unlock secret drops.', status: 'Locked' }
  ];

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function safe(value) {
    return String(value || '').replace(/[<>]/g, '').trim();
  }

  function createMotionLayer() {
    if ($('.hw-motion-layer')) return;

    var layer = document.createElement('div');
    layer.className = 'hw-motion-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '' +
      '<span class="hw-motion-orb one"></span>' +
      '<span class="hw-motion-orb two"></span>' +
      '<span class="hw-motion-orb three"></span>' +
      '<span class="hw-motion-icon one">🎧</span>' +
      '<span class="hw-motion-icon two">🛹</span>' +
      '<span class="hw-motion-icon three">🔑</span>' +
      '<span class="hw-motion-icon four">💎</span>' +
      '<span class="hw-motion-person one"></span>' +
      '<span class="hw-motion-person two"></span>';

    document.body.prepend(layer);
  }

  function getSavedPosition() {
    try {
      var saved = JSON.parse(localStorage.getItem(DUCK_POS_KEY) || 'null');
      if (!saved) return null;
      if (!Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return null;
      return saved;
    } catch (error) {
      return null;
    }
  }

  function savePosition(x, y) {
    try {
      localStorage.setItem(DUCK_POS_KEY, JSON.stringify({ x: x, y: y }));
    } catch (error) {}
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createRewardsList() {
    if ($('.hw-global-rewards')) return;

    var wrap = document.createElement('aside');
    wrap.className = 'hw-global-rewards';
    wrap.setAttribute('aria-label', 'HYPHSWORLD rewards list');

    var head = document.createElement('button');
    head.type = 'button';
    head.className = 'hw-global-rewards-head';
    head.setAttribute('aria-expanded', 'false');
    head.innerHTML = '<span>Rewards</span><strong>View List</strong>';
    wrap.appendChild(head);

    var panel = document.createElement('div');
    panel.className = 'hw-global-rewards-panel';

    REWARDS.forEach(function (reward) {
      var card = document.createElement('article');
      card.className = 'hw-global-reward-card';

      var title = document.createElement('strong');
      title.textContent = safe(reward.title);
      card.appendChild(title);

      var detail = document.createElement('p');
      detail.textContent = safe(reward.detail);
      card.appendChild(detail);

      var status = document.createElement('span');
      status.textContent = safe(reward.status);
      card.appendChild(status);

      panel.appendChild(card);
    });

    wrap.appendChild(panel);
    document.body.appendChild(wrap);

    head.addEventListener('click', function () {
      var open = wrap.classList.toggle('is-open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function createDuckHelper() {
    if ($('.hw-drag-duck')) return;

    var duck = document.createElement('aside');
    duck.className = 'hw-drag-duck';
    duck.setAttribute('aria-label', 'Draggable Duck Sauce helper');
    duck.innerHTML = '' +
      '<button class="hw-drag-duck-handle" type="button" aria-label="Drag Duck Sauce helper">' +
        '<span class="hw-drag-duck-face">🦆</span>' +
        '<span class="hw-drag-duck-copy"><strong>Duck Help</strong><em>Drag me</em></span>' +
      '</button>';

    document.body.appendChild(duck);

    var saved = getSavedPosition();
    if (saved) {
      duck.style.left = clamp(saved.x, 8, window.innerWidth - 90) + 'px';
      duck.style.top = clamp(saved.y, 8, window.innerHeight - 90) + 'px';
      duck.style.right = 'auto';
      duck.style.bottom = 'auto';
    }

    makeDraggable(duck, $('.hw-drag-duck-handle', duck));
  }

  function makeDraggable(node, handle) {
    var dragging = false;
    var moved = false;
    var startX = 0;
    var startY = 0;
    var nodeX = 0;
    var nodeY = 0;

    function begin(event) {
      var point = event.touches ? event.touches[0] : event;
      dragging = true;
      moved = false;
      startX = point.clientX;
      startY = point.clientY;
      var rect = node.getBoundingClientRect();
      nodeX = rect.left;
      nodeY = rect.top;
      node.style.left = nodeX + 'px';
      node.style.top = nodeY + 'px';
      node.style.right = 'auto';
      node.style.bottom = 'auto';
      node.classList.add('is-dragging');
      event.preventDefault();
    }

    function move(event) {
      if (!dragging) return;
      var point = event.touches ? event.touches[0] : event;
      var deltaX = point.clientX - startX;
      var deltaY = point.clientY - startY;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) moved = true;
      var nextX = clamp(nodeX + deltaX, 8, window.innerWidth - node.offsetWidth - 8);
      var nextY = clamp(nodeY + deltaY, 8, window.innerHeight - node.offsetHeight - 8);
      node.style.left = nextX + 'px';
      node.style.top = nextY + 'px';
      event.preventDefault();
    }

    function end() {
      if (!dragging) return;
      dragging = false;
      node.classList.remove('is-dragging');
      var rect = node.getBoundingClientRect();
      savePosition(rect.left, rect.top);
      if (!moved) node.classList.toggle('is-open');
    }

    handle.addEventListener('mousedown', begin);
    handle.addEventListener('touchstart', begin, { passive: false });
    window.addEventListener('mousemove', move, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
    window.addEventListener('resize', function () {
      var rect = node.getBoundingClientRect();
      var nextX = clamp(rect.left, 8, window.innerWidth - node.offsetWidth - 8);
      var nextY = clamp(rect.top, 8, window.innerHeight - node.offsetHeight - 8);
      node.style.left = nextX + 'px';
      node.style.top = nextY + 'px';
      savePosition(nextX, nextY);
    });
  }

  function boot() {
    createMotionLayer();
    createRewardsList();
    createDuckHelper();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
