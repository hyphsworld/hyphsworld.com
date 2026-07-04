(function () {
  'use strict';

  const ROTATE_KEY = 'hyphsworld.dailyWheel.rotate';
  const LOCAL_DAY_KEY = 'hyphsworld.dailyWheel.lastSpinDay';
  const wheel = document.getElementById('prizeWheel');
  const button = document.getElementById('spinWheelBtn');
  const result = document.getElementById('wheelResult');
  const pointsEl = document.getElementById('dailyWheelPoints');

  const labels = ['5 CP', '10 CP', '15 CP', '20 CP', '25 CP', '50 CP', '75 CP', '100 CP'];
  let spinning = false;

  function n(value) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function safe(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function currentPoints() {
    try {
      if (window.HWPoints && typeof window.HWPoints.get === 'function') return n(window.HWPoints.get());
      if (window.HWPoints && typeof window.HWPoints.getState === 'function') {
        const state = window.HWPoints.getState();
        return n(state && state.points);
      }
    } catch (error) {}
    try { return n(localStorage.getItem('hyphsworld.coolPoints.total') || localStorage.getItem('coolPoints') || '0'); } catch (error) {}
    return 0;
  }

  function updatePoints(value) {
    const next = typeof value === 'number' ? value : currentPoints();
    if (pointsEl) pointsEl.textContent = next.toLocaleString();
  }

  async function refreshPoints(value) {
    try {
      if (window.HWPoints && typeof window.HWPoints.refresh === 'function') await window.HWPoints.refresh();
      if (window.HWUserWidget && typeof window.HWUserWidget.refresh === 'function') window.HWUserWidget.refresh();
    } catch (error) {}
    updatePoints(value);
  }

  function show(kicker, title, text) {
    if (!result) return;
    result.innerHTML = '<span>' + safe(kicker) + '</span><h2>' + safe(title) + '</h2><p>' + safe(text) + '</p>';
  }

  function setButton(text, disabled) {
    if (!button) return;
    button.disabled = Boolean(disabled);
    button.textContent = text;
  }

  async function getSupabaseClient() {
    if (window.HWAuth && typeof window.HWAuth.getClient === 'function') {
      const maybeClient = window.HWAuth.getClient();
      const client = maybeClient && typeof maybeClient.then === 'function' ? await maybeClient : maybeClient;
      if (client && typeof client.rpc === 'function') return client;
    }

    if (window.supabaseClient && typeof window.supabaseClient.rpc === 'function') return window.supabaseClient;

    if (window.supabase && window.HW_SUPABASE_CONFIG && window.HW_SUPABASE_CONFIG.url && window.HW_SUPABASE_CONFIG.anonKey) {
      return window.supabase.createClient(window.HW_SUPABASE_CONFIG.url, window.HW_SUPABASE_CONFIG.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }

    return null;
  }

  function spinTo(points) {
    const index = Math.max(0, labels.indexOf(String(points) + ' CP'));
    const segment = 360 / labels.length;
    let base = 0;
    try { base = n(localStorage.getItem(ROTATE_KEY)); } catch (error) {}
    const target = 360 - (index * segment + segment / 2);
    const rotation = base + 1440 + target;
    try { localStorage.setItem(ROTATE_KEY, String(rotation)); } catch (error) {}
    if (wheel) {
      wheel.style.willChange = 'transform';
      wheel.style.transform = 'rotate(' + rotation + 'deg)';
    }
  }

  function pickLocalPrize() {
    const index = Math.floor(Math.random() * labels.length);
    return n(labels[index]);
  }

  function alreadySpunLocally() {
    try { return localStorage.getItem(LOCAL_DAY_KEY) === todayKey(); } catch (error) { return false; }
  }

  function markLocalSpin() {
    try { localStorage.setItem(LOCAL_DAY_KEY, todayKey()); } catch (error) {}
  }

  function paintWheelLabels() {
    if (!wheel) return;
    Array.prototype.slice.call(wheel.querySelectorAll('span')).forEach(function (span, index) {
      span.textContent = labels[index] || span.textContent;
    });
  }

  async function saveReward(points) {
    const client = await getSupabaseClient();
    if (client && typeof client.rpc === 'function') {
      const response = await client.rpc('claim_daily_spin');
      if (response && response.error) throw response.error;
      return response && response.data || {};
    }

    if (window.HWPoints && typeof window.HWPoints.add === 'function') {
      const state = await window.HWPoints.add(points, 'daily_spin_visual_fallback', { source: 'daily-wheel' });
      return { points_awarded: points, balance: n(state && state.points), prize_label: 'Daily Spin Reward' };
    }

    return { points_awarded: points, balance: currentPoints(), prize_label: 'Daily Spin Reward', local_only: true };
  }

  async function run() {
    if (!button || !wheel || spinning) return;

    if (alreadySpunLocally()) {
      show('Already Claimed', 'Come Back Tomorrow', 'This browser already spun today. Login keeps the reward synced across devices.');
      setButton('DONE', true);
      spinTo(5);
      return;
    }

    spinning = true;
    const visualPrize = pickLocalPrize();
    markLocalSpin();
    setButton('SPINNING', true);
    show('Spinning', 'Wheel In Motion', 'The wheel is spinning now. HYPHSWORLD will save the reward if your ID is ready.');
    spinTo(visualPrize);

    let savedData = null;
    let saveError = null;

    try {
      savedData = await saveReward(visualPrize);
    } catch (error) {
      saveError = error;
      try { console.error('HYPHSWORLD daily wheel save error:', error); } catch (e) {}
    }

    window.setTimeout(async function () {
      const serverPoints = n(savedData && savedData.points_awarded) || visualPrize;
      const balance = n(savedData && savedData.balance) || currentPoints();
      const prize = savedData && savedData.prize_label || 'Daily Spin Reward';

      if (savedData && savedData.already_spun) {
        setButton('DONE', true);
        show('Already Claimed', 'Come Back Tomorrow', savedData.message || 'You already spun today. Come back tomorrow.');
        updatePoints(balance);
        spinning = false;
        return;
      }

      await refreshPoints(balance);
      try {
        document.dispatchEvent(new CustomEvent('hyph:points-updated', { detail: { points: balance, source: 'daily_spin' } }));
        window.dispatchEvent(new CustomEvent('hw:points-change', { detail: { points: balance, source: 'daily_spin' } }));
      } catch (error) {}

      setButton('DONE', true);
      if (saveError || (savedData && savedData.local_only)) {
        show('Visual Spin Complete', '+' + serverPoints + ' Cool Points', 'The wheel spun. Login or refresh your ID if the account save does not show yet.');
      } else {
        show('POINTS VERIFIED', '+' + serverPoints + ' Cool Points', prize + '. Duck Sauce approves. Do not spin twice, he got the logs.');
      }
      spinning = false;
    }, 4300);
  }

  function boot() {
    paintWheelLabels();
    updatePoints();
    if (alreadySpunLocally()) {
      setButton('DONE', true);
      show('Ready Tomorrow', 'Daily Spin Claimed', 'This browser already spun today. Come back tomorrow for another drop.');
    } else {
      setButton('SPIN', false);
      show('Ready', 'Tap spin for today’s drop.', 'The wheel spins instantly. Login keeps rewards saved to your HYPHSWORLD ID.');
    }
    if (button) button.addEventListener('click', run);
    window.addEventListener('hw:points-change', function () { updatePoints(); });
    document.addEventListener('hyph:points-updated', function (event) {
      const value = event && event.detail && typeof event.detail.points === 'number' ? event.detail.points : undefined;
      updatePoints(value);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
