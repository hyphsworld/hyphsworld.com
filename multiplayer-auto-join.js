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

  function shouldStayLobby() {
    const params = new URLSearchParams(window.location.search || '');
    return params.get('stay') === '1' || params.get('stayLobby') === '1';
  }

  function isCasinoFloor() {
    return /games\.html$/i.test(window.location.pathname || '') || document.body.classList.contains('games-page');
  }

  function casinoUrl(roomCode) {
    return `games.html?room=${encodeURIComponent(roomCode)}&joined=1`;
  }

  function ensureStatusBox() {
    let box = $('#multiTableStatus');
    if (box) return box;
    const hero = $('.casino-hero') || document.body;
    const card = document.createElement('div');
    card.id = 'casinoJoinStatusBox';
    card.style.cssText = 'margin-top:18px;padding:14px 16px;border-radius:18px;border:1px solid rgba(117,255,117,.34);background:rgba(0,0,0,.54);color:#f4fff4;font-weight:950;box-shadow:0 0 24px rgba(117,255,117,.14)';
    card.innerHTML = '<strong style="display:block;color:#75ff75;margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em">Multiplayer Table</strong><p id="multiTableStatus" style="margin:0">Preparing table...</p><p id="roomCodeDisplay" style="margin:8px 0 0;color:#dfff75"></p><ul id="playersList" style="margin:10px 0 0;padding:0;list-style:none"></ul>';
    hero.appendChild(card);
    return $('#multiTableStatus');
  }

  function setText(selector, text) {
    const el = $(selector) || (selector === '#multiTableStatus' ? ensureStatusBox() : null);
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
      ensureStatusBox();
      setText('#multiTableStatus', 'Joining invite table...');
      const result = await window.HWMultiplayerInvites.joinTable(code);
      const finalCode = result.roomCode || code;
      const floorUrl = casinoUrl(finalCode);
      setText('#roomCodeDisplay', `Room: ${finalCode}`);
      setText('#inviteLinkDisplay', result.inviteLink || 'Joined table.');
      const open = $('#openCasinoBtn');
      if (open) open.href = floorUrl;
      setText('#multiTableStatus', isCasinoFloor() ? 'You are seated at the Casino Floor table.' : 'Joined same table. Pulling up to Casino Floor...');
      if (result.room && result.room.id) {
        await refresh(result.room.id);
        window.setInterval(() => refresh(result.room.id), 7000);
      }
      if (!isCasinoFloor() && !shouldStayLobby()) {
        window.setTimeout(() => {
          window.location.href = floorUrl;
        }, 1000);
      }
    } catch (error) {
      ensureStatusBox();
      setText('#multiTableStatus', error.message || 'Could not join invite table. Sign in, then reload invite link.');
    }
  }

  function boot() {
    if (!wantsJoin()) return;
    ensureStatusBox();
    const panel = $('.multiplayer-panel') || $('#casinoJoinStatusBox');
    if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (window.HWMultiplayerInvites) {
        window.clearInterval(timer);
        joinInvite();
      }
      if (attempts > 30) {
        window.clearInterval(timer);
        setText('#multiTableStatus', 'Invite detected. Sign in, then refresh this link.');
      }
    }, 500);
  }

  window.HWMultiplayerAutoJoin = { boot, joinInvite };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
