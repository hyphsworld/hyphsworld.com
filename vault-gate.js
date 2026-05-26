(function(){
  const CODES = { master: 'AMSWEST', level1: 'AMSWEST', level2: 'HYPHSWORLD5' };
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
  const safeGet = (k)=>{try{return localStorage.getItem(k);}catch(_){return null;}};

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
      badges[level].textContent = isUnlocked ? `${level === 'master' ? 'Master' : level === 'level1' ? 'Level 1' : 'Level 2'} Unlocked` : `${level === 'master' ? 'Master' : level === 'level1' ? 'Level 1' : 'Level 2'} Locked`;
      badges[level].classList.toggle('on', isUnlocked);
      badges[level].classList.toggle('off', !isUnlocked);
    }
    if (isUnlocked && level === 'level2') {
      card.classList.add('is-unlocked');
      if (msg) msg.textContent = 'FALCON lane open. Futuristic smoke sequence active.';
    }
  }

  function unlock(level){
    safeSet(STORAGE[level], 'true');
    setUnlocked(level, true);
    if (level === 'master') {
      safeSet(STORAGE.level1, 'true');
      safeSet(STORAGE.level2, 'true');
      setUnlocked('level1', true);
      setUnlocked('level2', true);
    }
  }

  cards.forEach((card)=>{
    const level = card.dataset.level;
    const form = card.querySelector('[data-role="form"]');
    const input = card.querySelector('[data-role="input"]');
    const msg = card.querySelector('[data-role="message"]');
    const clear = card.querySelector('[data-role="clear"]');

    if (safeGet(STORAGE[level]) === 'true') setUnlocked(level, true);

    form?.addEventListener('submit',(e)=>{
      e.preventDefault();
      const val = (input?.value || '').trim().toUpperCase();
      if (!val){ if(msg){msg.textContent='Enter a code first.'; msg.classList.add('error');} return; }
      const ok = val === CODES[level];
      if (ok){
        if(msg){msg.textContent='Access granted.'; msg.classList.remove('error');}
        unlock(level);
      } else {
        if(msg){msg.textContent='Access denied. Wrong code.'; msg.classList.add('error');}
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
})();
