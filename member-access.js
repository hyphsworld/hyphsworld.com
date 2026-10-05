/* Game entry requires a real, non-anonymous Supabase session. Public pages stay browsable. */
(function () {
  'use strict';
  if (window.HWMemberAccess) return;
  var protectedRoot = /\/(?:games|casino|casino-arcade|hidden-casino|dominos|table-game|table-room|daily-wheel)\.html$/i;
  var required = location.pathname.startsWith('/games/') || protectedRoot.test(location.pathname);
  if (!required) return;
  var gate, client, authEpoch = 0, busy = false, unlocked = false;
  var root = document.documentElement;
  var style = document.createElement('style');
  style.textContent = 'html.hw-member-locked body>:not(#hw-member-gate){visibility:hidden!important;pointer-events:none!important}#hw-member-gate{box-sizing:border-box;width:min(440px,calc(100vw - 28px));max-height:calc(100dvh - 28px);padding:24px;border:1px solid #59d9b9;border-radius:24px;background:#0c1421;color:#fff;font:16px/1.5 Arial,sans-serif;overflow:auto}#hw-member-gate::backdrop{background:#050b13}#hw-member-gate h1{margin:8px 0;font-size:28px;line-height:1.1}#hw-member-gate p{color:#c3d4e4}#hw-member-gate a,#hw-member-gate button{display:flex;align-items:center;justify-content:center;min-height:48px;margin-top:12px;padding:12px;border:1px solid #56718a;border-radius:12px;background:#17283a;color:#fff;text-decoration:none;font:800 15px Arial,sans-serif}#hw-member-gate .join{background:#60f2bb;color:#071b15}#hw-member-gate a:focus-visible,#hw-member-gate button:focus-visible{outline:3px solid #6feaff;outline-offset:3px}#hw-member-gate [hidden]{display:none!important}';
  document.head.appendChild(style);
  root.classList.add('hw-member-locked');
  function lock() { unlocked = false; root.classList.add('hw-member-locked'); if (gate && !gate.open) gate.showModal(); }
  function apply(session) {
    var user = session && session.user;
    if (user && user.id && !user.is_anonymous) {
      unlocked = true; root.classList.remove('hw-member-locked'); if (gate && gate.open) gate.close();
    } else {
      lock(); if (gate) gate.querySelector('[role=status]').textContent = 'One ID for games, friends, rewards, and saved progress.';
    }
  }
  function loadAuth() {
    if (window.HWAuth) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var existing = Array.from(document.scripts).find(function (s) { return /\/auth-client\.js(?:[?]|$)/.test(s.src); });
      var script = existing || document.createElement('script');
      script.addEventListener('load', resolve, {once:true});
      script.addEventListener('error', function () { reject(new Error('Account service unavailable.')); }, {once:true});
      if (!existing) { script.src = '/auth-client.js?v=20261005-menu'; document.head.appendChild(script); }
    });
  }
  async function check() {
    if (busy) return;
    busy = true; var epoch = ++authEpoch;
    var deadline;
    try {
      var result = await Promise.race([
        (async function () {
          await loadAuth(); if (!window.HWAuth) throw new Error('Account service unavailable.');
          if (!client) {
            client = await window.HWAuth.getClient();
            if (!client || !client.auth) throw new Error('Account service unavailable.');
            client.auth.onAuthStateChange(function (_event, session) { ++authEpoch; apply(session); });
          }
          var snapshot = authEpoch;
          var response = await client.auth.getSession();
          if (response.error) throw response.error;
          return {snapshot:snapshot, session:response.data && response.data.session};
        })(),
        new Promise(function (_resolve, reject) { deadline = setTimeout(function () { reject(new Error('Connection timed out.')); }, 10000); })
      ]);
      if (result.snapshot === authEpoch) apply(result.session);
    } catch (_error) {
      // Never accept a remembered local profile or unlock a failed session check.
      if (epoch === authEpoch && !unlocked) { lock(); gate.querySelector('[role=status]').textContent = 'Could not check your ID. Check your connection and retry, or sign in.'; }
    } finally { clearTimeout(deadline); busy = false; }
  }
  window.addEventListener('keydown', function (event) { if (!unlocked) { event.stopImmediatePropagation(); if (!gate || !gate.contains(event.target)) event.preventDefault(); } }, true);
  function mount() {
    gate = document.createElement('dialog'); gate.id = 'hw-member-gate'; gate.setAttribute('aria-labelledby', 'hw-member-title');
    gate.innerHTML = '<small>HYPHSWORLD ID</small><h1 id="hw-member-title">Your ID unlocks the play.</h1><p role="status" aria-live="polite">Checking your ID…</p><a class="join">Create your free ID</a><a class="signin">Already have an ID? Sign in</a><button type="button">Retry connection</button><a href="/">Back to HYPHSWORLD</a>';
    var next = encodeURIComponent(location.pathname + location.search + location.hash);
    gate.querySelector('.join').href = '/auth.html?mode=signup&next=' + next;
    gate.querySelector('.signin').href = '/auth.html?next=' + next;
    gate.querySelector('button').onclick = function () { location.reload(); }; // Recover failed SDK loads as well as expired network requests.
    gate.addEventListener('cancel', function (event) { event.preventDefault(); });
    document.body.appendChild(gate); lock(); void check();
    window.addEventListener('pageshow', function () { if (!busy) { lock(); void check(); } });
    window.addEventListener('online', function () { if (!unlocked) void check(); });
  }
  window.HWMemberAccess = {check:check, isUnlocked:function () { return unlocked; }};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true}); else mount();
})();
