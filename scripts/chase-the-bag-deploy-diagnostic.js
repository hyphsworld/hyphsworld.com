const fs = require('fs');
const path = require('path');
function assert(ok, message) { if (!ok) throw new Error(message); }

const root = 'games/cash-run';
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'asset-manifest.json'), 'utf8'));
const jsPath = path.join(root, manifest.files['main.js'].replace(/^\/games\/cash-run\//, ''));
const cssPath = path.join(root, manifest.files['main.css'].replace(/^\/games\/cash-run\//, ''));
const js = fs.readFileSync(jsPath, 'utf8');
const backend = fs.readFileSync('backend/server.py', 'utf8');

assert(fs.existsSync(jsPath), 'Current Chase the Bag JavaScript bundle must exist');
assert(fs.existsSync(cssPath), 'Current Chase the Bag stylesheet must exist');
assert(fs.existsSync(path.join(root, 'assets/tonio.webp')), 'TONIO artwork must be bundled locally');
assert(fs.existsSync(path.join(root, 'assets/nikki.webp')), 'NIKKI artwork must be bundled locally');
assert(html.includes(manifest.files['main.js']), 'Entry page must load the current JavaScript bundle');
assert(html.includes(manifest.files['main.css']), 'Entry page must load the current stylesheet');
assert(html.includes('/require-login.js'), 'Chase the Bag must preserve the shared login gate');
assert(html.includes('/cash-run-points-bridge.js'), 'Chase the Bag must preserve the Cool Points bridge');
assert(js.includes('TONIO') && js.includes('NIKKI'), 'New build must include both current characters');
assert(js.includes('hw:cashrun:gameover'), 'Completed runs must emit the trusted Cool Points event');
assert(
  js.includes('location.hash.substring(1)') && js.includes('relative pathnames are not supported in hash history.push'),
  'Game must use hash-history routing so GitHub Pages subdirectory navigation survives reloads'
);
assert(!js.includes('/auth/login') && !js.includes('/auth/me'), 'Static build must not expose an unimplemented admin login');
assert(!js.includes('leaderboard-admin-btn') && !js.includes('path:"/admin"'), 'Static build must not expose unsupported admin controls');
assert(js.includes('period:e'), 'Leaderboard period tabs must send their selected period');
assert(backend.includes('period: str = "all"'), 'Leaderboard API must accept the selected period');
assert(backend.includes('"day": now - timedelta(days=1)') && backend.includes('"week": now - timedelta(days=7)') && backend.includes('"month": now - timedelta(days=30)'), 'Leaderboard API must apply distinct day, week, and month windows');
assert(!js.includes('Math.floor(.62*e.naturalHeight)'), 'Sprite preparation must not crop character artwork to a fixed height');
assert(js.includes('getImageData(0,0,n,r).data') && js.includes('+3]>8'), 'Sprite preparation must derive bounds from source alpha');
assert(!js.includes('e>235&&r>235&&a>235') && !js.includes('e<14&&r<14&&a<14'), 'Sprite preparation must preserve dark and light character pixels');
assert(!js.includes('customer-assets-cm19k8pv.emergentagent.net'), 'Game must not depend on hotlinked character artwork');

console.log('Chase the Bag deploy diagnostic passed: current build, TONIO/NIKKI assets, routing, login, and Cool Points hooks are connected.');
