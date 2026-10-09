const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = require('node:path').resolve(__dirname, '..');
const soundSource = fs.readFileSync(root + '/casino-slot-sound.js', 'utf8');
const consumerSource = fs.readFileSync(root + '/casino-consumer.js', 'utf8');
let checks = 0;
function check(name, run) { run(); checks++; console.log('PASS ' + name); }
function soundHarness({ fail = false, state = 'suspended' } = {}) {
  const handlers = {}, scheduled = [], oscillators = [];
  const gain = { value: 1, setValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime() {} };
  let gains = 0;
  const ctx = { state, currentTime: 0, sampleRate: 44100, destination: {}, resumes: 0,
    resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); },
    createGain() { const parameter = gains++ === 0 ? gain : { value: 1, setValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime() {} }; return { gain: parameter, connect() {} }; },
    createOscillator() { const o = { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; oscillators.push(o); return o; },
    createBuffer(_c, n) { return { getChannelData() { return new Float32Array(n); } }; },
    createBufferSource() { return { connect() {}, start() {} }; }
  };
  const window = { AudioContext: function() { if (fail) throw Error('Unavailable'); return ctx; }, addEventListener() {} };
  const document = { readyState: 'complete', getElementById() { return null; }, addEventListener(n, cb) { handlers[n] = cb; } };
  const sandbox = { window, document, localStorage: { getItem() {}, setItem() {} }, setTimeout(cb) { scheduled.push(cb); return scheduled.length; }, clearTimeout() {} };
  vm.runInNewContext(soundSource, sandbox);
  return { audio: window.HWCasinoSound, ctx, gain, oscillators, scheduled, handlers };
}
check('Audio resumes after a suspended gesture', () => { const h = soundHarness(); h.audio.card(1); assert.equal(h.ctx.resumes, 1); assert.ok(h.oscillators.length); });
check('Interrupted iOS context resumes on the next action', () => { const h = soundHarness({ state: 'interrupted' }); h.audio.card(1); assert.equal(h.ctx.resumes, 1); h.ctx.state = 'interrupted'; h.audio.click(); assert.equal(h.ctx.resumes, 2); });
check('Muted audio stops active output and blocks new tones', () => { const h = soundHarness(); h.audio.win(); h.audio.setMuted(true); assert.equal(h.gain.value, 0); const n = h.oscillators.length; h.audio.win(); assert.equal(h.oscillators.length, n); h.audio.setMuted(false); assert.equal(h.gain.value, 0.72); });
check('Managed engine suppresses duplicate delegated button cues', () => { const h = soundHarness(); h.audio.setManaged(true); h.handlers.click({ target: { closest(s) { return s === '#spinSlotsBtn' ? {} : null; } } }); assert.equal(h.scheduled.length, 0); h.audio.spin(); assert.ok(h.scheduled.length); });
check('Unavailable audio context does not throw', () => { const h = soundHarness({ fail: true }); assert.doesNotThrow(() => h.audio.win()); });
function consumerHarness(source = consumerSource, roll = 0, fail = false) {
  const cues = [], timeouts = [], classes = { add() {}, remove() {}, toggle() {} };
  const nodes = {};
  for (const id of ['message','slotsMessage','wheelMessage','casinoAnnouncer','activeGameTitle','activeGameSubtext','slotReels','vaultWheel']) nodes[id] = { textContent: '', innerHTML: '', children: [{}], style: {}, classList: classes };
  const document = { readyState: 'loading', addEventListener() {}, querySelector(s) { return nodes[s.slice(1)] || null; }, querySelectorAll() { return []; } };
  const audio = Object.fromEntries(['click','card','spin','wheel','win','jackpot','push','miss'].map(k => [k, (...args) => { if (fail) throw Error('Audio unavailable'); cues.push([k, ...args]); }]));
  const window = { HWCasinoSound: audio };
  const math = Object.create(Math); math.random = () => roll;
  const sandbox = { window, document, Math: math, localStorage: { getItem() {}, setItem() {} }, setTimeout(cb) { timeouts.push(cb); }, clearTimeout() {}, setInterval() {}, console };
  // Expose the existing closure only inside this isolated diagnostic.
  const hooked = source.replace('  if (document.readyState === "loading")', '  window.testCasino = { casino, dealBlackjack, hitBlackjack, standBlackjack, finishBlackjack, spinSlots, spinWheel, switchGame }; renderRewardHud = () => {}; showRewardReminder = () => {}; unlockEligibleRewards = () => {};\n  if (document.readyState === "loading")');
  vm.runInNewContext(hooked, sandbox);
  return { ...window.testCasino, cues, timeouts };
}
check('Blackjack deal/hit/stand trigger card cues from actual actions', () => { const h = consumerHarness(); h.dealBlackjack(); assert.deepEqual(h.cues[0], ['card',4]); h.hitBlackjack(); assert.deepEqual(h.cues[1], ['card',1]); h.casino.phase = 'player'; h.standBlackjack(); assert.ok(h.cues.some(c => c[0] === 'card' && c[1] === 2)); });
check('Finished blackjack rejects extra hit/stand sound', () => { const h = consumerHarness(); h.casino.phase = 'finished'; h.hitBlackjack(); h.standBlackjack(); assert.equal(h.cues.length, 0); });
check('Win, push and loss use distinct result cues', () => { for (const [result, cue] of [['player','win'],['push','push'],['dealer','miss']]) { const h = consumerHarness(); h.finishBlackjack(result, 'Progress still moves'); assert.equal(h.cues[0][0], cue); } });
check('Slots trigger existing spin and jackpot effects', () => { const h = consumerHarness(); h.spinSlots(); h.timeouts.forEach(cb => cb()); assert.ok(h.cues.some(c => c[0] === 'spin')); assert.ok(h.cues.some(c => c[0] === 'jackpot')); });
check('Wheel miss stays a miss despite consolation progress', () => { const h = consumerHarness(consumerSource, 4.1/6); h.spinWheel(); h.timeouts.forEach(cb => cb()); assert.ok(h.cues.some(c => c[0] === 'wheel')); assert.equal(h.cues.at(-1)[0], 'miss'); });
check('Audio failure leaves gameplay and payouts intact', () => { const h = consumerHarness(consumerSource, 0, true); const balance = h.casino.balance; assert.doesNotThrow(() => h.finishBlackjack('player','You win')); assert.equal(h.casino.balance, balance + h.casino.bet); });
console.log(checks + ' behavioral audio checks passed.');
