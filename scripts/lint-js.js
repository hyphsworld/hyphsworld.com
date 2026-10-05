#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { files } = require('./diagnostic-files');
const issues = []; let checked = 0;
function check(source, label) {
  checked++;
  try { new vm.Script(source, { filename: label }); }
  catch (error) { issues.push(label + ': ' + error.message); }
}
for (const file of files()) {
  const label = path.relative(process.cwd(), file);
  if (file.endsWith('.js')) check(fs.readFileSync(file, 'utf8'), label);
  else if (file.endsWith('.html')) {
    const dom = new JSDOM(fs.readFileSync(file, 'utf8'));
    Array.from(dom.window.document.querySelectorAll('script:not([src])')).forEach((script, index) => {
      const type = (script.type || '').toLowerCase();
      if (!type || ['text/javascript', 'application/javascript'].includes(type)) check(script.textContent, label + ':inline-script-' + (index + 1));
      // Exported Expo module markers have no imports; validate these too.
      else if (type === 'module' && !/\b(?:import|export)\b/.test(script.textContent)) check(script.textContent, label + ':inline-module-' + (index + 1));
    });
    dom.window.close();
  }
}
if (issues.length) { console.error(issues.join('\n')); process.exit(1); }
console.log(`JavaScript syntax passed (${checked} external and inline scripts). This is a syntax check, not semantic lint.`);
