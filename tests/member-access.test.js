/** @jest-environment node */
const fs = require('node:fs'), path = require('node:path');
const {JSDOM} = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../member-access.js'), 'utf8');
const flush = async () => {for (let i=0;i<5;i++) await new Promise(resolve=>setImmediate(resolve));};
let dom, w, onAuth;
async function boot(session, pathname='/games/street-empire/game/?room=test#board', getSession) {
  dom = new JSDOM('<!doctype html><html><head></head><body><button id="play">Play</button></body></html>', {url:'https://hyphsworld.com'+pathname, runScripts:'outside-only'}); w=dom.window;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.HWAuth={getClient:async()=>({auth:{onAuthStateChange:fn=>{onAuth=fn;},getSession:getSession||(async()=>({data:{session}}))}})};
  w.eval(source); await flush();
}
afterEach(()=>{if(dom)dom.window.close();});
test('direct game links require a signed-in member and preserve their exact return route',async()=>{
  await boot(null);
  expect(w.HWMemberAccess.isUnlocked()).toBe(false);
  const gate=w.document.querySelector('#hw-member-gate');expect(gate.open).toBe(true);
  const join=new URL(gate.querySelector('.join').href);
  expect(join.pathname).toBe('/auth.html');expect(join.searchParams.get('mode')).toBe('signup');
  expect(join.searchParams.get('next')).toBe('/games/street-empire/game/?room=test#board');
  const escape=new w.Event('cancel',{cancelable:true});gate.dispatchEvent(escape);expect(escape.defaultPrevented).toBe(true);
});
test('non-anonymous session unlocks, sign-out immediately locks, account return unlocks',async()=>{
  await boot({user:{id:'member-a'}});
  expect(w.HWMemberAccess.isUnlocked()).toBe(true);
  onAuth('SIGNED_OUT',null);expect(w.HWMemberAccess.isUnlocked()).toBe(false);expect(w.document.querySelector('#hw-member-gate').open).toBe(true);
  onAuth('SIGNED_IN',{user:{id:'member-b'}});expect(w.HWMemberAccess.isUnlocked()).toBe(true);
});
test('anonymous Supabase sessions and local remembered profiles cannot unlock games',async()=>{
  await boot({user:{id:'anonymous',is_anonymous:true}});
  w.localStorage.setItem('hw_auth_session_v1',JSON.stringify({userId:'fake',email:'fake@example.com'}));
  await w.HWMemberAccess.check();expect(w.HWMemberAccess.isUnlocked()).toBe(false);
});
test('a late signed-in session snapshot cannot reverse a newer sign-out',async()=>{
  let resolve;
  await boot(null, '/dominos.html', ()=>new Promise(r=>{resolve=r;}));
  onAuth('SIGNED_OUT',null);resolve({data:{session:{user:{id:'old-account'}}}});await flush();
  expect(w.HWMemberAccess.isUnlocked()).toBe(false);
});
test('failed checks stay locked, expose retry, and retry can recover',async()=>{
  let fail=true;
  await boot(null,'/table-game.html',async()=>fail?{error:new Error('Offline')}:{data:{session:{user:{id:'member'}}}});
  expect(w.HWMemberAccess.isUnlocked()).toBe(false);expect(w.document.querySelector('[role=status]').textContent).toContain('retry');
  fail=false;await w.HWMemberAccess.check();expect(w.HWMemberAccess.isUnlocked()).toBe(true);
});
test('public homepage stays browsable and every published game HTML loads its gate before game code',async()=>{
  await boot(null,'/');expect(w.document.querySelector('#hw-member-gate')).toBeNull();
  const root=path.join(__dirname,'..');
  function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):entry.name.endsWith('.html')?[path.join(dir,entry.name)]:[]);}
  const pages=[...walk(path.join(root,'games')),...['games','casino','casino-arcade','hidden-casino','dominos','table-game','table-room','daily-wheel'].map(name=>path.join(root,name+'.html'))];
  for(const file of pages){const html=fs.readFileSync(file,'utf8');expect(html.indexOf('member-access.js')).toBeGreaterThan(0);expect(html.indexOf('member-access.js')).toBeLessThan(html.indexOf('</head>'));}
});
