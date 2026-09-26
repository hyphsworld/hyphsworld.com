const fs = require('fs');
function assert(ok, message) { if (!ok) throw new Error(message); }

const game = fs.readFileSync('games/ss-bowling/game.html', 'utf8');
const index = fs.readFileSync('games/ss-bowling/index.html', 'utf8');
const effects = fs.readFileSync('games/ss-bowling/bowling-effects.js', 'utf8');
const effectsSource = fs.readFileSync('scripts/super-strike-overrides/bowling-effects.js', 'utf8');
const publisher = fs.readFileSync('.github/workflows/publish-super-strike.yml', 'utf8');

assert(game.includes('/games/ss-bowling/bowling-effects.js'), 'Super Strike game must load the presentation effects');
assert(index.includes('/games/ss-bowling/bowling-effects.js'), 'Super Strike intro route must load effects before client-side navigation');
assert(effects === effectsSource, 'Published effects must match the preserved site-owned source');
assert(publisher.includes("effects_source='site/scripts/super-strike-overrides/bowling-effects.js'"), 'Publisher must restore the site-owned Alley Gator effect after replacing the export');
assert(publisher.includes('cmp -s site/scripts/super-strike-overrides/bowling-effects.js site/games/ss-bowling/bowling-effects.js'), 'Publisher must verify the restored effect is byte-for-byte correct');
assert(publisher.includes("grep -q 'bowling-effects.js?v=ss-hud-clear-3' \"$page\""), 'Publisher must verify every exported route loads the current presentation helper');
assert(effects.includes("STRIKE_TEXT = 'STRIKE!'"), 'Effects must recognize the live STRIKE! message');
assert(effects.includes('linear-gradient'), 'Strike text must use a bright multicolor treatment');
assert(effects.includes('@keyframes hwStrikePop'), 'Strike text must include an entrance animation');
assert(effects.includes('@keyframes hwStrikeGlow'), 'Strike text must include an animated glow');
assert(game.includes('bowling-effects.js?v=ss-hud-clear-3'), 'Bowling page must cache-bust the presentation helper for mobile Safari');
assert(index.includes('bowling-effects.js?v=ss-hud-clear-3'), 'Intro route must cache-bust the route-aware presentation helper');
assert(effects.includes('data-testid="lock-aim-button"'), 'Effects must detect client-side navigation into live aiming');
assert(effects.includes('data-testid="throw-button"'), 'Effects must keep global controls clear while throwing');
assert(effects.includes("classList.toggle('hw-ss-live-game', liveGame)"), 'Effects must synchronize the live-game body state');
assert(effects.includes('body.hw-ss-live-game #hw-global-create'), 'CREATE must be removed from the live bowling HUD');
assert(effects.includes('body.hw-ss-live-game #hw-global-my-id'), 'MY ID must be removed from the live bowling HUD');
assert(effects.includes('new MutationObserver(refreshEffects)'), 'Effects must follow Expo client-side route renders');
assert(effects.includes("version: 'ss-hud-clear-3'"), 'Effects must expose the current HUD-clear version');
assert(!effects.includes('hw-gator-head'), 'Publisher helper must not duplicate the source-owned Alley Gator');
assert(!effects.includes('runGatorSequence'), 'Publisher helper must not trigger a second Alley Gator sequence');
assert(effects.includes('prefers-reduced-motion'), 'Animations must respect reduced-motion settings');
assert(!effects.includes('supabase'), 'Presentation effects must not write scores, rewards, auth, or multiplayer data');

console.log('Super Strike effects diagnostic passed: live controls stay clear, bright strikes remain active, and duplicate Alley Gator overlays stay disabled.');
