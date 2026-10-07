/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const globalSource = fs.readFileSync(path.join(__dirname, '..', 'global-my-id.js'), 'utf8');
const { JSDOM } = require('jsdom');

test.each(['index.html', 'games/cash-run/index.html', 'games/ss-bowling/game.html'])('shared menu resolves site routes and skin from script URL on %s', page => {
  const dom = new JSDOM('<!doctype html><head></head><body></body>', { url: 'https://hyphsworld.com/' + page, runScripts: 'outside-only' });
  const w = dom.window;
  const script = w.document.createElement('script');
  script.src = 'https://hyphsworld.com/global-my-id.js';
  Object.defineProperty(w.document, 'currentScript', { get: () => script });
  w.eval(globalSource);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  expect(w.document.getElementById('hw-global-my-id').href).toBe('https://hyphsworld.com/auth.html');
  expect(w.document.getElementById('hw-global-create').href).toBe('https://hyphsworld.com/auth.html?next=creator-dashboard.html');
  expect(w.document.querySelector('link[href*="button-system.css"]').href).toBe('https://hyphsworld.com/button-system.css?v=20261007-1');
  expect([...w.document.querySelectorAll('.hw-create-choice')].map(e => new URL(e.href).pathname)).toEqual(Array(5).fill('/creator-dashboard.html'));
  dom.window.close();
});
