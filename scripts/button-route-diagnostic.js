'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
// Git's full manifest also works with sparse checkouts; include new source files.
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
const known = new Set(files);
const documents = new Map();
function documentFor(file) {
  if (!documents.has(file)) documents.set(file, new JSDOM(fs.readFileSync(path.join(root, file), 'utf8')).window.document);
  return documents.get(file);
}
function destinationFor(page, raw) {
  const url = new URL(raw, 'https://hyphsworld.com/' + page);
  if (url.origin !== 'https://hyphsworld.com') return null;
  let target = decodeURIComponent(url.pathname).replace(/^\//, '');
  if (target === '' || target.endsWith('/')) target += 'index.html';
  if (!known.has(target) && known.has(target + '/index.html')) target += '/index.html';
  return { target, hash: decodeURIComponent(url.hash.slice(1)) };
}
const errors = [];
let routes = 0;
let sections = 0;
const pages = files.filter(file => file.endsWith('.html'));
for (const page of pages) {
  const doc = documentFor(page);
  for (const control of doc.querySelectorAll('a[href], form[action], button[formaction], [data-href]')) {
    const raw = control.getAttribute('href') || control.getAttribute('formaction') || control.getAttribute('action') || control.getAttribute('data-href');
    if (!raw || /^(mailto:|tel:|javascript:|data:)/i.test(raw)) continue;
    const dest = destinationFor(page, raw);
    if (!dest) continue;
    routes++;
    if (!known.has(dest.target)) { errors.push(page + ': missing ' + raw); continue; }
    if (!dest.hash || !dest.target.endsWith('.html')) continue;
    const target = documentFor(dest.target);
    // Dashboard hash routes select a view rather than scroll to an element.
    const dashboardView = dest.target === 'creator-dashboard.html' && ['overview', 'profile', 'create', 'library', 'trust', 'inbox'].includes(dest.hash);
    if (!target.getElementById(dest.hash) && !target.getElementsByName(dest.hash).length && !dashboardView) errors.push(page + ': missing section ' + raw);
    sections++;
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Button routes passed: ${pages.length} HTML pages, ${routes} local routes, ${sections} section destinations.`);
