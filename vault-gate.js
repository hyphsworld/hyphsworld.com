(function(){
  const STORAGE = {
    master: 'hyphsworld_vault_master_unlocked',
    level1: 'hyphsworld_vault_level_1_unlocked',
    level2: 'hyphsworld_vault_level_2_unlocked'
  };

  const cards = Array.from(document.querySelectorAll('[data-level]'));
  const badges = {
    master: document.getElementById('gateBadgeMaster'),
    level1: document.getElementById('gateBadgeLevel1'),
    level2: document.getElementById('gateBadgeLevel2')
  };

  const safeSet = (k,v)=>{try{localStorage.setItem(k,v);}catch(_){}};
  const safeRemove = (k)=>{try{localStorage.removeItem(k);}catch(_){}};

  function setUnlocked(level, isUnlocked){
    const card = cards.find((el)=>el.dataset.level===level);
    if (!card) return;
    const state = card.querySelector('[data-role="state"]');
    const msg = card.querySelector('[data-role="message"]');
    const links = card.querySelector('[data-role="links"]');
    if (state){
      state.textContent = isUnlocked ? 'Unlocked' : 'Locked';
      state.classList.toggle('unlocked', isUnlocked);
      state.classList.toggle('locked', !isUnlocked);
    }
    if (links) links.hidden = !isUnlocked;
    if (badges[level]) {
      const label = level === 'master' ? 'Master' : level === 'level1' ? 'Level 1' : 'Level 2';
      badges[level].textContent = `${label} ${isUnlocked ? 'Unlocked' : 'Locked'}`;
      badges[level].classList.toggle('on', isUnlocked);
      badges[level].classList.toggle('off', !isUnlocked);
    }
    if (isUnlocked && level === 'level2') {
      card.classList.add('is-unlocked');
      if (msg) msg.textContent = 'FALCON lane open. Futuristic smoke sequence active.';
    } else if (level === 'level2') {
      card.classList.remove('is-unlocked');
    }
  }

  function rememberUnlocked(level){
    safeSet(STORAGE[level], 'true');
    setUnlocked(level, true);
  }

  function clearRememberedUnlocks(){
    Object.values(STORAGE).forEach(safeRemove);
    setUnlocked('master', false);
    setUnlocked('level1', false);
    setUnlocked('level2', false);
  }

  async function getClient(){
    if (!window.HWAuth || typeof window.HWAuth.getClient !== 'function') return null;
    return window.HWAuth.getClient();
  }

  async function syncServerUnlocks(){
    const sb = await getClient();
    if (!sb) { clearRememberedUnlocks(); return false; }
    const { data: sessionData } = await sb.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) { clearRememberedUnlocks(); return false; }

    const { data, error } = await sb.from('vault_unlocks').select('level_key').eq('user_id', user.id);
    if (error) { console.warn('Vault access sync warning:', error.message); return true; }
    const levels = new Set((data || []).map((row)=>row.level_key));
    setUnlocked('level1', levels.has('level_1'));
    setUnlocked('level2', levels.has('level_2'));
    if (levels.has('level_1')) safeSet(STORAGE.level1, 'true'); else safeRemove(STORAGE.level1);
    if (levels.has('level_2')) safeSet(STORAGE.level2, 'true'); else safeRemove(STORAGE.level2);
    const masterUnlocked = levels.has('level_1') && levels.has('level_2');
    setUnlocked('master', masterUnlocked);
    if (masterUnlocked) safeSet(STORAGE.master, 'true'); else safeRemove(STORAGE.master);
    return true;
  }

  async function unlockOnServer(level, code){
    const sb = await getClient();
    if (!sb) throw new Error('Vault service is unavailable. Try again.');
    const { data: sessionData } = await sb.auth.getSession();
    if (!sessionData?.session?.user) throw new Error('Sign in with your HYPHSWORLD ID before unlocking the Vault.');
    const { data, error } = await sb.functions.invoke('vault-unlock', { body: { level, code } });
    if (error) {
      let message = 'Access denied. Check the code and try again.';
      try {
        if (error.context && typeof error.context.json === 'function') {
          const body = await error.context.json();
          if (body?.error) message = body.error;
        }
      } catch (_) {}
      throw new Error(message);
    }
    if (!data?.ok) throw new Error(data?.error || 'Access denied. Wrong code.');
    return data;
  }

  cards.forEach((card)=>{
    const level = card.dataset.level;
    const form = card.querySelector('[data-role="form"]');
    const input = card.querySelector('[data-role="input"]');
    const msg = card.querySelector('[data-role="message"]');
    const clear = card.querySelector('[data-role="clear"]');
    const submit = card.querySelector('[data-role="submit"]');

    form?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const val = (input?.value || '').trim();
      if (!val){ if(msg){msg.textContent='Enter a code first.'; msg.classList.add('error');} return; }
      if (submit) submit.disabled = true;
      if (msg) { msg.textContent = 'Checking secure access…'; msg.classList.remove('error'); }
      try {
        const result = await unlockOnServer(level, val);
        if(msg){msg.textContent='Access granted.'; msg.classList.remove('error');}
        if (level === 'master') {
          rememberUnlocked('master');
          rememberUnlocked('level1');
          rememberUnlocked('level2');
        } else {
          rememberUnlocked(level);
        }
        if (input) input.value = '';
        if (result?.unlocked?.includes('level_1')) rememberUnlocked('level1');
        if (result?.unlocked?.includes('level_2')) rememberUnlocked('level2');
      } catch (error) {
        if(msg){msg.textContent=error?.message || 'Access denied.'; msg.classList.add('error');}
      } finally {
        if (submit) submit.disabled = false;
      }
    });

    clear?.addEventListener('click',()=>{ if(input) input.value=''; if(msg) msg.textContent=''; });
  });

  const level2Card = document.querySelector('[data-level="level2"]');
  const level2Input = level2Card?.querySelector('#code-level2');
  level2Card?.querySelectorAll('.falcon-key').forEach((btn)=>{
    btn.addEventListener('click',()=>{
      if (!level2Input) return;
      level2Input.value = `${level2Input.value}${btn.dataset.key || ''}`.slice(0,40);
    });
  });

  syncServerUnlocks().catch((error)=>console.warn('Vault session sync warning:', error));
})();
