const fs = require('fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(ok, message) { if (!ok) throw new Error(message); }

const html = read('table-game.html');
const js = read('table-game.js');
const css = read('table-pov-upgrades.css');
const lobby = read('games.html');

assert(css.includes('01-domino-room-pov-v1.webp'), 'Table games must share the Domino room art direction');
assert(html.includes('card-pov-room'), 'Shared table page must keep its POV scene');
assert(js.includes('document.body.dataset.tableGame = gameType'), 'Each table view must expose its game theme');
assert(js.includes('result = "natural"') && js.includes('result = "craps"'), 'Craps must implement come-out naturals and craps');
assert(js.includes('result = "made-point"') && js.includes('result = "seven-out"'), 'Craps must implement point wins and seven-out');
assert(js.includes('pointNumbers=[4,5,6,8,9,10]'), 'Craps layout must show standard point numbers');
assert(js.includes('scoreKey: "01_dice"'), 'Existing Dice score key must remain stable');
assert(js.includes('requested_game_type: gameType'), 'Existing multiplayer room contract must remain stable');
assert(js.includes('window.HWAuth.addPoints'), 'Existing Cool Points hook must remain intact');
assert(html.includes('auth-client.js') && html.includes('cool-points.js'), 'Login and Cool Points clients must remain loaded');
assert(lobby.includes('🎲 Craps<br>1–4 Players'), 'Casino lobby must identify Dice as Craps');
assert(!js.includes('sb.rpc("create_craps'), 'Craps upgrade must not introduce a database migration or new RPC');
assert(html.includes('table-turn-banner') && html.includes('card-control-dock'), 'Every table must use the shared Domino-style layer order');
assert(js.includes('stage.dataset.game=gameType'), 'Each live stage must expose its game-specific presentation hook');
assert(js.includes('applySeatCapacity(activeRoom.max_players'), 'POV seats must reflect the selected one-to-four player capacity');
assert(js.includes('table-center-zone') && js.includes('player-rail-zone'), 'Cards must separate center play from the local player rail');
assert(css.includes('Unified Domino-style POV contract') && css.includes('grid-template-rows:auto auto minmax(310px,1fr) auto'), 'Shared POV CSS must reserve non-overlapping table layers');
assert(css.includes('.spades-zone .player-rail-zone .hw-card'), 'Thirteen-card Spades hands must fit the player rail');
assert(css.includes('padding:clamp(230px,32vw,320px) 10px 10px'), 'Desktop card and craps tables must reserve the full character sightline above the felt');
assert(css.includes('padding:clamp(270px,62vw,340px) 6px 6px'), 'Mobile card and craps tables must begin below the character like the Domino table');
assert(css.includes('min-height:690px;padding-top:180px'), 'Landscape mode must keep a lower table without wasting the short viewport');
assert(html.includes('20260911-lower-tables-2'), 'Mobile browsers must receive the corrected lower table position immediately');

console.log('Table games POV diagnostic passed: premium scene, regular craps, and protected integration hooks are intact.');
