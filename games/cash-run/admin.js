(function(){
  const TOKEN_KEY = 'cashrun_admin_token';
  const $ = id => document.getElementById(id);
  const out = $('out');

  function log(v){ out.textContent = typeof v === 'string' ? v : JSON.stringify(v, null, 2); }
  function getBase(){ return ($('baseUrl').value || '/api').replace(/\/$/, ''); }
  function getToken(){ return $('adminToken').value.trim(); }
  function clearToken(){ localStorage.removeItem(TOKEN_KEY); $('adminToken').value=''; }
  function saveToken(){ localStorage.setItem(TOKEN_KEY, getToken()); }

  async function req(path, options){
    const headers = Object.assign({'Content-Type':'application/json'}, options?.headers || {});
    const token = getToken();
    if (token) headers['X-Admin-Token'] = token;
    const res = await fetch(getBase()+path, Object.assign({}, options, {headers}));
    const text = await res.text();
    let body; try { body = JSON.parse(text); } catch { body = text; }
    if (!res.ok) throw new Error((body && body.detail) ? body.detail : text || ('HTTP '+res.status));
    return body;
  }

  async function adminLogin(){
    const body = await req('/auth/login', {method:'POST', body: JSON.stringify({email:'admin@local', password:'test'})});
    log(body);
  }
  async function fetchMe(){
    const res = await fetch(getBase() + '/auth/me', { headers: {'X-User-Email':'admin@local'} });
    log(await res.json());
  }
  async function deleteEntry(){ log(await req('/admin/leaderboard/' + encodeURIComponent($('entryId').value.trim()), {method:'DELETE'})); }
  async function clearAll(){ log(await req('/admin/leaderboard', {method:'DELETE'})); }
  async function editEntry(){
    const payload = {};
    if ($('editName').value.trim()) payload.name = $('editName').value.trim();
    if ($('editScore').value !== '') payload.score = Number($('editScore').value);
    if ($('editLevel').value !== '') payload.level = Number($('editLevel').value);
    if ($('editCharacter').value.trim()) payload.character = $('editCharacter').value.trim();
    log(await req('/admin/leaderboard/' + encodeURIComponent($('entryId').value.trim()), {method:'PUT', body: JSON.stringify(payload)}));
  }

  $('saveToken').onclick = ()=>{ saveToken(); log('Token saved.'); };
  $('clearToken').onclick = ()=>{ clearToken(); log('Token cleared.'); };
  $('adminLogin').onclick = ()=> adminLogin().catch(e=>log('Error: ' + e.message));
  $('fetchMe').onclick = ()=> fetchMe().catch(e=>log('Error: ' + e.message));
  $('deleteEntry').onclick = ()=> deleteEntry().catch(e=>log('Error: ' + e.message));
  $('clearAll').onclick = ()=> clearAll().catch(e=>log('Error: ' + e.message));
  $('editEntry').onclick = ()=> editEntry().catch(e=>log('Error: ' + e.message));

  $('adminToken').value = localStorage.getItem(TOKEN_KEY) || '';

  window.CashRunAdmin = { adminLogin, fetchMe, getToken, clearToken, saveToken };
})();
