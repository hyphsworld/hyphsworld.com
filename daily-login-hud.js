(function () {
  'use strict';

  async function bootHUD() {
    if (!window.HWAuth) return;

    const user = await HWAuth.getCurrentUser();

    const wrap = document.createElement('aside');
    wrap.className = 'hw-daily-hud';

    if (!user) wrap.classList.add('is-guest');

    const displayName = user?.displayName || 'Guest Visitor';
    const avatar = user?.avatarIcon || '🎮';
    const points = user?.coolPoints || 0;
    const streak = user?.daily_streak_count || 0;
    const multiplier = user?.multiplier || '1.0x';
    const rank = user?.rank_title || 'Lobby Rookie';

    wrap.innerHTML = `
      <div class="hw-daily-card">
        <div class="hw-daily-inner">

          <div class="hw-daily-top">
            <div>
              <span class="hw-daily-kicker">HYPHSWORLD ID</span>
              <strong class="hw-daily-name">${displayName}</strong>
            </div>
            <div class="hw-daily-avatar">${avatar}</div>
          </div>

          <div class="hw-daily-stats">
            <article class="hw-daily-stat">
              <span>Points</span>
              <strong>${points}</strong>
            </article>

            <article class="hw-daily-stat">
              <span>Streak</span>
              <strong>${streak}</strong>
            </article>

            <article class="hw-daily-stat">
              <span>Boost</span>
              <strong>${multiplier}</strong>
            </article>

            <article class="hw-daily-stat">
              <span>Status</span>
              <strong>${user ? 'LIVE' : 'GUEST'}</strong>
            </article>
          </div>

          <div class="hw-daily-rank">
            <span>Current Rank</span>
            <strong>${rank}</strong>
          </div>

          <div class="hw-daily-actions">
            ${user
              ? '<button class="hw-daily-btn" type="button" data-hw-claim>Claim Daily</button>'
              : '<a class="hw-daily-btn" href="auth.html">Create ID</a>'}

            <button class="hw-daily-btn secondary" type="button" data-hw-collapse>Hide</button>
          </div>

          <p class="hw-daily-msg">
            ${user
              ? 'Duck Sauce says don’t lose your streak. The leaderboard watching.'
              : 'Create a HYPHSWORLD ID to save Cool Points forever.'}
          </p>

        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    const collapse = wrap.querySelector('[data-hw-collapse]');

    if (collapse) {
      collapse.addEventListener('click', function () {
        wrap.classList.toggle('is-collapsed');
      });
    }

    const claim = wrap.querySelector('[data-hw-claim]');

    if (claim) {
      claim.addEventListener('click', async function () {
        claim.disabled = true;
        claim.textContent = 'Loading...';

        try {
          if (window.supabaseClient && typeof window.supabaseClient.rpc === 'function') {
            const result = await window.supabaseClient.rpc('claim_daily_streak');

            if (result.error) {
              claim.textContent = 'Already Claimed';
            } else {
              claim.textContent = '+ Daily Added';
              setTimeout(function () {
                window.location.reload();
              }, 1200);
            }
          } else {
            claim.textContent = 'Ready';
          }
        } catch (err) {
          claim.textContent = 'Retry';
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', bootHUD);
})();
