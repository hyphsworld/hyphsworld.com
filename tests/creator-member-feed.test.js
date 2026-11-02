const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../creator-member-feed.js'), 'utf8');
const html = fs.readFileSync(require.resolve('../creators.html'), 'utf8');
const owner = { id: 'member-a', app_metadata: {} };
const tick = async () => { for (let i=0;i<15;i++) await Promise.resolve(); };
let sb, authUser, rows, attempts, tusOptions, tusInstances;
function setup(user = owner) {
 document.body.innerHTML = html;
 authUser = user; rows = []; attempts = []; tusOptions = []; tusInstances = [];
 URL.createObjectURL = jest.fn(() => 'blob:test-preview'); URL.revokeObjectURL = jest.fn();
 HTMLMediaElement.prototype.pause = jest.fn(); HTMLMediaElement.prototype.load = jest.fn();
 window.confirm = jest.fn(() => true);
 window.gtag = jest.fn(); window.HW_SUPABASE_CONFIG = { url:'https://test.supabase.co', anonKey:'public-fixture' };
 const storage = {
  list: jest.fn(async () => ({ data: [] })), remove: jest.fn(async () => ({ data: [],error:null })),
  createSignedUrl: jest.fn(async path => ({ data: { signedUrl: 'https://test.invalid/' + path } }))
 };
 sb = {
  auth: { getUser: jest.fn(async () => ({data: {user:authUser}})), getSession: jest.fn(async () => ({data:{session:{user:authUser,access_token:'fixture-token'}}})), onAuthStateChange: jest.fn() },
  storage: { from: jest.fn(() => storage) },
  rpc: jest.fn(async (name,args) => {
   attempts.push({name,args});
   if (name==='member_feed') return {data:rows};
   if (name==='member_reserve_post') return {data:{id:args.p_id,storage_path:'member-a/'+args.p_id+'/media.png',status:'uploading'}};
   if (name==='member_remove_post') return {data:'member-a/file/media.png'};
   return {data:{status:'published'}};
  })
 };
 window.HWAuth = {getClient: async () => sb};
 window.tus = {Upload: class {
  constructor(file,options) { this.options=options; tusOptions.push(options); tusInstances.push(this); }
  findPreviousUploads() { return Promise.resolve([]); }
  start() { this.options.onProgress(3,10); }
  abort() { return Promise.resolve(); }
 }};
 window.eval(source);
 return storage;
}
async function choose(type='image/png', size=12) {
 const input = document.getElementById('memberFile');
 Object.defineProperty(input,'files',{configurable:true,value:[new File([new Uint8Array(size)],'photo.png',{type})]});
 input.dispatchEvent(new Event('change')); await tick();
}
async function submit() { document.getElementById('memberPostForm').dispatchEvent(new Event('submit',{cancelable:true})); await tick(); }
function deferred() { let resolve; const promise=new Promise(done=>{resolve=done;}); return {promise,resolve}; }
async function authEvent(event='TOKEN_REFRESHED') {
 sb.auth.onAuthStateChange.mock.calls[0][0](event, {user:authUser});
 await new Promise(resolve=>setTimeout(resolve,0)); await tick();
}
function mediaPost(mime='video/mp4') { return {id:'post-b',owner_id:'member-b',author_name:'Member B',caption:'A community creation',mime_type:mime,storage_path:'b/file',published_at:'2026-11-02T00:00:00Z'}; }
test('guests can view the feed but must sign in before posting', async () => {
 setup(null); await tick();
 expect(document.getElementById('memberPostForm').hidden).toBe(true);
 expect(document.getElementById('memberLogin').hidden).toBe(false);
 expect(attempts.some(a=>a.name==='member_feed')).toBe(true);
});
test('signed-in members preview media and publish only after upload completes', async () => {
 setup(); await tick(); await choose();
 expect(document.querySelector('#memberPreview img').getAttribute('src')).toBe('blob:test-preview');
 document.getElementById('memberCaption').value='My new creation'; await submit();
 expect(document.getElementById('memberProgress').value).toBe(30);
 expect(attempts.some(a=>a.name==='member_publish_post')).toBe(false);
 expect(tusOptions[0].chunkSize).toBe(6*1024*1024);
 const request={setHeader:jest.fn()}; await tusOptions[0].onBeforeRequest(request);
 expect(request.setHeader).toHaveBeenCalledWith('Authorization','Bearer fixture-token');
 tusOptions[0].onSuccess(); await tick();
 expect(attempts.filter(a=>a.name==='member_publish_post')).toHaveLength(1);
 expect(document.getElementById('memberPostStatus').textContent).toContain('Posted!');
 expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-preview');
 expect(window.gtag).toHaveBeenCalledWith('event','creator_member_post_published',{event_category:'creators_world'});
});
test('failed upload remains unpublished and retry uses the same post ID', async () => {
 setup(); await tick(); await choose(); await submit();
 const id=attempts.find(a=>a.name==='member_reserve_post').args.p_id;
 tusOptions[0].onError(new Error('Connection lost.')); await tick();
 expect(document.getElementById('memberPostStatus').textContent).toContain('Retry post');
 expect(attempts.some(a=>a.name==='member_publish_post')).toBe(false);
 await submit();
 expect(attempts.filter(a=>a.name==='member_reserve_post')[1].args.p_id).toBe(id);
 tusOptions[1].onSuccess(); await tick();
 expect(attempts.filter(a=>a.name==='member_publish_post')).toHaveLength(1);
});
test('lost publish response retries finalization without another upload', async () => {
 setup(); await tick();
 const original = sb.rpc.getMockImplementation(); let failed=false;
 sb.rpc.mockImplementation(async (name,args) => {
  if (name==='member_publish_post'&&!failed) {failed=true; return {error:{message:'Connection interrupted.'}};}
  return original(name,args);
 });
 await choose(); await submit(); tusOptions[0].onSuccess(); await tick();
 expect(document.getElementById('memberPostStatus').textContent).toContain('Retry post');
 await submit(); expect(tusOptions).toHaveLength(1);
 expect(document.getElementById('memberPostStatus').textContent).toContain('Posted!');
});
test('canceling prevents publication and removes the reserved media', async () => {
 const storage=setup(); await tick(); await choose(); await submit();
 document.getElementById('memberCancel').click(); await tick();
 expect(attempts.some(a=>a.name==='member_publish_post')).toBe(false);
 expect(attempts.some(a=>a.name==='member_remove_post')).toBe(true);
 expect(storage.remove).toHaveBeenCalled();
 expect(document.getElementById('memberPostStatus').textContent).toContain('discarded');
});
test('account change stops upload authorization and prevents publication', async () => {
 setup(); await tick(); await choose(); await submit(); authUser={id:'member-b'};
 await expect(tusOptions[0].onBeforeRequest({setHeader:jest.fn()})).rejects.toThrow('Sign in again');
 tusOptions[0].onSuccess(); await tick();
 expect(attempts.some(a=>a.name==='member_publish_post')).toBe(false);
});
test('unsupported and oversized media never reserve a post', async () => {
 setup(); await tick(); await choose('text/html'); await submit();
 expect(attempts.some(a=>a.name==='member_reserve_post')).toBe(false);
 await choose('image/png',52428801); await submit();
 expect(attempts.some(a=>a.name==='member_reserve_post')).toBe(false);
});
test('a rejected reservation can be discarded so the member can choose again', async () => {
 setup(); await tick();
 const original=sb.rpc.getMockImplementation();
 sb.rpc.mockImplementation(async (name,args)=>name==='member_reserve_post'?{error:{message:'Daily upload limit reached.'}}:name==='member_remove_post'?{error:{message:'Post is unavailable.'}}:original(name,args));
 await choose(); await submit();
 document.getElementById('memberCancel').click(); await tick();
 expect(document.getElementById('memberFile').disabled).toBe(false);
 expect(document.getElementById('memberPostStatus').textContent).toContain('discarded');
});
test('feed treats names and captions as text and provides signed media playback', async () => {
 setup(); rows=[{id:'post-b',owner_id:'member-b',author_name:'<img src=x onerror=alert(1)>',caption:'<script>bad()</script>',mime_type:'video/mp4',storage_path:'b/file.mp4',published_at:'2026-11-02T00:00:00Z'}]; await tick();
 expect(document.querySelector('#memberFeed h3').textContent).toContain('<img');
 expect(document.querySelector('#memberFeed script')).toBeNull();
 expect(document.querySelector('#memberFeed video').controls).toBe(true);
 expect(document.querySelector('#memberFeed video').autoplay).toBe(false);
 expect(document.querySelector('#memberFeed select').getAttribute('aria-label')).toBe('Report reason');
 document.querySelector('#memberFeed details button').click(); await tick();
 expect(attempts.some(a=>a.name==='member_report_post')).toBe(true);
});
test('background token refresh keeps the player, caption draft and current feed', async () => {
 setup(); rows=[mediaPost()]; await tick(); await choose();
 document.getElementById('memberCaption').value='My unfinished caption';
 const player=document.querySelector('#memberFeed video'); player.currentTime=18;
 const count=attempts.filter(a=>a.name==='member_feed').length;
 await authEvent();
 expect(document.querySelector('#memberFeed video')).toBe(player);
 expect(player.currentTime).toBe(18);
 expect(document.getElementById('memberCaption').value).toBe('My unfinished caption');
 expect(attempts.filter(a=>a.name==='member_feed')).toHaveLength(count);
});
test('an interrupted auth refresh preserves the member draft', async () => {
 setup(); await tick(); await choose();
 sb.auth.getUser.mockResolvedValueOnce({data:{user:null},error:{name:'AuthRetryableFetchError',status:0}});
 await authEvent();
 expect(document.getElementById('memberPostForm').hidden).toBe(false);
 expect(document.querySelector('#memberPreview img')).not.toBeNull();
 expect(document.getElementById('memberPostStatus').textContent).toContain('Your draft is still here');
});
test('a late storage lookup from a canceled post cannot start another upload', async () => {
 const storage=setup(); await tick(); const lookup=deferred();
 storage.list.mockReturnValueOnce(lookup.promise);
 await choose(); await submit();
 document.getElementById('memberCancel').click(); await tick();
 await choose(); await submit();
 const nextId=attempts.filter(a=>a.name==='member_reserve_post')[1].args.p_id;
 expect(tusOptions).toHaveLength(1);
 lookup.resolve({data:[]}); await tick();
 expect(tusOptions).toHaveLength(1);
 tusOptions[0].onSuccess(); await tick();
 expect(attempts.filter(a=>a.name==='member_publish_post')).toEqual([{name:'member_publish_post',args:{p_id:nextId}}]);
});
test('cancel cleanup finishing after an account switch cannot reset the next upload', async () => {
 const storage=setup(); await tick(); await choose(); await submit();
 const cleanup=deferred(); storage.remove.mockReturnValueOnce(cleanup.promise);
 document.getElementById('memberCancel').click(); await tick();
 expect(document.getElementById('memberCancel').disabled).toBe(true);
 authUser={id:'member-b',app_metadata:{}}; await authEvent('SIGNED_IN');
 await choose(); await submit();
 cleanup.resolve({data:[],error:null}); await tick();
 expect(document.getElementById('memberPost').disabled).toBe(true);
 expect(document.querySelector('#memberPreview img')).not.toBeNull();
 tusOptions[1].onSuccess(); await tick();
 expect(document.getElementById('memberPostStatus').textContent).toContain('Posted!');
});
test('a canceled transfer cannot attach credentials after an asynchronous session lookup', async () => {
 setup(); await tick(); await choose(); await submit();
 const session=deferred(),request={setHeader:jest.fn()};
 sb.auth.getSession.mockReturnValueOnce(session.promise);
 const authorize=tusOptions[0].onBeforeRequest(request);
 const rejected=expect(authorize).rejects.toThrow('Account changed');
 document.getElementById('memberCancel').click(); await tick();
 session.resolve({data:{session:{user:owner,access_token:'fixture-token'}}});
 await rejected;
 expect(request.setHeader).not.toHaveBeenCalled();
});
test('an older auth lookup cannot restore a member after sign-out', async () => {
 setup(); await tick(); const lookup=deferred();
 sb.auth.getUser.mockReturnValueOnce(lookup.promise);
 await authEvent('SIGNED_IN');
 authUser=null; await authEvent('SIGNED_OUT');
 lookup.resolve({data:{user:owner}}); await tick();
 expect(document.getElementById('memberPostForm').hidden).toBe(true);
 expect(document.getElementById('memberLogin').hidden).toBe(false);
});
test('a moderator role change refreshes permissions without losing the caption draft', async () => {
 setup(); rows=[mediaPost()]; await tick(); await choose();
 document.getElementById('memberCaption').value='Keep this draft';
 authUser={...owner,app_metadata:{creator_admin:true}}; await authEvent();
 expect(document.getElementById('memberModeration').hidden).toBe(false);
 expect(document.querySelector('#memberFeed details button').textContent).toBe('Remove post');
 expect(document.getElementById('memberCaption').value).toBe('Keep this draft');
});
test('missing media can reconnect without refetching the feed or replacing the caption', async () => {
 const storage=setup(); rows=[mediaPost('image/png')];
 storage.createSignedUrl.mockResolvedValueOnce({error:{message:'Offline'}}); await tick();
 const caption=document.querySelector('#memberFeed .member-caption');
 const retry=Array.from(document.querySelectorAll('#memberFeed button')).find(button=>button.textContent==='Reload media');
 expect(retry.hidden).toBe(false); retry.click(); await tick();
 expect(document.querySelector('#memberFeed img')).not.toBeNull();
 expect(document.querySelector('#memberFeed .member-caption')).toBe(caption);
 expect(attempts.filter(a=>a.name==='member_feed')).toHaveLength(1);
});
test('expired video links can renew and restore position without autoplay', async () => {
 const storage=setup(); rows=[mediaPost()]; await tick();
 const old=document.querySelector('#memberFeed video'); old.currentTime=17;
 old.dispatchEvent(new Event('error'));
 storage.createSignedUrl.mockResolvedValueOnce({data:{signedUrl:'https://test.invalid/fresh-video'}});
 const retry=Array.from(document.querySelectorAll('#memberFeed button')).find(button=>button.textContent==='Reload media');
 retry.click(); await tick();
 const player=document.querySelector('#memberFeed video');
 expect(player).not.toBe(old); expect(player.src).toBe('https://test.invalid/fresh-video');
 Object.defineProperty(player,'duration',{value:60}); player.dispatchEvent(new Event('loadedmetadata'));
 expect(player.currentTime).toBe(17); expect(player.autoplay).toBe(false); expect(retry.hidden).toBe(true);
 expect(attempts.filter(a=>a.name==='member_feed')).toHaveLength(1);
});
