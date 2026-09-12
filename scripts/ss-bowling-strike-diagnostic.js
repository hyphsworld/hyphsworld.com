const fs = require('fs');
function assert(ok, message) { if (!ok) throw new Error(message); }

const game = fs.readFileSync('games/ss-bowling/game.html', 'utf8');
const effects = fs.readFileSync('games/ss-bowling/bowling-effects.js', 'utf8');
const effectsSource = fs.readFileSync('scripts/super-strike-overrides/bowling-effects.js', 'utf8');
const publisher = fs.readFileSync('.github/workflows/publish-super-strike.yml', 'utf8');

assert(game.includes('/games/ss-bowling/bowling-effects.js'), 'Super Strike game must load the presentation effects');
assert(effects === effectsSource, 'Published effects must match the preserved site-owned source');
assert(publisher.includes("effects_source='site/scripts/super-strike-overrides/bowling-effects.js'"), 'Publisher must restore the site-owned Alley Gator effect after replacing the export');
assert(publisher.includes('cmp -s site/scripts/super-strike-overrides/bowling-effects.js site/games/ss-bowling/bowling-effects.js'), 'Publisher must verify the restored effect is byte-for-byte correct');
assert(publisher.includes("grep -q 'bowling-effects.js?v=177' site/games/ss-bowling/game.html"), 'Publisher must verify the game loads the restored effect');
assert(effects.includes("STRIKE_TEXT = 'STRIKE!'"), 'Effects must recognize the live STRIKE! message');
assert(effects.includes('linear-gradient'), 'Strike text must use a bright multicolor treatment');
assert(effects.includes('@keyframes hwStrikePop'), 'Strike text must include an entrance animation');
assert(effects.includes('@keyframes hwStrikeGlow'), 'Strike text must include an animated glow');
assert(effects.includes('hw-gator-eyes'), 'Alley Gator must show warning eyes before the chomp');
assert(effects.includes('lock[\\s-]*aim'), 'Alley Gator must recognize the live LOCK AIM control');
assert(game.includes('bowling-effects.js?v=177'), 'Bowling page must cache-bust the corrected effects file for mobile Safari');
assert(effects.includes('setTimeout(runGatorSequence, 1300)'), 'Alley Gator must provide a guaranteed visible lane preview after load');
assert(effects.includes("'pointerup'"), 'Alley Gator must listen for pointer-safe mobile controls');
assert(effects.includes('throwCount === 1'), 'Alley Gator must appear on the first qualifying throw so players can discover it');
assert(effects.includes("root.dataset.stage = 'warning'"), 'Alley Gator sequence must begin with a warning');
assert(effects.includes("root.dataset.stage = 'chomp'"), 'Alley Gator warning must advance to the chomp');
assert(effects.indexOf("root.dataset.stage = 'warning'") < effects.indexOf("root.dataset.stage = 'chomp'"), 'Warning must occur before the chomp');
assert(effects.includes('pointer-events:none'), 'Bowling effects must never block gameplay controls');
assert(effects.includes('sequenceRunning'), 'Alley Gator must guard against overlapping sequences');
assert(effects.includes('prefers-reduced-motion'), 'Animations must respect reduced-motion settings');
assert(!effects.includes('supabase'), 'Presentation effects must not write scores, rewards, auth, or multiplayer data');

console.log('Super Strike effects diagnostic passed: bright strikes and a non-blocking Alley Gator warning/chomp sequence are active.');
