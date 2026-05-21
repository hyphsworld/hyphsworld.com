#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function walk(dir, out=[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = walk(process.cwd());
const issues = [];
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('<!DOCTYPE html>')) issues.push(`${file}: missing <!DOCTYPE html>`);
  const dupIds = [...src.matchAll(/id\s*=\s*"([^"]+)"/g)].map(m=>m[1]);
  const seen = new Set();
  for (const id of dupIds) { if (seen.has(id)) issues.push(`${file}: duplicate id ${id}`); else seen.add(id); }
}

if (issues.length) {
  console.error('HTML diagnostics found issues:');
  for (const i of issues) console.error(' - ' + i);
  process.exit(1);
}
console.log(`HTML diagnostics passed (${files.length} files).`);
