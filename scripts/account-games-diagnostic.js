#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const loader = read('games/cash-run/index.html');
const bridge = read('cash-run-points-bridge.js');
const wallet = read('chase-the-bag-wallet.js');
const bundle = read('games/cash-run/static/js/main.bba5ff6d.js');
const auth = read('auth-stability.js');
const casinoPage = read('hidden-casino.html');
const casino = read('hidden-casino.js');

const bootstrapAt = loader.indexOf('src="/cool-points.js"');
const walletAt = loader.indexOf('src="/chase-the-bag-wallet.js"');
const bridgeAt = loader.indexOf('src="/cash-run-points-bridge.js"');
const bundleAt = loader.indexOf('src="/games/cash-run/static/js/main.bba5ff6d.js"');
assert(bootstrapAt >= 0 && bootstrapAt < walletAt && walletAt < bridgeAt && bridgeAt < bundleAt,
  'Chase the Bag must load account bootstrap and adapters before its bundle');

assert(bundle.includes('new CustomEvent("hw:cashrun:".concat(e)') && bundle.includes('Io("gameover"'),
  'bundle must publish the game-over event');
assert(bridge.includes("window.addEventListener('hw:cashrun:gameover'"),
  'bridge must consume the bundle game-over namespace');
assert(bridge.includes("String(metadata.mode || '').toLowerCase() === 'easy'"),
  'bridge must reject practice-mode awards');
assert(bridge.includes('event.source !== window || event.origin !== window.location.origin'),
  'bridge must reject cross-window or cross-origin score messages');
assert(!bridge.includes("award(score, 'dom_scan'"), 'DOM scan must not award account points');

assert(wallet.includes("const KEY = 'hyphsworld-cool-points-state'"),
  'wallet adapter must control the bundle wallet key');
assert(wallet.includes('window.HWPoints.add(') && wallet.includes('window.HWPoints.spend('),
  'wallet adapter must route bundle credits and debits through HWPoints');

const hydrationBranch = auth.slice(auth.indexOf('if (!updates) {'), auth.indexOf('var current = profileCache'));
assert(hydrationBranch.includes("sb.from('profiles').select('*')"), 'profile hydration must fetch the account row');
assert(!hydrationBranch.includes("sb.rpc('update_my_profile'"), 'profile hydration must not update the account row');

assert(casinoPage.includes('<script src="cool-points.js"></script>'),
  'hidden casino must initialize the account wallet');
assert(casino.includes('window.HWPoints.spend(') && casino.includes('window.HWPoints.add('),
  'hidden casino must route costs and prizes through HWPoints');
assert(!casino.includes("localStorage.setItem('coolPoints'"),
  'hidden casino must not mutate the legacy local wallet');

console.log('Account-backed game diagnostics passed.');
