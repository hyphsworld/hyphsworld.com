/** @jest-environment node */
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '..', 'global-social.js'), 'utf8');
const flush = async () => { for (let i=0;i<5;i++) await new Promise(resolve=>setImmediate(resolve)); };
const deferred = () => { let resolve; const promise=new Promise(r=>{resolve=r;}); return {promise,resolve}; };
let dom, w, root, rpc, auth, visibility, network, intervals, signedUser;
const alice={id:'alice'}, bob={id:'bob'};
const friend={user_id:'friend',display_name:'Friend',username:'real_friend',relation:'friend',activity:'available',unread:2};
const click = label => { const b=[...root.querySelectorAll('button')].find(n=>n.textContent===label); expect(b).toBeDefined(); b.click(); return b; };
const open = async () => { root.querySelector('.launcher').click(); await flush(); };
const submit = id => root.querySelector(id).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
beforeEach(async()=>{
  dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://hyphsworld.com/music.html',runScripts:'outside-only'}); w=dom.window;
  visibility='visible'; network=true; intervals=[]; signedUser=alice;
  Object.defineProperty(w.document,'visibilityState',{get:()=>visibility});Object.defineProperty(w.navigator,'onLine',{get:()=>network});
  w.crypto.randomUUID=()=> '00000000-0000-4000-8000-'+String(Math.random()).slice(2).padEnd(12,'0').slice(0,12);
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  w.setInterval=fn=>{intervals.push(fn);return intervals.length;};
  rpc=jest.fn(async(name,args)=>({data:name==='street_empire_social'?(args.p_action==='list'?{username:'alice',contacts:[friend],blocked:[]}:args.p_action==='messages'?[]:{ok:true}):null,error:null}));
  w.HWAuth={getClient:async()=>({rpc,auth:{onAuthStateChange:cb=>{auth=(event,session)=>{signedUser=session&&session.user;cb(event,session);};return {};},getSession:async()=>({data:{session:signedUser?{user:signedUser}:null}})}})};
  w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await flush();root=w.document.getElementById('hw-global-social').shadowRoot;
});
afterEach(()=>dom.window.close());
test('one widget uses the existing friends, unread state and account-checked RPC',async()=>{
  w.eval(source);expect(w.document.querySelectorAll('#hw-global-social')).toHaveLength(1);
  await open();expect(root.querySelector('#contacts').textContent).toContain('@real_friend');expect(root.querySelector('#contacts').textContent).toContain('Online');
  expect(root.querySelector('.badge').textContent).toBe('2');expect(rpc).toHaveBeenCalledWith('street_empire_social',{p_action:'list',p_account:'alice'});
  expect(rpc).toHaveBeenCalledWith('touch_street_empire_presence',expect.objectContaining({p_activity:'available'}));
});
test('editing a search discards its delayed results',async()=>{
  await open();const late=deferred();rpc.mockImplementation((name,args)=>args.p_action==='search'?late.promise:Promise.resolve({data:{ok:true}}));
  const input=root.querySelector('input');input.value='old';submit('#search');await flush();input.value='new';input.dispatchEvent(new w.Event('input'));
  late.resolve({data:[{user_id:'stranger',display_name:'Old name',username:'old_name'}]});await flush();expect(root.querySelector('#search-results').textContent).toBe('');
});
test('account switch clears private state and rejects an old inbox response',async()=>{
  await open();const late=deferred();rpc.mockImplementation((name,args)=>args.p_action==='messages'?late.promise:Promise.resolve({data:args.p_action==='list'?{username:'bob',contacts:[],blocked:[]}:{ok:true}}));
  click('Message (2)');root.querySelector('textarea').value='private draft';auth('SIGNED_IN',{user:bob});expect(root.querySelector('textarea').value).toBe('');expect(root.querySelector('#chat').hidden).toBe(true);await new Promise(resolve=>setTimeout(resolve,5));await flush();
  late.resolve({data:[{id:1,sender:'friend',body:'Alice secret',created_at:'2026-10-04T00:00:00Z'}]});await flush();
  expect(root.textContent).not.toContain('Alice secret');expect(root.querySelector('textarea').value).toBe('');expect(root.querySelector('#chat').hidden).toBe(true);
  expect(rpc).toHaveBeenCalledWith('street_empire_social',{p_action:'list',p_account:'bob'});
});
test('returning to the same peer cannot resurrect a previous chat response',async()=>{
  await open();const late=deferred();let calls=0;rpc.mockImplementation((name,args)=>Promise.resolve(args.p_action==='list'?{data:{username:'alice',contacts:[friend],blocked:[]}}:args.p_action==='messages'?(++calls===1?late.promise:{data:[]}):{data:{ok:true}}));
  click('Message (2)');await flush();click('Back to friends');click('Message (2)');await flush();late.resolve({data:[{id:1,sender:'friend',body:'Stale chat',created_at:'2026-10-04T00:00:00Z'}]});await flush();
  expect(root.querySelector('.messages').textContent).not.toContain('Stale chat');
});
test('hidden page queues stop after an in-flight heartbeat and resumes from BFCache',async()=>{
  const late=deferred();rpc.mockImplementation((name,args)=>name==='touch_street_empire_presence'?late.promise:Promise.resolve({data:args.p_action==='list'?{contacts:[friend],blocked:[]}:null}));
  w.dispatchEvent(new w.Event('pageshow'));await flush();visibility='hidden';w.document.dispatchEvent(new w.Event('visibilitychange'));await flush();
  expect(rpc.mock.calls.at(-1)[0]).not.toBe('stop_street_empire_presence');late.resolve({data:null});await flush();expect(rpc.mock.calls.at(-1)[0]).toBe('stop_street_empire_presence');
  const calls=rpc.mock.calls.length;intervals[0]();await flush();expect(rpc.mock.calls.length).toBe(calls);
  visibility='visible';w.dispatchEvent(new w.Event('pageshow'));await flush();expect(rpc.mock.calls.slice(calls).some(c=>c[0]==='touch_street_empire_presence')).toBe(true);
});
test('retries retain the message nonce and messages render as plain text',async()=>{
  await open();click('Message (2)');await flush();let sends=0;
  rpc.mockImplementation(async(name,args)=>({data:args.p_action==='send'?(++sends===1?null:{ok:true}):args.p_action==='messages'?[{id:1,sender:'friend',body:'<img src=x onerror=alert(1)>',created_at:'2026-10-04T00:00:00Z'}]:null,error:args.p_action==='send'&&sends===1?{message:'Connection lost'}:null}));
  root.querySelector('textarea').value='Hello';submit('#send');await flush();expect(root.querySelector('textarea').value).toBe('Hello');submit('#send');await flush();
  const attempts=rpc.mock.calls.filter(c=>c[1].p_action==='send');expect(attempts[0][1].p_nonce).toBe(attempts[1][1].p_nonce);expect(attempts[1][1].p_account).toBe('alice');
  expect(root.querySelector('.messages img')).toBeNull();expect(root.querySelector('.messages').textContent).toContain('<img src=x');
});
test('anonymous and signed-out users cannot list, search or publish presence',async()=>{
  auth('SIGNED_IN',{user:{id:'anon',is_anonymous:true}});await new Promise(resolve=>setTimeout(resolve,5));await flush();rpc.mockClear();
  await open();root.querySelector('input').value='friend';submit('#search');intervals[0]();await flush();expect(rpc).not.toHaveBeenCalled();expect(root.querySelector('.identity a').href).toContain('auth.html?next=');
});
test('friend acceptance and blocking use existing guarded mutations',async()=>{
  rpc.mockImplementation(async(name,args)=>({data:args.p_action==='list'?{username:'alice',contacts:[{...friend,relation:'received'}],blocked:[]}:{ok:true}}));await open();click('Accept');await flush();
  expect(rpc).toHaveBeenCalledWith('street_empire_social',{p_action:'accept',p_account:'alice',p_peer:'friend'});
  rpc.mockImplementation(async(name,args)=>({data:args.p_action==='list'?{username:'alice',contacts:[friend],blocked:[]}:{ok:true}}));await open();click('Block');await flush();expect(rpc).toHaveBeenCalledWith('street_empire_social',{p_action:'block',p_account:'alice',p_peer:'friend'});
});
test('received messages remain reportable without a friendship and pending requests can be blocked',async()=>{
  rpc.mockImplementation(async(name,args)=>({data:args.p_action==='list'?{username:'alice',contacts:[{...friend,relation:'received'}],blocked:[]}:args.p_action==='report-inbox'?[{id:4,sender:'former-friend',display_name:'Former friend',body:'Received before blocking'}]:{ok:true}}));
  await open();click('Block');await flush();expect(rpc).toHaveBeenCalledWith('street_empire_social',{p_action:'block',p_account:'alice',p_peer:'friend'});
  click('Review received messages');await flush();expect(root.querySelector('#received-messages').textContent).toContain('Received before blocking');
  w.prompt=()=> 'Abuse';root.querySelector('#received-messages button').click();await flush();
  expect(rpc).toHaveBeenCalledWith('street_empire_social',{p_action:'report',p_account:'alice',p_peer:'former-friend',p_before:4,p_text:'Abuse'});
  const late=deferred();click('Close received-message review');rpc.mockImplementation((name,args)=>args.p_action==='report-inbox'?late.promise:Promise.resolve({data:{contacts:[],blocked:[]}}));
  click('Review received messages');await flush();auth('SIGNED_OUT',null);expect(root.querySelector('#received-review').hidden).toBe(true);
  late.resolve({data:[{id:4,sender:'former-friend',body:'Private received history'}]});await flush();expect(root.textContent).not.toContain('Private received history');
});
test('secure random-byte UUID fallback supports older browsers',async()=>{
  auth('SIGNED_OUT',null);await flush();w.crypto.randomUUID=undefined;rpc.mockClear();auth('SIGNED_IN',{user:bob});await new Promise(resolve=>setTimeout(resolve,5));await flush();
  const touch=rpc.mock.calls.find(c=>c[0]==='touch_street_empire_presence');expect(touch).toBeDefined();expect(touch[1].p_session).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  await open();click('Message (2)');await flush();root.querySelector('textarea').value='Fallback message';submit('#send');await flush();
  expect(rpc.mock.calls.find(c=>c[1].p_action==='send')[1].p_nonce).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
