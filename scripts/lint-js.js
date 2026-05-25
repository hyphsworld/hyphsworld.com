#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = walk(process.cwd());
const issues = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    const msg = (result.stderr || result.stdout || 'syntax check failed').trim().split('\n').slice(0, 2).join(' | ');
    issues.push(`${file}: ${msg}`);
  }
}

if (issues.length) {
  console.error('JS diagnostics found issues:');
  for (const issue of issues) console.error(' - ' + issue);
  process.exit(1);
}

console.log(`JS diagnostics passed (${files.length} files).`);
