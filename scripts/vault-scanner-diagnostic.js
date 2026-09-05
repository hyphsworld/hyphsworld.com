const fs = require('fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(ok, message) { if (!ok) throw new Error(message); }

const html = read('vault.html');
const js = read('vault.js');
const cyberCss = read('vault-cyber-access.css');
const mobileCss = read('vault-mobile-fix.css');

assert(html.includes('class="body-target"'), 'Vault must keep the body scan silhouette');
assert(!js.includes('hwScanBodyFix'), 'JavaScript must not inject competing scanner layout CSS');
assert(!js.includes('injectScanBodyStyles'), 'Scanner layout must have a single CSS source of truth');
assert(mobileCss.includes('animation: none'), 'Body target must stay upright without glitch movement');
assert(mobileCss.includes('rotate:0deg'), 'Body target rotation must stay locked upright');
assert(cyberCss.includes('opacity:.34'), 'Rotating portal art must remain behind and below the silhouette');
assert(cyberCss.includes('.body-target,.scan-person{z-index:6'), 'Scan silhouette must remain above portal artwork');
assert(js.includes('verifyVaultCode'), 'Vault code verification must remain connected');
assert(js.includes('grantTransport'), 'Vault transport must remain connected');

console.log('Vault scanner diagnostic passed: silhouette is upright and access logic remains connected.');
