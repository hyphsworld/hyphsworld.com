const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('homepage-upgrades.css', 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }

assert(html.includes('class="home-command-deck"'), 'Homepage must expose the four-step command deck');
['>Play<', '>Earn<', '>Unlock<', '>Shop<'].forEach((label) => assert(html.includes(label), `Homepage command missing ${label}`));
assert((html.match(/class="desktop-extra-link/g) || []).length === 1, 'Desktop navigation must not repeat secondary destinations');
assert(html.includes('iframe loading="lazy"'), 'Below-fold podcast must lazy load');
assert(html.includes('rel="preconnect" href="https://www.youtube.com"'), 'Homepage must preconnect to the featured video host');
assert(css.includes('.home-command-deck'), 'Homepage command deck must have responsive styling');
assert(html.includes('id="hyph-audio"'), 'Homepage music player must remain present');
assert(html.includes('id="cool-points"'), 'Homepage Cool Points display must remain present');
assert(html.includes('id="nav-account-link"'), 'Homepage account entry must remain present');

console.log('Homepage focus diagnostic passed: primary journey is clear and core features remain present.');
