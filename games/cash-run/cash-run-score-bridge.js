/* HYPHSWORLD Cash Run score bridge
   Connects the standalone Cash Run build to HYPHSWORLD local best score,
   Cool Points, account-backed HWAuth, and the secure Supabase submit_game_run RPC.
*/
(function () {
  'use strict';

  var GAME_KEY = 'cash_run';
  var LEGACY_GAME_KEY = 'cash-run';
  var BEST_SCORE_KEY = 'hyphsworld.cashRun.bestScore';
  var LAST_SCORE_KEY = 'hyphsworld.cashRun.lastScore';
  var LAST_REWARD_SCORE_KEY = 'hyphsworld.cashRun.lastRewardedScore';
  var PENDING_RUNS_KEY = 'hyphsworld.cashRun.pendingRuns.v1';
  var SCORE_EVENT_NAME = 'hyph:cash-run-score-saved';
  var SCAN_MS = 1200;
  var MIN_SAVE_SCORE = 1;
  var MAX_REASONABLE_SCORE = 250000;

  var lastSeenScore = 0;
  var lastSavedScore = readNumber(BEST_SCORE_KEY, 0);
  var scanTimer = null;
  var syncingPending = false;

  function readNumber(key, fallback) {
    try {
      var value = parseInt(localStorage.getItem(key), 10);
      return Number.isFinite(value) ? value : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeNumber(key, value) {
    try {
      localStorage.setItem(key, String(Math.max(0, parseInt(value, 10) || 0)));
    } catch (error) {}
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {}
  }

  function makeHud() {
    var hud = document.getElementById('hw-cash-run-save-hud');
    if (hud) return hud;

    hud = document.createElement('div');
    hud.id = 'hw-cash-run-save-hud';
    hud.innerHTML = '<strong>HYPHSWORLD SAVE</strong><span>Best Score: ' + lastSavedScore + '</span>';
    document.body.appendChild(hud);
    return hud;
  }

  function injectStyles() {
    if (document.getElementById('hw-cash-run-bridge-style')) return;
    var style = document.createElement('style');
    style.id = 'hw-cash-run-bridge-style';
    style.textContent = [
      'html,body{max-width:100%;overflow-x:hidden!important;overscroll-behavior-x:none!important;}',
      '#hw-cash-run-save-hud{position:fixed;left:12px;bottom:12px;z-index:2147483000;display:grid;gap:2px;max-width:calc(100vw - 24px);padding:10px 12px;border:1px solid rgba(69,255,54,.65);border-radius:16px;background:rgba(0,0,0,.72);color:#fff;font-family:Arial,Helvetica,sans-serif;box-shadow:0 0 24px rgba(69,255,54,.16),0 14px 32px rgba(0,0,0,.35);pointer-events:none}',
      '#hw-cash-run-save-hud strong{color:#45ff36;font-size:11px;letter-spacing:.12em;text-transform:uppercase}',
      '#hw-cash-run-save-hud span{font-size:13px;font-weight:900}',
      '#hw-cash-run-save-hud.is-hot{animation:hwCashRunPulse .75s ease both}',
      '@keyframes hwCashRunPulse{0%{transform:scale(.98);filter:brightness(1)}45%{transform:scale(1.04);filter:brightness(1.28)}100%{transform:scale(1);filter:brightness(1)}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function hudMessage(message) {
    var hud = makeHud();
    hud.innerHTML = '<strong>HYPHSWORLD SAVE</strong><span>' + message + '</span>';
    hud.classList.remove('is-hot');
    void hud.offsetWidth;
    hud.classList.add('is-hot');
  }

  function scoreFromText(text) {
    var clean = String(text || '').replace(/,/g, ' ');
    var candidates = [];
    var patterns = [
      /(?:score|cash|points|collected|total)\s*[:\-]?\s*(\d{1,7})/ig,
      /(\d{1,7})\s*(?:score|points|cash)/ig
    ];

    patterns.forEach(function (pattern) {
      var match;
      while ((match = pattern.exec(clean))) {
        var value = parseInt(match[1], 10);
        if (Number.isFinite(value) && value >= MIN_SAVE_SCORE && value <= MAX_REASONABLE_SCORE) candidates.push(value);
      }
    });

    return candidates.length ? Math.max.apply(Math, candidates) : 0;
  }

  function findScoreInDom() {
    var selectors = [
      '[data-score]', '[data-current-score]', '[data-high-score]', '[data-best-score]',
      '.score', '.high-score', '.highScore', '.best-score', '.game-over', '.gameOver',
      '#score', '#highScore', '#bestScore', '#root'
    ];

    var best = 0;
    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) {
        if (node.dataset) {
          Object.keys(node.dataset).forEach(function (key) {
            if (/score|cash|points/i.test(key)) {
              var dataScore = parseInt(node.dataset[key], 10);
              if (Number.isFinite(dataScore)) best = Math.max(best, dataScore);
            }
          });
        }
        best = Math.max(best, scoreFromText(node.textContent || ''));
      });
    });
    return best;
  }

  function findScoreInStorage() {
    var best = 0;
    try {
      for (var i = 0; i < localStorage.length; i += 1) {
        var key = localStorage.key(i);
        if (!key || !/(cash|score|high|best|points)/i.test(key)) continue;
        var raw = localStorage.getItem(key);
        var direct = parseInt(raw, 10);
        if (Number.isFinite(direct)) best = Math.max(best, direct);
        best = Math.max(best, scoreFromText(raw));
      }
    } catch (error) {}
    return best;
  }

  function pointsForScore(score, previousBest) {
    var delta = Math.max(0, score - previousBest);
    if (!delta) return 0;
    return Math.max(1, Math.min(250000, delta));
  }

  async function getSupabaseClient() {
    try {
      if (window.HWAuth && typeof window.HWAuth.getClient === 'function') {
        return await window.HWAuth.getClient();
      }
    } catch (error) {}
    return null;
  }

  async function submitGameRun(score, points, source, previousBest) {
    var sb = await getSupabaseClient();
    if (!sb) return null;

    var payload = {
      p_game_key: GAME_KEY,
      p_score: score,
      p_points_delta: points,
      p_metadata: {
        source: source || 'bridge',
        legacy_game_key: LEGACY_GAME_KEY,
        previous_best: previousBest || 0,
        user_agent: navigator.userAgent,
        saved_at: new Date().toISOString()
      }
    };

    var result = await sb.rpc('submit_game_run', payload);
    if (result.error) throw result.error;
    return Array.isArray(result.data) ? result.data[0] : result.data;
  }

  function queuePendingRun(run) {
    var queue = readJson(PENDING_RUNS_KEY, []);
    if (!Array.isArray(queue)) queue = [];
    queue.push(run);
    writeJson(PENDING_RUNS_KEY, queue.slice(-25));
  }

  async function syncPendingRuns() {
    if (syncingPending) return;
    syncingPending = true;
    try {
      var queue = readJson(PENDING_RUNS_KEY, []);
      if (!Array.isArray(queue) || !queue.length) return;
      var remaining = [];
      for (var i = 0; i < queue.length; i += 1) {
        var run = queue[i];
        try {
          await submitGameRun(run.score, run.points, run.source || 'pending-sync', run.previousBest || 0);
        } catch (error) {
          remaining.push(run);
        }
      }
      writeJson(PENDING_RUNS_KEY, remaining);
      if (queue.length && !remaining.length) hudMessage('Pending runs synced to Cool Points');
    } finally {
      syncingPending = false;
    }
  }

  function updateLocalFallback(points) {
    if (!points) return;
    try {
      var key = 'hyphsworld.coolPoints.total';
      var current = parseInt(localStorage.getItem(key), 10) || 0;
      localStorage.setItem(key, String(current + points));
    } catch (error) {}
  }

  async function awardPoints(points, score, source, previousBest) {
    if (!points) return null;

    try {
      var rpcResult = await submitGameRun(score, points, source, previousBest);
      if (rpcResult && typeof rpcResult.points !== 'undefined') {
        try { localStorage.setItem('hyphsworld.coolPoints.total', String(rpcResult.points)); } catch (error) {}
        return rpcResult;
      }
    } catch (error) {
      queuePendingRun({ score: score, points: points, source: source || 'bridge', previousBest: previousBest || 0, queuedAt: new Date().toISOString() });
      console.warn('HYPHSWORLD Cash Run RPC save queued:', error && (error.message || error));
    }

    try {
      if (window.HWAuth && typeof window.HWAuth.addPoints === 'function') {
        await window.HWAuth.addPoints(points, 'cash_run_high_score:' + score);
        return null;
      }
    } catch (error) {}

    updateLocalFallback(points);
    return null;
  }

  async function saveScore(score, source) {
    score = parseInt(score, 10) || 0;
    if (score < MIN_SAVE_SCORE || score > MAX_REASONABLE_SCORE) return;
    if (score <= lastSeenScore && score <= lastSavedScore) return;

    lastSeenScore = Math.max(lastSeenScore, score);
    writeNumber(LAST_SCORE_KEY, score);

    if (score > lastSavedScore) {
      var previousBest = lastSavedScore;
      var points = pointsForScore(score, previousBest);
      lastSavedScore = score;
      writeNumber(BEST_SCORE_KEY, score);
      writeNumber(LAST_REWARD_SCORE_KEY, score);
      var accountResult = await awardPoints(points, score, source, previousBest);
      if (accountResult) {
        hudMessage('Run Banked: +' + points + ' CP  Balance: ' + accountResult.points + '  Rank: ' + accountResult.rank_title);
      } else {
        hudMessage('Best Score Saved: ' + score + '  +' + points + ' Cool Points');
      }
      window.dispatchEvent(new CustomEvent(SCORE_EVENT_NAME, {
        detail: { game: GAME_KEY, score: score, previousBest: previousBest, points: points, source: source || 'bridge', account: accountResult || null }
      }));
    } else {
      hudMessage('Run Saved: ' + score + '  Best: ' + lastSavedScore);
      syncPendingRuns();
    }
  }

  function scan() {
    var score = Math.max(findScoreInDom(), findScoreInStorage());
    if (score) saveScore(score, 'scan');
  }

  function patchStorage() {
    var originalSetItem = Storage.prototype.setItem;
    if (Storage.prototype.__hyphsworldCashRunPatched) return;
    Storage.prototype.__hyphsworldCashRunPatched = true;
    Storage.prototype.setItem = function (key, value) {
      originalSetItem.apply(this, arguments);
      if (this === localStorage && /cash|score|high|best|points/i.test(String(key || ''))) {
        var score = Math.max(scoreFromText(value), parseInt(value, 10) || 0);
        if (score) saveScore(score, 'localStorage:' + key);
      }
    };
  }

  function exposeApi() {
    window.HWCashRunScore = {
      save: function (score) { return saveScore(score, 'api'); },
      best: function () { return lastSavedScore; },
      scan: scan,
      syncPending: syncPendingRuns
    };
  }

  function boot() {
    injectStyles();
    makeHud();
    exposeApi();
    patchStorage();
    scan();
    syncPendingRuns();
    scanTimer = window.setInterval(function () { scan(); syncPendingRuns(); }, SCAN_MS);
    window.addEventListener('beforeunload', scan);
    window.addEventListener('online', syncPendingRuns);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();