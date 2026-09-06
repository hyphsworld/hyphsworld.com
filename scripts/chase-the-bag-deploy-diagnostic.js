const fs = require('fs');
const path = require('path');
function assert(ok, message) { if (!ok) throw new Error(message); }

const root = 'games/cash-run';
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'asset-manifest.json'), 'utf8'));
const jsPath = path.join(root, manifest.files['main.js'].replace(/^\/games\/cash-run\//, ''));
const cssPath = path.join(root, manifest.files['main.css'].replace(/^\/games\/cash-run\//, ''));
const js = fs.readFileSync(jsPath, 'utf8');

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
assert(js.includes('hashchange'), 'Game navigation must survive GitHub Pages subdirectory hosting');
assert(!js.includes('customer-assets-cm19k8pv.emergentagent.net'), 'Game must not depend on hotlinked character artwork');

console.log('Chase the Bag deploy diagnostic passed: current build, TONIO/NIKKI assets, routing, login, and Cool Points hooks are connected.');
