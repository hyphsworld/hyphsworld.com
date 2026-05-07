(function () {
  'use strict';

  function safeText(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    return String(value);
  }

  function safeNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function appendText(parent, tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  function createStat(label, value) {
    const article = document.createElement('article');
    article.className = 'hw-daily-stat';
    appendText(article, 'span', '', label);
    appendText(article, 'strong', '', value);
    return article;
  }

  function getClaimMessage(error) {
    if (!error) return 'Could not claim';

    const message = String(error.message || error.details || error.hint || '').toLowerCase();
    const code = String(error.code || '').toLowerCase();

    if (message.includes('already') || message.includes('claimed') || code.includes('23505')) {
      return 'Already Claimed';
    }

    if (message.includes('auth') || message.includes('jwt') || message.includes('permission') || message.includes('not logged')) {
      return 'Sign In Again';
    }

    if (message.includes('rate') || message.includes('limit') || message.includes('cooldown')) {
      return 'Try Later';
    }

    return 'Claim Failed';
  }

  async function bootHUD() {
    if (!window.HWAuth || typeof window.HWAuth.getCurrentUser !== 'function') return;

    const user = await window.HWAuth.getCurrentUser();

    const wrap = document.createElement('aside');
    wrap.className = 'hw-daily-hud';

    if (!user) wrap.classList.add('is-guest');

    const displayName = safeText(user?.displayName, 'Guest Visitor');
    const avatar = safeText(user?.avatarIcon, '🎮');
    const points = safeNumber(user?.coolPoints, 0).toLocaleString();
    const streak = safeNumber(user?.daily_streak_count, 0).toLocaleString();
    const multiplier = safeText(user?.multiplier, '1.0x');
    const rank = safeText(user?.rank_title, 'Lobby Rookie');

    const card = document.createElement('div');
    card.className = 'hw-daily-card';

    const inner = document.createElement('div');
    inner.className = 'hw-daily-inner';
    card.appendChild(inner);

    const top = document.createElement('div');
    top.className = 'hw-daily-top';
    inner.appendChild(top);

    const identity = document.createElement('div');
    top.appendChild(identity);
    appendText(identity, 'span', 'hw-daily-kicker', 'HYPHSWORLD ID');
    appendText(identity, 'strong', 'hw-daily-name', displayName);
    appendText(top, 'div', 'hw-daily-avatar', avatar);

    const stats = document.createElement('div');
    stats.className = 'hw-daily-stats';
    stats.appendChild(createStat('Points', points));
    stats.appendChild(createStat('Streak', streak));
    stats.appendChild(createStat('Boost', multiplier));
    stats.appendChild(createStat('Status', user ? 'LIVE' : 'GUEST'));
    inner.appendChild(stats);

    const rankBox = document.createElement('div');
    rankBox.className = 'hw-daily-rank';
    appendText(rankBox, 'span', '', 'Current Rank');
    appendText(rankBox, 'strong', '', rank);
    inner.appendChild(rankBox);

    const actions = document.createElement('div');
    actions.className = 'hw-daily-actions';

    if (user) {
      const claim = document.createElement('button');
      claim.className = 'hw-daily-btn';
      claim.type = 'button';
      claim.dataset.hwClaim = 'true';
      claim.textContent = 'Claim Daily';
      actions.appendChild(claim);
    } else {
      const createId = document.createElement('a');
      createId.className = 'hw-daily-btn';
      createId.href = 'auth.html';
      createId.textContent = 'Create ID';
      actions.appendChild(createId);
    }

    const collapse = document.createElement('button');
    collapse.className = 'hw-daily-btn secondary';
    collapse.type = 'button';
    collapse.dataset.hwCollapse = 'true';
    collapse.textContent = 'Hide';
    actions.appendChild(collapse);
    inner.appendChild(actions);

    appendText(
      inner,
      'p',
      'hw-daily-msg',
      user
        ? 'Duck Sauce says don’t lose your streak. The leaderboard watching.'
        : 'Create a HYPHSWORLD ID to save Cool Points forever.'
    );

    wrap.appendChild(card);
    document.body.appendChild(wrap);

    collapse.addEventListener('click', function () {
      wrap.classList.toggle('is-collapsed');
    });

    const claim = wrap.querySelector('[data-hw-claim]');

    if (claim) {
      claim.addEventListener('click', async function () {
        claim.disabled = true;
        claim.textContent = 'Checking...';

        try {
          if (!window.supabaseClient || typeof window.supabaseClient.rpc !== 'function') {
            claim.disabled = false;
            claim.textContent = 'Sign In Again';
            return;
          }

          const result = await window.supabaseClient.rpc('claim_daily_streak');

          if (result.error) {
            claim.disabled = false;
            claim.textContent = getClaimMessage(result.error);
            return;
          }

          claim.textContent = '+ Daily Added';
          setTimeout(function () {
            window.location.reload();
          }, 1200);
        } catch (err) {
          claim.disabled = false;
          claim.textContent = 'Retry Claim';
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', bootHUD);
})();
