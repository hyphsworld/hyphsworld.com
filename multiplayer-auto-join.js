(() => {
  'use strict';

  if (window.HWMultiplayerAutoJoin) return;

  const $ = (selector, root = document) => root.querySelector(selector);

  function roomFromUrl() {
    const params = new URLSearchParams(window.location.search || '');
    return String(params.get('room') || '').trim().toUpperCase();
  }

  function wantsJoin() {
    const params = new URLSearchParams(window.location.search || '');
    return params.get('join') === '1' && !!roomFromUrl();
  }

  function setText(selector, text) {
    const el = $(selector);
    if (el) el.textContent = text;
  }

  function renderPlayers(players) {
    const list = $('#playersList');
    if (!list) return;
    if (!players || !players.length) {
      list.innerHTML = '<li>No players yet.</li>';
      return;
    }
    list.innerHTML = players.map((player, index) => `<li>Seat ${player.seat_number || index + 1}: ${player.status || 'joined'}</li>`).join('');
  }

  async function refresh(roomId) {
    if (!roomId || !window.HWMultiplayerInvites) return;
    const players = await window.HWMultiplayerInvites.listPlayers(roomId);
    renderPlayers(players);
  }

  async function joinInvite() {
    const code = roomFromUrl();
    if (!code || !window.HWMultiplayerInvites) return;
    try {
      setText('#multiTableStatus', 'Joining invite table...');
      const result = await window.HWMultiplayerInvites.joinTable(code);
      const finalCode = result.roomCode || code;
      setText('#roomCodeDisplay', finalCode);
      setText('#inviteLinkDisplay', result.inviteLink || 'Joined table.');
      const open = $('#openCasinoBtn');
      if (open) open.href = `games.html?room=${encodeURIComponent(finalCode)}`;
      setText('#multiTableStatus', 'Joined same table. Open Casino Floor when ready.');
      if (result.room && result.room.id) {
        await refresh(result.room.id);
        window.setInterval(() => refresh(result.room.id), 7000);
      }
    } catch (error) {
      setText('#multiTableStatus', error.message || 'Could not join invite table. Sign in, then reload invite link.');
    }
  }

  function boot() {
    if (!wantsJoin()) return;
    const panel = $('.multiplayer-panel');
    if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (window.HWMultiplayerInvites && $('#multiTableStatus')) {
        window.clearInterval(timer);
        joinInvite();
      }
      if (attempts > 24) {
        window.clearInterval(timer);
        setText('#multiTableStatus', 'Invite detected. Sign in, then refresh this link.');
      }
    }, 500);
  }

  window.HWMultiplayerAutoJoin = { boot, joinInvite };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
