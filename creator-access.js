(function () {
  'use strict';

  var toast = document.getElementById('worldToast');
  var state = document.querySelector('[data-access-state]');
  var cards = Array.from(document.querySelectorAll('[data-tool-key]'));
  var timer;
  var signedIn = false;
  var creator = null;

  function show(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove('show'); }, 3600);
  }

  function toolName(card) {
    var heading = card.querySelector('h3');
    return heading ? heading.textContent : 'This tool';
  }

  function setCardState(card, mode) {
    var badge = card.querySelector('[data-tool-state]');
    var action = card.querySelector('[data-tool-action]');
    card.classList.remove('is-checking', 'is-active', 'is-locked', 'is-unavailable');
    card.classList.add('is-' + mode);
    if (mode === 'active') {
      badge.textContent = 'ACTIVE';
      action.textContent = 'Open Tool';
      action.setAttribute('aria-label', 'Open ' + toolName(card));
      action.removeAttribute('aria-disabled');
      return;
    }
    if (mode === 'locked') {
      badge.textContent = 'LOCKED';
      action.textContent = 'Request Access';
      action.setAttribute('aria-disabled', 'true');
      return;
    }
    if (mode === 'unavailable') {
      badge.textContent = 'CHECK FAILED';
      action.textContent = 'Try Again';
      action.setAttribute('aria-disabled', 'true');
      return;
    }
    badge.textContent = 'CHECKING';
    action.textContent = 'Checking Access';
    action.setAttribute('aria-disabled', 'true');
  }

  function isLiveEntitlement(row) {
    if (!row || row.status !== 'active') return false;
    if (!row.expires_at) return true;
    return new Date(row.expires_at).getTime() > Date.now();
  }

  function sendToLogin() {
    location.href = 'auth.html?next=' + encodeURIComponent('creator-access.html');
  }

  async function render() {
    cards.forEach(function (card) { setCardState(card, 'checking'); });
    state.textContent = 'CHECKING SECURE ID…';

    try {
      if (!window.HWAuth || typeof window.HWAuth.getClient !== 'function') {
        throw new Error('Secure account client unavailable');
      }

      var client = await window.HWAuth.getClient();
      if (!client) throw new Error('Secure account client unavailable');
      var authResult = await client.auth.getUser();
      var user = authResult && authResult.data ? authResult.data.user : null;
      signedIn = Boolean(user);

      if (!user) {
        creator = null;
        state.textContent = 'LOGIN REQUIRED';
        cards.forEach(function (card) { setCardState(card, 'locked'); });
        return;
      }

      var creatorResult = await client
        .from('creators')
        .select('id,display_name,verification_level')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (creatorResult.error) throw creatorResult.error;
      creator = creatorResult.data || null;

      if (!creator) {
        state.textContent = 'CREATOR APPLICATION REQUIRED';
        cards.forEach(function (card) { setCardState(card, 'locked'); });
        return;
      }

      var entitlementResult = await client
        .from('creator_entitlements')
        .select('entitlement_key,status,expires_at')
        .eq('creator_id', creator.id);

      if (entitlementResult.error) throw entitlementResult.error;

      var active = new Set(
        (entitlementResult.data || [])
          .filter(isLiveEntitlement)
          .map(function (row) { return row.entitlement_key; })
      );
      var activeCount = 0;

      cards.forEach(function (card) {
        var allowed = active.has(card.dataset.toolKey);
        setCardState(card, allowed ? 'active' : 'locked');
        if (allowed) activeCount += 1;
      });

      state.textContent =
        String(creator.display_name || 'CREATOR').toUpperCase() +
        ' • ' + activeCount + '/' + cards.length + ' TOOLS ACTIVE';
    } catch (error) {
      console.warn('Protected Tools secure check failed.', error);
      state.textContent = 'SECURE CHECK UNAVAILABLE';
      cards.forEach(function (card) { setCardState(card, 'unavailable'); });
    }
  }

  cards.forEach(function (card) {
    var action = card.querySelector('[data-tool-action]');
    action.addEventListener('click', function (event) {
      if (card.classList.contains('is-active')) return;
      event.preventDefault();

      if (card.classList.contains('is-unavailable')) {
        render();
        return;
      }
      if (!signedIn) {
        sendToLogin();
        return;
      }
      if (!creator) {
        location.href = 'creator-apply.html';
        return;
      }

      show(toolName(card) + ' is locked. Owner Operations must grant this tool to your verified Creator ID.');
    });
  });

  document.getElementById('year').textContent = new Date().getFullYear();
  render();
})();