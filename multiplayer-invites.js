(() => {
  'use strict';

  if (window.HWMultiplayerInvites) return;

  const PROJECT_URL = window.HW_SUPABASE_URL || 'https://yuhxtdkhsltaqiagrtys.supabase.co';
  const ANON_KEY = window.HW_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || '';
  let clientPromise = null;
  let cachedUser = null;
  let cachedUserAt = 0;
  let authSyncStarted = false;

  function makeCode(prefix = 'AMS') {
    return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  function basePath() {
    return `${location.origin}${location.pathname.replace(/[^/]*$/, '')}`;
  }

  function casinoLink(roomCode, inviteCode = '') {
    const room = encodeURIComponent(roomCode || '');
    const invite = inviteCode ? `&invite=${encodeURIComponent(inviteCode)}` : '';
    return `${basePath()}games.html?room=${room}${invite}&join=1`;
  }

  function lobbyLink(roomCode, inviteCode = '') {
    const room = encodeURIComponent(roomCode || '');
    const invite = inviteCode ? `&invite=${encodeURIComponent(inviteCode)}` : '';
    return `${basePath()}vault.html?room=${room}${invite}&join=1&stay=1#multiplayer`;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
    return Promise.resolve();
  }

  function getClient() {
    if (clientPromise) return clientPromise;
    clientPromise = new Promise((resolve, reject) => {
      if (window.HWAuth && window.HWAuth.supabase) return resolve(window.HWAuth.supabase);
      if (window.supabase && ANON_KEY) return resolve(window.supabase.createClient(PROJECT_URL, ANON_KEY));
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => {
        if (!window.supabase || !ANON_KEY) reject(new Error('Supabase not configured.'));
        else resolve(window.supabase.createClient(PROJECT_URL, ANON_KEY));
      };
      script.onerror = () => reject(new Error('Supabase client failed to load.'));
      document.head.appendChild(script);
    });
    return clientPromise;
  }

  async function startAuthSync() {
    if (authSyncStarted) return;
    authSyncStarted = true;
    try {
      const sb = await getClient();
      if (sb && sb.auth && typeof sb.auth.onAuthStateChange === 'function') {
        sb.auth.onAuthStateChange(() => {
          cachedUser = null;
          cachedUserAt = 0;
        });
      }
    } catch (error) {}
  }

  async function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function getUser() {
    startAuthSync();
    if (cachedUser && (Date.now() - cachedUserAt) < 120000) return cachedUser;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (window.HWAuth && typeof window.HWAuth.getCurrentUser === 'function') {
        try {
          const user = await window.HWAuth.getCurrentUser();
          if (user && (user.userId || user.id)) {
            cachedUser = { id: user.userId || user.id, displayName: user.displayName || user.username || 'Player' };
            cachedUserAt = Date.now();
            return cachedUser;
          }
        } catch (error) {}
      }
      try {
        const sb = await getClient();
        const { data } = await sb.auth.getUser();
        if (data && data.user) {
          cachedUser = { id: data.user.id, displayName: data.user.email || 'Player' };
          cachedUserAt = Date.now();
          return cachedUser;
        }
      } catch (error) {}
      await delay(250);
    }
    throw new Error('Login required to create or join tables.');
  }

  async function createTable(gameType = 'blackjack') {
    const sb = await getClient();
    const user = await getUser();
    const roomCode = makeCode('AMS');
    const { data: room, error: roomError } = await sb.from('game_rooms').insert({
      room_code: roomCode,
      game_type: gameType,
      host_id: user.id,
      status: 'waiting',
      max_players: 4
    }).select('id,room_code,game_type,status,max_players,host_id').single();
    if (roomError) throw roomError;

    const { data: existingHost } = await sb.from('game_players').select('*').eq('room_id', room.id).eq('user_id', user.id).maybeSingle();
    if (!existingHost) {
      const { error: playerError } = await sb.from('game_players').insert({
        room_id: room.id,
        user_id: user.id,
        seat_number: 1,
        status: 'joined',
        score: 0,
        bet: 0
      });
      if (playerError) throw playerError;
    }

    await sb.from('game_state').upsert({
      room_id: room.id,
      state: { mode: gameType, players: [user.id], createdFrom: 'hyphsworld_lobby' },
      version: 1,
      updated_by: user.id
    }, { onConflict: 'room_id' });

    const inviteCode = makeCode('INV');
    const directLink = casinoLink(room.room_code, inviteCode);
    await sb.from('invites').insert({
      invite_code: inviteCode,
      invite_type: 'multiplayer',
      created_by: user.id,
      room_id: room.id,
      target_url: `games.html?room=${encodeURIComponent(room.room_code)}&invite=${encodeURIComponent(inviteCode)}&join=1`,
      max_uses: 8,
      reward_points: 5,
      metadata: { gameType, directJoin: true }
    });

    return {
      room,
      roomCode: room.room_code,
      inviteCode,
      inviteLink: directLink,
      fallbackLobbyLink: lobbyLink(room.room_code, inviteCode)
    };
  }

  async function joinTable(code) {
    const clean = String(code || '').trim().toUpperCase();
    if (!clean) throw new Error('Enter a room code first.');
    const sb = await getClient();
    const user = await getUser();
    const { data: room, error: roomError } = await sb.from('game_rooms').select('id,room_code,game_type,status,max_players,host_id').eq('room_code', clean).maybeSingle();
    if (roomError) throw roomError;
    if (!room) throw new Error('Room not found.');

    const { data: existingPlayer, error: existingError } = await sb.from('game_players').select('*').eq('room_id', room.id).eq('user_id', user.id).maybeSingle();
    if (existingError) throw existingError;
    if (!existingPlayer && Number(room.max_players || 0) > 0) {
      const { count: seatCount } = await sb.from('game_players').select('id', { count: 'exact', head: true }).eq('room_id', room.id);
      if (Number(seatCount || 0) >= Number(room.max_players)) throw new Error('Room is full. Try another table code.');
    }

    if (!existingPlayer) {
      const { data: players } = await sb.from('game_players').select('seat_number').eq('room_id', room.id).order('seat_number', { ascending: true });
      const taken = new Set((players || []).map((player) => Number(player.seat_number || 0)));
      let seatNumber = 1;
      while (taken.has(seatNumber)) seatNumber += 1;
      const { error: insertError } = await sb.from('game_players').insert({
        room_id: room.id,
        user_id: user.id,
        seat_number: seatNumber,
        status: 'joined',
        score: 0,
        bet: 0
      });
      if (insertError) throw insertError;
    }

    try {
      await sb.from('game_rooms').update({ status: 'playing', updated_at: new Date().toISOString() }).eq('id', room.id);
    } catch (error) {}

    return {
      room,
      roomCode: room.room_code,
      inviteLink: casinoLink(room.room_code)
    };
  }

  async function listPlayers(roomId) {
    const sb = await getClient();
    const { data, error } = await sb.from('game_players').select('id,user_id,seat_number,status,joined_at').eq('room_id', roomId).order('seat_number', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  window.HWMultiplayerInvites = { createTable, joinTable, listPlayers, copyText, lobbyLink, casinoLink };
})();
