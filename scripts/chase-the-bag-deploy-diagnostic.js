const fs = require('fs');
const path = require('path');
function assert(ok, message) { if (!ok) throw new Error(message); }

const root = 'games/cash-run';
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'asset-manifest.json'), 'utf8'));
const jsPath = path.join(root, manifest.files['main.js'].replace(/^\/games\/cash-run\//, ''));
const cssPath = path.join(root, manifest.files['main.css'].replace(/^\/games\/cash-run\//, ''));
const js = fs.readFileSync(jsPath, 'utf8');
const audioBridgePath = path.join(root, 'audio-session-bridge.js');
const audioBridge = fs.readFileSync(audioBridgePath, 'utf8');
const backend = fs.readFileSync('backend/server.py', 'utf8');

assert(fs.existsSync(jsPath), 'Current Chase the Bag JavaScript bundle must exist');
assert(fs.existsSync(cssPath), 'Current Chase the Bag stylesheet must exist');
assert(fs.existsSync(audioBridgePath), 'Chase the Bag mobile audio-session bridge must exist');
assert(fs.existsSync(path.join(root, 'assets/tonio.webp')), 'TONIO artwork must be bundled locally');
assert(fs.existsSync(path.join(root, 'assets/nikki.webp')), 'NIKKI artwork must be bundled locally');
assert(html.includes(manifest.files['main.js']), 'Entry page must load the current JavaScript bundle');
assert(html.includes(manifest.files['main.css']), 'Entry page must load the current stylesheet');
assert(html.includes('/require-login.js'), 'Chase the Bag must preserve the shared login gate');
assert(html.includes('/cash-run-points-bridge.js'), 'Chase the Bag must preserve the Cool Points bridge');
assert(html.includes('/games/cash-run/audio-session-bridge.js'), 'Chase the Bag must load the mobile audio-session bridge');
assert(
  html.indexOf('/games/cash-run/audio-session-bridge.js') < html.indexOf(manifest.files['main.js']),
  'The mobile audio-session bridge must load before the compiled game bundle'
);
assert(audioBridge.includes('HWCashRunAudioBridge'), 'Audio bridge must expose diagnostic status');
assert(audioBridge.includes('Instagram|FBAN|FBAV|FB_IAB'), 'Audio bridge must cover common iPhone in-app browsers');
assert(audioBridge.includes('data-testid="menu-test-sound-btn"'), 'Audio bridge must prime from the explicit Test Sound gesture');
assert(audioBridge.includes('data-testid="menu-play-btn"'), 'Audio bridge must prime from the Play gesture');
assert(audioBridge.includes("new CustomEvent('hw:cashrun:audio-session'"), 'Audio bridge must publish its runtime state');
assert(js.includes('TONIO') && js.includes('NIKKI'), 'New build must include both current characters');
const hasTrustedGameOverEvent =
  js.includes('hw:cashrun:gameover') ||
  (
    js.includes('hw:cashrun:${e}') &&
    /(?:rl|emitCashRunEvent)\(["']gameover["']/.test(js) &&
    js.includes('source:"native_game_over"')
  );
assert(hasTrustedGameOverEvent, 'Completed runs must emit the trusted Cool Points event');
assert(
  js.includes('location.hash.substring(1)') && js.includes('relative pathnames are not supported in hash history.push'),
  'Game must use hash-history routing so GitHub Pages subdirectory navigation survives reloads'
);
assert(!js.includes('/auth/login') && !js.includes('/auth/me'), 'Static build must not expose an unimplemented admin login');
assert(!js.includes('leaderboard-admin-btn') && !js.includes('path:"/admin"'), 'Static build must not expose unsupported admin controls');
assert(
  js.includes('get_cash_run_leaderboard') && js.includes('p_limit:'),
  'Game must keep the Supabase leaderboard RPC connected'
);
assert(js.includes('/leaderboard?limit='), 'Game must keep the HTTP leaderboard fallback connected');
assert(backend.includes('period: str = "all"'), 'Leaderboard API must accept the selected period');
assert(backend.includes('"day": now - timedelta(days=1)') && backend.includes('"week": now - timedelta(days=7)') && backend.includes('"month": now - timedelta(days=30)'), 'Leaderboard API must apply distinct day, week, and month windows');
assert(!js.includes('Math.floor(.62*e.naturalHeight)'), 'Sprite preparation must not crop character artwork to a fixed height');
assert(js.includes('getImageData(0,0,n,r).data') && js.includes('+3]>8'), 'Sprite preparation must derive bounds from source alpha');
assert(!js.includes('e>235&&r>235&&a>235') && !js.includes('e<14&&r<14&&a<14'), 'Sprite preparation must preserve dark and light character pixels');
assert(!js.includes('customer-assets-cm19k8pv.emergentagent.net'), 'Game must not depend on hotlinked character artwork');

console.log('Chase the Bag deploy diagnostic passed: current build, TONIO/NIKKI assets, mobile audio session, routing, login, and Cool Points hooks are connected.');
