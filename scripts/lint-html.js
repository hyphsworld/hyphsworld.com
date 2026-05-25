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

const repoRoot = process.cwd();
const files = walk(repoRoot);
const issues = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!/^\s*<!doctype html>/i.test(src)) issues.push(`${file}: missing <!DOCTYPE html>`);

  const ids = [...src.matchAll(/id\s*=\s*"([^"]+)"/g)].map(m => m[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) issues.push(`${file}: duplicate id ${id}`);
    seen.add(id);
  }

  const refs = [...src.matchAll(/(?:src|href)\s*=\s*"([^"]+)"/g)].map(m => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(ref)) continue;
    const cleaned = ref.split('?')[0].split('#')[0];
    if (!cleaned) continue;
    const rel = cleaned.startsWith('/') ? cleaned.slice(1) : path.join(path.relative(repoRoot, path.dirname(file)), cleaned);
    const localPath = path.join(repoRoot, rel);
    if (!fs.existsSync(localPath)) issues.push(`${file}: missing local asset ${cleaned}`);
  }
}

if (issues.length) {
  console.error('HTML diagnostics found issues:');
  for (const i of issues) console.error(' - ' + i);
  process.exit(1);
}
console.log(`HTML diagnostics passed (${files.length} files).`);
