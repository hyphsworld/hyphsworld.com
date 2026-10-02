const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

function worker(fetch) {
  const handlers = {}, saved = new Map(), writes = [], deleted = [];
  const scope = {
    URL, Response, fetch,
    caches: {
      match: async req => saved.get(typeof req === 'string' ? req : req.url)?.clone(),
      open: async () => ({ addAll: async () => {}, put: async (req, res) => { writes.push(req.url); saved.set(req.url, res); } }),
      keys: async () => ['hyphsworld-shell-v2', 'hyphsworld-runtime-v2', 'another-app-cache', 'hyphsworld-shell-v3'],
      delete: async key => { deleted.push(key); },
    },
    self: { location: { origin: 'https://hyphsworld.com' }, addEventListener: (name, fn) => { handlers[name] = fn; }, skipWaiting() {}, clients: { claim: async () => {} } },
  };
  vm.runInNewContext(read('service-worker.js'), scope);
  return { saved, writes, deleted, handlers, async request(url, mode = 'navigate', headers = {}) {
    const pending = []; let response;
    handlers.fetch({ request: { url, mode, method: 'GET', headers: new Headers(headers) }, waitUntil: p => pending.push(p), respondWith: p => { response = p; } });
    const result = await response;
    await Promise.all(pending);
    return result;
  } };
}

test('updated scripts win over an old cached deployment', async () => {
  const w = worker(async () => new Response('new-script'));
  w.saved.set('https://hyphsworld.com/site.js', new Response('old-script'));
  assert.equal(await (await w.request('https://hyphsworld.com/site.js', 'no-cors')).text(), 'new-script');
});

test('offline and 502 pages recover their own cached page', async () => {
  for (const fail of [async () => { throw Error('offline'); }, async () => new Response('gateway', { status: 502 })]) {
    const w = worker(fail);
    w.saved.set('https://hyphsworld.com/games.html', new Response('games'));
    assert.equal(await (await w.request('https://hyphsworld.com/games.html')).text(), 'games');
  }
});

test('missing offline routes never masquerade as the homepage; real 404 stays visible', async () => {
  const w = worker(async () => { throw Error('offline'); });
  w.saved.set('./index.html', new Response('home'));
  assert.equal((await w.request('https://hyphsworld.com/creator-drop.html')).type, 'error');
  assert.equal(await (await w.request('https://hyphsworld.com/')).text(), 'home');
  const missing = worker(async () => new Response('missing', { status: 404 }));
  assert.equal((await missing.request('https://hyphsworld.com/missing.html')).status, 404);
});

test('media and Range requests bypass the service worker cache', async () => {
  const w = worker(async () => { throw Error('should not fetch'); });
  assert.equal(await w.request('https://hyphsworld.com/song.mp3', 'no-cors'), undefined);
  assert.equal(await w.request('https://hyphsworld.com/clip', 'no-cors', { Range: 'bytes=0-100' }), undefined);
});

test('cache cleanup preserves caches belonging to other apps', async () => {
  const w = worker(async () => new Response('ok')); let pending;
  w.handlers.activate({ waitUntil: p => { pending = p; } });
  await pending;
  assert.deepEqual(w.deleted, ['hyphsworld-shell-v2', 'hyphsworld-runtime-v2']);
});

test('cache write failure cannot turn a successful page into a load error', async () => {
  const w = worker(async () => new Response('loaded'));
  // Force the same cache path used by remember() to fail.
  const handlers = {}; const pending = [];
  vm.runInNewContext(read('service-worker.js'), {
    URL, Response, fetch: async () => new Response('loaded'),
    caches: { open: async () => { throw Error('quota'); }, match: async () => undefined },
    self: { location: { origin: 'https://hyphsworld.com' }, addEventListener: (n,f) => { handlers[n]=f; } },
  });
  let response;
  handlers.fetch({ request: { url: 'https://hyphsworld.com/', method: 'GET', mode: 'navigate', headers: new Headers() }, respondWith: p => { response=p; }, waitUntil: p => pending.push(p) });
  assert.equal(await (await response).text(), 'loaded');
  await Promise.all(pending);
});

function transport() {
  const handlers = {}, elements = new Map(), timers = [];
  const overlay = { style: {}, classList: { add() {}, remove() {} }, setAttribute() {} };
  elements.set('hwTransportOverlay', overlay); elements.set('hwTransportStyles', {});
  const location = { href: 'https://hyphsworld.com/?fbclid=example', origin: 'https://hyphsworld.com', pathname: '/' };
  const document = { body: { style: { removeProperty() {} } }, getElementById: id => elements.get(id), addEventListener: (n, f) => { handlers[n]=f; } };
  vm.runInNewContext(read('transport-system.js'), { window: { addEventListener() {} }, document, location, URL, setTimeout: f => timers.push(f) });
  const anchor = { dataset: {}, hasAttribute: () => false, target: '', getAttribute: () => '/games.html' };
  return { location, timers, click(extra = {}) {
    let prevented = false;
    handlers.click({ target: { closest: () => anchor }, button: 0, preventDefault: () => { prevented=true; }, ...extra });
    return prevented;
  } };
}

test('social referral pages keep native links and modified clicks intact', () => {
  const t = transport();
  assert.equal(t.click(), false);
  t.timers.forEach(f => f());
  assert.equal(t.location.href, 'https://hyphsworld.com/?fbclid=example');
  const other = transport();
  assert.equal(other.click({ ctrlKey: true }), false);
  assert.equal(other.timers.length, 0);
  assert.equal(other.click({ defaultPrevented: true }), false);
  assert.equal(other.timers.length, 0);
});

test('queried social homepage recovers the shell on 5xx while other failed routes keep their status', async () => {
  const w = worker(async () => new Response('gateway', { status: 502 }));
  w.saved.set('./index.html', new Response('home'));
  assert.equal(await (await w.request('https://hyphsworld.com/?fbclid=example')).text(), 'home');
  assert.equal(await (await w.request('https://hyphsworld.com/index.html?utm_source=instagram')).text(), 'home');
  assert.equal((await w.request('https://hyphsworld.com/creator-drop.html')).status, 502);
});
