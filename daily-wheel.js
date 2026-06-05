(function () {
  'use strict';

  const DATE_KEY = 'hyphsworld.dailyWheel.date';
  const LAST_KEY = 'hyphsworld.dailyWheel.last';
  const ROTATE_KEY = 'hyphsworld.dailyWheel.rotate';
  const wheel = document.getElementById('prizeWheel');
  const button = document.getElementById('spinWheelBtn');
  const result = document.getElementById('wheelResult');
  const pointsEl = document.getElementById('dailyWheelPoints');

  const items = [
    { title: '250 Cool Points', amount: 250, text: '250 Cool Points added.' },
    { title: 'Green Gate Clue', amount: 0, text: 'Today clue: watch the green gate.' },
    { title: '100 Cool Points', amount: 100, text: '100 Cool Points added.' },
    { title: 'Vault Hint', amount: 0, text: 'Today hint: Duck Sauce knows where the badge moved.' },
    { title: '500 Cool Points', amount: 500, text: '500 Cool Points added.' },
    { title: 'Badge Note', amount: 0, text: 'Badge lane note saved for a future drop.' },
    { title: '50 Cool Points', amount: 50, text: '50 Cool Points added.' },
    { title: 'Daily Hype', amount: 0, text: 'Daily hype pass unlocked.' }
  ];

  function today() { return new Date().toISOString().slice(0, 10); }
  function n(value) { const parsed = parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }
  function safe(text) { return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

  function currentPoints() {
    try { if (window.HWPoints && typeof window.HWPoints.get === 'function') return n(window.HWPoints.get()); } catch (error) {}
    try { return n(localStorage.getItem('hyphsworld.coolPoints.total') || localStorage.getItem('coolPoints') || '0'); } catch (error) {}
    return 0;
  }

  function updatePoints() {
    if (pointsEl) pointsEl.textContent = currentPoints().toLocaleString();
  }

  function show(kicker, title, text) {
    if (!result) return;
    result.innerHTML = '<span>' + safe(kicker) + '</span><h2>' + safe(title) + '</h2><p>' + safe(text) + '</p>';
  }

  function alreadyUsed() {
    try { return localStorage.getItem(DATE_KEY) === today(); } catch (error) { return false; }
  }

  function lastItem() {
    try { return JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); } catch (error) { return null; }
  }

  function lock() {
    if (!button) return;
    button.disabled = true;
    button.textContent = 'DONE';
  }

  function open() {
    if (!button) return;
    button.disabled = false;
    button.textContent = 'SPIN';
  }

  function selectItem() {
    const index = Math.floor(Math.random() * items.length);
    return { index, item: items[index] };
  }

  async function addPoints(amount, title) {
    if (!amount) return;
    if (window.HWPoints && typeof window.HWPoints.add === 'function') {
      await window.HWPoints.add(amount, 'daily_wheel', { title });
    } else {
      document.dispatchEvent(new CustomEvent('hyph:points:add', { detail: { amount, reason: 'daily_wheel' } }));
    }
  }

  function save(item) {
    try {
      localStorage.setItem(DATE_KEY, today());
      localStorage.setItem(LAST_KEY, JSON.stringify({ date: today(), title: item.title, text: item.text }));
    } catch (error) {}
  }

  async function run() {
    if (!button || !wheel || button.disabled) return;

    if (alreadyUsed()) {
      const last = lastItem();
      lock();
      show('Already Claimed', 'Come Back Tomorrow', last ? last.text : 'Daily reward already claimed.');
      return;
    }

    const picked = selectItem();
    const segment = 360 / items.length;
    const base = n(localStorage.getItem(ROTATE_KEY));
    const target = 360 - (picked.index * segment + segment / 2);
    const rotation = base + 1440 + target;

    button.disabled = true;
    button.textContent = 'SPINNING';
    show('Spinning', 'Wheel Moving', 'Buck is watching the pointer.');

    try { localStorage.setItem(ROTATE_KEY, String(rotation)); } catch (error) {}
    wheel.style.transform = 'rotate(' + rotation + 'deg)';

    window.setTimeout(async function () {
      await addPoints(picked.item.amount, picked.item.title);
      save(picked.item);
      updatePoints();
      lock();
      show('Daily Drop', picked.item.title, picked.item.text);
    }, 4300);
  }

  function boot() {
    updatePoints();
    if (alreadyUsed()) {
      const last = lastItem();
      lock();
      show('Claimed Today', 'Come Back Tomorrow', last ? last.text : 'Daily reward already claimed.');
    } else {
      open();
    }
    if (button) button.addEventListener('click', run);
    window.addEventListener('hw:points-change', updatePoints);
    document.addEventListener('hyph:points-updated', updatePoints);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
