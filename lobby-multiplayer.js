(() => {
  'use strict';

  const SUPABASE_CONFIG_FILE = 'supabase-config.js';
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

  let supabaseClientPromise = null;
  let lobbyUser = null;
  let activeRoom = null;
  let activePlayers = [];
  let activeState = null;
  let roomChannel = null;

  const $ = (selector, root = document) => root.querySelector(selector);

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find((script) => script.src && script.src.includes(src));
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        setTimeout(resolve, 250);
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

  function configReady(config) {
    const url = String(config?.url || '').trim();
    const anonKey = String(config?.anonKey || config?.anon_key || '').trim();
    return Boolean(url && anonKey && !/PASTE_|YOUR_|PROJECT_URL|ANON_PUBLIC_KEY/i.test(url + anonKey));
  }

  async function getSupabaseClient() {
    if (supabaseClientPromise) return supabaseClientPromise;

    supabaseClientPromise = (async () => {
      if (!window.HW_SUPABASE_CONFIG) await loadScript(SUPABASE_CONFIG_FILE);
      const config = window.HW_SUPABASE_CONFIG || {};
      if (!configReady(config)) throw new Error('Supabase is not configured.');
      if (!window.supabase || !window.supabase.createClient) await loadScript(SUPABASE_CDN);
      if (!window.supabase || !window.supabase.createClient) throw new Error('Supabase client did not load.');

      return window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    })();

    return supabaseClientPromise;
  }

  async function getLobbyUser() {
    if (window.HWAuth && typeof window.HWAuth.getCurrentUser === 'function') {
      const user = await window.HWAuth.getCurrentUser().catch(() => null);
      if (user && user.userId) return user;
    }

    const sb = await getSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data?.user) return null;

    return {
      userId: data.user.id,
      email: data.user.email || '',
      displayName: data.user.user_metadata?.displayName || (data.user.email || 'Player').split('@')[0]
    };
  }

  function injectStyles() {
    if (document.getElementById('hwLobbyMultiplayerStyles')) return;

    const style = document.createElement('style');
    style.id = 'hwLobbyMultiplayerStyles';
    style.textContent = `
      .hw-multi-card{
        width:min(1180px,calc(100% - 28px));
        margin:26px auto 0;
        border:1px solid rgba(255,255,255,.18);
        border-radius:30px;
        padding:22px;
        color:#fff;
        background:
          radial-gradient(circle at 16% 14%,rgba(57,255,122,.22),transparent 30%),
          radial-gradient(circle at 82% 16%,rgba(31,252,255,.20),transparent 32%),
          radial-gradient(circle at 54% 110%,rgba(255,39,93,.18),transparent 40%),
          linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.035));
        box-shadow:0 0 34px rgba(57,255,122,.16), inset 0 0 34px rgba(31,252,255,.05);
        position:relative;
        overflow:hidden;
      }
      .hw-multi-card:before{
        content:"";
        position:absolute;
        inset:-40%;
        background:conic-gradient(from 0deg,transparent,rgba(57,255,122,.13),transparent,rgba(255,39,93,.13),transparent,rgba(31,252,255,.13),transparent);
        animation:hwMultiSpin 12s linear infinite;
      }
      .hw-multi-card>*{position:relative;z-index:1}
      .hw-multi-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
      .hw-multi-badge{display:inline-flex;border-radius:999px;padding:8px 12px;color:#050505;background:linear-gradient(90deg,#39ff7a,#1ffcff,#ffe45c,#ff275d);font-size:.74rem;font-weight:1000;letter-spacing:.08em;text-transform:uppercase}
      .hw-multi-head h2{margin:8px 0 8px;font-size:clamp(2rem,7vw,4.6rem);line-height:.88;letter-spacing:-.06em;text-transform:uppercase}
      .hw-multi-head p{margin:0;color:#d9efe5;line-height:1.45;font-weight:800;max-width:760px}
      .hw-multi-status{border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:12px 14px;background:rgba(0,0,0,.38);font-weight:1000;color:#fff;min-width:min(100%,280px)}
      .hw-multi-grid{display:grid;grid-template-columns:1fr 1.15fr;gap:16px;margin-top:18px}
      @media(max-width:860px){.hw-multi-grid{grid-template-columns:1fr}}
      .hw-multi-panel{border:1px solid rgba(255,255,255,.14);border-radius:24px;padding:16px;background:rgba(0,0,0,.36);box-shadow:inset 0 0 22px rgba(31,252,255,.06)}
      .hw-multi-panel h3{margin:0 0 10px;font-size:1.35rem}
      .hw-multi-note{margin:0;color:#b9c9c3;line-height:1.45;font-weight:750}
      .hw-multi-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
      .hw-multi-input{flex:1;min-width:170px;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:13px 15px;background:#050505;color:#fff;font-weight:1000;outline:none;text-transform:uppercase}
      .hw-multi-btn{border:0;border-radius:999px;padding:12px 15px;font-weight:1000;cursor:pointer;color:#050505;background:linear-gradient(90deg,#39ff7a,#1ffcff,#ffe45c)}
      .hw-multi-btn.hot{color:#fff;background:linear-gradient(90deg,#ff275d,#b84dff)}
      .hw-multi-btn.soft{color:#fff;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.10)}
      .hw-multi-btn:disabled{opacity:.55;cursor:not-allowed}
      .hw-room-code{display:inline-flex;align-items:center;gap:8px;margin:12px 0 0;border-radius:999px;padding:10px 12px;background:#050505;border:1px solid rgba(57,255,122,.32);color:#39ff7a;font-weight:1000;letter-spacing:.08em}
      .hw-player-list{display:grid;gap:9px;margin-top:12px}
      .hw-player{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:10px 12px;background:rgba(255,255,255,.055);font-weight:900}
      .hw-player span{color:#9fffd0;font-size:.82rem}
      .hw-race-board{display:grid;gap:12px}
      .hw-race-meter{height:18px;border:1px solid rgba(255,255,255,.14);border-radius:999px;overflow:hidden;background:rgba(0,0,0,.52)}
      .hw-race-meter span{display:block;height:100%;width:0%;border-radius:inherit;background:linear-gradient(90deg,#39ff7a,#1ffcff,#ffe45c,#ff275d);transition:width .18s ease}
      .hw-race-score{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;color:#d9efe5;font-weight:900}
      .hw-race-button{width:100%;min-height:92px;border:0;border-radius:24px;color:#050505;background:linear-gradient(135deg,#39ff7a,#1ffcff,#ffe45c,#ff275d);font-size:clamp(1.8rem,7vw,4.2rem);font-weight:1000;letter-spacing:-.05em;cursor:pointer;box-shadow:0 0 30px rgba(57,255,122,.24)}
      .hw-log{max-height:150px;overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:10px;background:rgba(0,0,0,.30);color:#d9efe5;font-size:.9rem;line-height:1.35}
      .hw-log div+div{margin-top:6px}
      @keyframes hwMultiSpin{to{transform:rotate(360deg)}}
    `;
    document.head.appendChild(style);
  }

  function injectPanel() {
    if (document.getElementById('hwLobbyMultiplayer')) return;
    injectStyles();

    const arcade = document.querySelector('.gate-arcade');
    if (!arcade || !arcade.parentNode) return;

    const panel = document.createElement('section');
    panel.id = 'hwLobbyMultiplayer';
    panel.className = 'hw-multi-card';
    panel.setAttribute('aria-label', 'HYPHSWORLD multiplayer lobby games');
    panel.innerHTML = `
      <div class="hw-multi-head">
        <div>
          <span class="hw-multi-badge">LIVE MULTIPLAYER // SUPABASE</span>
          <h2>Lobby Games</h2>
          <p>Create a room, share the room code, and race to 01 with logged-in players. Solo arcade stays above for everybody.</p>
        </div>
        <div id="hwMultiStatus" class="hw-multi-status">Checking login…</div>
      </div>

      <div class="hw-multi-grid">
        <article class="hw-multi-panel">
          <h3>Room Control</h3>
          <p class="hw-multi-note">Logged-in players can create or join live rooms. Room codes are public in the lobby, but points stay tied to accounts.</p>
          <div class="hw-multi-actions">
            <button id="hwCreateRoom" class="hw-multi-btn" type="button">Create Room</button>
            <input id="hwJoinCode" class="hw-multi-input" placeholder="ROOM CODE" autocomplete="off" />
            <button id="hwJoinRoom" class="hw-multi-btn hot" type="button">Join</button>
          </div>
          <div id="hwRoomCode" class="hw-room-code" hidden>ROOM: ----</div>
          <div id="hwPlayerList" class="hw-player-list"></div>
        </article>

        <article class="hw-multi-panel hw-race-board">
          <h3>01 Tap Race</h3>
          <p class="hw-multi-note">Fast lobby game: tap the big button to push your room score to 01. First player to 10 taps wins the round.</p>
          <div class="hw-race-score">
            <span id="hwRaceRound">Round: waiting</span>
            <span id="hwRaceLeader">Leader: —</span>
          </div>
          <div class="hw-race-meter"><span id="hwRaceMeter"></span></div>
          <button id="hwTapRace" class="hw-race-button" type="button">TAP 01</button>
          <div class="hw-multi-actions">
            <button id="hwStartRace" class="hw-multi-btn" type="button">Start Round</button>
            <button id="hwResetRace" class="hw-multi-btn soft" type="button">Reset</button>
          </div>
          <div id="hwRaceLog" class="hw-log"><div>Duck Sauce: “Create a room first, P.”</div></div>
        </article>
      </div>
    `;

    arcade.parentNode.insertBefore(panel, arcade.nextSibling);
  }

  function setStatus(message) {
    const el = $('#hwMultiStatus');
    if (el) el.textContent = message;
  }

  function log(message) {
    const el = $('#hwRaceLog');
    if (!el) return;
    const line = document.createElement('div');
    line.textContent = message;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  function codeFromRoom(room) {
    return String(room?.room_code || '').toUpperCase();
  }

  function playerName(player) {
    if (!player) return 'Player';
    if (player.user_id === lobbyUser?.userId) return 'YOU';
    return 'PLAYER ' + String(player.seat_number || '?');
  }

  async function addReward(points, reason) {
    if (!points) return;
    if (window.HWPoints && typeof window.HWPoints.add === 'function') {
      try { await window.HWPoints.add(points, reason || 'Lobby multiplayer'); return; } catch (error) {}
    }
    if (window.HWAuth && typeof window.HWAuth.addPoints === 'function') {
      try { await window.HWAuth.addPoints(points, reason || 'Lobby multiplayer'); } catch (error) {}
    }
  }

  async function ensureReady() {
    try {
      lobbyUser = await getLobbyUser();
      if (!lobbyUser) {
        setStatus('Login required for multiplayer rooms.');
        return false;
      }
      setStatus('Logged in: ' + (lobbyUser.displayName || lobbyUser.email || 'Player'));
      return true;
    } catch (error) {
      setStatus('Multiplayer connection failed. Refresh and try again.');
      return false;
    }
  }

  function currentRaceState() {
    const state = activeState?.state || {};
    if (!state.race) {
      state.race = { phase: 'waiting', scores: {}, target: 10, winner: null, round: 0, log: [] };
    }
    if (!state.race.scores) state.race.scores = {};
    if (!state.race.log) state.race.log = [];
    return state;
  }

  function renderPlayers() {
    const list = $('#hwPlayerList');
    if (!list) return;

    if (!activePlayers.length) {
      list.innerHTML = '<div class="hw-player"><strong>No players yet</strong><span>Waiting</span></div>';
      return;
    }

    const race = currentRaceState().race;
    list.innerHTML = activePlayers.map((player) => {
      const score = Number(race.scores[player.user_id] || 0);
      const crown = player.user_id === activeRoom?.host_id ? ' 👑' : '';
      return `<div class="hw-player"><strong>${playerName(player)}${crown}</strong><span>${player.status || 'joined'} · ${score}/10</span></div>`;
    }).join('');
  }

  function renderRace() {
    const race = currentRaceState().race;
    const scores = race.scores || {};
    const entries = Object.entries(scores).sort((a, b) => Number(b[1]) - Number(a[1]));
    const leaderId = entries[0]?.[0];
    const leaderScore = Number(entries[0]?.[1] || 0);
    const leaderPlayer = activePlayers.find((player) => player.user_id === leaderId);
    const target = Number(race.target || 10);
    const myScore = Number(scores[lobbyUser?.userId] || 0);

    const roomCode = $('#hwRoomCode');
    const meter = $('#hwRaceMeter');
    const round = $('#hwRaceRound');
    const leader = $('#hwRaceLeader');
    const tap = $('#hwTapRace');
    const start = $('#hwStartRace');
    const reset = $('#hwResetRace');

    if (roomCode && activeRoom) {
      roomCode.hidden = false;
      roomCode.textContent = 'ROOM: ' + codeFromRoom(activeRoom);
    }

    if (meter) meter.style.width = Math.min(100, (myScore / target) * 100) + '%';
    if (round) round.textContent = 'Round: ' + (race.phase || 'waiting') + ' #' + Number(race.round || 0);
    if (leader) leader.textContent = leaderId ? `Leader: ${playerName(leaderPlayer)} ${leaderScore}/${target}` : 'Leader: —';

    const inRoom = Boolean(activeRoom && lobbyUser);
    const playing = race.phase === 'playing' && !race.winner;
    if (tap) tap.disabled = !inRoom || !playing;
    if (start) start.disabled = !inRoom;
    if (reset) reset.disabled = !inRoom;

    renderPlayers();
  }

  async function refreshRoom() {
    if (!activeRoom) return;
    const sb = await getSupabaseClient();

    const { data: room } = await sb.from('game_rooms').select('*').eq('id', activeRoom.id).maybeSingle();
    if (room) activeRoom = room;

    const { data: players } = await sb.from('game_players').select('*').eq('room_id', activeRoom.id).order('joined_at', { ascending: true });
    activePlayers = players || [];

    const { data: state } = await sb.from('game_state').select('*').eq('room_id', activeRoom.id).maybeSingle();
    activeState = state || null;

    renderRace();
  }

  async function subscribeRoom() {
    if (!activeRoom) return;
    const sb = await getSupabaseClient();
    if (roomChannel) await sb.removeChannel(roomChannel);

    roomChannel = sb.channel('hw-lobby-room-' + activeRoom.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: 'id=eq.' + activeRoom.id }, refreshRoom)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: 'room_id=eq.' + activeRoom.id }, refreshRoom)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state', filter: 'room_id=eq.' + activeRoom.id }, refreshRoom)
      .subscribe();
  }

  async function saveState(nextState) {
    if (!activeRoom || !lobbyUser) return;
    const sb = await getSupabaseClient();
    const nextVersion = Number(activeState?.version || 0) + 1;
    const payload = {
      room_id: activeRoom.id,
      state: nextState,
      version: nextVersion,
      updated_by: lobbyUser.userId,
      updated_at: new Date().toISOString()
    };
    await sb.from('game_state').upsert(payload, { onConflict: 'room_id' });
    activeState = payload;
    renderRace();
  }

  async function createRoom() {
    if (!(await ensureReady())) return;
    const sb = await getSupabaseClient();
    setStatus('Creating lobby room…');

    const { data: room, error } = await sb.from('game_rooms').insert({
      game_type: 'tap_race',
      host_id: lobbyUser.userId,
      status: 'waiting',
      max_players: 8
    }).select('*').single();

    if (error || !room) {
      setStatus(error?.message || 'Room create failed.');
      return;
    }

    await sb.from('game_players').insert({
      room_id: room.id,
      user_id: lobbyUser.userId,
      seat_number: 1,
      status: 'joined',
      score: 0,
      bet: 0
    });

    await sb.from('game_state').insert({
      room_id: room.id,
      state: { race: { phase: 'waiting', scores: {}, target: 10, winner: null, round: 0, log: ['Room created.'] } },
      updated_by: lobbyUser.userId
    });

    activeRoom = room;
    setStatus('Room ' + codeFromRoom(room) + ' created. Share the code.');
    log('Room created. Duck Sauce says send the code to the squad.');
    await refreshRoom();
    await subscribeRoom();
  }

  async function joinRoom() {
    if (!(await ensureReady())) return;
    const input = $('#hwJoinCode');
    const roomCode = String(input?.value || '').trim().toUpperCase();
    if (!roomCode) {
      setStatus('Enter a room code first.');
      return;
    }

    const sb = await getSupabaseClient();
    setStatus('Joining room ' + roomCode + '…');

    const { data: room, error } = await sb.from('game_rooms').select('*').eq('room_code', roomCode).in('status', ['waiting', 'playing']).maybeSingle();
    if (error || !room) {
      setStatus('Room not found or already closed.');
      return;
    }

    const { data: existing } = await sb.from('game_players').select('*').eq('room_id', room.id).eq('user_id', lobbyUser.userId).maybeSingle();
    if (!existing) {
      const { data: players } = await sb.from('game_players').select('id').eq('room_id', room.id);
      await sb.from('game_players').insert({
        room_id: room.id,
        user_id: lobbyUser.userId,
        seat_number: (players || []).length + 1,
        status: 'joined',
        score: 0,
        bet: 0
      });
    }

    activeRoom = room;
    if (input) input.value = '';
    setStatus('Joined room ' + roomCode + '.');
    log('Joined room ' + roomCode + '.');
    await refreshRoom();
    await subscribeRoom();
  }

  async function startRound() {
    if (!activeRoom || !lobbyUser) {
      log('Create or join a room first.');
      return;
    }

    await refreshRoom();
    const race = currentRaceState().race;
    const scores = {};
    activePlayers.forEach((player) => { scores[player.user_id] = 0; });

    const nextState = {
      race: {
        phase: 'playing',
        scores,
        target: 10,
        winner: null,
        round: Number(race.round || 0) + 1,
        log: ['New 01 Tap Race started.']
      }
    };

    await saveState(nextState);
    log('New 01 Tap Race started. First to 10 taps wins.');
  }

  async function resetRound() {
    if (!activeRoom || !lobbyUser) return;
    const race = currentRaceState().race;
    await saveState({
      race: {
        phase: 'waiting',
        scores: {},
        target: 10,
        winner: null,
        round: Number(race.round || 0),
        log: ['Round reset.']
      }
    });
    log('Round reset.');
  }

  async function tapRace() {
    if (!activeRoom || !lobbyUser) {
      log('Create or join a room first.');
      return;
    }

    const state = currentRaceState();
    const race = state.race;
    if (race.phase !== 'playing' || race.winner) return;

    const target = Number(race.target || 10);
    const current = Number(race.scores[lobbyUser.userId] || 0);
    const next = current + 1;
    race.scores[lobbyUser.userId] = next;

    if (next >= target) {
      race.winner = lobbyUser.userId;
      race.phase = 'finished';
      race.log.push((lobbyUser.displayName || 'Player') + ' won the round.');
      log('You won the round. +20 Cool Points.');
      await addReward(20, '01 Tap Race win');
    }

    await saveState(state);
  }

  function bind() {
    const create = $('#hwCreateRoom');
    const join = $('#hwJoinRoom');
    const start = $('#hwStartRace');
    const reset = $('#hwResetRace');
    const tap = $('#hwTapRace');

    if (create) create.addEventListener('click', createRoom);
    if (join) join.addEventListener('click', joinRoom);
    if (start) start.addEventListener('click', startRound);
    if (reset) reset.addEventListener('click', resetRound);
    if (tap) tap.addEventListener('click', tapRace);

    ensureReady().then(renderRace);
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectPanel();
    bind();
    window.HYPHSWORLD_LOBBY_MULTIPLAYER_LIVE = true;
  });
})();
