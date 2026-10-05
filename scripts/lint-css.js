#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const { JSDOM } = require('jsdom');
const { files } = require('./diagnostic-files');
const issues = []; let checked = 0;
function check(source, label) {
  checked++;
  try { postcss.parse(source, { from: label }); }
  catch (error) { issues.push(error.message); }
}
for (const file of files()) {
  const label = path.relative(process.cwd(), file);
  if (file.endsWith('.css')) check(fs.readFileSync(file, 'utf8'), label);
  else if (file.endsWith('.html')) {
    const dom = new JSDOM(fs.readFileSync(file, 'utf8'));
    Array.from(dom.window.document.querySelectorAll('style')).forEach((style, index) => check(style.textContent, label + ':inline-style-' + (index + 1)));
    dom.window.close();
  }
}
if (issues.length) { console.error(issues.join('\n')); process.exit(1); }
console.log(`CSS syntax passed (${checked} external and inline stylesheets). Property support and visual layout require browser checks.`);
