/* HYPHSWORLD Global Cool Points Engine
   One account. One balance. Every page.
   Highest known balance wins so old profile values cannot overwrite newly earned points.
*/
(function () {
  'use strict';

  if (window.HWPoints && window.HWPoints.__globalEngineV2) return;

  const POINT_EVENTS = ['hw:points-ready', 'hw:points-change', 'hyph:points-updated'];
  const STORAGE_KEY = 'hyphsworld.coolPoints.total';
  const GUEST_KEY = 'hyphsworld.coolPoints.guestSession';
  const LEGACY_KEYS = ['coolPoints', 'hyphsworld_points', 'HW_COOL_POINTS'];
  const SUPABASE_URL = window.HW_SUPABASE_URL || 'https://yuhxtdkhsltaqiagrtys.supabase.co';
  const SUPABASE_ANON_KEY = window.HW_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || '';

  let state = { ready:false,user:null,profile:null,points:0,lifetimePoints:0,rankTitle:'Guest',avatarIcon:'🧢',source:'local' };
  let supabaseClient = null;
  let pendingQueue = [];
  let refreshTimer = null;

  function scheduleLiveRefresh(){
    if (refreshTimer) return;
    refreshTimer = window.setInterval(()=>{
      if (document.hidden) return;
      refresh();
    }, 12000);
  }

  function number(value){ const n=Number(value||0); return Number.isFinite(n)?Math.max(0,Math.floor(n)):0; }
  function emit(name){
    const snapshot = getState();
    window.dispatchEvent(new CustomEvent(name,{detail:snapshot}));
    if (name === 'hw:points-change') {
      document.dispatchEvent(new CustomEvent('hyph:points-updated', { detail: { points: snapshot.points, source: snapshot.source, profile: snapshot.profile || null } }));
    }
  }
  function getState(){ return Object.assign({},state); }

  function getLocalPoints(){
    const values=[
      localStorage.getItem(STORAGE_KEY),
      localStorage.getItem(GUEST_KEY),
      sessionStorage.getItem(GUEST_KEY)
    ].concat(LEGACY_KEYS.map((key)=>localStorage.getItem(key)));
    return values.reduce((max,value)=>Math.max(max,number(value)),0);
  }

  function setLocalPoints(points){
    const value=String(number(points));
    localStorage.setItem(STORAGE_KEY,value);
    localStorage.setItem(GUEST_KEY,value);
    sessionStorage.setItem(GUEST_KEY,value);
    localStorage.setItem('coolPoints',value);
    localStorage.setItem('hyphsworld_points',value);
    localStorage.setItem('HW_COOL_POINTS',value);
  }

  function getSupabase(){
    if (window.HWAuth && window.HWAuth.supabase) return window.HWAuth.supabase;
    if (window.supabase && SUPABASE_ANON_KEY) {
      if (!supabaseClient) supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return supabaseClient;
    }
    return null;
  }

  async function getCurrentUser(){
    if (window.HWAuth && typeof window.HWAuth.getCurrentUser === 'function') {
      try { const user=await window.HWAuth.getCurrentUser(); if(user&&(user.userId||user.id)) return user; } catch(error) {}
    }
    if (window.HWAuth && typeof window.HWAuth.getSession === 'function') {
      try { const session=await window.HWAuth.getSession(); const user=session&&(session.user||session.data?.user); if(user) return {userId:user.id,id:user.id,email:user.email||''}; } catch(error) {}
    }
    const client=getSupabase();
    if (client && client.auth && typeof client.auth.getUser === 'function') {
      try { const { data } = await client.auth.getUser(); if(data && data.user) return {userId:data.user.id,id:data.user.id,email:data.user.email||''}; } catch(error) {}
    }
    return null;
  }

  async function fetchProfile(user){
    if(!user) return null;
    if (window.HWAuth && typeof window.HWAuth.getProfile === 'function') {
      try { const profile=await window.HWAuth.getProfile(); if(profile) return profile; } catch(error) {}
    }
    const client=getSupabase();
    if(client){
      try { const id=user.userId||user.id; const {data}=await client.from('profiles').select('*').eq('id',id).maybeSingle(); return data||null; } catch(error) {}
    }
    return null;
  }

  async function pushAccountPoints(points, reason){
    const next = number(points);
    if (window.HWAuth && typeof window.HWAuth.setPoints === 'function') {
      try { await window.HWAuth.setPoints(next, reason || 'global_highest_balance_sync'); } catch(error) {}
    }
    return next;
  }

  function render(){
    const pointsText=number(state.points).toLocaleString();
    const rank=state.rankTitle||(state.user?'Lobby Rookie':'Guest');
    const avatar=state.avatarIcon||'🧢';
    document.querySelectorAll('[data-hw-points], #cool-points, #gateCredits, #wof-points, .js-cool-points, [data-cool-points], #accountCoolPoints').forEach((el)=>{ el.textContent=pointsText; });
    document.querySelectorAll('[data-hw-rank]').forEach((el)=>{ el.textContent=rank; });
    document.querySelectorAll('[data-hw-avatar]').forEach((el)=>{ el.textContent=avatar; });
    document.querySelectorAll('[data-hw-user-state]').forEach((el)=>{ el.textContent=state.user?'LIVE ID':'GUEST'; });
    let hud=document.getElementById('hwGlobalPointsHud');
    if(!hud){ hud=document.createElement('aside'); hud.id='hwGlobalPointsHud'; hud.innerHTML='<div class="hwgp-icon" data-hw-avatar>🧢</div><div><strong data-hw-points>0</strong><span>Cool Points</span></div><small data-hw-rank>Guest</small>'; document.body.appendChild(hud); }
    hud.querySelector('[data-hw-avatar]').textContent=avatar;
    hud.querySelector('[data-hw-points]').textContent=pointsText;
    hud.querySelector('[data-hw-rank]').textContent=rank;
    hud.classList.toggle('is-live',Boolean(state.user));
  }

  function injectStyles(){
    if(document.getElementById('hwGlobalPointsHudStyles')) return;
    const style=document.createElement('style'); style.id='hwGlobalPointsHudStyles';
    style.textContent='#hwGlobalPointsHud{position:fixed;right:14px;bottom:14px;z-index:9999;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 28px);padding:10px 12px;border:1px solid rgba(69,255,54,.32);border-radius:18px;background:rgba(0,0,0,.78);backdrop-filter:blur(12px);box-shadow:0 0 24px rgba(69,255,54,.16),0 12px 32px rgba(0,0,0,.36);color:#fff;font-family:Arial,Helvetica,sans-serif}.hwgp-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:999px;background:linear-gradient(135deg,#39ff7a,#1ffcff,#ff4fd8);color:#050505;font-weight:1000}#hwGlobalPointsHud strong{display:block;font-size:1.05rem;color:#39ff7a;line-height:1}#hwGlobalPointsHud span{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:#d8ffe5;font-weight:900}#hwGlobalPointsHud small{padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.08);color:#ffe45c;font-size:.66rem;font-weight:900;white-space:nowrap}#hwGlobalPointsHud.is-live{border-color:rgba(31,252,255,.38);box-shadow:0 0 24px rgba(31,252,255,.16),0 12px 32px rgba(0,0,0,.36)}@media(max-width:640px){#hwGlobalPointsHud{left:10px;right:10px;bottom:10px;justify-content:center;border-radius:16px;padding:9px 10px}#hwGlobalPointsHud small{display:none}}';
    document.head.appendChild(style);
  }

  async function refresh(){
    injectStyles();
    const localPoints=getLocalPoints();
    const user=await getCurrentUser();
    const profile=await fetchProfile(user);
    if(user && profile){
      const remotePoints = number(profile.points);
      const bestPoints = Math.max(localPoints, remotePoints);
      const lifetime = Math.max(number(profile.lifetime_points), bestPoints);
      if (bestPoints > remotePoints) await pushAccountPoints(bestPoints, 'recover_higher_local_points');
      state={ready:true,user,profile,points:bestPoints,lifetimePoints:lifetime,rankTitle:profile.rank_title||'Lobby Rookie',avatarIcon:profile.avatar_icon||'🧢',source:'supabase_highest_wins'};
      scheduleLiveRefresh();
      setLocalPoints(state.points);
    } else {
      state={ready:true,user:null,profile:null,points:localPoints,lifetimePoints:localPoints,rankTitle:'Guest',avatarIcon:'🧢',source:'device_saved'};
      setLocalPoints(localPoints);
    }
    render(); emit(POINT_EVENTS[0]); emit(POINT_EVENTS[1]); return getState();
  }

  async function add(amount,reason,metadata){
    const delta=Math.floor(Number(amount||0)); if(!delta) return getState();
    if(!state.ready){ pendingQueue.push({amount:delta,reason,metadata}); }

    const base = Math.max(number(state.points), getLocalPoints());
    const target = Math.max(0, base + delta);
    setLocalPoints(target);

    if(state.user && window.HWAuth && typeof window.HWAuth.addPoints==='function'){
      try{
        const saved = number(await window.HWAuth.addPoints(delta,reason||'site_action',metadata||{}));
        const best = Math.max(saved, target, getLocalPoints());
        if (best > saved) await pushAccountPoints(best, reason || 'site_action_recovery');
        setLocalPoints(best);
        return refresh();
      }catch(error){}
    }
    state.points=target; state.lifetimePoints=Math.max(number(state.lifetimePoints),target); render(); emit(POINT_EVENTS[1]); return getState();
  }
  async function spend(amount,reason,metadata){ return add(-Math.abs(Number(amount||0)),reason||'spend',metadata||{}); }

  async function flushPending(){
    if(!pendingQueue.length || !state.ready) return;
    const queue=pendingQueue.slice(); pendingQueue=[];
    for(const item of queue){ await add(item.amount,item.reason,item.metadata); }
  }

  function get(){ return Math.max(number(state.points), getLocalPoints()); }

  window.HWPoints={__globalEngineV2:true,refresh,add,spend,get,getState,render};
  document.addEventListener('hyph:points:add',(event)=>{ const detail=event.detail||{}; add(detail.amount||detail.points||0,detail.reason||'lobby_event',detail.metadata||{}); });
  document.addEventListener('hw:points:add',(event)=>{ const detail=event.detail||{}; add(detail.amount||detail.points||0,detail.reason||'site_event',detail.metadata||{}); });
  document.addEventListener('DOMContentLoaded',async()=>{ await refresh(); flushPending(); });
  window.addEventListener('load',async()=>{ await refresh(); flushPending(); });
  window.addEventListener('storage',(event)=>{ if([STORAGE_KEY,'coolPoints',GUEST_KEY,'hyphsworld_points','HW_COOL_POINTS'].includes(event.key)) refresh(); });
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) refresh(); });
  window.addEventListener('focus',refresh);
})();
