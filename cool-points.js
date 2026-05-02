/*
  HYPHSWORLD Cool Points
  Free client-side point system. Saves points in localStorage.
*/
(function () {
  const TOTAL_KEY = 'hyphsworld.coolPoints.total';
  const PROFILE_KEY = 'hyphsworld.coolPoints.profile';
  const OLD_KEYS = ['coolPoints','hyphsCoolPoints','hwCoolPoints','hyphsworldPoints','hyphsworld.coolpoints'];

  function safeGet(key){try{return localStorage.getItem(key)}catch(e){return null}}
  function safeSet(key,value){try{localStorage.setItem(key,String(value))}catch(e){}}
  function numberFrom(value){const parsed=parseInt(value,10);return Number.isFinite(parsed)&&parsed>0?parsed:0}

  function getProfileName(){
    const saved=safeGet('hyphsworld.playerName')||safeGet('hyphsworld.userName')||safeGet('hwPlayerName')||safeGet('playerName')||safeGet('username');
    return saved&&saved.trim()?saved.trim():'Guest';
  }

  function migrateOldPoints(){
    let current=numberFrom(safeGet(TOTAL_KEY));
    OLD_KEYS.forEach((key)=>{const oldValue=numberFrom(safeGet(key));if(oldValue>current)current=oldValue});
    safeSet(TOTAL_KEY,current);
    return current;
  }

  let points=migrateOldPoints();

  function saveProfile(){
    const profile={name:getProfileName(),points,updatedAt:new Date().toISOString()};
    safeSet(PROFILE_KEY,JSON.stringify(profile));
  }

  function toast(message){
    const el=document.getElementById('hw-toast');
    if(!el)return;
    el.textContent=message;
    el.classList.add('show');
    clearTimeout(window.__hwToastTimer);
    window.__hwToastTimer=setTimeout(()=>el.classList.remove('show'),2200);
  }

  function render(){
    document.querySelectorAll('.js-cool-points,[data-cool-points]').forEach((el)=>{el.textContent=points});
    const playerName=getProfileName();
    document.querySelectorAll('#hw-player-name,[data-player-name]').forEach((el)=>{el.textContent=playerName});
    const loginLink=document.getElementById('hw-login-link');
    if(loginLink&&playerName!=='Guest')loginLink.textContent=playerName;
    saveProfile();
  }

  function add(amount,reason){
    const n=numberFrom(amount);
    if(!n)return points;
    points+=n;
    safeSet(TOTAL_KEY,points);
    render();
    toast(`+${n} Cool Points saved${reason?' — '+reason:''}`);
    return points;
  }

  function spend(amount,reason){
    const n=numberFrom(amount);
    if(!n)return points;
    if(points<n){toast(`Need ${n} Cool Points. Current: ${points}`);return points}
    points-=n;
    safeSet(TOTAL_KEY,points);
    render();
    toast(`-${n} Cool Points spent${reason?' — '+reason:''}`);
    return points;
  }

  function set(value){
    points=numberFrom(value);
    safeSet(TOTAL_KEY,points);
    render();
    return points;
  }

  document.addEventListener('click',(event)=>{
    const addButton=event.target.closest('[data-point-add]');
    if(addButton){add(addButton.dataset.pointAdd,addButton.dataset.pointReason||'');return}
    const spendButton=event.target.closest('[data-point-spend]');
    if(spendButton)spend(spendButton.dataset.pointSpend,spendButton.dataset.pointReason||'');
  });

  window.HWPoints={get:()=>points,add,spend,set,render,profile:()=>{try{return JSON.parse(safeGet(PROFILE_KEY)||'{}')}catch(e){return {}}}};
  document.addEventListener('DOMContentLoaded',render);
  render();
})();
