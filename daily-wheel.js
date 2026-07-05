(function () {
  'use strict';

  const ROTATE_KEY = 'hyphsworld.dailyWheel.rotate';
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

  async function requireSignedIn(client) {
    if (!client || !client.auth || typeof client.auth.getUser !== 'function') return true;
    const response = await client.auth.getUser();
    const user = response && response.data && response.data.user;
    if (!user) throw new Error('Login first so the Daily Spin can save to your HYPHSWORLD ID.');
    return true;
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

  function paintWheelLabels() {
    if (!wheel) return;
    Array.prototype.slice.call(wheel.querySelectorAll('span')).forEach(function (span, index) {
      span.textContent = labels[index] || span.textContent;
    });
  }

  async function claimServerReward() {
    const client = await getSupabaseClient();
    if (!client || typeof client.rpc !== 'function') throw new Error('Supabase is still loading. Refresh and try again.');
    await requireSignedIn(client);

    const response = await client.rpc('claim_daily_spin');
    if (response && response.error) throw response.error;
    const data = response && response.data || {};
    return data;
  }

  async function run() {
    if (!button || !wheel || spinning) return;

    spinning = true;
    setButton('CHECKING ID', true);
    show('Checking ID', 'Connecting To Supabase', 'Daily Spin only pays when the server ledger confirms it. No visual-only points.');

    try {
      const data = await claimServerReward();
      const points = n(data.points_awarded);
      const balance = n(data.balance) || currentPoints();
      const prize = data.prize_label || 'Daily Spin Reward';

      if (data.already_spun) {
        spinTo(5);
        window.setTimeout(function () {
          updatePoints(balance);
          setButton('DONE', true);
          show('Already Claimed', 'Come Back Tomorrow', data.message || 'Duck Sauce said you already spun today. Come back tomorrow.');
          spinning = false;
        }, 1300);
        return;
      }

      setButton('SPINNING', true);
      show('Spinning', 'Server Payout Locked', 'Supabase approved the reward. Wheel animation is matching the saved payout.');
      spinTo(points || 5);

      window.setTimeout(async function () {
        await refreshPoints(balance);
        try {
          document.dispatchEvent(new CustomEvent('hyph:points-updated', { detail: { points: balance, source: 'daily_spin' } }));
          window.dispatchEvent(new CustomEvent('hw:points-change', { detail: { points: balance, source: 'daily_spin' } }));
        } catch (error) {}
        setButton('DONE', true);
        show('POINTS VERIFIED', '+' + points + ' Cool Points', prize + '. Saved to your HYPHSWORLD ID. Duck Sauce got the logs.');
        spinning = false;
      }, 4300);
    } catch (error) {
      const message = error && error.message ? error.message : 'Daily Spin missed. Try again.';
      setButton('SPIN', false);
      show('Not Connected Yet', 'No Points Added', message);
      spinning = false;
      try { console.error('HYPHSWORLD daily wheel error:', error); } catch (e) {}
    }
  }

  function boot() {
    paintWheelLabels();
    updatePoints();
    setButton('SPIN', false);
    show('Ready', 'Tap spin for today’s server drop.', 'The wheel now waits for Supabase first. If it does not verify, it will not show fake points.');
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