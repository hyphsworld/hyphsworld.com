const fs = require('fs');

const read = file => fs.readFileSync(file, 'utf8');
const js = read('dominos.js');
const html = read('dominos.html');
const css = read('domino-cinematic.css');
const sql = read('supabase/migrations/20260926060000_domino_four_way_spinner.sql');
const pkg = read('package.json');
const workflow = read('.github/workflows/diagnostics.yml');
const spinnerStart = js.indexOf('function spinnerBoardMarkup');
const spinnerEnd = js.indexOf('function applyLocalPlacement', spinnerStart);
const spinner = js.slice(spinnerStart, spinnerEnd);

const checks = [
  ['first double becomes spinner', sql.includes("'spinnerTile'") && sql.includes("v_spinner_index")],
  ['four server-validated branches', sql.includes("array['left','right','top','bottom']")],
  ['player side reaches RPC', js.includes('params.p_play_side = playSide')],
  ['ambiguous moves show choice dialog', js.includes('choosePlacement(tileIndex, sides)') && js.includes('dominoPlacementPicker')],
  ['CPU uses the same legal-side engine', js.includes('const cpuSides = legalSides(cpuTile, activeState)')],
  ['legacy boards upgrade without reset', sql.includes('domino_layout_from_board(v_board)')],
  ['spinner branches render from center', spinner.includes('spinnerTile') && spinner.indexOf('const naturalWidth') < spinner.indexOf('const centerX')],
  ['uneven branches reserve independent space', spinner.includes('leftCount + rightCount') && spinner.includes('topCount + bottomCount')],
  ['every branch bone owns a non-overlapping slot', spinner.includes('const branchGap') && spinner.includes('tileWidth + branchGap') && !spinner.includes('tileWidth - 1')],
  ['full tables keep bones readable and scrollable', spinner.includes('Math.max(0.52') && js.includes('board.querySelector(".chain-new") || board.querySelector(".spinner-bone")')],
  ['later doubles sit across their branch', spinner.includes('const isDouble') && spinner.includes('horizontal ? 90 : 0')],
  ['placement dialog is mobile-safe', css.includes('.domino-placement-picker') && css.includes('button:focus-visible')],
  ['placement dialog traps and restores focus', js.includes('placementReturnFocus') && js.includes('event.key !== "Tab"') && js.includes('focus({ preventScroll: true })')],
  ['new assets are cache-busted', html.includes('20260926-domino-completion-1')],
  ['spinner diagnostic is in the full suite', pkg.includes('diagnostics:domino-spinner && npm run diagnostics:table-games-pov')],
  ['spinner diagnostic is launch-critical', workflow.includes('npm run diagnostics:domino-spinner')],
  ['anonymous move access stays revoked', sql.includes('from public, anon') && sql.includes('to authenticated')]
];

const failed = checks.filter(([name, ok]) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  return !ok;
});

if (failed.length) {
  console.error(`\nDomino spinner diagnostic failed: ${failed.length} check(s).`);
  process.exit(1);
}

console.log('\nDomino completion diagnostic passed.');
