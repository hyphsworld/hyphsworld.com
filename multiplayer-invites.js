(() => {
  'use strict';

  if (window.HWMultiplayerInvites) return;

  const PROJECT_URL = window.HW_SUPABASE_URL || 'https://yuhxtdkhsltaqiagrtys.supabase.co';
  const ANON_KEY = window.HW_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || '';
  let clientPromise = null;

  function makeCode(prefix = 'AMS') {
    return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  function basePath() {
    return `${location.origin}${location.pathname.replace(/[^/]*$/, '')}`;
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

  async function getUser() {
    if (window.HWAuth && typeof window.HWAuth.getCurrentUser === 'function') {
      const user = await window.HWAuth.getCurrentUser();
      if (user && (user.userId || user.id)) return { id: user.userId || user.id, displayName: user.displayName || user.username || 'Player' };
    }
    const sb = await getClient();
    const { data } = await sb.auth.getUser();
    if (!data || !data.user) throw new Error('Login required to create or join tables.');
    return { id: data.user.id, displayName: data.user.email || 'Player' };
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
    }).select('*').single();
    if (roomError) throw roomError;
    await sb.from('game_players').upsert({
      room_id: room.id,
      user_id: user.id,
      seat_number: 1,
      status: 'joined',
      score: 0,
      bet: 0
    }, { onConflict: 'room_id,user_id' });
    await sb.from('game_state').upsert({
      room_id: room.id,
      state: { mode: gameType, players: [user.id], createdFrom: 'hyphsworld_lobby' },
      version: 1,
      updated_by: user.id
    }, { onConflict: 'room_id' });
    const inviteCode = makeCode('INV');
    await sb.from('invites').insert({
      invite_code: inviteCode,
      invite_type: 'multiplayer',
      created_by: user.id,
      room_id: room.id,
      target_url: `games.html?room=${encodeURIComponent(room.room_code)}`,
      max_uses: 8,
      reward_points: 5,
      metadata: { gameType }
    });
    return {
      room,
      roomCode: room.room_code,
      inviteCode,
      inviteLink: `${basePath()}games.html?room=${encodeURIComponent(room.room_code)}&invite=${encodeURIComponent(inviteCode)}`
    };
  }

  async function joinTable(code) {
    const clean = String(code || '').trim().toUpperCase();
    if (!clean) throw new Error('Enter a room code first.');
    const sb = await getClient();
    const user = await getUser();
    const { data: room, error: roomError } = await sb.from('game_rooms').select('*').eq('room_code', clean).maybeSingle();
    if (roomError) throw roomError;
    if (!room) throw new Error('Room not found.');
    const { count } = await sb.from('game_players').select('id', { count: 'exact', head: true }).eq('room_id', room.id);
    await sb.from('game_players').upsert({
      room_id: room.id,
      user_id: user.id,
      seat_number: (count || 0) + 1,
      status: 'joined',
      score: 0,
      bet: 0
    }, { onConflict: 'room_id,user_id' });
    return {
      room,
      roomCode: room.room_code,
      inviteLink: `${basePath()}games.html?room=${encodeURIComponent(room.room_code)}`
    };
  }

  async function listPlayers(roomId) {
    const sb = await getClient();
    const { data, error } = await sb.from('game_players').select('id,user_id,seat_number,status,joined_at').eq('room_id', roomId).order('seat_number', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  window.HWMultiplayerInvites = { createTable, joinTable, listPlayers, copyText };
})();
