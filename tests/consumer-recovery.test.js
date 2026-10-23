/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
let dom;
afterEach(() => { if (dom) dom.window.close(); jest.useRealTimers(); });
function page(html) {
  dom = new JSDOM(html, { url: 'https://hyphsworld.com/', runScripts: 'outside-only' });
  dom.window.console.warn = jest.fn();
  return dom.window;
}
async function casino({ reject = false, deferred = false, cached = 100, remote = 100, payout = 0 } = {}) {
  jest.useFakeTimers();
  const w = page('<button id="casinoSpin"></button><button id="freeBonus"></button><p id="casinoResult"></p><b id="casinoPoints"></b><p id="casinoLine"></p>' + [1,2,3].map(n => `<div class="reel"><span id="c${n}"></span></div>`).join(''));
  let points = remote, release;
  let displayed = cached;
  w.setTimeout = setTimeout; w.setInterval = () => 1;
  w.HWPoints = { get: () => displayed, refresh: async () => { displayed = points; return { points }; } };
  const rpc = jest.fn(async (name, args) => {
    if (name !== 'spin_slots') throw Error('Unexpected wallet RPC');
    if (deferred) await new Promise(r => { release = r; });
    if (reject || points < 5) return { error: new Error('Spin could not be confirmed'), data: null };
    const result = { ok: true, cost: 5, payout, net: payout - 5, result: payout > 0 ? 'jackpot' : 'loss', reels: ['🍒','🍒','🍒'], balance: points - 5 + payout };
    points = result.balance;
    return { data: result, error: null };
  });
  w.HWAuth = { getClient: async () => ({ rpc }) };
  w.eval(read('hidden-casino.js').replace('document.addEventListener("DOMContentLoaded", bind);', 'window.testReady = bind();'));
  await w.testReady;
  displayed = cached;
  return { w, rpc, release: () => release && release(), balance: () => points };
}
test('rejected server spin leaves points unchanged and restores controls', async () => {
  const { w, rpc, balance } = await casino({ reject: true });
  w.document.getElementById('casinoSpin').click(); await flush();
  expect(balance()).toBe(100);
  expect(w.document.getElementById('casinoSpin').disabled).toBe(false);
  expect(w.document.getElementById('casinoResult').textContent).toContain('Spin not confirmed');
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith('spin_slots', {});
});
test('confirmed server loss charges only 5 points and stops reel animation', async () => {
  const { w, rpc, balance } = await casino();
  w.document.getElementById('casinoSpin').click(); await flush();
  await jest.advanceTimersByTimeAsync(900); await flush();
  expect(balance()).toBe(95);
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(w.document.getElementById('casinoSpin').disabled).toBe(false);
  expect(w.document.querySelector('.spin')).toBeNull();
  expect(w.document.getElementById('casinoResult').textContent).toContain('confirmed 5 CP');
});
test('rapid clicks cannot generate multiple charges while server spin is pending', async () => {
  const { w, rpc, release, balance } = await casino({ deferred: true, payout: 150 });
  const button = w.document.getElementById('casinoSpin');
  button.click(); button.click(); await flush();
  expect(rpc).toHaveBeenCalledTimes(1);
  release(); await flush(); await jest.advanceTimersByTimeAsync(900); await flush();
  expect(balance()).toBe(245);
  expect(button.disabled).toBe(false);
  expect(w.document.getElementById('casinoResult').textContent).toContain('BACK ROOM JACKPOT');
});
test('Duck bonus remains themed but cannot credit unverified points', async () => {
  const { w, rpc, balance } = await casino();
  w.document.getElementById('freeBonus').click(); await flush();
  expect(w.document.getElementById('casinoResult').textContent).toContain('server-verified');
  expect(balance()).toBe(100);
  expect(rpc).not.toHaveBeenCalled();
});
async function arcade({ reject = false, scoreError = false } = {}) {
  const w = page(['casinoStatus','casinoPoints','casinoRecentList','casinoGameTitle','casinoGameKicker','casinoGameDescription','casinoStage','casinoControls','casinoPlayerName','casinoPlayerMode'].map(id => `<div id="${id}"></div>`).join(''));
  let points = 100;
  w.localStorage.setItem('hyphsworld.coolPoints.total', '100');
  w.Math.random = () => 0;
  const rpc = jest.fn(async (_name, args) => {
    if (reject) return { error: new Error('verified endpoint required') };
    points += args.p_amount; return { data: { ok: true, balance: points }, error: null };
  });
  w.HWAuth = {
    getCurrentUser: async () => ({ userId: 'player', email: 'player@example.test', coolPoints: points }),
    getClient: async () => ({ rpc }),
    addPoints: jest.fn(() => { throw new Error('Local fallback must never be called'); })
  };
  const insert = jest.fn(async () => ({ error: scoreError ? new Error('score rejected') : null }));
  w.HW_SUPABASE_CONFIG = { url: 'https://example.supabase.co', anonKey: 'public-test-key' };
  w.supabase = { createClient: () => ({ from: () => ({ insert }) }) };
  w.eval(read('casino-arcade.js').replace(/  if \(document.readyState === 'loading'\) \{[\s\S]*?\n  \}\n\}\)\(\);$/, '  boot();\n})();'));
  await flush();
  w.document.querySelector('[data-action="start-hidden"]').click();
  return { w, insert, rpc };
}
test('arcade rejection cannot fabricate a wallet balance, recent reward, or saved winning score', async () => {
  const { w, insert } = await arcade({ reject: true });
  w.document.querySelector('[data-action="choice-0"]').click(); await flush();
  expect(w.localStorage.getItem('hyphsworld.coolPoints.total')).toBe('100');
  expect(w.document.getElementById('casinoPoints').textContent).toBe('100');
  expect(w.document.getElementById('casinoStage').textContent).toContain('reward was not confirmed');
  expect(w.document.getElementById('casinoStage').textContent).not.toContain('+27');
  expect(JSON.parse(w.localStorage.getItem('hyphsworld.hiddenArcade.recent'))[0].points).toBe(0);
  expect(insert).not.toHaveBeenCalled();
  expect(w.document.querySelector('[data-action="start-hidden"]').disabled).toBe(false);
});
test('arcade confirms a legitimate reward once and reports score-save errors separately', async () => {
  const { w, insert, rpc } = await arcade({ scoreError: true });
  const choice = w.document.querySelector('[data-action="choice-0"]');
  choice.dispatchEvent(new w.Event('click')); choice.dispatchEvent(new w.Event('click')); await flush();
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(w.HWAuth.addPoints).not.toHaveBeenCalled();
  expect(w.document.getElementById('casinoPoints').textContent).toBe('127');
  expect(insert).toHaveBeenCalledTimes(1);
  expect(w.document.getElementById('casinoStage').textContent).toContain('+27');
  expect(w.document.getElementById('casinoStage').textContent).toContain('Score could not be saved');
});
async function table() {
  const w = page('<div id="tableStatus"></div><div id="tableRoomList"></div>');
  const timers = new Map(); let next = 1;
  w.setInterval = jest.fn((fn, delay) => { const id = next++; timers.set(id, { fn, delay }); return id; });
  w.clearInterval = id => timers.delete(id);
  const query = { select(){ return this; }, eq(){ return this; }, in(){ return this; }, order(){ return this; }, limit: async () => ({ data: [] }), maybeSingle: jest.fn(async () => ({ data: { state: { status: 'playing' } } })) };
  let user = { userId: 'player' };
  w.HWAuth = { getCurrentUser: jest.fn(async () => user), getClient: async () => ({ from: () => query, rpc: async () => ({}) }) };
  w.eval(read('table-game.js').replace('document.addEventListener("DOMContentLoaded",boot);', 'window.testTable = { boot, seed() { activeRoom = { id: "room" }; activeState = {}; startRefresh(); }, state() { return activeRoom; } };'));
  await w.testTable.boot(); w.testTable.seed();
  const show = () => { const event = new w.Event('pageshow'); Object.defineProperty(event, 'persisted', { value: true }); w.dispatchEvent(event); };
  return { w, timers, query, show, setUser: value => { user = value; } };
}
test('restored table resumes room and lobby polling once, without duplicate timers', async () => {
  const { w, timers, query, show } = await table();
  expect(timers.size).toBe(2);
  w.dispatchEvent(new w.Event('pagehide')); expect(timers.size).toBe(0);
  show(); await flush();
  expect([...timers.values()].map(t => t.delay).sort((a,b) => a-b)).toEqual([5000, 30000]);
  expect(query.maybeSingle).toHaveBeenCalledTimes(1);
  show(); await flush(); expect(timers.size).toBe(2);
});
test('restoring after account change or sign-out drops the old room', async () => {
  const { w, timers, show, setUser } = await table();
  w.dispatchEvent(new w.Event('pagehide')); setUser({ userId: 'other-player' }); show(); await flush();
  expect(w.testTable.state()).toBeNull();
  expect([...timers.values()].map(t => t.delay)).toEqual([30000]);
  w.dispatchEvent(new w.Event('pagehide')); setUser(null); show(); await flush();
  expect(w.document.getElementById('tableStatus').textContent).toContain('Login required');
});
test('a second navigation cancels an unfinished restored-session check', async () => {
  const { w, timers, show } = await table(); let resolve;
  w.dispatchEvent(new w.Event('pagehide'));
  w.HWAuth.getCurrentUser = () => new Promise(r => { resolve = r; });
  show(); w.dispatchEvent(new w.Event('pagehide')); resolve({ userId: 'player' }); await flush();
  expect(timers.size).toBe(0);
});

test('stale high displayed cash cannot override insufficient server balance', async () => {
  const { w, rpc, balance } = await casino({ cached: 20, remote: 0 });
  w.document.getElementById('casinoSpin').click(); await flush();
  expect(balance()).toBe(0);
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(w.document.getElementById('casinoResult').textContent).toContain('Spin not confirmed');
});
test('stale low displayed cash does not prevent confirmed server win', async () => {
  const { w, rpc, balance } = await casino({ cached: 0, remote: 100, payout: 150 });
  w.document.getElementById('casinoSpin').click(); await flush();
  await jest.advanceTimersByTimeAsync(900); await flush();
  expect(balance()).toBe(245);
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(w.document.getElementById('casinoResult').textContent).toContain('BACK ROOM JACKPOT');
});
test('arcade unavailable server client never invokes a local award fallback', async () => {
  const { w } = await arcade();
  w.HWAuth.getClient = async () => null;
  w.document.querySelector('[data-action="choice-0"]').click(); await flush();
  expect(w.HWAuth.addPoints).not.toHaveBeenCalled();
  expect(w.localStorage.getItem('hyphsworld.coolPoints.total')).toBe('100');
  expect(w.document.getElementById('casinoStage').textContent).toContain('reward was not confirmed');
});
