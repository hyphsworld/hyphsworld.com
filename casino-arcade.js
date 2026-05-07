(function () {
  'use strict';

  const LOCAL_POINTS_KEY = 'hyphsworld.coolPoints.total';
  const RECENT_KEY = 'hyphsworld.hiddenArcade.recent';
  const CONFIG_SRC = 'supabase-config.js';
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const CHALLENGE_POINTS = 25;

  const $ = (id) => document.getElementById(id);
  const rand = (max) => Math.floor(Math.random() * max);
  const format = (value) => new Intl.NumberFormat('en-US').format(Math.max(0, Math.round(Number(value) || 0)));
  const clean = (value) => String(value || '').replace(/[<>]/g, '').trim();

  let user = null;
  let supabasePromise = null;
  let activeChallenge = null;
  let activeAnswer = null;
  let runCount = 0;

  const hiddenChallenges = [
    {
      id: 'code-path',
      title: 'Code Path',
      kicker: 'SECRET CHALLENGE',
      prompt: 'Duck Sauce left three glowing doors. Pick the one with the hidden code.',
      icon: '🔑',
      choices: ['Door 01', 'Door 33', 'Door 600'],
      success: 'Code found. Cool Points added.',
      miss: 'Wrong door. Points stayed safe.',
    },
    {
      id: 'beat-drop',
      title: 'Beat Drop',
      kicker: 'SECRET CHALLENGE',
      prompt: 'Catch the right drop before the beat switches.',
      icon: '🎧',
      choices: ['Kick', 'Snare', '808'],
      success: 'Perfect timing. Cool Points added.',
      miss: 'Beat slipped. Run it back.',
    },
    {
      id: 'skate-line',
      title: 'Skate Line',
      kicker: 'SECRET CHALLENGE',
      prompt: 'Pick the cleanest line through the hidden ramp.',
      icon: '🛹',
      choices: ['Rail', 'Ramp', 'Wallride'],
      success: 'Clean line. Cool Points added.',
      miss: 'Almost had it. Points stayed safe.',
    },
    {
      id: 'vault-glow',
      title: 'Vault Glow',
      kicker: 'SECRET CHALLENGE',
      prompt: 'The vault flashed one color. Choose the glow Duck Sauce pointed at.',
      icon: '💎',
      choices: ['Green', 'Pink', 'Gold'],
      success: 'Vault glow matched. Cool Points added.',
      miss: 'Wrong glow. Try another run.',
    },
    {
      id: 'bridge-run',
      title: 'Bridge Run',
      kicker: 'SECRET CHALLENGE',
      prompt: 'Pick the safe route across the HYPHSWORLD bridge.',
      icon: '🌉',
      choices: ['Left Lane', 'Middle Lane', 'Right Lane'],
      success: 'Route cleared. Cool Points added.',
      miss: 'Traffic jam. No points removed.',
    },
  ];

  function text(id, value) {
    const node = $(id);
    if (node) node.textContent = value;
  }

  function status(message) {
    text('casinoStatus', 'Duck Sauce: “' + message + '”');
  }

  function localPoints() {
    try {
      return Math.max(0, Math.round(Number(localStorage.getItem(LOCAL_POINTS_KEY)) || 0));
    } catch {
      return 0;
    }
  }

  function setLocalPoints(value) {
    const next = Math.max(0, Math.round(Number(value) || 0));
    try {
      localStorage.setItem(LOCAL_POINTS_KEY, String(next));
    } catch {}
    text('casinoPoints', format(next));
  }

  function getRecent() {
    try {
      const items = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  function saveRecent(item) {
    const items = [item].concat(getRecent()).slice(0, 5);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(items));
    } catch {}
    drawRecent();
  }

  function drawRecent() {
    const list = $('casinoRecentList');
    if (!list) return;

    const items = getRecent();
    list.innerHTML = '';

    if (!items.length) {
      const empty = document.createElement('span');
      empty.textContent = 'No runs yet.';
      list.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement('span');
      row.textContent = clean(item.title) + ' • +' + format(item.points) + ' • ' + clean(item.result);
      list.appendChild(row);
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const old = Array.from(document.scripts).find((script) => script.src && script.src.includes(src));
      if (old) {
        old.addEventListener('load', resolve, { once: true });
        setTimeout(resolve, 200);
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(script);
    });
  }

  async function getSupabase() {
    if (supabasePromise) return supabasePromise;

    supabasePromise = (async () => {
      try {
        if (!window.HW_SUPABASE_CONFIG) await loadScript(CONFIG_SRC);
        const config = window.HW_SUPABASE_CONFIG || {};
        const url = String(config.url || '');
        const key = String(config.anonKey || config.anon_key || '');

        if (!url || !key || /PASTE_|YOUR_|PROJECT_URL|ANON_PUBLIC_KEY/i.test(url + key)) return null;
        if (!window.supabase?.createClient) await loadScript(SUPABASE_CDN);

        return window.supabase?.createClient
          ? window.supabase.createClient(url, key, {
              auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
            })
          : null;
      } catch {
        return null;
      }
    })();

    return supabasePromise;
  }

  async function refreshUser() {
    const authLink = $('casinoAuthLink');

    try {
      user = window.HWAuth && typeof window.HWAuth.getCurrentUser === 'function'
        ? await window.HWAuth.getCurrentUser()
        : null;
    } catch {
      user = null;
    }

    if (user && user.email) {
      text('casinoPlayerName', user.displayName || user.username || user.email);
      text('casinoPlayerMode', 'Signed in. Hidden Arcade progress can save to your HYPHSWORLD ID.');
      text('casinoPoints', format(user.coolPoints || 0));

      if (authLink) {
        authLink.textContent = 'Manage ID';
        authLink.href = 'account.html';
      }
    } else {
      text('casinoPlayerName', 'Guest Player');
      text('casinoPlayerMode', 'Guest mode. Create ID to keep Cool Points across devices.');
      text('casinoPoints', format(localPoints()));
    }
  }

  async function addPoints(points, reason) {
    const safePoints = Math.max(0, Math.round(Number(points) || 0));
    if (!safePoints) return;

    try {
      if (window.HWAuth && typeof window.HWAuth.addPoints === 'function') {
        const nextTotal = await window.HWAuth.addPoints(safePoints, reason);
        text('casinoPoints', format(nextTotal));
        await refreshUser();
        return;
      }
    } catch (error) {
      console.warn('Hidden Arcade points fallback:', error && error.message ? error.message : error);
    }

    setLocalPoints(localPoints() + safePoints);
  }

  async function saveScore(challenge, points, result) {
    if (!user || !user.userId || user.provider === 'mock') return;

    try {
      const client = await getSupabase();
      if (!client) return;

      await client.from('game_scores').insert({
        user_id: user.userId,
        game_key: 'hidden_arcade_' + challenge.id,
        score: Math.max(1, points || 1),
        points_delta: Math.max(0, points || 0),
        metadata: {
          source: 'hidden_arcade',
          challenge: challenge.id,
          result,
          no_cash_payout: true,
        },
      });
    } catch (error) {
      console.warn('Hidden Arcade score skipped:', error && error.message ? error.message : error);
    }
  }

  function button(label, action, extraClass) {
    return '<button class="arcade-btn ' + (extraClass || '') + '" type="button" data-action="' + action + '">' + label + '</button>';
  }

  function renderStart() {
    activeChallenge = null;
    activeAnswer = null;

    text('casinoGameTitle', 'Ready?');
    text('casinoGameKicker', 'SECRET CHALLENGE');
    text('casinoGameDescription', 'Tap Play and the Hidden Arcade will pick a secret challenge.');

    const stage = $('casinoStage');
    const controls = $('casinoControls');

    if (stage) {
      stage.innerHTML =
        '<div class="hidden-arcade-start">' +
          '<div class="arcade-result-number">?</div>' +
          '<h3>Hidden Challenge Locked</h3>' +
          '<p>Tap Play to reveal the next run.</p>' +
        '</div>';
    }

    if (controls) {
      controls.innerHTML =
        '<div class="cpu-mode-panel"><strong>Simple Mode</strong><span>One button. One secret challenge. Cool Points stay safe.</span></div>' +
        '<div class="casino-button-row">' + button('Play Hidden Challenge', 'start-hidden') + '</div>';
    }

    bindActions();
  }

  function renderChallenge() {
    const stage = $('casinoStage');
    const controls = $('casinoControls');
    if (!stage || !controls || !activeChallenge) return;

    text('casinoGameTitle', activeChallenge.title);
    text('casinoGameKicker', activeChallenge.kicker);
    text('casinoGameDescription', activeChallenge.prompt);

    stage.innerHTML =
      '<div class="hidden-challenge-card">' +
        '<div class="arcade-result-number">' + activeChallenge.icon + '</div>' +
        '<h3>' + activeChallenge.title + '</h3>' +
        '<p>' + activeChallenge.prompt + '</p>' +
      '</div>';

    controls.innerHTML =
      '<div class="cpu-mode-panel"><strong>Pick One</strong><span>The arcade already chose the answer. Make your move.</span></div>' +
      '<div class="casino-button-row hidden-choice-row">' +
        activeChallenge.choices.map((choice, index) => button(choice, 'choice-' + index, index === 1 ? 'secondary' : '')).join('') +
      '</div>' +
      '<div class="casino-button-row">' + button('New Challenge', 'start-hidden', 'secondary') + '</div>';

    bindActions();
  }

  function startHiddenChallenge() {
    runCount += 1;
    activeChallenge = hiddenChallenges[rand(hiddenChallenges.length)];
    activeAnswer = rand(activeChallenge.choices.length);
    status('Challenge opened. Pick one and see if the arcade lets you through.');
    renderChallenge();
  }

  async function choose(index) {
    if (!activeChallenge) {
      startHiddenChallenge();
      return;
    }

    const correct = index === activeAnswer;
    const points = correct ? CHALLENGE_POINTS + Math.min(25, runCount * 2) : 0;
    const result = correct ? 'cleared' : 'missed';

    if (correct) {
      await addPoints(points, 'hidden_arcade_clear');
      await saveScore(activeChallenge, points, result);
      saveRecent({ title: activeChallenge.title, points, result: 'cleared' });
      status(activeChallenge.success);
    } else {
      await saveScore(activeChallenge, 0, result);
      saveRecent({ title: activeChallenge.title, points: 0, result: 'missed' });
      status(activeChallenge.miss);
    }

    renderResult(correct, points);
  }

  function renderResult(correct, points) {
    const stage = $('casinoStage');
    const controls = $('casinoControls');
    if (!stage || !controls || !activeChallenge) return;

    stage.innerHTML =
      '<div class="hidden-challenge-card ' + (correct ? 'is-clear' : 'is-miss') + '">' +
        '<div class="arcade-result-number">' + (correct ? '+' + format(points) : '0') + '</div>' +
        '<h3>' + (correct ? 'Challenge Cleared' : 'Run Missed') + '</h3>' +
        '<p>' + (correct ? activeChallenge.success : activeChallenge.miss) + '</p>' +
      '</div>';

    controls.innerHTML =
      '<div class="cpu-mode-panel"><strong>Next Move</strong><span>Run another hidden challenge or check the reward board.</span></div>' +
      '<div class="casino-button-row">' +
        button('Play Again', 'start-hidden') +
        '<a class="arcade-btn secondary" href="leaderboard.html">Reward Board</a>' +
      '</div>';

    bindActions();
  }

  function handleAction(action) {
    if (action === 'start-hidden') startHiddenChallenge();
    if (action && action.indexOf('choice-') === 0) choose(Number(action.replace('choice-', '')));
  }

  function bindActions() {
    document.querySelectorAll('[data-action]').forEach((node) => {
      node.onclick = () => handleAction(node.dataset.action);
    });
  }

  function boot() {
    const year = $('year');
    if (year) year.textContent = new Date().getFullYear();

    drawRecent();
    refreshUser();
    renderStart();
    status('Hidden Arcade loaded. Tap Play and let it pick.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
