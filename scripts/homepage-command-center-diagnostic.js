const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('homepage-upgrades.css', 'utf8');
const js = fs.readFileSync('homepage-command-center.js', 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }

assert(html.includes('id="home-id-center"'), 'Homepage must include the ID command center');
['data-home-id-avatar', 'data-home-id-name', 'data-home-id-points', 'data-home-id-rank', 'data-home-id-streak', 'data-home-id-recent', 'data-home-id-next', 'data-home-id-continue'].forEach((hook) => assert(html.includes(hook), `Missing command-center hook: ${hook}`));
assert(html.includes('homepage-command-center.js'), 'Homepage must load the command-center controller');
assert(css.includes('.home-id-center'), 'Command center must include responsive presentation');
assert(js.includes('window.HWPoints.getState'), 'Command center must consume the authoritative points state');
assert(js.includes('state.profile || state.user'), 'Command center must consume the authenticated profile');
assert(js.includes('Backpack Reward'), 'Command center must show the 10,600 CP backpack target');
assert(js.includes('While supplies last'), 'Physical backpack target must include the inventory notice');
assert(!js.includes('.from('), 'Command center must not bypass the shared Supabase/auth client');
assert(!js.includes('service_role'), 'Command center must never expose privileged Supabase credentials');

console.log('Homepage command-center diagnostic passed: authenticated profile, points, progress, and safe fallback hooks are present.');
