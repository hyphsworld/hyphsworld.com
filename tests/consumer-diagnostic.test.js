/** @jest-environment node */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { JSDOM } = require('jsdom');
const repository = path.resolve(__dirname, '..');
function fixture(check, file, source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-diagnostic-'));
  try {
    fs.writeFileSync(path.join(dir, file), source);
    return spawnSync(process.execPath, [path.join(repository, 'scripts', check)], { cwd: dir, encoding: 'utf8' });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
test('CSS check fails for a broken external or embedded stylesheet', () => {
  for (const [file, source] of [['bad.css', '.card { color: red;'], ['page.html', '<style>.card { color: red;</style>']]) {
    const result = fixture('lint-css.js', file, source);
    expect(result.status).toBe(1); expect(result.stderr).toContain('Unclosed block');
  }
  expect(fixture('lint-css.js', 'good.css', '.card { color: red; }').status).toBe(0);
});
test('JavaScript check fails for broken external and inline scripts', () => {
  for (const [file, source] of [['bad.js', 'function broken( {'], ['page.html', '<script>function broken( {</script>']]) {
    expect(fixture('lint-js.js', file, source).status).toBe(1);
  }
  expect(fixture('lint-js.js', 'good.js', 'const ready = true;').status).toBe(0);
});
test('expired scoreboard disappears while creator announcements remain', () => {
  const dom = new JSDOM('<div class="ticker-track"></div>', { url: 'https://hyphsworld.com/', runScripts: 'outside-only' });
  try {
    dom.window.Date.now = () => Date.parse('2026-10-05T05:00:00Z');
    dom.window.eval(fs.readFileSync(path.join(repository, 'homepage-command-center.js'), 'utf8'));
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    const ticker = dom.window.document.querySelector('.ticker-track').textContent;
    expect(ticker).toContain('CREATORS WORLD LIVE'); expect(ticker).not.toContain('NFL WEEK 2'); expect(ticker).not.toContain('SUN FINALS');
  } finally { dom.window.close(); }
});
