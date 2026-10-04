/* One friend graph and inbox across HYPHSWORLD, backed by the existing guarded RPCs. */
(function () {
  'use strict';
  if (window.HWGlobalSocial) return;
  const assetRoot = new URL('.', document.currentScript && document.currentScript.src || location.origin + '/global-social.js');
  let client, user = null, generation = 0, authEpoch = 0, stopped = false;
  let contacts = [], blocked = [], results = [], username = '', peer = null, messages = [];
  let searchEpoch = 0, chatEpoch = 0, refreshing = false, sending = false, retry = null, leaseEpoch = 0;
  let presenceQueue = Promise.resolve(), timer, heartbeatAt = 0, sessionId;
  let contactsSignature = null, chatSignature = null, root, dialog, launcher, status, contactList, searchList, chatList, input, draft, sendButton, badge, identity, chatTitle;
  const uuid = () => crypto.randomUUID();
  const visible = () => !stopped && document.visibilityState !== 'hidden' && navigator.onLine !== false;
  const account = () => user && user.id;
  const valid = (g, id) => g === generation && id === account() && visible();
  const text = (tag, value, className) => { const n = document.createElement(tag); n.textContent = value; if (className) n.className = className; return n; };
  const button = (label, fn, className) => { const b = text('button', label, className); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const empty = (node) => node.replaceChildren();
  function notice(value) { status.textContent = value || ''; }
  async function request(name, args) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try { let operation = client.rpc(name, args); if (typeof operation.abortSignal === 'function') operation = operation.abortSignal(controller.signal); return await operation; }
    finally { clearTimeout(timeout); }
  }
  async function rpc(action, args, g = generation, id = account()) {
    if (!id || !valid(g, id)) throw new Error('Sign in to use friends.');
    const result = await request('street_empire_social', Object.assign({p_action:action,p_account:id}, args));
    if (!valid(g, id)) return null;
    if (result.error) throw new Error(result.error.message || 'Could not connect. Try again.');
    return result.data;
  }
  function fail(error, g, id) { if (valid(g, id)) notice(error.message || 'Could not connect. Try again.'); }
  function lease(active) {
    const epoch = ++leaseEpoch, g = generation, id = account(), sid = sessionId;
    heartbeatAt = 0;
    presenceQueue = presenceQueue.catch(() => {}).then(async () => {
      if (!client || !sid) return;
      if (!active) { await request('stop_street_empire_presence', {p_session:sid}); return; }
      if (epoch !== leaseEpoch || !valid(g, id)) return;
      const response = await request('touch_street_empire_presence', {p_session:sid,p_activity:location.pathname.startsWith('/games/') ? 'playing' : 'available'});
      if (response.error) { fail(response.error, g, id); return; }
      if (epoch === leaseEpoch && valid(g, id)) heartbeatAt = Date.now();
      if (valid(g, id)) renderContacts();
    }).catch(error => { if (active) fail(error, g, id); });
    return presenceQueue;
  }
  function renderIdentity() {
    empty(identity);
    if (!user) {
      const link = text('a', 'Sign in with your HYPHSWORLD ID');
      link.href = new URL('auth.html', assetRoot).href + '?next=' + encodeURIComponent(location.pathname + location.search);
      identity.append(link); return;
    }
    identity.append(text('span', username ? '@' + username : 'Your HYPHSWORLD ID'));
    if (username && navigator.clipboard && window.isSecureContext) identity.append(button('Copy username', async () => {
      try { await navigator.clipboard.writeText(username); notice('Username copied.'); } catch (_) { notice('Select your username above to copy it.'); }
    }));
  }
  function reset(session) {
    const next = session && session.user && !session.user.is_anonymous ? session.user : null;
    if (next && user && next.id === user.id) { user = next; return; }
    if (!next && !user) return;
    lease(false); ++generation; ++searchEpoch; ++chatEpoch; user = next; sessionId = next ? uuid() : null;
    contacts = []; blocked = []; results = []; username = ''; peer = null; messages = []; retry = null;
    input.value = ''; draft.value = ''; notice(''); render();
    if (user && visible()) { lease(true); void refresh(); }
  }
  function presenceLabel(contact) { return contact.activity === 'playing' ? 'Playing' : contact.activity === 'available' ? 'Online' : 'Offline'; }
  async function mutate(action, id, control) {
    const g = generation, me = account(); if (control) control.disabled = true;
    try { const result = await rpc(action, {p_peer:id}, g, me); if (result === null) return;
      if (peer && peer.user_id === id && ['remove','block'].includes(action)) { ++chatEpoch; peer = null; messages = []; retry = null; draft.value = ''; }
      results = []; renderResults(); await refresh(); if (valid(g, me)) notice('Done.');
    } catch (e) { fail(e, g, me); } finally { if (control && control.isConnected) control.disabled = false; }
  }
  function actionButton(label, action, id, className) { let b; b = button(label, () => void mutate(action, id, b), className); return b; }
  function row(contact, search) {
    const line = text('div', '', 'row'), info = text('div', '', 'name'), actions = text('div', '', 'actions');
    info.append(text('strong', contact.display_name || 'Player'), text('div', contact.username ? '@' + contact.username : '', 'muted'));
    const relation = contact.relation;
    if (relation === 'friend') {
      const state = text('div', presenceLabel(contact), 'muted'); state.prepend(text('span', '', 'dot' + (contact.activity ? ' online' : '')), ' '); info.append(state);
      actions.append(button('Message' + (contact.unread ? ' (' + contact.unread + ')' : ''), () => openChat(contact), 'primary'));
      if (!search) { actions.append(actionButton('Remove', 'remove', contact.user_id)); actions.append(actionButton('Block', 'block', contact.user_id, 'danger')); }
    } else if (relation === 'received') actions.append(actionButton('Accept', 'accept', contact.user_id, 'primary'), actionButton('Decline','decline',contact.user_id));
    else if (relation === 'sent') actions.append(text('span','Request sent','muted'),actionButton('Cancel','remove',contact.user_id));
    else if (relation === 'unavailable') actions.append(actionButton('Remove','remove',contact.user_id));
    else actions.append(actionButton('Add friend','request',contact.user_id,'primary'));
    line.append(info,actions); return line;
  }
  function renderResults() { empty(searchList); results.forEach(r => searchList.append(row(Object.assign({},r,contacts.find(c=>c.user_id===r.user_id)),true))); }
  function renderContacts() {
    root.querySelector('.launcher .dot').classList.toggle('online', Boolean(user && visible() && heartbeatAt));
    const signature = JSON.stringify([contacts, blocked, Boolean(user)]);
    if (signature === contactsSignature) return;
    contactsSignature = signature;
    empty(contactList); contacts.forEach(c=>contactList.append(row(c,false)));
    if (!contacts.length) contactList.append(text('p', user ? 'Find your people below. Existing Street Empire friends appear here too.' : 'Sign in to see your friends and messages.', 'empty'));
    const count = contacts.reduce((n,c)=>n+(Number(c.unread)||0)+(c.relation==='received'?1:0),0);
    badge.textContent = count > 99 ? '99+' : String(count); badge.hidden = !count;
    launcher.setAttribute('aria-label','Friends and messages' + (count ? ', '+count+' unread messages or requests' : ''));
    root.querySelector('.launcher .dot').classList.toggle('online', Boolean(user && visible() && heartbeatAt));
    const b = root.querySelector('#blocked-list'); empty(b);
    blocked.forEach(c=>{ const r=text('div','','row');r.append(text('span',c.display_name||'Player'),actionButton('Unblock','unblock',c.user_id));b.append(r); });
    root.querySelector('#blocked').hidden = !blocked.length;
  }
  function renderChat() {
    const chat = root.querySelector('#chat'); chat.hidden = !peer;
    if (!peer) { chatSignature = null; empty(chatList); return; }
    chatTitle.textContent = peer.display_name + ' · ' + presenceLabel(peer);
    const signature = JSON.stringify([peer.user_id, messages]);
    if (signature === chatSignature) { sendButton.disabled = sending || !user; return; }
    chatSignature = signature;
    const wasAtBottom = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight < 60;
    empty(chatList);
    messages.forEach(m=>{
      const bubble=text('div',m.body,'message'+(m.sender===account()?' mine':''));
      const stamp = new Date(m.created_at); bubble.append(text('small',m.sender===account()?'You':peer.display_name));
      if (!Number.isNaN(stamp.getTime())) bubble.append(text('small',stamp.toLocaleString()));
      if (m.sender !== account()) bubble.append(button('Report',()=>void report(m), 'danger'));
      chatList.append(bubble);
    });
    if (!messages.length) chatList.append(text('p','Start the conversation.','empty'));
    if (wasAtBottom) chatList.scrollTop = chatList.scrollHeight;
    sendButton.disabled = sending || !user;
  }
  function render() { renderIdentity(); renderContacts(); renderResults(); renderChat(); root.querySelector('#search-submit').disabled = !user; }
  async function loadMessages(older) {
    if (!peer || !dialog.open) return;
    const g=generation, me=account(), id=peer.user_id, epoch=chatEpoch;
    const args={p_peer:id}; if (older && messages.length) args.p_before=messages[0].id;
    try { const data=await rpc('messages',args,g,me); if (!data || epoch!==chatEpoch || !peer || peer.user_id!==id) return;
      const incoming=Array.isArray(data)?data:[];
      messages=older ? [...incoming,...messages].filter((m,i,a)=>a.findIndex(x=>x.id===m.id)===i) : [...messages.filter(m=>incoming.length && m.id<incoming[0].id),...incoming];
      renderChat();
    } catch(e) { fail(e,g,me); }
  }
  function openChat(contact) { ++chatEpoch; peer=contact; messages=[]; retry=null; draft.value=''; notice(''); renderChat(); void loadMessages(false); draft.focus(); }
  async function refresh() {
    if (!client || !account() || !visible() || refreshing) return;
    refreshing=true; const g=generation, id=account();
    try { const data=await rpc('list',{},g,id); if (!data) return;
      contacts=Array.isArray(data.contacts)?data.contacts:[]; blocked=Array.isArray(data.blocked)?data.blocked:[]; username=data.username||'';
      if (peer) { const current=contacts.find(c=>c.user_id===peer.user_id && c.relation==='friend'); if (current) peer=current; else { ++chatEpoch; peer=null; messages=[]; retry=null; draft.value=''; } }
      render(); if (dialog.open && peer) await loadMessages(false);
    } catch(e) { fail(e,g,id); } finally { refreshing=false; }
  }
  async function search(event) {
    event.preventDefault(); results=[]; renderResults(); const epoch=++searchEpoch, g=generation, id=account();
    const q=input.value.trim().replace(/^@/,'').trim();
    if ([...q].length<3 || [...q].length>32) { notice('Enter 3–32 characters of a username or display name.'); return; }
    notice('Searching…');
    try { const data=await rpc('search',{p_query:q},g,id); if (!data || epoch!==searchEpoch) return; results=Array.isArray(data)?data:[]; renderResults(); notice(results.length ? 'Check the @username before adding a friend.' : 'No matching players. Try their public username.'); }
    catch(e) { if (epoch===searchEpoch) fail(e,g,id); }
  }
  async function send(event) {
    event.preventDefault(); if (sending || !peer) return;
    const body=draft.value.trim(); if (!body || [...body].length>1000) { notice('Write a message of up to 1,000 characters.'); return; }
    const g=generation, id=account(), target=peer.user_id, epoch=chatEpoch;
    if (!retry || retry.body!==body || retry.peer!==target || retry.account!==id) retry={body,peer:target,account:id,nonce:uuid()};
    const attempt=retry; sending=true; sendButton.disabled=true; notice('');
    try { const data=await rpc('send',{p_peer:target,p_text:body,p_nonce:attempt.nonce},g,id); if (!data || epoch!==chatEpoch || !peer || peer.user_id!==target) return;
      if (draft.value.trim()===body) draft.value=''; if (retry===attempt) retry=null; await loadMessages(false);
    } catch(e) { fail(e,g,id); } finally { sending=false; if (valid(g,id)) sendButton.disabled=false; }
  }
  async function report(message) {
    const reason=window.prompt('Why are you reporting this message? (1–300 characters)'); if (!reason || [...reason.trim()].length>300) return;
    const g=generation, id=account();
    try { await rpc('report',{p_peer:message.sender,p_before:message.id,p_text:reason.trim()},g,id); if(valid(g,id))notice('Report submitted.'); } catch(e){fail(e,g,id);}
  }
  function lifecycle() {
    if (!user) return;
    if (visible()) { lease(true); void refresh(); } else { ++generation; ++searchEpoch; lease(false); renderContacts(); }
  }
  function open() { if (!dialog.open) dialog.showModal(); notice(''); if (!client || !user) void boot(); else void refresh(); }
  function mount() {
    if (document.getElementById('hw-global-social')) return;
    const host=document.createElement('div'); host.id='hw-global-social'; if(location.pathname.startsWith('/games/'))host.setAttribute('data-game',''); document.body.append(host); root=host.attachShadow({mode:'open'});
    const css=document.createElement('link'); css.rel='stylesheet'; css.href=new URL('global-social.css?v=1',assetRoot).href; root.append(css);
    launcher=button('',open,'launcher'); launcher.innerHTML='<span class="dot" aria-hidden="true"></span><span>Friends</span><span class="badge" hidden></span>'; badge=launcher.querySelector('.badge');root.append(launcher);
    dialog=document.createElement('dialog');dialog.setAttribute('aria-labelledby','social-title');
    dialog.innerHTML='<header><div><h2 id="social-title">Your people</h2><p class="muted">Friends & messages across HYPHSWORLD</p></div><button id="close" type="button" aria-label="Close friends">×</button></header><div class="body"><div class="identity"></div><p class="status" role="status" aria-live="polite"></p><section id="chat" hidden><div class="actions"><button id="back" type="button">Back to friends</button></div><h3 id="chat-title"></h3><button id="older" type="button">Older messages</button><div class="messages" aria-label="Messages"></div><form id="send"><textarea aria-label="Your message" maxlength="1000" placeholder="Write a message"></textarea><button class="primary" type="submit">Send</button></form></section><h3>Friends & requests</h3><div id="contacts"></div><h3>Find your people</h3><form id="search"><input aria-label="Username or display name" placeholder="Username or display name" maxlength="64" autocomplete="off"><button id="search-submit" type="submit">Search</button></form><div id="search-results"></div><details id="blocked" hidden><summary>Blocked players</summary><div id="blocked-list"></div></details><p class="muted">Messages are private between accepted friends. Online status may take up to 75 seconds to expire after disconnecting.</p></div>';
    root.append(dialog); status=root.querySelector('.status');identity=root.querySelector('.identity');contactList=root.querySelector('#contacts');searchList=root.querySelector('#search-results');chatList=root.querySelector('.messages');input=root.querySelector('input');draft=root.querySelector('textarea');sendButton=root.querySelector('#send button');chatTitle=root.querySelector('#chat-title');
    root.querySelector('#close').onclick=()=>dialog.close(); dialog.addEventListener('close',()=>{++searchEpoch;++chatEpoch;peer=null;messages=[];retry=null;draft.value='';renderChat();launcher.focus();});
    root.querySelector('#back').onclick=()=>{++chatEpoch;peer=null;messages=[];retry=null;draft.value='';renderChat();};root.querySelector('#older').onclick=()=>void loadMessages(true);
    root.querySelector('#search').addEventListener('submit',search);input.addEventListener('input',()=>{++searchEpoch;results=[];renderResults();notice('');});root.querySelector('#send').addEventListener('submit',send);
    render();void boot();timer=setInterval(()=>{if(!visible()||!user)return;if(Date.now()-heartbeatAt>=25000)lease(true);void refresh();},5000);
    document.addEventListener('visibilitychange',lifecycle);window.addEventListener('offline',lifecycle);window.addEventListener('online',lifecycle);
    window.addEventListener('pagehide',()=>{stopped=true;++generation;lease(false);});window.addEventListener('pageshow',()=>{stopped=false;lifecycle();});
  }
  let booting=false, subscribed=false;
  async function boot() {
    if (booting) return; booting=true;
    try {
      if (!window.HWAuth) await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('Sign-in service did not load. Reload this page to retry.')),8000);
        const done=()=>{clearTimeout(timeout);resolve();}; const failed=()=>{clearTimeout(timeout);reject(new Error('Sign-in service did not load. Reload this page to retry.'));};
        const existing=Array.from(document.scripts).find(s=>/\/auth-client\.js(?:[?]|$)/.test(s.src));
        if(existing){if(window.HWAuth)return done();existing.addEventListener('load',done,{once:true});existing.addEventListener('error',failed,{once:true});return;}
        const s=document.createElement('script');s.src=new URL('auth-client.js',assetRoot).href;s.onload=done;s.onerror=failed;document.head.append(s);
      });
      if (!window.HWAuth) throw new Error('Sign-in service unavailable. Reload this page to retry.');
      client=await window.HWAuth.getClient();if(!client)throw new Error('Sign-in service unavailable.');
      if(!subscribed){client.auth.onAuthStateChange((_event,session)=>{const epoch=++authEpoch;setTimeout(()=>{if(epoch===authEpoch)reset(session);},0);});subscribed=true;}
      const epoch=authEpoch;const result=await client.auth.getSession();if(result.error)throw result.error;if(epoch===authEpoch)reset(result.data.session);
    } catch(e) { notice(e.message||'Could not connect. Reopen Friends to retry.'); } finally { booting=false; }
  }
  window.HWGlobalSocial={open};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
