const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const lintScript = path.resolve(__dirname, '../scripts/lint-html.js');
let fixture;
beforeEach(() => { fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-html-lint-')); });
afterEach(() => { fs.rmSync(fixture, { recursive: true, force: true }); });
function lint(html) {
  fs.writeFileSync(path.join(fixture, 'page.html'), html);
  return spawnSync(process.execPath, [lintScript], { cwd: fixture, encoding: 'utf8' });
}

test.each(['<!DOCTYPE html>', '<!doctype html>', '<!DoCtYpE HTML>'])('accepts valid HTML doctype %s', (doctype) => {
  expect(lint(`${doctype}\n<html><body><p id="intro">Hello</p></body></html>`).status).toBe(0);
});
test('still rejects a missing doctype', () => {
  const result = lint('<html><body>Hello</body></html>');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('missing <!DOCTYPE html>');
});
test('still rejects duplicate IDs with a lowercase doctype', () => {
  const result = lint('<!doctype html><html><body><p id="intro"></p><p id="intro"></p></body></html>');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('duplicate id intro');
});
